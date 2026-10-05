import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMaterial, getMaterialCounts, getMaterials } from './materialService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        learningMaterial: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
            groupBy: vi.fn().mockResolvedValue([]),
            upsert: vi.fn(),
        },
    },
}))

const db = prisma.learningMaterial

describe('getMaterials', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.findMany).mockResolvedValue([])
        vi.mocked(db.count).mockResolvedValue(0)
    })

    it('uses an empty where clause when no filters are given', async () => {
        await getMaterials()
        expect(db.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: [{ createdAt: 'desc' }],
            take: undefined,
            skip: undefined,
        })
        expect(db.count).toHaveBeenCalledWith({ where: {} })
    })

    it('filters by field', async () => {
        await getMaterials({ field: 'networking' })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { field: 'networking' } })
        )
    })

    it('filters by types using "in"', async () => {
        await getMaterials({ types: ['course', 'video'] })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { type: { in: ['course', 'video'] } } })
        )
    })

    it('ignores an empty types array', async () => {
        await getMaterials({ types: [] })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
    })

    it('searches title, description and url case-insensitively', async () => {
        await getMaterials({ q: 'ccna' })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { title: { contains: 'ccna', mode: 'insensitive' } },
                        { description: { contains: 'ccna', mode: 'insensitive' } },
                        { url: { contains: 'ccna', mode: 'insensitive' } },
                    ],
                },
            })
        )
    })

    it('combines field, types and q', async () => {
        await getMaterials({ field: 'cybersecurity', types: ['video'], q: 'lab' })
        const arg = vi.mocked(db.findMany).mock.calls[0][0] as { where: Record<string, unknown> }
        expect(arg.where).toMatchObject({ field: 'cybersecurity', type: { in: ['video'] } })
        expect(arg.where.OR).toHaveLength(3)
    })

    it('passes take and skip through and uses the same where for count', async () => {
        await getMaterials({ field: 'networking', take: 24, skip: 48 })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 24, skip: 48 }))
        expect(db.count).toHaveBeenCalledWith({ where: { field: 'networking' } })
    })

    it('returns materials and total', async () => {
        vi.mocked(db.findMany).mockResolvedValue([{ id: 'a' }] as never)
        vi.mocked(db.count).mockResolvedValue(7)
        await expect(getMaterials()).resolves.toEqual({ materials: [{ id: 'a' }], total: 7 })
    })
})

describe('getMaterialCounts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns per-field counts and skips the type query when no field is given', async () => {
        vi.mocked(db.groupBy).mockResolvedValueOnce([
            { field: 'networking', _count: { _all: 3 } },
            { field: 'cybersecurity', _count: { _all: 1 } },
        ] as never)

        const result = await getMaterialCounts()

        expect(db.groupBy).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ fields: { networking: 3, cybersecurity: 1 }, types: {} })
    })

    it('also returns per-type counts scoped to the given field', async () => {
        vi.mocked(db.groupBy)
            .mockResolvedValueOnce([{ field: 'networking', _count: { _all: 3 } }] as never)
            .mockResolvedValueOnce([
                { type: 'video', _count: { _all: 2 } },
                { type: 'docs', _count: { _all: 1 } },
            ] as never)

        const result = await getMaterialCounts('networking')

        expect(db.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({ by: ['type'], where: { field: 'networking' } })
        )
        expect(result.types).toEqual({ video: 2, docs: 1 })
    })
})

describe('createMaterial', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.upsert).mockResolvedValue({ id: 'new' } as never)
    })

    it('upserts on the (field, url) composite key', async () => {
        await createMaterial({
            field: 'networking',
            url: 'https://example.com/a',
            title: 'A',
            type: 'course',
            description: 'good',
        })

        expect(db.upsert).toHaveBeenCalledWith({
            where: { field_url: { field: 'networking', url: 'https://example.com/a' } },
            update: { title: 'A', type: 'course', description: 'good' },
            create: {
                field: 'networking',
                url: 'https://example.com/a',
                title: 'A',
                type: 'course',
                description: 'good',
            },
        })
    })

    it('stores a missing description as null', async () => {
        await createMaterial({ field: 'networking', url: 'https://example.com/a', title: 'A', type: 'docs' })
        expect(db.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({ description: null }),
                create: expect.objectContaining({ description: null }),
            })
        )
    })

    it('returns the upserted row', async () => {
        await expect(
            createMaterial({ field: 'networking', url: 'https://example.com/a', title: 'A', type: 'docs' })
        ).resolves.toEqual({ id: 'new' })
    })
})
