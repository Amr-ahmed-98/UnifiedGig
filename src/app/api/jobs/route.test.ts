import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { getJobs } from '@/services/jobService'

vi.mock('@/services/jobService', () => ({
    getJobs: vi.fn(),
}))

function makeRequest(query: string) {
    return new NextRequest(`http://localhost:3000/api/jobs${query}`)
}

describe('GET /api/jobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getJobs).mockResolvedValue({ jobs: [{ id: '1' }], total: 1 } as never)
    })

    it('calls getJobs with all filters undefined when no query params given', async () => {
        await GET(makeRequest(''))
        expect(getJobs).toHaveBeenCalledWith({
            remote: undefined,
            hybrid: undefined,
            source: undefined,
            location: undefined,
            datePostedAfter: undefined,
            q: undefined,
            take: undefined,
            skip: undefined,
        })
    })

    it('parses remote=true and hybrid=false as booleans, not strings', async () => {
        await GET(makeRequest('?remote=true&hybrid=false'))
        expect(getJobs).toHaveBeenCalledWith(
            expect.objectContaining({ remote: true, hybrid: false })
        )
    })

    it('ignores a garbage value for remote instead of passing it through', async () => {
        await GET(makeRequest('?remote=yes'))
        expect(getJobs).toHaveBeenCalledWith(
            expect.objectContaining({ remote: undefined })
        )
    })

    it('collects repeated ?source= params into one array', async () => {
        await GET(makeRequest('?source=wuzzuf&source=linkedin'))
        expect(getJobs).toHaveBeenCalledWith(
            expect.objectContaining({ source: ['wuzzuf', 'linkedin'] })
        )
    })

    it('converts take and skip query strings to numbers', async () => {
        await GET(makeRequest('?take=10&skip=20'))
        expect(getJobs).toHaveBeenCalledWith(
            expect.objectContaining({ take: 10, skip: 20 })
        )
    })

    it('converts datePostedAfter query string to a Date', async () => {
        await GET(makeRequest('?datePostedAfter=2026-01-01'))
        const callArg = vi.mocked(getJobs).mock.calls[0][0]
        expect(callArg?.datePostedAfter).toBeInstanceOf(Date)
    })

    it('returns the service result as JSON with a 200 status', async () => {
        const response = await GET(makeRequest(''))
        const body = await response.json()
        expect(response.status).toBe(200)
        expect(body).toEqual({ jobs: [{ id: '1' }], total: 1 })
    })

    it('returns a 500 with an error message when the service throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getJobs).mockRejectedValueOnce(new Error('DB down'))
        const response = await GET(makeRequest(''))
        const body = await response.json()
        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to fetch jobs' })
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching jobs:', expect.any(Error))
        consoleSpy.mockRestore()
    })
})
