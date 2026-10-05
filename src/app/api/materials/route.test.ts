import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createMaterial, getMaterialCounts, getMaterials } from '@/services/materialService'

vi.mock('@/services/materialService', () => ({
    getMaterials: vi.fn(),
    getMaterialCounts: vi.fn(),
    createMaterial: vi.fn(),
}))

const FIELD = 'software-engineering'
const URL_OK = 'https://example.com/guide'

function makeGet(query = '') {
    return new NextRequest(`http://localhost:3000/api/materials${query}`)
}

function makePost(body: unknown) {
    return new NextRequest('http://localhost:3000/api/materials', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    })
}

const validBody = { field: FIELD, url: URL_OK, title: 'Guide', type: 'docs', description: 'Helpful' }

describe('GET /api/materials', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getMaterials).mockResolvedValue({ materials: [{ id: '1' }], total: 1 } as never)
        vi.mocked(getMaterialCounts).mockResolvedValue({ fields: { [FIELD]: 1 }, types: { docs: 1 } })
    })

    it('calls the service with everything undefined when no params are given', async () => {
        await GET(makeGet())
        expect(getMaterials).toHaveBeenCalledWith({
            field: undefined,
            q: undefined,
            types: undefined,
            take: undefined,
            skip: undefined,
        })
        expect(getMaterialCounts).toHaveBeenCalledWith(undefined)
    })

    it('passes field, q, take and skip through', async () => {
        await GET(makeGet(`?field=${FIELD}&q=%20roadmap%20&take=24&skip=48`))
        expect(getMaterials).toHaveBeenCalledWith({
            field: FIELD,
            q: 'roadmap',
            types: undefined,
            take: 24,
            skip: 48,
        })
        expect(getMaterialCounts).toHaveBeenCalledWith(FIELD)
    })

    it('treats a blank q as no search', async () => {
        await GET(makeGet('?q=%20%20'))
        expect(getMaterials).toHaveBeenCalledWith(expect.objectContaining({ q: undefined }))
    })

    it('splits comma-separated types and collects repeated params', async () => {
        await GET(makeGet('?type=course,video&type=docs'))
        expect(getMaterials).toHaveBeenCalledWith(
            expect.objectContaining({ types: ['course', 'video', 'docs'] })
        )
    })

    it('drops invalid types and passes undefined when none remain', async () => {
        await GET(makeGet('?type=podcast,course'))
        expect(getMaterials).toHaveBeenCalledWith(expect.objectContaining({ types: ['course'] }))

        await GET(makeGet('?type=podcast'))
        expect(getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ types: undefined }))
    })

    it('returns 404 for an unknown field without hitting the service', async () => {
        const res = await GET(makeGet('?field=underwater-basket-weaving'))
        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'Unknown field' })
        expect(getMaterials).not.toHaveBeenCalled()
    })

    it('returns materials, total and counts', async () => {
        const res = await GET(makeGet(`?field=${FIELD}`))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
            materials: [{ id: '1' }],
            total: 1,
            counts: { fields: { [FIELD]: 1 }, types: { docs: 1 } },
        })
    })

    it('returns 500 when the service throws', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getMaterials).mockRejectedValue(new Error('db down'))
        const res = await GET(makeGet())
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'Failed to fetch materials' })
        spy.mockRestore()
    })
})

describe('POST /api/materials', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createMaterial).mockResolvedValue({ id: 'new', ...validBody } as never)
    })

    it('creates a material and returns 201', async () => {
        const res = await POST(makePost(validBody))
        expect(res.status).toBe(201)
        expect(createMaterial).toHaveBeenCalledWith({
            field: FIELD,
            url: URL_OK,
            title: 'Guide',
            type: 'docs',
            description: 'Helpful',
        })
        expect((await res.json()).material.id).toBe('new')
    })

    it('trims url, title and description', async () => {
        await POST(makePost({ ...validBody, url: `  ${URL_OK} `, title: '  Guide ', description: '  Helpful  ' }))
        expect(createMaterial).toHaveBeenCalledWith(
            expect.objectContaining({ url: URL_OK, title: 'Guide', description: 'Helpful' })
        )
    })

    it('stores a blank or missing description as null', async () => {
        await POST(makePost({ ...validBody, description: '   ' }))
        expect(createMaterial).toHaveBeenLastCalledWith(expect.objectContaining({ description: null }))

        const { description: _omit, ...noDesc } = validBody
        void _omit
        await POST(makePost(noDesc))
        expect(createMaterial).toHaveBeenLastCalledWith(expect.objectContaining({ description: null }))
    })

    it('rejects invalid JSON', async () => {
        const res = await POST(makePost('{nope'))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Invalid JSON body' })
    })

    it.each([
        ['unknown field', { field: 'nope' }, 'Unknown field'],
        ['missing field', { field: undefined }, 'Unknown field'],
        ['non-http url', { url: 'javascript:alert(1)' }, 'Enter a valid link starting with https://'],
        ['missing url', { url: '' }, 'Enter a valid link starting with https://'],
        ['blank title', { title: '   ' }, 'Title is required'],
        ['overlong title', { title: 'x'.repeat(141) }, 'Title max 140 characters'],
        ['bad type', { type: 'podcast' }, 'Pick a valid type'],
        ['missing type', { type: undefined }, 'Pick a valid type'],
        ['overlong description', { description: 'x'.repeat(281) }, 'Description max 280 characters'],
    ])('returns 400 for %s', async (_name, override, message) => {
        const res = await POST(makePost({ ...validBody, ...override }))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: message })
        expect(createMaterial).not.toHaveBeenCalled()
    })

    it('accepts a title and description exactly at the limit', async () => {
        const res = await POST(makePost({ ...validBody, title: 'x'.repeat(140), description: 'y'.repeat(280) }))
        expect(res.status).toBe(201)
    })

    it('returns 500 when the service throws', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(createMaterial).mockRejectedValue(new Error('db down'))
        const res = await POST(makePost(validBody))
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'Failed to add material' })
        spy.mockRestore()
    })
})

describe('DEMO_MODE', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubEnv('DEMO_MODE', 'true')
    })
    afterEach(() => vi.unstubAllEnvs())

    it('GET serves bundled data and never touches the service', async () => {
        const res = await GET(makeGet(`?field=${FIELD}`))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.total).toBe(4)
        expect(data.materials.every((m: { field: string }) => m.field === FIELD)).toBe(true)
        expect(getMaterials).not.toHaveBeenCalled()
        expect(getMaterialCounts).not.toHaveBeenCalled()
    })

    it('GET filters by type', async () => {
        const data = await (await GET(makeGet(`?field=${FIELD}&type=course`))).json()
        expect(data.total).toBe(1)
        expect(data.materials[0].type).toBe('course')
    })

    it('GET searches title and description case-insensitively', async () => {
        const data = await (await GET(makeGet(`?field=${FIELD}&q=HARVARD`))).json()
        expect(data.total).toBe(1)
        expect(data.materials[0].title).toMatch(/CS50x/)
    })

    it('GET paginates but keeps the full total', async () => {
        const data = await (await GET(makeGet(`?field=${FIELD}&take=2&skip=1`))).json()
        expect(data.materials).toHaveLength(2)
        expect(data.total).toBe(4)
    })

    it('GET counts: types are scoped to the field, fields cover everything', async () => {
        const { counts } = await (await GET(makeGet(`?field=${FIELD}`))).json()
        expect(counts.types).toEqual({ docs: 1, course: 1, repo: 1, article: 1 })
        expect(counts.fields[FIELD]).toBe(4)
        expect(counts.fields.networking).toBe(2)
    })

    it('GET without field returns materials across all fields', async () => {
        const data = await (await GET(makeGet())).json()
        expect(data.total).toBeGreaterThan(4)
    })

    it('GET still 404s on an unknown field', async () => {
        expect((await GET(makeGet('?field=nope'))).status).toBe(404)
    })

    it('POST echoes a material without calling the service', async () => {
        const res = await POST(makePost(validBody))
        expect(res.status).toBe(201)
        const { material } = await res.json()
        expect(material).toMatchObject({ field: FIELD, url: URL_OK, title: 'Guide', type: 'docs' })
        expect(material.id).toMatch(/^demo-/)
        expect(createMaterial).not.toHaveBeenCalled()
    })

    it('POST still validates in demo mode', async () => {
        const res = await POST(makePost({ ...validBody, title: '' }))
        expect(res.status).toBe(400)
    })
})
