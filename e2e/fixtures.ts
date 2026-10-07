import type { Page } from '@playwright/test'
import type { Job } from '../src/types/job'
import type { FreelanceProject } from '../src/types/freelance'
import type { SocialJobPost } from '../src/types/socialJob'
import type { LearningMaterial } from '../src/types/material'
import type { FollowProfile } from '../src/types/profile'
import { parseTools, matchKnownTools, type Prompt } from '../src/types/prompt'

export const mockJobs: Job[] = [
    {
        id: 'job-1',
        title: 'Senior Backend Developer',
        company: 'Acme Corp',
        location: 'Cairo, Egypt',
        datePosted: new Date().toISOString(),
        remote: true,
        hybrid: false,
        salary: '$4,000/mo',
        description: 'Build and scale our core API.',
        url: 'https://example.com/jobs/job-1',
        source: 'wuzzuf',
    },
    {
        id: 'job-2',
        title: 'Frontend Engineer',
        company: 'Globex',
        location: 'Giza, Egypt',
        datePosted: new Date().toISOString(),
        remote: false,
        hybrid: true,
        salary: null,
        description: 'React and TypeScript work on our dashboard.',
        url: 'https://example.com/jobs/job-2',
        source: 'linkedin',
    },
    {
        id: 'job-3',
        title: 'On-site DevOps Engineer',
        company: 'Initech',
        location: 'Alexandria, Egypt',
        datePosted: new Date().toISOString(),
        remote: false,
        hybrid: false,
        salary: '$3,200/mo',
        description: null,
        url: 'https://example.com/jobs/job-3',
        source: 'indeed',
    },
]

export const mockProjects: FreelanceProject[] = [
    {
        id: 'proj-1',
        title: 'Build a landing page',
        budget: '$500',
        deadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        skills: ['React', 'Tailwind'],
        description: 'A short marketing landing page.',
        url: 'https://example.com/freelance/proj-1',
        source: 'mostaql',
    },
    {
        id: 'proj-2',
        title: 'Fix API rate limiting bug',
        budget: '$150',
        deadline: null,
        skills: ['Node.js'],
        description: 'Debug and patch a rate-limit edge case.',
        url: 'https://example.com/freelance/proj-2',
        source: 'freelancer',
    },
]

export async function mockApi(page: Page, options: { jobs?: Job[]; projects?: FreelanceProject[] } = {}) {
    const jobs = options.jobs ?? mockJobs
    const projects = options.projects ?? mockProjects

    await page.route('**/api/jobs**', async (route) => {
        const url = new URL(route.request().url())
        const q = url.searchParams.get('q')?.toLowerCase()
        const sourceParam = url.searchParams.get('source')
        const sourceFilter = sourceParam ? sourceParam.split(',') : null

        let filtered = jobs
        if (q) filtered = filtered.filter((j) => j.title.toLowerCase().includes(q))
        if (sourceFilter) filtered = filtered.filter((j) => sourceFilter.includes(j.source))

        await route.fulfill({ json: { jobs: filtered, total: filtered.length } })
    })

    await page.route('**/api/freelance**', async (route) => {
        const url = new URL(route.request().url())
        const q = url.searchParams.get('q')?.toLowerCase()

        let filtered = projects
        if (q) filtered = filtered.filter((p) => p.title.toLowerCase().includes(q))

        await route.fulfill({ json: { projects: filtered, total: filtered.length } })
    })

    await page.route('**/api/stats**', async (route) => {
        await route.fulfill({
            json: { jobs: jobs.length, projects: projects.length, total: jobs.length + projects.length, sourcesCount: 8 },
        })
    })
}

export const mockSocialPosts: SocialJobPost[] = [
    {
        id: 'social-1',
        title: 'Senior Frontend Engineer',
        authorName: 'Jane Doe',
        authorTitle: 'Engineering Manager',
        authorImageUrl: null,
        description: 'We are hiring a senior frontend engineer for our platform team.',
        salary: '$120k - $160k',
        location: 'Cairo, Egypt',
        remote: false,
        tags: ['Frontend', 'Full-Time'],
        recruiterContact: null,
        imageUrl: null,
        url: 'https://www.linkedin.com/posts/jane-doe_activity-1',
        source: 'linkedin',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 3_600_000).toISOString(),
    },
    {
        id: 'social-2',
        title: 'Remote AI Engineer',
        authorName: 'Ahmed Ali',
        authorTitle: 'Founder at AIStartup',
        authorImageUrl: null,
        description: 'Looking for a machine learning engineer to join our growing team.',
        salary: null,
        location: 'Remote',
        remote: true,
        tags: ['AI/ML', 'Remote'],
        recruiterContact: null,
        imageUrl: null,
        url: 'https://www.linkedin.com/posts/ahmed-ali_activity-2',
        source: 'linkedin',
        createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        expiresAt: new Date(Date.now() + 45 * 3_600_000).toISOString(),
    },
    {
        id: 'social-3',
        title: 'Fractional CTO needed',
        authorName: 'Sara Smith',
        authorTitle: 'CEO at EarlyCo',
        authorImageUrl: null,
        description: 'Hiring a fractional CTO for 2 days a week. Contract engagement.',
        salary: null,
        location: 'Dubai, UAE',
        remote: false,
        tags: ['Fractional', 'Contract'],
        recruiterContact: null,
        imageUrl: null,
        url: 'https://www.linkedin.com/posts/sara-smith_activity-3',
        source: 'linkedin',
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        expiresAt: new Date(Date.now() + 5 * 3_600_000).toISOString(),
    },
]

export async function mockSocialApi(page: Page, options: { posts?: SocialJobPost[] } = {}) {
    const posts = options.posts ?? mockSocialPosts

    await page.route('**/api/social-jobs**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const method = request.method()

        if (method === 'GET') {
            const q = url.searchParams.get('q')?.toLowerCase()
            const tags = url.searchParams.getAll('tag')
            const remoteOnly = url.searchParams.get('remote') === 'true'
            const skip = Number(url.searchParams.get('skip') ?? '0')
            const take = Number(url.searchParams.get('take') ?? '24')

            let filtered = posts
            if (q) {
                filtered = filtered.filter(
                    (p) =>
                        p.title.toLowerCase().includes(q) ||
                        (p.authorName ?? '').toLowerCase().includes(q)
                )
            }
            if (tags.length) filtered = filtered.filter((p) => tags.some((t) => p.tags.includes(t)))
            if (remoteOnly) filtered = filtered.filter((p) => p.remote)

            await route.fulfill({ json: { posts: filtered.slice(skip, skip + take), total: filtered.length } })
            return
        }

        if (method === 'DELETE') {
            await route.fulfill({ json: { ok: true } })
            return
        }

        if (method === 'POST' && url.pathname.endsWith('/preview')) {
            await route.fulfill({
                json: {
                    preview: {
                        title: 'Newly Embedded Role',
                        authorName: 'Jane Doe',
                        description: 'A brand new embedded post about an open role.',
                        imageUrl: null,
                        salary: 'Unknown',
                        location: 'Unknown',
                        remote: true,
                    },
                    tags: ['Remote'],
                    resolvedUrl: 'https://www.linkedin.com/posts/jane-doe_activity-9',
                },
            })
            return
        }

        if (method === 'POST') {
            await route.fulfill({
                status: 201,
                json: {
                    post: {
                        id: 'social-9',
                        title: 'Newly Embedded Role',
                        authorName: 'Jane Doe',
                        authorTitle: null,
                        authorImageUrl: null,
                        description: 'A brand new embedded post about an open role.',
                        salary: null,
                        location: null,
                        remote: true,
                        tags: ['Remote'],
                        recruiterContact: null,
                        imageUrl: null,
                        url: 'https://www.linkedin.com/posts/jane-doe_activity-9',
                        source: 'linkedin',
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
                    },
                },
            })
            return
        }

        await route.fulfill({ json: {} })
    })
}

// ---------------------------------------------------------------------------
// Learning materials
// ---------------------------------------------------------------------------

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

export const mockMaterials: LearningMaterial[] = [
    { id: 'mat-1', field: 'software-engineering', title: 'Backend Developer Roadmap', url: 'https://roadmap.sh/backend', type: 'docs', description: 'Step-by-step map of what to learn and in which order.', createdAt: daysAgo(3) },
    { id: 'mat-2', field: 'software-engineering', title: 'CS50x: Introduction to Computer Science', url: 'https://cs50.harvard.edu/x/', type: 'course', description: 'Free Harvard course — the best starting point for fundamentals.', createdAt: daysAgo(5) },
    { id: 'mat-3', field: 'software-engineering', title: 'The System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'repo', description: 'Interview-focused system design notes with diagrams.', createdAt: daysAgo(8) },
    { id: 'mat-4', field: 'software-engineering', title: 'Refactoring Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns', type: 'article', description: null, createdAt: daysAgo(12) },
    { id: 'mat-5', field: 'networking', title: 'Jeremy’s IT Lab CCNA', url: 'https://www.youtube.com/@JeremysITLab', type: 'video', description: 'Free full CCNA course with labs.', createdAt: daysAgo(2) },
    { id: 'mat-6', field: 'networking', title: 'Subnetting Practice', url: 'https://www.subnetting.org/', type: 'article', description: null, createdAt: daysAgo(6) },
    { id: 'mat-7', field: 'cybersecurity', title: 'TryHackMe', url: 'https://tryhackme.com/', type: 'course', description: 'Guided hands-on labs for beginners.', createdAt: daysAgo(4) },
]

interface MaterialsApiOptions {
    materials?: LearningMaterial[]
    /** When set, POST /api/materials fails with this status + message */
    failPost?: { status: number; error: string }
}

/**
 * Stateful mock of /api/materials: GET filters/paginates the in-memory list and
 * computes counts like the real route; POST prepends the new material so the
 * add-then-refetch flow behaves end to end.
 */
export async function mockMaterialsApi(page: Page, options: MaterialsApiOptions = {}) {
    const store: LearningMaterial[] = [...(options.materials ?? mockMaterials)]

    await page.route('**/api/materials**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())

        if (request.method() === 'POST') {
            if (options.failPost) {
                await route.fulfill({ status: options.failPost.status, json: { error: options.failPost.error } })
                return
            }
            const body = request.postDataJSON() as Omit<LearningMaterial, 'id' | 'createdAt'>
            const material: LearningMaterial = {
                ...body,
                description: body.description ?? null,
                id: `mat-new-${store.length + 1}`,
                createdAt: new Date().toISOString(),
            }
            store.unshift(material)
            await route.fulfill({ status: 201, json: { material } })
            return
        }

        const field = url.searchParams.get('field')
        const q = url.searchParams.get('q')?.toLowerCase()
        const types = (url.searchParams.get('type') ?? '').split(',').filter(Boolean)
        const skip = Number(url.searchParams.get('skip') ?? '0')
        const take = Number(url.searchParams.get('take') ?? '24')

        const inField = store.filter((m) => !field || m.field === field)
        const matched = inField
            .filter((m) => types.length === 0 || types.includes(m.type))
            .filter((m) => !q || m.title.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

        const count = (rows: LearningMaterial[], key: 'field' | 'type') =>
            rows.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m[key]]: (acc[m[key]] ?? 0) + 1 }), {})

        await route.fulfill({
            json: {
                materials: matched.slice(skip, skip + take),
                total: matched.length,
                counts: { fields: count(store, 'field'), types: count(inField, 'type') },
            },
        })
    })
}

// ---------------------------------------------------------------------------
// People to follow
// ---------------------------------------------------------------------------

const profDaysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

export const mockProfiles: FollowProfile[] = [
    { id: 'prof-1', platform: 'linkedin', name: 'Mariam Adel', url: 'https://linkedin.com/in/mariam-adel', headline: 'Senior Tech Recruiter · Fintech', postsAbout: 'Backend, mobile and QA roles in Cairo and remote', createdAt: profDaysAgo(1) },
    { id: 'prof-2', platform: 'linkedin', name: 'Omar Khaled', url: 'https://linkedin.com/in/omar-khaled', headline: 'Talent Acquisition Lead · Telecom', postsAbout: 'Network engineers, NOC and cloud support', createdAt: profDaysAgo(2) },
    { id: 'prof-3', platform: 'facebook', name: 'Egypt Remote Jobs', url: 'https://facebook.com/groups/egypt-remote-jobs', headline: 'Community group · 120k members', postsAbout: 'Daily remote openings for MENA candidates', createdAt: profDaysAgo(3) },
    { id: 'prof-4', platform: 'linkedin', name: 'Nour Hassan', url: 'https://linkedin.com/in/nour-hassan', headline: 'HR Business Partner · E-commerce', postsAbout: 'Internships and graduate programmes', createdAt: profDaysAgo(4) },
    { id: 'prof-5', platform: 'telegram', name: 'Freelance Devs MENA', url: 'https://t.me/freelance_devs_mena', headline: 'Channel · project leads & gigs', postsAbout: 'Short freelance web and app projects', createdAt: profDaysAgo(5) },
    { id: 'prof-6', platform: 'x', name: 'Youssef Fathy', url: 'https://x.com/youssef_fathy', headline: 'Engineering Manager · hiring often', postsAbout: 'Frontend and React roles, Europe remote', createdAt: profDaysAgo(6) },
    { id: 'prof-7', platform: 'instagram', name: 'Design Jobs Cairo', url: 'https://instagram.com/design.jobs.cairo', headline: 'Page · design & creative roles', postsAbout: 'UI/UX, motion and brand design openings', createdAt: profDaysAgo(7) },
    { id: 'prof-8', platform: 'linkedin', name: 'Salma Ibrahim', url: 'https://linkedin.com/in/salma-ibrahim', headline: 'Recruiter · Data & AI', postsAbout: 'Data analyst, data engineer and ML roles', createdAt: profDaysAgo(8) },
]

interface ProfilesApiOptions {
    profiles?: FollowProfile[]
    /** When set, every POST /api/profiles fails with this status + message */
    failPost?: { status: number; error: string }
}

/** Mirrors the server's dedup key: no hash, no "www.", no trailing slash. */
function normalizeUrl(raw: string) {
    try {
        const u = new URL(raw.trim())
        return `${u.protocol}//${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`
    } catch {
        return raw.trim()
    }
}

/**
 * Stateful mock of /api/profiles: GET filters/paginates and returns unfiltered
 * per-platform counts like the real route; POST rejects duplicate links with 409
 * and otherwise prepends the new profile so add-then-refetch works end to end.
 */
export async function mockProfilesApi(page: Page, options: ProfilesApiOptions = {}) {
    const store: FollowProfile[] = [...(options.profiles ?? mockProfiles)]

    await page.route('**/api/profiles**', async (route) => {
        const request = route.request()

        if (request.method() === 'POST') {
            if (options.failPost) {
                await route.fulfill({ status: options.failPost.status, json: { error: options.failPost.error } })
                return
            }
            const body = request.postDataJSON() as Omit<FollowProfile, 'id' | 'createdAt'>
            const url = normalizeUrl(body.url)
            if (store.some((p) => p.url === url)) {
                await route.fulfill({ status: 409, json: { error: 'That profile is already listed' } })
                return
            }
            const profile: FollowProfile = {
                ...body,
                url,
                headline: body.headline ?? null,
                postsAbout: body.postsAbout ?? null,
                id: `prof-new-${store.length + 1}`,
                createdAt: new Date().toISOString(),
            }
            store.unshift(profile)
            await route.fulfill({ status: 201, json: { profile } })
            return
        }

        const sp = new URL(request.url()).searchParams
        const q = sp.get('q')?.toLowerCase()
        const platforms = (sp.get('platform') ?? '').split(',').filter(Boolean)
        const skip = Number(sp.get('skip') ?? '0')
        const take = Number(sp.get('take') ?? '24')

        const matched = store
            .filter((p) => platforms.length === 0 || platforms.includes(p.platform))
            .filter(
                (p) =>
                    !q ||
                    p.name.toLowerCase().includes(q) ||
                    (p.headline ?? '').toLowerCase().includes(q) ||
                    (p.postsAbout ?? '').toLowerCase().includes(q)
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

        const counts = store.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] ?? 0) + 1 }), {})

        await route.fulfill({ json: { profiles: matched.slice(skip, skip + take), total: matched.length, counts } })
    })
}

// ---------------------------------------------------------------------------
// AI prompt library
// ---------------------------------------------------------------------------

const promptHoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

export const mockPrompts: Prompt[] = [
    { id: 'prompt-1', category: 'programming', title: 'Senior code review', body: 'Act as a senior [language] engineer. Review the code below for bugs, security issues and readability.\n\n[paste code]', tools: ['ChatGPT', 'Claude', 'Gemini'], createdAt: promptHoursAgo(1) },
    { id: 'prompt-2', category: 'programming', title: "Explain an error like I'm new", body: 'I got this error while working with [framework/tool]: [paste error]. Explain what it means and how to fix it.', tools: ['ChatGPT', 'Claude'], createdAt: promptHoursAgo(2) },
    { id: 'prompt-3', category: 'images', title: 'Professional headshot', body: 'Professional LinkedIn headshot of a [age] [gender] [profession], soft natural window light, neutral background.', tools: ['Midjourney', 'DALL·E', 'Gemini'], createdAt: promptHoursAgo(3) },
    { id: 'prompt-4', category: 'video', title: 'Cinematic B-roll shot', body: 'A slow cinematic dolly-in shot of [subject] in [location] at golden hour. Duration 8 seconds.', tools: ['Sora', 'Runway', 'Veo'], createdAt: promptHoursAgo(4) },
    { id: 'prompt-5', category: 'career', title: 'Tailor my CV to a job post', body: 'Here is a job description: [paste job post]. Here is my CV: [paste CV]. Rewrite my bullet points to match the role.', tools: ['ChatGPT', 'Claude', 'Gemini'], createdAt: promptHoursAgo(5) },
    { id: 'prompt-6', category: 'writing', title: 'Cold message to a recruiter', body: 'Write a short LinkedIn message (under 80 words) to a recruiter at [company] about the [role] opening.', tools: ['ChatGPT', 'Claude'], createdAt: promptHoursAgo(6) },
]

/** A prompt with no "Works with" tools — the field is optional. */
export const mockPromptWithoutTools: Prompt = {
    id: 'prompt-7',
    category: 'writing',
    title: 'Tone-neutral rewrite',
    body: 'Rewrite the text below in a neutral, professional tone: [paste text]',
    tools: [],
    createdAt: promptHoursAgo(7),
}

interface PromptsApiOptions {
    prompts?: Prompt[]
    /** When set, POST /api/prompts fails with this status + message */
    failPost?: { status: number; error: string }
}

/**
 * Stateful mock of /api/prompts: GET filters/paginates and returns whole-library
 * category counts like the real route (searching tool names too); POST normalises
 * tools and prepends the new prompt so add-then-refetch works end to end.
 */
export async function mockPromptsApi(page: Page, options: PromptsApiOptions = {}) {
    const store: Prompt[] = [...(options.prompts ?? mockPrompts)]

    await page.route('**/api/prompts**', async (route) => {
        const request = route.request()

        if (request.method() === 'POST') {
            if (options.failPost) {
                await route.fulfill({ status: options.failPost.status, json: { error: options.failPost.error } })
                return
            }
            const body = request.postDataJSON() as { category: Prompt['category']; title: string; body: string; tools?: unknown }
            const prompt: Prompt = {
                category: body.category,
                title: body.title,
                body: body.body,
                tools: parseTools(body.tools),
                id: `prompt-new-${store.length + 1}`,
                createdAt: new Date().toISOString(),
            }
            store.unshift(prompt)
            await route.fulfill({ status: 201, json: { prompt } })
            return
        }

        const sp = new URL(request.url()).searchParams
        const q = sp.get('q')?.toLowerCase()
        const categories = (sp.get('category') ?? '').split(',').filter(Boolean)
        const skip = Number(sp.get('skip') ?? '0')
        const take = Number(sp.get('take') ?? '24')
        const toolHits = q ? matchKnownTools(q) : []

        const matched = store
            .filter((p) => categories.length === 0 || categories.includes(p.category))
            .filter(
                (p) =>
                    !q ||
                    p.title.toLowerCase().includes(q) ||
                    p.body.toLowerCase().includes(q) ||
                    p.tools.some((t) => toolHits.includes(t) || t.toLowerCase().includes(q))
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

        const counts = store.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }), {})

        await route.fulfill({ json: { prompts: matched.slice(skip, skip + take), total: matched.length, counts: { categories: counts } } })
    })
}
