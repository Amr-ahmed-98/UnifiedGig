'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { FilterPill } from '@/components/filter-pill'
import { FilterSection, EmptyState } from '@/components/filter-section'
import { SkeletonList } from '@/components/card-skeleton'
import { MeshBackground } from '@/components/mesh-background'
import { PromptCard } from '@/components/prompt-card'
import { AddPromptModal } from '@/components/add-prompt-modal'
import { PROMPT_CATEGORIES, promptCategoryMeta, type Prompt, type PromptCategory } from '@/types/prompt'

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
  prompts: Prompt[]
  total: number
  counts?: { categories: Record<string, number> }
}

function PromptsClient() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [total, setTotal] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<PromptCategory[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const debouncedQuery = useDebouncedValue(query, 300)

  const buildParams = (skip: number) => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (categories.length) params.set('category', categories.join(','))
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(skip))
    return params
  }

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading state before refetching on filter change
    setLoading(true)
    setError(null)
    fetch(`/api/prompts?${buildParams(0)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load prompts')
        return res.json()
      })
      .then((data: ApiResult) => {
        if (cancelled) return
        setPrompts(data.prompts || [])
        setTotal(data.total)
        setCategoryCounts(data.counts?.categories ?? {})
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load prompts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildParams is derived from the listed deps
  }, [debouncedQuery, categories, refreshKey])

  const loadMore = () => {
    setLoadingMore(true)
    fetch(`/api/prompts?${buildParams(prompts.length)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load prompts')
        return res.json()
      })
      .then((data: ApiResult) => {
        setPrompts((prev) => {
          const seen = new Set(prev.map((p) => p.id))
          return [...prev, ...(data.prompts || []).filter((p) => !seen.has(p.id))]
        })
        setTotal(data.total)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load prompts'))
      .finally(() => setLoadingMore(false))
  }

  const toggleCategory = (c: PromptCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]))

  const reset = () => {
    setQuery('')
    setCategories([])
  }

  const library = Object.values(categoryCounts).reduce((a, b) => a + b, 0)
  const hasFilters = categories.length > 0 || query.trim().length > 0

  const filterPanel = (
    <div className="space-y-7 rounded-3xl border border-edge/10 bg-panel/70 p-5 sm:p-6">
      <FilterSection title="Use it for">
        {PROMPT_CATEGORIES.map((c) => (
          <FilterPill
            key={c}
            label={promptCategoryMeta[c].label}
            color={promptCategoryMeta[c].color}
            dot
            count={categoryCounts[c] ?? 0}
            active={categories.includes(c)}
            onClick={() => toggleCategory(c)}
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
            AI prompt library
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold leading-[1.02] text-fg sm:text-6xl">
            Better prompts,{' '}
            <span className="block text-lime-text">better output.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm text-fg/70 sm:text-base">
            Copy-ready prompts for code, images, video, writing and your job search. Fill in the [brackets], paste
            into your AI tool, done.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                label="Search prompts"
                placeholder="Search prompts, tools…"
              />
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              data-cursor-hover
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-4 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Share a prompt
            </button>
          </div>
          <p className="mt-6 font-[var(--font-mono)] text-[11px] text-fg/60">
            {library} {library === 1 ? 'prompt' : 'prompts'}
          </p>
        </div>
      </section>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-8 px-5 sm:px-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-72">
          <div className="lg:sticky lg:top-24">{filterPanel}</div>
        </aside>

        <section aria-label="Prompts" className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <p className="font-[var(--font-display)] text-lg font-bold text-fg">
              {loading ? 'Loading…' : `${total} ${total === 1 ? 'prompt' : 'prompts'}`}
            </p>
            <p className="font-[var(--font-mono)] text-[11px] text-fg/60">Copy &amp; paste</p>
          </div>

          {error && !loading && (
            <div className="mb-4 rounded-3xl border border-coral/30 bg-coral/10 px-6 py-4 text-sm text-coral-text">{error}</div>
          )}

          {loading ? (
            <SkeletonList count={4} />
          ) : prompts.length === 0 ? (
            hasFilters ? (
              <EmptyState onReset={reset} />
            ) : (
              <div className="rounded-3xl border border-dashed border-edge/15 bg-panel/50 px-6 py-16 text-center">
                <p className="font-[var(--font-display)] text-2xl font-bold text-fg">No prompts yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-fg/60">Be the first to share a prompt that works.</p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  data-cursor-hover
                  className="mt-6 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Share a prompt
                </button>
              </div>
            )
          ) : (
            <>
              <div className="space-y-4">
                {prompts.map((p, i) => (
                  <PromptCard key={p.id} prompt={p} index={i} />
                ))}
              </div>
              {prompts.length < total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-cursor-hover
                  className="mt-6 w-full rounded-full border border-edge/15 py-3 text-sm font-bold text-fg transition-colors hover:border-lime/50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more prompts'}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <AddPromptModal
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

export default PromptsClient
