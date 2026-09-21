import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from './job-card'
import type { Job } from '@/types/job'
import { buildShareUrl } from '@/lib/site'

const baseJob: Job = {
    id: '1',
    title: 'Backend Developer',
    company: 'Acme Corp',
    location: 'Cairo, Egypt',
    datePosted: new Date().toISOString(),
    remote: false,
    hybrid: false,
    salary: '$3,000/mo',
    description: null,
    url: 'https://example.com/job/1',
    source: 'wuzzuf',
}

// Shares hand out this job's own page on UnifiedGig, not the source URL.
const shareUrl = buildShareUrl('job', baseJob.id)

describe('JobCard', () => {
    it('renders title, company and location', () => {
        render(<JobCard job={ baseJob } index = { 0} />)
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('Cairo, Egypt')).toBeInTheDocument()
    })

    it('links the title to the job url', () => {
        render(<JobCard job={ baseJob } index = { 0} />)
        expect(screen.getByRole('link', { name: 'Backend Developer' })).toHaveAttribute(
            'href',
            'https://example.com/job/1'
        )
    })

    it('shows "On-site" when remote and hybrid are both false', () => {
        render(<JobCard job={ baseJob } index = { 0} />)
        expect(screen.getByText('On-site')).toBeInTheDocument()
    })

    it('shows "Remote" when remote is true', () => {
        render(<JobCard job={{ ...baseJob, remote: true }} index = { 0} />)
    expect(screen.getByText('Remote')).toBeInTheDocument()
})

it('shows "Hybrid" when only hybrid is true', () => {
    render(<JobCard job={{ ...baseJob, hybrid: true }} index = { 0} />)
expect(screen.getByText('Hybrid')).toBeInTheDocument()
    })

it('does not render a location tag when location is null', () => {
    render(<JobCard job={{ ...baseJob, location: null }} index = { 0} />)
expect(screen.queryByText('Cairo, Egypt')).not.toBeInTheDocument()
    })

it('falls back to a generic source style for an unknown source id', () => {
    render(<JobCard job={{ ...baseJob, source: 'some-new-board' }} index = { 0} />)
expect(screen.getByText(/via some-new-board/)).toBeInTheDocument()
    })
})

describe('JobCard sharing', () => {
    const writeText = vi.fn()

    beforeEach(() => {
        writeText.mockReset()
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        })
    })

    it('renders a share button labelled with the job title', () => {
        render(<JobCard job={baseJob} index={0} />)
        expect(
            screen.getByRole('button', { name: 'Share job: Backend Developer' })
        ).toBeInTheDocument()
    })

    it('opens a share menu with all social targets and copies the UnifiedGig job url', async () => {
        writeText.mockResolvedValue(undefined)
        render(<JobCard job={baseJob} index={0} />)

        fireEvent.click(screen.getByRole('button', { name: 'Share job: Backend Developer' }))

        expect(screen.getByRole('menuitem', { name: 'Share via LinkedIn' })).toHaveAttribute(
            'href',
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        )
        expect(screen.getByRole('menuitem', { name: 'Share via WhatsApp' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via Facebook' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via X' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
        expect(await screen.findByText('Copied!')).toBeInTheDocument()
        expect(writeText).toHaveBeenCalledWith(shareUrl)
    })

    it('includes company in the WhatsApp share message', () => {
        render(<JobCard job={baseJob} index={0} />)
        fireEvent.click(screen.getByRole('button', { name: 'Share job: Backend Developer' }))

        expect(screen.getByRole('menuitem', { name: 'Share via WhatsApp' })).toHaveAttribute(
            'href',
            `https://wa.me/?text=${encodeURIComponent(
                `Backend Developer — Acme Corp ${shareUrl}`
            )}`
        )
    })
})
