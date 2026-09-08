import { describe, it, expect } from 'vitest'
import { workModeOf } from './job'

describe('workModeOf', () => {
    it('returns "remote" when remote is true', () => {
        expect(workModeOf({ remote: true, hybrid: false })).toBe('remote')
    })

    it('returns "remote" when both remote and hybrid are true (remote wins)', () => {
        expect(workModeOf({ remote: true, hybrid: true })).toBe('remote')
    })

    it('returns "hybrid" when only hybrid is true', () => {
        expect(workModeOf({ remote: false, hybrid: true })).toBe('hybrid')
    })

    it('returns "onsite" when neither remote nor hybrid is true', () => {
        expect(workModeOf({ remote: false, hybrid: false })).toBe('onsite')
    })
})
