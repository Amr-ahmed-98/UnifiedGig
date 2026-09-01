import 'dotenv/config'
import { chromium, type Page } from 'patchright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ScrapedJob {
    title: string
    company: string
    location: string
    url: string
    remote: boolean
    hybrid: boolean
    datePosted: Date | null
    description: string | null
}

const SEARCH_TITLES = [
    'front end developer',
    'back end developer',
    'full stack developer',
    'software engineer',
    'react developer',
    'node developer',
]

const BUILD_URL = (title: string, page: number) => {
    const keywords = encodeURIComponent(title)
    const base = `https://egypt.tanqeeb.com/ar/jobs/search?keywords=${keywords}&country=213&state=0&category=-1&workplace=0&search_period=0&lang=all`
    return page === 0 ? base : `${base}&page=${page + 1}`
}

const MAX_PAGES_PER_TITLE = 5
const CUTOFF_DAYS = 3
const PAGE_LOAD_RETRIES = 3
const IS_LINUX = process.platform === 'linux'
const DESKTOP_UA = IS_LINUX
    ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'

const AR_DIGITS: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

const AR_MONTHS: Record<string, number> = {
    'يناير': 0, 'فبراير': 1, 'مارس': 2, 'أبريل': 3, 'ابريل': 3, 'مايو': 4,
    'يونيو': 5, 'يوليو': 6, 'أغسطس': 7, 'اغسطس': 7, 'سبتمبر': 8,
    'أكتوبر': 9, 'اكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11,
}

function isCloudflareChallenge(title: string, html: string): boolean {
    if (/Just a moment|Security Check|Blocked|Additional Verification Required|Authenticating|Attention Required/i.test(title)) return true
    return /cf-browser-verification|challenge-error-title|id="cf-challenge|Verify you are human|turnstile/i.test(html)
}

async function handleChallenge(page: Page): Promise<boolean> {
    const startTime = Date.now()
    let lastClickAt = 0

    // Allow non-interactive / managed Cloudflare challenges to auto-solve
    await page.waitForTimeout(4000)

    while (Date.now() - startTime < 35000) {
        const title = await page.title().catch(() => '')
        if (!/Just a moment|Security Check|Blocked|Additional Verification Required|Authenticating|Attention Required/i.test(title)) {
            return true
        }

        if (Date.now() - lastClickAt > 7000) {
            try {
                const turnstileFrame = page.frameLocator('iframe[src*="cloudflare"], iframe[src*="turnstile"], iframe[src*="challenge"], iframe[title*="Cloudflare"], iframe[title*="Turnstile"]').first()
                const checkbox = turnstileFrame.locator('input[type="checkbox"], .ctp-checkbox-label, #challenge-stage, body')

                if (await checkbox.isVisible({ timeout: 1500 }).catch(() => false)) {
                    console.log('  Turnstile interactive element located, clicking...')
                    await checkbox.click({ delay: 100 }).catch(() => { })
                    lastClickAt = Date.now()
                    await page.waitForTimeout(4000)
                    continue
                }
            } catch {
                // Fallback to bounding box click if frameLocator is blocked
            }

            const iframes = await page.$$('iframe').catch(() => [])
            for (const iframe of iframes) {
                const src = (await iframe.getAttribute('src').catch(() => '')) || ''
                const titleAttr = (await iframe.getAttribute('title').catch(() => '')) || ''
                if (
                    src.includes('cloudflare') ||
                    src.includes('turnstile') ||
                    src.includes('challenge') ||
                    titleAttr.includes('Cloudflare')
                ) {
                    const box = await iframe.boundingBox().catch(() => null)
                    if (box && box.width > 0 && box.height > 0) {
                        console.log('  Turnstile iframe detected, dispatching click...')
                        const targetX = box.x + Math.min(35, box.width / 4)
                        const targetY = box.y + box.height / 2

                        await page.mouse.move(targetX - 20, targetY - 15, { steps: 10 })
                        await page.waitForTimeout(200)
                        await page.mouse.move(targetX, targetY, { steps: 5 })
                        await page.waitForTimeout(300)
                        await page.mouse.down()
                        await page.waitForTimeout(100)
                        await page.mouse.up()
                        lastClickAt = Date.now()
                        await page.waitForTimeout(4000)
                        break
                    }
                }
            }
        }

        await page.mouse.move(150 + Math.random() * 200, 250 + Math.random() * 200, { steps: 5 })
        await page.waitForTimeout(2000)
    }

    const finalTitle = await page.title().catch(() => '')
    return !/Just a moment|Security Check|Blocked|Additional Verification Required|Authenticating|Attention Required/i.test(finalTitle)
}

// data-job-date comes as absolute Arabic date e.g. "٥ يونيو ٢٠٢٦" (day, month name, year)
// with eastern-arabic digits - no relative "ago" text on this site.
function parseArabicDate(raw: string): Date | null {
    const normalized = raw
        .trim()
        .replace(/[٠-٩]/g, (d) => AR_DIGITS[d] ?? d)

    const m = normalized.match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/)
    if (!m) return null

    const day = parseInt(m[1], 10)
    const month = AR_MONTHS[m[2]]
    const year = parseInt(m[3], 10)
    if (month === undefined) return null

    return new Date(year, month, day)
}

function parseJobs(html: string): ScrapedJob[] {
    const $ = cheerio.load(html)
    const jobs: ScrapedJob[] = []

    $('article[data-job-id]').each((_, el) => {
        const card = $(el)

        const title = (card.attr('data-job-name') || card.find('.search-job-title-link, h2 a').first().text().trim())
        const relativeUrl = card.attr('data-job-url') || card.find('.search-job-title-link, h2 a').attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : (relativeUrl ? `https://egypt.tanqeeb.com${relativeUrl}` : '')

        const company = card.attr('data-job-company') || card.find('.search-job-company-name, .company-name').first().text().trim() || 'Confidential'
        const location = card.attr('data-job-location') || card.find('.search-job-company-city span, .job-location').first().text().trim() || ''
        const workplace = card.attr('data-job-workplace') || ''
        const remote = /remote|عن بعد/i.test(workplace) || /remote|عن بعد/i.test(title)
        const hybrid = /hybrid|هجين/i.test(workplace) || /hybrid|هجين/i.test(title)

        const dateRaw = card.attr('data-job-date') || ''
        const datePosted = dateRaw ? parseArabicDate(dateRaw) : null

        // description sits HTML-escaped in a hidden div, textContent unescapes it
        const escapedDesc = card.find('.job-card-description-source, .job-description').first().html() || ''
        const description = escapedDesc
            ? cheerio.load(`<div>${escapedDesc}</div>`)('div').text().replace(/\s+/g, ' ').trim().slice(0, 2000) || null
            : null

        if (title && fullUrl) {
            jobs.push({ title, company, location, url: fullUrl, remote, hybrid, datePosted, description })
        }
    })

    return jobs
}

async function scrapePage(
    page: Page,
    title: string,
    pageNum: number,
    attempt = 1
): Promise<ScrapedJob[]> {
    const url = BUILD_URL(title, pageNum)

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 })

        const initialHtml = await page.content()
        const initialTitle = await page.title().catch(() => '')

        if (isCloudflareChallenge(initialTitle, initialHtml)) {
            console.log(`  "${title}" page ${pageNum + 1}: Cloudflare challenge detected, attempting to solve...`)
            const solved = await handleChallenge(page)
            if (!solved) {
                console.log(`  "${title}" page ${pageNum + 1}: challenge could not be resolved.`)
                throw new Error('cloudflare_challenge_unsolved')
            }
            console.log(`  "${title}" page ${pageNum + 1}: challenge passed.`)
        }

        const sawJobSelector = await page
            .waitForSelector('article[data-job-id]', { timeout: 12000 })
            .then(() => true)
            .catch(() => false)

        await page.waitForTimeout(1500)

        const html = await page.content()
        const pageTitle = await page.title().catch(() => '')

        if (isCloudflareChallenge(pageTitle, html)) {
            throw new Error('blocked_by_challenge')
        }

        const jobs = parseJobs(html)

        if (jobs.length === 0 && !sawJobSelector) {
            const hasEmptyMessage = /لا توجد وظائف|لا توجد نتائج|0 وظائف|no jobs found/i.test(html)
            if (!hasEmptyMessage && attempt < PAGE_LOAD_RETRIES) {
                console.log(`  "${title}" page ${pageNum + 1}: 0 cards & no empty-state message (title="${pageTitle}"), retrying...`)
                throw new Error('selector_timeout_zero_jobs')
            }
        }

        return jobs
    } catch (err) {
        if (attempt < PAGE_LOAD_RETRIES) {
            console.log(`  "${title}" page ${pageNum + 1} failed (attempt ${attempt}): ${err instanceof Error ? err.message : err}, retrying...`)
            await new Promise((r) => setTimeout(r, 3500 + Math.random() * 2000))
            return scrapePage(page, title, pageNum, attempt + 1)
        }
        console.log(`  "${title}" page ${pageNum + 1} failed after ${attempt} attempts: ${err instanceof Error ? err.message : err}, stopping.`)
        if (process.env.CI) {
            await page.screenshot({ path: `/tmp/tanqeeb-fail-${title.replace(/\s+/g, '_')}-${pageNum + 1}.png` }).catch(() => { })
        }
        return []
    }
}

async function saveJobs(jobs: ScrapedJob[]) {
    let created = 0
    let updated = 0

    for (const job of jobs) {
        const existing = await prisma.job.findUnique({ where: { url: job.url }, select: { id: true } })

        await prisma.job.upsert({
            where: { url: job.url },
            update: {
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                remote: job.remote,
                hybrid: job.hybrid,
                ...(job.datePosted && { datePosted: job.datePosted }),
            },
            create: {
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                url: job.url,
                remote: job.remote,
                hybrid: job.hybrid,
                source: 'tanqeeb',
                datePosted: job.datePosted,
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

export async function runScrape() {
    console.log(`[${new Date().toISOString()}] Starting Tanqeeb scrape (Egypt, last ${CUTOFF_DAYS} days)...`)

    const isCI = Boolean(process.env.CI)
    const isHeadless = process.env.HEADLESS !== undefined ? process.env.HEADLESS === 'true' : false

    const proxyServer = process.env.PROXY_SERVER || process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    const proxy = proxyServer
        ? {
            server: proxyServer,
            ...(process.env.PROXY_USERNAME && { username: process.env.PROXY_USERNAME }),
            ...(process.env.PROXY_PASSWORD && { password: process.env.PROXY_PASSWORD }),
        }
        : undefined

    if (proxy) {
        console.log(`Using proxy: ${proxyServer}`)
    }

    const browser = await chromium.launch({
        headless: isHeadless,
        args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled',
        ],
        ...(proxy && { proxy }),
    })

    const context = await browser.newContext({
        userAgent: DESKTOP_UA,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        locale: 'ar-EG',
        extraHTTPHeaders: {
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
            'Sec-Ch-Ua': '"Chromium";v="133", "Not(A:Brand";v="99", "Google Chrome";v="133"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': IS_LINUX ? '"Linux"' : '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        },
    })
    const page = await context.newPage()
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

    let totalCreated = 0
    let totalUpdated = 0

    try {
        for (const title of SEARCH_TITLES) {
            console.log(`Searching: "${title}"...`)

            for (let p = 0; p < MAX_PAGES_PER_TITLE; p++) {
                const jobs = await scrapePage(page, title, p)

                if (jobs.length === 0) {
                    console.log(`  page ${p + 1}: no jobs, stopping pagination.`)
                    break
                }

                const withinCutoff = jobs.filter((j) => !j.datePosted || j.datePosted >= cutoff)
                const tooOld = jobs.length - withinCutoff.length

                const { created, updated } = await saveJobs(withinCutoff)
                totalCreated += created
                totalUpdated += updated

                console.log(`  page ${p + 1}: ${jobs.length} jobs (${created} new, ${updated} updated, ${tooOld} older than ${CUTOFF_DAYS}d skipped)`)

                if (tooOld > 0) {
                    console.log(`  reached jobs older than ${CUTOFF_DAYS} days, stopping pagination for "${title}".`)
                    break
                }

                await page.waitForTimeout(2000 + Math.random() * 1000)
            }

            await page.waitForTimeout(2500 + Math.random() * 1000)
        }

        const removed = await prisma.job.deleteMany({
            where: {
                source: 'tanqeeb',
                OR: [
                    { datePosted: { lt: cutoff } },
                    { datePosted: null, createdAt: { lt: cutoff } },
                ],
            },
        })

        console.log(`Done. ${totalCreated} new, ${totalUpdated} updated, ${removed.count} removed (older than ${CUTOFF_DAYS}d).`)
    } finally {
        await context.close().catch(() => { })
        await browser.close().catch(() => { })
        await prisma.$disconnect().catch(() => { })
    }
}

const isMain = process.argv[1]?.includes('tanqeeb')
if (isMain) {
    runScrape().catch((err) => {
        console.error('Scraper failed:', err)
        process.exitCode = 1
    })
}