'use client'

import { useTheme } from 'next-themes'
import { motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      data-cursor-hover
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="relative flex h-9 w-16 items-center rounded-full border border-edge/15 bg-panel-2 px-1"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink"
        style={{ marginLeft: isDark ? 'auto' : 0, background: isDark ? '#CCFF00' : '#FF5C38' }}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </motion.div>
    </button>
  )
}