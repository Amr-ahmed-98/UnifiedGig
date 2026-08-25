'use client'

import { motion } from 'motion/react'

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  color?: string
  dot?: boolean
  count?: number
}

export function FilterPill({ label, active, onClick, color = '#CCFF00', dot = false, count }: FilterPillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      data-cursor-hover
      className={`group relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
        active ? '' : 'bg-panel-2/70 text-fg/78 ring-1 ring-inset ring-edge/10'
      }`}
      style={
        active
          ? { background: color, color: '#0A0616', boxShadow: `0 8px 24px -10px ${color}` }
          : undefined
      }
    >
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
          style={{ background: active ? '#0A0616' : color }}
        />
      )}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`rounded-full px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] ${
            active ? '' : 'bg-panel'
          }`}
          style={active ? { background: 'rgba(10,6,22,0.14)' } : undefined}
        >
          {count}
        </span>
      )}
    </motion.button>
  )
}