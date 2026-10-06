import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileCard } from './profile-card'
import type { FollowProfile } from '@/types/profile'

const base: FollowProfile = {
    id: 'p1',
    platform: 'linkedin',
    name: 'Mariam Adel',
    url: 'https://linkedin.com/in/mariam',
    headline: 'Senior Tech Recruiter · Fintech',
    postsAbout: 'Backend, mobile and QA roles',
    createdAt: new Date().toISOString(),
}

describe('ProfileCard', () => {
    it('shows name, headline, posts-about and platform', () => {
        render(<ProfileCard profile={base} index={0} />)
        expect(screen.getByRole('heading', { name: 'Mariam Adel' })).toBeInTheDocument()
        expect(screen.getByText('Senior Tech Recruiter · Fintech')).toBeInTheDocument()
        expect(screen.getByText('Posts about')).toBeInTheDocument()
        expect(screen.getByText('Backend, mobile and QA roles')).toBeInTheDocument()
        expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    })

    it('renders initials in the avatar', () => {
        render(<ProfileCard profile={base} index={0} />)
        expect(screen.getByText('MA')).toBeInTheDocument()
    })

    it('Follow links out safely in a new tab with a descriptive name', () => {
        render(<ProfileCard profile={base} index={0} />)
        const link = screen.getByRole('link', { name: 'Follow Mariam Adel on LinkedIn' })
        expect(link).toHaveAttribute('href', 'https://linkedin.com/in/mariam')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link.getAttribute('rel')).toMatch(/noopener/)
        expect(link.getAttribute('rel')).toMatch(/nofollow/)
        expect(link).toHaveTextContent('Follow')
    })

    it('omits headline and posts-about when missing', () => {
        render(<ProfileCard profile={{ ...base, headline: null, postsAbout: null }} index={0} />)
        expect(screen.queryByText('Posts about')).not.toBeInTheDocument()
        expect(screen.queryByText(/Fintech/)).not.toBeInTheDocument()
    })

    it.each([
        ['facebook', 'Facebook'],
        ['x', 'X'],
        ['instagram', 'Instagram'],
        ['telegram', 'Telegram'],
        ['other', 'Other'],
    ] as const)('labels the %s platform', (platform, label) => {
        render(<ProfileCard profile={{ ...base, platform }} index={0} />)
        expect(screen.getByText(label)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: `Follow Mariam Adel on ${label}` })).toBeInTheDocument()
    })
})
