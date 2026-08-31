import 'dotenv/config'
import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'

interface ListedProject {
    title: string
    description: string | null
    url: string
    postedAt: Date | null
}

interface DetailedProject extends ListedProject {
    budget: string | null
    skills: string[]
    isOpen: boolean
}

const LIST_URL = 'https://mostaql.com/projects'
const MAX_LIST_PAGES = 5
const CUTOFF_DAYS = 3
const DETAIL_REQUEST_DELAY_MS = 800

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

        // Try extracting time from listing row
        let postedAt: Date | null = null
        const timeEl = card.find('time').first()
        const datetimeAttr = timeEl.attr('datetime')
        if (datetimeAttr) {
            postedAt = new Date(datetimeAttr.replace(' ', 'T'))
        } else if (timeEl.text().trim()) {
            postedAt = parseRelativeDate(timeEl.text().trim())
        }

        if (title && fullUrl) {
            projects.push({ title, description, url: fullUrl, postedAt })
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
    const isOpen = statusClass.includes('label-prj-open') || statusEl?.text().includes('مفتوح') || false

    const postedRaw = meta['تاريخ النشر']?.find('time').attr('datetime') || null
    let postedAt: Date | null = postedRaw ? new Date(postedRaw.replace(' ', 'T')) : null
    if (!postedAt && meta['تاريخ النشر']) {
        const text = meta['تاريخ النشر'].text().trim()
        postedAt = parseRelativeDate(text)
    }

    const budgetText = meta['الميزانية']?.text().trim() || null
    const budget = budgetText || null

    const skills: string[] = []
    panel.find('ul.skills li.skills__item bdi, ul.skills li a').each((_, skillEl) => {
        const skill = $(skillEl).text().trim()
        if (skill && !skills.includes(skill)) skills.push(skill)
    })

    return { budget, skills, isOpen, postedAt }
}

async function scrapeListPage(page: import('playwright').Page, pageNum: number): Promise<ListedProject[]> {
    const url = pageNum === 0 ? LIST_URL : `${LIST_URL}?page=${pageNum + 1}`

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const html = await page.content()
    return parseListPage(html)
}

async function scrapeDetailPage(page: import('playwright').Page, url: string) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(600)
        const html = await page.content()
        return parseDetailPage(html)
    } catch (err: any) {
        console.warn(`[Mostaql] Warning: Could not fetch detail page for ${url} (${err.message})`)
        return { budget: null, skills: [], isOpen: true, postedAt: null }
    }
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
                postedAt: p.postedAt,
                isOpen: p.isOpen,
            },
            create: {
                title: p.title,
                description: p.description,
                budget: p.budget,
                skills: p.skills,
                deadline: null,
                postedAt: p.postedAt,
                isOpen: p.isOpen,
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
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    })
    const listPage = await context.newPage()
    const detailPage = await context.newPage()

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS)

    try {
        const listed: ListedProject[] = []

        for (let p = 0; p < MAX_LIST_PAGES; p++) {
            console.log(`Listing page ${p + 1}...`)
            const projects = await scrapeListPage(listPage, p)

            if (projects.length === 0) {
                console.log('No projects found, stopping list pass.')
                break
            }

            // Check if all projects on this page are older than cutoff
            const allStale = projects.every((pr) => pr.postedAt && pr.postedAt < cutoff)
            listed.push(...projects)

            if (allStale) {
                console.log(`All projects on page ${p + 1} are older than ${CUTOFF_DAYS} days. Stopping list pagination.`)
                break
            }

            await new Promise((r) => setTimeout(r, 1500))
        }

        console.log(`Found ${listed.length} listed projects, checking details...`)

        const toSave: DetailedProject[] = []

        for (let i = 0; i < listed.length; i++) {
            const project = listed[i]

            // If we already parsed postedAt from list page and it's older than cutoff, skip immediately
            if (project.postedAt && project.postedAt < cutoff) {
                console.log(`[${i + 1}/${listed.length}] Skip (older than ${CUTOFF_DAYS} days): ${project.title}`)
                continue
            }

            // Check if we already have detailed info in database
            const existing = await prisma.freelanceProject.findUnique({
                where: { url: project.url },
                select: { budget: true, skills: true, isOpen: true, postedAt: true, updatedAt: true },
            })

            if (existing && existing.skills.length > 0 && existing.budget) {
                // Reuse existing detail info to save network requests
                toSave.push({
                    ...project,
                    budget: existing.budget,
                    skills: existing.skills,
                    isOpen: existing.isOpen,
                    postedAt: project.postedAt || existing.postedAt,
                })
                continue
            }

            console.log(`[${i + 1}/${listed.length}] Fetching details: ${project.title}`)
            const detail = await scrapeDetailPage(detailPage, project.url)

            if (!detail.isOpen) {
                console.log(`Skip (closed): ${project.title}`)
                await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
                continue
            }

            const finalPostedAt = detail.postedAt || project.postedAt
            if (finalPostedAt && finalPostedAt < cutoff) {
                console.log(`Skip (older than ${CUTOFF_DAYS} days): ${project.title}`)
                await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
                continue
            }

            toSave.push({
                ...project,
                ...detail,
                postedAt: finalPostedAt,
            })

            await new Promise((r) => setTimeout(r, DETAIL_REQUEST_DELAY_MS))
        }

        const { created, updated } = await saveProjects(toSave)
        console.log(`Saved ${toSave.length} open, recent projects (${created} new, ${updated} updated)`)

        // Cleanup only truly stale or closed records
        const { count: removed } = await prisma.freelanceProject.deleteMany({
            where: {
                source: 'mostaql',
                OR: [
                    { isOpen: false },
                    { postedAt: { lt: cutoff } },
                    { postedAt: null, createdAt: { lt: cutoff } },
                ],
            },
        })
        console.log(`Removed ${removed} closed/stale mostaql rows from db`)
    } finally {
        await listPage.close()
        await detailPage.close()
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