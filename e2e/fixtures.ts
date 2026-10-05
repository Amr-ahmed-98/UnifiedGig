import type { Page } from '@playwright/test'
import type { Job } from '../src/types/job'
import type { FreelanceProject } from '../src/types/freelance'
import type { SocialJobPost } from '../src/types/socialJob'
import type { LearningMaterial } from '../src/types/material'

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
