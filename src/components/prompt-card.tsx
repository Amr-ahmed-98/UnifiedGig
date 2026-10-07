'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { readableTint } from '@/lib/utils'
import { promptCategoryMeta, splitPlaceholders, type Prompt } from '@/types/prompt'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for insecure contexts / older browsers
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

function PromptCardImpl({ prompt, index }: { prompt: Prompt; index: number }) {
  const meta = promptCategoryMeta[prompt.category]
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const handleCopy = async () => {
    if (!(await copyText(prompt.body))) return
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
      className="rounded-3xl border border-edge/10 bg-panel/70 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-[var(--font-mono)] text-[11px] font-semibold" style={{ color: readableTint(meta.color) }}>
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </p>
          <h3 className="mt-2 break-words font-[var(--font-display)] text-lg font-bold leading-snug text-fg sm:text-xl">
            {prompt.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          data-cursor-hover
          aria-label={copied ? 'Prompt copied' : `Copy prompt: ${prompt.title}`}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
            copied ? 'bg-lime text-ink' : 'bg-panel-2 text-fg hover:bg-lime hover:text-ink'
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl bg-canvas/70 p-4 ring-1 ring-inset ring-edge/10">
        <p className="whitespace-pre-wrap break-words font-[var(--font-mono)] text-[13px] leading-relaxed text-fg/85">
          {splitPlaceholders(prompt.body).map((seg, i) =>
            seg.placeholder ? (
              <span key={i} className="rounded bg-lime/20 px-0.5 font-semibold text-lime-text">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </p>
      </div>

      {prompt.tools.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-[var(--font-mono)] text-[11px] text-fg/60">
          <span>Works with</span>
          {prompt.tools.map((t, i) => (
            <span key={t} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">·</span>}
              <span className="font-semibold text-fg/85">{t}</span>
            </span>
          ))}
        </p>
      )}
    </motion.article>
  )
}

export const PromptCard = memo(PromptCardImpl)
