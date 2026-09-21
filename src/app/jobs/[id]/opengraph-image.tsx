import { getJobById } from '@/services/jobService'
import { sourceMap } from '@/data/sources'
import { workModeOf } from '@/types/job'
import {
    OG_CONTENT_TYPE,
    OG_SIZE,
    loadOgFonts,
    renderMissingOgImage,
    renderShareOgImage,
} from '@/lib/og-image'

export const alt = 'Job on UnifiedGig'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function JobOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return renderMissingOgImage('jobs')

    const source = sourceMap[job.source] ?? { name: job.source, color: '#CCFF00' }
    const mode = workModeOf(job)

    return renderShareOgImage(
        {
            eyebrow: `Job · via ${source.name}`,
            accent: source.color,
            title: job.title,
            subtitle: job.company,
            facts: [
                mode === 'remote' ? 'Remote' : mode === 'hybrid' ? 'Hybrid' : 'On-site',
                job.location,
                job.salary,
            ],
        },
        await loadOgFonts()
    )
}
