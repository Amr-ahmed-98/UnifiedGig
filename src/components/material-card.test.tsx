import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaterialCard } from './material-card'
import type { LearningMaterial } from '@/types/material'

function material(overrides: Partial<LearningMaterial> = {}): LearningMaterial {
    return {
        id: 'm1',
        field: 'software-engineering',
        title: 'Backend Developer Roadmap',
        url: 'https://www.roadmap.sh/backend',
        type: 'docs',
        description: 'Step-by-step map of what to learn.',
        createdAt: new Date(Date.now() - 3 * 86_400_000 - 60_000).toISOString(),
        ...overrides,
    }
}

describe('MaterialCard', () => {
    afterEach(() => vi.useRealTimers())

    it('links out to the material in a new tab with safe rel', () => {
        render(<MaterialCard material={material()} index={0} />)
        const link = screen.getByRole('link', { name: /Backend Developer Roadmap/ })
        expect(link).toHaveAttribute('href', 'https://www.roadmap.sh/backend')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link.getAttribute('rel')).toContain('noopener')
        expect(link.getAttribute('rel')).toContain('noreferrer')
        expect(link.getAttribute('rel')).toContain('nofollow')
    })

    it('shows the title, type label and host without www', () => {
        render(<MaterialCard material={material()} index={0} />)
        expect(screen.getByRole('heading', { name: 'Backend Developer Roadmap' })).toBeInTheDocument()
        expect(screen.getByText('Docs')).toBeInTheDocument()
        expect(screen.getByText(/roadmap\.sh/)).toBeInTheDocument()
        expect(screen.queryByText(/www\./)).not.toBeInTheDocument()
    })

    it.each([
        ['course', 'Course'],
        ['video', 'Video'],
        ['article', 'Article'],
        ['docs', 'Docs'],
        ['book', 'Book'],
        ['repo', 'Repo'],
    ] as const)('renders the %s type label', (type, label) => {
        render(<MaterialCard material={material({ type })} index={0} />)
        expect(screen.getByText(label)).toBeInTheDocument()
    })

    it('renders the description when present', () => {
        render(<MaterialCard material={material()} index={0} />)
        expect(screen.getByText('Step-by-step map of what to learn.')).toBeInTheDocument()
    })

    it('omits the description when null', () => {
        render(<MaterialCard material={material({ description: null })} index={0} />)
        expect(screen.queryByText(/Step-by-step/)).not.toBeInTheDocument()
    })

    it('shows how long ago it was shared', () => {
        render(<MaterialCard material={material()} index={0} />)
        expect(screen.getByText(/Shared by the community · 3 days ago/)).toBeInTheDocument()
    })

    it('shows "today" for a fresh share', () => {
        render(<MaterialCard material={material({ createdAt: new Date().toISOString() })} index={0} />)
        expect(screen.getByText(/Shared by the community · today/)).toBeInTheDocument()
    })

    it('has a screen-reader label on the arrow', () => {
        render(<MaterialCard material={material()} index={0} />)
        expect(screen.getByText('Open Backend Developer Roadmap')).toHaveClass('sr-only')
    })
})
