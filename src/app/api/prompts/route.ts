import { NextRequest, NextResponse } from 'next/server'
import { createPrompt, getPromptCounts, getPrompts } from '@/services/promptService'
import { DEMO_PROMPTS } from '@/lib/demo-data'
import {
    PROMPT_LIMITS,
    isPromptCategory,
    matchKnownTools,
    parseTools,
    type Prompt,
    type PromptCategory,
} from '@/types/prompt'

function parseCategories(params: URLSearchParams): PromptCategory[] {
    return params
        .getAll('category')
        .flatMap((c) => c.split(','))
        .map((c) => c.trim())
        .filter(isPromptCategory)
}

function toNumber(raw: string | null) {
    if (!raw) return undefined
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : undefined
}

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const q = sp.get('q')?.trim() || undefined
    const categories = parseCategories(sp)
    const take = toNumber(sp.get('take'))
    const skip = toNumber(sp.get('skip'))

    if (process.env.DEMO_MODE === 'true') {
        const needle = q?.toLowerCase()
        const toolHits = needle ? matchKnownTools(needle) : []
        const matched = DEMO_PROMPTS.filter(
            (p) =>
                (categories.length === 0 || categories.includes(p.category)) &&
                (!needle ||
                    p.title.toLowerCase().includes(needle) ||
                    p.body.toLowerCase().includes(needle) ||
                    p.tools.some((t) => toolHits.includes(t) || t.toLowerCase().includes(needle)))
        )
        const start = skip ?? 0
        const count = take ?? 24
        const counts = {
            categories: DEMO_PROMPTS.reduce<Record<string, number>>((acc, p) => {
                acc[p.category] = (acc[p.category] ?? 0) + 1
                return acc
            }, {}),
        }
        return NextResponse.json({ prompts: matched.slice(start, start + count), total: matched.length, counts })
    }

    try {
        const [result, counts] = await Promise.all([
            getPrompts({ q, categories: categories.length ? categories : undefined, take, skip }),
            getPromptCounts(),
        ])
        return NextResponse.json({ ...result, counts })
    } catch (error) {
        console.error('Error fetching prompts:', error)
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const text = typeof body.body === 'string' ? body.body.trim() : ''
    const tools = parseTools(body.tools)

    if (!isPromptCategory(body.category)) return NextResponse.json({ error: 'Pick a category' }, { status: 400 })
    if (title.length < PROMPT_LIMITS.titleMin) return NextResponse.json({ error: 'Add a title' }, { status: 400 })
    if (title.length > PROMPT_LIMITS.titleMax)
        return NextResponse.json({ error: `Title max ${PROMPT_LIMITS.titleMax} characters` }, { status: 400 })
    if (text.length < PROMPT_LIMITS.bodyMin)
        return NextResponse.json({ error: `Prompt needs at least ${PROMPT_LIMITS.bodyMin} characters` }, { status: 400 })
    if (text.length > PROMPT_LIMITS.bodyMax)
        return NextResponse.json({ error: `Prompt max ${PROMPT_LIMITS.bodyMax} characters` }, { status: 400 })

    if (process.env.DEMO_MODE === 'true') {
        const prompt: Prompt = {
            id: `demo-prompt-${Date.now()}`,
            category: body.category,
            title,
            body: text,
            tools,
            createdAt: new Date().toISOString(),
        }
        return NextResponse.json({ prompt }, { status: 201 })
    }

    try {
        const prompt = await createPrompt({ category: body.category, title, body: text, tools })
        return NextResponse.json({ prompt }, { status: 201 })
    } catch (error) {
        console.error('Error creating prompt:', error)
        return NextResponse.json({ error: 'Failed to share prompt' }, { status: 500 })
    }
}
