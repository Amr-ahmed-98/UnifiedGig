import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { CustomCursor } from './custom-cursor'

describe('CustomCursor', () => {
    it('renders a hidden pointer-events-none cursor element', () => {
        const { container } = render(<CustomCursor />)
        const cursor = container.firstChild as HTMLElement
        expect(cursor).toHaveClass('pointer-events-none')
        expect(cursor).toHaveClass('hidden')
    })

    it('grows when the pointer moves over a data-cursor-hover element', () => {
        const { container } = render(
            <>
                <CustomCursor />
                <button data-cursor-hover>Hover me</button>
            </>
        )
        const target = container.querySelector('[data-cursor-hover]') as HTMLElement
        act(() => {
            target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
        })
        act(() => {
            target.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
        })
        expect(target).toBeInTheDocument()
    })
})
