import { prisma } from '@/lib/prisma'

export interface FreelanceFilters {
    source?: string | string[]
    deadlineAfter?: Date
    datePostedAfter?: Date
    q?: string
    skills?: string | string[]
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

export async function getFreelanceProjects(filters: FreelanceFilters = {}) {
    const sources = parseSources(filters.source)
    const skillsList = Array.isArray(filters.skills)
        ? filters.skills.flatMap((s) => s.split(','))
        : filters.skills
          ? filters.skills.split(',')
          : []
    const cleanedSkills = skillsList.map((s) => s.trim()).filter(Boolean)

    const where = {
        ...(sources && (sources.length === 1 ? { source: sources[0] } : { source: { in: sources } })),
        ...(filters.deadlineAfter && {
            deadline: { gte: filters.deadlineAfter },
        }),
        ...(filters.datePostedAfter && {
            postedAt: { gte: filters.datePostedAfter },
        }),
        ...(cleanedSkills.length > 0 && {
            skills: { hasSome: cleanedSkills },
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
            orderBy: [{ deadline: 'asc' }, { id: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.freelanceProject.count({ where }),
    ])

    return { projects, total }
}