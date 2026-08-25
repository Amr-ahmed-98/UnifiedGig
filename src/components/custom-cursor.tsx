'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

export function CustomCursor() {
  const [variant, setVariant] = useState<'default' | 'hover'>('default')
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 500, damping: 40 })
  const springY = useSpring(y, { stiffness: 500, damping: 40 })

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 16)
      y.set(e.clientY - 16)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])

  useEffect(() => {
    // Delegated on document instead of querying [data-cursor-hover] once on
    // mount — the old version missed job cards etc. that load in later,
    // and re-scanning the DOM on every data change would itself be a perf hit.
    const over = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-cursor-hover]')) setVariant('hover')
    }
    const out = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-cursor-hover]')) setVariant('default')
    }
    document.addEventListener('mouseover', over)
    document.addEventListener('mouseout', out)
    return () => {
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseout', out)
    }
  }, [])

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-9999 hidden rounded-full mix-blend-difference md:block"
      style={{ x: springX, y: springY, backgroundColor: '#fff' }}
      animate={{
        width: variant === 'hover' ? 56 : 32,
        height: variant === 'hover' ? 56 : 32,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    />
  )
}