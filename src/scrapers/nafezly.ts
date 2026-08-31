import 'dotenv/config'
import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ScrapedProject {
    title: string
    description: string | null
    budget: string | null
    url: string
    postedAt: Date | null
    isOpen: boolean
}

const BASE_URL = 'https://nafezly.com/projects'
const MAX_PAGES = 5
const CUTOFF_DAYS = 3
// nafezly list page gives status text (مفتوح / تحت التنفيذ / منتهي) and a
// relative "posted X ago" (بالعربي) directly on the card - no detail page needed.

function parseRelativeDate(text: string): Date | null {
    const clean = text.trim()
    const now = new Date()

    if (/منذ\s*لحظات|الآن/i.test(clean)) return now

    const m = clean.match(/منذ\s*(\d+)?\s*(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|ايام|أسبوع|اسبوع|أسابيع|اسابيع|شهر|أشهر|اشهر)/)
    if (!m) return null

    const amount = m[1] ? parseInt(m[1], 10) : 1
    const unit = m[2]

    if (unit.startsWith('دقيق')) now.setMinutes(now.getMinutes() - amount)
    else if (unit.startsWith('ساع')) now.setHours(now.getHours() - amount)
    else if (unit.startsWith('يوم') || unit.startsWith('أيام') || unit.startsWith('ايام')) now.setDate(now.getDate() - amount)
    else if (unit.startsWith('أسبوع') || unit.startsWith('اسبوع') || unit.startsWith('أسابيع') || unit.startsWith('اسابيع')) now.setDate(now.getDate() - amount * 7)
    else if (unit.startsWith('شهر') || unit.startsWith('أشهر') || unit.startsWith('اشهر')) now.setMonth(now.getMonth() - amount)

    return now
}

function parseProjects(html: string): ScrapedProject[] {
    const $ = cheerio.load(html)
    const projects: ScrapedProject[] = []

    $('.project-box').each((_, el) => {
        const card = $(el)

        const titleEl = card.find('.col-lg-9 a[href*="/project/"]').first()
        const title = titleEl.text().trim()
        const relativeUrl = titleEl.attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://nafezly.com${relativeUrl}`

        const description = card.find('h3').first().text().trim().replace(/\s+/g, ' ') || null

        const budgetText = card.find('.fa-usd-circle').first().parent().text().trim()
        const budget = budgetText || null

        const meta = card.find('.col-lg-3').text()

        const timeMatch = meta.match(/منذ[^0-9]*\d*[^0-9]*(?:دقيقة|دقائق|ساعة|ساعات|يوم|أيام|ايام|أسبوع|اسبوع|أسابيع|اسابيع|شهر|أشهر|اشهر|لحظات)/)
        const postedAt = timeMatch ? parseRelativeDate(timeMatch[0]) : null

        const statusOpen = meta.includes('مفتوح')

        if (title && fullUrl) {
            projects.push({ title, description, budget, url: fullUrl, postedAt, isOpen: statusOpen })
        }
    })

    return projects
}

async function scrapePage(page: import('playwright').Page, pageNum: number): Promise<ScrapedProject[]> {
    const url = pageNum === 0 ? BASE_URL : `${BASE_URL}?page=${pageNum + 1}`

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const html = await page.content()
    return parseProjects(html)
}

async function saveProjects(projects: ScrapedProject[]) {
    let created = 0
    let updated = 0

    for (const p of projects) {
        const existing = await prisma.freelanceProject.findUnique({ where: { url: p.url } })

        await prisma.freelanceProject.upsert({
            where: { url: p.url },
            update: {
                title: p.title,
                description: p.description,
                budget: p.budget,
                isOpen: p.isOpen,
                ...(p.postedAt && { postedAt: p.postedAt }),
            },
            create: {
                title: p.title,
                description: p.description,
                budget: p.budget,
                skills: [],
                deadline: null,
                postedAt: p.postedAt,
                isOpen: p.isOpen,
                url: p.url,
                source: 'nafezly',
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting Nafezly scrape...`)
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })
    const page = await context.newPage()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS)

    try {
        for (let p = 0; p < MAX_PAGES; p++) {
            console.log(`Scraping page ${p + 1}...`)
            const projects = await scrapePage(page, p)

            if (projects.length === 0) {
                console.log('No projects found, stopping.')
                break
            }

            // keep only open + within cutoff (or unknown date, be safe)
            const keep = projects.filter((pr) => pr.isOpen && (!pr.postedAt || pr.postedAt >= cutoff))
            const { created, updated } = await saveProjects(keep)
            console.log(`Page ${p + 1}: ${projects.length} found, ${keep.length} open+recent (${created} new, ${updated} updated)`)

            const allStale = projects.every((pr) => pr.postedAt && pr.postedAt < cutoff)
            if (allStale) {
                console.log(`All projects on page ${p + 1} older than ${CUTOFF_DAYS} days. Stopping pagination.`)
                break
            }

            await new Promise((r) => setTimeout(r, 1500))
        }

        const { count: removed } = await prisma.freelanceProject.deleteMany({
            where: {
                source: 'nafezly',
                OR: [
                    { isOpen: false },
                    { postedAt: { lt: cutoff } },
                    { postedAt: null, createdAt: { lt: cutoff } },
                ],
            },
        })
        console.log(`Cleaned up ${removed} closed/stale nafezly rows from db`)
    } finally {
        await page.close()
        await context.close()
        await browser.close()
        await prisma.$disconnect()
    }

    console.log('Scrape complete.')
}

main().catch((err) => {
    console.error('Scraper failed:', err)
    process.exitCode = 1
})