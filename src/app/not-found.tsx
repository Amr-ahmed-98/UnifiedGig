import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Not found',
    robots: { index: false, follow: true },
}

/**
 * Shared links outlive listings — social posts expire after 48h and scraped
 * jobs get swept — so this page is a normal destination, not an edge case.
 * It pushes the reader back into the live feeds instead of dead-ending.
 */
export default function NotFound() {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col items-start px-4 pb-24 pt-32 sm:px-6">
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-fg/60">
                404 — gone
            </p>
            <h1 className="mt-4 font-[var(--font-display)] text-3xl font-bold leading-tight text-fg sm:text-4xl">
                This listing is no longer available
            </h1>
            <p className="mt-4 text-base text-fg/60">
                It may have expired, been filled, or been removed from its source. The live feeds are
                updated every 30 minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link
                    href="/jobs"
                    data-cursor-hover
                    className="inline-flex items-center rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5"
                >
                    Browse jobs
                </Link>
                <Link
                    href="/freelance"
                    data-cursor-hover
                    className="inline-flex items-center rounded-full bg-panel-2 px-5 py-2.5 text-sm font-semibold text-fg/80 transition-colors hover:text-fg"
                >
                    Freelance projects
                </Link>
                <Link
                    href="/social-jobs"
                    data-cursor-hover
                    className="inline-flex items-center rounded-full bg-panel-2 px-5 py-2.5 text-sm font-semibold text-fg/80 transition-colors hover:text-fg"
                >
                    Social jobs
                </Link>
            </div>
        </main>
    )
}
