'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Briefcase, Palette, Sparkles, Zap } from 'lucide-react'
import { MeshBackground } from '@/components/mesh-background'
import { AnimatedCounter } from '@/components/animated-counter'
import { sources } from '@/data/sources'

interface StatsData {
  jobs: number
  projects: number
  total: number
  sourcesCount: number
}

export default function LandingPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stats')
        return res.json()
      })
      .then((data: StatsData) => {
        setStatsData(data)
      })
      .catch((err) => {
        console.error('Could not fetch real counts:', err)
      })
  }, [])

  const cards = [
    {
      to: '/jobs',
      eyebrow: 'Full-time & contract',
      title: 'Browse Jobs',
      body: 'Salaried roles from LinkedIn, Indeed, Glassdoor, Wuzzuf, and Tanqeeb — deduped, tagged, ranked by freshness.',
      color: '#CCFF00',
      textClass: 'text-lime-deep dark:text-lime',
      Icon: Briefcase,
      count: statsData?.jobs ?? 0,
      countLabel: 'roles',
    },
    {
      to: '/freelance',
      eyebrow: 'Freelance & fractional',
      title: 'Browse Freelance Projects',
      body: 'Fixed-price and hourly gigs from Freelancer, Nafezly and Mostaql — budgets up front, deadlines flagged.',
      color: '#FF5C38',
      textClass: 'text-coral',
      Icon: Palette,
      count: statsData?.projects ?? 0,
      countLabel: 'projects',
    },
  ]

  const stats = [
    { value: statsData?.total ?? 0, label: 'Live listings' },
    { value: statsData?.sourcesCount ?? sources.length, label: 'Sources merged' },
    { value: 30, suffix: ' min', label: 'Refresh cycle' },
  ]

  return (
    <main className="relative w-full overflow-hidden bg-canvas">
      <section className="relative isolate min-h-[88vh] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <MeshBackground variant="mesh" />

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-lime-deep dark:text-lime"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {sources.length} platforms merged. One feed.
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-7 font-[var(--font-display)] text-5xl font-bold leading-[0.95] tracking-tight text-fg sm:text-7xl lg:text-8xl"
          >
            Stop tab-hopping.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-lime-deep dark:text-lime">Start landing.</span>
              <span aria-hidden className="absolute inset-x-0 bottom-2 z-0 h-4 -rotate-1 bg-grape/50 sm:bottom-3 sm:h-6" />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-fg/65 sm:text-xl"
          >
            UnifiedGig pulls every job listing and freelance brief you care about into a single, ruthlessly organized feed — so the search stops eating your week.
          </motion.p>

          <div className="mt-14 grid gap-5 text-left sm:mt-16 md:grid-cols-2">
            {cards.map((c, i) => (
              <motion.div
                key={c.to}
                initial={{ opacity: 0, y: 34 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 + i * 0.1 }}
              >
                <Link
                  href={c.to}
                  data-cursor-hover
                  className="group relative block h-full overflow-hidden rounded-[2rem] border border-edge/10 bg-panel/80 p-7 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:rotate-[-0.6deg] sm:p-9"
                >
                  <span aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-45" style={{ background: c.color }} />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: c.color }} />

                  <div className="relative">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-ink transition-all duration-500 group-hover:rotate-[-10deg] group-hover:scale-110" style={{ background: c.color }}>
                      <c.Icon className="h-7 w-7" strokeWidth={2.25} />
                    </span>

                    <p className="mt-6 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-fg/40">{c.eyebrow}</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-3xl font-bold leading-tight text-fg sm:text-4xl">{c.title}</h2>
                    <p className="mt-3 text-base leading-relaxed text-fg/60">{c.body}</p>

                    <span className="mt-7 flex items-center justify-between">
                      <span className={`font-[var(--font-mono)] text-xs uppercase tracking-widest ${c.textClass}`}>
                        <AnimatedCounter value={c.count} /> {c.countLabel}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-edge/15 text-fg transition-all duration-300 group-hover:border-transparent">
                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Sources we aggregate" className="relative border-y border-edge/10 bg-panel/60 py-6">
        <div className="flex overflow-hidden">
          <div className="ug-marquee flex shrink-0 items-center gap-10 pr-10">
            {[...sources, ...sources, ...sources, ...sources].map((s, i) => (
              <span key={`${s.id}-${i}`} className="flex shrink-0 items-center gap-2.5 font-[var(--font-display)] text-xl font-bold text-fg/45 sm:text-2xl">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="rounded-3xl border border-edge/10 bg-panel/60 p-6 transition-colors duration-300 hover:border-lime/40"
            >
              <p className="font-[var(--font-display)] text-3xl font-bold text-fg sm:text-4xl">
                <AnimatedCounter value={s.value} suffix={s.suffix ?? ''} />
              </p>
              <p className="mt-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-fg/45">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-edge/10 bg-panel-2 px-7 py-16 text-center sm:px-12">
          <MeshBackground variant="shapes" intensity="soft" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-[var(--font-display)] text-4xl font-bold leading-[1.05] text-fg sm:text-6xl">
              One feed. Every opportunity.
              <span className="text-coral"> Zero noise.</span>
            </h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/jobs" data-cursor-hover className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-7 py-4 font-[var(--font-display)] text-base font-bold text-ink transition-transform duration-300 hover:-translate-y-1 sm:w-auto">
                <Zap className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                Browse jobs
              </Link>
              <Link href="/freelance" data-cursor-hover className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-fg/25 px-7 py-4 font-[var(--font-display)] text-base font-bold text-fg transition-all duration-300 hover:-translate-y-1 hover:border-coral hover:text-coral sm:w-auto">
                Browse freelance projects
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-edge/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-fg/40 sm:flex-row">
          <p className="font-[var(--font-display)] font-bold text-fg/70">Unified<span className="text-lime-deep dark:text-lime">Gig</span></p>
          <p>© 2026 UnifiedGig. Aggregated with care.</p>
        </div>
      </footer>
    </main>
  )
}