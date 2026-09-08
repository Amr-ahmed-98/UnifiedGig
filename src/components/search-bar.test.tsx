import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from './search-bar'

describe('SearchBar', () => {
    it('renders the placeholder and label', () => {
        render(<SearchBar value="" onChange = {() => {}} placeholder = "Search jobs" label = "Search jobs" />)
    expect(screen.getByPlaceholderText('Search jobs')).toBeInTheDocument()
    expect(screen.getByLabelText('Search jobs')).toBeInTheDocument()
})

it('calls onChange with the typed value', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange = { onChange } placeholder = "Search jobs" label = "Search jobs" />)

    fireEvent.change(screen.getByPlaceholderText('Search jobs'), { target: { value: 'react' } })

    expect(onChange).toHaveBeenCalledWith('react')
})

it('does not show a clear button when value is empty', () => {
    render(<SearchBar value="" onChange = {() => {}} placeholder = "Search jobs" label = "Search jobs" />)
expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
    })

it('shows a clear button when value is non-empty and clears it on click', () => {
    const onChange = vi.fn()
    render(<SearchBar value="react" onChange = { onChange } placeholder = "Search jobs" label = "Search jobs" />)

    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledWith('')
})
})
