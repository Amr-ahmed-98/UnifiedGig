import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProfile, getProfileCounts, getProfiles } from './profileService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        followProfile: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
            groupBy: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
        },
    },
}))

const db = prisma.followProfile

describe('getProfiles', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(db.findMany).mockResolvedValue([])
        vi.mocked(db.count).mockResolvedValue(0)
    })

    it('uses an empty where and newest-first order by default', async () => {
        await getProfiles()
        expect(db.findMany).toHaveBeenCalledWith({ where: {}, orderBy: [{ createdAt: 'desc' }], take: undefined, skip: undefined })
        expect(db.count).toHaveBeenCalledWith({ where: {} })
    })

    it('filters by platforms using "in" and ignores an empty array', async () => {
        await getProfiles({ platforms: ['linkedin', 'x'] })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { platform: { in: ['linkedin', 'x'] } } }))
        await getProfiles({ platforms: [] })
        expect(db.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }))
    })

    it('searches name, headline, postsAbout and url case-insensitively', async () => {
        await getProfiles({ q: 'recruiter' })
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { name: { contains: 'recruiter', mode: 'insensitive' } },
                        { headline: { contains: 'recruiter', mode: 'insensitive' } },
                        { postsAbout: { contains: 'recruiter', mode: 'insensitive' } },
                        { url: { contains: 'recruiter', mode: 'insensitive' } },
                    ],
                },
            })
        )
    })

    it('passes paging through and shares the where with count', async () => {
        await getProfiles({ platforms: ['telegram'], take: 24, skip: 48 })
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 24, skip: 48 }))
        expect(db.count).toHaveBeenCalledWith({ where: { platform: { in: ['telegram'] } } })
    })

    it('returns profiles and total', async () => {
        vi.mocked(db.findMany).mockResolvedValue([{ id: 'a' }] as never)
        vi.mocked(db.count).mockResolvedValue(9)
        await expect(getProfiles()).resolves.toEqual({ profiles: [{ id: 'a' }], total: 9 })
    })
})

describe('getProfileCounts', () => {
    it('maps groupBy rows to a platform -> count object', async () => {
        vi.mocked(db.groupBy).mockResolvedValue([
            { platform: 'linkedin', _count: { _all: 4 } },
            { platform: 'x', _count: { _all: 1 } },
        ] as never)
        await expect(getProfileCounts()).resolves.toEqual({ linkedin: 4, x: 1 })
    })
})

describe('createProfile', () => {
    beforeEach(() => {
        vi.mocked(db.create).mockResolvedValue({ id: 'new' } as never)
    })

    it('creates with null for missing optional fields', async () => {
        await createProfile({ platform: 'x', name: 'Jane', url: 'https://x.com/jane' })
        expect(db.create).toHaveBeenCalledWith({
            data: { platform: 'x', name: 'Jane', url: 'https://x.com/jane', headline: null, postsAbout: null },
        })
    })

    it('passes optional fields through and returns the row', async () => {
        await expect(
            createProfile({ platform: 'x', name: 'Jane', url: 'https://x.com/jane', headline: 'H', postsAbout: 'P' })
        ).resolves.toEqual({ id: 'new' })
        expect(db.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ headline: 'H', postsAbout: 'P' }),
        })
    })

    it('lets a unique-violation error bubble up for the route to map to 409', async () => {
        const err = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
        vi.mocked(db.create).mockImplementation((() => Promise.reject(err)) as never)
        await expect(createProfile({ platform: 'x', name: 'J', url: 'https://x.com/j' })).rejects.toMatchObject({ code: 'P2002' })
    })
})
