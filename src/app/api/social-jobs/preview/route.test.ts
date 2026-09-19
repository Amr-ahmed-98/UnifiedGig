import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import {
    fetchLinkedInPostPreview,
    isLinkedInHost,
    isValidLinkedInUrl,
    resolveLinkedInUrl,
} from '@/lib/linkedin-embed'
import { detectTags } from '@/types/socialJob'

vi.mock('@/lib/linkedin-embed', () => ({
    fetchLinkedInPostPreview: vi.fn(),
    isLinkedInHost: vi.fn(),
    isValidLinkedInUrl: vi.fn(),
    resolveLinkedInUrl: vi.fn(),
}))

vi.mock('@/types/socialJob', () => ({
    detectTags: vi.fn(),
}))

const RAW_URL = 'https://lnkd.in/p/ewrps2Px'
const RESOLVED_URL = 'https://www.linkedin.com/posts/jane-doe_activity-7123456789'

function makePost(body: unknown) {
    return new NextRequest('http://localhost:3000/api/social-jobs/preview', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    })
}

const PREVIEW = {
    title: 'Senior Frontend Engineer',
    authorName: 'Jane Doe',
    description: 'Fully remote role, $120k - $160k.',
    imageUrl: 'https://media.licdn.com/photo.jpg',
    salary: '$120k - $160k',
    location: 'Unknown',
    remote: true,
}

describe('POST /api/social-jobs/preview', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(isLinkedInHost).mockReturnValue(true)
        vi.mocked(resolveLinkedInUrl).mockResolvedValue(RESOLVED_URL)
        vi.mocked(isValidLinkedInUrl).mockReturnValue(true)
        vi.mocked(fetchLinkedInPostPreview).mockResolvedValue(PREVIEW)
        vi.mocked(detectTags).mockReturnValue(['Remote'])
    })

    it('rejects a body that is not valid JSON with a 400', async () => {
        const response = await POST(makePost('not json'))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Invalid JSON body' })
    })

    it('rejects a non-LinkedIn link with a 400 before resolving anything', async () => {
        vi.mocked(isLinkedInHost).mockReturnValue(false)

        const response = await POST(makePost({ url: 'https://facebook.com/posts/1' }))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Paste a linkedin.com or lnkd.in link' })
        expect(resolveLinkedInUrl).not.toHaveBeenCalled()
        expect(fetchLinkedInPostPreview).not.toHaveBeenCalled()
    })

    it('returns a 502 when the lnkd.in redirect hop cannot be resolved', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(resolveLinkedInUrl).mockRejectedValueOnce(new Error('network down'))

        const response = await POST(makePost({ url: RAW_URL }))
        const body = await response.json()

        expect(response.status).toBe(502)
        expect(body).toEqual({ error: 'Could not resolve that link' })
        expect(consoleSpy).toHaveBeenCalledWith('Error resolving LinkedIn short link:', expect.any(Error))
        expect(fetchLinkedInPostPreview).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('rejects a resolved link that does not point at an embeddable post with a 400', async () => {
        vi.mocked(isValidLinkedInUrl).mockReturnValue(false)

        const response = await POST(makePost({ url: RAW_URL }))
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'That link does not point to a LinkedIn post' })
        expect(fetchLinkedInPostPreview).not.toHaveBeenCalled()
    })

    it('returns preview, detected tags and the resolved canonical URL on success', async () => {
        const response = await POST(makePost({ url: RAW_URL }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ preview: PREVIEW, tags: ['Remote'], resolvedUrl: RESOLVED_URL })

        // Tags are detected from the parsed title + description combined
        expect(detectTags).toHaveBeenCalledWith('Senior Frontend Engineer Fully remote role, $120k - $160k.')
    })

    it('still returns a 200 with an "Unknown" shell when the post cannot be read', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(fetchLinkedInPostPreview).mockRejectedValueOnce(new Error('LinkedIn returned 999'))

        const response = await POST(makePost({ url: RAW_URL }))
        const body = await response.json()

        // Intentional design: the URL is a valid post — hand back an embeddable
        // shell so the person can fill in the details by hand.
        expect(response.status).toBe(200)
        expect(body).toEqual({
            error: 'Could not read that post — fill the details in manually below.',
            resolvedUrl: RESOLVED_URL,
            preview: {
                title: 'Unknown',
                authorName: 'Unknown',
                description: null,
                imageUrl: null,
                salary: 'Unknown',
                location: 'Unknown',
                remote: false,
            },
            tags: [],
        })
        expect(detectTags).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('trims the URL before validating it', async () => {
        await POST(makePost({ url: `  ${RAW_URL}  ` }))

        expect(isLinkedInHost).toHaveBeenCalledWith(RAW_URL)
        expect(resolveLinkedInUrl).toHaveBeenCalledWith(RAW_URL)
    })
})
