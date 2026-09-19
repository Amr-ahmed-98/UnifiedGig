import { describe, it, expect } from 'vitest'
import {
    detectTags,
    expiryLabel,
    hoursRemaining,
    SOCIAL_JOB_TAGS,
    SOCIAL_JOB_TTL_HOURS,
} from './socialJob'

describe('SOCIAL_JOB_TAGS', () => {
    it('keeps the 48h TTL contract stable — the whole feature depends on it', () => {
        expect(SOCIAL_JOB_TTL_HOURS).toBe(48)
    })

    it('contains no duplicate tags', () => {
        expect(new Set(SOCIAL_JOB_TAGS).size).toBe(SOCIAL_JOB_TAGS.length)
    })
})

describe('detectTags', () => {
    it('returns an empty array when nothing matches — "let the user pick"', () => {
        expect(detectTags('Hiring for a role in our team!')).toEqual([])
    })

    it('returns an empty array for empty text', () => {
        expect(detectTags('')).toEqual([])
    })

    it('matches case-insensitively', () => {
        expect(detectTags('REMOTE')).toEqual(['Remote'])
        expect(detectTags('We Need A BACKEND Engineer')).toEqual(['Backend'])
    })

    it('matches hyphenated and spaced variants', () => {
        expect(detectTags('full-time role')).toEqual(['Full-Time'])
        expect(detectTags('full time role')).toEqual(['Full-Time'])
        expect(detectTags('back-end developer')).toEqual(['Backend'])
        expect(detectTags('front end developer')).toEqual(['Frontend'])
    })

    it('matches all AI/ML keyword shapes', () => {
        expect(detectTags('looking for an ai engineer')).toEqual(['AI/ML'])
        expect(detectTags('ml position open')).toEqual(['AI/ML'])
        expect(detectTags('machine learning role')).toEqual(['AI/ML'])
        expect(detectTags('artificial intelligence team')).toEqual(['AI/ML'])
        expect(detectTags('llm fine-tuning work')).toEqual(['AI/ML'])
    })

    it('matches all Web3 keyword shapes', () => {
        expect(detectTags('web3 auditor needed')).toEqual(['Web3'])
        expect(detectTags('blockchain dev')).toEqual(['Web3'])
        expect(detectTags('crypto payments startup')).toEqual(['Web3'])
        expect(detectTags('solidity smart-contract role')).toEqual(['Contract', 'Web3'])
        expect(detectTags('defi protocol role')).toEqual(['Web3'])
    })

    it('matches design-related keywords', () => {
        expect(detectTags('design systems lead')).toEqual(['Design'])
        expect(detectTags('figma prototyper')).toEqual(['Design'])
        expect(detectTags('ui/ux designer')).toEqual(['Design'])
    })

    it('matches freelancer variants', () => {
        expect(detectTags('freelance gig')).toEqual(['Freelance'])
        expect(detectTags('freelancer wanted')).toEqual(['Freelance'])
    })

    it('matches contractor variants', () => {
        expect(detectTags('contract role')).toEqual(['Contract'])
        expect(detectTags('contractor needed')).toEqual(['Contract'])
        expect(detectTags('contracting opportunity')).toEqual(['Contract'])
    })

    it('matches fractional and does not false-positive on "fraction"', () => {
        expect(detectTags('fractional CTO')).toEqual(['Fractional'])
        expect(detectTags('a fraction of the team')).toEqual([])
    })

    it('returns multiple tags in canonical SOCIAL_JOB_TAGS order', () => {
        const tags = detectTags('Remote full-time AI role')
        expect(tags).toEqual(['Full-Time', 'Remote', 'AI/ML'])
    })

    it('combines title-style and description-style text into one string', () => {
        // The preview route feeds `${title} ${description}` — one string, both halves matter
        expect(detectTags('Senior Frontend Engineer $120k - $160k based in Cairo. Fully remote.')).toEqual([
            'Remote',
            'Frontend',
        ])
    })
})

describe('hoursRemaining', () => {
    it('returns the hours left for a future post', () => {
        const expiresAt = new Date(Date.now() + 2 * 3_600_000).toISOString()
        expect(hoursRemaining(expiresAt)).toBeCloseTo(2, 4)
    })

    it('handles fractions of an hour', () => {
        const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
        expect(hoursRemaining(expiresAt)).toBeCloseTo(0.5, 4)
    })

    it('clamps to 0 for an already-expired post', () => {
        const expiresAt = new Date(Date.now() - 5 * 3_600_000).toISOString()
        expect(hoursRemaining(expiresAt)).toBe(0)
    })

    it('clamps to 0 at the exact moment of expiry', () => {
        const expiresAt = new Date(Date.now()).toISOString()
        // A few ms pass between constructing the date and calling, so <= 0
        expect(hoursRemaining(expiresAt)).toBe(0)
    })
})

describe('expiryLabel', () => {
    it('says "Expiring…" once the window has passed', () => {
        const expiresAt = new Date(Date.now() - 1_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('Expiring…')
    })

    it('labels sub-hour posts as minutes left', () => {
        const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('30m left')
    })

    it('never shows "0m left" — tiny remainders round up to at least 1m', () => {
        const expiresAt = new Date(Date.now() + 5_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('1m left')
    })

    it('labels sub-day posts as hours left', () => {
        const expiresAt = new Date(Date.now() + 23 * 3_600_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('23h left')
    })

    it('labels day-scale posts as days left', () => {
        const expiresAt = new Date(Date.now() + 25 * 3_600_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('1d left')
    })

    it('labels a freshly embedded 48h post as "2d left"', () => {
        const expiresAt = new Date(Date.now() + 48 * 3_600_000).toISOString()
        expect(expiryLabel(expiresAt)).toBe('2d left')
    })

    it('switches label wording at the hour boundary (< 1h vs >= 1h)', () => {
        const justUnder = new Date(Date.now() + 59 * 60_000).toISOString()
        const justOver = new Date(Date.now() + 61 * 60_000).toISOString()
        expect(expiryLabel(justUnder)).toBe('59m left')
        expect(expiryLabel(justOver)).toBe('1h left')
    })

    it('switches label wording at the day boundary (< 24h vs >= 24h)', () => {
        const justUnder = new Date(Date.now() + 23 * 3_600_000 + 30 * 60_000).toISOString() // 23.5h
        const justOver = new Date(Date.now() + 24 * 3_600_000 + 30 * 60_000).toISOString() // 24.5h
        expect(expiryLabel(justUnder)).toBe('24h left') // 23.5 rounds to 24
        expect(expiryLabel(justOver)).toBe('1d left')
    })
})
