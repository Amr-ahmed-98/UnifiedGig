import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    cleanupExpiredSocialJobs,
    createSocialJobPost,
    deleteSocialJobPost,
    getSocialJobs,
} from './socialJobService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        socialJobPost: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
            upsert: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

const FROZEN_NOW = new Date('2026-09-18T12:00:00Z')

describe('getSocialJobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('lazily deletes expired posts before querying (the in-request half of the 48h TTL)', async () => {
        await getSocialJobs()

        expect(prisma.socialJobPost.deleteMany).toHaveBeenCalledWith({
            where: { expiresAt: { lte: expect.any(Date) } },
        })
        // Cleanup must happen BEFORE the list query, not after
        const cleanupOrder = vi.mocked(prisma.socialJobPost.deleteMany).mock.invocationCallOrder[0]
        const queryOrder = vi.mocked(prisma.socialJobPost.findMany).mock.invocationCallOrder[0]
        expect(cleanupOrder).toBeLessThan(queryOrder)
    })

    describe('filters', () => {
        // Test both true AND false to prevent truthy/falsy bugs
        it.each([true, false])('filters correctly when remote is %s', async (remote) => {
            await getSocialJobs({ remote })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ remote }),
                })
            )
        })

        it('filters by tags using hasSome when tags are given', async () => {
            await getSocialJobs({ tags: ['Remote', 'AI/ML'] })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ tags: { hasSome: ['Remote', 'AI/ML'] } }),
                })
            )
        })

        it('omits tags for an empty array (empty means "all posts", not "match nothing")', async () => {
            await getSocialJobs({ tags: [] })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('searches q across title, authorName and description (case-insensitive)', async () => {
            await getSocialJobs({ q: 'engineer' })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { title: { contains: 'engineer', mode: 'insensitive' } },
                            { authorName: { contains: 'engineer', mode: 'insensitive' } },
                            { description: { contains: 'engineer', mode: 'insensitive' } },
                        ],
                    }),
                })
            )
        })

        it('omits q when empty string', async () => {
            await getSocialJobs({ q: '' })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('combines q, tags, remote and pagination in one where clause', async () => {
            const expectedWhere = {
                remote: true,
                tags: { hasSome: ['Remote'] },
                OR: [
                    { title: { contains: 'node', mode: 'insensitive' } },
                    { authorName: { contains: 'node', mode: 'insensitive' } },
                    { description: { contains: 'node', mode: 'insensitive' } },
                ],
            }

            await getSocialJobs({ q: 'node', remote: true, tags: ['Remote'], take: 24, skip: 48 })

            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith({
                where: expectedWhere,
                orderBy: [{ createdAt: 'desc' }],
                take: 24,
                skip: 48,
            })
            // Verify count uses the exact same where clause
            expect(prisma.socialJobPost.count).toHaveBeenCalledWith({ where: expectedWhere })
        })
    })

    describe('sorting & pagination', () => {
        it('always orders by createdAt descending (newest embeds first)', async () => {
            await getSocialJobs()
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: [{ createdAt: 'desc' }] })
            )
        })

        it('passes take and skip through for pagination', async () => {
            await getSocialJobs({ take: 24, skip: 24 })
            expect(prisma.socialJobPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 24, skip: 24 })
            )
        })

        it('returns posts array and total count', async () => {
            vi.mocked(prisma.socialJobPost.findMany).mockResolvedValueOnce([
                { id: '1', title: 'Senior FE role' },
            ] as never)
            vi.mocked(prisma.socialJobPost.count).mockResolvedValueOnce(1)

            const result = await getSocialJobs()

            expect(result).toEqual({ posts: [{ id: '1', title: 'Senior FE role' }], total: 1 })
        })
    })

    describe('error handling', () => {
        it('propagates prisma database errors', async () => {
            vi.mocked(prisma.socialJobPost.findMany).mockRejectedValueOnce(new Error('DB connection failure'))
            await expect(getSocialJobs()).rejects.toThrow('DB connection failure')
        })
    })
})

describe('createSocialJobPost', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(FROZEN_NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('upserts keyed on url — re-embedding the same post resets its 48h window', async () => {
        const input = {
            url: 'https://www.linkedin.com/posts/jane-doe_activity-123',
            title: 'Senior Frontend Engineer',
        }
        const expected48h = new Date(FROZEN_NOW.getTime() + 48 * 3_600_000)

        await createSocialJobPost(input)

        expect(prisma.socialJobPost.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { url: input.url } })
        )
        const call = vi.mocked(prisma.socialJobPost.upsert).mock.calls[0][0]
        expect(call.update).toEqual(expect.objectContaining({ expiresAt: expected48h }))
        expect(call.create).toEqual(expect.objectContaining({ url: input.url, expiresAt: expected48h }))
    })

    it('defaults every optional field so the DB never receives undefined', async () => {
        await createSocialJobPost({ url: 'https://www.linkedin.com/posts/a', title: 'A role' })

        const { create, update } = vi.mocked(prisma.socialJobPost.upsert).mock.calls[0][0]
        for (const data of [create, update]) {
            expect(data).toEqual(
                expect.objectContaining({
                    authorName: null,
                    authorTitle: null,
                    authorImageUrl: null,
                    description: null,
                    salary: null,
                    location: null,
                    remote: false,
                    tags: [],
                    recruiterContact: null,
                    imageUrl: null,
                })
            )
        }
    })

    it('passes provided values through untouched', async () => {
        const input = {
            url: 'https://www.linkedin.com/posts/b',
            title: 'Fractional CTO',
            authorName: 'Jane Doe',
            authorTitle: 'CTO at Acme',
            authorImageUrl: 'https://img.example/jane.jpg',
            description: 'Growing team, remote friendly.',
            salary: '$200k - $240k',
            location: 'Remote',
            remote: true,
            tags: ['Fractional', 'Remote'],
            recruiterContact: 'jane@acme.com',
            imageUrl: 'https://img.example/og.jpg',
        }

        await createSocialJobPost(input)

        const { create, update } = vi.mocked(prisma.socialJobPost.upsert).mock.calls[0][0]
        // create carries the url; update targets it via the where clause instead
        expect(create).toEqual(expect.objectContaining(input))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- url lives in the where clause
        const { url: _url, ...fieldsWithoutUrl } = input
        expect(update).toEqual(expect.objectContaining(fieldsWithoutUrl))
    })

    it('returns the stored post', async () => {
        const stored = { id: '1', title: 'A role' }
        vi.mocked(prisma.socialJobPost.upsert).mockResolvedValueOnce(stored as never)

        const result = await createSocialJobPost({ url: 'https://www.linkedin.com/posts/a', title: 'A role' })

        expect(result).toBe(stored)
    })

    it('propagates upsert errors', async () => {
        vi.mocked(prisma.socialJobPost.upsert).mockRejectedValueOnce(new Error('unique violation'))
        await expect(
            createSocialJobPost({ url: 'https://www.linkedin.com/posts/a', title: 'A role' })
        ).rejects.toThrow('unique violation')
    })
})

describe('deleteSocialJobPost', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('deletes by id and returns the deleted row', async () => {
        const deleted = { id: 'post-1' }
        vi.mocked(prisma.socialJobPost.delete).mockResolvedValueOnce(deleted as never)

        const result = await deleteSocialJobPost('post-1')

        expect(prisma.socialJobPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })
        expect(result).toBe(deleted)
    })

    it('propagates errors (e.g. Prisma P2025 record-not-found)', async () => {
        vi.mocked(prisma.socialJobPost.delete).mockRejectedValueOnce(new Error('Record not found'))
        await expect(deleteSocialJobPost('missing')).rejects.toThrow('Record not found')
    })
})

describe('cleanupExpiredSocialJobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(FROZEN_NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('deletes exactly the posts whose window has passed', async () => {
        vi.mocked(prisma.socialJobPost.deleteMany).mockResolvedValueOnce({ count: 3 })

        const result = await cleanupExpiredSocialJobs()

        expect(prisma.socialJobPost.deleteMany).toHaveBeenCalledWith({
            where: { expiresAt: { lte: FROZEN_NOW } },
        })
        expect(result).toEqual({ count: 3 })
    })

    it('is safe to call when nothing has expired', async () => {
        vi.mocked(prisma.socialJobPost.deleteMany).mockResolvedValueOnce({ count: 0 })

        const result = await cleanupExpiredSocialJobs()

        expect(result).toEqual({ count: 0 })
    })
})
