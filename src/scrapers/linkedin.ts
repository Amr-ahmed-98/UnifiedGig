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

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const LOCATION = 'Egypt'
const CUTOFF_DAYS = 3
const PAGE_SIZE = 25
const MAX_PAGES = 20
const PAGE_LOAD_RETRIES = 3

function parseRelativeDate(raw: string): Date | null {
    const text = raw.trim().toLowerCase()
    const now = new Date()

    if (/just now|moment/.test(text)) return now

    const m = text.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/)
    if (!m) return null

    const amount = parseInt(m[1], 10)
    const unit = m[2]
    const d = new Date(now)
    switch (unit) {
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

function parseJobs(html: string): ScrapedJob[] {
    const $ = cheerio.load(html)
    const jobs: ScrapedJob[] = []

    $('li').each((_, el) => {
        const card = $(el)
        const titleEl = card.find('.base-search-card__title').first()
        const title = titleEl.text().trim()
        if (!title) return

        const linkEl = card.find('a.base-card__full-link').first()
        const url = (linkEl.attr('href') || '').split('?')[0]
        if (!url) return

        const company = card.find('.base-search-card__subtitle').first().text().trim() || 'Confidential'
        const location = card.find('.job-search-card__location').first().text().trim()

        const timeEl = card.find('time').first()
        const datetimeAttr = timeEl.attr('datetime')
        const datePosted = datetimeAttr
            ? new Date(datetimeAttr)
            : parseRelativeDate(timeEl.text())

        const fullText = card.text()
        const remote = /Remote/i.test(fullText)
        const hybrid = /Hybrid/i.test(fullText)

        jobs.push({ title, company, location, url, remote, hybrid, datePosted })
    })

    return jobs
}

async function scrapePage(
    browser: import('playwright').Browser,
    start: number,
    attempt = 1
): Promise<ScrapedJob[]> {
    const page = await browser.newPage({
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const url = `${BASE_URL}?location=${encodeURIComponent(LOCATION)}&f_TPR=r259200&start=${start}`

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        const html = await page.content()
        await page.close()
        return parseJobs(html)
    } catch (err) {
        await page.close().catch(() => { })
        if (attempt < PAGE_LOAD_RETRIES) {
            console.log(`  page start=${start} failed (attempt ${attempt}), retrying...`)
            await new Promise((resolve) => setTimeout(resolve, 3000))
            return scrapePage(browser, start, attempt + 1)
        }
        console.log(`  page start=${start} failed after ${attempt} attempts, stopping pagination.`)
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
                source: 'linkedin',
                datePosted: job.datePosted,
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

export async function runScrape() {
    console.log(`[${new Date().toISOString()}] Starting LinkedIn scrape...`)
    const browser = await chromium.launch({ headless: true })
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

    let totalCreated = 0
    let totalUpdated = 0

    try {
        for (let p = 0; p < MAX_PAGES; p++) {
            const start = p * PAGE_SIZE
            console.log(`Scraping page ${p + 1} (start=${start})...`)
            const jobs = await scrapePage(browser, start)

            if (jobs.length === 0) {
                console.log('No more jobs found, stopping.')
                break
            }

            const withinCutoff = jobs.filter((j) => !j.datePosted || j.datePosted >= cutoff)
            const tooOld = jobs.length - withinCutoff.length

            const { created, updated } = await saveJobs(withinCutoff)
            totalCreated += created
            totalUpdated += updated

            console.log(
                `Page ${p + 1}: ${jobs.length} jobs (${created} new, ${updated} updated, ${tooOld} older than ${CUTOFF_DAYS}d skipped)`
            )

            if (tooOld > 0) {
                console.log(`Reached jobs older than ${CUTOFF_DAYS} days, stopping pagination.`)
                break
            }

            await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        const removed = await prisma.job.deleteMany({
            where: {
                source: 'linkedin',
                OR: [
                    { datePosted: { lt: cutoff } },
                    { datePosted: null, createdAt: { lt: cutoff } },
                ],
            },
        })

        console.log(
            `Done. ${totalCreated} new, ${totalUpdated} updated, ${removed.count} removed (older than ${CUTOFF_DAYS}d).`
        )
    } finally {
        await browser.close()
    }
}

const isMain = process.argv[1]?.includes('linkedin')
if (isMain) {
    runScrape()
        .catch((err) => {
            console.error('Scraper failed:', err)
            process.exitCode = 1
        })
        .finally(() => prisma.$disconnect())
}