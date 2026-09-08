import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FreelanceCard } from './freelance-card'
import type { FreelanceProject } from '@/types/freelance'

const baseProject: FreelanceProject = {
    id: '1',
    title: 'Build a landing page',
    budget: '$500',
    deadline: null,
    skills: ['React', 'Tailwind'],
    description: 'A short project description.',
    url: 'https://example.com/project/1',
    source: 'mostaql',
}

describe('FreelanceCard', () => {
    it('renders title, budget and description', () => {
        render(<FreelanceCard project={baseProject} index={0} />)
        expect(screen.getByText('Build a landing page')).toBeInTheDocument()
        expect(screen.getByText('$500')).toBeInTheDocument()
        expect(screen.getByText('A short project description.')).toBeInTheDocument()
    })

    it('links the title to the project url', () => {
        render(<FreelanceCard project={baseProject} index={0} />)
        expect(screen.getByRole('link', { name: 'Build a landing page' })).toHaveAttribute(
            'href',
            'https://example.com/project/1'
        )
    })

    it('renders each skill tag', () => {
        render(<FreelanceCard project={baseProject} index={0} />)
        expect(screen.getByText('React')).toBeInTheDocument()
        expect(screen.getByText('Tailwind')).toBeInTheDocument()
    })

    it('shows "Not listed" when budget is null', () => {
        render(<FreelanceCard project={{ ...baseProject, budget: null }} index={0} />)
        expect(screen.getByText('Not listed')).toBeInTheDocument()
    })

    it('shows "No deadline" when deadline is null', () => {
        render(<FreelanceCard project={baseProject} index={0} />)
        expect(screen.getByText('No deadline')).toBeInTheDocument()
    })

    it('shows the days remaining when a deadline is set', () => {
        const future = new Date(Date.now() + 5 * 86_400_000).toISOString()
        render(<FreelanceCard project={{ ...baseProject, deadline: future }} index={0} />)
        expect(screen.getByText(/Due in \d+d/)).toBeInTheDocument()
    })

    it('does not render a skills row when skills is empty', () => {
        render(<FreelanceCard project={{ ...baseProject, skills: [] }} index={0} />)
        expect(screen.queryByText('React')).not.toBeInTheDocument()
    })

    it('falls back to a generic source name for an unknown source id', () => {
        render(<FreelanceCard project={{ ...baseProject, source: 'some-new-board' }} index={0} />)
        expect(screen.getByText('some-new-board')).toBeInTheDocument()
    })
})
