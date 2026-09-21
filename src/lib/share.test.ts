import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildShareLinks, copyLinkToClipboard } from './share'

const POST_URL = 'https://example.com/jobs/senior-backend-developer'
const POST_TEXT = 'Senior Backend Developer — Acme Corp'

describe('buildShareLinks', () => {
    it('builds a LinkedIn share-offsite URL with the encoded post url', () => {
        const links = buildShareLinks(POST_URL, POST_TEXT)
        expect(links.linkedin).toBe(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(POST_URL)}`
        )
    })

    it('builds a WhatsApp click-to-chat URL with text and url combined', () => {
        const links = buildShareLinks(POST_URL, POST_TEXT)
        expect(links.whatsapp).toBe(
            `https://wa.me/?text=${encodeURIComponent(`${POST_TEXT} ${POST_URL}`)}`
        )
    })

    it('builds a WhatsApp URL from just the url when no text is given', () => {
        const links = buildShareLinks(POST_URL)
        expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(POST_URL)}`)
    })

    it('builds a Facebook sharer URL with the encoded post url', () => {
        const links = buildShareLinks(POST_URL, POST_TEXT)
        expect(links.facebook).toBe(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(POST_URL)}`
        )
    })

    it('builds an X intent URL with separate encoded text and url params', () => {
        const links = buildShareLinks(POST_URL, POST_TEXT)
        expect(links.x).toBe(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                POST_TEXT
            )}&url=${encodeURIComponent(POST_URL)}`
        )
    })

    it('leaves the X text param empty when no text is provided', () => {
        const links = buildShareLinks(POST_URL)
        expect(links.x).toBe(
            `https://twitter.com/intent/tweet?text=&url=${encodeURIComponent(POST_URL)}`
        )
    })

    it('encodes urls with query strings safely', () => {
        const urlWithParams = 'https://example.com/job?id=42&ref=feed'
        const links = buildShareLinks(urlWithParams, 'A job')
        expect(links.linkedin).toContain(`url=${encodeURIComponent(urlWithParams)}`)
        expect(links.facebook).toContain(`u=${encodeURIComponent(urlWithParams)}`)
    })
})

describe('copyLinkToClipboard', () => {
    const writeText = vi.fn()

    beforeEach(() => {
        writeText.mockReset()
        // jsdom ships without a clipboard implementation
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        })
    })

    it('copies via the async Clipboard API and resolves true', async () => {
        writeText.mockResolvedValue(undefined)
        await expect(copyLinkToClipboard(POST_URL)).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledWith(POST_URL)
    })

    it('falls back to the legacy execCommand path when the Clipboard API throws', async () => {
        writeText.mockRejectedValue(new Error('not allowed'))
        const execCommand = vi.fn(() => true)
        document.execCommand = execCommand as unknown as typeof document.execCommand

        await expect(copyLinkToClipboard(POST_URL)).resolves.toBe(true)
        expect(execCommand).toHaveBeenCalledWith('copy')
    })

    it('resolves false when every copy strategy fails', async () => {
        writeText.mockRejectedValue(new Error('not allowed'))
        document.execCommand = (() => {
            throw new Error('unsupported')
        }) as unknown as typeof document.execCommand

        await expect(copyLinkToClipboard(POST_URL)).resolves.toBe(false)
    })
})
