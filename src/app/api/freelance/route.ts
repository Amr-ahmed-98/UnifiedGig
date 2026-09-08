import { NextRequest, NextResponse } from 'next/server'
import { getFreelanceProjects } from '@/services/freelanceService'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const sourceParams = searchParams.getAll('source')
    const deadlineAfter = searchParams.get('deadlineAfter')
    const datePostedAfter = searchParams.get('datePostedAfter')
    const q = searchParams.get('q')
    const take = searchParams.get('take')
    const skip = searchParams.get('skip')

    const sources = sourceParams.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)

    try {
        const result = await getFreelanceProjects({
            source: sources.length > 0 ? sources : undefined,
            deadlineAfter: deadlineAfter ? new Date(deadlineAfter) : undefined,
            datePostedAfter: datePostedAfter ? new Date(datePostedAfter) : undefined,
            q: q ?? undefined,
            take: take ? Number(take) : undefined,
            skip: skip ? Number(skip) : undefined,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching freelance projects:', error)
        return NextResponse.json({ error: 'Failed to fetch freelance projects' }, { status: 500 })
    }
}