import * as cheerio from 'cheerio'

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const UNKNOWN = 'Unknown'

/** Loose pre-check: linkedin.com link, or an lnkd.in short link that still needs resolving. */
export function isLinkedInHost(raw: string): boolean {
    let u: URL
    try {
        u = new URL(raw)
    } catch {
        return false
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    return host === 'linkedin.com' || host === 'lnkd.in'
}

/** Strict check: only public post / feed-update / article paths are embeddable. */
export function isValidLinkedInUrl(raw: string): boolean {
    let u: URL
    try {
        u = new URL(raw)
    } catch {
        return false
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host !== 'linkedin.com') return false
    return /^\/(posts|feed\/update|pulse)\//.test(u.pathname)
}

/**
 * lnkd.in links (LinkedIn's own shortener, e.g. https://lnkd.in/p/ewrps2Px)
 * redirect to the real linkedin.com/posts/... URL. Follow that redirect so
 * we can validate + store the canonical link instead of rejecting the share
 * link outright.
 */
export async function resolveLinkedInUrl(raw: string): Promise<string> {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host !== 'lnkd.in') return raw

    const res = await fetch(raw, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': UA },
    })
    return res.url || raw
}

export interface ParsedLinkedInPost {
    title: string
    authorName: string
    description: string | null
    imageUrl: string | null
    salary: string
    location: string
    remote: boolean
}

const SALARY_RE = /\$\s?\d[\d,.]*\s?[kK]?\s?(?:-|to|–)\s?\$?\s?\d[\d,.]*\s?[kK]?(?:\s?\/\s?(?:yr|year|hr|hour|mo|month))?/
const REMOTE_RE = /\bremote\b/i
const LOCATION_RE = /\b(?:based in|location:)\s*([A-Za-z\s,]+?)(?:[.\n]|$)/i

// LinkedIn's public share-preview title comes in a few shapes depending on
// post type / locale — try each instead of hard-coding one:
//   "Jane Doe on LinkedIn: <post text>"
//   "Jane Doe on LinkedIn"
//   "<post text>… | Jane Doe"   <- personal-profile share format, name is LAST
const AUTHOR_PATTERNS: RegExp[] = [/^(.*?)\s+on LinkedIn:\s*(.*)$/i, /^(.*?)\s+on LinkedIn$/i]

function extractAuthor(...texts: (string | null)[]): { authorName: string | null; leftover: string | null } {
    for (const text of texts) {
        if (!text) continue

        for (const pattern of AUTHOR_PATTERNS) {
            const m = text.match(pattern)
            if (m && m[1].trim()) {
                return { authorName: m[1].trim(), leftover: m[2]?.trim() || null }
            }
        }

        // Split on the LAST "|" — LinkedIn tacks the author name on the end.
        const pipe = text.match(/^(.+?)\s*\|\s*([^|]+)$/)
        if (pipe) {
            const author = pipe[2].trim()
            if (author && !/^linkedin$/i.test(author)) {
                return { authorName: author, leftover: pipe[1].trim() }
            }
        }
    }
    return { authorName: null, leftover: null }
}

/**
 * Fetches the public post page and reads its Open Graph tags.
 * LinkedIn gates most post content behind login, so og:title/og:description
 * are often all that's available. Any field we can't read comes back as
 * "Unknown" (or false for remote) instead of throwing, so the caller always
 * gets something to show — the person can still edit it before saving.
 */
export async function fetchLinkedInPostPreview(url: string): Promise<ParsedLinkedInPost> {
    const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        redirect: 'follow',
    })

    if (!res.ok) {
        throw new Error(`LinkedIn returned ${res.status}`)
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    const meta = (prop: string) =>
        $(`meta[property="${prop}"]`).attr('content')?.trim() ||
        $(`meta[name="${prop}"]`).attr('content')?.trim() ||
        null

    const ogTitle = meta('og:title')
    const ogDescription = meta('og:description')
    const ogImage = meta('og:image')
    const pageTitle = $('title').first().text().trim() || null

    const { authorName, leftover } = extractAuthor(ogTitle, ogDescription, pageTitle)
    const title = leftover || ogTitle || pageTitle

    if (process.env.NODE_ENV !== 'production' && !authorName) {
        // Nothing matched — dump what LinkedIn actually sent back so the
        // patterns above can be tightened against real data.
        console.log('[linkedin-embed] could not extract author. Raw tags:', {
            ogTitle,
            ogDescription,
            pageTitle,
        })
    }

    const description = ogDescription || null
    const salaryMatch = description?.match(SALARY_RE) ?? null
    const locationMatch = description?.match(LOCATION_RE) ?? null

    return {
        title: title ? title.slice(0, 300) : UNKNOWN,
        authorName: authorName || UNKNOWN,
        description,
        imageUrl: ogImage || null,
        salary: salaryMatch ? salaryMatch[0] : UNKNOWN,
        location: locationMatch ? locationMatch[1].trim() : UNKNOWN,
        remote: description ? REMOTE_RE.test(description) : false,
    }
}