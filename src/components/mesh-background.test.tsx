import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MeshBackground } from './mesh-background'

describe('MeshBackground', () => {
    it('is hidden from assistive tech', () => {
        const { container } = render(<MeshBackground />)
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    })

    it('applies full opacity by default', () => {
        const { container } = render(<MeshBackground />)
        expect(container.firstChild).toHaveStyle({ opacity: '1' })
    })

    it('applies reduced opacity for the soft intensity', () => {
        const { container } = render(<MeshBackground intensity="soft" />)
        expect(container.firstChild).toHaveStyle({ opacity: '0.5' })
    })

    it('renders the grid overlay for the mesh variant', () => {
        const { container } = render(<MeshBackground variant="mesh" />)
        expect(container.querySelector('.ug-grid')).toBeInTheDocument()
    })

    it('renders the grid overlay for the shapes variant', () => {
        const { container } = render(<MeshBackground variant="shapes" />)
        expect(container.querySelector('.ug-grid')).toBeInTheDocument()
    })
})
