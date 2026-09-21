import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { ShareMenu } from '@/components/share-menu'

/**
 * The landing page a shared link opens.
 *
 * Every share now points at UnifiedGig instead of the source site, so this is
 * the first thing the reader sees: the full listing, the same visual language
 * as the feed cards, a share menu to pass it on further, and a clear button
 * out to the original post.
 */

export interface DetailFact {
    label: string
    value: string
}

export interface ListingDetailProps {
    /** Small line above the title, e.g. "Job · via LinkedIn". */
    eyebrow: string
    /** Source accent colour. */
    accent: string
    title: string
    subtitle?: string | null
    description?: string | null
    facts?: DetailFact[]
    tags?: string[]
    /** Original post on the source site. */
    originalUrl: string
    originalLabel: string
    /** Canonical UnifiedGig URL of this listing — what the share menu hands out. */
    shareUrl: string
    shareLabel: string
    backHref: string
    backLabel: string
}

export function ListingDetail({
    eyebrow,
    accent,
    title,
    subtitle = null,
    description = null,
    facts = [],
    tags = [],
    originalUrl,
    originalLabel,
    shareUrl,
    shareLabel,
    backHref,
    backLabel,
}: ListingDetailProps) {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-24 sm:px-6">
            <Link
                href={backHref}
                data-cursor-hover
                className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-fg/60 transition-colors hover:text-fg"
            >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {backLabel}
            </Link>

            <article className="relative mt-6 overflow-hidden rounded-3xl bg-panel/80 p-[1.5px]">
                <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-3xl opacity-60"
                    style={{ background: `linear-gradient(130deg, ${accent}, transparent 60%, #8B5CF6)` }}
                />

                <div className="relative rounded-[calc(1.5rem-1px)] bg-panel p-6 sm:p-9">
                    <div className="flex items-start justify-between gap-4">
                        <p className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-fg/60">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} aria-hidden="true" />
                            {eyebrow}
                        </p>
                        <ShareMenu url={shareUrl} title={title} subtitle={subtitle} label={shareLabel} />
                    </div>

                    <h1 className="mt-5 font-[var(--font-display)] text-3xl font-bold leading-tight text-fg sm:text-4xl">
                        {title}
                    </h1>
                    {subtitle && <p className="mt-2 text-base font-medium text-fg/60">{subtitle}</p>}

                    {facts.length > 0 && (
                        <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-edge/10 pt-6 sm:grid-cols-3">
                            {facts.map((fact) => (
                                <div key={fact.label}>
                                    <dt className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-fg/60">
                                        {fact.label}
                                    </dt>
                                    <dd className="mt-1 font-[var(--font-display)] text-base font-bold text-fg">
                                        {fact.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-panel-2 px-3 py-1 text-xs font-semibold text-fg/70"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {description && (
                        <div className="mt-7 border-t border-edge/10 pt-6">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-fg/70">{description}</p>
                        </div>
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-edge/10 pt-6">
                        <a
                            href={originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cursor-hover
                            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            {originalLabel}
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <Link
                            href={backHref}
                            data-cursor-hover
                            className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-5 py-2.5 text-sm font-semibold text-fg/80 transition-colors hover:text-fg"
                        >
                            {backLabel}
                        </Link>
                    </div>
                </div>
            </article>
        </main>
    )
}
