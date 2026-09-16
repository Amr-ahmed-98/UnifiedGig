import { NextRequest, NextResponse } from 'next/server'
import { getSocialJobs, createSocialJobPost } from '@/services/socialJobService'
import { isValidLinkedInUrl } from '@/lib/linkedin-embed'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const q = searchParams.get('q')
    const remote = searchParams.get('remote')
    const tagParams = searchParams.getAll('tag')
    const take = searchParams.get('take')
    const skip = searchParams.get('skip')

    const tags = tagParams
        .flatMap((t) => t.split(','))
        .map((t) => t.trim())
        .filter(Boolean)

    try {
        const result = await getSocialJobs({
            q: q ?? undefined,
            remote: remote === 'true' ? true : remote === 'false' ? false : undefined,
            tags: tags.length > 0 ? tags : undefined,
            take: take ? Number(take) : undefined,
            skip: skip ? Number(skip) : undefined,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching social jobs:', error)
        return NextResponse.json({ error: 'Failed to fetch social jobs' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!isValidLinkedInUrl(url)) {
        return NextResponse.json(
            { error: 'Paste a valid LinkedIn post URL (linkedin.com/posts/...)' },
            { status: 400 }
        )
    }
    if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const tags = Array.isArray(body.tags)
        ? body.tags.filter((t): t is string => typeof t === 'string')
        : []

    try {
        const post = await createSocialJobPost({
            url,
            title,
            authorName: typeof body.authorName === 'string' ? body.authorName : null,
            authorTitle: typeof body.authorTitle === 'string' ? body.authorTitle : null,
            authorImageUrl: typeof body.authorImageUrl === 'string' ? body.authorImageUrl : null,
            description: typeof body.description === 'string' ? body.description : null,
            salary: typeof body.salary === 'string' ? body.salary : null,
            location: typeof body.location === 'string' ? body.location : null,
            remote: typeof body.remote === 'boolean' ? body.remote : false,
            tags,
            recruiterContact: typeof body.recruiterContact === 'string' ? body.recruiterContact : null,
            imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        })

        return NextResponse.json({ post }, { status: 201 })
    } catch (error) {
        console.error('Error embedding social job post:', error)
        return NextResponse.json({ error: 'Failed to embed post' }, { status: 500 })
    }
}
