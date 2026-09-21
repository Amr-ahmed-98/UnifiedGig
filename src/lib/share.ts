/**
 * Share helpers for job posts, freelance projects and social job posts.
 *
 * "Share" sends the listing's own UnifiedGig page URL (see `buildShareUrl`
 * in `@/lib/site`) plus a one-line context message to one of the major social
 * networks, or copies it to the clipboard for pasting anywhere else. The
 * shared link unfurls with the generated per-listing OG image and lands the
 * reader on UnifiedGig, which links out to the original post from there.
 */

export interface ShareTargets {
    /** LinkedIn "share offsite" dialog — takes the url only. */
    linkedin: string
    /** WhatsApp click-to-chat — takes a single combined text+url message. */
    whatsapp: string
    /** Facebook sharer dialog — takes the url only. */
    facebook: string
    /** X (Twitter) web intent — takes a text and a url. */
    x: string
}

/** Builds the "share this post" deep link for each supported network. */
export function buildShareLinks(url: string, text?: string): ShareTargets {
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text ?? '')
    const message = text ? `${text} ${url}` : url

    return {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    }
}

/**
 * Copies a link to the clipboard. Prefers the async Clipboard API and falls
 * back to the legacy execCommand path for browsers or non-secure contexts
 * where navigator.clipboard is unavailable.
 *
 * @returns true when the copy actually happened.
 */
export async function copyLinkToClipboard(url: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url)
            return true
        }
    } catch {
        // fall through to the legacy path
    }

    try {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
    } catch {
        return false
    }
}
