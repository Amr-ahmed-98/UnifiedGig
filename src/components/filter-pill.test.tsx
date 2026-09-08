import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPill } from './filter-pill'

describe('FilterPill', () => {
    it('renders the label', () => {
        render(<FilterPill label="Remote" active={false} onClick={() => {}} />)
        expect(screen.getByText('Remote')).toBeInTheDocument()
    })

    it('reflects active state via aria-pressed', () => {
        render(<FilterPill label="Remote" active onClick={() => {}} />)
        expect(screen.getByRole('button', { name: /Remote/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('reflects inactive state via aria-pressed', () => {
        render(<FilterPill label="Remote" active={false} onClick={() => {}} />)
        expect(screen.getByRole('button', { name: /Remote/ })).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls onClick when clicked', () => {
        const onClick = vi.fn()
        render(<FilterPill label="Remote" active={false} onClick={onClick} />)
        fireEvent.click(screen.getByRole('button', { name: /Remote/ }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not render a dot by default', () => {
        const { container } = render(<FilterPill label="Remote" active={false} onClick={() => {}} />)
        expect(container.querySelector('.rounded-full.h-2.w-2')).not.toBeInTheDocument()
    })

    it('renders a count badge when count is provided', () => {
        render(<FilterPill label="LinkedIn" active={false} onClick={() => {}} count={12} dot />)
        expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('does not render a count badge when count is omitted', () => {
        render(<FilterPill label="LinkedIn" active={false} onClick={() => {}} />)
        expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
    })
})
