import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getJobById } from '@/services/jobService'
import { sourceMap } from '@/data/sources'
import { ListingDetail } from '@/components/listing-detail'
import { buildSharePath, buildShareUrl } from '@/lib/site'
import { workModeOf } from '@/types/job'

// Listings change as scrapers run; 5 minutes is fresh enough for a shared link
// and keeps the OG crawlers off the database on every unfurl.
export const revalidate = 300

interface PageProps {
    params: Promise<{ id: string }>
}

function modeLabel(remote: boolean, hybrid: boolean) {
    const mode = workModeOf({ remote, hybrid })
    return mode === 'remote' ? 'Remote' : mode === 'hybrid' ? 'Hybrid' : 'On-site'
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return { title: 'Job not found', robots: { index: false, follow: true } }

    const source = sourceMap[job.source]?.name ?? job.source
    const title = `${job.title} at ${job.company}`
    const description = [
        `${job.title} — ${job.company}`,
        job.location,
        modeLabel(job.remote, job.hybrid),
        job.salary,
        `via ${source} on UnifiedGig.`,
    ]
        .filter(Boolean)
        .join(' · ')
    const path = buildSharePath('job', job.id)

    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { type: 'article', title, description, url: path, siteName: 'UnifiedGig' },
        twitter: { card: 'summary_large_image', title, description },
    }
}

export default async function JobSharePage({ params }: PageProps) {
    const { id } = await params
    const job = await getJobById(id)
    if (!job) notFound()

    const source = sourceMap[job.source] ?? { name: job.source, color: '#8B5CF6' }

    const facts = [
        { label: 'Company', value: job.company },
        { label: 'Work mode', value: modeLabel(job.remote, job.hybrid) },
        job.location ? { label: 'Location', value: job.location } : null,
        job.salary ? { label: 'Salary', value: job.salary } : null,
        job.datePosted
            ? { label: 'Posted', value: new Date(job.datePosted).toLocaleDateString('en-GB') }
            : null,
        { label: 'Source', value: source.name },
    ].filter((f): f is { label: string; value: string } => f !== null)

    return (
        <ListingDetail
            eyebrow={`Job · via ${source.name}`}
            accent={source.color}
            title={job.title}
            subtitle={job.company}
            description={job.description}
            facts={facts}
            originalUrl={job.url}
            originalLabel={`Apply on ${source.name}`}
            shareUrl={buildShareUrl('job', job.id)}
            shareLabel={`Share job: ${job.title}`}
            backHref="/jobs"
            backLabel="All jobs"
        />
    )
}
