'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, Clock, MapPin } from 'lucide-react'
import type { Job } from '@/types/job'
import { workModeOf } from '@/types/job'
import { sourceMap } from '@/data/sources'

const modeStyles = {
  remote: { label: 'Remote', color: '#CCFF00' },
  hybrid: { label: 'Hybrid', color: '#22E0D6' },
  onsite: { label: 'On-site', color: '#FF5C38' },
} as const

const initialColors = ['#8B5CF6', '#22E0D6', '#FF5C38', '#CCFF00']

function companyInitials(company: string) {
  const words = company.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function companyColor(company: string) {
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash)
  return initialColors[Math.abs(hash) % initialColors.length]
}

function postedLabel(datePosted: string | null) {
  if (!datePosted) return 'Recently'
  const days = Math.floor((Date.now() - new Date(datePosted).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.round(days / 7)}w ago`
}

interface JobCardProps {
  job: Job
  index: number
}

function JobCardImpl({ job, index }: JobCardProps) {
  const source = sourceMap[job.source] ?? { name: job.source, color: '#8B5CF6' }
  const mode = modeStyles[workModeOf(job)]
  const initials = companyInitials(job.company)
  const color = companyColor(job.company)

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-3xl bg-panel/80 p-[1.5px] transition-shadow duration-300"
      style={{ boxShadow: '0 1px 0 0 rgba(10,6,22,0.06)' }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(120deg, ${source.color}, transparent 55%, ${mode.color})` }}
      />

      <div className="relative flex gap-0 rounded-[calc(1.5rem-1px)] bg-panel">
        <span
          aria-hidden="true"
          className="w-1.5 shrink-0 rounded-l-[calc(1.5rem-1px)] transition-all duration-300 group-hover:w-2.5"
          style={{ background: source.color }}
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
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
                  {job.title}
                </a>
              </h3>
              <p className="mt-1 text-sm font-medium text-fg/60">{job.company}</p>
            </div>

            {job.salary && (
              <div className="hidden shrink-0 text-right sm:block">
                <p className="font-[var(--font-display)] text-base font-bold text-lime-deep dark:text-lime">{job.salary}</p>
                <p className="mt-1 font-[var(--font-mono)] text-[11px] uppercase tracking-wider text-fg/40">
                  {postedLabel(job.datePosted)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ background: mode.color, color: '#0A0616' }}
            >
              {mode.label}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge/10 pt-4 text-xs text-fg/50">
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {job.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {postedLabel(job.datePosted)}
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 font-semibold text-fg/70">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: source.color }} aria-hidden="true" />
              via {source.name}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>

          {job.salary && <p className="mt-3 font-[var(--font-display)] text-sm font-bold text-lime-deep dark:text-lime sm:hidden">{job.salary}</p>}
        </div>
      </div>
    </motion.article>
  )
}

// Memoized: the jobs list re-renders on every filter/pagination change, and
// without this every card was re-rendering (and replaying its motion setup)
// even when its own props hadn't changed.
export const JobCard = memo(JobCardImpl)