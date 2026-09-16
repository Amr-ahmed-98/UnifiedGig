import { NextRequest, NextResponse } from 'next/server'
import {
    fetchLinkedInPostPreview,
    isLinkedInHost,
    isValidLinkedInUrl,
    resolveLinkedInUrl,
} from '@/lib/linkedin-embed'
import { detectTags } from '@/types/socialJob'

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const raw = typeof body.url === 'string' ? body.url.trim() : ''

    if (!isLinkedInHost(raw)) {
        return NextResponse.json(
            { error: 'Paste a linkedin.com or lnkd.in link' },
            { status: 400 }
        )
    }

    // lnkd.in share links need a redirect hop before we know the real post URL.
    let resolvedUrl: string
    try {
        resolvedUrl = await resolveLinkedInUrl(raw)
    } catch (error) {
        console.error('Error resolving LinkedIn short link:', error)
        return NextResponse.json({ error: 'Could not resolve that link' }, { status: 502 })
    }

    if (!isValidLinkedInUrl(resolvedUrl)) {
        return NextResponse.json(
            { error: 'That link does not point to a LinkedIn post' },
            { status: 400 }
        )
    }

    try {
        const preview = await fetchLinkedInPostPreview(resolvedUrl)
        const tags = detectTags(`${preview.title} ${preview.description ?? ''}`)
        return NextResponse.json({ preview, tags, resolvedUrl })
    } catch (error) {
        console.error('Error parsing LinkedIn post:', error)
        // The URL itself is a valid post — we just couldn't read it. Still
        // hand back an embeddable shell so the person can fill it in by hand.
        return NextResponse.json({
            error: 'Could not read that post — fill the details in manually below.',
            resolvedUrl,
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
    }
}
