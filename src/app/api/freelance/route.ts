import { NextRequest, NextResponse } from 'next/server'
import { getFreelanceProjects } from '@/services/freelanceService'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const source = searchParams.get('source')
    const deadlineAfter = searchParams.get('deadlineAfter')
    const q = searchParams.get('q')
    const take = searchParams.get('take')
    const skip = searchParams.get('skip')

    try {
        const result = await getFreelanceProjects({
            source: source ?? undefined,
            deadlineAfter: deadlineAfter ? new Date(deadlineAfter) : undefined,
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