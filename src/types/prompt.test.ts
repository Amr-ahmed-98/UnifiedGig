import { describe, it, expect } from 'vitest'
import { isPromptCategory, matchKnownTools, parseTools, splitPlaceholders } from './prompt'

describe('isPromptCategory', () => {
    it('accepts the five categories', () => {
        for (const c of ['programming', 'images', 'video', 'writing', 'career']) expect(isPromptCategory(c)).toBe(true)
    })
    it('rejects anything else', () => {
        expect(isPromptCategory('music')).toBe(false)
        expect(isPromptCategory(undefined)).toBe(false)
    })
})

describe('parseTools', () => {
    it('trims, dedupes and canonicalises known tools', () => {
        expect(parseTools(' chatgpt , Claude,CHATGPT, dall-e ')).toEqual(['ChatGPT', 'Claude', 'DALL·E'])
    })
    it('keeps unknown tools as typed', () => {
        expect(parseTools('My Tool')).toEqual(['My Tool'])
    })
    it('returns an empty list for blank or invalid input', () => {
        expect(parseTools('')).toEqual([])
        expect(parseTools(undefined)).toEqual([])
        expect(parseTools(' , ,')).toEqual([])
    })
    it('caps the list at 6 tools', () => {
        expect(parseTools('a,b,c,d,e,f,g,h')).toHaveLength(6)
    })
})

describe('matchKnownTools', () => {
    it('matches partial names', () => {
        expect(matchKnownTools('chat')).toEqual(['ChatGPT'])
        expect(matchKnownTools('dalle')).toEqual(['DALL·E'])
    })
    it('returns nothing for empty text', () => {
        expect(matchKnownTools('  ')).toEqual([])
    })
})

describe('splitPlaceholders', () => {
    it('marks [bracketed] parts', () => {
        expect(splitPlaceholders('Act as a [language] engineer.')).toEqual([
            { text: 'Act as a ', placeholder: false },
            { text: '[language]', placeholder: true },
            { text: ' engineer.', placeholder: false },
        ])
    })
    it('returns plain text untouched', () => {
        expect(splitPlaceholders('no brackets')).toEqual([{ text: 'no brackets', placeholder: false }])
    })
})
