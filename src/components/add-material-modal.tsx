'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, X } from 'lucide-react'
import { MATERIAL_TYPES, isHttpUrl, materialTypeMeta, type LearningMaterial, type MaterialType } from '@/types/material'

interface AddMaterialModalProps {
  open: boolean
  fieldSlug: string
  fieldName: string
  onClose: () => void
  onAdded: (material: LearningMaterial) => void
}

const inputCls =
  'w-full rounded-2xl bg-panel-2/60 px-4 py-3 text-sm text-fg outline-none shadow-[inset_0_0_0_1px_rgba(128,128,128,0.25)] placeholder:text-fg/50 focus:shadow-[0_0_0_2px_#CCFF00]'
const labelCls = 'mb-2 block text-sm font-semibold text-fg'

export function AddMaterialModal({ open, fieldSlug, fieldName, onClose, onAdded }: AddMaterialModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MaterialType>('course')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  const urlRef = useRef<HTMLInputElement>(null)

  // Synchronously reset form state during render when modal opens so effects/typing never race
  if (open && !prevOpen) {
    setPrevOpen(true)
    setUrl('')
    setTitle('')
    setType('course')
    setDescription('')
    setError(null)
  } else if (!open && prevOpen) {
    setPrevOpen(false)
  }

  useEffect(() => {
    if (!open) return
    urlRef.current?.focus()
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
    if (!isHttpUrl(url.trim())) return setError('Enter a valid link starting with https://')
    if (!title.trim()) return setError('Add a title')

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: fieldSlug,
          url: url.trim(),
          title: title.trim(),
          type,
          description: description.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add material')
      onAdded(data.material)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add material')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-material-modal"
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
            aria-labelledby="add-material-title"
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

              <h2 id="add-material-title" className="pr-12 font-[var(--font-display)] text-2xl font-bold text-fg">
                Add material
              </h2>
              <p className="mt-2 pr-12 text-sm text-fg/60">Share a link that helps people learn {fieldName}.</p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="mat-url" className={labelCls}>Link</label>
                  <input
                    ref={urlRef}
                    id="mat-url"
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="mat-title" className={labelCls}>Title</label>
                  <input
                    id="mat-title"
                    value={title}
                    maxLength={140}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CCNA full course"
                    className={inputCls}
                  />
                </div>

                <fieldset>
                  <legend className={labelCls}>Type</legend>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAL_TYPES.map((t) => {
                      const active = type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          aria-pressed={active}
                          data-cursor-hover
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            active ? 'bg-lime text-ink' : 'bg-panel-2/70 text-fg/80 ring-1 ring-inset ring-edge/15 hover:text-fg'
                          }`}
                        >
                          {materialTypeMeta[t].label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label htmlFor="mat-desc" className="text-sm font-semibold text-fg">Why it&apos;s useful</label>
                    <span className="font-[var(--font-mono)] text-[11px] text-fg/60">Optional</span>
                  </div>
                  <textarea
                    id="mat-desc"
                    value={description}
                    maxLength={280}
                    rows={3}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One line on what makes it good"
                    className={`${inputCls} resize-none`}
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
                {submitting ? 'Adding…' : 'Add material'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
