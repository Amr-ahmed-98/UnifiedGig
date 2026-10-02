import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  ComingSoonModal,
  COMING_SOON_SESSION_KEY,
  COMING_SOON_PERMANENT_KEY,
} from './coming-soon-modal'

describe('ComingSoonModal', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renders modal when neither localStorage nor sessionStorage flags are set', async () => {
    render(<ComingSoonModal initialDelayMs={0} />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /got you/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /don't show me again/i })
    ).toBeInTheDocument()
    expect(
      screen.getByAltText(/what's new on unifiedgig/i)
    ).toBeInTheDocument()
  })

  it('does NOT render if permanently dismissed in localStorage', async () => {
    localStorage.setItem(COMING_SOON_PERMANENT_KEY, 'true')
    render(<ComingSoonModal initialDelayMs={0} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does NOT render if session dismissed in sessionStorage', async () => {
    sessionStorage.setItem(COMING_SOON_SESSION_KEY, 'true')
    render(<ComingSoonModal initialDelayMs={0} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking "Got you 👍" stores flag in sessionStorage and closes modal', async () => {
    const onClose = vi.fn()
    render(<ComingSoonModal initialDelayMs={0} onClose={onClose} />)

    const gotYouBtn = await screen.findByRole('button', { name: /got you/i })
    fireEvent.click(gotYouBtn)

    expect(sessionStorage.getItem(COMING_SOON_SESSION_KEY)).toBe('true')
    expect(localStorage.getItem(COMING_SOON_PERMANENT_KEY)).toBeNull()
    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clicking "Don\'t show me again 🚫" stores flag in localStorage and closes modal', async () => {
    const onClose = vi.fn()
    render(<ComingSoonModal initialDelayMs={0} onClose={onClose} />)

    const dontShowBtn = await screen.findByRole('button', { name: /don't show me again/i })
    fireEvent.click(dontShowBtn)

    expect(localStorage.getItem(COMING_SOON_PERMANENT_KEY)).toBe('true')
    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clicking the close X button dismisses for the current session', async () => {
    const onClose = vi.fn()
    render(<ComingSoonModal initialDelayMs={0} onClose={onClose} />)

    const closeBtn = await screen.findByRole('button', { name: /close coming soon announcement/i })
    fireEvent.click(closeBtn)

    expect(sessionStorage.getItem(COMING_SOON_SESSION_KEY)).toBe('true')
    expect(localStorage.getItem(COMING_SOON_PERMANENT_KEY)).toBeNull()
    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('pressing Escape key dismisses for current session', async () => {
    const onClose = vi.fn()
    render(<ComingSoonModal initialDelayMs={0} onClose={onClose} />)

    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(sessionStorage.getItem(COMING_SOON_SESSION_KEY)).toBe('true')
    expect(localStorage.getItem(COMING_SOON_PERMANENT_KEY)).toBeNull()
    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
