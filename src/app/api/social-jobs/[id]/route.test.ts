import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'
import { deleteSocialJobPost } from '@/services/socialJobService'

vi.mock('@/services/socialJobService', () => ({
    deleteSocialJobPost: vi.fn(),
}))

function makeDeleteRequest(id: string) {
    return new NextRequest(`http://localhost:3000/api/social-jobs/${id}`, { method: 'DELETE' })
}

function makeContext(id: string) {
    // Next 15+/16 route handlers receive params as a Promise
    return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/social-jobs/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('awaits the params promise and deletes the post by id', async () => {
        vi.mocked(deleteSocialJobPost).mockResolvedValueOnce({ id: 'post-1' } as never)

        await DELETE(makeDeleteRequest('post-1'), makeContext('post-1'))

        expect(deleteSocialJobPost).toHaveBeenCalledWith('post-1')
    })

    it('returns { ok: true } with a 200 status on success', async () => {
        vi.mocked(deleteSocialJobPost).mockResolvedValueOnce({ id: 'post-1' } as never)

        const response = await DELETE(makeDeleteRequest('post-1'), makeContext('post-1'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ ok: true })
    })

    it('returns a 500 when the service throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(deleteSocialJobPost).mockRejectedValueOnce(new Error('Record to delete does not exist'))

        const response = await DELETE(makeDeleteRequest('missing'), makeContext('missing'))
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to delete post' })
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting social job post:', expect.any(Error))
        consoleSpy.mockRestore()
        // NOTE: this pins current behavior — a Prisma P2025 not-found lands here as a 500.
        // If the route is later taught to map P2025 to a 404, update this test to match.
    })
})
