import { describe, it, expect } from 'vitest'
import { SITE_URL, buildSharePath, buildShareUrl } from './site'

describe('buildSharePath', () => {
    it('maps each listing kind to its own route', () => {
        expect(buildSharePath('job', 'abc')).toBe('/jobs/abc')
        expect(buildSharePath('freelance', 'abc')).toBe('/freelance/abc')
        expect(buildSharePath('social', 'abc')).toBe('/social-jobs/abc')
    })

    it('encodes ids so an odd id cannot break the path', () => {
        expect(buildSharePath('job', 'a b/c')).toBe('/jobs/a%20b%2Fc')
    })
})

describe('buildShareUrl', () => {
    it('returns an absolute url on this site', () => {
        expect(buildShareUrl('job', 'abc')).toBe(`${SITE_URL}/jobs/abc`)
    })

    it('never produces a double slash', () => {
        expect(buildShareUrl('social', 'post-1')).not.toContain('//social-jobs')
        expect(buildShareUrl('freelance', 'p1').split('://')[1]).not.toContain('//')
    })
})
