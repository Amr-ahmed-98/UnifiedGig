import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PromptCard } from './prompt-card'
import type { Prompt } from '@/types/prompt'

function prompt(overrides: Partial<Prompt> = {}): Prompt {
    return {
        id: 'p1',
        category: 'programming',
        title: 'Senior code review',
        body: 'Act as a senior [language] engineer. Review this code: [paste code]',
        tools: ['ChatGPT', 'Claude', 'Gemini'],
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

function stubClipboard(writeText: (t: string) => Promise<void>) {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('PromptCard', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
        Reflect.deleteProperty(document, 'execCommand')
    })

    describe('content', () => {
        it('shows the title as a heading and the category label', () => {
            render(<PromptCard prompt={prompt()} index={0} />)
            expect(screen.getByRole('heading', { name: 'Senior code review' })).toBeInTheDocument()
            expect(screen.getByText('Programming')).toBeInTheDocument()
        })

        it.each([
            ['programming', 'Programming'],
            ['images', 'Images'],
            ['video', 'Video'],
            ['writing', 'Writing'],
            ['career', 'Career'],
        ] as const)('renders the %s category label', (category, label) => {
            render(<PromptCard prompt={prompt({ category })} index={0} />)
            expect(screen.getByText(label)).toBeInTheDocument()
        })

        it('renders the full prompt text', () => {
            render(<PromptCard prompt={prompt()} index={0} />)
            expect(screen.getByText('[language]').parentElement).toHaveTextContent(
                'Act as a senior [language] engineer. Review this code: [paste code]'
            )
        })

        it('highlights each [bracketed] placeholder but not the surrounding text', () => {
            render(<PromptCard prompt={prompt()} index={0} />)
            expect(screen.getByText('[language]')).toHaveClass('bg-lime/20')
            expect(screen.getByText('[paste code]')).toHaveClass('bg-lime/20')
            expect(screen.getByText('Act as a senior')).not.toHaveClass('bg-lime/20')
        })

        it('keeps line breaks in multi-line prompts', () => {
            const { container } = render(<PromptCard prompt={prompt({ body: 'Line one\n\nLine two' })} index={0} />)
            expect(container.querySelector('p.whitespace-pre-wrap')).toBeInTheDocument()
            expect(container.querySelector('p.whitespace-pre-wrap')?.textContent).toBe('Line one\n\nLine two')
        })
    })

    describe('works with', () => {
        it('lists every tool', () => {
            render(<PromptCard prompt={prompt()} index={0} />)
            expect(screen.getByText('Works with')).toBeInTheDocument()
            for (const t of ['ChatGPT', 'Claude', 'Gemini']) expect(screen.getByText(t)).toBeInTheDocument()
        })

        it('omits the footer when no tools were given', () => {
            render(<PromptCard prompt={prompt({ tools: [] })} index={0} />)
            expect(screen.queryByText('Works with')).not.toBeInTheDocument()
        })
    })

    describe('copy', () => {
        beforeEach(() => {
            stubClipboard(vi.fn().mockResolvedValue(undefined))
        })

        it('has an accessible copy button naming the prompt', () => {
            render(<PromptCard prompt={prompt()} index={0} />)
            const btn = screen.getByRole('button', { name: 'Copy prompt: Senior code review' })
            expect(btn).toHaveTextContent('Copy')
        })

        it('writes the raw prompt text (brackets included) to the clipboard', async () => {
            const writeText = vi.fn().mockResolvedValue(undefined)
            stubClipboard(writeText)
            render(<PromptCard prompt={prompt()} index={0} />)

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Copy prompt/ }))
            })

            expect(writeText).toHaveBeenCalledWith('Act as a senior [language] engineer. Review this code: [paste code]')
        })

        it('shows Copied feedback, then goes back to Copy after 2 seconds', async () => {
            vi.useFakeTimers()
            render(<PromptCard prompt={prompt()} index={0} />)

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Copy prompt/ }))
            })
            expect(screen.getByRole('button', { name: 'Prompt copied' })).toHaveTextContent('Copied')

            act(() => {
                vi.advanceTimersByTime(2000)
            })
            expect(screen.getByRole('button', { name: /^Copy prompt/ })).toHaveTextContent('Copy')
            expect(screen.queryByText('Copied')).not.toBeInTheDocument()
        })

        it('restarts the reset timer when copied twice quickly', async () => {
            vi.useFakeTimers()
            render(<PromptCard prompt={prompt()} index={0} />)
            const click = async () =>
                act(async () => {
                    fireEvent.click(screen.getByRole('button'))
                })

            await click()
            act(() => {
                vi.advanceTimersByTime(1500)
            })
            await click()
            act(() => {
                vi.advanceTimersByTime(1500)
            })
            expect(screen.getByText('Copied')).toBeInTheDocument()

            act(() => {
                vi.advanceTimersByTime(600)
            })
            expect(screen.queryByText('Copied')).not.toBeInTheDocument()
        })

        it('falls back to execCommand when the clipboard API rejects', async () => {
            stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
            const exec = vi.fn().mockReturnValue(true)
            Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
            render(<PromptCard prompt={prompt()} index={0} />)

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Copy prompt/ }))
            })

            expect(exec).toHaveBeenCalledWith('copy')
            expect(screen.getByText('Copied')).toBeInTheDocument()
            // temporary textarea is cleaned up
            expect(document.querySelector('textarea')).not.toBeInTheDocument()
        })

        it('does not claim success when both copy methods fail', async () => {
            stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
            Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(false), configurable: true })
            render(<PromptCard prompt={prompt()} index={0} />)

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Copy prompt/ }))
            })

            expect(screen.queryByText('Copied')).not.toBeInTheDocument()
            expect(screen.getByRole('button', { name: /^Copy prompt/ })).toBeInTheDocument()
        })

        it('does not update state after unmount', async () => {
            vi.useFakeTimers()
            const err = vi.spyOn(console, 'error').mockImplementation(() => {})
            const { unmount } = render(<PromptCard prompt={prompt()} index={0} />)
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /^Copy prompt/ }))
            })
            unmount()
            act(() => {
                vi.advanceTimersByTime(3000)
            })
            expect(err).not.toHaveBeenCalled()
        })
    })
})
