import type { Page } from '@playwright/test'
import type { Job } from '../src/types/job'
import type { FreelanceProject } from '../src/types/freelance'

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
