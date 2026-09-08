import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobCard } from './job-card'
import type { Job } from '@/types/job'

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
