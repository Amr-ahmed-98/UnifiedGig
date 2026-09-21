import { readFile } from 'fs/promises'
import { join } from 'path'
import { ImageResponse } from 'next/og'

export const alt = 'UnifiedGig — Jobs & Freelance Projects, One Feed'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori needs explicit font data — relying on its bundled default font breaks
// with certain font subtables ("substFormat: 3 is not yet supported"), so we
// ship DejaVu Sans with the project and load it for the OG generator.
async function loadFonts() {
    const [regular, bold] = await Promise.all([
        readFile(join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf')),
        readFile(join(process.cwd(), 'public', 'fonts', 'DejaVuSans-Bold.ttf')),
    ])
    return [
        { name: 'DejaVu Sans', data: regular, weight: 400 as const, style: 'normal' as const },
        { name: 'DejaVu Sans', data: bold, weight: 700 as const, style: 'normal' as const },
    ]
}

export default async function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    background: '#0A0616',
                    padding: '80px',
                    position: 'relative',
                    fontFamily: 'DejaVu Sans',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -140,
                        right: -140,
                        width: 460,
                        height: 460,
                        borderRadius: 9999,
                        background: '#CCFF00',
                        opacity: 0.16,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: -180,
                        left: -120,
                        width: 420,
                        height: 420,
                        borderRadius: 9999,
                        background: '#8B5CF6',
                        opacity: 0.2,
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: '#CCFF00',
                            color: '#0A0616',
                            fontSize: 38,
                            fontWeight: 700,
                        }}
                    >
                        UG
                    </div>
                    <div style={{ color: '#CCFF00', fontSize: 34, fontWeight: 700 }}>UnifiedGig</div>
                </div>
                <div
                    style={{
                        marginTop: 34,
                        color: '#F4F2FA',
                        fontSize: 74,
                        fontWeight: 700,
                        lineHeight: 1.05,
                        maxWidth: 980,
                    }}
                >
                    Jobs &amp; freelance gigs, one feed.
                </div>
                <div
                    style={{
                        marginTop: 26,
                        color: 'rgba(244,242,250,0.62)',
                        fontSize: 30,
                        maxWidth: 940,
                        lineHeight: 1.35,
                    }}
                >
                    Every job post and freelance project from LinkedIn, Indeed, Glassdoor, Wuzzuf,
                    Tanqeeb, Freelancer, Mostaql &amp; Nafezly — updated every 30 minutes.
                </div>
                <div
                    style={{
                        marginTop: 30,
                        color: 'rgba(244,242,250,0.5)',
                        fontSize: 26,
                    }}
                >
                    unified-gig.vercel.app
                </div>
            </div>
        ),
        { ...size, fonts: await loadFonts() }
    )
}
