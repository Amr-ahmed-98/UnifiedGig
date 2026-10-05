import { test, expect, type Page } from '@playwright/test'
import { mockApi, mockMaterialsApi, mockMaterials } from './fixtures'

const SE_COUNT = mockMaterials.filter((m) => m.field === 'software-engineering').length // 4
const TOTAL = mockMaterials.length // 7

async function openFilters(page: Page, isMobile: boolean) {
    // Below lg the filter panel sits behind a toggle button
    if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('Materials hub (/materials)', () => {
    test.beforeEach(async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials')
        // Counts only appear after hydration + the first fetch; wait so typing isn't lost on slow engines
        await expect(page.getByText(`${TOTAL} materials · 9 fields`)).toBeVisible()
    })

    test('shows the hero and all 9 fields', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn the field')
        await expect(page.getByRole('heading', { name: '9 fields' })).toBeVisible()
        for (const name of [
            'Software Engineering', 'Networking', 'Cybersecurity', 'Data Science & AI', 'UI / UX Design',
            'DevOps & Cloud', 'Mobile Development', 'Product Management', 'Digital Marketing',
        ]) {
            await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible()
        }
    })

    test('cards show material counts with correct pluralisation', async ({ page }) => {
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()
        await expect(page.getByText('2 materials', { exact: true })).toBeVisible()
        await expect(page.getByText('1 material', { exact: true })).toBeVisible()
        await expect(page.getByText('0 materials', { exact: true })).toHaveCount(6)
    })

    test('searching narrows the fields by name', async ({ page }) => {
        await page.getByPlaceholder('Search fields, topics…').fill('network')
        await expect(page.getByRole('heading', { name: '1 fields' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Networking', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Cybersecurity', level: 3 })).not.toBeVisible()
    })

    test('searching also matches topic chips', async ({ page }) => {
        await page.getByPlaceholder('Search fields, topics…').fill('kubernetes')
        await expect(page.getByRole('heading', { name: 'DevOps & Cloud', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Networking', level: 3 })).not.toBeVisible()
    })

    test('shows an empty state and can reset', async ({ page }) => {
        await page.getByPlaceholder('Search fields, topics…').fill('zzzzzz')
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()

        await page.getByRole('button', { name: 'Reset filters' }).click({ force: true })
        await expect(page.getByRole('heading', { name: '9 fields' })).toBeVisible()
    })

    test('clicking a field opens its page', async ({ page }) => {
        await page.getByRole('link', { name: /Software Engineering/ }).click()
        await expect(page).toHaveURL('/materials/software-engineering')
        await expect(page.getByRole('heading', { level: 1, name: 'Software Engineering' })).toBeVisible()
    })

    test('does not overflow horizontally', async ({ page }) => {
        await expectNoHorizontalOverflow(page)
    })
})

test.describe('Field page (/materials/software-engineering)', () => {
    test.beforeEach(async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials/software-engineering')
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()
    })

    test('renders the header and the field’s materials only', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: 'Software Engineering' })).toBeVisible()
        await expect(page.getByText(`Materials · ${SE_COUNT} shared`)).toBeVisible()
        await expect(page.getByRole('link', { name: /Backend Developer Roadmap/ })).toBeVisible()
        await expect(page.getByRole('link', { name: /CS50x/ })).toBeVisible()
        // belongs to another field
        await expect(page.getByRole('link', { name: /TryHackMe/ })).toHaveCount(0)
    })

    test('lists materials newest first', async ({ page }) => {
        const titles = await page.locator('main h3').allTextContents()
        expect(titles[0]).toBe('Backend Developer Roadmap') // 3 days ago
        expect(titles[titles.length - 1]).toBe('Refactoring Guru — Design Patterns') // 12 days ago
    })

    test('each card links out in a new tab', async ({ page }) => {
        const link = page.getByRole('link', { name: /Backend Developer Roadmap/ })
        await expect(link).toHaveAttribute('href', 'https://roadmap.sh/backend')
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', /noopener/)
    })

    test('card shows type, host and shared-ago', async ({ page }) => {
        const card = page.getByRole('link', { name: /Backend Developer Roadmap/ })
        await expect(card.getByText('Docs')).toBeVisible()
        await expect(card.getByText(/roadmap\.sh/)).toBeVisible()
        await expect(card.getByText(/Shared by the community · 3 days ago/)).toBeVisible()
    })

    test('back link returns to the hub', async ({ page }) => {
        await page.getByRole('link', { name: 'All fields' }).click()
        await expect(page).toHaveURL('/materials')
    })

    test('filters results by search query', async ({ page }) => {
        await page.getByPlaceholder('Search materials…').fill('harvard')
        // debounced 300ms before refetch
        await expect(page.getByRole('link', { name: /CS50x/ })).toBeVisible()
        await expect(page.getByRole('link', { name: /Backend Developer Roadmap/ })).not.toBeVisible()
        await expect(page.getByText('1 material', { exact: true })).toBeVisible()
    })

    test('filters results by type', async ({ page, isMobile }) => {
        await openFilters(page, isMobile)
        await page.getByRole('button', { name: /^Course/ }).click()

        await expect(page.getByRole('link', { name: /CS50x/ })).toBeVisible()
        await expect(page.getByRole('link', { name: /Backend Developer Roadmap/ })).not.toBeVisible()
        await expect(page.getByText('1 material', { exact: true })).toBeVisible()
    })

    test('type pills show counts, including zero', async ({ page, isMobile }) => {
        await openFilters(page, isMobile)
        await expect(page.getByRole('button', { name: /^Course/ })).toContainText('1')
        await expect(page.getByRole('button', { name: /^Video/ })).toContainText('0')
    })

    test('multiple types combine and "Clear all filters" resets them', async ({ page, isMobile }) => {
        await openFilters(page, isMobile)
        await page.getByRole('button', { name: /^Course/ }).click()
        await page.getByRole('button', { name: /^Repo/ }).click()
        await expect(page.getByText('2 materials', { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Clear all filters' }).click()
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()
    })

    test('shows a no-match state when filters hide everything', async ({ page, isMobile }) => {
        await openFilters(page, isMobile)
        await page.getByRole('button', { name: /^Book/ }).click()
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()
    })

    test('does not overflow horizontally', async ({ page }) => {
        await expectNoHorizontalOverflow(page)
    })
})

test.describe('Field page edge cases', () => {
    test('empty field invites the first share', async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials/digital-marketing')

        await expect(page.getByText('Nothing here yet.')).toBeVisible()
        await expect(page.getByText(/learn Digital Marketing/).last()).toBeVisible()

        await page.getByRole('button', { name: 'Add material' }).last().click()
        await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('load more appends the remaining materials', async ({ page }) => {
        const many = Array.from({ length: 30 }, (_, i) => ({
            ...mockMaterials[0],
            id: `bulk-${i}`,
            title: `Material number ${i}`,
            url: `https://example.com/${i}`,
            // newer index = older item so ordering stays deterministic
            createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
        }))
        await mockMaterialsApi(page, { materials: many })
        await page.goto('/materials/software-engineering')

        await expect(page.getByText('30 materials', { exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Material number 0' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Material number 29' })).toHaveCount(0)

        await page.getByRole('button', { name: 'Load more materials' }).click()
        await expect(page.getByRole('heading', { name: 'Material number 29' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Load more materials' })).toHaveCount(0)
    })

    test('shows an error banner when the API fails', async ({ page }) => {
        await page.route('**/api/materials**', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }))
        await page.goto('/materials/software-engineering')
        await expect(page.getByText('Failed to load materials')).toBeVisible()
    })

    test('unknown field returns 404', async ({ page }) => {
        await mockMaterialsApi(page)
        const res = await page.goto('/materials/underwater-basket-weaving')
        expect(res?.status()).toBe(404)
    })
})

test.describe('Add material flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials/software-engineering', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Add material' }).click()
        await expect(page.getByRole('dialog', { name: 'Add material' })).toBeVisible()
    })

    test('modal shows the form with Course preselected', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await expect(dialog.getByText('Share a link that helps people learn Software Engineering.')).toBeVisible()
        await expect(dialog.getByLabel('Link')).toBeVisible()
        await expect(dialog.getByLabel('Title')).toBeVisible()
        await expect(dialog.getByLabel(/why it's useful/i)).toBeVisible()
        await expect(dialog.getByText('Optional')).toBeVisible()
        for (const t of ['Course', 'Video', 'Article', 'Docs', 'Book', 'Repo']) {
            await expect(dialog.getByRole('button', { name: t, exact: true })).toBeVisible()
        }
        await expect(dialog.getByRole('button', { name: 'Course', exact: true })).toHaveAttribute('aria-pressed', 'true')
    })

    test('adds a material end-to-end and shows it in the list', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Link').fill('https://example.com/clean-code')
        await dialog.getByLabel('Title').fill('Clean Code Notes')
        await dialog.getByRole('button', { name: 'Book', exact: true }).click()
        await dialog.getByLabel(/why it's useful/i).fill('Short and practical.')

        const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/materials'))
        await dialog.getByRole('button', { name: 'Add material' }).click()

        expect((await post).postDataJSON()).toEqual({
            field: 'software-engineering',
            url: 'https://example.com/clean-code',
            title: 'Clean Code Notes',
            type: 'book',
            description: 'Short and practical.',
        })

        await expect(page.getByRole('dialog', { name: 'Add material' })).toHaveCount(0)
        await expect(page.getByRole('heading', { name: 'Clean Code Notes' })).toBeVisible()
        await expect(page.getByText(`${SE_COUNT + 1} materials`, { exact: true })).toBeVisible()
        // newest first -> brand new item leads the list
        await expect(page.locator('main h3').first()).toHaveText('Clean Code Notes')
    })

    test('description is optional', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Link').fill('https://example.com/x')
        await dialog.getByLabel('Title').fill('No description here')

        const post = page.waitForRequest((r) => r.method() === 'POST')
        await dialog.getByRole('button', { name: 'Add material' }).click()
        expect((await post).postDataJSON().description).toBeNull()
        await expect(page.getByRole('heading', { name: 'No description here' })).toBeVisible()
    })

    test('rejects an invalid link without calling the API', async ({ page }) => {
        let posts = 0
        page.on('request', (r) => r.method() === 'POST' && r.url().includes('/api/materials') && posts++)

        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Link').fill('not-a-link')
        await dialog.getByLabel('Title').fill('Whatever')
        await dialog.getByRole('button', { name: 'Add material' }).click()

        await expect(dialog.getByRole('alert')).toHaveText('Enter a valid link starting with https://')
        await expect(dialog).toBeVisible()
        expect(posts).toBe(0)
    })

    test('rejects a missing title', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Link').fill('https://example.com/x')
        await dialog.getByRole('button', { name: 'Add material' }).click()
        await expect(dialog.getByRole('alert')).toHaveText('Add a title')
    })

    test('Cancel closes without adding', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Title').fill('Discard me')
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toHaveCount(0)
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()
    })

    test('X button and Escape close the modal', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByRole('button', { name: 'Close' }).click()
        await expect(dialog).toHaveCount(0)

        await page.getByRole('button', { name: 'Add material' }).click()
        await expect(dialog).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
    })

    test('reopening gives a fresh form', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await dialog.getByLabel('Title').fill('Stale draft')
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toHaveCount(0)

        await page.getByRole('button', { name: 'Add material' }).click()
        await expect(dialog.getByLabel('Title')).toHaveValue('')
    })

    test('modal fits the viewport without horizontal overflow', async ({ page }) => {
        await expectNoHorizontalOverflow(page)
        const box = await page.getByRole('dialog', { name: 'Add material' }).boundingBox()
        const vp = page.viewportSize()!
        expect(box!.x).toBeGreaterThanOrEqual(-1)
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
    })

    test('on mobile the modal is a bottom sheet', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'bottom-sheet layout only applies below the sm breakpoint')
        const vp = page.viewportSize()!
        await expect
            .poll(async () => {
                const b = await page.getByRole('dialog', { name: 'Add material' }).boundingBox()
                return b ? Math.round(b.y + b.height) : -1
            })
            .toBe(vp.height)
    })
})

test.describe('Add material server errors', () => {
    test('shows the server error and keeps the modal open', async ({ page }) => {
        await mockMaterialsApi(page, { failPost: { status: 400, error: 'Title max 140 characters' } })
        await page.goto('/materials/software-engineering', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Add material' }).click()
        const dialog = page.getByRole('dialog', { name: 'Add material' })
        await expect(dialog).toBeVisible()
        await dialog.getByLabel('Link').fill('https://example.com/x')
        await dialog.getByLabel('Title').fill('Will fail')
        await dialog.getByRole('button', { name: 'Add material' }).click()

        await expect(dialog.getByRole('alert')).toHaveText('Title max 140 characters')
        await expect(dialog).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Will fail' })).toHaveCount(0)
    })
})

test.describe('Theme', () => {
    test('pages and modal work in light mode', async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials/software-engineering')
        await expect(page.getByText(`${SE_COUNT} materials`, { exact: true })).toBeVisible()

        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)
        const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)

        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await expect(html).not.toHaveClass(/dark/)
        const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
        expect(lightBg).not.toBe(darkBg)

        // content + modal remain usable in light mode
        await expect(page.getByRole('heading', { level: 1, name: 'Software Engineering' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Backend Developer Roadmap/ })).toBeVisible()
        await page.getByRole('button', { name: 'Add material' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()

        const dialogBg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)
        const dialogText = await dialog.getByRole('heading', { name: 'Add material' }).evaluate((el) => getComputedStyle(el).color)
        expect(dialogBg).not.toBe(dialogText)
    })

    test('theme choice persists from hub to field page', async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials')
        await expect(page.getByText(`${TOTAL} materials · 9 fields`)).toBeVisible()

        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await expect(page.locator('html')).not.toHaveClass(/dark/)

        await page.getByRole('link', { name: /Networking/ }).click()
        await expect(page).toHaveURL('/materials/networking')
        await expect(page.locator('html')).not.toHaveClass(/dark/)
    })
})

test.describe('Navigation', () => {
    test('the navbar Learn link reaches the materials hub', async ({ page, isMobile }) => {
        await mockApi(page)
        await mockMaterialsApi(page)
        await page.goto('/')

        if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click()
        await page.getByRole('link', { name: 'Learn', exact: true }).click()

        await expect(page).toHaveURL('/materials')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn the field')
    })

    test('deep link to a field page works directly', async ({ page }) => {
        await mockMaterialsApi(page)
        await page.goto('/materials/networking')
        await expect(page.getByRole('heading', { level: 1, name: 'Networking' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Jeremy/ })).toBeVisible()
    })
})
