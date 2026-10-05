'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  FolderGit2,
  GraduationCap,
  Newspaper,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import { hostOf, materialTypeMeta, sharedAgoLabel, type LearningMaterial, type MaterialType } from '@/types/material'

export const materialTypeIcons: Record<MaterialType, LucideIcon> = {
  course: GraduationCap,
  video: PlayCircle,
  article: Newspaper,
  docs: FileText,
  book: BookOpen,
  repo: FolderGit2,
}

function MaterialCardImpl({ material, index }: { material: LearningMaterial; index: number }) {
  const meta = materialTypeMeta[material.type]
  const Icon = materialTypeIcons[material.type]

  return (
    <motion.a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      data-cursor-hover
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
      className="group flex items-start gap-4 rounded-3xl border border-edge/10 bg-panel/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-edge/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `${meta.color}22`, color: meta.color }}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-[var(--font-mono)] text-[11px]">
          <span className="font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="truncate text-fg/60">· {hostOf(material.url)}</span>
        </p>
        <h3 className="mt-1 break-words font-[var(--font-display)] text-lg font-bold leading-snug text-fg">
          {material.title}
        </h3>
        {material.description && <p className="mt-1.5 text-sm text-fg/70">{material.description}</p>}
        <p className="mt-3 font-[var(--font-mono)] text-[11px] text-fg/60">
          Shared by the community · {sharedAgoLabel(material.createdAt)}
        </p>
      </div>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-2 text-fg transition-colors group-hover:bg-lime group-hover:text-ink">
        <ArrowUpRight className="h-4 w-4" />
        <span className="sr-only">Open {material.title}</span>
      </span>
    </motion.a>
  )
}

export const MaterialCard = memo(MaterialCardImpl)
