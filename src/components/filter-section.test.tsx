import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterSection, EmptyState } from './filter-section'

describe('FilterSection', () => {
    it('renders the title and children', () => {
        render(
            <FilterSection title="Work mode">
                <button type="button">Remote</button>
            </FilterSection>
        )
        expect(screen.getByText('Work mode')).toBeInTheDocument()
        expect(screen.getByText('Remote')).toBeInTheDocument()
    })
})

describe('EmptyState', () => {
    it('renders the empty state copy', () => {
        render(<EmptyState onReset={() => {}} />)
        expect(screen.getByText('Nothing matches — yet.')).toBeInTheDocument()
    })

    it('calls onReset when the reset button is clicked', () => {
        const onReset = vi.fn()
        render(<EmptyState onReset={onReset} />)
        fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
        expect(onReset).toHaveBeenCalledTimes(1)
    })
})
