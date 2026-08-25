interface FilterSectionProps {
  title: string
  children: React.ReactNode
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div>
      <h3 className="mb-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fg/40">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-edge/15 bg-panel/50 px-6 py-16 text-center">
      <p className="font-[var(--font-display)] text-2xl font-bold text-fg">Nothing matches — yet.</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-fg/55">
        Try loosening a filter or two, or check back after the next scrape cycle.
      </p>
      <button
        type="button"
        onClick={onReset}
        data-cursor-hover
        className="mt-6 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
      >
        Reset filters
      </button>
    </div>
  )
}