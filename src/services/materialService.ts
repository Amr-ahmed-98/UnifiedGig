import { prisma } from '@/lib/prisma'
import type { MaterialType } from '@/types/material'

export interface MaterialFilters {
    field?: string
    q?: string
    types?: MaterialType[]
    take?: number
    skip?: number
}

export async function getMaterials(filters: MaterialFilters = {}) {
    const where = {
        ...(filters.field && { field: filters.field }),
        ...(filters.types && filters.types.length > 0 && { type: { in: filters.types } }),
        ...(filters.q && {
            OR: [
                { title: { contains: filters.q, mode: 'insensitive' as const } },
                { description: { contains: filters.q, mode: 'insensitive' as const } },
                { url: { contains: filters.q, mode: 'insensitive' as const } },
            ],
        }),
    }

    const [materials, total] = await Promise.all([
        prisma.learningMaterial.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: filters.take,
            skip: filters.skip,
        }),
        prisma.learningMaterial.count({ where }),
    ])
    return { materials, total }
}

/** Per-field and per-type counts for one field (or all fields when omitted). */
export async function getMaterialCounts(field?: string) {
    const [byField, byType] = await Promise.all([
        prisma.learningMaterial.groupBy({ by: ['field'], _count: { _all: true } }),
        field
            ? prisma.learningMaterial.groupBy({ by: ['type'], where: { field }, _count: { _all: true } })
            : Promise.resolve([]),
    ])
    return {
        fields: Object.fromEntries(byField.map((r) => [r.field, r._count._all])),
        types: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    }
}

export interface CreateMaterialInput {
    field: string
    title: string
    url: string
    type: MaterialType
    description?: string | null
}

/** Re-sharing the same link in the same field updates it instead of duplicating. */
export async function createMaterial(input: CreateMaterialInput) {
    const data = {
        title: input.title,
        type: input.type,
        description: input.description ?? null,
    }
    return prisma.learningMaterial.upsert({
        where: { field_url: { field: input.field, url: input.url } },
        update: data,
        create: { field: input.field, url: input.url, ...data },
    })
}
