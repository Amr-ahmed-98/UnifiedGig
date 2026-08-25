import 'dotenv/config'
import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ListedProject {
    title: string
    description: string | null
    url: string
}

interface DetailedProject extends ListedProject {
    budget: string | null
    skills: string[]
    isOpen: boolean
    postedAt: Date | null
}

const LIST_URL = 'https://mostaql.com/projects'
const MAX_LIST_PAGES = 5
const CUTOFF_DAYS = 3
const DETAIL_REQUEST_DELAY_MS = 1500

function parseListPage(html: string): ListedProject[] {
    const $ = cheerio.load(html)
    const projects: ListedProject[] = []

    $('tr.project-row').each((_, el) => {
        const card = $(el)

        const titleEl = card.find('.card--title h2 a').first()
        const title = titleEl.text().trim()
        const relativeUrl = titleEl.attr('href') || ''
        const fullUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://mostaql.com${relativeUrl}`

        const description = card
            .find('p.project__brief a')
            .first()
            .text()
            .trim()
            .replace(/\s+/g, ' ') || null

        if (title && fullUrl) {
            projects.push({ title, description, url: fullUrl })
        }
    })

    return projects
}

// Reads the "#project-meta-panel" block on a single project detail page:
// status (open/closed), posted date, budget range, and skill tags.
function parseDetailPage(html: string): {
    budget: string | null
    skills: string[]
    isOpen: boolean
    postedAt: Date | null
} {
    const $ = cheerio.load(html)
    const panel = $('#project-meta-panel')

    const meta: Record<string, ReturnType<typeof panel.find>> = {}
    panel.find('.meta-row').each((_, row) => {
        const label = $(row).find('.meta-label').first().text().trim()
        if (label) meta[label] = $(row).find('.meta-value').first()
    })

    const statusEl = meta['حالة المشروع']?.find('bdi')
    const statusClass = statusEl?.attr('class') || ''
    const isOpen = statusClass.includes('label-prj-open')

    const postedRaw = meta['تاريخ النشر']?.find('time').attr('datetime') || null
    const postedAt = postedRaw ? new Date(postedRaw.replace(' ', 'T')) : null

    const budgetText = meta['الميزانية']?.text().trim() || null
    const budget = budgetText || null

    const skills: string[] = []
    panel.find('ul.skills li.skills__item bdi').each((_, skillEl) => {
        const skill = $(skillEl).text().trim()
        if (skill) skills.push(skill)
    })

    return { budget, skills, isOpen, postedAt }
}

async function scrapeListPage(browser: import('playwright').Browser, pageNum: number): Promise<ListedProject[]> {
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    const url = pageNum === 0 ? LIST_URL : `${LIST_URL}?page=${pageNum + 1}`

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const html = await page.content()
    await page.close()

    return parseListPage(html)
}

async function scrapeDetailPage(browser: import('playwright').Browser, url: string) {
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)

    const html = await page.content()
    await page.close()

    return parseDetailPage(html)
}

async function saveProjects(projects: DetailedProject[]) {
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
            },
            create: {
                title: p.title,
                description: p.description,
                budget: p.budget,
                skills: p.skills,
                deadline: null,
                url: p.url,
                source: 'mostaql',
            },
        })

        if (existing) updated++
        else created++
    }

    return { created, updated }
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting Mostaql scrape...`)
    const browser = await chromium.launch({ headless: true })
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS)

    try {
        const listed: ListedProject[] = []

        for (let p = 0; p < MAX_LIST_PAGES; p++) {
            console.log(`Listing page ${p + 1}...`)
            const projects = await scrapeListPage(browser, p)

            if (projects.length === 0) {
                console.log('No projects found, stopping list pass.')
                break
            }

            listed.push(...projects)
            await new Promise((r) => setTimeout(r, 2000))
        }

        console.log(`Found ${listed.length} listed projects, checking details...`)

        const toSave: DetailedProject[] = []

        for (let i = 0; i < listed.length; i++) {
            const project = listed[i]
            console.log(`[${i + 1}/${listed.length}] Checking: ${project.title}`)
            const detail = await scrapeDetailPage(browser, project.url)

            if (!detail.isOpen) {
                console.log(`Skip (closed): ${project.title}`)
                await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
                continue
            }

            if (detail.postedAt && detail.postedAt < cutoff) {
                console.log(`Skip (older than ${CUTOFF_DAYS} days): ${project.title}`)
                await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
                continue
            }

            toSave.push({ ...project, ...detail })
            await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
        }

        const { created, updated } = await saveProjects(toSave)
        console.log(`Saved ${toSave.length} open, recent projects (${created} new, ${updated} updated)`)
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