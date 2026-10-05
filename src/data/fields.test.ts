import { describe, it, expect } from 'vitest'
import { fieldMap, learningFields } from './fields'
import { DEMO_MATERIALS } from '@/lib/demo-data'
import { isHttpUrl, isMaterialType } from '@/types/material'

describe('learningFields', () => {
    it('has 9 fields', () => {
        expect(learningFields).toHaveLength(9)
    })

    it('has unique, url-safe slugs', () => {
        const slugs = learningFields.map((f) => f.slug)
        expect(new Set(slugs).size).toBe(slugs.length)
        for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    })

    it('gives every field a name, blurb, icon and topics', () => {
        for (const f of learningFields) {
            expect(f.name).toBeTruthy()
            expect(f.blurb).toBeTruthy()
            expect(f.icon).toBeTruthy()
            expect(f.topics.length).toBeGreaterThan(0)
        }
    })

    it('fieldMap indexes every field by slug', () => {
        for (const f of learningFields) expect(fieldMap[f.slug]).toBe(f)
        expect(fieldMap['does-not-exist']).toBeUndefined()
    })
})

describe('DEMO_MATERIALS', () => {
    it('only references known fields and valid types', () => {
        for (const m of DEMO_MATERIALS) {
            expect(fieldMap[m.field], `${m.id} field`).toBeDefined()
            expect(isMaterialType(m.type), `${m.id} type`).toBe(true)
            expect(isHttpUrl(m.url), `${m.id} url`).toBe(true)
        }
    })

    it('has unique ids and no duplicate (field, url) pairs', () => {
        expect(new Set(DEMO_MATERIALS.map((m) => m.id)).size).toBe(DEMO_MATERIALS.length)
        const pairs = DEMO_MATERIALS.map((m) => `${m.field}|${m.url}`)
        expect(new Set(pairs).size).toBe(pairs.length)
    })
})
