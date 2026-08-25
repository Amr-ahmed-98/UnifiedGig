'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  accent?: string
  label: string
}

export function SearchBar({ value, onChange, placeholder, accent = '#CCFF00', label }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className="relative rounded-full transition-all duration-300"
      style={{
        boxShadow: focused
          ? `0 0 0 2px ${accent}, 0 0 44px -6px ${accent}80`
          : 'inset 0 0 0 1px rgba(10,6,22,0.12)',
      }}
    >
      <label htmlFor="ug-search" className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-300 text-fg/50"
        style={{ color: focused ? accent : undefined }}
        aria-hidden="true"
      />
      <input
        id="ug-search"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-full bg-panel/80 py-4 pl-14 pr-12 font-[var(--font-display)] text-base text-fg outline-none placeholder:text-fg/40 sm:text-lg"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-fg/60 transition-colors hover:bg-panel-2 hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}