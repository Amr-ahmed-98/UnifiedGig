'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, X } from 'lucide-react'
import {
  PROMPT_CATEGORIES,
  PROMPT_LIMITS,
  parseTools,
  promptCategoryMeta,
  type Prompt,
  type PromptCategory,
} from '@/types/prompt'

interface AddPromptModalProps {
  open: boolean
  onClose: () => void
  onAdded: (prompt: Prompt) => void
}

const inputCls =
  'w-full rounded-2xl bg-panel-2/60 px-4 py-3 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(128,128,128,0.25)] placeholder:text-fg/50 focus:shadow-[0_0_0_2px_#CCFF00]'
const labelCls = 'mb-2 block text-sm font-semibold text-fg'

export function AddPromptModal({ open, onClose, onAdded }: AddPromptModalProps) {
  const [category, setCategory] = useState<PromptCategory>('programming')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tools, setTools] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  const titleRef = useRef<HTMLInputElement>(null)

  // Reset synchronously when the modal opens so typing never races an effect
  if (open && !prevOpen) {
    setPrevOpen(true)
    setCategory('programming')
    setTitle('')
    setBody('')
    setTools('')
    setError(null)
  } else if (!open && prevOpen) {
    setPrevOpen(false)
  }

  useEffect(() => {
    if (!open) return
    titleRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
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
    if (title.trim().length < PROMPT_LIMITS.titleMin) return setError('Add a title')
    if (body.trim().length < PROMPT_LIMITS.bodyMin)
      return setError(`Prompt needs at least ${PROMPT_LIMITS.bodyMin} characters`)

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title: title.trim(), body: body.trim(), tools: parseTools(tools) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to share prompt')
      onAdded(data.prompt)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share prompt')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-prompt-modal"
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
        >
          <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-prompt-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="relative flex min-h-0 max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-edge/10 bg-panel shadow-2xl sm:rounded-3xl"
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

              <h2 id="add-prompt-title" className="pr-12 font-[var(--font-display)] text-2xl font-bold text-fg">
                Share a prompt
              </h2>
              <p className="mt-2 pr-12 text-sm text-fg/60">
                Use [brackets] for the parts people should fill in themselves.
              </p>

              <div className="mt-6 space-y-5">
                <fieldset>
                  <legend className={labelCls}>Category</legend>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_CATEGORIES.map((c) => {
                      const active = category === c
                      const meta = promptCategoryMeta[c]
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          aria-pressed={active}
                          data-cursor-hover
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            active ? 'bg-lime text-ink' : 'bg-panel-2/70 text-fg/80 ring-1 ring-inset ring-edge/15 hover:text-fg'
                          }`}
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
                  <label htmlFor="prompt-title" className={labelCls}>Title</label>
                  <input
                    ref={titleRef}
                    id="prompt-title"
                    value={title}
                    maxLength={PROMPT_LIMITS.titleMax}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Write unit tests for my function"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="prompt-body" className={labelCls}>Prompt</label>
                  <textarea
                    id="prompt-body"
                    value={body}
                    maxLength={PROMPT_LIMITS.bodyMax}
                    rows={6}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Act as a… [paste your code]"
                    className={`${inputCls} resize-y font-[var(--font-mono)]`}
                  />
                  <p className="mt-1.5 text-right font-[var(--font-mono)] text-[11px] text-fg/60">
                    {body.length}/{PROMPT_LIMITS.bodyMax}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label htmlFor="prompt-tools" className="text-sm font-semibold text-fg">Works with</label>
                    <span className="font-[var(--font-mono)] text-[11px] text-fg/60">Optional</span>
                  </div>
                  <input
                    id="prompt-tools"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    placeholder="ChatGPT, Claude, Midjourney"
                    className={inputCls}
                  />
                  <p className="mt-1.5 font-[var(--font-mono)] text-[11px] text-fg/60">Separate with commas</p>
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
                {submitting ? 'Sharing…' : 'Share prompt'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
