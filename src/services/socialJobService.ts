import { prisma } from '@/lib/prisma'
import { SOCIAL_JOB_TTL_HOURS } from '@/types/socialJob'

export interface SocialJobFilters {
    q?: string
    tags?: string[]
    remote?: boolean
    take?: number
    skip?: number
}

/** Deletes any post whose 48h window has passed. Safe to call often. */
export async function cleanupExpiredSocialJobs() {
    return prisma.socialJobPost.deleteMany({
        where: { expiresAt: { lte: new Date() } },
    })
}

export async function getSocialJobs(filters: SocialJobFilters = {}) {
    await cleanupExpiredSocialJobs()

    const where = {
        ...(filters.remote !== undefined && { remote: filters.remote }),
        ...(filters.tags &&
            filters.tags.length > 0 && { tags: { hasSome: filters.tags } }),
        ...(filters.q && {
            OR: [
                { title: { contains: filters.q, mode: 'insensitive' as const } },
                { authorName: { contains: filters.q, mode: 'insensitive' as const } },
                { description: { contains: filters.q, mode: 'insensitive' as const } },
            ],
        }),
    }

    const [posts, total] = await Promise.all([
        prisma.socialJobPost.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.socialJobPost.count({ where }),
    ])

    return { posts, total }
}

export interface CreateSocialJobInput {
    url: string
    title: string
    authorName?: string | null
    authorTitle?: string | null
    authorImageUrl?: string | null
    description?: string | null
    salary?: string | null
    location?: string | null
    remote?: boolean
    tags?: string[]
    recruiterContact?: string | null
    imageUrl?: string | null
}

/** Embeds (or re-embeds) a post and resets its 48h expiry window. */
export async function createSocialJobPost(input: CreateSocialJobInput) {
    const expiresAt = new Date(Date.now() + SOCIAL_JOB_TTL_HOURS * 60 * 60 * 1000)

    const data = {
        title: input.title,
        authorName: input.authorName ?? null,
        authorTitle: input.authorTitle ?? null,
        authorImageUrl: input.authorImageUrl ?? null,
        description: input.description ?? null,
        salary: input.salary ?? null,
        location: input.location ?? null,
        remote: input.remote ?? false,
        tags: input.tags ?? [],
        recruiterContact: input.recruiterContact ?? null,
        imageUrl: input.imageUrl ?? null,
        expiresAt,
    }

    return prisma.socialJobPost.upsert({
        where: { url: input.url },
        update: data,
        create: { url: input.url, ...data },
    })
}

export async function deleteSocialJobPost(id: string) {
    return prisma.socialJobPost.delete({ where: { id } })
}
