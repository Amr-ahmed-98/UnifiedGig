import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Accent colors like lime (#CCFF00) vanish as text on the light canvas. Mixing the
 * accent with the theme foreground keeps its hue but stays readable in both themes.
 */
export function readableTint(color: string) {
  return `color-mix(in srgb, ${color} 65%, var(--ug-fg))`
}
