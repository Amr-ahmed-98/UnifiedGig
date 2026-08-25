'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { SlidersHorizontal } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { FilterPill } from '@/components/filter-pill'
import { FilterSection, EmptyState } from '@/components/filter-section'
import { JobCard } from '@/components/job-card'
import { SkeletonList } from '@/components/card-skeleton'
import { MeshBackground } from '@/components/mesh-background'
import { jobSources } from '@/data/sources'
import type { Job, WorkMode } from '@/types/job'
import { workModeOf } from '@/types/job'

const modeOptions: { id: WorkMode; label: string; color: string }[] = [
  { id: 'remote', label: 'Remote', color: '#CCFF00' },
  { id: 'hybrid', label: 'Hybrid', color: '#22E0D6' },
  { id: 'onsite', label: 'On-site', color: '#FF5C38' },
]

const PAGE_SIZE = 24

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [modes, setModes] = useState<WorkMode[]>([])
  const [activeSources, setActiveSources] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Debounce free-text inputs so every keystroke doesn't trigger a fetch +
  // re-filter of the whole list — that's what was stalling the UI while typing.
  const debouncedQuery = useDebouncedValue(query, 300)
  const debouncedLocation = useDebouncedValue(location, 300)

  const buildParams = (skip: number) => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (debouncedLocation.trim()) params.set('location', debouncedLocation.trim())
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(skip))
    return params
  }

  // Initial + filter-change fetch: only pulls one page from the server instead
  // of the entire jobs table, which is what made the page (and the cursor,
  // since it shares the main thread) freeze up while "loading" before.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/jobs?${buildParams(0)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load jobs')
        return res.json()
      })
      .then((data: { jobs: Job[]; total: number }) => {
        if (!cancelled) {
          setJobs(data.jobs)
          setTotal(data.total)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load jobs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, debouncedLocation])

  const loadMore = () => {
    setLoadingMore(true)
    fetch(`/api/jobs?${buildParams(jobs.length)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load jobs')
        return res.json()
      })
      .then((data: { jobs: Job[]; total: number }) => {
        setJobs((prev) => [...prev, ...data.jobs])
        setTotal(data.total)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load jobs'))
      .finally(() => setLoadingMore(false))
  }

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const results = useMemo(() => {
    return jobs.filter((j) => {
      if (modes.length && !modes.includes(workModeOf(j))) return false
      if (activeSources.length && !activeSources.includes(j.source)) return false
      return true
    })
  }, [jobs, modes, activeSources])

  const reset = () => {
    setQuery('')
    setLocation('')
    setModes([])
    setActiveSources([])
  }

  const filterPanel = (
    <div className="space-y-7 rounded-3xl border border-edge/10 bg-panel/70 p-6">
      <FilterSection title="Work mode">
        {modeOptions.map((o) => (
          <FilterPill
            key={o.id}
            label={o.label}
            color={o.color}
            active={modes.includes(o.id)}
            onClick={() => toggle(modes, o.id, setModes)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Source site">
        {jobSources.map((s) => (
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

      <div>
        <label htmlFor="job-location" className="mb-3 block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fg/40">
          Location
        </label>
        <input
          id="job-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, or “anywhere”"
          className="w-full rounded-full bg-panel-2/60 px-4 py-3 text-sm text-fg shadow-[inset_0_0_0_1px_rgba(10,6,22,0.10)] outline-none transition-shadow duration-300 placeholder:text-fg/35 focus:shadow-[0_0_0_2px_#CCFF00]"
        />
      </div>

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
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-lime-deep dark:text-lime">
            {jobSources.length} job boards, merged
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Every open role,
            <span className="text-lime-deep dark:text-lime"> one feed.</span>
          </h1>
          <div className="mt-8 max-w-3xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              label="Search jobs"
              accent="#CCFF00"
              placeholder="Search titles, companies…"
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

        <section aria-label="Job results" className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="font-[var(--font-display)] text-lg font-bold text-fg">
              {loading ? 'Aggregating…' : `${total} roles`}
            </p>
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-widest text-fg/40">Sorted by freshness</p>
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
              <div className="space-y-4">
                {results.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} />
                ))}
              </div>
              {jobs.length < total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-cursor-hover
                  className="mt-6 w-full rounded-full border border-edge/15 py-3 text-sm font-bold text-fg transition-colors hover:border-lime/50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more roles'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}