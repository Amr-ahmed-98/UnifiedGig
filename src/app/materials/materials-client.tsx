'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  Brain,
  Cloud,
  Code2,
  Compass,
  Megaphone,
  Network,
  PenTool,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { EmptyState } from '@/components/filter-section'
import { MeshBackground } from '@/components/mesh-background'
import { learningFields, type LearningField } from '@/data/fields'

export const fieldIcons: Record<LearningField['icon'], LucideIcon> = {
  code: Code2,
  network: Network,
  shield: ShieldCheck,
  brain: Brain,
  pen: PenTool,
  cloud: Cloud,
  smartphone: Smartphone,
  compass: Compass,
  megaphone: Megaphone,
}

function MaterialsClient() {
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/materials?take=1')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { counts?: { fields: Record<string, number> } }) => {
        if (!cancelled) setCounts(data.counts?.fields ?? {})
      })
      .catch(() => {
        /* counts are decorative — page works without them */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return learningFields
    return learningFields.filter(
      (f) =>
        f.name.toLowerCase().includes(needle) ||
        f.blurb.toLowerCase().includes(needle) ||
        f.topics.some((t) => t.toLowerCase().includes(needle))
    )
  }, [query])

  const totalMaterials = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <main className="relative w-full bg-canvas pb-24">
      <section className="relative isolate overflow-hidden border-b border-edge/10 px-5 pb-12 pt-14 sm:px-8">
        <MeshBackground variant="mesh" intensity="soft" />
        <div className="relative mx-auto max-w-6xl">
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-lime-text">
            Community learning library
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Learn the field,{' '}
            <span className="block text-lime-text">land the role.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm text-fg/70 sm:text-base">
            Pick your field to see the courses, videos, docs and books people actually used to get hired — and share
            the links that helped you.
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              label="Search fields"
              placeholder="Search fields, topics…"
            />
          </div>
          <p className="mt-6 font-[var(--font-mono)] text-[11px] text-fg/60">
            {totalMaterials} materials · {learningFields.length} fields
          </p>
        </div>
      </section>

      <section aria-label="Fields" className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-fg">{results.length} fields</h2>
          <p className="font-[var(--font-mono)] text-[11px] text-fg/60">Pick one to browse</p>
        </div>

        {results.length === 0 ? (
          <EmptyState onReset={() => setQuery('')} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((f, i) => {
              const Icon = fieldIcons[f.icon]
              const n = counts[f.slug] ?? 0
              return (
                <motion.div
                  key={f.slug}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.35 }}
                >
                  <Link
                    href={`/materials/${f.slug}`}
                    data-cursor-hover
                    className="group flex h-full flex-col rounded-3xl border border-edge/10 bg-panel/70 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-lime/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15 text-lime-text ring-1 ring-inset ring-lime/30">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-[var(--font-mono)] text-[11px] text-fg/60">
                        {n} {n === 1 ? 'material' : 'materials'}
                      </span>
                    </div>
                    <h3 className="mt-6 font-[var(--font-display)] text-xl font-bold text-fg">{f.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-fg/70">{f.blurb}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {f.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-panel-2/70 px-3 py-1 font-[var(--font-mono)] text-[11px] text-fg/80 ring-1 ring-inset ring-edge/10"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-edge/10 pt-4">
                      <span className="text-sm font-semibold text-fg">Browse &amp; add</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-fg transition-colors group-hover:bg-lime group-hover:text-ink">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default MaterialsClient
