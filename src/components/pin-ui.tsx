'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Zap } from 'lucide-react'

/** Returns true when an ISO date string is within the last `hours` hours. */
export function isNew(createdAt: string | null | undefined, hours = 24): boolean {
    if (!createdAt) return false
    return Date.now() - new Date(createdAt).getTime() < hours * 3_600_000
}

interface NewSectionProps {
    count: number
    children: React.ReactNode
}

/**
 * Animated "New · N" header + left-border accent container.
 * Renders only when count > 0 and exits gracefully when items age out.
 */
export function NewSection({ count, children }: NewSectionProps) {
    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    key="new-section"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-6"
                >
                    {/* Header row */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime/20 dark:bg-lime/15">
                            <Zap className="h-3 w-3 fill-lime-text text-lime-text" aria-hidden="true" />
                        </span>

                        <p className="font-[var(--font-display)] text-sm font-bold text-fg">
                            New
                            <span className="ml-1.5 font-[var(--font-mono)] text-xs font-normal text-fg/50">
                                · {count}
                            </span>
                        </p>

                        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-fg/40">
                            Added in the last 24 h
                        </p>
                    </div>

                    {/* Cards container with lime left-border accent */}
                    <div className="relative pl-0">
                        <span
                            aria-hidden="true"
                            className="absolute -left-3 top-0 h-full w-0.5 rounded-full bg-lime/35"
                        />
                        {children}
                    </div>

                    {/* "All items" divider */}
                    <div className="mt-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-edge/10" />
                        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-fg/40">
                            All items
                        </span>
                        <span className="h-px flex-1 bg-edge/10" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
