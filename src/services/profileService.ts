import { prisma } from '@/lib/prisma'
import type { Platform } from '@/types/profile'

export interface ProfileFilters {
    q?: string
    platforms?: Platform[]
    take?: number
    skip?: number
}

export async function getProfiles(filters: ProfileFilters = {}) {
    const where = {
        ...(filters.platforms && filters.platforms.length > 0 && { platform: { in: filters.platforms } }),
        ...(filters.q && {
            OR: [
                { name: { contains: filters.q, mode: 'insensitive' as const } },
                { headline: { contains: filters.q, mode: 'insensitive' as const } },
                { postsAbout: { contains: filters.q, mode: 'insensitive' as const } },
                { url: { contains: filters.q, mode: 'insensitive' as const } },
            ],
        }),
    }

    const [profiles, total] = await Promise.all([
        prisma.followProfile.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.followProfile.count({ where }),
    ])
    return { profiles, total }
}

/** Unfiltered per-platform counts, used for the filter pills. */
export async function getProfileCounts() {
    const rows = await prisma.followProfile.groupBy({ by: ['platform'], _count: { _all: true } })
    return Object.fromEntries(rows.map((r: { platform: string; _count: { _all: number } }) => [r.platform, r._count._all]))
}

export interface CreateProfileInput {
    platform: Platform
    name: string
    url: string
    headline?: string | null
    postsAbout?: string | null
}

/** Throws a Prisma P2002 error when the (normalized) url already exists. */
export async function createProfile(input: CreateProfileInput) {
    return prisma.followProfile.create({
        data: {
            platform: input.platform,
            name: input.name,
            url: input.url,
            headline: input.headline ?? null,
            postsAbout: input.postsAbout ?? null,
        },
    })
}
