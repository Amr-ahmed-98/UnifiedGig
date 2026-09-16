'use client'

import { memo, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, Clock, MapPin, Trash2 } from 'lucide-react'
import type { SocialJobPost } from '@/types/socialJob'
import { expiryLabel, hoursRemaining } from '@/types/socialJob'

const initialColors = ['#8B5CF6', '#22E0D6', '#FF5C38', '#CCFF00', '#0084FF']

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function colorOf(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return initialColors[Math.abs(hash) % initialColors.length]
}

function postedLabel(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

interface SocialJobCardProps {
  post: SocialJobPost
  index: number
  onDiscard?: (id: string) => void
}

function SocialJobCardImpl({ post, index, onDiscard }: SocialJobCardProps) {
  const name = post.authorName || 'LinkedIn member'
  const initials = initialsOf(name)
  const color = colorOf(name)

  // Live countdown so the card visibly ticks down toward the 48h auto-removal
  // instead of freezing at whatever it read on first render.
  const [label, setLabel] = useState(() => expiryLabel(post.expiresAt))
  const [urgent, setUrgent] = useState(() => hoursRemaining(post.expiresAt) < 6)

  useEffect(() => {
    const id = setInterval(() => {
      setLabel(expiryLabel(post.expiresAt))
      setUrgent(hoursRemaining(post.expiresAt) < 6)
    }, 60_000)
    return () => clearInterval(id)
  }, [post.expiresAt])

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-3xl bg-panel/80 p-[1.5px] transition-shadow duration-300"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(120deg, #22E0D6, transparent 55%, #CCFF00)` }}
      />

      <div className="relative flex gap-0 rounded-[calc(1.5rem-1px)] bg-panel">
        <span
          aria-hidden="true"
          className="w-1.5 shrink-0 rounded-l-[calc(1.5rem-1px)] transition-all duration-300 group-hover:w-2.5"
          style={{ background: '#22E0D6' }}
        />

        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-[var(--font-display)] text-sm font-bold text-ink transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
              style={{ background: color }}
              aria-hidden="true"
            >
              {initials}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="font-[var(--font-display)] text-lg font-bold leading-snug text-fg sm:text-xl">
                {post.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-fg/60">{name}</p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-wider ${
                urgent ? 'bg-coral/15 text-coral-text' : 'bg-panel-2 text-fg/60'
              }`}
            >
              {label}
            </span>
          </div>

          {post.description && (
            <p className="mt-3 line-clamp-2 text-sm text-fg/70">{post.description}</p>
          )}

          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable LinkedIn CDN host
            <img
              src={post.imageUrl}
              alt=""
              className="mt-4 h-36 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {post.remote && (
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                Remote
              </span>
            )}
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-panel-2/70 px-3 py-1 text-xs font-semibold text-fg/70 ring-1 ring-inset ring-edge/10"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge/10 pt-4 text-xs text-fg/60">
            {post.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {post.location}
              </span>
            )}
            {post.salary && (
              <span className="font-[var(--font-display)] text-sm font-bold text-lime-text">{post.salary}</span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {postedLabel(post.createdAt)}
            </span>

            <div className="ml-auto flex items-center gap-3">
              {onDiscard && (
                <button
                  type="button"
                  onClick={() => onDiscard(post.id)}
                  aria-label="Discard post"
                  data-cursor-hover
                  className="rounded-full p-1.5 text-fg/50 transition-colors hover:bg-coral/10 hover:text-coral-text"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor-hover
                className="inline-flex items-center gap-1.5 font-semibold text-fg/70 hover:text-fg"
              >
                View on LinkedIn
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export const SocialJobCard = memo(SocialJobCardImpl)
