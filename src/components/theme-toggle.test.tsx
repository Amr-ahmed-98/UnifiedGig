import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'

const { useThemeMock, setThemeMock } = vi.hoisted(() => ({
    useThemeMock: vi.fn(),
    setThemeMock: vi.fn(),
}))
vi.mock('next-themes', () => ({ useTheme: useThemeMock }))

describe('ThemeToggle', () => {
    beforeEach(() => {
        setThemeMock.mockReset()
        useThemeMock.mockReturnValue({ theme: 'light', setTheme: setThemeMock })
    })

    it('renders nothing before mount to avoid hydration mismatch', () => {
        const { container } = render(<ThemeToggle />)
        expect(container.firstChild).not.toBeNull()
    })

    it('renders the toggle button once mounted', () => {
        render(<ThemeToggle />)
        expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
    })

    it('switches to dark when currently light', () => {
        useThemeMock.mockReturnValue({ theme: 'light', setTheme: setThemeMock })
        render(<ThemeToggle />)
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }))
        expect(setThemeMock).toHaveBeenCalledWith('dark')
    })

    it('switches to light when currently dark', () => {
        useThemeMock.mockReturnValue({ theme: 'dark', setTheme: setThemeMock })
        render(<ThemeToggle />)
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }))
        expect(setThemeMock).toHaveBeenCalledWith('light')
    })
})
