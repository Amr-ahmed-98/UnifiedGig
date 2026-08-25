import 'dotenv/config'
import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ScrapedProject {
    title: string
    description: string | null
    budget: string | null
    url: string
    skills: string[]
    deadline: Date | null
}

const BASE_URL = 'https://www.freelancer.com/jobs/'
const MAX_PAGES = 5

function parseDeadline(raw: string): Date | null {
    const m = raw.match(/(\d+)\s*(hour|day|week|month)s?\s*left/i)
    if (!m) return null

    const amount = parseInt(m[1], 10)
    const unit = m[2].toLowerCase()
    const d = new Date()

    switch (unit) {
        case 'hour': d.setHours(d.getHours() + amount); break
        case 'day': d.setDate(d.getDate() + amount); break
        case 'week': d.setDate(d.getDate() + amount * 7); break
        case 'month': d.setMonth(d.getMonth() + amount); break
    }
    return d
}

function parseProjects(html: string): ScrapedProject[] {
    const $ = cheerio.load(html)
    const projects: ScrapedProject[] = []

    $('a.JobSearchCard-primary-heading-link').each((_, el) => {
        const titleEl = $(el)
        const title = titleEl.text().trim()
        const relativeUrl = titleEl.attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://www.freelancer.com${relativeUrl}`

        const cardRoot = titleEl.closest('.JobSearchCard-item')

        const description = cardRoot
            .find('.JobSearchCard-primary-description')
            .first()
            .text()
            .trim()
            .replace(/\s+/g, ' ') || null

        const deadlineRaw = cardRoot.find('.JobSearchCard-primary-heading-days').first().text().trim()
        const deadline = deadlineRaw ? parseDeadline(deadlineRaw) : null

        const skills: string[] = []
        cardRoot.find('.JobSearchCard-primary-tagsLink').each((_, skillEl) => {
            const skill = $(skillEl).text().trim()
            if (skill) skills.push(skill)
        })

        const priceText = cardRoot.find('.JobSearchCard-primary-price').first().text()
        const budgetMatch = priceText.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/)
        const budget = budgetMatch ? budgetMatch[0] : null

        if (title && fullUrl) {
            projects.push({ title, description, budget, url: fullUrl, skills, deadline })
        }
    })

    return projects
}

async function scrapePage(browser: import('playwright').Browser, pageNum: number): Promise<ScrapedProject[]> {
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const url = pageNum === 0 ? BASE_URL : `${BASE_URL}${pageNum + 1}/`

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const html = await page.content()
    await page.close()

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
                skills: p.skills,
                ...(p.deadline && { deadline: p.deadline }),
            },
            create: {
                title: p.title,
                description: p.description,
                budget: p.budget,
                skills: p.skills,
                deadline: p.deadline,
                url: p.url,
                source: 'freelancer',
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting Freelancer scrape...`)
    const browser = await chromium.launch({ headless: true })

    try {
        for (let p = 0; p < MAX_PAGES; p++) {
            console.log(`Scraping page ${p + 1}...`)
            const projects = await scrapePage(browser, p)

            if (projects.length === 0) {
                console.log('No projects found, stopping.')
                break
            }

            const { created, updated } = await saveProjects(projects)
            console.log(`Page ${p + 1}: ${projects.length} found (${created} new, ${updated} updated)`)

            await new Promise((r) => setTimeout(r, 2000))
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