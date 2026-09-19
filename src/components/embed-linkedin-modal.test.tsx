import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EmbedLinkedInModal } from './embed-linkedin-modal'
import type { SocialJobPost } from '@/types/socialJob'

const POST_URL = 'https://www.linkedin.com/posts/jane-doe_activity-7123456789'

const PREVIEW_OK = {
    preview: {
        title: 'Senior Frontend Engineer',
        authorName: 'Jane Doe',
        description: 'Fully remote role on our platform team.',
        salary: '$120k - $160k',
        location: 'Cairo',
        remote: true,
        imageUrl: 'https://media.licdn.com/og.jpg',
    },
    tags: ['Remote'],
    resolvedUrl: POST_URL,
}

const PREVIEW_SOFT_ERROR = {
    error: 'Could not read that post — fill the details in manually below.',
    preview: {
        title: 'Unknown',
        authorName: 'Unknown',
        description: null,
        imageUrl: null,
        salary: 'Unknown',
        location: 'Unknown',
        remote: false,
    },
    tags: [],
    resolvedUrl: POST_URL,
}

const CREATED_POST: SocialJobPost = {
    id: 'post-1',
    title: 'Senior Frontend Engineer',
    authorName: 'Jane Doe',
    authorTitle: null,
    authorImageUrl: null,
    description: 'Fully remote role on our platform team.',
    salary: '$120k - $160k',
    location: 'Cairo',
    remote: true,
    tags: ['Remote'],
    recruiterContact: null,
    imageUrl: 'https://media.licdn.com/og.jpg',
    url: POST_URL,
    source: 'linkedin',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
}

function jsonRes(body: unknown, ok = true, status = 200) {
    return { ok, status, json: async () => body }
}

/** Branching fetch stub: preview → POST /api/social-jobs/preview, submit → POST /api/social-jobs */
function stubFetch(handlers: { preview?: () => ReturnType<typeof jsonRes>; submit?: () => ReturnType<typeof jsonRes> }) {
    return vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/social-jobs/preview') {
            return handlers.preview ? handlers.preview() : jsonRes(PREVIEW_OK)
        }
        if (url === '/api/social-jobs') {
            return handlers.submit ? handlers.submit() : jsonRes({ post: CREATED_POST }, true, 201)
        }
        return jsonRes({ error: 'unexpected url' }, false, 404)
    })
}

function setup(props: { open?: boolean } = {}) {
    const onClose = vi.fn()
    const onEmbedded = vi.fn()
    const utils = render(
        <EmbedLinkedInModal open={props.open ?? true} onClose={onClose} onEmbedded={onEmbedded} />
    )
    return { ...utils, onClose, onEmbedded }
}

function urlInput() {
    return screen.getByLabelText('LinkedIn post URL') as HTMLInputElement
}

async function typeUrlAndAwaitPreview(url = POST_URL) {
    fireEvent.change(urlInput(), { target: { value: url } })
    await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
    })
}

beforeEach(() => {
    // The modal debounces its auto-preview at 600ms and animates with motion —
    // fake timers (with real time still ticking for RTL polling) keep it deterministic.
    vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('EmbedLinkedInModal', () => {
    it('renders nothing while closed', () => {
        setup({ open: false })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders the dialog with its heading when open', () => {
        setup()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Embed a LinkedIn Post' })).toBeInTheDocument()
    })

    it('closes on the Escape key', () => {
        const { onClose } = setup()
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes via the header X button', () => {
        const { onClose } = setup()
        fireEvent.click(screen.getByRole('button', { name: 'Close' }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes via the Cancel & Discard button', () => {
        const { onClose } = setup()
        fireEvent.click(screen.getByRole('button', { name: 'Cancel & Discard' }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes when the backdrop is clicked', () => {
        const { container, onClose } = setup()
        const backdrop = container.querySelector('.backdrop-blur-sm')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop as Element)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    describe('URL input hints', () => {
        it('flags a non-LinkedIn URL immediately', () => {
            setup()
            fireEvent.change(urlInput(), { target: { value: 'https://facebook.com/posts/1' } })
            expect(
                screen.getByText('Needs a linkedin.com/posts/..., /feed/update/... or lnkd.in link')
            ).toBeInTheDocument()
            expect(screen.queryByText('Valid LinkedIn URL detected')).not.toBeInTheDocument()
        })

        it('confirms a linkedin.com/posts URL', () => {
            setup()
            fireEvent.change(urlInput(), { target: { value: POST_URL } })
            expect(screen.getByText('Valid LinkedIn URL detected')).toBeInTheDocument()
        })

        it('confirms an lnkd.in share link (server resolves it later)', () => {
            setup()
            fireEvent.change(urlInput(), { target: { value: 'https://lnkd.in/p/ewrps2Px' } })
            expect(screen.getByText('Valid LinkedIn URL detected')).toBeInTheDocument()
        })

        it('shows no hint while the input is empty', () => {
            setup()
            expect(screen.queryByText('Valid LinkedIn URL detected')).not.toBeInTheDocument()
            expect(
                screen.queryByText('Needs a linkedin.com/posts/..., /feed/update/... or lnkd.in link')
            ).not.toBeInTheDocument()
        })
    })

    describe('auto-preview', () => {
        it('debounces the preview call — nothing before 600ms, exactly one call after', async () => {
            const fetchMock = stubFetch({})
            vi.stubGlobal('fetch', fetchMock)
            setup()

            fireEvent.change(urlInput(), { target: { value: POST_URL } })

            await act(async () => {
                await vi.advanceTimersByTimeAsync(300)
            })
            expect(fetchMock).not.toHaveBeenCalled()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(310)
            })
            expect(fetchMock).toHaveBeenCalledTimes(1)
            expect(fetchMock).toHaveBeenCalledWith('/api/social-jobs/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: POST_URL }),
            })
        })

        it('collapses several keystrokes into one debounced call', async () => {
            const fetchMock = stubFetch({})
            vi.stubGlobal('fetch', fetchMock)
            setup()

            fireEvent.change(urlInput(), { target: { value: 'https://www.linkedin.com' } })
            fireEvent.change(urlInput(), { target: { value: 'https://www.linkedin.com/posts' } })
            fireEvent.change(urlInput(), { target: { value: POST_URL } })

            await act(async () => {
                await vi.advanceTimersByTimeAsync(600)
            })
            expect(fetchMock).toHaveBeenCalledTimes(1)
        })

        it('does not call the API at all for a non-LinkedIn URL', async () => {
            const fetchMock = stubFetch({})
            vi.stubGlobal('fetch', fetchMock)
            setup()

            fireEvent.change(urlInput(), { target: { value: 'https://facebook.com/posts/1' } })
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1_000)
            })
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('fills the form from the preview and pre-selects detected tags', async () => {
            vi.stubGlobal('fetch', stubFetch({}))
            setup()

            await typeUrlAndAwaitPreview()

            expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(
                'Senior Frontend Engineer'
            )
            expect((screen.getByLabelText('Posted by') as HTMLInputElement).value).toBe('Jane Doe')
            expect((screen.getByLabelText('Salary / rate') as HTMLInputElement).value).toBe(
                '$120k - $160k'
            )
            expect((screen.getByLabelText('Location') as HTMLInputElement).value).toBe('Cairo')
            expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe(
                'Fully remote role on our platform team.'
            )
            expect(screen.getByLabelText('Remote', { selector: 'input[type="checkbox"]' })).toBeChecked()

            expect(screen.getByRole('button', { name: 'Remote' })).toHaveAttribute(
                'aria-pressed',
                'true'
            )
            expect(screen.getByRole('button', { name: 'AI/ML' })).toHaveAttribute(
                'aria-pressed',
                'false'
            )
        })

        it('soft preview error: shows the warning but still opens an editable shell', async () => {
            vi.stubGlobal('fetch', stubFetch({ preview: () => jsonRes(PREVIEW_SOFT_ERROR) }))
            setup()

            await typeUrlAndAwaitPreview()

            expect(
                screen.getByText('Could not read that post — fill the details in manually below.')
            ).toBeInTheDocument()
            // The shell is still usable: form is shown with "Unknown" values and Embed is enabled
            expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Unknown')
            expect(screen.getByRole('button', { name: 'Embed & Post Now' })).toBeEnabled()
        })

        it('hard preview failure: hides the form and disables Embed', async () => {
            vi.stubGlobal(
                'fetch',
                stubFetch({ preview: () => jsonRes({ error: 'Could not resolve that link' }, false, 502) })
            )
            setup()

            await typeUrlAndAwaitPreview()

            // NOTE (pins current behavior): the hard-failure message is kept in
            // previewError state but only rendered inside the hasPreview block —
            // which is closed on failure. The user just sees the form vanish and
            // the button lock. If you want the error surfaced, render the
            // previewError paragraph outside the hasPreview block in the modal.
            expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Embed & Post Now' })).toBeDisabled()
            expect(screen.queryByText('Could not resolve that link')).not.toBeInTheDocument()
        })
    })

    describe('submitting', () => {
        it('keeps Embed disabled until a usable preview has resolved', async () => {
            vi.stubGlobal('fetch', stubFetch({}))
            setup()

            const embed = screen.getByRole('button', { name: 'Embed & Post Now' })
            expect(embed).toBeDisabled()

            await typeUrlAndAwaitPreview()
            expect(embed).toBeEnabled()
        })

        it('refuses to submit without a title', async () => {
            const fetchMock = stubFetch({
                preview: () =>
                    jsonRes({ ...PREVIEW_OK, preview: { ...PREVIEW_OK.preview, title: '' } }),
            })
            vi.stubGlobal('fetch', fetchMock)
            setup()

            await typeUrlAndAwaitPreview()
            fireEvent.click(screen.getByRole('button', { name: 'Embed & Post Now' }))

            expect(screen.getByText('Add a title before embedding.')).toBeInTheDocument()
            expect(fetchMock).toHaveBeenCalledTimes(1) // only the preview call, no submit
        })

        it('submits the trimmed draft with empty strings nulled, and hands the post back', async () => {
            const fetchMock = stubFetch({})
            vi.stubGlobal('fetch', fetchMock)
            const { onClose, onEmbedded } = setup()

            await typeUrlAndAwaitPreview()

            // The user clears the author — an empty optional field must go out as null
            fireEvent.change(screen.getByLabelText('Posted by'), { target: { value: '   ' } })
            // And adds a recruiter contact
            fireEvent.change(screen.getByLabelText('Recruiter email / referral (optional)'), {
                target: { value: 'jane@acme.com' },
            })

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Embed & Post Now' }))
            })

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/social-jobs',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        url: POST_URL,
                        title: 'Senior Frontend Engineer',
                        authorName: null,
                        description: 'Fully remote role on our platform team.',
                        salary: '$120k - $160k',
                        location: 'Cairo',
                        remote: true,
                        imageUrl: 'https://media.licdn.com/og.jpg',
                        tags: ['Remote'],
                        recruiterContact: 'jane@acme.com',
                    }),
                })
            )
            expect(onEmbedded).toHaveBeenCalledWith(CREATED_POST)
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('shows the submit error and stays open when embedding fails', async () => {
            vi.stubGlobal(
                'fetch',
                stubFetch({
                    submit: () => jsonRes({ error: 'Failed to embed post' }, false, 500),
                })
            )
            const { onClose, onEmbedded } = setup()

            await typeUrlAndAwaitPreview()
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Embed & Post Now' }))
            })

            expect(screen.getByText('Failed to embed post')).toBeInTheDocument()
            expect(onEmbedded).not.toHaveBeenCalled()
            expect(onClose).not.toHaveBeenCalled()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('does not double-submit while an embed is in flight', async () => {
            let resolveSubmit: (v: ReturnType<typeof jsonRes>) => void
            const pending = new Promise((r) => {
                resolveSubmit = r as typeof r
            })
            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url === '/api/social-jobs/preview') return jsonRes(PREVIEW_OK)
                if (url === '/api/social-jobs') {
                    await pending
                    return jsonRes({ post: CREATED_POST }, true, 201)
                }
                return jsonRes({}, false, 404)
            })
            vi.stubGlobal('fetch', fetchMock)
            setup()

            await typeUrlAndAwaitPreview()
            const embed = screen.getByRole('button', { name: 'Embed & Post Now' })

            await act(async () => {
                fireEvent.click(embed)
            })
            expect(embed).toBeDisabled()
            expect(embed).toHaveTextContent('Embedding…')

            fireEvent.click(embed) // second click on a disabled button must not fire another submit

            await act(async () => {
                resolveSubmit!(jsonRes({ post: CREATED_POST }, true, 201))
                await vi.runAllTimersAsync()
            })
            expect(fetchMock).toHaveBeenCalledTimes(2) // preview + exactly one submit
        })
    })

    it('resets the whole form when reopened', async () => {
        vi.stubGlobal('fetch', stubFetch({}))
        const props = { onClose: vi.fn(), onEmbedded: vi.fn() }
        const { rerender } = render(<EmbedLinkedInModal open {...props} />)

        await typeUrlAndAwaitPreview()
        expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(
            'Senior Frontend Engineer'
        )

        await act(async () => {
            rerender(<EmbedLinkedInModal open={false} {...props} />)
            await vi.runAllTimersAsync()
        })
        await act(async () => {
            rerender(<EmbedLinkedInModal open {...props} />)
            await vi.runAllTimersAsync()
        })

        expect(urlInput().value).toBe('')
        expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    })
})
