import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CardSkeleton, SkeletonList } from './card-skeleton'

describe('CardSkeleton', () => {
    it('renders a pulsing placeholder block', () => {
        const { container } = render(<CardSkeleton />)
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
})

describe('SkeletonList', () => {
    it('renders 5 skeleton cards by default', () => {
        const { container } = render(<SkeletonList />)
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5)
    })

    it('renders the requested count of skeleton cards', () => {
        const { container } = render(<SkeletonList count={ 3} />)
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    })

    it('is hidden from assistive tech', () => {
        const { container } = render(<SkeletonList count={ 1} />)
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    })
})
