'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Link2, Loader2, X } from 'lucide-react'
import { SOCIAL_JOB_TAGS, type SocialJobPost } from '@/types/socialJob'

interface EmbedLinkedInModalProps {
  open: boolean
  onClose: () => void
  onEmbedded: (post: SocialJobPost) => void
}

interface DraftFields {
  title: string
  authorName: string
  description: string
  salary: string
  location: string
  remote: boolean
  imageUrl: string
}

const emptyDraft: DraftFields = {
  title: '',
  authorName: '',
  description: '',
  salary: '',
  location: '',
  remote: false,
  imageUrl: '',
}

// Loose check only — used to decide whether to kick off the preview call.
// lnkd.in is LinkedIn's own shortener; the server resolves it to the real
// linkedin.com/posts/... link before validating or storing anything.
function isLikelyLinkedInUrl(raw: string) {
  if (!raw.trim()) return false
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'lnkd.in') return true
    return host === 'linkedin.com' && /^\/(posts|feed\/update|pulse)\//.test(u.pathname)
  } catch {
    return false
  }
}

export function EmbedLinkedInModal({ open, onClose, onEmbedded }: EmbedLinkedInModalProps) {
  const [url, setUrl] = useState('')
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftFields>(emptyDraft)
  const [tags, setTags] = useState<string[]>([])
  const [recruiterContact, setRecruiterContact] = useState('')

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [hasPreview, setHasPreview] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const looksLikeUrl = isLikelyLinkedInUrl(url)

  // Reset on every re-open so a previous embed doesn't linger in the form.
  useEffect(() => {
    if (open) {
      setUrl('')
      setResolvedUrl(null)
      setDraft(emptyDraft)
      setTags([])
      setRecruiterContact('')
      setPreviewError(null)
      setHasPreview(false)
      setSubmitError(null)
    }
  }, [open])

  // Debounced auto-parse as soon as the URL looks like a real post link.
  useEffect(() => {
    if (!open || !looksLikeUrl) {
      setHasPreview(false)
      setResolvedUrl(null)
      setPreviewError(null)
      return
    }

    const id = setTimeout(async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      try {
        const res = await fetch('/api/social-jobs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not parse that post')

        const p = data.preview
        setResolvedUrl(data.resolvedUrl || null)
        setDraft({
          title: p.title || '',
          authorName: p.authorName || '',
          description: p.description || '',
          salary: p.salary || '',
          location: p.location || '',
          remote: !!p.remote,
          imageUrl: p.imageUrl || '',
        })
        // Auto-detected tags are pre-selected; leave empty for the person to
        // pick themselves when nothing matched.
        setTags(Array.isArray(data.tags) ? data.tags : [])
        if (data.error) setPreviewError(data.error) // soft warning — link is valid, just couldn't read metadata
        setHasPreview(true)
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Could not parse that post')
        setResolvedUrl(null)
        setHasPreview(false) // link itself didn't resolve — nothing usable to submit yet
      } finally {
        setPreviewLoading(false)
      }
    }, 600)

    return () => clearTimeout(id)
  }, [url, looksLikeUrl, open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const handleSubmit = async () => {
    if (!resolvedUrl || !draft.title.trim()) {
      setSubmitError('Add a title before embedding.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/social-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: resolvedUrl,
          title: draft.title.trim(),
          authorName: draft.authorName.trim() || null,
          description: draft.description.trim() || null,
          salary: draft.salary.trim() || null,
          location: draft.location.trim() || null,
          remote: draft.remote,
          imageUrl: draft.imageUrl.trim() || null,
          tags,
          recruiterContact: recruiterContact.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to embed post')
      onEmbedded(data.post)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to embed post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="embed-linkedin-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-edge/10 bg-panel shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-edge/10 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime text-ink">
                  <Link2 className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <div>
                  <h2 id="embed-linkedin-title" className="font-[var(--font-display)] text-lg font-bold text-fg">
                    Embed a LinkedIn Post
                  </h2>
                  <p className="mt-0.5 text-sm text-fg/60">
                    Paste a post link to pull in the title, author and details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-cursor-hover
                className="shrink-0 rounded-full p-2 text-fg/60 transition-colors hover:bg-panel-2 hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label htmlFor="li-url" className="mb-2 block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fg/60">
                  LinkedIn post URL
                </label>
                <div className="relative">
                  <input
                    id="li-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/posts/..."
                    className="w-full rounded-2xl bg-panel-2/60 px-4 py-3 pr-10 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] placeholder:text-fg/50 focus:shadow-[0_0_0_2px_#CCFF00]"
                  />
                  {previewLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg/50" />
                  )}
                </div>
                {url.trim().length > 0 && (
                  <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${looksLikeUrl ? 'text-lime-text' : 'text-coral-text'}`}>
                    {looksLikeUrl && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {looksLikeUrl
                      ? 'Valid LinkedIn URL detected'
                      : 'Needs a linkedin.com/posts/..., /feed/update/... or lnkd.in link'}
                  </p>
                )}
              </div>

              {hasPreview && (
                <div className="space-y-4 rounded-2xl border border-edge/10 bg-panel-2/40 p-4">
                  {previewError && (
                    <p className="rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral-text">{previewError}</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="li-title" className="mb-1 block text-xs font-semibold text-fg/60">Title</label>
                      <input
                        id="li-title"
                        value={draft.title}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        placeholder="Role or headline from the post"
                        className="w-full rounded-xl bg-panel px-3 py-2 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] focus:shadow-[0_0_0_2px_#CCFF00]"
                      />
                    </div>

                    <div>
                      <label htmlFor="li-author" className="mb-1 block text-xs font-semibold text-fg/60">Posted by</label>
                      <input
                        id="li-author"
                        value={draft.authorName}
                        onChange={(e) => setDraft((d) => ({ ...d, authorName: e.target.value }))}
                        placeholder="Name / company"
                        className="w-full rounded-xl bg-panel px-3 py-2 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] focus:shadow-[0_0_0_2px_#CCFF00]"
                      />
                    </div>

                    <div>
                      <label htmlFor="li-salary" className="mb-1 block text-xs font-semibold text-fg/60">Salary / rate</label>
                      <input
                        id="li-salary"
                        value={draft.salary}
                        onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))}
                        placeholder="$120k - $160k"
                        className="w-full rounded-xl bg-panel px-3 py-2 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] focus:shadow-[0_0_0_2px_#CCFF00]"
                      />
                    </div>

                    <div>
                      <label htmlFor="li-location" className="mb-1 block text-xs font-semibold text-fg/60">Location</label>
                      <input
                        id="li-location"
                        value={draft.location}
                        onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                        placeholder="Remote, Cairo, ..."
                        className="w-full rounded-xl bg-panel px-3 py-2 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] focus:shadow-[0_0_0_2px_#CCFF00]"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-fg/80">
                      <input
                        type="checkbox"
                        checked={draft.remote}
                        onChange={(e) => setDraft((d) => ({ ...d, remote: e.target.checked }))}
                        className="h-4 w-4 rounded accent-lime"
                      />
                      Remote
                    </label>

                    <div className="sm:col-span-2">
                      <label htmlFor="li-desc" className="mb-1 block text-xs font-semibold text-fg/60">Description</label>
                      <textarea
                        id="li-desc"
                        value={draft.description}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        rows={3}
                        placeholder="What the post said"
                        className="w-full resize-none rounded-xl bg-panel px-3 py-2 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] focus:shadow-[0_0_0_2px_#CCFF00]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fg/60">
                  Classification tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_JOB_TAGS.map((tag) => {
                    const active = tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        data-cursor-hover
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          active ? 'bg-lime text-ink' : 'bg-panel-2/70 text-fg/70 ring-1 ring-inset ring-edge/10'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="li-contact" className="mb-2 block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fg/60">
                  Recruiter email / referral (optional)
                </label>
                <input
                  id="li-contact"
                  value={recruiterContact}
                  onChange={(e) => setRecruiterContact(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  className="w-full rounded-2xl bg-panel-2/60 px-4 py-3 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] placeholder:text-fg/50 focus:shadow-[0_0_0_2px_#CCFF00]"
                />
              </div>

              {submitError && (
                <p className="rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral-text">{submitError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-edge/10 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                data-cursor-hover
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-fg/70 transition-colors hover:text-fg"
              >
                Cancel &amp; Discard
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!resolvedUrl || !hasPreview || submitting}
                data-cursor-hover
                className="ml-auto flex-1 rounded-full bg-lime py-3 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? 'Embedding…' : 'Embed & Post Now'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
