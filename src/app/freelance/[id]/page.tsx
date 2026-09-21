import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFreelanceProjectById } from '@/services/freelanceService'
import { sourceMap } from '@/data/sources'
import { ListingDetail } from '@/components/listing-detail'
import { buildSharePath, buildShareUrl } from '@/lib/site'

export const revalidate = 300

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const project = await getFreelanceProjectById(id)
    if (!project) return { title: 'Project not found', robots: { index: false, follow: true } }

    const source = sourceMap[project.source]?.name ?? project.source
    const title = `${project.title} — freelance project`
    const description = [
        project.title,
        project.budget ? `Budget ${project.budget}` : null,
        project.skills.length > 0 ? project.skills.slice(0, 4).join(', ') : null,
        `via ${source} on UnifiedGig.`,
    ]
        .filter(Boolean)
        .join(' · ')
    const path = buildSharePath('freelance', project.id)

    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { type: 'article', title, description, url: path, siteName: 'UnifiedGig' },
        twitter: { card: 'summary_large_image', title, description },
    }
}

export default async function FreelanceSharePage({ params }: PageProps) {
    const { id } = await params
    const project = await getFreelanceProjectById(id)
    if (!project) notFound()

    const source = sourceMap[project.source] ?? { name: project.source, color: '#8B5CF6' }

    const facts = [
        { label: 'Budget', value: project.budget ?? 'Not listed' },
        project.deadline
            ? { label: 'Deadline', value: new Date(project.deadline).toLocaleDateString('en-GB') }
            : null,
        project.postedAt
            ? { label: 'Posted', value: new Date(project.postedAt).toLocaleDateString('en-GB') }
            : null,
        { label: 'Status', value: project.isOpen ? 'Open' : 'Closed' },
        { label: 'Source', value: source.name },
    ].filter((f): f is { label: string; value: string } => f !== null)

    return (
        <ListingDetail
            eyebrow={`Freelance project · via ${source.name}`}
            accent={source.color}
            title={project.title}
            subtitle={project.budget ? `Budget: ${project.budget}` : null}
            description={project.description}
            facts={facts}
            tags={project.skills}
            originalUrl={project.url}
            originalLabel={`Bid on ${source.name}`}
            shareUrl={buildShareUrl('freelance', project.id)}
            shareLabel={`Share project: ${project.title}`}
            backHref="/freelance"
            backLabel="All projects"
        />
    )
}
