'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'motion/react'

export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { duration: 1500, bounce: 0 })

  useEffect(() => {
    if (isInView) motionVal.set(value)
  }, [isInView, value])

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = Math.floor(latest).toLocaleString() + suffix
    })
  }, [spring, suffix])

  return <motion.span ref={ref}>0</motion.span>
}