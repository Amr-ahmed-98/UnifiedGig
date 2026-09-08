import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: { count: vi.fn() },
        freelanceProject: { count: vi.fn() },
    },
}))

describe('GET /api/stats', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns job count, project count, their sum, and the source count', async () => {
        vi.mocked(prisma.job.count).mockResolvedValue(40)
        vi.mocked(prisma.freelanceProject.count).mockResolvedValue(10)

        const response = await GET()
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.jobs).toBe(40)
        expect(body.projects).toBe(10)
        expect(body.total).toBe(50)
        expect(typeof body.sourcesCount).toBe('number')
    })

    it('returns a 500 with an error message when a count query throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(prisma.job.count).mockRejectedValueOnce(new Error('DB down'))
        vi.mocked(prisma.freelanceProject.count).mockResolvedValue(0)

        const response = await GET()
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to fetch platform statistics' })
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching stats:', expect.any(Error))
        consoleSpy.mockRestore()
    })
})
