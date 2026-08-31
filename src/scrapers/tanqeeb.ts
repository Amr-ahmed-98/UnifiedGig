import 'dotenv/config'
import { chromium } from 'playwright'
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

const AR_DIGITS: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

const AR_MONTHS: Record<string, number> = {
    'يناير': 0, 'فبراير': 1, 'مارس': 2, 'أبريل': 3, 'ابريل': 3, 'مايو': 4,
    'يونيو': 5, 'يوليو': 6, 'أغسطس': 7, 'اغسطس': 7, 'سبتمبر': 8,
    'أكتوبر': 9, 'اكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11,
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

        const title = (card.attr('data-job-name') || card.find('.search-job-title-link').first().text().trim())
        const relativeUrl = card.attr('data-job-url') || card.find('.search-job-title-link').attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://egypt.tanqeeb.com${relativeUrl}`

        const company = card.attr('data-job-company') || card.find('.search-job-company-name').first().text().trim() || 'Confidential'
        const location = card.attr('data-job-location') || card.find('.search-job-company-city span').first().text().trim() || ''
        const workplace = card.attr('data-job-workplace') || ''
        const remote = /remote|عن بعد/i.test(workplace)
        const hybrid = /hybrid|هجين/i.test(workplace)

        const dateRaw = card.attr('data-job-date') || ''
        const datePosted = dateRaw ? parseArabicDate(dateRaw) : null

        // description sits HTML-escaped in a hidden div, textContent unescapes it
        const escapedDesc = card.find('.job-card-description-source').first().html() || ''
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
    browser: import('playwright').Browser,
    title: string,
    pageNum: number,
    attempt = 1
): Promise<ScrapedJob[]> {
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const url = BUILD_URL(title, pageNum)

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page
            .waitForSelector('article[data-job-id]', { timeout: 15000 })
            .catch(() => {
                // legitimately 0 results past last page - let parse decide
            })
        await page.waitForTimeout(1500)

        const html = await page.content()
        await page.close()

        return parseJobs(html)
    } catch (err) {
        await page.close().catch(() => { })
        if (attempt < PAGE_LOAD_RETRIES) {
            console.log(`  "${title}" page=${pageNum + 1} failed (attempt ${attempt}), retrying...`)
            await new Promise((r) => setTimeout(r, 3000))
            return scrapePage(browser, title, pageNum, attempt + 1)
        }
        console.log(`  "${title}" page=${pageNum + 1} failed after ${attempt} attempts, stopping.`)
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
        headless: true,
        args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
        ...(proxy && { proxy }),
    })
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

    let totalCreated = 0
    let totalUpdated = 0

    try {
        for (const title of SEARCH_TITLES) {
            console.log(`Searching: "${title}"...`)

            for (let p = 0; p < MAX_PAGES_PER_TITLE; p++) {
                const jobs = await scrapePage(browser, title, p)

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

                await new Promise((r) => setTimeout(r, 2000))
            }

            await new Promise((r) => setTimeout(r, 2500))
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
        await browser.close()
        await prisma.$disconnect()
    }
}

const isMain = process.argv[1]?.includes('tanqeeb')
if (isMain) {
    runScrape().catch((err) => {
        console.error('Scraper failed:', err)
        process.exitCode = 1
    })
}