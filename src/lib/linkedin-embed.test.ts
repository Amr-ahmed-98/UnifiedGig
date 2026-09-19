import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    fetchLinkedInPostPreview,
    isLinkedInHost,
    isValidLinkedInUrl,
    resolveLinkedInUrl,
} from './linkedin-embed'

const POST_URL = 'https://www.linkedin.com/posts/jane-doe_activity-7123456789'

function pageHtml(opts: { meta?: Record<string, string>; metaName?: Record<string, string>; title?: string } = {}) {
    const propertyMetas = Object.entries(opts.meta ?? {})
        .map(([prop, content]) => `<meta property="${prop}" content="${content}">`)
        .join('\n')
    const nameMetas = Object.entries(opts.metaName ?? {})
        .map(([prop, content]) => `<meta name="${prop}" content="${content}">`)
        .join('\n')
    return `<!DOCTYPE html><html><head>\n${propertyMetas}\n${nameMetas}\n<title>${opts.title ?? ''}</title></head><body></body></html>`
}

function fetchOk(html: string, url = POST_URL) {
    return vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url,
        text: async () => html,
    })
}

describe('isLinkedInHost (loose pre-check)', () => {
    it.each([
        'https://linkedin.com/posts/some-post',
        'https://www.linkedin.com/posts/some-post',
        'http://linkedin.com/anything-at-all',
        'https://lnkd.in/p/ewrps2Px',
    ])('accepts %s', (raw) => {
        expect(isLinkedInHost(raw)).toBe(true)
    })

    it.each([
        'https://facebook.com/posts/some-post',
        'https://linkedin.co/posts/some-post', // lookalike TLD
        'https://notlinkedin.com/',
        'https://ca.linkedin.com/posts/some-post', // country subdomain — pinned current strict-equality behavior
        'not a url at all',
        '',
    ])('rejects %s', (raw) => {
        expect(isLinkedInHost(raw)).toBe(false)
    })
})

describe('isValidLinkedInUrl (strict post-path check)', () => {
    it.each([
        'https://www.linkedin.com/posts/jane-doe_activity-7123456789',
        'https://linkedin.com/posts/some-post',
        'https://www.linkedin.com/feed/update/urn:li:activity:123456789',
        'https://www.linkedin.com/pulse/how-we-hire-engineers-acme',
    ])('accepts %s', (raw) => {
        expect(isValidLinkedInUrl(raw)).toBe(true)
    })

    it.each([
        ['https://lnkd.in/p/ewrps2Px', 'short links must be resolved to linkedin.com first'],
        ['https://linkedin.com/in/jane-doe', 'profile pages are not embeddable posts'],
        ['https://linkedin.com/company/acme', 'company pages are not embeddable posts'],
        ['https://linkedin.com/jobs/view/123456', 'job listings are not embeddable posts'],
        ['https://ca.linkedin.com/posts/some-post', 'subdomains are not the canonical host'],
        ['https://facebook.com/posts/some-post', 'not LinkedIn at all'],
        ['definitely not a url', 'not even a URL'],
    ])('rejects %s (%s)', (raw) => {
        expect(isValidLinkedInUrl(raw)).toBe(false)
    })
})

describe('resolveLinkedInUrl', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('passes a non-shortened URL straight through without any fetch', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const raw = 'https://www.linkedin.com/posts/jane-doe_activity-123'
        await expect(resolveLinkedInUrl(raw)).resolves.toBe(raw)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('follows the lnkd.in redirect and returns the canonical post URL', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: 'https://www.linkedin.com/posts/jane-doe_activity-7123456789',
        })
        vi.stubGlobal('fetch', fetchMock)

        const raw = 'https://lnkd.in/p/ewrps2Px'
        await expect(resolveLinkedInUrl(raw)).resolves.toBe(
            'https://www.linkedin.com/posts/jane-doe_activity-7123456789'
        )
        expect(fetchMock).toHaveBeenCalledWith(raw, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': expect.any(String) },
        })
    })

    it('rejects when the redirect hop fails (the route maps this to a 502)', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
        vi.stubGlobal('fetch', fetchMock)

        await expect(resolveLinkedInUrl('https://lnkd.in/p/ewrps2Px')).rejects.toThrow('network down')
    })
})

describe('fetchLinkedInPostPreview', () => {
    beforeEach(() => {
        // The lib logs raw tags when author extraction fails and NODE_ENV !== production
        vi.spyOn(console, 'log').mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('parses the happy-path OG-tagged post page', async () => {
        const html = pageHtml({
            meta: {
                'og:title': 'Jane Doe on LinkedIn: We are hiring Senior Frontend Engineers!',
                'og:description':
                    'Our team is growing. $120k - $160k based in Cairo. Fully remote role. Apply via DM.',
                'og:image': 'https://media.licdn.com/dms/image/photo.jpg',
            },
        })
        const fetchMock = fetchOk(html)
        vi.stubGlobal('fetch', fetchMock)

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(fetchMock).toHaveBeenCalledWith(
            POST_URL,
            expect.objectContaining({
                redirect: 'follow',
                headers: { 'User-Agent': expect.any(String), Accept: 'text/html' },
            })
        )

        expect(preview).toEqual({
            title: 'We are hiring Senior Frontend Engineers!',
            authorName: 'Jane Doe',
            description:
                'Our team is growing. $120k - $160k based in Cairo. Fully remote role. Apply via DM.',
            imageUrl: 'https://media.licdn.com/dms/image/photo.jpg',
            salary: '$120k - $160k',
            location: 'Cairo',
            remote: true,
        })
    })

    it('handles the "Name on LinkedIn" title shape (no post text)', async () => {
        const html = pageHtml({ meta: { 'og:title': 'Ahmed Ali on LinkedIn' } })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.authorName).toBe('Ahmed Ali')
        // No leftover post text — title falls back to the raw og:title
        expect(preview.title).toBe('Ahmed Ali on LinkedIn')
    })

    it('handles the personal-profile share shape "post text… | Name" (name is LAST)', async () => {
        const html = pageHtml({ meta: { 'og:title': 'Senior Backend Dev — hiring!… | Sarah Smith' } })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.authorName).toBe('Sarah Smith')
        expect(preview.title).toBe('Senior Backend Dev — hiring!…')
    })

    it('does not treat a trailing "| LinkedIn" as an author name', async () => {
        const html = pageHtml({ meta: { 'og:title': 'Some cool role | LinkedIn' } })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.authorName).toBe('Unknown')
        expect(preview.title).toBe('Some cool role | LinkedIn')
    })

    it('falls back to <title> when no OG tags exist and every field degrades gracefully', async () => {
        const html = pageHtml({ title: 'Just a page title' })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview).toEqual({
            title: 'Just a page title',
            authorName: 'Unknown',
            description: null,
            imageUrl: null,
            salary: 'Unknown',
            location: 'Unknown',
            remote: false,
        })
    })

    it('reads meta[name=…] when meta[property=…] is missing', async () => {
        const html = pageHtml({ metaName: { 'og:title': 'Jane Doe on LinkedIn: Title from name attr' } })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.authorName).toBe('Jane Doe')
        expect(preview.title).toBe('Title from name attr')
    })

    it('caps an extremely long title at 300 characters', async () => {
        const longText = 'x'.repeat(400)
        const html = pageHtml({ meta: { 'og:title': `Jane Doe on LinkedIn: ${longText}` } })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.title).toHaveLength(300)
    })

    it.each([404, 500, 999])('throws "LinkedIn returned %s" on a non-OK response', async (status) => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, status, text: async () => '' })
        vi.stubGlobal('fetch', fetchMock)

        await expect(fetchLinkedInPostPreview(POST_URL)).rejects.toThrow(`LinkedIn returned ${status}`)
    })

    it('reports "Unknown" salary/location and remote=false when the description has none of them', async () => {
        const html = pageHtml({
            meta: {
                'og:title': 'Jane Doe on LinkedIn: Vague hiring post',
                'og:description': 'We are hiring, DM me for details.',
            },
        })
        vi.stubGlobal('fetch', fetchOk(html))

        const preview = await fetchLinkedInPostPreview(POST_URL)

        expect(preview.salary).toBe('Unknown')
        expect(preview.location).toBe('Unknown')
        expect(preview.remote).toBe(false)
    })
})
