import { getSocialJobById } from '@/services/socialJobService'
import {
    OG_CONTENT_TYPE,
    OG_SIZE,
    loadOgFonts,
    renderMissingOgImage,
    renderShareOgImage,
} from '@/lib/og-image'

export const alt = 'Social job post on UnifiedGig'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function SocialJobOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const post = await getSocialJobById(id)
    if (!post) return renderMissingOgImage('social job posts')

    return renderShareOgImage(
        {
            eyebrow: 'Social job · via LinkedIn',
            accent: '#0A66C2',
            title: post.title,
            subtitle: post.authorName,
            facts: [
                post.remote ? 'Remote' : null,
                post.location,
                post.salary,
                post.tags[0] ?? null,
            ],
        },
        await loadOgFonts()
    )
}
