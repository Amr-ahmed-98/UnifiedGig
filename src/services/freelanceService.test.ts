import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFreelanceProjects } from './freelanceService'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        freelanceProject: {
            findMany: vi.fn().mockResolvedValue([{ id: '1', title: 'Build API' }]),
            count: vi.fn().mockResolvedValue(1),
        },
    },
}))

describe('getFreelanceProjects', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('filters', () => {
        describe('source filtering', () => {
            it('filters by single source string', async () => {
                await getFreelanceProjects({ source: 'mostaql' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: expect.objectContaining({ source: 'mostaql' }) })
                )
            })

            it('filters by single source in an array', async () => {
                await getFreelanceProjects({ source: ['mostaql'] })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: expect.objectContaining({ source: 'mostaql' }) })
                )
            })

            it('filters by multiple sources using Prisma in operator when given an array', async () => {
                await getFreelanceProjects({ source: ['mostaql', 'nafezly'] })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            source: { in: ['mostaql', 'nafezly'] },
                        }),
                    })
                )
            })

            it('filters by multiple sources using Prisma in operator when given comma-separated string', async () => {
                await getFreelanceProjects({ source: 'mostaql,nafezly' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            source: { in: ['mostaql', 'nafezly'] },
                        }),
                    })
                )
            })

            it('ignores empty source strings and empty arrays', async () => {
                await getFreelanceProjects({ source: '' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: {} })
                )

                vi.clearAllMocks()
                await getFreelanceProjects({ source: [] })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: {} })
                )
            })
        })

        describe('date filtering', () => {
            it('filters by deadlineAfter', async () => {
                const date = new Date('2026-04-01')
                await getFreelanceProjects({ deadlineAfter: date })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({ deadline: { gte: date } }),
                    })
                )
            })

            it('filters by published date (datePostedAfter, e.g. last 3 days)', async () => {
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                await getFreelanceProjects({ datePostedAfter: threeDaysAgo })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({ postedAt: { gte: threeDaysAgo } }),
                    })
                )
            })
        })

        describe('skill tags filtering', () => {
            it('filters by skills array using hasSome', async () => {
                await getFreelanceProjects({ skills: ['react', 'nextjs'] })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            skills: { hasSome: ['react', 'nextjs'] },
                        }),
                    })
                )
            })

            it('filters by comma-separated skills string', async () => {
                await getFreelanceProjects({ skills: 'react,nextjs' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            skills: { hasSome: ['react', 'nextjs'] },
                        }),
                    })
                )
            })
        })

        describe('query q filtering', () => {
            it('filters by q across title and description (case-insensitive)', async () => {
                await getFreelanceProjects({ q: 'react' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            OR: [
                                { title: { contains: 'react', mode: 'insensitive' } },
                                { description: { contains: 'react', mode: 'insensitive' } },
                            ],
                        }),
                    })
                )
            })

            it('omits q if empty string', async () => {
                await getFreelanceProjects({ q: '' })
                expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({ where: {} })
                )
            })
        })

        it('combines multiple filters simultaneously', async () => {
            const deadlineDate = new Date('2026-05-01')
            const postedDate = new Date('2026-04-01')
            const expectedWhere = {
                source: { in: ['mostaql', 'nafezly'] },
                deadline: { gte: deadlineDate },
                postedAt: { gte: postedDate },
                skills: { hasSome: ['typescript', 'node'] },
                OR: [
                    { title: { contains: 'api', mode: 'insensitive' } },
                    { description: { contains: 'api', mode: 'insensitive' } },
                ],
            }

            await getFreelanceProjects({
                source: ['mostaql', 'nafezly'],
                deadlineAfter: deadlineDate,
                datePostedAfter: postedDate,
                skills: ['typescript', 'node'],
                q: 'api',
                take: 10,
                skip: 20,
            })

            expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith({
                where: expectedWhere,
                orderBy: [{ deadline: 'asc' }, { id: 'desc' }],
                take: 10,
                skip: 20,
            })
            // Verify count uses the exact same where clause
            expect(prisma.freelanceProject.count).toHaveBeenCalledWith({ where: expectedWhere })
        })
    })

    describe('sorting & pagination', () => {
        it('always orders by deadline ascending with deterministic id tiebreaker', async () => {
            await getFreelanceProjects()
            expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [{ deadline: 'asc' }, { id: 'desc' }],
                })
            )
        })

        it('applies take and skip', async () => {
            await getFreelanceProjects({ take: 5, skip: 10 })
            expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5, skip: 10 })
            )
        })

        it('returns empty where when no filters', async () => {
            await getFreelanceProjects()
            expect(prisma.freelanceProject.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            )
        })

        it('returns total from count query and projects array', async () => {
            const result = await getFreelanceProjects()
            expect(result.total).toBe(1)
            expect(result.projects).toEqual([{ id: '1', title: 'Build API' }])
        })
    })

    describe('error handling', () => {
        it('propagates prisma database errors', async () => {
            vi.mocked(prisma.freelanceProject.findMany).mockRejectedValueOnce(new Error('Prisma error'))
            await expect(getFreelanceProjects()).rejects.toThrow('Prisma error')
        })
    })
})