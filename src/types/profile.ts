import { isHttpUrl } from '@/types/material'

export const PLATFORMS = ['linkedin', 'facebook', 'x', 'instagram', 'telegram', 'other'] as const
export type Platform = (typeof PLATFORMS)[number]

export const platformMeta: Record<
    Platform,
    { label: string; color: string; hosts: string[]; placeholder: string }
> = {
    linkedin: { label: 'LinkedIn', color: '#22E0D6', hosts: ['linkedin.com', 'lnkd.in'], placeholder: 'https://linkedin.com/in/…' },
    facebook: { label: 'Facebook', color: '#3B82F6', hosts: ['facebook.com', 'fb.com', 'fb.me'], placeholder: 'https://facebook.com/…' },
    x: { label: 'X', color: '#9CA3AF', hosts: ['x.com', 'twitter.com'], placeholder: 'https://x.com/…' },
    instagram: { label: 'Instagram', color: '#FF5C38', hosts: ['instagram.com'], placeholder: 'https://instagram.com/…' },
    telegram: { label: 'Telegram', color: '#8B5CF6', hosts: ['t.me', 'telegram.me', 'telegram.org'], placeholder: 'https://t.me/…' },
    other: { label: 'Other', color: '#CCFF00', hosts: [], placeholder: 'https://…' },
}

export const PROFILE_LIMITS = { name: 80, headline: 100, postsAbout: 160 } as const

export interface FollowProfile {
    id: string
    platform: Platform
    name: string
    url: string
    headline: string | null
    postsAbout: string | null
    createdAt: string
}

export function isPlatform(v: unknown): v is Platform {
    return typeof v === 'string' && (PLATFORMS as readonly string[]).includes(v)
}

/** Dedup key: drops hash, "www.", trailing slashes. Returns the trimmed input if it isn't a URL. */
export function normalizeProfileUrl(raw: string): string {
    const trimmed = raw.trim()
    try {
        const u = new URL(trimmed)
        return `${u.protocol}//${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`
    } catch {
        return trimmed
    }
}

export function hostMatchesPlatform(raw: string, platform: Platform): boolean {
    const { hosts } = platformMeta[platform]
    if (hosts.length === 0) return true
    try {
        const host = new URL(raw).hostname.replace(/^www\./, '')
        return hosts.some((h) => host === h || host.endsWith(`.${h}`))
    } catch {
        return false
    }
}

export function platformMismatchMessage(platform: Platform) {
    return `That link doesn't look like a ${platformMeta[platform].label} link — pick "Other" if it's right`
}

/** First + last word initials ("Freelance Devs MENA" -> "FM"); one word -> first two letters. */
export function initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase()
    return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase()
}

export { isHttpUrl }
