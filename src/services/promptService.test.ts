import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrompt, getPromptCounts, getPrompts } from './promptService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        prompt: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
            groupBy: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
        },
    },
}))

const db = prisma.prompt

describe('getPrompts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.findMany).mockResolvedValue([])
        vi.mocked(db.count).mockResolvedValue(0)
    })

    it('uses an empty where clause with no filters, newest first', async () => {
        await getPrompts()
        expect(db.findMany).toHaveBeenCalledWith({ where: {}, orderBy: [{ createdAt: 'desc' }], take: undefined, skip: undefined })
        expect(db.count).toHaveBeenCalledWith({ where: {} })
    })

    it('filters by categories using "in"', async () => {
        await getPrompts({ categories: ['images', 'video'] })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { category: { in: ['images', 'video'] } } })
        )
    })

    it('ignores an empty categories array', async () => {
        await getPrompts({ categories: [] })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
    })

    it('searches title, body and tool names', async () => {
        await getPrompts({ q: 'chat' })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { title: { contains: 'chat', mode: 'insensitive' } },
                        { body: { contains: 'chat', mode: 'insensitive' } },
                        { tools: { hasSome: ['ChatGPT', 'chat'] } },
                    ],
                },
            })
        )
    })

    it('passes take and skip and returns the total', async () => {
        vi.mocked(db.count).mockResolvedValue(9)
        const result = await getPrompts({ take: 5, skip: 5 })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, skip: 5 }))
        expect(result.total).toBe(9)
    })
})

describe('getPromptCounts', () => {
    it('maps group rows to a category -> count record', async () => {
        vi.mocked(db.groupBy).mockResolvedValue([
            { category: 'images', _count: { _all: 2 } },
            { category: 'career', _count: { _all: 3 } },
        ] as never)
        expect(await getPromptCounts()).toEqual({ categories: { images: 2, career: 3 } })
    })
})

describe('createPrompt', () => {
    it('creates a row from the input', async () => {
        const input = { category: 'career' as const, title: 'T', body: 'B'.repeat(20), tools: ['Claude'] }
        await createPrompt(input)
        expect(db.create).toHaveBeenCalledWith({ data: input })
    })
})
