import { getFreelanceProjectById } from '@/services/freelanceService'
import { sourceMap } from '@/data/sources'
import { deadlineDays } from '@/types/freelance'
import {
    OG_CONTENT_TYPE,
    OG_SIZE,
    loadOgFonts,
    renderMissingOgImage,
    renderShareOgImage,
} from '@/lib/og-image'

export const alt = 'Freelance project on UnifiedGig'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function FreelanceOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const project = await getFreelanceProjectById(id)
    if (!project) return renderMissingOgImage('freelance projects')

    const source = sourceMap[project.source] ?? { name: project.source, color: '#CCFF00' }
    const days = deadlineDays(project.deadline ? project.deadline.toISOString() : null)

    return renderShareOgImage(
        {
            eyebrow: `Freelance project · via ${source.name}`,
            accent: source.color,
            title: project.title,
            subtitle: project.budget ? `Budget: ${project.budget}` : null,
            facts: [
                days !== null ? `Due in ${Math.max(days, 0)}d` : null,
                ...project.skills.slice(0, 3),
            ],
        },
        await loadOgFonts()
    )
}
