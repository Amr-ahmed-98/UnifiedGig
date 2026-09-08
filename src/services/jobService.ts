import { prisma } from '@/lib/prisma'

export interface JobFilters {
    remote?: boolean
    hybrid?: boolean
    source?: string | string[]
    datePostedAfter?: Date
    location?: string
    q?: string
    take?: number
    skip?: number
}

function parseSources(source?: string | string[]): string[] | undefined {
    if (!source) return undefined
    const list = Array.isArray(source)
        ? source.flatMap((s) => s.split(','))
        : source.split(',')
    const cleaned = list.map((s) => s.trim()).filter(Boolean)
    return cleaned.length > 0 ? cleaned : undefined
}

export async function getJobs(filters: JobFilters = {}) {
    const sources = parseSources(filters.source)

    const where = {
        ...(filters.remote !== undefined && { remote: filters.remote }),
        ...(filters.hybrid !== undefined && { hybrid: filters.hybrid }),
        ...(sources && (sources.length === 1 ? { source: sources[0] } : { source: { in: sources } })),
        ...(filters.location && {
            location: { contains: filters.location, mode: 'insensitive' as const },
        }),
        ...(filters.datePostedAfter && {
            datePosted: { gte: filters.datePostedAfter },
        }),
        ...(filters.q && {
            OR: [
                { title: { contains: filters.q, mode: 'insensitive' as const } },
                { company: { contains: filters.q, mode: 'insensitive' as const } },
            ],
        }),
    }

    const [jobs, total] = await Promise.all([
        prisma.job.findMany({
            where,
            orderBy: [{ datePosted: 'desc' }, { id: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.job.count({ where }),
    ])

    return { jobs, total }
}