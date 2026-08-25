'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { Menu, X, Zap } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/freelance', label: 'Freelance' },
]

export function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-edge/10 bg-canvas/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" data-cursor-hover className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-ink transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
            <Zap className="h-5 w-5" strokeWidth={2.75} />
          </span>
          <span className="relative inline-block">
            <span className="relative z-10 font-[var(--font-display)] text-xl font-bold tracking-tight text-fg">
              Unified<span className="text-lime-deep dark:text-lime">Gig</span>
            </span>
            <span aria-hidden className="absolute inset-x-0 -bottom-0.5 z-0 h-[3px] rounded-full bg-grape/60" />
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.to
            return (
              <Link
                key={l.to}
                href={l.to}
                data-cursor-hover
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'text-ink' : 'text-fg/70 hover:text-fg'}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-lime"
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            )
          })}
          <div className="ml-3">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="rounded-xl border border-edge/15 p-2 text-fg transition-colors hover:bg-panel-2"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-t border-edge/10 bg-panel md:hidden"
        >
          <div className="flex flex-col gap-1 px-5 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  pathname === l.to ? 'bg-lime text-ink' : 'text-fg/80 hover:bg-panel-2'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </header>
  )
}