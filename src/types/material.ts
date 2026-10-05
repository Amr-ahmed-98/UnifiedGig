export const MATERIAL_TYPES = ['course', 'video', 'article', 'docs', 'book', 'repo'] as const
export type MaterialType = (typeof MATERIAL_TYPES)[number]

export const materialTypeMeta: Record<MaterialType, { label: string; color: string }> = {
    course: { label: 'Course', color: '#CCFF00' },
    video: { label: 'Video', color: '#FF5C38' },
    article: { label: 'Article', color: '#3B82F6' },
    docs: { label: 'Docs', color: '#22E0D6' },
    book: { label: 'Book', color: '#8B5CF6' },
    repo: { label: 'Repo', color: '#9CA3AF' },
}

export interface LearningMaterial {
    id: string
    field: string
    title: string
    url: string
    type: MaterialType
    description: string | null
    createdAt: string
}

export function isMaterialType(v: unknown): v is MaterialType {
    return typeof v === 'string' && (MATERIAL_TYPES as readonly string[]).includes(v)
}

export function isHttpUrl(raw: string) {
    try {
        const u = new URL(raw)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}

export function hostOf(raw: string) {
    try {
        return new URL(raw).hostname.replace(/^www\./, '')
    } catch {
        return raw
    }
}

export function sharedAgoLabel(createdAt: string) {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    if (days < 1) return 'today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}
