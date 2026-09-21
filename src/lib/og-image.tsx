import { readFile } from 'fs/promises'
import { join } from 'path'
import { ImageResponse } from 'next/og'

/**
 * Shared renderer for the per-listing share images.
 *
 * When a listing page is posted to LinkedIn / WhatsApp / Facebook / X, the
 * unfurled preview is this image: brand mark, listing title, and the key
 * facts (company, budget, location, salary, deadline…) painted into the card,
 * so the reader sees *what* was shared before clicking through.
 */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const INK = '#0A0616'
const FG = '#F4F2FA'
const LIME = '#CCFF00'
const VIOLET = '#8B5CF6'

// Satori needs explicit font data — relying on its bundled default font breaks
// with certain font subtables ("substFormat: 3 is not yet supported"), so we
// ship DejaVu Sans with the project and load it for the OG generator.
export async function loadOgFonts() {
    const [regular, bold] = await Promise.all([
        readFile(join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf')),
        readFile(join(process.cwd(), 'public', 'fonts', 'DejaVuSans-Bold.ttf')),
    ])
    return [
        { name: 'DejaVu Sans', data: regular, weight: 400 as const, style: 'normal' as const },
        { name: 'DejaVu Sans', data: bold, weight: 700 as const, style: 'normal' as const },
    ]
}

/** Satori has no `text-overflow`, so long strings are cut by hand. */
function clamp(text: string, max: number): string {
    const clean = text.replace(/\s+/g, ' ').trim()
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

export interface ShareOgOptions {
    /** Small line above the title, e.g. "Job · via LinkedIn". */
    eyebrow: string
    /** The listing title. */
    title: string
    /** Second line under the title — company, author, "Freelance project"… */
    subtitle?: string | null
    /** Chips along the bottom: location, salary, budget, deadline, tags. */
    facts?: (string | null | undefined)[]
    /** Accent colour of the source, drives the glow + eyebrow dot. */
    accent?: string
}

export function renderShareOgImage({
    eyebrow,
    title,
    subtitle,
    facts = [],
    accent = LIME,
}: ShareOgOptions, fonts: Awaited<ReturnType<typeof loadOgFonts>>) {
    const chips = facts.filter((f): f is string => Boolean(f && f.trim())).slice(0, 4)
    // Long titles get a smaller type size instead of overflowing the card.
    const titleSize = title.length > 90 ? 48 : title.length > 55 ? 58 : 70

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: INK,
                    padding: '72px 80px',
                    position: 'relative',
                    fontFamily: 'DejaVu Sans',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -160,
                        right: -140,
                        width: 460,
                        height: 460,
                        borderRadius: 9999,
                        background: accent,
                        opacity: 0.18,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: -200,
                        left: -140,
                        width: 440,
                        height: 440,
                        borderRadius: 9999,
                        background: VIOLET,
                        opacity: 0.18,
                    }}
                />

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 14,
                                background: LIME,
                                color: INK,
                                fontSize: 32,
                                fontWeight: 700,
                            }}
                        >
                            UG
                        </div>
                        <div style={{ color: LIME, fontSize: 30, fontWeight: 700 }}>UnifiedGig</div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginTop: 40,
                            color: accent,
                            fontSize: 26,
                            fontWeight: 700,
                        }}
                    >
                        <div style={{ width: 14, height: 14, borderRadius: 9999, background: accent }} />
                        {clamp(eyebrow, 60)}
                    </div>

                    <div
                        style={{
                            marginTop: 20,
                            color: FG,
                            fontSize: titleSize,
                            fontWeight: 700,
                            lineHeight: 1.08,
                            maxWidth: 1000,
                        }}
                    >
                        {clamp(title, 120)}
                    </div>

                    {subtitle ? (
                        <div
                            style={{
                                marginTop: 18,
                                color: 'rgba(244,242,250,0.66)',
                                fontSize: 32,
                                maxWidth: 1000,
                            }}
                        >
                            {clamp(subtitle, 80)}
                        </div>
                    ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {chips.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                            {chips.map((chip) => (
                                <div
                                    key={chip}
                                    style={{
                                        display: 'flex',
                                        padding: '10px 22px',
                                        borderRadius: 9999,
                                        background: 'rgba(244,242,250,0.08)',
                                        color: 'rgba(244,242,250,0.82)',
                                        fontSize: 24,
                                    }}
                                >
                                    {clamp(chip, 34)}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div
                        style={{
                            marginTop: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: 'rgba(244,242,250,0.5)',
                            fontSize: 24,
                        }}
                    >
                        <div style={{ display: 'flex' }}>unified-gig.vercel.app</div>
                        <div style={{ display: 'flex', color: LIME }}>Open on UnifiedGig →</div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts }
    )
}

/** Fallback card for an id that no longer exists (expired or deleted post). */
export async function renderMissingOgImage(kind: string) {
    return renderShareOgImage(
        {
            eyebrow: 'UnifiedGig',
            title: 'This listing is no longer available',
            subtitle: `Browse live ${kind} on UnifiedGig instead.`,
        },
        await loadOgFonts()
    )
}
