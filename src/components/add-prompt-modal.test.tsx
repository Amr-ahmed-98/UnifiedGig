import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddPromptModal } from './add-prompt-modal'
import type { Prompt } from '@/types/prompt'

const CREATED: Prompt = {
    id: 'new-1',
    category: 'programming',
    title: 'Write unit tests',
    body: 'Write unit tests for [function] using [framework].',
    tools: [],
    createdAt: new Date().toISOString(),
}

const BODY = 'Write unit tests for [function] using [framework].'

function jsonRes(body: unknown, ok = true, status = 200) {
    return { ok, status, json: async () => body }
}

function setup(props: Partial<React.ComponentProps<typeof AddPromptModal>> = {}) {
    const onClose = vi.fn()
    const onAdded = vi.fn()
    const utils = render(<AddPromptModal open onClose={onClose} onAdded={onAdded} {...props} />)
    return { onClose, onAdded, ...utils }
}

function fill(title: string, body: string) {
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } })
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: body } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Share prompt' }))

describe('AddPromptModal', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        document.body.style.overflow = ''
    })

    it('renders nothing when closed', () => {
        setup({ open: false })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders an accessible dialog with the bracket hint', () => {
        setup()
        expect(screen.getByRole('dialog', { name: 'Share a prompt' })).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByText('Use [brackets] for the parts people should fill in themselves.')).toBeInTheDocument()
    })

    it('shows the five categories with Programming selected by default', () => {
        setup()
        for (const label of ['Programming', 'Images', 'Video', 'Writing', 'Career']) {
            expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
        }
        expect(screen.getByRole('button', { name: 'Programming' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Images' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('selecting a category moves the pressed state', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: 'Career' }))
        expect(screen.getByRole('button', { name: 'Career' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Programming' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the field placeholders and the comma hint', () => {
        setup()
        expect(screen.getByPlaceholderText('e.g. Write unit tests for my function')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Act as a… [paste your code]')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('ChatGPT, Claude, Midjourney')).toBeInTheDocument()
        expect(screen.getByText('Separate with commas')).toBeInTheDocument()
    })

    it('marks only "Works with" as optional', () => {
        setup()
        expect(screen.getAllByText('Optional')).toHaveLength(1)
    })

    it('counts prompt characters', () => {
        setup()
        expect(screen.getByText('0/2000')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'hello' } })
        expect(screen.getByText('5/2000')).toBeInTheDocument()
    })

    it('limits title and prompt length in the inputs', () => {
        setup()
        expect(screen.getByLabelText('Title')).toHaveAttribute('maxlength', '100')
        expect(screen.getByLabelText('Prompt')).toHaveAttribute('maxlength', '2000')
    })

    it('focuses the title input on open', async () => {
        setup()
        await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus())
    })

    it('locks body scroll while open and restores it after close', () => {
        const { rerender } = setup()
        expect(document.body.style.overflow).toBe('hidden')
        rerender(<AddPromptModal open={false} onClose={() => {}} onAdded={() => {}} />)
        expect(document.body.style.overflow).toBe('')
    })

    describe('closing', () => {
        it('closes on the X button', () => {
            const { onClose } = setup()
            fireEvent.click(screen.getByRole('button', { name: 'Close' }))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('closes on Cancel', () => {
            const { onClose } = setup()
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('closes on Escape', () => {
            const { onClose } = setup()
            fireEvent.keyDown(document, { key: 'Escape' })
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('ignores Escape while closed', () => {
            const { onClose } = setup({ open: false })
            fireEvent.keyDown(document, { key: 'Escape' })
            expect(onClose).not.toHaveBeenCalled()
        })
    })

    describe('validation', () => {
        it('rejects a blank title without calling the API', () => {
            setup()
            fill('   ', BODY)
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Add a title')
            expect(fetch).not.toHaveBeenCalled()
        })

        it('rejects a too-short title', () => {
            setup()
            fill('ab', BODY)
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Add a title')
            expect(fetch).not.toHaveBeenCalled()
        })

        it('rejects a prompt under 20 characters', () => {
            setup()
            fill('Unit tests', 'too short')
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Prompt needs at least 20 characters')
            expect(fetch).not.toHaveBeenCalled()
        })

        it('rejects a prompt that is only whitespace', () => {
            setup()
            fill('Unit tests', ' '.repeat(40))
            submit()
            expect(screen.getByRole('alert')).toBeInTheDocument()
            expect(fetch).not.toHaveBeenCalled()
        })

        it('checks the title before the prompt', () => {
            setup()
            fill('', '')
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Add a title')
        })
    })

    describe('submitting', () => {
        it('POSTs the trimmed payload with the chosen category', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ prompt: CREATED }) as never)
            setup()
            fireEvent.click(screen.getByRole('button', { name: 'Career' }))
            fill('  Write unit tests  ', `  ${BODY}  `)
            fireEvent.change(screen.getByLabelText('Works with'), { target: { value: ' chatgpt , Claude ' } })
            submit()

            await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
            const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
            expect(url).toBe('/api/prompts')
            expect(init.method).toBe('POST')
            expect(JSON.parse(init.body as string)).toEqual({
                category: 'career',
                title: 'Write unit tests',
                body: BODY,
                tools: ['ChatGPT', 'Claude'],
            })
        })

        it('sends an empty tools list when "Works with" is left blank', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ prompt: CREATED }) as never)
            setup()
            fill('Write unit tests', BODY)
            submit()
            await waitFor(() => expect(fetch).toHaveBeenCalled())
            const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
            expect(JSON.parse(init.body as string).tools).toEqual([])
        })

        it('dedupes tools and keeps unknown ones as typed', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ prompt: CREATED }) as never)
            setup()
            fill('Write unit tests', BODY)
            fireEvent.change(screen.getByLabelText('Works with'), { target: { value: 'claude, CLAUDE, My Tool' } })
            submit()
            await waitFor(() => expect(fetch).toHaveBeenCalled())
            const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
            expect(JSON.parse(init.body as string).tools).toEqual(['Claude', 'My Tool'])
        })

        it('calls onAdded then onClose on success', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ prompt: CREATED }) as never)
            const { onAdded, onClose } = setup()
            fill('Write unit tests', BODY)
            submit()
            await waitFor(() => expect(onAdded).toHaveBeenCalledWith(CREATED))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('shows the server error and stays open on failure', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ error: 'Title max 100 characters' }, false, 400) as never)
            const { onAdded, onClose } = setup()
            fill('Write unit tests', BODY)
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('Title max 100 characters')
            expect(onAdded).not.toHaveBeenCalled()
            expect(onClose).not.toHaveBeenCalled()
        })

        it('keeps what the user typed after a failure', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ error: 'Nope' }, false, 500) as never)
            setup()
            fill('Write unit tests', BODY)
            submit()
            await screen.findByRole('alert')
            expect(screen.getByLabelText('Title')).toHaveValue('Write unit tests')
            expect(screen.getByLabelText('Prompt')).toHaveValue(BODY)
        })

        it('shows a fallback error when the request itself fails', async () => {
            vi.mocked(fetch).mockRejectedValue('boom')
            setup()
            fill('Write unit tests', BODY)
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('Failed to share prompt')
        })

        it('clears an old error after a successful retry', async () => {
            vi.mocked(fetch)
                .mockResolvedValueOnce(jsonRes({ error: 'Nope' }, false, 500) as never)
                .mockResolvedValueOnce(jsonRes({ prompt: CREATED }) as never)
            const { onAdded } = setup()
            fill('Write unit tests', BODY)
            submit()
            await screen.findByRole('alert')
            submit()
            await waitFor(() => expect(onAdded).toHaveBeenCalled())
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        })

        it('disables the button and shows progress while submitting', async () => {
            let resolve!: (v: unknown) => void
            vi.mocked(fetch).mockReturnValue(new Promise((r) => (resolve = r)) as never)
            setup()
            fill('Write unit tests', BODY)
            submit()

            const btn = await screen.findByRole('button', { name: 'Sharing…' })
            expect(btn).toBeDisabled()

            resolve(jsonRes({ prompt: CREATED }))
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Sharing…' })).not.toBeInTheDocument())
        })
    })

    it('resets the form when re-opened', () => {
        const { rerender } = setup()
        fill('Write unit tests', BODY)
        fireEvent.change(screen.getByLabelText('Works with'), { target: { value: 'Claude' } })
        fireEvent.click(screen.getByRole('button', { name: 'Video' }))

        const props = { onClose: () => {}, onAdded: () => {} }
        rerender(<AddPromptModal open={false} {...props} />)
        rerender(<AddPromptModal open {...props} />)

        expect(screen.getByLabelText('Title')).toHaveValue('')
        expect(screen.getByLabelText('Prompt')).toHaveValue('')
        expect(screen.getByLabelText('Works with')).toHaveValue('')
        expect(screen.getByRole('button', { name: 'Programming' })).toHaveAttribute('aria-pressed', 'true')
    })
})
