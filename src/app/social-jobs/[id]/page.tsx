import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSocialJobById } from '@/services/socialJobService'
import { ListingDetail } from '@/components/listing-detail'
import { buildSharePath, buildShareUrl } from '@/lib/site'
import { expiryLabel } from '@/types/socialJob'

// Social posts live 48h, so a shared link must not be cached for long.
export const revalidate = 60

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const post = await getSocialJobById(id)
    if (!post) return { title: 'Post not available', robots: { index: false, follow: true } }

    const title = post.authorName ? `${post.title} — ${post.authorName}` : post.title
    const description = [
        post.title,
        post.authorName ? `Posted by ${post.authorName}` : null,
        post.location,
        post.salary,
        'Shared on UnifiedGig.',
    ]
        .filter(Boolean)
        .join(' · ')
    const path = buildSharePath('social', post.id)

    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { type: 'article', title, description, url: path, siteName: 'UnifiedGig' },
        twitter: { card: 'summary_large_image', title, description },
    }
}

export default async function SocialJobSharePage({ params }: PageProps) {
    const { id } = await params
    const post = await getSocialJobById(id)
    if (!post) notFound()

    const author = post.authorName ?? 'LinkedIn post'

    const facts = [
        { label: 'Posted by', value: author },
        post.authorTitle ? { label: 'Role', value: post.authorTitle } : null,
        post.location ? { label: 'Location', value: post.location } : null,
        post.salary ? { label: 'Salary', value: post.salary } : null,
        post.remote ? { label: 'Work mode', value: 'Remote' } : null,
        post.recruiterContact ? { label: 'Contact', value: post.recruiterContact } : null,
        { label: 'Expires', value: expiryLabel(post.expiresAt.toISOString()) },
    ].filter((f): f is { label: string; value: string } => f !== null)

    return (
        <ListingDetail
            eyebrow="Social job · via LinkedIn"
            accent="#0A66C2"
            title={post.title}
            subtitle={post.authorTitle ? `${author} — ${post.authorTitle}` : author}
            description={post.description}
            facts={facts}
            tags={post.tags}
            originalUrl={post.url}
            originalLabel="View on LinkedIn"
            shareUrl={buildShareUrl('social', post.id)}
            shareLabel={`Share post: ${post.title}`}
            backHref="/social-jobs"
            backLabel="All social jobs"
        />
    )
}
