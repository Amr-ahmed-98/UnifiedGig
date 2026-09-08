import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from './theme-provider'

const { nextThemesProviderMock } = vi.hoisted(() => ({
    nextThemesProviderMock: vi.fn(({ children }: { children: React.ReactNode }) => (
        <div data-testid="next-themes-provider">{children}</div>
    )),
}))
vi.mock('next-themes', () => ({ ThemeProvider: nextThemesProviderMock }))

describe('ThemeProvider', () => {
    it('renders its children', () => {
        render(
            <ThemeProvider>
                <p>App content</p>
            </ThemeProvider>
        )
        expect(screen.getByText('App content')).toBeInTheDocument()
    })

    it('forwards props to next-themes provider', () => {
        render(
            <ThemeProvider attribute="class" defaultTheme="dark">
                <p>App content</p>
            </ThemeProvider>
        )
        expect(nextThemesProviderMock).toHaveBeenCalledWith(
            expect.objectContaining({ attribute: 'class', defaultTheme: 'dark' }),
            undefined
        )
    })
})
