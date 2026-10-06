'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { readableTint } from '@/lib/utils'
import { initialsOf, platformMeta, type FollowProfile } from '@/types/profile'

function ProfileCardImpl({ profile, index }: { profile: FollowProfile; index: number }) {
  const meta = platformMeta[profile.platform]

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
      className="flex h-full flex-col rounded-3xl border border-edge/10 bg-panel/70 p-5 transition-colors duration-200 hover:border-edge/25"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[var(--font-mono)] text-sm font-bold ring-1 ring-inset"
          style={{
            background: `color-mix(in srgb, ${meta.color} 18%, transparent)`,
            color: readableTint(meta.color),
            ['--tw-ring-color' as string]: `color-mix(in srgb, ${meta.color} 35%, transparent)`,
          }}
        >
          {initialsOf(profile.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-[var(--font-display)] text-lg font-bold leading-snug text-fg">
            {profile.name}
          </h3>
          {profile.headline && <p className="mt-0.5 break-words text-sm text-fg/60">{profile.headline}</p>}
        </div>
      </div>

      {profile.postsAbout && (
        <div className="mt-5">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-fg/60">Posts about</p>
          <p className="mt-1.5 break-words text-sm text-fg">{profile.postsAbout}</p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-edge/10 pt-4">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
          <span className="truncate">{meta.label}</span>
        </span>
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          aria-label={`Follow ${profile.name} on ${meta.label}`}
          data-cursor-hover
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-panel-2 px-4 py-2 text-xs font-bold text-fg transition-colors hover:bg-lime hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          Follow
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  )
}

export const ProfileCard = memo(ProfileCardImpl)
