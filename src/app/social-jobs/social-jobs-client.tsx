'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { FilterPill } from '@/components/filter-pill'
import { FilterSection, EmptyState } from '@/components/filter-section'
import { SocialJobCard } from '@/components/social-job-card'
import { SkeletonList } from '@/components/card-skeleton'
import { MeshBackground } from '@/components/mesh-background'
import { EmbedLinkedInModal } from '@/components/embed-linkedin-modal'
import { SOCIAL_JOB_TAGS, hoursRemaining, type SocialJobPost } from '@/types/socialJob'

const PAGE_SIZE = 24

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function SocialJobsClient() {
  const [posts, setPosts] = useState<SocialJobPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debouncedQuery = useDebouncedValue(query, 300)

  const buildParams = (skip: number) => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (activeTags.length) activeTags.forEach((t) => params.append('tag', t))
    if (remoteOnly) params.set('remote', 'true')
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(skip))
    return params
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/social-jobs?${buildParams(0)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load posts')
        return res.json()
      })
      .then((data: { posts: SocialJobPost[]; total: number }) => {
        if (!cancelled) {
          setPosts(data.posts || [])
          setTotal(data.total)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load posts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeTags, remoteOnly])

  const loadMore = () => {
    setLoadingMore(true)
    fetch(`/api/social-jobs?${buildParams(posts.length)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load posts')
        return res.json()
      })
      .then((data: { posts: SocialJobPost[]; total: number }) => {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id))
          const fresh = (data.posts || []).filter((p) => !seen.has(p.id))
          return [...prev, ...fresh]
        })
        setTotal(data.total)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load posts'))
      .finally(() => setLoadingMore(false))
  }

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const reset = () => {
    setQuery('')
    setActiveTags([])
    setRemoteOnly(false)
  }

  const handleDiscard = async (id: string) => {
    const prev = posts
    setPosts((p) => p.filter((post) => post.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    try {
      const res = await fetch(`/api/social-jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to discard')
    } catch {
      setPosts(prev) // roll back on failure
    }
  }

  const expiringSoon = useMemo(
    () => posts.filter((p) => hoursRemaining(p.expiresAt) < 6).length,
    [posts]
  )

  const filterPanel = (
    <div className="space-y-7 rounded-3xl border border-edge/10 bg-panel/70 p-6">
      <FilterSection title="Tags">
        {SOCIAL_JOB_TAGS.map((tag) => (
          <FilterPill
            key={tag}
            label={tag}
            active={activeTags.includes(tag)}
            onClick={() => toggle(activeTags, tag, setActiveTags)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Work mode">
        <FilterPill label="Remote only" color="#CCFF00" active={remoteOnly} onClick={() => setRemoteOnly((v) => !v)} />
      </FilterSection>

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
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-lime-text">
            LinkedIn post feed &middot; auto-expires in 48h
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Social jobs,
            <span className="text-lime-text"> straight from LinkedIn.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-fg/70 sm:text-base">
            Paste a public LinkedIn post link. We pull in the title, author and salary so you
            don&apos;t have to leave the feed — every embed clears itself out after 48 hours.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                label="Search social jobs"
                accent="#22E0D6"
                placeholder="Search titles, posters…"
              />
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              data-cursor-hover
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" strokeWidth={2.75} />
              Embed LinkedIn Post
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-[var(--font-mono)] text-[11px] uppercase tracking-widest text-fg/60">
            <span>{total} active {total === 1 ? 'post' : 'posts'}</span>
            {expiringSoon > 0 && (
              <span className="text-coral-text">{expiringSoon} expiring within 6h</span>
            )}
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

        <section aria-label="Social job results" className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="font-[var(--font-display)] text-lg font-bold text-fg">
              {loading ? 'Loading…' : `${total} posts`}
            </p>
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-widest text-fg/60">Newest first</p>
          </div>

          {error && !loading && (
            <div className="rounded-3xl border border-coral/30 bg-coral/10 px-6 py-4 text-sm text-coral-text">{error}</div>
          )}

          {loading ? (
            <SkeletonList count={4} />
          ) : posts.length === 0 ? (
            <EmptyState onReset={reset} />
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <SocialJobCard key={post.id} post={post} index={i} onDiscard={handleDiscard} />
                ))}
              </div>
              {posts.length < total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-cursor-hover
                  className="mt-6 w-full rounded-full border border-edge/15 py-3 text-sm font-bold text-fg transition-colors hover:border-lime/50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more posts'}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <EmbedLinkedInModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onEmbedded={(post) => {
          setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)])
          setTotal((t) => t + 1)
        }}
      />
    </main>
  )
}

export default SocialJobsClient
