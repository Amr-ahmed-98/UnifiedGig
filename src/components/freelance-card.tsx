'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, CalendarClock } from 'lucide-react'
import type { FreelanceProject } from '@/types/freelance'
import { deadlineDays } from '@/types/freelance'
import { sourceMap } from '@/data/sources'

const skillColors = ['#CCFF00', '#22E0D6', '#FF5C38', '#8B5CF6']

function urgency(days: number | null) {
  if (days === null) return { color: '#8B5CF6', label: 'No deadline', pulse: false }
  if (days <= 2) return { color: '#FF5C38', label: `Due in ${Math.max(days, 0)}d`, pulse: true }
  if (days <= 7) return { color: '#FFB020', label: `Due in ${days}d`, pulse: false }
  return { color: '#22E0D6', label: `Due in ${days}d`, pulse: false }
}

interface FreelanceCardProps {
  project: FreelanceProject
  index: number
}

function FreelanceCardImpl({ project, index }: FreelanceCardProps) {
  const source = sourceMap[project.source] ?? { name: project.source, color: '#8B5CF6' }
  const due = urgency(deadlineDays(project.deadline))

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
        style={{ background: `linear-gradient(140deg, ${source.color}, transparent 60%, ${due.color})` }}
      />

      <div className="relative flex h-full flex-col rounded-[calc(1.5rem-1px)] bg-panel p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-wider text-fg/40">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: source.color }} aria-hidden="true" />
            {source.name}
          </p>

          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: `${due.color}1f`, color: due.color, boxShadow: `inset 0 0 0 1px ${due.color}55` }}
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {due.label}
            {due.pulse && <span className="ml-0.5 h-1.5 w-1.5 animate-ping rounded-full" style={{ background: due.color }} aria-hidden="true" />}
          </span>
        </div>

        <h3 className="mt-4 font-[var(--font-display)] text-lg font-bold leading-snug text-fg sm:text-xl">
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
            {project.title}
          </a>
        </h3>
        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg/55">{project.description}</p>
        )}

        {project.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.skills.map((skill, i) => {
              const c = skillColors[(i + index) % skillColors.length]
              return (
                <span
                  key={skill}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-200 group-hover:-translate-y-0.5"
                  style={{ background: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}44` }}
                >
                  {skill}
                </span>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-edge/10 pt-4">
          <div>
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-fg/40">Budget</p>
            <p className="font-[var(--font-display)] text-2xl font-bold text-lime-deep dark:text-lime sm:text-3xl">
              {project.budget ?? 'Not listed'}
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-fg transition-all duration-300 group-hover:bg-lime group-hover:text-ink">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.article>
  )
}

// Memoized: same reasoning as JobCard — list re-renders on every filter change.
export const FreelanceCard = memo(FreelanceCardImpl)