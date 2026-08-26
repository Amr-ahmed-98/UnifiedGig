import 'dotenv/config'
import { chromium } from 'patchright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ScrapedJob {
    title: string
    company: string
    location: string
    url: string
    jobId: string
    remote: boolean
    hybrid: boolean
    salary: string | null
}

// eg.indeed.com = same site you browse manually. Guest view (no login) returns
// "did not match any jobs" on a blank q= - Indeed requires a keyword for the
// no-auth search path. So we run several titles instead of one broad-net query.
const SEARCH_TITLES = [
    'front end developer',
    'back end developer',
    'full stack developer',
    'software engineer',
    'react developer',
    'node developer',
]
const BASE_URL = (title: string) =>
    `https://eg.indeed.com/jobs?q=${encodeURIComponent(title)}&l=Egypt&fromage=3&from=searchOnDesktopSerp`
const MAX_PAGES = 5
const CUTOFF_DAYS = 3
const PAGE_LOAD_RETRIES = 3
const DESKTOP_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'

function isCloudflareChallenge(title: string, html: string): boolean {
    if (/Just a moment|Blocked - Indeed/i.test(title)) return true
    return /cf-browser-verification|challenge-error-title|id="cf-challenge/i.test(html)
}

function parseJobs(html: string): { jobs: ScrapedJob[]; hasNextPage: boolean } {
    const $ = cheerio.load(html)
    const jobs: ScrapedJob[] = []

    $('h3.jobTitle a[data-jk]').each((_, el) => {
        const linkEl = $(el)
        const jobId = linkEl.attr('data-jk') || ''
        const title = linkEl.find('span').first().text().trim() || linkEl.text().trim()
        // rc/clk href carries a per-session tracking token that changes every
        // search - using it as the DB unique key would create a duplicate row
        // for the same job on every run. jk is stable, use that instead.
        const fullUrl = jobId ? `https://eg.indeed.com/viewjob?jk=${jobId}` : ''

        const cardRoot = linkEl.closest('li')
        const company = cardRoot.find('[data-testid="company-name"]').first().text().trim() || 'Confidential'
        const location = cardRoot.find('[data-testid="text-location"]').first().text().trim()

        // salary already sits in the list card (salary-snippet-container) -
        // no need for a second page visit per job, which was hammering the
        // site with 2x requests and likely what triggered the Cloudflare wall.
        const salary =
            cardRoot.find('[data-testid*="salary-snippet-container"] span').first().text().trim() || null

        const remote = /Remote/i.test(location)
        const hybrid = /Hybrid/i.test(location)

        if (title && fullUrl && jobId) {
            jobs.push({ title, company, location, url: fullUrl, jobId, remote, hybrid, salary })
        }
    })

    const hasNextPage = $('a[data-testid="pagination-page-next"]').length > 0
    return { jobs, hasNextPage }
}

async function scrapePage(
    page: import('patchright').Page,
    title: string,
    start: number,
    attempt = 1
): Promise<{ jobs: ScrapedJob[]; hasNextPage: boolean }> {
    const url = `${BASE_URL(title)}&start=${start}`

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        const status = response?.status()

        let pageTitle = await page.title()
        if (/Just a moment|Security Check/i.test(pageTitle)) {
            console.log(`  Cloudflare verification detected ("${pageTitle}"), waiting to resolve...`)
            await page.waitForFunction(() => !/Just a moment|Security Check/i.test(document.title), { timeout: 12000 }).catch(() => {})
            await page.waitForTimeout(2000)
            pageTitle = await page.title()
        }

        await page
            .waitForSelector('h3.jobTitle a[data-jk]', { timeout: 10000 })
            .catch(() => {
                // page may legitimately have 0 jobs (past last page) - let
                // parsing below decide, don't throw here
            })
        await page.waitForTimeout(1500)

        const html = await page.content()

        if (status === 403 && isCloudflareChallenge(pageTitle, html)) {
            console.log(`  page start=${start} hit a Cloudflare challenge page, not "0 jobs" - treating as failure.`)
            throw new Error('cloudflare_challenge')
        }

        return parseJobs(html)
    } catch (err) {
        if (attempt < PAGE_LOAD_RETRIES) {
            console.log(`  page start=${start} failed (attempt ${attempt}), retrying...`)
            await new Promise((r) => setTimeout(r, 4000))
            return scrapePage(page, title, start, attempt + 1)
        }
        console.log(`  page start=${start} failed after ${attempt} attempts, stopping pagination.`)
        return { jobs: [], hasNextPage: false }
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
                remote: job.remote,
                hybrid: job.hybrid,
                ...(job.salary && { salary: job.salary }),
            },
            create: {
                title: job.title,
                company: job.company,
                location: job.location,
                url: job.url,
                remote: job.remote,
                hybrid: job.hybrid,
                salary: job.salary ?? null,
                source: 'indeed',
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

export async function runScrape() {
    console.log(`[${new Date().toISOString()}] Starting Indeed scrape (Egypt, last ${CUTOFF_DAYS} days)...`)
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox'],
    })
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

    let totalCreated = 0
    let totalUpdated = 0
    const seenJobIds = new Set<string>() // same job shows up under multiple titles, skip dupes within this run

    try {
        for (const title of SEARCH_TITLES) {
            console.log(`--- Searching "${title}" ---`)
            const context = await browser.newContext({
                userAgent: DESKTOP_UA,
                viewport: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                locale: 'en-US',
            })
            const page = await context.newPage()

            try {
                for (let p = 0; p < MAX_PAGES; p++) {
                    const start = p * 10
                    console.log(`Scraping page ${p + 1}...`)
                    const { jobs: rawJobs, hasNextPage } = await scrapePage(page, title, start)

                    if (rawJobs.length === 0) {
                        console.log('No more jobs found for this title, stopping.')
                        break
                    }

                    const jobs = rawJobs.filter((j) => {
                        if (seenJobIds.has(j.jobId)) return false
                        seenJobIds.add(j.jobId)
                        return true
                    })

                    const { created, updated } = await saveJobs(jobs)
                    totalCreated += created
                    totalUpdated += updated
                    console.log(`Page ${p + 1}: ${rawJobs.length} found, ${jobs.length} new-to-this-run (${created} new, ${updated} updated)`)

                    if (rawJobs.length < 10 || !hasNextPage) {
                        console.log('No further pages for this title.')
                        break
                    }

                    await new Promise((r) => setTimeout(r, 2500))
                }
            } finally {
                await page.close().catch(() => {})
                await context.close().catch(() => {})
            }

            await new Promise((r) => setTimeout(r, 2000))
        }

        // fromage=3 already limits what we fetch to last 3 days - this just
        // sweeps stale rows a prior run inserted that have since aged out.
        const removed = await prisma.job.deleteMany({
            where: { source: 'indeed', createdAt: { lt: cutoff } },
        })

        if (totalCreated === 0 && totalUpdated === 0 && removed.count === 0) {
            console.log('No changes this run.')
        } else {
            console.log(`Done. ${totalCreated} new, ${totalUpdated} updated, ${removed.count} removed (older than ${CUTOFF_DAYS}d).`)
        }
    } finally {
        await browser.close().catch(() => {})
    }
}

const isMain = process.argv[1]?.includes('indeed')
if (isMain) {
    runScrape()
        .catch((err) => {
            console.error('Scraper failed:', err)
            process.exitCode = 1
        })
        .finally(() => prisma.$disconnect())
}