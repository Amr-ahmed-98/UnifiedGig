import type { Page } from '@playwright/test'
import type { Job } from '../src/types/job'
import type { FreelanceProject } from '../src/types/freelance'
import type { SocialJobPost } from '../src/types/socialJob'

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
