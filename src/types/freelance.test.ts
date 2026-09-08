import { describe, it, expect } from 'vitest'
import { deadlineDays } from './freelance'

describe('deadlineDays', () => {
    it('returns null when deadline is null', () => {
        expect(deadlineDays(null)).toBeNull()
    })

    it('returns a positive number of days for a future deadline', () => {
        const inFiveDays = new Date(Date.now() + 5 * 86_400_000).toISOString()
        expect(deadlineDays(inFiveDays)).toBe(5)
    })

    it('returns a negative number of days for a past deadline', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
        expect(deadlineDays(threeDaysAgo)).toBe(-3)
    })

    it('rounds up a same-day deadline to 1 day', () => {
        const in12Hours = new Date(Date.now() + 12 * 3_600_000).toISOString()
        expect(deadlineDays(in12Hours)).toBe(1)
    })
})
