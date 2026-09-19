import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import JobsClient from './jobs-client'
import type { Job } from '@/types/job'

function job(overrides: Partial<Job>): Job {
    return {
        id: '1',
        title: 'Backend Developer',
        company: 'Acme Corp',
        location: 'Cairo, Egypt',
        datePosted: new Date().toISOString(),
        remote: false,
        hybrid: false,
        salary: null,
        description: null,
        url: 'https://example.com/job/1',
        source: 'wuzzuf',
        ...overrides,
    }
}

function mockFetchOnce(jobs: Job[], total = jobs.length) {
    return vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs, total }),
    })
}

describe('JobsClient', () => {
    beforeEach(() => {
        // shouldAdvanceTime keeps real wall-clock ticking alongside fake timers,
        // so RTL's findBy/waitFor (which poll via real setTimeout) don't hang
        // while we still get to fast-forward the 300ms debounce deterministically.
        vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('fetches once on mount and renders returned jobs', async () => {
        const fetchMock = mockFetchOnce([job({ id: '1', title: 'Backend Developer' })])
        vi.stubGlobal('fetch', fetchMock)

        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })

        expect(await screen.findByRole('link', { name: 'Backend Developer' })).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('debounces search input: one fetch after typing stops, not per keystroke', async () => {
        const initial = mockFetchOnce([job({ id: '1', title: 'Backend Developer' })])
        vi.stubGlobal('fetch', initial)
        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })
        expect(initial).toHaveBeenCalledTimes(1)

        const debounced = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ jobs: [job({ id: '2', title: 'Frontend Engineer' })], total: 1 }),
        })
        vi.stubGlobal('fetch', debounced)

        const searchInput = screen.getByPlaceholderText('Search titles, companies…')
        fireEvent.change(searchInput, { target: { value: 'F' } })
        fireEvent.change(searchInput, { target: { value: 'Fr' } })
        fireEvent.change(searchInput, { target: { value: 'Fro' } })

        // still inside the 300ms debounce window — no fetch yet
        await act(async () => { await vi.advanceTimersByTimeAsync(200) })
        expect(debounced).not.toHaveBeenCalled()

        // past the debounce window — exactly one fetch for all three keystrokes
        await act(async () => { await vi.advanceTimersByTimeAsync(150) })
        expect(debounced).toHaveBeenCalledTimes(1)
        expect(debounced.mock.calls[0][0]).toContain('q=Fro')
    })

    it('dedupes jobs sharing the same id in a single response', async () => {
        const dupe = job({ id: '1', title: 'Backend Developer' })
        const fetchMock = mockFetchOnce([dupe, dupe])
        vi.stubGlobal('fetch', fetchMock)

        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })

        expect(await screen.findAllByRole('link', { name: 'Backend Developer' })).toHaveLength(1)
    })

    it('load more appends new jobs without re-adding ones already shown', async () => {
        const page1 = mockFetchOnce([job({ id: '1', title: 'Backend Developer' })], 2)
        vi.stubGlobal('fetch', page1)
        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })
        expect(await screen.findByRole('link', { name: 'Backend Developer' })).toBeInTheDocument()

        // server (incorrectly) re-sends job 1 alongside the new job 2 — client must dedupe
        const page2 = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                jobs: [job({ id: '1', title: 'Backend Developer' }), job({ id: '2', title: 'Frontend Engineer' })],
                total: 2,
            }),
        })
        vi.stubGlobal('fetch', page2)

        fireEvent.click(screen.getByRole('button', { name: 'Load more roles' }))
        await act(async () => { await vi.runAllTimersAsync() })

        expect(await screen.findAllByRole('link', { name: 'Backend Developer' })).toHaveLength(1)
        expect(screen.getByRole('link', { name: 'Frontend Engineer' })).toBeInTheDocument()
    })

    it('shows an error message when the fetch fails, without crashing', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) })
        vi.stubGlobal('fetch', fetchMock)

        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })

        expect(await screen.findByText('Failed to load jobs')).toBeInTheDocument()
    })

    it('shows empty state on no results and reset clears filters + refetches all jobs', async () => {
        // one long-lived mock whose response depends on the current query string,
        // so every fetch call (mount, search, reset) resolves correctly with no
        // risk of running out of queued one-shot responses.
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            const isEmptySearch = url.includes('q=no+such+role+exists')
            return {
                ok: true,
                json: async () =>
                    isEmptySearch
                        ? { jobs: [], total: 0 }
                        : { jobs: [job({ id: '1', title: 'Backend Developer' })], total: 1 },
            }
        })
        vi.stubGlobal('fetch', fetchMock)

        render(<JobsClient />)
        await act(async () => { await vi.runAllTimersAsync() })
        expect(await screen.findByRole('link', { name: 'Backend Developer' })).toBeInTheDocument()

        fireEvent.change(screen.getByPlaceholderText('Search titles, companies…'), {
            target: { value: 'no such role exists' },
        })
        await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(await screen.findByText('Nothing matches — yet.')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
        // reset clears query state immediately, but it still has to pass back
        // through the 300ms debounce before the refetch fires
        await act(async () => { await vi.advanceTimersByTimeAsync(350) })

        expect(await screen.findByRole('link', { name: 'Backend Developer' })).toBeInTheDocument()
        // the fetch that produced these results went out with the query cleared
        const lastCallUrl = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string
        expect(lastCallUrl).not.toContain('q=')
    })
})