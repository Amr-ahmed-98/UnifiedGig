import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AnimatedCounter } from './animated-counter'

describe('AnimatedCounter', () => {
    it('renders a span starting at 0', () => {
        const { container } = render(<AnimatedCounter value={120} />)
        const span = container.querySelector('span')
        expect(span).toBeInTheDocument()
        expect(span?.textContent).toBe('0')
    })

    it('accepts an optional suffix prop without crashing', () => {
        const { container } = render(<AnimatedCounter value={30} suffix=" min" />)
        expect(container.querySelector('span')).toBeInTheDocument()
    })
})
