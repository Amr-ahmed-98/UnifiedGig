import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavBar } from './navbar'

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn(() => '/') }))
vi.mock('next/navigation', () => ({ usePathname: usePathnameMock }))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }))

describe('NavBar', () => {
    it('renders the brand and nav links', () => {
        render(<NavBar />)
        expect(screen.getByRole('link', { name: 'UnifiedGig' })).toHaveAttribute('href', '/')
        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
        expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs')
        expect(screen.getByRole('link', { name: 'Freelance' })).toHaveAttribute('href', '/freelance')
    })

    it('keeps the mobile menu closed by default', () => {
        render(<NavBar />)
        expect(screen.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'false')
    })

    it('opens the mobile menu on toggle click', () => {
        render(<NavBar />)
        fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
        expect(screen.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes the mobile menu after picking a link', () => {
        render(<NavBar />)
        fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
        const mobileLinks = screen.getAllByRole('link', { name: 'Jobs' })
        fireEvent.click(mobileLinks[mobileLinks.length - 1])
        expect(screen.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'false')
    })
})
