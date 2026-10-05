import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MaterialsClient from './materials-client'
import { learningFields } from '@/data/fields'

function mockCounts(fields: Record<string, number>) {
    return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ materials: [], total: 0, counts: { fields, types: {} } }) })
}

describe('MaterialsClient', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', mockCounts({ 'software-engineering': 4, networking: 3, cybersecurity: 1 }))
    })
    afterEach(() => vi.unstubAllGlobals())

    it('renders the hero and every field card', () => {
        render(<MaterialsClient />)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Learn the field, land the role.')
        for (const f of learningFields) {
            expect(screen.getByRole('heading', { name: f.name })).toBeInTheDocument()
        }
        expect(screen.getByRole('heading', { name: '9 fields' })).toBeInTheDocument()
    })

    it('links each card to its field page', () => {
        render(<MaterialsClient />)
        const link = screen.getByRole('link', { name: /Networking/ })
        expect(link).toHaveAttribute('href', '/materials/networking')
        expect(screen.getAllByRole('link')).toHaveLength(9)
    })

    it('shows topic chips on the cards', () => {
        render(<MaterialsClient />)
        expect(screen.getByText('CCNA')).toBeInTheDocument()
        expect(screen.getByText('Kubernetes')).toBeInTheDocument()
    })

    it('fetches counts once on mount', async () => {
        render(<MaterialsClient />)
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        expect(fetch).toHaveBeenCalledWith('/api/materials?take=1')
    })

    it('shows per-field counts with correct pluralisation and a total', async () => {
        render(<MaterialsClient />)
        expect(await screen.findByText('8 materials · 9 fields')).toBeInTheDocument()
        expect(screen.getByText('4 materials')).toBeInTheDocument()
        expect(screen.getByText('3 materials')).toBeInTheDocument()
        expect(screen.getByText('1 material')).toBeInTheDocument()
        expect(screen.getAllByText('0 materials')).toHaveLength(6)
    })

    it('still renders fields with zero counts when the count request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
        render(<MaterialsClient />)
        await waitFor(() => expect(fetch).toHaveBeenCalled())
        expect(screen.getAllByRole('link')).toHaveLength(9)
        expect(screen.getByText('0 materials · 9 fields')).toBeInTheDocument()
    })

    it('filters by field name', () => {
        render(<MaterialsClient />)
        fireEvent.change(screen.getByLabelText('Search fields'), { target: { value: 'network' } })
        expect(screen.getAllByRole('link')).toHaveLength(1)
        expect(screen.getByRole('heading', { name: '1 fields' })).toBeInTheDocument()
    })

    it('filters by topic, case-insensitively', () => {
        render(<MaterialsClient />)
        fireEvent.change(screen.getByLabelText('Search fields'), { target: { value: 'KUBERNETES' } })
        expect(screen.getAllByRole('link')).toHaveLength(1)
        expect(screen.getByRole('heading', { name: 'DevOps & Cloud' })).toBeInTheDocument()
    })

    it('filters by blurb text', () => {
        render(<MaterialsClient />)
        fireEvent.change(screen.getByLabelText('Search fields'), { target: { value: 'SEO' } })
        expect(screen.getByRole('heading', { name: 'Digital Marketing' })).toBeInTheDocument()
    })

    it('shows the empty state and resets from it', () => {
        render(<MaterialsClient />)
        fireEvent.change(screen.getByLabelText('Search fields'), { target: { value: 'zzzzzz' } })
        expect(screen.getByText('Nothing matches — yet.')).toBeInTheDocument()
        expect(screen.queryAllByRole('link')).toHaveLength(0)

        fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
        expect(screen.getAllByRole('link')).toHaveLength(9)
        expect(screen.getByLabelText('Search fields')).toHaveValue('')
    })

    it('clears the search with the X button', () => {
        render(<MaterialsClient />)
        fireEvent.change(screen.getByLabelText('Search fields'), { target: { value: 'ccna' } })
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
        expect(screen.getAllByRole('link')).toHaveLength(9)
    })
})
