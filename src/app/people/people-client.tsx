'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { FilterPill } from '@/components/filter-pill'
import { FilterSection, EmptyState } from '@/components/filter-section'
import { SkeletonList } from '@/components/card-skeleton'
import { MeshBackground } from '@/components/mesh-background'
import { ProfileCard } from '@/components/profile-card'
import { AddProfileModal } from '@/components/add-profile-modal'
import { PLATFORMS, platformMeta, type FollowProfile, type Platform } from '@/types/profile'

const PAGE_SIZE = 24

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

interface ApiResult {
  profiles: FollowProfile[]
  total: number
  counts?: Record<string, number>
}

const plural = (n: number) => `${n} ${n === 1 ? 'profile' : 'profiles'}`

function PeopleClient() {
  const [profiles, setProfiles] = useState<FollowProfile[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const debouncedQuery = useDebouncedValue(query, 300)

  const buildParams = (skip: number) => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (platforms.length) params.set('platform', platforms.join(','))
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(skip))
    return params
  }

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading state before refetching on filter change
    setLoading(true)
    setError(null)
    fetch(`/api/profiles?${buildParams(0)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profiles')
        return res.json()
      })
      .then((data: ApiResult) => {
        if (cancelled) return
        setProfiles(data.profiles || [])
        setTotal(data.total)
        setCounts(data.counts ?? {})
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profiles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildParams is derived from the listed deps
  }, [debouncedQuery, platforms, refreshKey])

  const loadMore = () => {
    setLoadingMore(true)
    fetch(`/api/profiles?${buildParams(profiles.length)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profiles')
        return res.json()
      })
      .then((data: ApiResult) => {
        setProfiles((prev) => {
          const seen = new Set(prev.map((p) => p.id))
          return [...prev, ...(data.profiles || []).filter((p) => !seen.has(p.id))]
        })
        setTotal(data.total)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profiles'))
      .finally(() => setLoadingMore(false))
  }

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((v) => v !== p) : [...prev, p]))

  const reset = () => {
    setQuery('')
    setPlatforms([])
  }

  const allProfiles = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null
  const hasFilters = platforms.length > 0 || query.trim().length > 0

  const filterPanel = (
    <div className="space-y-7 rounded-3xl border border-edge/10 bg-panel/70 p-6">
      <FilterSection title="Platform">
        {PLATFORMS.map((p) => (
          <FilterPill
            key={p}
            label={platformMeta[p].label}
            color={platformMeta[p].color}
            dot
            count={counts?.[p] ?? 0}
            active={platforms.includes(p)}
            onClick={() => togglePlatform(p)}
          />
        ))}
      </FilterSection>

      <button
        type="button"
        onClick={reset}
        disabled={!hasFilters}
        data-cursor-hover
        className="w-full rounded-full border border-edge/15 py-2.5 text-sm font-semibold text-fg/70 transition-colors hover:border-coral hover:text-coral disabled:pointer-events-none disabled:opacity-40"
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
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-lime-text">
            People to follow
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Follow the people{' '}
            <span className="block text-lime-text">who post the jobs.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm text-fg/70 sm:text-base">
            Recruiters, hiring managers and community pages that share openings on LinkedIn, Facebook and beyond.
            Know someone good? Add them.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                label="Search profiles"
                placeholder="Search names, roles they post…"
              />
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              data-cursor-hover
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-4 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Add profile
            </button>
          </div>

          <p className="mt-6 min-h-4 font-[var(--font-mono)] text-[11px] text-fg/60">
            {allProfiles !== null && plural(allProfiles)}
          </p>
        </div>
      </section>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-8 px-5 sm:px-8 lg:flex-row">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            data-cursor-hover
            className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-5 py-3 text-sm font-bold text-fg ring-1 ring-inset ring-edge/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters{platforms.length > 0 && ` (${platforms.length})`}
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

        <section aria-label="Profiles" className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <p className="font-[var(--font-display)] text-lg font-bold text-fg">
              {loading ? 'Loading…' : plural(total)}
            </p>
            <p className="font-[var(--font-mono)] text-[11px] text-fg/60">Recently added</p>
          </div>

          {error && !loading && (
            <div className="mb-4 rounded-3xl border border-coral/30 bg-coral/10 px-6 py-4 text-sm text-coral-text">{error}</div>
          )}

          {loading ? (
            <SkeletonList count={4} />
          ) : profiles.length === 0 ? (
            hasFilters ? (
              <EmptyState onReset={reset} />
            ) : (
              <div className="rounded-3xl border border-dashed border-edge/15 bg-panel/50 px-6 py-16 text-center">
                <p className="font-[var(--font-display)] text-2xl font-bold text-fg">No profiles yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-fg/60">
                  Be the first to add a recruiter, hiring manager or page that posts jobs.
                </p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  data-cursor-hover
                  className="mt-6 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Add profile
                </button>
              </div>
            )
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {profiles.map((p, i) => (
                  <ProfileCard key={p.id} profile={p} index={i} />
                ))}
              </div>
              {profiles.length < total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-cursor-hover
                  className="mt-6 w-full rounded-full border border-edge/15 py-3 text-sm font-bold text-fg transition-colors hover:border-lime/50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more profiles'}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <AddProfileModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          reset()
          setRefreshKey((k) => k + 1)
        }}
      />
    </main>
  )
}

export default PeopleClient
