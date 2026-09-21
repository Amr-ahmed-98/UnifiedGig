import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sources } from '@/data/sources'
import { DEMO_JOBS, DEMO_PROJECTS } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

export async function GET() {
    // DEMO_MODE=true serves bundled counts so the app can be previewed with
    // no database attached (local dev / sandboxes). Production leaves it unset.
    if (process.env.DEMO_MODE === 'true') {
        return NextResponse.json({
            jobs: DEMO_JOBS.length,
            projects: DEMO_PROJECTS.length,
            total: DEMO_JOBS.length + DEMO_PROJECTS.length,
            sourcesCount: sources.length,
        })
    }

    try {
        const [jobsCount, freelanceCount] = await Promise.all([
            prisma.job.count(),
            prisma.freelanceProject.count(),
        ])

        return NextResponse.json({
            jobs: jobsCount,
            projects: freelanceCount,
            total: jobsCount + freelanceCount,
            sourcesCount: sources.length,
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({ error: 'Failed to fetch platform statistics' }, { status: 500 })
    }
}
