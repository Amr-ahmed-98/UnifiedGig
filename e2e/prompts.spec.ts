import { test, expect, type Page } from '@playwright/test'
import { mockApi, mockPromptsApi, mockPrompts, mockPromptWithoutTools } from './fixtures'
import type { Prompt } from '../src/types/prompt'

const TOTAL = mockPrompts.length // 6
const PROGRAMMING_COUNT = mockPrompts.filter((p) => p.category === 'programming').length // 2

const list = (page: Page) => page.getByRole('region', { name: 'Prompts' })
const cardTitles = (page: Page) => page.locator('main article h3').allTextContents()

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
}

/** Fills and submits the share form that is already open. */
async function sharePrompt(page: Page, data: { category?: string; title: string; body: string; tools?: string }) {
    const dialog = page.getByRole('dialog', { name: 'Share a prompt' })
    if (data.category) await dialog.getByRole('button', { name: data.category, exact: true }).click()
    await dialog.getByLabel('Title').fill(data.title)
    await dialog.getByLabel('Prompt', { exact: true }).fill(data.body)
    if (data.tools) await dialog.getByLabel('Works with').fill(data.tools)
    await dialog.getByRole('button', { name: 'Share prompt' }).click()
}

test.describe('Prompt library (/prompts)', () => {
    test.beforeEach(async ({ page }) => {
        // Capture what the Copy button writes — real clipboard permissions differ per browser
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: (text: string) => {
                        ;(window as unknown as { __copied?: string }).__copied = text
                        return Promise.resolve()
                    },
                },
            })
        })
        await mockPromptsApi(page)
        await page.goto('/prompts')
        // Counts only appear after hydration + the first fetch; wait so typing isn't lost on slow engines
        await expect(list(page).getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()
    })

    test.describe('page', () => {
        test('shows the hero, search and share button', async ({ page }) => {
            await expect(page.getByRole('heading', { level: 1 })).toContainText('Better prompts')
            await expect(page.getByRole('heading', { level: 1 })).toContainText('better output.')
            await expect(page.getByText('Fill in the [brackets]', { exact: false })).toBeVisible()
            await expect(page.getByPlaceholder('Search prompts, tools…')).toBeVisible()
            await expect(page.getByRole('button', { name: 'Share a prompt' })).toBeVisible()
        })

        test('lists every prompt newest first', async ({ page }) => {
            const titles = await cardTitles(page)
            expect(titles).toHaveLength(TOTAL)
            expect(titles[0]).toBe('Senior code review') // 1 hour ago
            expect(titles[titles.length - 1]).toBe('Cold message to a recruiter') // 6 hours ago
        })

        test('each card shows category, prompt text and works-with tools', async ({ page }) => {
            const card = page.getByRole('article').filter({ hasText: 'Senior code review' })
            await expect(card.getByText('Programming')).toBeVisible()
            await expect(card.getByText('[language]')).toBeVisible()
            await expect(card.getByText('Works with')).toBeVisible()
            for (const tool of ['ChatGPT', 'Claude', 'Gemini']) await expect(card.getByText(tool, { exact: true })).toBeVisible()
        })

        test('shows whole-library count in the hero', async ({ page }) => {
            await expect(page.locator('section').first().getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()
        })

        test('does not overflow horizontally', async ({ page }) => {
            await expectNoHorizontalOverflow(page)
        })
    })

    test.describe('search', () => {
        test('filters by title', async ({ page }) => {
            await page.getByPlaceholder('Search prompts, tools…').fill('headshot')
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Professional headshot', level: 3 })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Senior code review', level: 3 })).not.toBeVisible()
        })

        test('filters by words inside the prompt text', async ({ page }) => {
            await page.getByPlaceholder('Search prompts, tools…').fill('golden hour')
            await expect(page.getByRole('heading', { name: 'Cinematic B-roll shot', level: 3 })).toBeVisible()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
        })

        test('filters by tool name', async ({ page }) => {
            await page.getByPlaceholder('Search prompts, tools…').fill('midjourney')
            await expect(page.getByRole('heading', { name: 'Professional headshot', level: 3 })).toBeVisible()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
        })

        test('partial tool names work too', async ({ page }) => {
            await page.getByPlaceholder('Search prompts, tools…').fill('chat')
            // ChatGPT is on 4 of the 6 prompts
            await expect(list(page).getByText('4 prompts', { exact: true })).toBeVisible()
        })

        test('shows an empty state and can reset', async ({ page }) => {
            await page.getByPlaceholder('Search prompts, tools…').fill('zzzzzz')
            await expect(page.getByText('Nothing matches — yet.')).toBeVisible()

            await page.getByRole('button', { name: 'Reset filters' }).click({ force: true })
            await expect(list(page).getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()
            await expect(page.getByPlaceholder('Search prompts, tools…')).toHaveValue('')
        })

        test('the clear (x) button empties the search', async ({ page }) => {
            const box = page.getByPlaceholder('Search prompts, tools…')
            await box.fill('headshot')
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
            await page.getByRole('button', { name: 'Clear search' }).click()
            await expect(box).toHaveValue('')
            await expect(list(page).getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()
        })
    })

    test.describe('category filters', () => {
        test('pills show every category with counts', async ({ page }) => {
            await expect(page.getByText('Use it for')).toBeVisible()
            await expect(page.getByRole('button', { name: /^Programming/ })).toContainText(String(PROGRAMMING_COUNT))
            for (const name of ['Images', 'Video', 'Writing', 'Career']) {
                await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toContainText('1')
            }
        })

        test('filters by one category', async ({ page }) => {
            await page.getByRole('button', { name: /^Programming/ }).click()
            await expect(list(page).getByText(`${PROGRAMMING_COUNT} prompts`, { exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Senior code review', level: 3 })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Professional headshot', level: 3 })).not.toBeVisible()
            await expect(page.getByRole('button', { name: /^Programming/ })).toHaveAttribute('aria-pressed', 'true')
        })

        test('combines categories, and toggling one off removes it', async ({ page }) => {
            await page.getByRole('button', { name: /^Images/ }).click()
            await page.getByRole('button', { name: /^Video/ }).click()
            await expect(list(page).getByText('2 prompts', { exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Cinematic B-roll shot', level: 3 })).toBeVisible()

            await page.getByRole('button', { name: /^Images/ }).click()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Professional headshot', level: 3 })).not.toBeVisible()
        })

        test('search and category filters work together', async ({ page }) => {
            await page.getByRole('button', { name: /^Programming/ }).click()
            await page.getByPlaceholder('Search prompts, tools…').fill('error')
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: /Explain an error/, level: 3 })).toBeVisible()
        })

        test('counts stay whole-library while filtering', async ({ page }) => {
            await page.getByRole('button', { name: /^Images/ }).click()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: /^Programming/ })).toContainText(String(PROGRAMMING_COUNT))
        })

        test('"Clear all filters" is disabled until used, then resets everything', async ({ page }) => {
            const clear = page.getByRole('button', { name: 'Clear all filters' })
            await expect(clear).toBeDisabled()

            await page.getByRole('button', { name: /^Career/ }).click()
            await expect(clear).toBeEnabled()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()

            await clear.click()
            await expect(clear).toBeDisabled()
            await expect(list(page).getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()
        })
    })

    test.describe('copy', () => {
        test('copies the raw prompt text and shows feedback', async ({ page }) => {
            const card = page.getByRole('article').filter({ hasText: 'Senior code review' })
            await card.getByRole('button', { name: 'Copy prompt: Senior code review' }).click()

            await expect(card.getByRole('button', { name: 'Prompt copied' })).toContainText('Copied')
            const copied = await page.evaluate(() => (window as unknown as { __copied?: string }).__copied)
            expect(copied).toBe(mockPrompts[0].body)
        })

        test('the Copied state goes back to Copy', async ({ page }) => {
            const card = page.getByRole('article').filter({ hasText: 'Professional headshot' })
            await card.getByRole('button', { name: /^Copy prompt/ }).click()
            await expect(card.getByText('Copied')).toBeVisible()
            await expect(card.getByRole('button', { name: 'Copy prompt: Professional headshot' })).toBeVisible({ timeout: 5_000 })
        })

        test('copying one card does not mark the others', async ({ page }) => {
            const first = page.getByRole('article').filter({ hasText: 'Senior code review' })
            await first.getByRole('button', { name: /^Copy prompt/ }).click()
            await expect(first.getByText('Copied')).toBeVisible()
            await expect(page.getByText('Copied')).toHaveCount(1)
        })
    })

    test.describe('share a prompt', () => {
        test.beforeEach(async ({ page }) => {
            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await expect(page.getByRole('dialog', { name: 'Share a prompt' })).toBeVisible()
        })

        test('shows the form with Programming selected and Works with optional', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await expect(dialog.getByText('Use [brackets] for the parts people should fill in themselves.')).toBeVisible()
            for (const c of ['Programming', 'Images', 'Video', 'Writing', 'Career']) {
                await expect(dialog.getByRole('button', { name: c, exact: true })).toBeVisible()
            }
            await expect(dialog.getByRole('button', { name: 'Programming', exact: true })).toHaveAttribute('aria-pressed', 'true')
            await expect(dialog.getByText('Optional')).toBeVisible()
            await expect(dialog.getByText('Separate with commas')).toBeVisible()
        })

        test('focuses the title field', async ({ page }) => {
            await expect(page.getByRole('dialog').getByLabel('Title')).toBeFocused()
        })

        test('closes with Cancel, the X button, Escape and the backdrop', async ({ page }) => {
            const dialog = page.getByRole('dialog')

            await dialog.getByRole('button', { name: 'Cancel' }).click()
            await expect(dialog).not.toBeVisible()

            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await dialog.getByRole('button', { name: 'Close' }).click()
            await expect(dialog).not.toBeVisible()

            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await page.keyboard.press('Escape')
            await expect(dialog).not.toBeVisible()

            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await page.mouse.click(2, 2)
            await expect(dialog).not.toBeVisible()
        })

        test('blocks submit without a title', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Prompt', { exact: true }).fill('A long enough prompt with [brackets] in it.')
            await dialog.getByRole('button', { name: 'Share prompt' }).click()
            await expect(dialog.getByRole('alert')).toHaveText('Add a title')
            await expect(dialog).toBeVisible()
        })

        test('blocks submit when the prompt is too short', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Title').fill('Short one')
            await dialog.getByLabel('Prompt', { exact: true }).fill('too short')
            await dialog.getByRole('button', { name: 'Share prompt' }).click()
            await expect(dialog.getByRole('alert')).toHaveText('Prompt needs at least 20 characters')
        })

        test('shares a prompt, closes the modal and shows it first in the list', async ({ page }) => {
            await sharePrompt(page, {
                category: 'Writing',
                title: 'Write unit tests for my function',
                body: 'Write unit tests for [function] using [framework], covering edge cases.',
                tools: 'chatgpt, Claude',
            })

            await expect(page.getByRole('dialog')).not.toBeVisible()
            await expect(list(page).getByText(`${TOTAL + 1} prompts`, { exact: true })).toBeVisible()

            const titles = await cardTitles(page)
            expect(titles[0]).toBe('Write unit tests for my function')

            const card = page.getByRole('article').filter({ hasText: 'Write unit tests for my function' })
            await expect(card.getByText('Writing')).toBeVisible()
            // tool names are normalised
            await expect(card.getByText('ChatGPT', { exact: true })).toBeVisible()
            await expect(card.getByText('Claude', { exact: true })).toBeVisible()
            await expect(card.getByText('[function]')).toBeVisible()
        })

        test('"Works with" can be left empty — the card has no footer', async ({ page }) => {
            await sharePrompt(page, {
                title: 'Plain rewrite helper',
                body: 'Rewrite the text below so it is clearer: [paste text]',
            })
            const card = page.getByRole('article').filter({ hasText: 'Plain rewrite helper' })
            await expect(card).toBeVisible()
            await expect(card.getByText('Works with')).toHaveCount(0)
        })

        test('clears active filters so the new prompt is visible', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByRole('button', { name: 'Cancel' }).click()
            await expect(dialog).not.toBeVisible()
            await page.getByRole('button', { name: /^Images/ }).click()
            await expect(list(page).getByText('1 prompt', { exact: true })).toBeVisible()

            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await sharePrompt(page, {
                category: 'Career',
                title: 'Salary negotiation script',
                body: 'Help me negotiate a salary for a [job title] role in [city].',
            })

            await expect(page.getByRole('dialog')).not.toBeVisible()
            await expect(page.getByRole('heading', { name: 'Salary negotiation script', level: 3 })).toBeVisible()
            await expect(page.getByRole('button', { name: /^Images/ })).toHaveAttribute('aria-pressed', 'false')
        })

        test('the form is empty again the next time it opens', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Title').fill('Half-written')
            await dialog.getByRole('button', { name: 'Career', exact: true }).click()
            await dialog.getByRole('button', { name: 'Cancel' }).click()

            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await expect(dialog.getByLabel('Title')).toHaveValue('')
            await expect(dialog.getByRole('button', { name: 'Programming', exact: true })).toHaveAttribute('aria-pressed', 'true')
        })

        test('fits inside the viewport', async ({ page }) => {
            const viewport = page.viewportSize()!
            await expect
                .poll(async () => {
                    const b = await page.getByRole('dialog').boundingBox()
                    return b ? b.y + b.height : -1
                })
                .toBeLessThanOrEqual(viewport.height + 1)
            const box = (await page.getByRole('dialog').boundingBox())!
            expect(box.x).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
            await expectNoHorizontalOverflow(page)
        })
    })

    test.describe('theme', () => {
        test('works in light and dark mode', async ({ page }) => {
            const html = page.locator('html')
            await expect(html).toHaveClass(/dark/)
            const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
            const darkBg = await bg()
            await expect(page.getByRole('heading', { name: 'Senior code review', level: 3 })).toBeVisible()

            await page.getByRole('button', { name: 'Toggle theme' }).click()
            await expect(html).not.toHaveClass(/dark/)
            expect(await bg()).not.toBe(darkBg)
            await expect(page.getByRole('heading', { name: 'Senior code review', level: 3 })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Share a prompt' })).toBeVisible()
        })

        test('the share modal is usable in light mode', async ({ page }) => {
            await page.getByRole('button', { name: 'Toggle theme' }).click()
            await expect(page.locator('html')).not.toHaveClass(/dark/)
            await page.getByRole('button', { name: 'Share a prompt' }).click()
            await expect(page.getByRole('dialog', { name: 'Share a prompt' })).toBeVisible()
            await expect(page.getByRole('dialog').getByLabel('Title')).toBeVisible()
        })
    })
})

test.describe('Prompt library — pagination', () => {
    test('loads more prompts 24 at a time', async ({ page }) => {
        const many: Prompt[] = Array.from({ length: 30 }, (_, i) => ({
            id: `bulk-${i}`,
            category: 'programming',
            title: `Bulk prompt ${String(i).padStart(2, '0')}`,
            body: `Bulk prompt body number ${i} with a [placeholder].`,
            tools: [],
            createdAt: new Date(Date.now() - i * 60_000).toISOString(),
        }))
        await mockPromptsApi(page, { prompts: many })
        await page.goto('/prompts')

        await expect(list(page).getByText('30 prompts', { exact: true })).toBeVisible()
        await expect(page.locator('main article')).toHaveCount(24)

        await page.getByRole('button', { name: 'Load more prompts' }).click()
        await expect(page.locator('main article')).toHaveCount(30)
        await expect(page.getByRole('button', { name: 'Load more prompts' })).toHaveCount(0)
    })
})

test.describe('Prompt library — states', () => {
    test('shows the first-share invitation when the library is empty', async ({ page }) => {
        await mockPromptsApi(page, { prompts: [] })
        await page.goto('/prompts')
        await expect(page.getByText('No prompts yet.')).toBeVisible()

        await page.getByRole('button', { name: 'Share a prompt' }).last().click()
        await expect(page.getByRole('dialog', { name: 'Share a prompt' })).toBeVisible()
    })

    test('shows an error banner when the list fails to load', async ({ page }) => {
        await page.route('**/api/prompts**', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }))
        await page.goto('/prompts')
        await expect(page.getByText('Failed to load prompts')).toBeVisible()
    })

    test('keeps the modal open and shows the server error when sharing fails', async ({ page }) => {
        await mockPromptsApi(page, { failPost: { status: 500, error: 'Failed to share prompt' } })
        await page.goto('/prompts')
        await expect(list(page).getByText(`${TOTAL} prompts`, { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Share a prompt' }).click()
        await sharePrompt(page, { title: 'Will fail', body: 'This request is going to fail on the server side.' })

        const dialog = page.getByRole('dialog')
        await expect(dialog.getByRole('alert')).toHaveText('Failed to share prompt')
        // what the user typed is kept so they can retry
        await expect(dialog.getByLabel('Title')).toHaveValue('Will fail')
        await expect(page.locator('main article')).toHaveCount(TOTAL)
    })

    test('a prompt without tools renders without a works-with footer', async ({ page }) => {
        await mockPromptsApi(page, { prompts: [mockPromptWithoutTools] })
        await page.goto('/prompts')
        const card = page.getByRole('article').filter({ hasText: mockPromptWithoutTools.title })
        await expect(card).toBeVisible()
        await expect(card.getByText('Works with')).toHaveCount(0)
    })
})

test.describe('Prompt library — navigation', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
        await mockPromptsApi(page)
    })

    test('top nav links to the prompts page', async ({ page, isMobile }) => {
        test.skip(isMobile, 'desktop top nav is collapsed into hamburger on mobile')
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Prompts' }).click()
        await expect(page).toHaveURL('/prompts')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Better prompts')
    })

    test('mobile menu links to the prompts page', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'desktop nav renders links inline, no hamburger to test')
        await page.goto('/')
        await page.getByRole('button', { name: 'Toggle navigation' }).click()
        await page.getByRole('link', { name: 'Prompts' }).last().click()
        await expect(page).toHaveURL('/prompts')
    })

    test('the Prompts nav item is highlighted on the page', async ({ page, isMobile }) => {
        test.skip(isMobile, 'desktop nav only')
        await page.goto('/prompts')
        await expect(page.getByRole('navigation').getByRole('link', { name: 'Prompts' })).toHaveClass(/text-ink/)
    })
})
