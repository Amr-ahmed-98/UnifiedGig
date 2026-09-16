export interface SocialJobPost {
    id: string
    title: string
    authorName: string | null
    authorTitle: string | null
    authorImageUrl: string | null
    description: string | null
    salary: string | null
    location: string | null
    remote: boolean
    tags: string[]
    recruiterContact: string | null
    imageUrl: string | null
    url: string
    source: string
    createdAt: string
    expiresAt: string
}

export const SOCIAL_JOB_TTL_HOURS = 48

export const SOCIAL_JOB_TAGS = [
    'Full-Time',
    'Contract',
    'Freelance',
    'Fractional',
    'Remote',
    'AI/ML',
    'Web3',
    'Design',
    'Backend',
    'Frontend',
] as const

export type SocialJobTag = (typeof SOCIAL_JOB_TAGS)[number]

const TAG_KEYWORDS: Record<SocialJobTag, RegExp> = {
    'Full-Time': /\bfull[\s-]?time\b/i,
    Contract: /\bcontract(?:or|ing)?\b/i,
    Freelance: /\bfreelance(?:r)?\b/i,
    Fractional: /\bfractional\b/i,
    Remote: /\bremote\b/i,
    'AI/ML': /\b(?:ai|ml|machine learning|artificial intelligence|llm|deep learning)\b/i,
    Web3: /\b(?:web3|blockchain|crypto|solidity|defi)\b/i,
    Design: /\b(?:design|figma|ui\/ux|\bux\b|\bui\b)\b/i,
    Backend: /\bback[\s-]?end\b/i,
    Frontend: /\bfront[\s-]?end\b/i,
}

/** Guesses classification tags from a post's title + description. Empty array means "let the user pick". */
export function detectTags(text: string): SocialJobTag[] {
    return SOCIAL_JOB_TAGS.filter((tag) => TAG_KEYWORDS[tag].test(text))
}

/** Hours left until a post is auto-removed. Clamped to 0. */
export function hoursRemaining(expiresAt: string): number {
    const ms = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, ms / 3_600_000)
}

/** Short "Xh left" / "Xm left" label for a live countdown badge. */
export function expiryLabel(expiresAt: string): string {
    const hours = hoursRemaining(expiresAt)
    if (hours <= 0) return 'Expiring…'
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m left`
    if (hours < 24) return `${Math.round(hours)}h left`
    return `${Math.round(hours / 24)}d left`
}
