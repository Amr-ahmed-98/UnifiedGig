import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import PromptsClient from './prompts-client'
import type { Prompt } from '@/types/prompt'

function prompt(overrides: Partial<Prompt> = {}): Prompt {
    return {
        id: 'p1',
        category: 'programming',
        title: 'Senior code review',
        body: 'Act as a senior [language] engineer. Review this code: [paste code]',
        tools: ['ChatGPT', 'Claude'],
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

const CATEGORY_COUNTS = { programming: 2, images: 1, video: 1, writing: 1 } // library total = 5

function listRes(prompts: Prompt[], total = prompts.length, categories: Record<string, number> = CATEGORY_COUNTS) {
    return { ok: true, json: async () => ({ prompts, total, counts: { categories } }) }
}

/** Parses the query string of the n-th fetch call to /api/prompts */
function paramsOfCall(fetchMock: ReturnType<typeof vi.fn>, n: number) {
    const url = fetchMock.mock.calls[n][0] as string
    return new URL(url, 'http://localhost').searchParams
}

const lastParams = (fetchMock: ReturnType<typeof vi.fn>) => paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1)

describe('PromptsClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(
            listRes([prompt(), prompt({ id: 'p2', title: 'Professional headshot', category: 'images', tools: ['Midjourney'] })])
        )
        vi.stubGlobal('fetch', fetchMock)
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        document.body.style.overflow = ''
    })

    describe('hero', () => {
        it('renders the heading, intro, search and share button', async () => {
            render(<PromptsClient />)
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Better prompts,\s*better output\./)
            expect(screen.getByText('AI prompt library')).toBeInTheDocument()
            expect(screen.getByLabelText('Search prompts')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Search prompts, tools…')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Share a prompt' })).toBeInTheDocument()
            await screen.findByText('2 prompts')
        })

        it('shows the whole-library count from the category counts', async () => {
            render(<PromptsClient />)
            expect(await screen.findByText('5 prompts')).toBeInTheDocument()
        })

        it('uses the singular when the library has one prompt', async () => {
            fetchMock.mockResolvedValue(listRes([prompt()], 1, { programming: 1 }))
            render(<PromptsClient />)
            expect((await screen.findAllByText('1 prompt')).length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('listing', () => {
        it('fetches on mount with default paging and no filters', async () => {
            render(<PromptsClient />)
            await screen.findByRole('heading', { name: 'Senior code review' })
            const p = paramsOfCall(fetchMock, 0)
            expect(p.get('take')).toBe('24')
            expect(p.get('skip')).toBe('0')
            expect(p.has('q')).toBe(false)
            expect(p.has('category')).toBe(false)
        })

        it('renders a card per prompt and the result total', async () => {
            render(<PromptsClient />)
            expect(await screen.findByRole('heading', { name: 'Senior code review' })).toBeInTheDocument()
            expect(screen.getByRole('heading', { name: 'Professional headshot' })).toBeInTheDocument()
            expect(screen.getByText('2 prompts')).toBeInTheDocument()
            expect(screen.getByText('Copy & paste')).toBeInTheDocument()
        })

        it('shows loading text before data arrives', () => {
            fetchMock.mockReturnValue(new Promise(() => {}))
            render(<PromptsClient />)
            expect(screen.getByText('Loading…')).toBeInTheDocument()
        })

        it('every card has a Copy button', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            expect(screen.getAllByRole('button', { name: /^Copy prompt:/ })).toHaveLength(2)
        })
    })

    describe('category filters', () => {
        it('shows all five category pills with counts, including zero', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            expect(screen.getByRole('button', { name: /^Programming/ })).toHaveTextContent('2')
            expect(screen.getByRole('button', { name: /^Images/ })).toHaveTextContent('1')
            expect(screen.getByRole('button', { name: /^Career/ })).toHaveTextContent('0')
            expect(screen.getByText('Use it for')).toBeInTheDocument()
        })

        it('refetches with category=images when the Images pill is clicked', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')

            fireEvent.click(screen.getByRole('button', { name: /^Images/ }))

            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            expect(paramsOfCall(fetchMock, 1).get('category')).toBe('images')
            expect(screen.getByRole('button', { name: /^Images/ })).toHaveAttribute('aria-pressed', 'true')
        })

        it('combines categories and removes one when toggled off', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')

            fireEvent.click(screen.getByRole('button', { name: /^Programming/ }))
            fireEvent.click(screen.getByRole('button', { name: /^Images/ }))
            await waitFor(() => expect(lastParams(fetchMock).get('category')).toBe('programming,images'))

            fireEvent.click(screen.getByRole('button', { name: /^Programming/ }))
            await waitFor(() => expect(lastParams(fetchMock).get('category')).toBe('images'))
        })

        it('resets paging to skip=0 when a filter changes', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            fireEvent.click(screen.getByRole('button', { name: /^Video/ }))
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            expect(paramsOfCall(fetchMock, 1).get('skip')).toBe('0')
        })
    })

    describe('search', () => {
        it('debounces then refetches with q', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')

            const box = screen.getByLabelText('Search prompts')
            fireEvent.change(box, { target: { value: 'c' } })
            fireEvent.change(box, { target: { value: 'claude' } })

            // still inside the 300ms debounce
            expect(fetchMock).toHaveBeenCalledTimes(1)

            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            expect(paramsOfCall(fetchMock, 1).get('q')).toBe('claude')
        })

        it('trims the query and ignores whitespace-only input', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            fireEvent.change(screen.getByLabelText('Search prompts'), { target: { value: '   ' } })
            await new Promise((r) => setTimeout(r, 450))
            expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('q='))).toBe(true)
        })

        it('combines search with category filters', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            fireEvent.click(screen.getByRole('button', { name: /^Programming/ }))
            fireEvent.change(screen.getByLabelText('Search prompts'), { target: { value: 'review' } })
            await waitFor(() => {
                const p = lastParams(fetchMock)
                expect(p.get('q')).toBe('review')
                expect(p.get('category')).toBe('programming')
            })
        })
    })

    describe('clearing filters', () => {
        it('"Clear all filters" is disabled until something is active, then resets', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')

            const clear = screen.getByRole('button', { name: 'Clear all filters' })
            expect(clear).toBeDisabled()

            fireEvent.click(screen.getByRole('button', { name: /^Images/ }))
            expect(clear).toBeEnabled()

            fireEvent.click(clear)
            expect(screen.getByRole('button', { name: /^Images/ })).toHaveAttribute('aria-pressed', 'false')
            expect(screen.getByLabelText('Search prompts')).toHaveValue('')
            await waitFor(() => expect(lastParams(fetchMock).has('category')).toBe(false))
        })

        it('is enabled by a search query alone', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            fireEvent.change(screen.getByLabelText('Search prompts'), { target: { value: 'x' } })
            expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeEnabled()
        })
    })

    describe('empty states', () => {
        it('invites the first share when the library is empty', async () => {
            fetchMock.mockResolvedValue(listRes([], 0, {}))
            render(<PromptsClient />)
            expect(await screen.findByText('No prompts yet.')).toBeInTheDocument()
            expect(screen.getByText('Be the first to share a prompt that works.')).toBeInTheDocument()
        })

        it('the empty-state button opens the share modal', async () => {
            fetchMock.mockResolvedValue(listRes([], 0, {}))
            render(<PromptsClient />)
            await screen.findByText('No prompts yet.')
            const buttons = screen.getAllByRole('button', { name: 'Share a prompt' })
            fireEvent.click(buttons[buttons.length - 1])
            expect(await screen.findByRole('dialog', { name: 'Share a prompt' })).toBeInTheDocument()
        })

        it('shows the no-match state when filters hide everything, and can reset', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')

            fetchMock.mockResolvedValue(listRes([], 0))
            fireEvent.click(screen.getByRole('button', { name: /^Career/ }))

            expect(await screen.findByText('Nothing matches — yet.')).toBeInTheDocument()
            expect(screen.queryByText('No prompts yet.')).not.toBeInTheDocument()

            fetchMock.mockResolvedValue(listRes([prompt()], 1))
            fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
            expect(await screen.findByRole('heading', { name: 'Senior code review' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /^Career/ })).toHaveAttribute('aria-pressed', 'false')
        })
    })

    describe('pagination', () => {
        it('hides Load more when everything is loaded', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            expect(screen.queryByRole('button', { name: 'Load more prompts' })).not.toBeInTheDocument()
        })

        it('loads the next page using skip and appends without duplicates', async () => {
            fetchMock
                .mockResolvedValueOnce(listRes([prompt({ id: 'a', title: 'First' })], 3))
                .mockResolvedValueOnce(listRes([prompt({ id: 'a', title: 'First' }), prompt({ id: 'b', title: 'Second' })], 3))
            render(<PromptsClient />)
            await screen.findByRole('heading', { name: 'First' })

            fireEvent.click(screen.getByRole('button', { name: 'Load more prompts' }))

            await screen.findByRole('heading', { name: 'Second' })
            expect(paramsOfCall(fetchMock, 1).get('skip')).toBe('1')
            expect(screen.getAllByRole('heading', { name: 'First' })).toHaveLength(1)
        })

        it('keeps the active filters when loading more', async () => {
            fetchMock.mockResolvedValue(listRes([prompt({ id: 'a' })], 3))
            render(<PromptsClient />)
            await screen.findByRole('heading', { name: 'Senior code review' })
            fireEvent.click(screen.getByRole('button', { name: /^Programming/ }))
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            await screen.findByRole('button', { name: 'Load more prompts' })

            fireEvent.click(screen.getByRole('button', { name: 'Load more prompts' }))
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
            expect(lastParams(fetchMock).get('category')).toBe('programming')
        })

        it('shows progress on the button while loading more', async () => {
            fetchMock.mockResolvedValueOnce(listRes([prompt({ id: 'a' })], 3))
            render(<PromptsClient />)
            await screen.findByRole('heading', { name: 'Senior code review' })
            fetchMock.mockReturnValueOnce(new Promise(() => {}))

            fireEvent.click(screen.getByRole('button', { name: 'Load more prompts' }))
            const btn = await screen.findByRole('button', { name: 'Loading…' })
            expect(btn).toBeDisabled()
        })
    })

    describe('errors', () => {
        it('shows an error banner when the request fails', async () => {
            fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
            render(<PromptsClient />)
            expect(await screen.findByText('Failed to load prompts')).toBeInTheDocument()
        })

        it('shows an error banner when fetch rejects', async () => {
            fetchMock.mockRejectedValue(new Error('offline'))
            render(<PromptsClient />)
            expect(await screen.findByText('offline')).toBeInTheDocument()
        })

        it('shows an error banner when loading more fails', async () => {
            fetchMock.mockResolvedValueOnce(listRes([prompt({ id: 'a' })], 3))
            render(<PromptsClient />)
            await screen.findByRole('heading', { name: 'Senior code review' })
            fetchMock.mockRejectedValueOnce(new Error('page 2 failed'))

            fireEvent.click(screen.getByRole('button', { name: 'Load more prompts' }))
            expect(await screen.findByText('page 2 failed')).toBeInTheDocument()
        })
    })

    describe('share a prompt', () => {
        const openModal = async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            fireEvent.click(screen.getByRole('button', { name: 'Share a prompt' }))
            return screen.findByRole('dialog', { name: 'Share a prompt' })
        }

        it('opens the modal from the hero button', async () => {
            const dialog = await openModal()
            expect(within(dialog).getByText('Use [brackets] for the parts people should fill in themselves.')).toBeInTheDocument()
        })

        it('closes the modal on Cancel', async () => {
            const dialog = await openModal()
            fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        })

        it('refetches the list after a successful share and clears filters', async () => {
            render(<PromptsClient />)
            await screen.findByText('2 prompts')
            // grab the sidebar pill now — the modal renders its own "Images" button
            const imagesPill = screen.getByRole('button', { name: /^Images/ })
            fireEvent.click(imagesPill)
            await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

            fireEvent.click(screen.getByRole('button', { name: 'Share a prompt' }))
            const dialog = await screen.findByRole('dialog')

            fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ prompt: prompt({ id: 'new' }) }) })
            fetchMock.mockResolvedValue(listRes([prompt({ id: 'new', title: 'Freshly shared' })], 1))

            fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Freshly shared' } })
            fireEvent.change(within(dialog).getByLabelText('Prompt'), {
                target: { value: 'A brand new prompt with [placeholders] in it.' },
            })
            fireEvent.click(within(dialog).getByRole('button', { name: 'Share prompt' }))

            expect(await screen.findByRole('heading', { name: 'Freshly shared' })).toBeInTheDocument()
            expect(imagesPill).toHaveAttribute('aria-pressed', 'false')
            expect(lastParams(fetchMock).has('category')).toBe(false)
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        })

        it('does not refetch when sharing fails', async () => {
            const dialog = await openModal()
            const callsBefore = fetchMock.mock.calls.length
            fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Failed to share prompt' }) })

            fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Freshly shared' } })
            fireEvent.change(within(dialog).getByLabelText('Prompt'), {
                target: { value: 'A brand new prompt with [placeholders] in it.' },
            })
            fireEvent.click(within(dialog).getByRole('button', { name: 'Share prompt' }))

            expect(await within(dialog).findByRole('alert')).toHaveTextContent('Failed to share prompt')
            expect(fetchMock.mock.calls.length).toBe(callsBefore + 1) // only the POST
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })
})
