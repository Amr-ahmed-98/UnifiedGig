'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { BookOpen, X } from 'lucide-react'

export const COMING_SOON_SESSION_KEY = 'ug_coming_soon_dismissed_session'
export const COMING_SOON_PERMANENT_KEY = 'ug_hide_coming_soon_permanently_v2'

interface ComingSoonModalProps {
  /** Optional override to force open/close for testing */
  forceOpen?: boolean
  /** Initial delay before modal appears (ms). Defaults to 400ms */
  initialDelayMs?: number
  onClose?: () => void
}

export function ComingSoonModal({ forceOpen, initialDelayMs = 400, onClose }: ComingSoonModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (typeof forceOpen === 'boolean') {
      setIsOpen(forceOpen)
      return
    }

    try {
      const isPermanentlyHidden = localStorage.getItem(COMING_SOON_PERMANENT_KEY) === 'true'
      const isSessionDismissed = sessionStorage.getItem(COMING_SOON_SESSION_KEY) === 'true'

      if (!isPermanentlyHidden && !isSessionDismissed) {
        if (initialDelayMs <= 0) {
          setIsOpen(true)
          return
        }
        const timer = setTimeout(() => {
          setIsOpen(true)
        }, initialDelayMs)
        return () => clearTimeout(timer)
      }
    } catch {
      // Storage access blocked or unavailable
    }
  }, [forceOpen, initialDelayMs])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleGotYou()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleGotYou = () => {
    try {
      sessionStorage.setItem(COMING_SOON_SESSION_KEY, 'true')
    } catch {
      // ignore storage errors
    }
    setIsOpen(false)
    onClose?.()
  }

  const handleDontShowAgain = () => {
    try {
      localStorage.setItem(COMING_SOON_PERMANENT_KEY, 'true')
    } catch {
      // ignore storage errors
    }
    setIsOpen(false)
    onClose?.()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="coming-soon-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-title"
          aria-describedby="coming-soon-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            onClick={handleGotYou}
            className="fixed inset-0 bg-canvas/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative z-10 w-full max-w-lg sm:max-w-xl overflow-hidden rounded-[2rem] border border-edge/15 bg-panel shadow-2xl backdrop-blur-xl"
          >
            {/* Ambient decorative lighting */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime/15 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-coral/15 blur-3xl"
            />

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={handleGotYou}
              aria-label="Close coming soon announcement"
              data-cursor-hover
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-lime"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Banner Image Container */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/20">
              <Image
                src="/images/material-page.jpg"
                alt="UnifiedGig Learn — a community-powered hub of courses, videos, books and articles for every tech field"
                width={1376}
                height={768}
                priority
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent pointer-events-none" />
            </div>

            {/* Content Details */}
            <div className="relative px-6 pb-6 pt-2 sm:px-8 sm:pb-8 sm:pt-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-lime-text">
                <BookOpen className="h-3.5 w-3.5 text-lime-text" />
                New · Just Launched
              </div>

              <h2
                id="coming-soon-title"
                className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-fg sm:text-3xl"
              >
                The Learn page is live — explore &amp; contribute!
              </h2>

              <p
                id="coming-soon-description"
                className="mt-2 text-sm leading-relaxed text-fg/70 sm:text-base"
              >
                We&apos;ve launched a community-powered learning hub packed with courses, videos, articles, books, and more — curated per field.
                Found a great resource? Hit <strong className="text-fg font-semibold">Add material</strong> and share it with everyone.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleDontShowAgain}
                  data-cursor-hover
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-edge/20 bg-panel-2/60 px-5 py-3 font-[var(--font-display)] text-sm font-semibold text-fg/80 transition-all duration-200 hover:border-coral/40 hover:bg-coral/10 hover:text-coral-text active:scale-[0.98] sm:w-auto"
                >
                  <span>Don&apos;t show me again</span>
                  <span aria-hidden="true" className="text-base">🚫</span>
                </button>

                <Link
                  href="/materials"
                  onClick={handleGotYou}
                  data-cursor-hover
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 font-[var(--font-display)] text-sm font-bold text-ink shadow-lg shadow-lime/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lime/35 active:scale-[0.98] sm:w-auto"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Explore it now</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
