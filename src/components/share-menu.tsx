'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Link2, Share2 } from 'lucide-react'
import { buildShareLinks, copyLinkToClipboard } from '@/lib/share'
import { FacebookIcon, LinkedInIcon, WhatsAppIcon, XIcon } from '@/components/brand-icons'

export interface ShareMenuProps {
    /** The URL that gets shared — the listing's own page on this site,
     *  built with `buildShareUrl(kind, id)` from `@/lib/site`. */
    url: string
    /** Primary line of the share message (usually the listing title). */
    title: string
    /** Optional second line (company, author, budget…) appended to the message. */
    subtitle?: string | null
    /** Accessible name for the trigger button, e.g. "Share job". */
    label?: string
}

// Rough menu footprint, used to flip the popover above the trigger when it
// would otherwise open past the bottom edge of the viewport.
const MENU_WIDTH = 248
const MENU_HEIGHT = 292

export function ShareMenu({ url, title, subtitle = null, label = 'Share' }: ShareMenuProps) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const menuId = useId()

    const text = subtitle ? `${title} — ${subtitle}` : title
    const links = buildShareLinks(url, text)

    // The trigger carries `relative z-10` so it stays clickable above the
    // stretched-link overlay (`after:absolute after:inset-0`) that job and
    // freelance cards paint over the whole card.
    const toggle = () => {
        if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const wouldOverflow = rect.bottom + 8 + MENU_HEIGHT > window.innerHeight
            const top = wouldOverflow ? Math.max(8, rect.top - MENU_HEIGHT - 8) : rect.bottom + 8
            const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
            setPosition({ top, left })
            setCopied(false)
        }
        setOpen((v) => !v)
    }

    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        const close = () => setOpen(false)
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)
        window.addEventListener('resize', close)
        // capture: scrolling any scrollable ancestor (the card lists) should
        // also dismiss the menu instead of letting it float out of place.
        window.addEventListener('scroll', close, true)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
        }
    }, [open])

    // Clear the pending "Copied!" auto-close timer whenever the menu closes
    // (Escape / outside click / a social target) so a quick reopen is not
    // insta-closed by a stale timer. Also runs on unmount.
    useEffect(() => {
        if (open) return
        if (copyTimer.current) {
            clearTimeout(copyTimer.current)
            copyTimer.current = null
        }
    }, [open])

    useEffect(
        () => () => {
            if (copyTimer.current) clearTimeout(copyTimer.current)
        },
        []
    )

    const onCopy = async () => {
        const ok = await copyLinkToClipboard(url)
        if (ok) {
            setCopied(true)
            copyTimer.current = setTimeout(() => {
                copyTimer.current = null
                setCopied(false)
                setOpen(false)
            }, 1600)
        }
    }

    const socialTargets = [
        { key: 'linkedin', name: 'LinkedIn', href: links.linkedin, Icon: LinkedInIcon, color: '#0A66C2' },
        { key: 'whatsapp', name: 'WhatsApp', href: links.whatsapp, Icon: WhatsAppIcon, color: '#25D366' },
        { key: 'facebook', name: 'Facebook', href: links.facebook, Icon: FacebookIcon, color: '#1877F2' },
        { key: 'x', name: 'X', href: links.x, Icon: XIcon, color: '#0F1419' },
    ] as const

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={label}
                title={label}
                data-cursor-hover
                className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2/70 text-fg/60 transition-colors duration-200 hover:bg-lime hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
                <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>

            {typeof document === 'object' &&
                createPortal(
                    <AnimatePresence>
                        {open && position && (
                            <motion.div
                                id={menuId}
                                ref={menuRef}
                                role="menu"
                                aria-label={`Share “${title}”`}
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                                className="fixed z-[200] overflow-hidden rounded-2xl border border-edge/10 bg-panel shadow-2xl"
                            >
                                <p className="border-b border-edge/10 px-4 pb-2 pt-3 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-fg/60">
                                    Share this post
                                </p>
                                <div className="py-1">
                                    {socialTargets.map(({ key, name, href, Icon, color }) => (
                                        <a
                                            key={key}
                                            role="menuitem"
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpen(false)}
                                            data-cursor-hover
                                            className="flex w-full items-center gap-3 px-4 py-2 text-sm font-semibold text-fg/80 transition-colors hover:bg-panel-2 hover:text-fg"
                                        >
                                            <span
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                                                style={{ background: color }}
                                            >
                                                <Icon className="h-3.5 w-3.5" />
                                            </span>
                                            Share via {name}
                                        </a>
                                    ))}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={onCopy}
                                        data-cursor-hover
                                        className="flex w-full items-center gap-3 border-t border-edge/10 px-4 py-2 text-sm font-semibold text-fg/80 transition-colors hover:bg-panel-2 hover:text-fg"
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-fg/70">
                                            {copied ? (
                                                <Check className="h-3.5 w-3.5 text-lime-text" aria-hidden="true" />
                                            ) : (
                                                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                                            )}
                                        </span>
                                        {copied ? 'Copied!' : 'Copy link'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    )
}
