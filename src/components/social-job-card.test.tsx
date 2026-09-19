import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SocialJobCard } from './social-job-card'
import type { SocialJobPost } from '@/types/socialJob'

function post(overrides: Partial<SocialJobPost> = {}): SocialJobPost {
    return {
        id: 'post-1',
        title: 'Senior Frontend Engineer',
        authorName: 'Jane Doe',
        authorTitle: 'Engineering Manager at Acme',
        authorImageUrl: null,
        description: 'We are hiring! Great team, great product.',
        salary: '$120k - $160k',
        location: 'Cairo, Egypt',
        remote: false,
        tags: ['Frontend'],
        recruiterContact: null,
        imageUrl: null,
        url: 'https://www.linkedin.com/posts/jane-doe_activity-7123456789',
        source: 'linkedin',
        createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), // 2h ago
        expiresAt: new Date(Date.now() + 10 * 3_600_000).toISOString(), // 10h left
        ...overrides,
    }
}

// The card runs a 60s interval for its live countdown — fake timers let us
// tick it deterministically (shouldAdvanceTime keeps RTL's polling alive).
beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
    vi.useRealTimers()
})

describe('SocialJobCard', () => {
    it('renders the post title, author, description, salary, location and tags', () => {
        render(<SocialJobCard post={post()} index={0} />)

        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
        expect(screen.getByText('We are hiring! Great team, great product.')).toBeInTheDocument()
        expect(screen.getByText('$120k - $160k')).toBeInTheDocument()
        expect(screen.getByText('Cairo, Egypt')).toBeInTheDocument()
        expect(screen.getByText('Frontend')).toBeInTheDocument()
    })

    it('falls back to "LinkedIn member" when the post has no author name', () => {
        render(<SocialJobCard post={post({ authorName: null })} index={0} />)

        expect(screen.getByText('LinkedIn member')).toBeInTheDocument()
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
    })

    it('omits the description and image when the post has neither', () => {
        const { container } = render(
            <SocialJobCard post={post({ description: null, imageUrl: null })} index={0} />
        )

        expect(screen.queryByText('We are hiring! Great team, great product.')).not.toBeInTheDocument()
        expect(container.querySelector('img')).toBeNull()
    })

    it('renders the post image when one is attached', () => {
        const { container } = render(
            <SocialJobCard
                post={post({ imageUrl: 'https://media.licdn.com/photo.jpg' })}
                index={0}
            />
        )

        // alt="" keeps the decorative image out of the a11y tree — query the DOM directly
        const img = container.querySelector('img')
        expect(img).not.toBeNull()
        expect(img).toHaveAttribute('src', 'https://media.licdn.com/photo.jpg')
    })

    it('shows the Remote badge only for remote posts', () => {
        const { rerender } = render(<SocialJobCard post={post({ remote: false })} index={0} />)
        expect(screen.queryByText('Remote')).not.toBeInTheDocument()

        rerender(<SocialJobCard post={post({ remote: true })} index={0} />)
        expect(screen.getByText('Remote')).toBeInTheDocument()
    })

    it('links out to the original LinkedIn post in a new tab', () => {
        render(<SocialJobCard post={post()} index={0} />)

        const link = screen.getByRole('link', { name: /View on LinkedIn/ })
        expect(link).toHaveAttribute('href', post().url)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    describe('posted-at label', () => {
        it('says "Just now" for a fresh post', () => {
            render(<SocialJobCard post={post({ createdAt: new Date().toISOString() })} index={0} />)
            expect(screen.getByText('Just now')).toBeInTheDocument()
        })

        it('says "2h ago" for a post from two hours ago', () => {
            render(<SocialJobCard post={post()} index={0} />)
            expect(screen.getByText('2h ago')).toBeInTheDocument()
        })

        it('says "3d ago" for a post from three days ago', () => {
            render(
                <SocialJobCard
                    post={post({ createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() })}
                    index={0}
                />
            )
            expect(screen.getByText('3d ago')).toBeInTheDocument()
        })
    })

    describe('live expiry countdown badge', () => {
        it('shows the initial time-left label from expiresAt', () => {
            render(<SocialJobCard post={post()} index={0} />)
            expect(screen.getByText('10h left')).toBeInTheDocument()
        })

        it('ticks the label down every minute without a refetch or remount', () => {
            render(<SocialJobCard post={post({ expiresAt: new Date(Date.now() + 59 * 60_000).toISOString() })} index={0} />)
            expect(screen.getByText('59m left')).toBeInTheDocument()

            act(() => {
                vi.advanceTimersByTime(60_000)
            })
            expect(screen.getByText('58m left')).toBeInTheDocument()
        })

        it('switches to urgent styling once less than 6h remain', () => {
            const urgentPost = post({ expiresAt: new Date(Date.now() + 3 * 3_600_000).toISOString() })
            render(<SocialJobCard post={urgentPost} index={0} />)

            const badge = screen.getByText('3h left')
            expect(badge).toHaveClass('bg-coral/15')
            expect(badge).toHaveClass('text-coral-text')
        })

        it('stays calm (non-urgent) while more than 6h remain', () => {
            render(<SocialJobCard post={post()} index={0} />)

            const badge = screen.getByText('10h left')
            expect(badge).toHaveClass('bg-panel-2')
            expect(badge).not.toHaveClass('text-coral-text')
        })

        it('labels an expired post "Expiring…" and keeps it urgent', () => {
            render(
                <SocialJobCard
                    post={post({ expiresAt: new Date(Date.now() - 1_000).toISOString() })}
                    index={0}
                />
            )

            const badge = screen.getByText('Expiring…')
            expect(badge).toHaveClass('text-coral-text')
        })
    })

    describe('discard button', () => {
        it('calls onDiscard with the post id when clicked', () => {
            const onDiscard = vi.fn()
            render(<SocialJobCard post={post()} index={0} onDiscard={onDiscard} />)

            fireEvent.click(screen.getByRole('button', { name: 'Discard post' }))
            expect(onDiscard).toHaveBeenCalledWith('post-1')
        })

        it('is hidden when no onDiscard handler is provided', () => {
            render(<SocialJobCard post={post()} index={0} />)

            expect(screen.queryByRole('button', { name: 'Discard post' })).not.toBeInTheDocument()
        })
    })
})
