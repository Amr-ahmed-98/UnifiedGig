'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { SlidersHorizontal } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { FilterPill } from '@/components/filter-pill'
import { FilterSection, EmptyState } from '@/components/filter-section'
import { FreelanceCard } from '@/components/freelance-card'
import { SkeletonList } from '@/components/card-skeleton'
import { MeshBackground } from '@/components/mesh-background'
import { freelanceSources } from '@/data/sources'
import type { FreelanceProject } from '@/types/freelance'

const PAGE_SIZE = 24

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export default function FreelancePage() {
  const [projects, setProjects] = useState<FreelanceProject[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [activeSources, setActiveSources] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debouncedQuery = useDebouncedValue(query, 300)

  const buildParams = (skip: number) => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (activeSources.length) params.set('source', activeSources.join(','))
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(skip))
    return params
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/freelance?${buildParams(0)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load projects')
        return res.json()
      })
      .then((data: { projects: FreelanceProject[]; total: number }) => {
        if (!cancelled) {
          setProjects(data.projects)
          setTotal(data.total)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeSources])

  const loadMore = () => {
    setLoadingMore(true)
    fetch(`/api/freelance?${buildParams(projects.length)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load projects')
        return res.json()
      })
      .then((data: { projects: FreelanceProject[]; total: number }) => {
        setProjects((prev) => [...prev, ...data.projects])
        setTotal(data.total)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projects'))
      .finally(() => setLoadingMore(false))
  }

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const allSkills = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.skills))).sort(),
    [projects]
  )

  const results = useMemo(() => {
    return projects.filter((p) => {
      if (skills.length && !p.skills.some((s) => skills.includes(s))) return false
      return true
    })
  }, [projects, skills])

  const reset = () => {
    setQuery('')
    setSkills([])
    setActiveSources([])
  }

  const filterPanel = (
    <div className="space-y-7 rounded-3xl border border-edge/10 bg-panel/70 p-6">
      <FilterSection title="Source site">
        {freelanceSources.map((s) => (
          <FilterPill
            key={s.id}
            label={s.name}
            color={s.color}
            dot
            active={activeSources.includes(s.id)}
            onClick={() => toggle(activeSources, s.id, setActiveSources)}
          />
        ))}
      </FilterSection>

      {allSkills.length > 0 && (
        <FilterSection title="Skill tags">
          {allSkills.map((s) => (
            <FilterPill
              key={s}
              label={s}
              color="#22E0D6"
              active={skills.includes(s)}
              onClick={() => toggle(skills, s, setSkills)}
            />
          ))}
        </FilterSection>
      )}

      <button
        type="button"
        onClick={reset}
        data-cursor-hover
        className="w-full rounded-full border border-edge/15 py-2.5 text-sm font-semibold text-fg/70 transition-colors hover:border-coral hover:text-coral"
      >
        Clear all filters
      </button>
    </div>
  )

  return (
    <main className="relative w-full bg-canvas pb-24">
      <section className="relative isolate overflow-hidden border-b border-edge/10 px-5 pb-12 pt-14 sm:px-8">
        <MeshBackground variant="mesh" intensity="soft" />
        <div className="relative mx-auto max-w-6xl">
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-coral">
            {freelanceSources.length} freelance marketplaces, merged
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Briefs worth
            <span className="text-coral"> bidding on.</span>
          </h1>
          <div className="mt-8 max-w-3xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              label="Search freelance projects"
              accent="#FF5C38"
              placeholder="Search projects, descriptions…"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-8 px-5 sm:px-8 lg:flex-row">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            data-cursor-hover
            className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-5 py-3 text-sm font-bold text-fg shadow-[inset_0_0_0_1px_rgba(10,6,22,0.12)]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          {filtersOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden pt-4">
              {filterPanel}
            </motion.div>
          )}
        </div>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <section aria-label="Freelance project results" className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="font-[var(--font-display)] text-lg font-bold text-fg">
              {loading ? 'Aggregating…' : `${total} projects`}
            </p>
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-widest text-fg/40">Sorted by deadline</p>
          </div>

          {error && !loading && (
            <div className="rounded-3xl border border-coral/30 bg-coral/10 px-6 py-4 text-sm text-coral">{error}</div>
          )}

          {loading ? (
            <SkeletonList count={4} />
          ) : results.length === 0 ? (
            <EmptyState onReset={reset} />
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {results.map((project, i) => (
                  <FreelanceCard key={project.id} project={project} index={i} />
                ))}
              </div>
              {projects.length < total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-cursor-hover
                  className="mt-6 w-full rounded-full border border-edge/15 py-3 text-sm font-bold text-fg transition-colors hover:border-lime/50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more projects'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}