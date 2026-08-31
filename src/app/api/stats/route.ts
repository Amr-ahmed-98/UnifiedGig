import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sources } from '@/data/sources'

export const dynamic = 'force-dynamic'

export async function GET() {
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
