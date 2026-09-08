import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobs } from './jobService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn().mockResolvedValue([{ id: '1', title: 'Backend Dev' }]),
            count: vi.fn().mockResolvedValue(1),
        },
    },
}))

describe('getJobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('filters', () => {
        // Test both true AND false to prevent truthy/falsy bugs
        it.each([true, false])('filters correctly when remote is %s', async (remote) => {
            await getJobs({ remote })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ remote }),
                })
            )
        })

        it.each([true, false])('filters correctly when hybrid is %s', async (hybrid) => {
            await getJobs({ hybrid })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ hybrid }),
                })
            )
        })

        describe('source filtering', () => {
            it('filters by single source string', async () => {
                await getJobs({ source: 'wuzzuf' })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: expect.objectContaining({ source: 'wuzzuf' }) })
                )
            })

            it('filters by single source in an array', async () => {
                await getJobs({ source: ['wuzzuf'] })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: expect.objectContaining({ source: 'wuzzuf' }) })
                )
            })

            it('filters by multiple sources using Prisma in operator when given an array', async () => {
                await getJobs({ source: ['wuzzuf', 'linkedin'] })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            source: { in: ['wuzzuf', 'linkedin'] },
                        }),
                    })
                )
            })

            it('filters by multiple sources using Prisma in operator when given comma-separated string', async () => {
                await getJobs({ source: 'wuzzuf,linkedin' })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            source: { in: ['wuzzuf', 'linkedin'] },
                        }),
                    })
                )
            })

            it('ignores empty source strings and empty arrays', async () => {
                await getJobs({ source: '' })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: {} })
                )

                vi.clearAllMocks()
                await getJobs({ source: [] })
                expect(prisma.job.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: {} })
                )
            })
        })

        it('filters by location (case-insensitive)', async () => {
            await getJobs({ location: 'Cairo' })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        location: { contains: 'Cairo', mode: 'insensitive' },
                    }),
                })
            )
        })

        it('omits location if empty string', async () => {
            await getJobs({ location: '' })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('filters by date posted (e.g. last 3 days)', async () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            await getJobs({ datePostedAfter: threeDaysAgo })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        datePosted: { gte: threeDaysAgo },
                    }),
                })
            )
        })

        it('searches q across title and company (case-insensitive)', async () => {
            await getJobs({ q: 'engineer' })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { title: { contains: 'engineer', mode: 'insensitive' } },
                            { company: { contains: 'engineer', mode: 'insensitive' } },
                        ],
                    }),
                })
            )
        })

        it('omits q if empty string', async () => {
            await getJobs({ q: '' })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('combines multiple filters simultaneously', async () => {
            const date = new Date('2026-03-01')
            const expectedWhere = {
                remote: false,
                hybrid: true,
                source: { in: ['linkedin', 'wuzzuf'] },
                location: { contains: 'Remote', mode: 'insensitive' },
                datePosted: { gte: date },
                OR: [
                    { title: { contains: 'node', mode: 'insensitive' } },
                    { company: { contains: 'node', mode: 'insensitive' } },
                ],
            }

            await getJobs({
                remote: false,
                hybrid: true,
                source: ['linkedin', 'wuzzuf'],
                location: 'Remote',
                datePostedAfter: date,
                q: 'node',
                take: 10,
                skip: 20,
            })

            expect(prisma.job.findMany).toHaveBeenCalledWith({
                where: expectedWhere,
                orderBy: [{ datePosted: 'desc' }, { id: 'desc' }],
                take: 10,
                skip: 20,
            })
            // Verify count uses the exact same where clause
            expect(prisma.job.count).toHaveBeenCalledWith({ where: expectedWhere })
        })
    })

    describe('sorting & pagination', () => {
        it('always orders by datePosted descending with deterministic id tiebreaker', async () => {
            await getJobs()
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [{ datePosted: 'desc' }, { id: 'desc' }],
                })
            )
        })

        it('applies take and skip for pagination', async () => {
            await getJobs({ take: 15, skip: 30 })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 15,
                    skip: 30,
                })
            )
        })

        it('returns empty where when no filters given', async () => {
            await getJobs()
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('returns jobs array and total count', async () => {
            const result = await getJobs()
            expect(result).toEqual({
                jobs: [{ id: '1', title: 'Backend Dev' }],
                total: 1,
            })
        })
    })

    describe('error handling', () => {
        it('propagates prisma database errors', async () => {
            vi.mocked(prisma.job.findMany).mockRejectedValueOnce(new Error('DB connection failure'))
            await expect(getJobs()).rejects.toThrow('DB connection failure')
        })
    })
})
