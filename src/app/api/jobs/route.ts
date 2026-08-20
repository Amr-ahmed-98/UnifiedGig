import { NextRequest, NextResponse } from 'next/server'
import { getJobs } from '@/services/jobService'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const remote = searchParams.get('remote')
    const hybrid = searchParams.get('hybrid')
    const source = searchParams.get('source')
    const location = searchParams.get('location')
    const datePostedAfter = searchParams.get('datePostedAfter')

    try {
        const jobs = await getJobs({
            remote: remote === 'true' ? true : remote === 'false' ? false : undefined,
            hybrid: hybrid === 'true' ? true : hybrid === 'false' ? false : undefined,
            source: source ?? undefined,
            location: location ?? undefined,
            datePostedAfter: datePostedAfter ? new Date(datePostedAfter) : undefined,
        })

        return NextResponse.json(jobs)
    } catch (error) {
        console.error('Error fetching jobs:', error)
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }
}