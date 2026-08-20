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
}

const BASE_URL = 'https://wuzzuf.net/search/jobs'
const MAX_PAGES = 20 // safety cap, loop normally stops early via CUTOFF_DAYS
const CUTOFF_DAYS = 3
const PAGE_LOAD_RETRIES = 3

// No category/field filter on BASE_URL on purpose -> covers every job field
// (engineering, software, sales, HR, ...) in one pass, newest first.

function parseRelativeDate(raw: string): Date | null {
    const text = raw.trim().toLowerCase()
    const now = new Date()

    if (/just posted|few seconds? ago|moment/.test(text)) return now
    if (/yesterday/.test(text)) {
        const d = new Date(now)
        d.setDate(d.getDate() - 1)
        return d
    }

    const m = text.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/)
    if (!m) return null

    const amount = parseInt(m[1], 10)
    const unit = m[2]
    const d = new Date(now)
    switch (unit) {
        case 'minute':
            d.setMinutes(d.getMinutes() - amount)
            break
        case 'hour':
            d.setHours(d.getHours() - amount)
            break
        case 'day':
            d.setDate(d.getDate() - amount)
            break
        case 'week':
            d.setDate(d.getDate() - amount * 7)
            break
        case 'month':
            d.setMonth(d.getMonth() - amount)
            break
    }
    return d
}

// Old bug: cardRoot = titleEl.closest('div, article').parent() only climbed
// ONE fixed level, so on real wuzzuf markup it usually landed on a wrapper
// that did NOT contain the company link -> company always fell back to
// 'Confidential', even for named companies. Fix: climb until we hit an
// ancestor that (a) contains exactly ONE job title (h2) - so we don't
// swallow a neighboring card - and (b) contains the "posted X ago" text,
// which only appears once the whole card is included.
function findCardRoot($: cheerio.CheerioAPI, titleEl: cheerio.Cheerio<any>) {
    let node = titleEl.parent()
    for (let i = 0; i < 8; i++) {
        if (node.length === 0) break
        const text = node.text()
        const h2Count = node.find('h2').length
        if (h2Count === 1 && /ago|yesterday|just posted/i.test(text)) {
            return node
        }
        node = node.parent()
    }
    return titleEl.closest('div, article').parent()
}

function parseJobs(html: string): ScrapedJob[] {
    const $ = cheerio.load(html)
    const jobs: ScrapedJob[] = []

    $('h2 a[href*="/jobs/p/"]').each((_, el) => {
        const titleEl = $(el)
        const title = titleEl.text().trim()
        const relativeUrl = titleEl.attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://wuzzuf.net${relativeUrl}`

        const cardRoot = findCardRoot($, titleEl)
        const fullText = cardRoot.text()

        const companyEl = cardRoot.find('a[href*="/jobs/careers/"]').first()
        const company = companyEl.text().replace(/-\s*$/, '').trim() || 'Confidential'

        const agoMatch = fullText.match(
            /(\d+\s*(?:minute|hour|day|week|month)s?\s*ago|yesterday|just posted)/i
        )
        const datePosted = agoMatch ? parseRelativeDate(agoMatch[1]) : null

        // location sits between "<company or Confidential> -" and the "ago" text
        let location = ''
        const locMatch = fullText.match(
            /-\s*([^\n]+?)\s*(?:\d+\s*(?:minute|hour|day|week|month)s?\s*ago|yesterday|just posted)/i
        )
        if (locMatch) {
            location = locMatch[1].trim()
        } else {
            const fallback = fullText.match(/([A-Za-z\s]+,\s*[A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)/)
            location = fallback ? fallback[1].trim() : ''
        }

        const remote = /Remote/i.test(fullText)
        const hybrid = /Hybrid/i.test(fullText)

        if (title && fullUrl) {
            jobs.push({ title, company, location, url: fullUrl, remote, hybrid, datePosted })
        }
    })

    return jobs
}

async function scrapePage(
    browser: import('playwright').Browser,
    startIndex: number,
    attempt = 1
): Promise<ScrapedJob[]> {
    const page = await browser.newPage({
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const url = `${BASE_URL}?start=${startIndex}`

    try {
        // 'networkidle' was the timeout culprit: wuzzuf keeps background
        // analytics/ad requests going so the network never truly goes idle.
        // 'domcontentloaded' + an explicit wait for the job cards is faster
        // and doesn't hang.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page
            .waitForSelector('h2 a[href*="/jobs/p/"]', { timeout: 20000 })
            .catch(() => {
                // page may legitimately have 0 jobs (past last page) - let
                // parsing below decide, don't throw here
            })
        // small settle time for any late client-side render / Cloudflare check
        await page.waitForTimeout(2000)

        const html = await page.content()
        await page.close()

        return parseJobs(html)
    } catch (err) {
        await page.close().catch(() => { })
        if (attempt < PAGE_LOAD_RETRIES) {
            console.log(
                `  page start=${startIndex} failed (attempt ${attempt}), retrying...`
            )
            await new Promise((resolve) => setTimeout(resolve, 3000))
            return scrapePage(browser, startIndex, attempt + 1)
        }
        console.log(
            `  page start=${startIndex} failed after ${attempt} attempts, stopping pagination.`
        )
        return []
    }
}

async function saveJobs(jobs: ScrapedJob[]): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const job of jobs) {
        const existing = await prisma.job.findUnique({
            where: { url: job.url },
            select: { id: true },
        })

        await prisma.job.upsert({
            where: { url: job.url },
            update: {
                title: job.title,
                company: job.company,
                location: job.location,
                remote: job.remote,
                hybrid: job.hybrid,
                ...(job.datePosted && { datePosted: job.datePosted }),
            },
            create: {
                title: job.title,
                company: job.company,
                location: job.location,
                url: job.url,
                remote: job.remote,
                hybrid: job.hybrid,
                source: 'wuzzuf',
                datePosted: job.datePosted,
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

export async function runScrape() {
    console.log(`[${new Date().toISOString()}] Starting Wuzzuf scrape...`)
    const browser = await chromium.launch({ headless: true })
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

    let totalCreated = 0
    let totalUpdated = 0
    let totalTooOld = 0

    try {
        for (let p = 0; p < MAX_PAGES; p++) {
            console.log(`Scraping page ${p + 1}...`)
            const jobs = await scrapePage(browser, p)

            if (jobs.length === 0) {
                console.log('No more jobs found, stopping.')
                break
            }

            // keep undated jobs too (date parse can occasionally miss) -
            // only exclude ones we're SURE are older than the cutoff
            const withinCutoff = jobs.filter((j) => !j.datePosted || j.datePosted >= cutoff)
            const tooOld = jobs.length - withinCutoff.length
            totalTooOld += tooOld

            const { created, updated } = await saveJobs(withinCutoff)
            totalCreated += created
            totalUpdated += updated

            console.log(
                `Page ${p + 1}: ${jobs.length} jobs (${created} new, ${updated} updated, ${tooOld} older than ${CUTOFF_DAYS}d skipped)`
            )

            if (tooOld > 0) {
                // wuzzuf lists newest-first, so once a page has jobs older
                // than the cutoff, every later page is older still -> stop.
                console.log(`Reached jobs older than ${CUTOFF_DAYS} days, stopping pagination.`)
                break
            }

            await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        const removed = await prisma.job.deleteMany({
            where: {
                source: 'wuzzuf',
                OR: [
                    { datePosted: { lt: cutoff } },
                    { datePosted: null, createdAt: { lt: cutoff } },
                ],
            },
        })

        if (totalCreated === 0 && totalUpdated === 0 && removed.count === 0) {
            console.log('No changes this run.')
        } else {
            console.log(
                `Done. ${totalCreated} new, ${totalUpdated} updated, ${removed.count} removed (older than ${CUTOFF_DAYS}d).`
            )
        }
    } finally {
        await browser.close()
    }
}

const isMain = process.argv[1]?.includes('wuzzuf')
if (isMain) {
    runScrape()
        .catch((err) => {
            console.error('Scraper failed:', err)
            process.exitCode = 1
        })
        .finally(() => prisma.$disconnect())
}