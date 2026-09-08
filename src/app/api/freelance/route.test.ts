import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { getFreelanceProjects } from '@/services/freelanceService'

vi.mock('@/services/freelanceService', () => ({
    getFreelanceProjects: vi.fn(),
}))

function makeRequest(query: string) {
    return new NextRequest(`http://localhost:3000/api/freelance${query}`)
}

describe('GET /api/freelance', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getFreelanceProjects).mockResolvedValue({ projects: [{ id: '1' }], total: 1 } as never)
    })

    it('calls getFreelanceProjects with all filters undefined when no query params given', async () => {
        await GET(makeRequest(''))
        expect(getFreelanceProjects).toHaveBeenCalledWith({
            source: undefined,
            deadlineAfter: undefined,
            datePostedAfter: undefined,
            q: undefined,
            take: undefined,
            skip: undefined,
        })
    })

    it('collects repeated ?source= params into one array', async () => {
        await GET(makeRequest('?source=mostaql&source=nafezly'))
        expect(getFreelanceProjects).toHaveBeenCalledWith(
            expect.objectContaining({ source: ['mostaql', 'nafezly'] })
        )
    })

    it('converts deadlineAfter query string to a Date', async () => {
        await GET(makeRequest('?deadlineAfter=2026-05-01'))
        const callArg = vi.mocked(getFreelanceProjects).mock.calls[0][0]
        expect(callArg?.deadlineAfter).toBeInstanceOf(Date)
    })

    it('converts take and skip query strings to numbers', async () => {
        await GET(makeRequest('?take=5&skip=15'))
        expect(getFreelanceProjects).toHaveBeenCalledWith(
            expect.objectContaining({ take: 5, skip: 15 })
        )
    })

    it('returns the service result as JSON with a 200 status', async () => {
        const response = await GET(makeRequest(''))
        const body = await response.json()
        expect(response.status).toBe(200)
        expect(body).toEqual({ projects: [{ id: '1' }], total: 1 })
    })

    it('returns a 500 with an error message when the service throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getFreelanceProjects).mockRejectedValueOnce(new Error('DB down'))
        const response = await GET(makeRequest(''))
        const body = await response.json()
        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to fetch freelance projects' })
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching freelance projects:', expect.any(Error))
        consoleSpy.mockRestore()
    })
})
