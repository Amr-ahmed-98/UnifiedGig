import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FreelanceCard } from './freelance-card'
import type { FreelanceProject } from '@/types/freelance'
import { buildShareUrl } from '@/lib/site'

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

// Shares hand out this project's own page on UnifiedGig, not the source URL.
const shareUrl = buildShareUrl('freelance', baseProject.id)

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

    describe('sharing', () => {
        const writeText = vi.fn()

        beforeEach(() => {
            writeText.mockReset()
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText },
                configurable: true,
            })
        })

        it('renders a share button labelled with the project title', () => {
            render(<FreelanceCard project={baseProject} index={0} />)
            expect(
                screen.getByRole('button', { name: 'Share project: Build a landing page' })
            ).toBeInTheDocument()
        })

        it('opens a share menu whose options point at the UnifiedGig project page', async () => {
            writeText.mockResolvedValue(undefined)
            render(<FreelanceCard project={baseProject} index={0} />)

            fireEvent.click(
                screen.getByRole('button', { name: 'Share project: Build a landing page' })
            )

            expect(screen.getByRole('menuitem', { name: 'Share via LinkedIn' })).toHaveAttribute(
                'href',
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    shareUrl
                )}`
            )
            expect(screen.getByRole('menuitem', { name: 'Share via WhatsApp' })).toBeInTheDocument()
            expect(screen.getByRole('menuitem', { name: 'Share via Facebook' })).toBeInTheDocument()
            expect(screen.getByRole('menuitem', { name: 'Share via X' })).toBeInTheDocument()

            fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
            expect(await screen.findByText('Copied!')).toBeInTheDocument()
            expect(writeText).toHaveBeenCalledWith(shareUrl)
        })
    })
})
