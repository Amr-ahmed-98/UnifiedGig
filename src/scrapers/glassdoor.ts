import 'dotenv/config'
import { chromium } from 'patchright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ScrapedJob {
    title: string
    company: string
    location: string
    salary: string | null
    description: string | null
    url: string
    remote: boolean
    hybrid: boolean
}


const ROLES = [
    'full-stack-developer',
    'frontend-developer',
    'backend-developer',
    'ui-ux-designer',
    'digital-marketing',
    'accountant',
    'sales-representative',
]

const BUILD_URL = (role: string) => {
    const slug = role.toLowerCase().trim().replace(/\s+/g, '-')
    const start = 6 // length of "egypt-" prefix
    const end = start + slug.length - 1
    return `https://www.glassdoor.com/Job/egypt-${slug}-jobs-SRCH_IL.0,5_IN69_KO${start},${end}.htm?fromAge=3`
}

const MAX_PAGES_PER_ROLE = 3

function parseJobs(html: string): ScrapedJob[] {
    const $ = cheerio.load(html)
    const jobs: ScrapedJob[] = []

    $('li[data-test="jobListing"]').each((_, el) => {
        const card = $(el)

        const title = card.find('a[data-test="job-title"]').text().trim()
        const relativeUrl = card.find('a[data-test="job-title"]').attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://www.glassdoor.com${relativeUrl}`

        const company = card.find('[class*="compactEmployerName"]').first().text().trim()
        const location = card.find('[data-test="emp-location"]').first().text().trim()
        const salaryRaw = card.find('[data-test="detailSalary"]').first().text().trim()
        const salary = salaryRaw.replace(/\(Employer provided\)/i, '').trim() || null
        const description = card.find('[data-test="descSnippet"]').first().text().trim() || null

        const remote = /Remote/i.test(location) || /Remote/i.test(description ?? '')
        const hybrid = /Hybrid/i.test(location) || /Hybrid/i.test(description ?? '')

        if (title && fullUrl) {
            jobs.push({ title, company, location, salary, description, url: fullUrl, remote, hybrid })
        }
    })

    return jobs
}

async function scrapeRole(browser: import('patchright').Browser, role: string): Promise<ScrapedJob[]> {
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const allJobs: ScrapedJob[] = []

    for (let p = 0; p < MAX_PAGES_PER_ROLE; p++) {
        const url = p === 0 ? BUILD_URL(role) : `${BUILD_URL(role)}&p=${p + 1}`

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await page.waitForTimeout(3000)
            const html = await page.content()
            // TEMP DEBUG — remove once diagnosed
            console.log(`  [DEBUG] page title: ${await page.title()}`)
            console.log(`  [DEBUG] final URL: ${page.url()}`)
            console.log(`  [DEBUG] html length: ${html.length}`)
            console.log(`  [DEBUG] contains "jobListing": ${html.includes('jobListing')}`)
            console.log(`  [DEBUG] first 500 chars: ${html.slice(0, 500)}`)
            const jobs = parseJobs(html)

            if (jobs.length === 0) break
            allJobs.push(...jobs)
        } catch (err) {
            console.log(`  role=${role} page=${p + 1} failed:`, err)
            break
        }

        await new Promise((r) => setTimeout(r, 2500))
    }

    await page.close()
    return allJobs
}

async function saveJobs(jobs: ScrapedJob[]) {
    let created = 0
    let updated = 0

    for (const job of jobs) {
        const existing = await prisma.job.findUnique({ where: { url: job.url } })

        await prisma.job.upsert({
            where: { url: job.url },
            update: {
                title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
                description: job.description,
                remote: job.remote,
                hybrid: job.hybrid,
            },
            create: {
                title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
                description: job.description,
                url: job.url,
                remote: job.remote,
                hybrid: job.hybrid,
                source: 'glassdoor',
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting Glassdoor scrape (Egypt, last 3 days)...`)
    const browser = await chromium.launch({ headless: true })

    try {
        for (const role of ROLES) {
            console.log(`Scraping role: ${role}...`)
            const jobs = await scrapeRole(browser, role)

            if (jobs.length === 0) {
                console.log(`  no jobs found for ${role}`)
                continue
            }

            const { created, updated } = await saveJobs(jobs)
            console.log(`  ${role}: ${jobs.length} found (${created} new, ${updated} updated)`)

            await new Promise((r) => setTimeout(r, 3000))
        }
    } finally {
        await browser.close()
        await prisma.$disconnect()
    }

    console.log('Scrape complete.')
}

main().catch((err) => {
    console.error('Scraper failed:', err)
    process.exitCode = 1
})