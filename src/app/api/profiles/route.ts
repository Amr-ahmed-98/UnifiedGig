import { NextRequest, NextResponse } from 'next/server'
import { createProfile, getProfileCounts, getProfiles } from '@/services/profileService'
import { DEMO_PROFILES } from '@/lib/demo-data'
import {
    PROFILE_LIMITS,
    hostMatchesPlatform,
    isHttpUrl,
    isPlatform,
    normalizeProfileUrl,
    platformMismatchMessage,
    type FollowProfile,
} from '@/types/profile'

function parsePlatforms(params: URLSearchParams) {
    return params
        .getAll('platform')
        .flatMap((p) => p.split(','))
        .map((p) => p.trim())
        .filter(isPlatform)
}

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const q = sp.get('q')?.trim() || undefined
    const platforms = parsePlatforms(sp)
    const take = sp.get('take') ? Number(sp.get('take')) : undefined
    const skip = sp.get('skip') ? Number(sp.get('skip')) : undefined

    if (process.env.DEMO_MODE === 'true') {
        const needle = q?.toLowerCase()
        const matched = DEMO_PROFILES.filter(
            (p) =>
                (platforms.length === 0 || platforms.includes(p.platform)) &&
                (!needle ||
                    p.name.toLowerCase().includes(needle) ||
                    (p.headline ?? '').toLowerCase().includes(needle) ||
                    (p.postsAbout ?? '').toLowerCase().includes(needle))
        )
        const start = skip ?? 0
        const count = take ?? 24
        const counts = DEMO_PROFILES.reduce<Record<string, number>>((acc, p) => {
            acc[p.platform] = (acc[p.platform] ?? 0) + 1
            return acc
        }, {})
        return NextResponse.json({ profiles: matched.slice(start, start + count), total: matched.length, counts })
    }

    try {
        const [result, counts] = await Promise.all([
            getProfiles({ q, platforms: platforms.length ? platforms : undefined, take, skip }),
            getProfileCounts(),
        ])
        return NextResponse.json({ ...result, counts })
    } catch (error) {
        console.error('Error fetching profiles:', error)
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const rawUrl = str(body.url)
    const name = str(body.name)
    const headline = str(body.headline)
    const postsAbout = str(body.postsAbout)

    if (!isPlatform(body.platform)) return NextResponse.json({ error: 'Pick a platform' }, { status: 400 })
    const platform = body.platform
    if (!isHttpUrl(rawUrl)) return NextResponse.json({ error: 'Enter a valid link starting with https://' }, { status: 400 })
    if (!hostMatchesPlatform(rawUrl, platform)) return NextResponse.json({ error: platformMismatchMessage(platform) }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (name.length > PROFILE_LIMITS.name) return NextResponse.json({ error: `Name max ${PROFILE_LIMITS.name} characters` }, { status: 400 })
    if (headline.length > PROFILE_LIMITS.headline) return NextResponse.json({ error: `Headline max ${PROFILE_LIMITS.headline} characters` }, { status: 400 })
    if (postsAbout.length > PROFILE_LIMITS.postsAbout) return NextResponse.json({ error: `Posts about max ${PROFILE_LIMITS.postsAbout} characters` }, { status: 400 })

    const url = normalizeProfileUrl(rawUrl)
    const duplicate = NextResponse.json({ error: 'That profile is already listed' }, { status: 409 })

    if (process.env.DEMO_MODE === 'true') {
        if (DEMO_PROFILES.some((p) => p.url === url)) return duplicate
        const profile: FollowProfile = {
            id: `demo-${Date.now()}`,
            platform,
            name,
            url,
            headline: headline || null,
            postsAbout: postsAbout || null,
            createdAt: new Date().toISOString(),
        }
        return NextResponse.json({ profile }, { status: 201 })
    }

    try {
        const profile = await createProfile({
            platform,
            name,
            url,
            headline: headline || null,
            postsAbout: postsAbout || null,
        })
        return NextResponse.json({ profile }, { status: 201 })
    } catch (error) {
        if ((error as { code?: string } | null)?.code === 'P2002') return duplicate
        console.error('Error creating profile:', error)
        return NextResponse.json({ error: 'Failed to add profile' }, { status: 500 })
    }
}
