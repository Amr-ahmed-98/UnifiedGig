import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import PeopleClient from './people-client'
import type { FollowProfile } from '@/types/profile'

function prof(o: Partial<FollowProfile> = {}): FollowProfile {
    return {
        id: 'p1', platform: 'linkedin', name: 'Mariam Adel', url: 'https://linkedin.com/in/mariam',
        headline: 'Senior Tech Recruiter', postsAbout: 'Backend roles', createdAt: new Date().toISOString(), ...o,
    }
}
const COUNTS = { linkedin: 4, facebook: 1 }
const listRes = (profiles: FollowProfile[], total = profiles.length, counts: Record<string, number> = COUNTS) => ({
    ok: true, json: async () => ({ profiles, total, counts }),
})
const paramsOfCall = (fm: ReturnType<typeof vi.fn>, n: number) => new URL(fm.mock.calls[n][0] as string, 'http://localhost').searchParams

describe('PeopleClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>
    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(listRes([prof(), prof({ id: 'p2', name: 'Egypt Remote Jobs', platform: 'facebook', url: 'https://facebook.com/groups/e' })]))
        vi.stubGlobal('fetch', fetchMock)
    })
    afterEach(() => vi.unstubAllGlobals())

    it('renders the hero, search and add button', async () => {
        render(<PeopleClient />)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Follow the people who post the jobs.')
        expect(screen.getByLabelText('Search profiles')).toHaveAttribute('placeholder', 'Search names, roles they post…')
        expect(screen.getByRole('button', { name: 'Add profile' })).toBeInTheDocument()
        await screen.findByText('2 profiles')
    })

    it('fetches on mount with default paging and no filters', async () => {
        render(<PeopleClient />)
        await screen.findByRole('heading', { name: 'Mariam Adel' })
        const p = paramsOfCall(fetchMock, 0)
        expect(p.get('take')).toBe('24')
        expect(p.get('skip')).toBe('0')
        expect(p.has('q')).toBe(false)
        expect(p.has('platform')).toBe(false)
    })

    it('shows cards, the list total and the all-profiles count under the search', async () => {
        render(<PeopleClient />)
        expect(await screen.findByRole('heading', { name: 'Egypt Remote Jobs' })).toBeInTheDocument()
        expect(screen.getByText('2 profiles')).toBeInTheDocument() // list header
        expect(screen.getByText('5 profiles')).toBeInTheDocument() // sum of counts
        expect(screen.getByText('Recently added')).toBeInTheDocument()
    })

    it('uses the singular for one profile', async () => {
        fetchMock.mockResolvedValue(listRes([prof()], 1, { linkedin: 1 }))
        render(<PeopleClient />)
        expect((await screen.findAllByText('1 profile')).length).toBe(2)
    })

    it('shows platform pills with counts, including zero', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        expect(screen.getByRole('button', { name: /^LinkedIn/ })).toHaveTextContent('4')
        expect(screen.getByRole('button', { name: /^Other/ })).toHaveTextContent('0')
    })

    it('refetches with platform=linkedin when a pill is clicked, and supports multiple', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        fireEvent.click(screen.getByRole('button', { name: /^LinkedIn/ }))
        await waitFor(() => expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).get('platform')).toBe('linkedin'))
        fireEvent.click(screen.getByRole('button', { name: /^Facebook/ }))
        await waitFor(() => expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).get('platform')).toBe('linkedin,facebook'))
    })

    it('debounces search then refetches with q', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        const box = screen.getByLabelText('Search profiles')
        fireEvent.change(box, { target: { value: 'r' } })
        fireEvent.change(box, { target: { value: 'recruiter' } })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
        expect(paramsOfCall(fetchMock, 1).get('q')).toBe('recruiter')
    })

    it('"Clear all filters" is disabled until a filter is active, then resets', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        const clear = screen.getByRole('button', { name: 'Clear all filters' })
        expect(clear).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: /^LinkedIn/ }))
        expect(clear).toBeEnabled()
        fireEvent.click(clear)
        expect(screen.getByRole('button', { name: /^LinkedIn/ })).toHaveAttribute('aria-pressed', 'false')
    })

    it('mobile Filters toggle shows an extra panel and the active count', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        const toggle = screen.getByRole('button', { name: /^Filters/ })
        const before = screen.getAllByRole('button', { name: 'Clear all filters' }).length
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getAllByRole('button', { name: 'Clear all filters' })).toHaveLength(before + 1)
        fireEvent.click(screen.getAllByRole('button', { name: /^LinkedIn/ })[0])
        expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
    })

    it('empty list with no filters invites the first add', async () => {
        fetchMock.mockResolvedValue(listRes([], 0, {}))
        render(<PeopleClient />)
        expect(await screen.findByText('No profiles yet.')).toBeInTheDocument()
    })

    it('empty list with filters shows the no-match state', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        fetchMock.mockResolvedValue(listRes([], 0))
        fireEvent.click(screen.getByRole('button', { name: /^Facebook/ }))
        expect(await screen.findByText('Nothing matches — yet.')).toBeInTheDocument()
    })

    it('loads more using skip and appends without duplicates', async () => {
        fetchMock
            .mockResolvedValueOnce(listRes([prof({ id: 'a', name: 'First' })], 3))
            .mockResolvedValueOnce(listRes([prof({ id: 'a', name: 'First' }), prof({ id: 'b', name: 'Second' })], 3))
        render(<PeopleClient />)
        await screen.findByRole('heading', { name: 'First' })
        fireEvent.click(screen.getByRole('button', { name: 'Load more profiles' }))
        await screen.findByRole('heading', { name: 'Second' })
        expect(paramsOfCall(fetchMock, 1).get('skip')).toBe('1')
        expect(screen.getAllByRole('heading', { name: 'First' })).toHaveLength(1)
    })

    it('shows an error banner when loading fails', async () => {
        fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
        render(<PeopleClient />)
        expect(await screen.findByText('Failed to load profiles')).toBeInTheDocument()
    })

    it('add flow: opens the modal, then refetches and clears filters after a successful add', async () => {
        render(<PeopleClient />)
        await screen.findByText('2 profiles')
        const pill = screen.getByRole('button', { name: /^LinkedIn/ })
        fireEvent.click(pill)
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

        fireEvent.click(screen.getByRole('button', { name: 'Add profile' }))
        const dialog = await screen.findByRole('dialog', { name: 'Add a profile' })

        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ profile: prof({ id: 'new' }) }) })
        fetchMock.mockResolvedValue(listRes([prof({ id: 'new', name: 'Freshly Added' })], 1))

        fireEvent.change(within(dialog).getByLabelText('Profile link'), { target: { value: 'https://linkedin.com/in/fresh' } })
        fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Freshly Added' } })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Add profile' }))

        expect(await screen.findByRole('heading', { name: 'Freshly Added' })).toBeInTheDocument()
        expect(pill).toHaveAttribute('aria-pressed', 'false')
        expect(paramsOfCall(fetchMock, fetchMock.mock.calls.length - 1).has('platform')).toBe(false)
    })
})
