import { prisma } from '@/lib/prisma'

export interface JobFilters {
    remote?: boolean
    hybrid?: boolean
    source?: string
    datePostedAfter?: Date
    location?: string
    q?: string
    take?: number
    skip?: number
}

export async function getJobs(filters: JobFilters = {}) {
    const where = {
        ...(filters.remote !== undefined && { remote: filters.remote }),
        ...(filters.hybrid !== undefined && { hybrid: filters.hybrid }),
        ...(filters.source && { source: filters.source }),
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
            orderBy: { datePosted: 'desc' },
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.job.count({ where }),
    ])

    return { jobs, total }
}