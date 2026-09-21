import { NextRequest, NextResponse } from 'next/server'
import { getJobs } from '@/services/jobService'
import { DEMO_JOBS } from '@/lib/demo-data'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const remote = searchParams.get('remote')
    const hybrid = searchParams.get('hybrid')
    const sourceParams = searchParams.getAll('source')
    const location = searchParams.get('location')
    const datePostedAfter = searchParams.get('datePostedAfter')
    const q = searchParams.get('q')
    const take = searchParams.get('take')
    const skip = searchParams.get('skip')

    const sources = sourceParams.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)

    // DEMO_MODE=true serves bundled listings so the app can be previewed with
    // no database attached (local dev / sandboxes). Production leaves it unset.
    if (process.env.DEMO_MODE === 'true') {
        const needle = q?.toLowerCase()
        let jobs = DEMO_JOBS
        if (needle) {
            jobs = jobs.filter(
                (j) =>
                    j.title.toLowerCase().includes(needle) ||
                    j.company.toLowerCase().includes(needle)
            )
        }
        if (location) {
            const loc = location.toLowerCase()
            jobs = jobs.filter((j) => j.location?.toLowerCase().includes(loc))
        }
        if (sources.length > 0) jobs = jobs.filter((j) => sources.includes(j.source))
        if (remote === 'true') jobs = jobs.filter((j) => j.remote)
        if (hybrid === 'true') jobs = jobs.filter((j) => j.hybrid)
        if (datePostedAfter) {
            const after = new Date(datePostedAfter).getTime()
            if (!Number.isNaN(after)) {
                jobs = jobs.filter((j) => j.datePosted && new Date(j.datePosted).getTime() >= after)
            }
        }

        const start = skip ? Number(skip) : 0
        const count = take ? Number(take) : 24
        return NextResponse.json({
            jobs: jobs.slice(start, start + count),
            total: jobs.length,
        })
    }

    try {
        const result = await getJobs({
            remote: remote === 'true' ? true : remote === 'false' ? false : undefined,
            hybrid: hybrid === 'true' ? true : hybrid === 'false' ? false : undefined,
            source: sources.length > 0 ? sources : undefined,
            location: location ?? undefined,
            datePostedAfter: datePostedAfter ? new Date(datePostedAfter) : undefined,
            q: q ?? undefined,
            take: take ? Number(take) : undefined,
            skip: skip ? Number(skip) : undefined,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching jobs:', error)
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }
}
