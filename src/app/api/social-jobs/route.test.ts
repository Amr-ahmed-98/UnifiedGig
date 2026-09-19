import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { getSocialJobs, createSocialJobPost } from '@/services/socialJobService'
import { isValidLinkedInUrl } from '@/lib/linkedin-embed'

vi.mock('@/services/socialJobService', () => ({
    getSocialJobs: vi.fn(),
    createSocialJobPost: vi.fn(),
}))

vi.mock('@/lib/linkedin-embed', () => ({
    isValidLinkedInUrl: vi.fn(),
}))

const VALID_URL = 'https://www.linkedin.com/posts/jane-doe_activity-7123456789'

function makeGet(query: string) {
    return new NextRequest(`http://localhost:3000/api/social-jobs${query}`)
}

function makePost(body: unknown) {
    return new NextRequest('http://localhost:3000/api/social-jobs', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    })
}

describe('GET /api/social-jobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getSocialJobs).mockResolvedValue({ posts: [{ id: '1' }], total: 1 } as never)
    })

    it('calls getSocialJobs with all filters undefined when no query params given', async () => {
        await GET(makeGet(''))
        expect(getSocialJobs).toHaveBeenCalledWith({
            q: undefined,
            remote: undefined,
            tags: undefined,
            take: undefined,
            skip: undefined,
        })
    })

    it('passes q through as the search string', async () => {
        await GET(makeGet('?q=frontend'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ q: 'frontend' }))
    })

    it('parses remote=true and remote=false as booleans, not strings', async () => {
        await GET(makeGet('?remote=true'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ remote: true }))

        await GET(makeGet('?remote=false'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ remote: false }))
    })

    it('ignores a garbage value for remote instead of passing it through', async () => {
        await GET(makeGet('?remote=yes'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ remote: undefined }))
    })

    it('collects repeated ?tag= params into one array', async () => {
        await GET(makeGet('?tag=Remote&tag=AI/ML'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Remote', 'AI/ML'] }))
    })

    it('splits comma-separated tag values', async () => {
        await GET(makeGet('?tag=Design,Backend'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Design', 'Backend'] }))
    })

    it('trims whitespace around tag values and drops empties', async () => {
        await GET(makeGet('?tag=%20Design%20%2C%20Backend%20'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Design', 'Backend'] }))

        vi.clearAllMocks()
        vi.mocked(getSocialJobs).mockResolvedValue({ posts: [], total: 0 } as never)
        await GET(makeGet('?tag=,'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ tags: undefined }))
    })

    it('converts take and skip query strings to numbers', async () => {
        await GET(makeGet('?take=24&skip=48'))
        expect(getSocialJobs).toHaveBeenCalledWith(expect.objectContaining({ take: 24, skip: 48 }))
    })

    it('returns the service result as JSON with a 200 status', async () => {
        vi.mocked(getSocialJobs).mockResolvedValueOnce({ posts: [{ id: '1', title: 'A role' }], total: 1 } as never)

        const response = await GET(makeGet(''))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ posts: [{ id: '1', title: 'A role' }], total: 1 })
    })

    it('returns a 500 with an error message when the service throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(getSocialJobs).mockRejectedValueOnce(new Error('DB down'))

        const response = await GET(makeGet(''))
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to fetch social jobs' })
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching social jobs:', expect.any(Error))
        consoleSpy.mockRestore()
    })
})

describe('POST /api/social-jobs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(isValidLinkedInUrl).mockReturnValue(true)
        vi.mocked(createSocialJobPost).mockResolvedValue({ id: '1', title: 'A role' } as never)
    })

    it('rejects a body that is not valid JSON with a 400', async () => {
        const response = await POST(makePost('this is not json'))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Invalid JSON body' })
        expect(createSocialJobPost).not.toHaveBeenCalled()
    })

    it('rejects a non-LinkedIn URL with a 400 before touching the service', async () => {
        vi.mocked(isValidLinkedInUrl).mockReturnValue(false)

        const response = await POST(makePost({ url: 'https://facebook.com/posts/1', title: 'A role' }))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Paste a valid LinkedIn post URL (linkedin.com/posts/...)' })
        expect(isValidLinkedInUrl).toHaveBeenCalledWith('https://facebook.com/posts/1')
        expect(createSocialJobPost).not.toHaveBeenCalled()
    })

    it('rejects a missing or empty title with a 400', async () => {
        const missing = await POST(makePost({ url: VALID_URL }))
        expect(missing.status).toBe(400)
        await expect(missing.json()).resolves.toEqual({ error: 'Title is required' })

        const blank = await POST(makePost({ url: VALID_URL, title: '   ' }))
        expect(blank.status).toBe(400)
        await expect(blank.json()).resolves.toEqual({ error: 'Title is required' })
        expect(createSocialJobPost).not.toHaveBeenCalled()
    })

    it('validates the URL before the title', async () => {
        // Both problems at once — the URL error wins (validation order contract)
        vi.mocked(isValidLinkedInUrl).mockReturnValue(false)

        const response = await POST(makePost({ url: 'https://example.com', title: '' }))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({
            error: 'Paste a valid LinkedIn post URL (linkedin.com/posts/...)',
        })
    })

    it('trims the url and title before saving', async () => {
        await POST(
            makePost({
                url: `  ${VALID_URL}  `,
                title: '  Senior Frontend Engineer  ',
            })
        )

        expect(createSocialJobPost).toHaveBeenCalledWith(
            expect.objectContaining({ url: VALID_URL, title: 'Senior Frontend Engineer' })
        )
    })

    it('filters non-string values out of the tags array', async () => {
        await POST(
            makePost({
                url: VALID_URL,
                title: 'A role',
                tags: ['Remote', 42, null, { tag: 'nope' }, true],
            })
        )

        expect(createSocialJobPost).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Remote'] }))
    })

    it('defaults missing optional fields to null/false instead of undefined', async () => {
        await POST(makePost({ url: VALID_URL, title: 'A role' }))

        expect(createSocialJobPost).toHaveBeenCalledWith({
            url: VALID_URL,
            title: 'A role',
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
    })

    it('only accepts strings for optional text fields and booleans for remote', async () => {
        await POST(
            makePost({
                url: VALID_URL,
                title: 'A role',
                authorName: 123, // non-string → null
                description: 'A real description',
                remote: 'yes', // non-boolean → false
            })
        )

        expect(createSocialJobPost).toHaveBeenCalledWith(
            expect.objectContaining({
                authorName: null,
                description: 'A real description',
                remote: false,
            })
        )
    })

    it('returns the created post with a 201 status', async () => {
        const post = { id: '1', title: 'A role' }
        vi.mocked(createSocialJobPost).mockResolvedValueOnce(post as never)

        const response = await POST(makePost({ url: VALID_URL, title: 'A role' }))
        const body = await response.json()

        expect(response.status).toBe(201)
        expect(body).toEqual({ post })
    })

    it('returns a 500 with an error message when the service throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(createSocialJobPost).mockRejectedValueOnce(new Error('DB down'))

        const response = await POST(makePost({ url: VALID_URL, title: 'A role' }))
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Failed to embed post' })
        expect(consoleSpy).toHaveBeenCalledWith('Error embedding social job post:', expect.any(Error))
        consoleSpy.mockRestore()
    })
})
