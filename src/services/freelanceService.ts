import { prisma } from '@/lib/prisma'

export interface FreelanceFilters {
    source?: string
    deadlineAfter?: Date
    q?: string
    take?: number
    skip?: number
}

export async function getFreelanceProjects(filters: FreelanceFilters = {}) {
    const where = {
        ...(filters.source && { source: filters.source }),
        ...(filters.deadlineAfter && {
            deadline: { gte: filters.deadlineAfter },
        }),
        ...(filters.q && {
            OR: [
                { title: { contains: filters.q, mode: 'insensitive' as const } },
                { description: { contains: filters.q, mode: 'insensitive' as const } },
            ],
        }),
    }

    const [projects, total] = await Promise.all([
        prisma.freelanceProject.findMany({
            where,
            orderBy: { deadline: 'asc' },
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.freelanceProject.count({ where }),
    ])

    return { projects, total }
}