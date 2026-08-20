import { prisma } from '@/lib/prisma'

export interface JobFilters {
    remote?: boolean
    hybrid?: boolean
    source?: string
    datePostedAfter?: Date
    location?: string
}

export async function getJobs(filters: JobFilters = {}) {
    const jobs = await prisma.job.findMany({
        where: {
            ...(filters.remote !== undefined && { remote: filters.remote }),
            ...(filters.hybrid !== undefined && { hybrid: filters.hybrid }),
            ...(filters.source && { source: filters.source }),
            ...(filters.location && {
                location: { contains: filters.location, mode: 'insensitive' },
            }),
            ...(filters.datePostedAfter && {
                datePosted: { gte: filters.datePostedAfter },
            }),
        },
        orderBy: { datePosted: 'desc' },
    })

    return jobs
}