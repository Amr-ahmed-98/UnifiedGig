'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, X } from 'lucide-react'
import {
  PLATFORMS,
  PROFILE_LIMITS,
  hostMatchesPlatform,
  isHttpUrl,
  platformMeta,
  platformMismatchMessage,
  type FollowProfile,
  type Platform,
} from '@/types/profile'

interface AddProfileModalProps {
  open: boolean
  onClose: () => void
  onAdded: (profile: FollowProfile) => void
}

const inputCls =
  'w-full rounded-2xl bg-panel-2/60 px-4 py-3 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(128,128,128,0.25)] placeholder:text-fg/50 focus:shadow-[0_0_0_2px_#CCFF00]'
const labelCls = 'mb-2 block text-sm font-semibold text-fg'

function LabelRow({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">{children}</label>
      {optional && <span className="font-[var(--font-mono)] text-[11px] text-fg/60">Optional</span>}
    </div>
  )
}

export function AddProfileModal({ open, onClose, onAdded }: AddProfileModalProps) {
  const [platform, setPlatform] = useState<Platform>('linkedin')
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [postsAbout, setPostsAbout] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the modal opens
    setPlatform('linkedin')
    setUrl('')
    setName('')
    setHeadline('')
    setPostsAbout('')
    setError(null)
    const t = setTimeout(() => urlRef.current?.focus(), 50)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const link = url.trim()
    if (!isHttpUrl(link)) return setError('Enter a valid link starting with https://')
    if (!hostMatchesPlatform(link, platform)) return setError(platformMismatchMessage(platform))
    if (!name.trim()) return setError('Add a name')

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          url: link,
          name: name.trim(),
          headline: headline.trim() || null,
          postsAbout: postsAbout.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add profile')
      onAdded(data.profile)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-profile-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-edge/10 bg-panel shadow-2xl sm:rounded-3xl"
          >
            <div className="flex-1 overflow-y-auto px-5 pb-2 pt-6 sm:px-8 sm:pt-7">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-cursor-hover
                className="absolute right-4 top-4 rounded-full bg-panel-2 p-2.5 text-fg/80 transition-colors hover:text-fg sm:right-6 sm:top-6"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 id="add-profile-title" className="pr-12 font-[var(--font-display)] text-2xl font-bold text-fg">
                Add a profile
              </h2>
              <p className="mt-2 pr-12 text-sm text-fg/60">
                Share someone who regularly posts jobs so others can follow them too.
              </p>

              <div className="mt-6 space-y-5">
                <fieldset>
                  <legend className={labelCls}>Platform</legend>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const active = platform === p
                      const meta = platformMeta[p]
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatform(p)}
                          aria-pressed={active}
                          data-cursor-hover
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            active ? 'text-ink' : 'bg-panel-2/70 text-fg/80 ring-1 ring-inset ring-edge/15 hover:text-fg'
                          }`}
                          style={active ? { background: meta.color } : undefined}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{ background: active ? '#0A0616' : meta.color }}
                          />
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="prof-url" className={labelCls}>Profile link</label>
                  <input
                    ref={urlRef}
                    id="prof-url"
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={platformMeta[platform].placeholder}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="prof-name" className={labelCls}>Name</label>
                  <input
                    id="prof-name"
                    value={name}
                    maxLength={PROFILE_LIMITS.name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Person, page or group name"
                    className={inputCls}
                  />
                </div>

                <div>
                  <LabelRow htmlFor="prof-headline" optional>Headline</LabelRow>
                  <input
                    id="prof-headline"
                    value={headline}
                    maxLength={PROFILE_LIMITS.headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Tech Recruiter · Fintech"
                    className={inputCls}
                  />
                </div>

                <div>
                  <LabelRow htmlFor="prof-about" optional>Usually posts about</LabelRow>
                  <input
                    id="prof-about"
                    value={postsAbout}
                    maxLength={PROFILE_LIMITS.postsAbout}
                    onChange={(e) => setPostsAbout(e.target.value)}
                    placeholder="e.g. Remote frontend roles"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral-text">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-5 sm:px-8">
              <button
                type="button"
                onClick={onClose}
                data-cursor-hover
                className="rounded-full bg-panel-2 px-6 py-3 text-sm font-semibold text-fg transition-colors hover:bg-panel-2/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                data-cursor-hover
                className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Adding…' : 'Add profile'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
