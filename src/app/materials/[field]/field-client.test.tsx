import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import FieldClient from './field-client'
import { fieldMap } from '@/data/fields'
import type { LearningMaterial } from '@/types/material'

const FIELD = fieldMap['software-engineering']

function mat(overrides: Partial<LearningMaterial> = {}): LearningMaterial {
    return {
        id: 'm1',
        field: FIELD.slug,
        title: 'Backend Developer Roadmap',
        url: 'https://roadmap.sh/backend',
        type: 'docs',
        description: 'Step-by-step map.',
        createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        ...overrides,
    }
}

const TYPE_COUNTS = { course: 1, docs: 1 }

function listRes(materials: LearningMaterial[], total = materials.length, types: Record<string, number> = TYPE_COUNTS) {
    return { ok: true, json: async () => ({ materials, total, counts: { fields: {}, types } }) }
}

/** Parses the query string of the n-th GET call to /api/materials */
function paramsOfCall(fetchMock: ReturnType<typeof vi.fn>, n: number) {
    const url = fetchMock.mock.calls[n][0] as string
    return new URL(url, 'http://localhost').searchParams
}

describe('FieldClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(listRes([mat(), mat({ id: 'm2', title: 'CS50x', type: 'course', url: 'https://cs50.harvard.edu' })]))
        vi.stubGlobal('fetch', fetchMock)
    })
    afterEach(() => vi.unstubAllGlobals())

    it('renders the header for the field', async () => {
        render(<FieldClient field={FIELD} />)
        expect(screen.getByRole('heading', { level: 1, name: 'Software Engineering' })).toBeInTheDocument()
        expect(screen.getByText(FIELD.blurb)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /All fields/ })).toHaveAttribute('href', '/materials')
        await screen.findByText('2 materials')
    })

    it('fetches the field on mount with default paging', async () => {
        render(<FieldClient field={FIELD} />)
        await screen.findByRole('heading', { name: 'Backend Developer Roadmap' })
        const p = paramsOfCall(fetchMock, 0)
        expect(p.get('field')).toBe('software-engineering')
        expect(p.get('take')).toBe('24')
        expect(p.get('skip')).toBe('0')
        expect(p.has('q')).toBe(false)
        expect(p.has('type')).toBe(false)
    })

    it('renders materials, total, and the shared count from type counts', async () => {
        render(<FieldClient field={FIELD} />)
        expect(await screen.findByRole('heading', { name: 'Backend Developer Roadmap' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'CS50x' })).toBeInTheDocument()
        expect(screen.getByText('2 materials')).toBeInTheDocument()
        expect(screen.getByText('Materials · 2 shared')).toBeInTheDocument()
    })

    it('uses the singular for one material', async () => {
        fetchMock.mockResolvedValue(listRes([mat()], 1, { docs: 1 }))
        render(<FieldClient field={FIELD} />)
        expect(await screen.findByText('1 material')).toBeInTheDocument()
    })

    it('shows loading text before data arrives', () => {
        fetchMock.mockReturnValue(new Promise(() => {}))
        render(<FieldClient field={FIELD} />)
        expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('shows type pills with counts, including zero', async () => {
        render(<FieldClient field={FIELD} />)
        await screen.findByText('2 materials')
        expect(screen.getByRole('button', { name: /^Course/ })).toHaveTextContent('1')
        expect(screen.getByRole('button', { name: /^Video/ })).toHaveTextContent('0')
        expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThanOrEqual(6)
    })

    describe('filters', () => {
        it('refetches with type=course when the Course pill is clicked', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            fireEvent.click(screen.getByRole('button', { name: /^Course/ }))

            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            expect(paramsOfCall(fetchMock, 1).get('type')).toBe('course')
            expect(screen.getByRole('button', { name: /^Course/ })).toHaveAttribute('aria-pressed', 'true')
        })

        it('combines several types and removes one when toggled off', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            fireEvent.click(screen.getByRole('button', { name: /^Course/ }))
            fireEvent.click(screen.getByRole('button', { name: /^Video/ }))
            await waitFor(() => expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).get('type')).toBe('course,video'))

            fireEvent.click(screen.getByRole('button', { name: /^Course/ }))
            await waitFor(() => expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).get('type')).toBe('video'))
        })

        it('debounces search then refetches with q', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            const box = screen.getByLabelText('Search Software Engineering materials')
            fireEvent.change(box, { target: { value: 'c' } })
            fireEvent.change(box, { target: { value: 'cs50' } })

            // nothing fired yet — still inside the 300ms debounce
            expect(fetchMock).toHaveBeenCalledTimes(1)

            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            expect(paramsOfCall(fetchMock, 1).get('q')).toBe('cs50')
        })

        it('"Clear all filters" is disabled until something is active, then resets', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            const clear = screen.getByRole('button', { name: 'Clear all filters' })
            expect(clear).toBeDisabled()

            fireEvent.click(screen.getByRole('button', { name: /^Course/ }))
            expect(clear).toBeEnabled()

            fireEvent.click(clear)
            expect(screen.getByRole('button', { name: /^Course/ })).toHaveAttribute('aria-pressed', 'false')
            await waitFor(() => expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).has('type')).toBe(false))
        })

        it('mobile Filters button toggles an extra panel and shows the active count', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            const toggle = screen.getByRole('button', { name: /^Filters/ })
            expect(toggle).toHaveAttribute('aria-expanded', 'false')
            const before = screen.getAllByRole('button', { name: 'Clear all filters' }).length

            fireEvent.click(toggle)
            expect(toggle).toHaveAttribute('aria-expanded', 'true')
            expect(screen.getAllByRole('button', { name: 'Clear all filters' })).toHaveLength(before + 1)

            fireEvent.click(screen.getAllByRole('button', { name: /^Course/ })[0])
            expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
        })
    })

    describe('empty states', () => {
        it('invites the first share when the field has nothing', async () => {
            fetchMock.mockResolvedValue(listRes([], 0, {}))
            render(<FieldClient field={FIELD} />)
            expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument()
            expect(screen.getByText(/learn Software Engineering/)).toBeInTheDocument()
        })

        it('shows the no-match state when filters hide everything', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            fetchMock.mockResolvedValue(listRes([], 0, TYPE_COUNTS))
            fireEvent.click(screen.getByRole('button', { name: /^Book/ }))

            expect(await screen.findByText('Nothing matches — yet.')).toBeInTheDocument()
            expect(screen.queryByText('Nothing here yet.')).not.toBeInTheDocument()
        })
    })

    describe('pagination', () => {
        it('hides Load more when everything is loaded', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')
            expect(screen.queryByRole('button', { name: 'Load more materials' })).not.toBeInTheDocument()
        })

        it('loads the next page using skip and appends without duplicates', async () => {
            fetchMock
                .mockResolvedValueOnce(listRes([mat({ id: 'a', title: 'First' })], 3))
                .mockResolvedValueOnce(listRes([mat({ id: 'a', title: 'First' }), mat({ id: 'b', title: 'Second' })], 3))
            render(<FieldClient field={FIELD} />)
            await screen.findByRole('heading', { name: 'First' })

            fireEvent.click(screen.getByRole('button', { name: 'Load more materials' }))

            await screen.findByRole('heading', { name: 'Second' })
            expect(paramsOfCall(fetchMock, 1).get('skip')).toBe('1')
            expect(screen.getAllByRole('heading', { name: 'First' })).toHaveLength(1)
        })
    })

    describe('errors', () => {
        it('shows an error banner when the request fails', async () => {
            fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
            render(<FieldClient field={FIELD} />)
            expect(await screen.findByText('Failed to load materials')).toBeInTheDocument()
        })

        it('shows an error banner when fetch rejects', async () => {
            fetchMock.mockRejectedValue(new Error('offline'))
            render(<FieldClient field={FIELD} />)
            expect(await screen.findByText('offline')).toBeInTheDocument()
        })
    })

    describe('add material', () => {
        it('opens the modal for this field from the header button', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')

            fireEvent.click(screen.getByRole('button', { name: 'Add material' }))

            const dialog = await screen.findByRole('dialog', { name: 'Add material' })
            expect(within(dialog).getByText('Share a link that helps people learn Software Engineering.')).toBeInTheDocument()
        })

        it('closes the modal on Cancel', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')
            fireEvent.click(screen.getByRole('button', { name: 'Add material' }))
            const dialog = await screen.findByRole('dialog')

            fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        })

        it('refetches the list after a successful add and clears filters', async () => {
            render(<FieldClient field={FIELD} />)
            await screen.findByText('2 materials')
            // grab the sidebar pill now — the modal renders its own "Course" pill
            const coursePill = screen.getByRole('button', { name: /^Course/ })
            fireEvent.click(coursePill)
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

            fireEvent.click(screen.getByRole('button', { name: 'Add material' }))
            const dialog = await screen.findByRole('dialog')

            fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ material: mat({ id: 'new' }) }) })
            fetchMock.mockResolvedValue(listRes([mat({ id: 'new', title: 'Freshly added' })], 1))

            fireEvent.change(within(dialog).getByLabelText('Link'), { target: { value: 'https://example.com/new' } })
            fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Freshly added' } })
            fireEvent.click(within(dialog).getByRole('button', { name: 'Add material' }))

            expect(await screen.findByRole('heading', { name: 'Freshly added' })).toBeInTheDocument()
            expect(coursePill).toHaveAttribute('aria-pressed', 'false')
            const last = paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1)
            expect(last.has('type')).toBe(false)
        })
    })
})
