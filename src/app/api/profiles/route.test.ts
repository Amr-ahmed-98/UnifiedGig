import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createProfile, getProfileCounts, getProfiles } from '@/services/profileService'

vi.mock('@/services/profileService', () => ({
    getProfiles: vi.fn(),
    getProfileCounts: vi.fn(),
    createProfile: vi.fn(),
}))

const makeGet = (q = '') => new NextRequest(`http://localhost:3000/api/profiles${q}`)
const makePost = (body: unknown) =>
    new NextRequest('http://localhost:3000/api/profiles', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    })

const valid = {
    platform: 'linkedin',
    url: 'https://www.linkedin.com/in/jane-doe/',
    name: 'Jane Doe',
    headline: 'Tech Recruiter',
    postsAbout: 'Remote roles',
}

describe('GET /api/profiles', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getProfiles).mockResolvedValue({ profiles: [{ id: '1' }], total: 1 } as never)
        vi.mocked(getProfileCounts).mockResolvedValue({ linkedin: 1 })
    })

    it('calls the service with undefined filters by default', async () => {
        await GET(makeGet())
        expect(getProfiles).toHaveBeenCalledWith({ q: undefined, platforms: undefined, take: undefined, skip: undefined })
    })

    it('passes q (trimmed), take and skip', async () => {
        await GET(makeGet('?q=%20recruiter%20&take=24&skip=24'))
        expect(getProfiles).toHaveBeenCalledWith({ q: 'recruiter', platforms: undefined, take: 24, skip: 24 })
    })

    it('splits comma lists, collects repeated params and drops invalid platforms', async () => {
        await GET(makeGet('?platform=linkedin,x&platform=telegram&platform=tiktok'))
        expect(getProfiles).toHaveBeenCalledWith(expect.objectContaining({ platforms: ['linkedin', 'x', 'telegram'] }))
        await GET(makeGet('?platform=tiktok'))
        expect(getProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ platforms: undefined }))
    })

    it('returns profiles, total and counts', async () => {
        const res = await GET(makeGet())
        expect(await res.json()).toEqual({ profiles: [{ id: '1' }], total: 1, counts: { linkedin: 1 } })
    })

    it('returns 500 when the service throws', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getProfiles).mockRejectedValue(new Error('db'))
        const res = await GET(makeGet())
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'Failed to fetch profiles' })
        spy.mockRestore()
    })
})

describe('POST /api/profiles', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createProfile).mockResolvedValue({ id: 'new' } as never)
    })

    it('creates a profile with a normalized url and returns 201', async () => {
        const res = await POST(makePost(valid))
        expect(res.status).toBe(201)
        expect(createProfile).toHaveBeenCalledWith({
            platform: 'linkedin',
            name: 'Jane Doe',
            url: 'https://linkedin.com/in/jane-doe',
            headline: 'Tech Recruiter',
            postsAbout: 'Remote roles',
        })
        expect((await res.json()).profile.id).toBe('new')
    })

    it('stores blank optional fields as null', async () => {
        await POST(makePost({ ...valid, headline: '  ', postsAbout: undefined }))
        expect(createProfile).toHaveBeenCalledWith(expect.objectContaining({ headline: null, postsAbout: null }))
    })

    it('rejects invalid JSON', async () => {
        const res = await POST(makePost('{nope'))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Invalid JSON body' })
    })

    it.each([
        ['bad platform', { platform: 'tiktok' }, 'Pick a platform'],
        ['missing platform', { platform: undefined }, 'Pick a platform'],
        ['non-http url', { url: 'javascript:alert(1)' }, 'Enter a valid link starting with https://'],
        ['empty url', { url: '' }, 'Enter a valid link starting with https://'],
        ['wrong host for platform', { platform: 'instagram' }, `That link doesn't look like a Instagram link — pick "Other" if it's right`],
        ['blank name', { name: '   ' }, 'Name is required'],
        ['long name', { name: 'x'.repeat(81) }, 'Name max 80 characters'],
        ['long headline', { headline: 'x'.repeat(101) }, 'Headline max 100 characters'],
        ['long postsAbout', { postsAbout: 'x'.repeat(161) }, 'Posts about max 160 characters'],
    ])('400 for %s', async (_n, override, message) => {
        const res = await POST(makePost({ ...valid, ...override }))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: message })
        expect(createProfile).not.toHaveBeenCalled()
    })

    it('accepts any host for "other"', async () => {
        const res = await POST(makePost({ ...valid, platform: 'other', url: 'https://jobs.example.org/team' }))
        expect(res.status).toBe(201)
    })

    it('accepts values exactly at the limits', async () => {
        const res = await POST(makePost({ ...valid, name: 'x'.repeat(80), headline: 'y'.repeat(100), postsAbout: 'z'.repeat(160) }))
        expect(res.status).toBe(201)
    })

    it('maps a unique violation to 409', async () => {
        vi.mocked(createProfile).mockRejectedValue({ code: 'P2002' })
        const res = await POST(makePost(valid))
        expect(res.status).toBe(409)
        expect(await res.json()).toEqual({ error: 'That profile is already listed' })
    })

    it('returns 500 on other errors', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(createProfile).mockRejectedValue(new Error('db'))
        const res = await POST(makePost(valid))
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'Failed to add profile' })
        spy.mockRestore()
    })
})

describe('DEMO_MODE', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubEnv('DEMO_MODE', 'true')
    })
    afterEach(() => vi.unstubAllEnvs())

    it('GET serves bundled data without touching the service', async () => {
        const data = await (await GET(makeGet())).json()
        expect(data.total).toBe(8)
        expect(data.counts).toEqual({ linkedin: 4, facebook: 1, telegram: 1, x: 1, instagram: 1 })
        expect(getProfiles).not.toHaveBeenCalled()
    })

    it('GET filters by platform and searches name, headline and postsAbout', async () => {
        expect((await (await GET(makeGet('?platform=linkedin'))).json()).total).toBe(4)
        expect((await (await GET(makeGet('?q=FINTECH'))).json()).profiles[0].name).toBe('Mariam Adel')
        expect((await (await GET(makeGet('?q=react'))).json()).profiles[0].name).toBe('Youssef Fathy')
    })

    it('GET paginates but keeps the full total', async () => {
        const data = await (await GET(makeGet('?take=3&skip=2'))).json()
        expect(data.profiles).toHaveLength(3)
        expect(data.total).toBe(8)
    })

    it('POST echoes a profile without calling the service', async () => {
        const res = await POST(makePost(valid))
        expect(res.status).toBe(201)
        expect((await res.json()).profile.id).toMatch(/^demo-/)
        expect(createProfile).not.toHaveBeenCalled()
    })

    it('POST returns 409 for a link already in the demo list, even with www/trailing slash', async () => {
        const res = await POST(makePost({ ...valid, url: 'https://www.linkedin.com/in/mariam-adel-demo/' }))
        expect(res.status).toBe(409)
    })
})
