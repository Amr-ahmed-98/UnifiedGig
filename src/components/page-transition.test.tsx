import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTransition } from './page-transition'

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn(() => '/jobs') }))
vi.mock('next/navigation', () => ({ usePathname: usePathnameMock }))

describe('PageTransition', () => {
    it('renders its children', () => {
        render(
            <PageTransition>
                <p>Page content</p>
            </PageTransition>
        )
        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('keys its content on the current pathname', () => {
        usePathnameMock.mockReturnValue('/jobs')
        const { unmount } = render(
            <PageTransition>
                <p>Jobs page</p>
            </PageTransition>
        )
        expect(screen.getByText('Jobs page')).toBeInTheDocument()
        unmount()

        usePathnameMock.mockReturnValue('/freelance')
        render(
            <PageTransition>
                <p>Freelance page</p>
            </PageTransition>
        )
        expect(screen.getByText('Freelance page')).toBeInTheDocument()
    })
})
