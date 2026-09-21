import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ShareMenu } from './share-menu'

const POST_URL = 'https://example.com/jobs/senior-backend-developer'
const POST_TITLE = 'Senior Backend Developer'

function renderMenu(overrides: Partial<Parameters<typeof ShareMenu>[0]> = {}) {
    return render(
        <ShareMenu url={POST_URL} title={POST_TITLE} subtitle="Acme Corp" label="Share job" {...overrides} />
    )
}

const writeText = vi.fn()

beforeEach(() => {
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
    })
})

afterEach(() => {
    cleanup()
})

describe('ShareMenu', () => {
    it('renders a labelled share trigger and keeps the menu closed initially', () => {
        renderMenu()
        expect(screen.getByRole('button', { name: 'Share job' })).toBeInTheDocument()
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('exposes the trigger state to assistive tech', () => {
        renderMenu()
        const trigger = screen.getByRole('button', { name: 'Share job' })
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
        expect(trigger).toHaveAttribute('aria-expanded', 'false')

        fireEvent.click(trigger)
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('opens the menu with LinkedIn, WhatsApp, Facebook, X and Copy link options', () => {
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))

        const menu = screen.getByRole('menu')
        expect(menu).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via LinkedIn' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via WhatsApp' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via Facebook' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Share via X' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument()
    })

    it('links each social option to the right share URL in a new tab', () => {
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))

        const linkedin = screen.getByRole('menuitem', { name: 'Share via LinkedIn' })
        expect(linkedin).toHaveAttribute(
            'href',
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(POST_URL)}`
        )
        expect(linkedin).toHaveAttribute('target', '_blank')
        expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer')

        const whatsapp = screen.getByRole('menuitem', { name: 'Share via WhatsApp' })
        expect(whatsapp).toHaveAttribute(
            'href',
            `https://wa.me/?text=${encodeURIComponent(`${POST_TITLE} — Acme Corp ${POST_URL}`)}`
        )

        const facebook = screen.getByRole('menuitem', { name: 'Share via Facebook' })
        expect(facebook).toHaveAttribute(
            'href',
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(POST_URL)}`
        )

        const x = screen.getByRole('menuitem', { name: 'Share via X' })
        expect(x).toHaveAttribute(
            'href',
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `${POST_TITLE} — Acme Corp`
            )}&url=${encodeURIComponent(POST_URL)}`
        )
    })

    it('copies the post link and shows confirmation feedback', async () => {
        writeText.mockResolvedValue(undefined)
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))
        fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))

        expect(await screen.findByText('Copied!')).toBeInTheDocument()
        expect(writeText).toHaveBeenCalledWith(POST_URL)
    })

    it('closes the menu when Escape is pressed', async () => {
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))
        expect(screen.getByRole('menu')).toBeInTheDocument()

        fireEvent.keyDown(document, { key: 'Escape' })
        // AnimatePresence keeps the node mounted until its exit animation
        // finishes, so wait for the removal rather than asserting it sync.
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    })

    it('closes the menu when clicking outside of it', async () => {
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))
        expect(screen.getByRole('menu')).toBeInTheDocument()

        fireEvent.pointerDown(document.body)
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    })

    it('stays open when a click lands inside the menu itself', () => {
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))

        fireEvent.pointerDown(screen.getByRole('menu'))
        expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('reopening the menu resets the copied feedback', async () => {
        writeText.mockResolvedValue(undefined)
        renderMenu()
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))
        fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
        expect(await screen.findByText('Copied!')).toBeInTheDocument()

        // Close with Escape before the 1.6s auto-close fires; the pending
        // timer must be cleared, not linger into the reopened menu.
        fireEvent.keyDown(document, { key: 'Escape' })
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))
        expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument()
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    })

    it('works without a subtitle (title-only share text)', () => {
        renderMenu({ subtitle: null })
        fireEvent.click(screen.getByRole('button', { name: 'Share job' }))

        expect(screen.getByRole('menuitem', { name: 'Share via WhatsApp' })).toHaveAttribute(
            'href',
            `https://wa.me/?text=${encodeURIComponent(`${POST_TITLE} ${POST_URL}`)}`
        )
    })
})
