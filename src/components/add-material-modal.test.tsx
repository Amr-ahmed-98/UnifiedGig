import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddMaterialModal } from './add-material-modal'
import type { LearningMaterial } from '@/types/material'

const CREATED: LearningMaterial = {
    id: 'new-1',
    field: 'networking',
    title: 'CCNA full course',
    url: 'https://example.com/ccna',
    type: 'course',
    description: null,
    createdAt: new Date().toISOString(),
}

function jsonRes(body: unknown, ok = true, status = 200) {
    return { ok, status, json: async () => body }
}

function setup(props: Partial<React.ComponentProps<typeof AddMaterialModal>> = {}) {
    const onClose = vi.fn()
    const onAdded = vi.fn()
    const utils = render(
        <AddMaterialModal
            open
            fieldSlug="networking"
            fieldName="Networking"
            onClose={onClose}
            onAdded={onAdded}
            {...props}
        />
    )
    return { onClose, onAdded, ...utils }
}

function fill(link: string, title: string) {
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: link } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Add material' }))

describe('AddMaterialModal', () => {
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

    it('renders an accessible dialog naming the field', () => {
        setup()
        expect(screen.getByRole('dialog', { name: 'Add material' })).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByText('Share a link that helps people learn Networking.')).toBeInTheDocument()
    })

    it('shows all six types with Course selected by default', () => {
        setup()
        for (const label of ['Course', 'Video', 'Article', 'Docs', 'Book', 'Repo']) {
            expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
        }
        expect(screen.getByRole('button', { name: 'Course' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Video' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('selecting a type moves the pressed state', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: 'Video' }))
        expect(screen.getByRole('button', { name: 'Video' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Course' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('marks the description as optional', () => {
        setup()
        expect(screen.getByText('Optional')).toBeInTheDocument()
    })

    it('focuses the link input on open', async () => {
        setup()
        await waitFor(() => expect(screen.getByLabelText('Link')).toHaveFocus())
    })

    it('locks body scroll while open and restores it after close', () => {
        const { rerender } = setup()
        expect(document.body.style.overflow).toBe('hidden')
        rerender(
            <AddMaterialModal open={false} fieldSlug="networking" fieldName="Networking" onClose={() => {}} onAdded={() => {}} />
        )
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
        it('rejects an invalid link without calling the API', () => {
            setup()
            fill('not-a-link', 'Title')
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link starting with https://')
            expect(fetch).not.toHaveBeenCalled()
        })

        it('rejects a javascript: link', () => {
            setup()
            fill('javascript:alert(1)', 'Title')
            submit()
            expect(screen.getByRole('alert')).toBeInTheDocument()
            expect(fetch).not.toHaveBeenCalled()
        })

        it('rejects a blank title', () => {
            setup()
            fill('https://example.com', '   ')
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent('Add a title')
            expect(fetch).not.toHaveBeenCalled()
        })
    })

    describe('submitting', () => {
        it('POSTs the trimmed payload for the current field', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ material: CREATED }) as never)
            setup()
            fill('  https://example.com/ccna ', '  CCNA full course ')
            fireEvent.click(screen.getByRole('button', { name: 'Video' }))
            fireEvent.change(screen.getByLabelText(/why it's useful/i), { target: { value: '  Great labs  ' } })
            submit()

            await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
            const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
            expect(url).toBe('/api/materials')
            expect(init.method).toBe('POST')
            expect(JSON.parse(init.body as string)).toEqual({
                field: 'networking',
                url: 'https://example.com/ccna',
                title: 'CCNA full course',
                type: 'video',
                description: 'Great labs',
            })
        })

        it('sends description as null when left blank', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ material: CREATED }) as never)
            setup()
            fill('https://example.com/ccna', 'CCNA')
            submit()
            await waitFor(() => expect(fetch).toHaveBeenCalled())
            const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
            expect(JSON.parse(init.body as string).description).toBeNull()
        })

        it('calls onAdded then onClose on success', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ material: CREATED }) as never)
            const { onAdded, onClose } = setup()
            fill('https://example.com/ccna', 'CCNA')
            submit()
            await waitFor(() => expect(onAdded).toHaveBeenCalledWith(CREATED))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('shows the server error and stays open on failure', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ error: 'Title max 140 characters' }, false, 400) as never)
            const { onAdded, onClose } = setup()
            fill('https://example.com/ccna', 'CCNA')
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('Title max 140 characters')
            expect(onAdded).not.toHaveBeenCalled()
            expect(onClose).not.toHaveBeenCalled()
        })

        it('shows a fallback error when the request itself fails', async () => {
            vi.mocked(fetch).mockRejectedValue('boom')
            setup()
            fill('https://example.com/ccna', 'CCNA')
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('Failed to add material')
        })

        it('disables the button and shows progress while submitting', async () => {
            let resolve!: (v: unknown) => void
            vi.mocked(fetch).mockReturnValue(new Promise((r) => (resolve = r)) as never)
            setup()
            fill('https://example.com/ccna', 'CCNA')
            submit()

            const btn = await screen.findByRole('button', { name: 'Adding…' })
            expect(btn).toBeDisabled()

            resolve(jsonRes({ material: CREATED }))
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Adding…' })).not.toBeInTheDocument())
        })
    })

    it('resets the form when re-opened', () => {
        const { rerender } = setup()
        fill('https://example.com/ccna', 'CCNA')
        fireEvent.click(screen.getByRole('button', { name: 'Docs' }))

        const props = { fieldSlug: 'networking', fieldName: 'Networking', onClose: () => {}, onAdded: () => {} }
        rerender(<AddMaterialModal open={false} {...props} />)
        rerender(<AddMaterialModal open {...props} />)

        expect(screen.getByLabelText('Link')).toHaveValue('')
        expect(screen.getByLabelText('Title')).toHaveValue('')
        expect(screen.getByRole('button', { name: 'Course' })).toHaveAttribute('aria-pressed', 'true')
    })
})
