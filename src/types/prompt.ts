export const PROMPT_CATEGORIES = ['programming', 'images', 'video', 'writing', 'career'] as const
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]

export const promptCategoryMeta: Record<PromptCategory, { label: string; color: string }> = {
    programming: { label: 'Programming', color: '#22E0D6' },
    images: { label: 'Images', color: '#FF5C38' },
    video: { label: 'Video', color: '#8B5CF6' },
    writing: { label: 'Writing', color: '#3B82F6' },
    career: { label: 'Career', color: '#CCFF00' },
}

export const PROMPT_LIMITS = {
    titleMin: 3,
    titleMax: 100,
    bodyMin: 20,
    bodyMax: 2000,
    toolsMax: 6,
    toolLenMax: 30,
} as const

export interface Prompt {
    id: string
    category: PromptCategory
    title: string
    body: string
    tools: string[]
    createdAt: string
}

export function isPromptCategory(v: unknown): v is PromptCategory {
    return typeof v === 'string' && (PROMPT_CATEGORIES as readonly string[]).includes(v)
}

/** Canonical spellings so "chatgpt", "ChatGPT " and "chat-gpt" end up as one tag. */
export const KNOWN_TOOLS = [
    'ChatGPT',
    'Claude',
    'Gemini',
    'Copilot',
    'Perplexity',
    'Grok',
    'Midjourney',
    'DALL·E',
    'Firefly',
    'Stable Diffusion',
    'Sora',
    'Runway',
    'Veo',
    'Kling',
    'Pika',
] as const

const toolKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const KNOWN_BY_KEY = new Map<string, string>(KNOWN_TOOLS.map((t) => [toolKey(t), t]))

/** Known tools whose name contains the search text — lets "chat" find ChatGPT prompts. */
export function matchKnownTools(q: string): string[] {
    const key = toolKey(q)
    if (!key) return []
    return KNOWN_TOOLS.filter((t) => toolKey(t).includes(key))
}

/** Accepts "ChatGPT, Claude" or an array; trims, dedupes, canonicalises and caps the list. */
export function parseTools(raw: unknown): string[] {
    const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
    const seen = new Set<string>()
    const out: string[] = []
    for (const part of parts) {
        if (typeof part !== 'string') continue
        const trimmed = part.trim().slice(0, PROMPT_LIMITS.toolLenMax)
        const key = toolKey(trimmed)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(KNOWN_BY_KEY.get(key) ?? trimmed)
        if (out.length >= PROMPT_LIMITS.toolsMax) break
    }
    return out
}

export interface PromptSegment {
    text: string
    placeholder: boolean
}

/** Splits prompt text so [bracketed] placeholders can be highlighted. */
export function splitPlaceholders(body: string): PromptSegment[] {
    return body
        .split(/(\[[^\]\n]+\])/g)
        .filter((text) => text.length > 0)
        .map((text) => ({ text, placeholder: /^\[[^\]\n]+\]$/.test(text) }))
}
