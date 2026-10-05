import { NextRequest, NextResponse } from 'next/server'
import { createMaterial, getMaterialCounts, getMaterials } from '@/services/materialService'
import { fieldMap } from '@/data/fields'
import { DEMO_MATERIALS } from '@/lib/demo-data'
import { isHttpUrl, isMaterialType, type LearningMaterial } from '@/types/material'

const MAX_TITLE = 140
const MAX_DESC = 280

function parseTypes(params: URLSearchParams) {
    return params
        .getAll('type')
        .flatMap((t) => t.split(','))
        .map((t) => t.trim())
        .filter(isMaterialType)
}

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const field = sp.get('field') ?? undefined
    const q = sp.get('q')?.trim() || undefined
    const types = parseTypes(sp)
    const take = sp.get('take') ? Number(sp.get('take')) : undefined
    const skip = sp.get('skip') ? Number(sp.get('skip')) : undefined

    if (field && !fieldMap[field]) {
        return NextResponse.json({ error: 'Unknown field' }, { status: 404 })
    }

    if (process.env.DEMO_MODE === 'true') {
        const needle = q?.toLowerCase()
        const inField = DEMO_MATERIALS.filter((m) => !field || m.field === field)
        const matched = inField.filter(
            (m) =>
                (types.length === 0 || types.includes(m.type)) &&
                (!needle ||
                    m.title.toLowerCase().includes(needle) ||
                    (m.description ?? '').toLowerCase().includes(needle))
        )
        const start = skip ?? 0
        const count = take ?? 24
        const counts = {
            fields: DEMO_MATERIALS.reduce<Record<string, number>>((acc, m) => {
                acc[m.field] = (acc[m.field] ?? 0) + 1
                return acc
            }, {}),
            types: inField.reduce<Record<string, number>>((acc, m) => {
                acc[m.type] = (acc[m.type] ?? 0) + 1
                return acc
            }, {}),
        }
        return NextResponse.json({ materials: matched.slice(start, start + count), total: matched.length, counts })
    }

    try {
        const [result, counts] = await Promise.all([
            getMaterials({ field, q, types: types.length ? types : undefined, take, skip }),
            getMaterialCounts(field),
        ])
        return NextResponse.json({ ...result, counts })
    } catch (error) {
        console.error('Error fetching materials:', error)
        return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const field = typeof body.field === 'string' ? body.field : ''
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!fieldMap[field]) return NextResponse.json({ error: 'Unknown field' }, { status: 400 })
    if (!isHttpUrl(url)) return NextResponse.json({ error: 'Enter a valid link starting with https://' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (title.length > MAX_TITLE) return NextResponse.json({ error: `Title max ${MAX_TITLE} characters` }, { status: 400 })
    if (!isMaterialType(body.type)) return NextResponse.json({ error: 'Pick a valid type' }, { status: 400 })
    if (description.length > MAX_DESC) return NextResponse.json({ error: `Description max ${MAX_DESC} characters` }, { status: 400 })

    if (process.env.DEMO_MODE === 'true') {
        const material: LearningMaterial = {
            id: `demo-${Date.now()}`,
            field,
            title,
            url,
            type: body.type,
            description: description || null,
            createdAt: new Date().toISOString(),
        }
        return NextResponse.json({ material }, { status: 201 })
    }

    try {
        const material = await createMaterial({ field, url, title, type: body.type, description: description || null })
        return NextResponse.json({ material }, { status: 201 })
    } catch (error) {
        console.error('Error creating material:', error)
        return NextResponse.json({ error: 'Failed to add material' }, { status: 500 })
    }
}
