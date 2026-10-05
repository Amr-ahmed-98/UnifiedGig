import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    MATERIAL_TYPES,
    hostOf,
    isHttpUrl,
    isMaterialType,
    materialTypeMeta,
    sharedAgoLabel,
} from './material'

describe('isMaterialType', () => {
    it.each(MATERIAL_TYPES)('accepts %s', (t) => {
        expect(isMaterialType(t)).toBe(true)
    })

    it.each(['', 'Course', 'podcast', null, undefined, 1, {}])('rejects %j', (v) => {
        expect(isMaterialType(v)).toBe(false)
    })
})

describe('materialTypeMeta', () => {
    it('has a label and hex color for every type', () => {
        for (const t of MATERIAL_TYPES) {
            expect(materialTypeMeta[t].label).toBeTruthy()
            expect(materialTypeMeta[t].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        }
    })
})

describe('isHttpUrl', () => {
    it.each(['https://example.com', 'http://example.com/path?q=1', 'https://sub.example.com/a#b'])(
        'accepts %s',
        (u) => expect(isHttpUrl(u)).toBe(true)
    )

    it.each(['', 'example.com', 'javascript:alert(1)', 'ftp://example.com', 'data:text/html,hi', 'https://'])(
        'rejects %j',
        (u) => expect(isHttpUrl(u)).toBe(false)
    )
})

describe('hostOf', () => {
    it('returns the hostname', () => {
        expect(hostOf('https://roadmap.sh/backend')).toBe('roadmap.sh')
    })

    it('strips a leading www.', () => {
        expect(hostOf('https://www.kaggle.com/learn')).toBe('kaggle.com')
    })

    it('falls back to the raw string when the URL is invalid', () => {
        expect(hostOf('not a url')).toBe('not a url')
    })
})

describe('sharedAgoLabel', () => {
    afterEach(() => vi.useRealTimers())

    it.each([
        [0, 'today'],
        [1, '1 day ago'],
        [3, '3 days ago'],
        [12, '12 days ago'],
    ])('%i days old -> %s', (days, expected) => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-10-04T12:00:00Z'))
        // +1s so an exact-day age doesn't sit on the floor() boundary
        const created = new Date(Date.now() - days * 86_400_000 - 1000).toISOString()
        expect(sharedAgoLabel(created)).toBe(expected)
    })
})
