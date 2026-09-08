import '@testing-library/jest-dom/vitest'

// jsdom has no IntersectionObserver; framer-motion's useInView / whileInView
// need one to exist, even as a no-op, or mounting throws.
class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords(): IntersectionObserverEntry[] {
        return []
    }
}

globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver