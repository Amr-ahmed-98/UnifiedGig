/**
 * Canonical site URL + the share-route helpers.
 *
 * Sharing used to hand the *original* source URL (LinkedIn, Wuzzuf, Mostaql…)
 * to the social networks, so every shared link sent the reader away from
 * UnifiedGig. Now every listing has its own page on this site
 * (`/jobs/<id>`, `/freelance/<id>`, `/social-jobs/<id>`) and that is what gets
 * shared: the link unfurls with a generated UnifiedGig image describing the
 * listing, and the click lands on UnifiedGig — with a button to the original
 * post one tap away.
 */

export type ShareKind = 'job' | 'freelance' | 'social'

/**
 * Deploy-time override (Vercel preview builds, self-hosting) with the
 * production domain as the default. Trailing slashes stripped so
 * `${SITE_URL}${path}` never produces a double slash.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_ENV === 'production'
        ? 'https://unified-gig.vercel.app'
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://unified-gig.vercel.app')
).replace(/\/+$/, '')

export const SITE_NAME = 'UnifiedGig'

const SHARE_BASE: Record<ShareKind, string> = {
    job: '/jobs',
    freelance: '/freelance',
    social: '/social-jobs',
}

/** Relative path of a listing's own page, e.g. `/jobs/clx123`. */
export function buildSharePath(kind: ShareKind, id: string): string {
    return `${SHARE_BASE[kind]}/${encodeURIComponent(id)}`
}

/** Absolute URL of a listing's own page — this is what gets shared. */
export function buildShareUrl(kind: ShareKind, id: string): string {
    return `${SITE_URL}${buildSharePath(kind, id)}`
}
