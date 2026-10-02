import { NextRequest, NextResponse } from 'next/server'
import { getJobById } from '@/services/jobService'
import { DEMO_JOBS } from '@/lib/demo-data'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    if (process.env.DEMO_MODE === 'true') {
        const job = DEMO_JOBS.find((j) => j.id === id)
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        return NextResponse.json(job)
    }

    try {
        const job = await getJobById(id)
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        return NextResponse.json(job)
    } catch (error) {
        console.error('Error fetching job:', error)
        return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }
}