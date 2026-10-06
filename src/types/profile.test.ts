import { describe, it, expect } from 'vitest'
import {
    PLATFORMS,
    hostMatchesPlatform,
    initialsOf,
    isPlatform,
    normalizeProfileUrl,
    platformMeta,
    platformMismatchMessage,
} from './profile'

describe('isPlatform', () => {
    it.each(PLATFORMS)('accepts %s', (p) => expect(isPlatform(p)).toBe(true))
    it.each(['', 'LinkedIn', 'tiktok', null, undefined, 1])('rejects %j', (v) => expect(isPlatform(v)).toBe(false))
})

describe('platformMeta', () => {
    it('has label, hex color and placeholder for every platform', () => {
        for (const p of PLATFORMS) {
            expect(platformMeta[p].label).toBeTruthy()
            expect(platformMeta[p].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
            expect(platformMeta[p].placeholder).toMatch(/^https:\/\//)
        }
    })
})

describe('normalizeProfileUrl', () => {
    it('drops hash, www., trailing slashes and lowercases the host', () => {
        expect(normalizeProfileUrl('  https://www.LinkedIn.com/in/jane-doe/#about ')).toBe('https://linkedin.com/in/jane-doe')
    })
    it('keeps the query string', () => {
        expect(normalizeProfileUrl('https://facebook.com/groups/x/?ref=1')).toBe('https://facebook.com/groups/x?ref=1')
    })
    it('normalizes a bare origin without a trailing slash', () => {
        expect(normalizeProfileUrl('https://example.com/')).toBe('https://example.com')
    })
    it('makes equivalent links identical', () => {
        expect(normalizeProfileUrl('https://www.x.com/jane/')).toBe(normalizeProfileUrl('https://x.com/jane'))
    })
    it('returns trimmed input when it is not a URL', () => {
        expect(normalizeProfileUrl('  nope ')).toBe('nope')
    })
})

describe('hostMatchesPlatform', () => {
    it.each([
        ['https://linkedin.com/in/a', 'linkedin'],
        ['https://www.linkedin.com/in/a', 'linkedin'],
        ['https://eg.linkedin.com/in/a', 'linkedin'],
        ['https://lnkd.in/abc', 'linkedin'],
        ['https://fb.com/a', 'facebook'],
        ['https://twitter.com/a', 'x'],
        ['https://x.com/a', 'x'],
        ['https://instagram.com/a', 'instagram'],
        ['https://t.me/a', 'telegram'],
        ['https://anything.example/a', 'other'],
    ] as const)('%s is a valid %s link', (url, platform) => {
        expect(hostMatchesPlatform(url, platform)).toBe(true)
    })

    it.each([
        ['https://evil-linkedin.com/in/a', 'linkedin'],
        ['https://linkedin.com.evil.io/in/a', 'linkedin'],
        ['https://facebook.com/a', 'linkedin'],
        ['https://x.com/a', 'instagram'],
    ] as const)('%s is not a %s link', (url, platform) => {
        expect(hostMatchesPlatform(url, platform)).toBe(false)
    })

    it('rejects garbage for platform-specific checks', () => {
        expect(hostMatchesPlatform('not a url', 'linkedin')).toBe(false)
    })
})

describe('platformMismatchMessage', () => {
    it('names the platform and points to Other', () => {
        expect(platformMismatchMessage('linkedin')).toBe(`That link doesn't look like a LinkedIn link — pick "Other" if it's right`)
    })
})

describe('initialsOf', () => {
    it.each([
        ['Mariam Adel', 'MA'],
        ['Freelance Devs MENA', 'FM'],
        ['Design Jobs Cairo', 'DC'],
        ['  salma   ibrahim ', 'SI'],
        ['Madonna', 'MA'],
        ['', '?'],
    ])('%j -> %s', (name, expected) => expect(initialsOf(name)).toBe(expected))
})
