import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createPrompt, getPromptCounts, getPrompts } from '@/services/promptService'

vi.mock('@/services/promptService', () => ({
    getPrompts: vi.fn(),
    getPromptCounts: vi.fn(),
    createPrompt: vi.fn(),
}))

const makeGet = (query = '') => new NextRequest(`http://localhost:3000/api/prompts${query}`)
const makePost = (body: unknown) =>
    new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    })

const validBody = {
    category: 'programming',
    title: 'Write unit tests',
    body: 'Write unit tests for [function] using [framework].',
    tools: 'chatgpt, Claude',
}

describe('GET /api/prompts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getPrompts).mockResolvedValue({ prompts: [{ id: '1' }], total: 1 } as never)
        vi.mocked(getPromptCounts).mockResolvedValue({ categories: { programming: 1 } })
    })

    it('calls the service with everything undefined when no params are given', async () => {
        await GET(makeGet())
        expect(getPrompts).toHaveBeenCalledWith({ q: undefined, categories: undefined, take: undefined, skip: undefined })
    })

    it('passes q, categories, take and skip, dropping unknown categories', async () => {
        await GET(makeGet('?q=%20review%20&category=programming,nope,career&take=24&skip=24'))
        expect(getPrompts).toHaveBeenCalledWith({
            q: 'review',
            categories: ['programming', 'career'],
            take: 24,
            skip: 24,
        })
    })

    it('returns prompts, total and counts', async () => {
        const res = await GET(makeGet())
        expect(await res.json()).toEqual({ prompts: [{ id: '1' }], total: 1, counts: { categories: { programming: 1 } } })
    })

    it('returns 500 when the service throws', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(getPrompts).mockRejectedValue(new Error('db down'))
        expect((await GET(makeGet())).status).toBe(500)
    })
})

describe('POST /api/prompts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createPrompt).mockResolvedValue({ id: 'new' } as never)
    })
    afterEach(() => vi.unstubAllEnvs())

    it('creates a prompt with normalised tools', async () => {
        const res = await POST(makePost(validBody))
        expect(res.status).toBe(201)
        expect(createPrompt).toHaveBeenCalledWith({
            category: 'programming',
            title: 'Write unit tests',
            body: 'Write unit tests for [function] using [framework].',
            tools: ['ChatGPT', 'Claude'],
        })
    })

    it('accepts a prompt without tools', async () => {
        const res = await POST(makePost({ ...validBody, tools: undefined }))
        expect(res.status).toBe(201)
        expect(createPrompt).toHaveBeenCalledWith(expect.objectContaining({ tools: [] }))
    })

    it('rejects invalid JSON', async () => {
        expect((await POST(makePost('{nope'))).status).toBe(400)
    })

    it.each([
        ['bad category', { category: 'music' }],
        ['missing title', { title: '  ' }],
        ['title too long', { title: 'x'.repeat(101) }],
        ['prompt too short', { body: 'short' }],
        ['prompt too long', { body: 'x'.repeat(2001) }],
    ])('rejects %s', async (_name, override) => {
        const res = await POST(makePost({ ...validBody, ...override }))
        expect(res.status).toBe(400)
        expect(createPrompt).not.toHaveBeenCalled()
    })

    it('skips the database in demo mode', async () => {
        vi.stubEnv('DEMO_MODE', 'true')
        const res = await POST(makePost(validBody))
        expect(res.status).toBe(201)
        expect(createPrompt).not.toHaveBeenCalled()
    })
})
