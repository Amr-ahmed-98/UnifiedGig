import { prisma } from '@/lib/prisma'
import { matchKnownTools, type PromptCategory } from '@/types/prompt'

export interface PromptFilters {
    q?: string
    categories?: PromptCategory[]
    take?: number
    skip?: number
}

export async function getPrompts(filters: PromptFilters = {}) {
    const q = filters.q?.trim()
    const where = {
        ...(filters.categories && filters.categories.length > 0 && { category: { in: filters.categories } }),
        ...(q && {
            OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { body: { contains: q, mode: 'insensitive' as const } },
                // Array columns have no case-insensitive match, so search canonical tool names instead.
                { tools: { hasSome: [...matchKnownTools(q), q] } },
            ],
        }),
    }

    const [prompts, total] = await Promise.all([
        prisma.prompt.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.prompt.count({ where }),
    ])
    return { prompts, total }
}

/** Per-category totals for the filter pills. */
export async function getPromptCounts() {
    const rows = await prisma.prompt.groupBy({ by: ['category'], _count: { _all: true } })
    return { categories: Object.fromEntries(rows.map((r) => [r.category, r._count._all])) }
}

export interface CreatePromptInput {
    category: PromptCategory
    title: string
    body: string
    tools: string[]
}

export async function createPrompt(input: CreatePromptInput) {
    return prisma.prompt.create({ data: input })
}
