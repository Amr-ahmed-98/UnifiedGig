import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddProfileModal } from './add-profile-modal'
import type { FollowProfile } from '@/types/profile'

const CREATED: FollowProfile = {
    id: 'n1', platform: 'linkedin', name: 'Jane Doe', url: 'https://linkedin.com/in/jane',
    headline: null, postsAbout: null, createdAt: new Date().toISOString(),
}
const jsonRes = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body })

function setup(open = true) {
    const onClose = vi.fn()
    const onAdded = vi.fn()
    const utils = render(<AddProfileModal open={open} onClose={onClose} onAdded={onAdded} />)
    return { onClose, onAdded, ...utils }
}
const fill = (link: string, name: string) => {
    fireEvent.change(screen.getByLabelText('Profile link'), { target: { value: link } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Add profile' }))

describe('AddProfileModal', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        document.body.style.overflow = ''
    })

    it('renders nothing when closed', () => {
        setup(false)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders the dialog with all fields and six platforms', () => {
        setup()
        expect(screen.getByRole('dialog', { name: 'Add a profile' })).toBeInTheDocument()
        expect(screen.getByText('Share someone who regularly posts jobs so others can follow them too.')).toBeInTheDocument()
        for (const p of ['LinkedIn', 'Facebook', 'X', 'Instagram', 'Telegram', 'Other']) {
            expect(screen.getByRole('button', { name: p })).toBeInTheDocument()
        }
        expect(screen.getByRole('button', { name: 'LinkedIn' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getAllByText('Optional')).toHaveLength(2)
        expect(screen.getByLabelText('Headline')).toBeInTheDocument()
        expect(screen.getByLabelText('Usually posts about')).toBeInTheDocument()
    })

    it('swaps the link placeholder with the selected platform', () => {
        setup()
        expect(screen.getByLabelText('Profile link')).toHaveAttribute('placeholder', 'https://linkedin.com/in/…')
        fireEvent.click(screen.getByRole('button', { name: 'Telegram' }))
        expect(screen.getByLabelText('Profile link')).toHaveAttribute('placeholder', 'https://t.me/…')
        expect(screen.getByRole('button', { name: 'Telegram' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'LinkedIn' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('focuses the link input and locks body scroll on open', async () => {
        setup()
        await waitFor(() => expect(screen.getByLabelText('Profile link')).toHaveFocus())
        expect(document.body.style.overflow).toBe('hidden')
    })

    it('closes via X, Cancel and Escape', () => {
        const { onClose } = setup()
        fireEvent.click(screen.getByRole('button', { name: 'Close' }))
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(3)
    })

    describe('validation', () => {
        it.each([
            ['an invalid link', 'nope', 'Jane', 'Enter a valid link starting with https://'],
            ['a link on the wrong platform', 'https://x.com/jane', 'Jane', `That link doesn't look like a LinkedIn link — pick "Other" if it's right`],
            ['a blank name', 'https://linkedin.com/in/jane', '   ', 'Add a name'],
        ])('rejects %s without calling the API', (_n, link, name, message) => {
            setup()
            fill(link, name)
            submit()
            expect(screen.getByRole('alert')).toHaveTextContent(message)
            expect(fetch).not.toHaveBeenCalled()
        })

        it('allows any host once "Other" is selected', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ profile: CREATED }) as never)
            setup()
            fireEvent.click(screen.getByRole('button', { name: 'Other' }))
            fill('https://jobs.example.org/team', 'Jane')
            submit()
            await waitFor(() => expect(fetch).toHaveBeenCalled())
        })
    })

    describe('submitting', () => {
        it('POSTs the trimmed payload', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ profile: CREATED }) as never)
            setup()
            fireEvent.click(screen.getByRole('button', { name: 'X' }))
            fill(' https://x.com/jane ', ' Jane Doe ')
            fireEvent.change(screen.getByLabelText('Headline'), { target: { value: ' Recruiter ' } })
            fireEvent.change(screen.getByLabelText('Usually posts about'), { target: { value: ' Remote roles ' } })
            submit()

            await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
            const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
            expect(url).toBe('/api/profiles')
            expect(init.method).toBe('POST')
            expect(JSON.parse(init.body as string)).toEqual({
                platform: 'x', url: 'https://x.com/jane', name: 'Jane Doe', headline: 'Recruiter', postsAbout: 'Remote roles',
            })
        })

        it('sends null for blank optional fields', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ profile: CREATED }) as never)
            setup()
            fill('https://linkedin.com/in/jane', 'Jane')
            submit()
            await waitFor(() => expect(fetch).toHaveBeenCalled())
            const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
            expect(body.headline).toBeNull()
            expect(body.postsAbout).toBeNull()
        })

        it('calls onAdded and onClose on success', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ profile: CREATED }) as never)
            const { onAdded, onClose } = setup()
            fill('https://linkedin.com/in/jane', 'Jane')
            submit()
            await waitFor(() => expect(onAdded).toHaveBeenCalledWith(CREATED))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('shows the server error (e.g. duplicate) and stays open', async () => {
            vi.mocked(fetch).mockResolvedValue(jsonRes({ error: 'That profile is already listed' }, false) as never)
            const { onAdded, onClose } = setup()
            fill('https://linkedin.com/in/jane', 'Jane')
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('That profile is already listed')
            expect(onAdded).not.toHaveBeenCalled()
            expect(onClose).not.toHaveBeenCalled()
        })

        it('falls back to a generic error when the request fails', async () => {
            vi.mocked(fetch).mockRejectedValue('boom')
            setup()
            fill('https://linkedin.com/in/jane', 'Jane')
            submit()
            expect(await screen.findByRole('alert')).toHaveTextContent('Failed to add profile')
        })

        it('disables the button while submitting', async () => {
            let resolve!: (v: unknown) => void
            vi.mocked(fetch).mockReturnValue(new Promise((r) => (resolve = r)) as never)
            setup()
            fill('https://linkedin.com/in/jane', 'Jane')
            submit()
            expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled()
            resolve(jsonRes({ profile: CREATED }))
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Adding…' })).not.toBeInTheDocument())
        })
    })

    it('resets the form when reopened', () => {
        const { rerender } = setup()
        fill('https://linkedin.com/in/jane', 'Jane')
        fireEvent.click(screen.getByRole('button', { name: 'Telegram' }))
        rerender(<AddProfileModal open={false} onClose={() => {}} onAdded={() => {}} />)
        rerender(<AddProfileModal open onClose={() => {}} onAdded={() => {}} />)
        expect(screen.getByLabelText('Profile link')).toHaveValue('')
        expect(screen.getByLabelText('Name')).toHaveValue('')
        expect(screen.getByRole('button', { name: 'LinkedIn' })).toHaveAttribute('aria-pressed', 'true')
    })
})
