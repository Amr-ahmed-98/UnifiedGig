import { test, expect, type Page } from '@playwright/test'
import { mockApi, mockProfiles, mockProfilesApi } from './fixtures'

const TOTAL = mockProfiles.length // 8
const LINKEDIN = mockProfiles.filter((p) => p.platform === 'linkedin').length // 4

const countText = (n: number) => `${n} ${n === 1 ? 'profile' : 'profiles'}`

async function openFilters(page: Page, isMobile: boolean) {
    // Below lg the filter panel sits behind a toggle button
    if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
}

/** Waits until hydration + first fetch finished (hero count and list count both render). */
async function waitForList(page: Page, n = TOTAL) {
    await expect(page.getByText(countText(n), { exact: true })).toHaveCount(2)
}

test.describe('People page (/people)', () => {
    test.beforeEach(async ({ page }) => {
        await mockProfilesApi(page)
        await page.goto('/people')
        await waitForList(page)
    })

    test('shows the hero, search and add button', async ({ page }) => {
        await expect(page.getByText('People to follow', { exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Follow the people')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('who post the jobs.')
        await expect(page.getByPlaceholder('Search names, roles they post…')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Add profile' })).toBeVisible()
    })

    test('lists every profile, newest first', async ({ page }) => {
        await expect(page.getByRole('article')).toHaveCount(TOTAL)
        await expect(page.getByText('Recently added')).toBeVisible()

        const names = await page.locator('main h3').allTextContents()
        expect(names[0]).toBe('Mariam Adel') // 1 day ago
        expect(names[names.length - 1]).toBe('Salma Ibrahim') // 8 days ago
    })

    test('card shows avatar initials, headline, posts-about and platform', async ({ page }) => {
        const card = page.getByRole('article').filter({ hasText: 'Freelance Devs MENA' })
        await expect(card.getByText('FM', { exact: true })).toBeVisible() // first + last word
        await expect(card.getByText('Channel · project leads & gigs')).toBeVisible()
        await expect(card.getByText('Posts about')).toBeVisible()
        await expect(card.getByText('Short freelance web and app projects')).toBeVisible()
        await expect(card.getByText('Telegram', { exact: true })).toBeVisible()
    })

    test('Follow links out in a new tab with safe rel', async ({ page }) => {
        const link = page.getByRole('link', { name: 'Follow Mariam Adel on LinkedIn' })
        await expect(link).toHaveText(/Follow/)
        await expect(link).toHaveAttribute('href', 'https://linkedin.com/in/mariam-adel')
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', /noopener/)
        await expect(link).toHaveAttribute('rel', /nofollow/)
    })

    test('does not overflow horizontally', async ({ page }) => {
        await expectNoHorizontalOverflow(page)
    })

    test.describe('platform filter', () => {
        test('pills show unfiltered counts, including zero', async ({ page, isMobile }) => {
            await openFilters(page, isMobile)
            await expect(page.getByRole('button', { name: /^LinkedIn/ })).toContainText(String(LINKEDIN))
            for (const name of ['Facebook', 'X', 'Instagram', 'Telegram']) {
                await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toContainText('1')
            }
            await expect(page.getByRole('button', { name: /^Other/ })).toContainText('0')
        })

        test('filters to one platform', async ({ page, isMobile }) => {
            await openFilters(page, isMobile)
            await page.getByRole('button', { name: /^LinkedIn/ }).click()

            await expect(page.getByRole('article')).toHaveCount(LINKEDIN)
            await expect(page.getByRole('heading', { name: 'Mariam Adel' })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Egypt Remote Jobs' })).toHaveCount(0)
            await expect(page.getByRole('button', { name: /^LinkedIn/ })).toHaveAttribute('aria-pressed', 'true')
        })

        test('combines several platforms', async ({ page, isMobile }) => {
            await openFilters(page, isMobile)
            await page.getByRole('button', { name: /^LinkedIn/ }).click()
            await page.getByRole('button', { name: /^Telegram/ }).click()

            await expect(page.getByRole('article')).toHaveCount(LINKEDIN + 1)
            await expect(page.getByRole('heading', { name: 'Freelance Devs MENA' })).toBeVisible()
        })

        test('"Clear all filters" is disabled until used, then restores the full list', async ({ page, isMobile }) => {
            await openFilters(page, isMobile)
            const clear = page.getByRole('button', { name: 'Clear all filters' })
            await expect(clear).toBeDisabled()

            await page.getByRole('button', { name: /^X/ }).click()
            await expect(page.getByRole('article')).toHaveCount(1)
            await expect(clear).toBeEnabled()

            await clear.click()
            await expect(page.getByRole('article')).toHaveCount(TOTAL)
            await expect(clear).toBeDisabled()
        })

        test('mobile Filters button shows the active count', async ({ page, isMobile }) => {
            test.skip(!isMobile, 'filter toggle only exists below the lg breakpoint')
            await openFilters(page, true)
            await page.getByRole('button', { name: /^LinkedIn/ }).click()
            await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeVisible()
        })
    })

    test.describe('search', () => {
        const box = (page: Page) => page.getByPlaceholder('Search names, roles they post…')

        test('matches names', async ({ page }) => {
            await box(page).fill('salma')
            await expect(page.getByRole('article')).toHaveCount(1)
            await expect(page.getByRole('heading', { name: 'Salma Ibrahim' })).toBeVisible()
        })

        test('matches headlines, case-insensitively', async ({ page }) => {
            await box(page).fill('FINTECH')
            await expect(page.getByRole('article')).toHaveCount(1)
            await expect(page.getByRole('heading', { name: 'Mariam Adel' })).toBeVisible()
        })

        test('matches what they post about', async ({ page }) => {
            await box(page).fill('react')
            await expect(page.getByRole('article')).toHaveCount(1)
            await expect(page.getByRole('heading', { name: 'Youssef Fathy' })).toBeVisible()
        })

        test('combines with the platform filter', async ({ page, isMobile }) => {
            await openFilters(page, isMobile)
            await page.getByRole('button', { name: /^LinkedIn/ }).click()
            await box(page).fill('data')
            await expect(page.getByRole('article')).toHaveCount(1)
            await expect(page.getByRole('heading', { name: 'Salma Ibrahim' })).toBeVisible()
        })

        test('shows a no-match state and resets', async ({ page }) => {
            await box(page).fill('zzzzzz')
            await expect(page.getByText('Nothing matches — yet.')).toBeVisible()

            await page.getByRole('button', { name: 'Reset filters' }).click({ force: true })
            await expect(page.getByRole('article')).toHaveCount(TOTAL)
        })
    })
})

test.describe('People page edge cases', () => {
    test('empty list invites the first add', async ({ page }) => {
        await mockProfilesApi(page, { profiles: [] })
        await page.goto('/people')

        await expect(page.getByText('No profiles yet.')).toBeVisible()
        await page.getByRole('button', { name: 'Add profile' }).last().click()
        await expect(page.getByRole('dialog', { name: 'Add a profile' })).toBeVisible()
    })

    test('load more appends the remaining profiles', async ({ page }) => {
        const many = Array.from({ length: 30 }, (_, i) => ({
            ...mockProfiles[0],
            id: `bulk-${i}`,
            name: `Person ${i}`,
            url: `https://linkedin.com/in/person-${i}`,
            createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
        }))
        await mockProfilesApi(page, { profiles: many })
        await page.goto('/people')

        await waitForList(page, 30)
        await expect(page.getByRole('article')).toHaveCount(24)
        await expect(page.getByRole('heading', { name: /^Person 29$/ })).toHaveCount(0)

        await page.getByRole('button', { name: 'Load more profiles' }).click()
        await expect(page.getByRole('article')).toHaveCount(30)
        await expect(page.getByRole('heading', { name: /^Person 29$/ })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Load more profiles' })).toHaveCount(0)
    })

    test('shows an error banner when the API fails', async ({ page }) => {
        await page.route('**/api/profiles**', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }))
        await page.goto('/people')
        await expect(page.getByText('Failed to load profiles')).toBeVisible()
    })
})

test.describe('Add profile flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockProfilesApi(page)
        await page.goto('/people')
        await waitForList(page)
        await page.getByRole('button', { name: 'Add profile' }).click()
        await expect(page.getByRole('dialog', { name: 'Add a profile' })).toBeVisible()
    })

    test('modal shows every field with LinkedIn preselected', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await expect(dialog.getByText('Share someone who regularly posts jobs so others can follow them too.')).toBeVisible()
        for (const p of ['LinkedIn', 'Facebook', 'X', 'Instagram', 'Telegram', 'Other']) {
            await expect(dialog.getByRole('button', { name: p, exact: true })).toBeVisible()
        }
        await expect(dialog.getByRole('button', { name: 'LinkedIn', exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(dialog.getByLabel('Profile link')).toBeVisible()
        await expect(dialog.getByLabel('Name')).toBeVisible()
        await expect(dialog.getByLabel('Headline')).toBeVisible()
        await expect(dialog.getByLabel('Usually posts about')).toBeVisible()
        await expect(dialog.getByText('Optional')).toHaveCount(2)
    })

    test('link placeholder follows the selected platform', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        const link = dialog.getByLabel('Profile link')
        await expect(link).toHaveAttribute('placeholder', 'https://linkedin.com/in/…')

        await dialog.getByRole('button', { name: 'Telegram', exact: true }).click()
        await expect(link).toHaveAttribute('placeholder', 'https://t.me/…')
        await expect(dialog.getByRole('button', { name: 'Telegram', exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(dialog.getByRole('button', { name: 'LinkedIn', exact: true })).toHaveAttribute('aria-pressed', 'false')
    })

    test('adds a profile end-to-end and shows it first in the list', async ({ page, isMobile }) => {
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('button', { name: 'Instagram', exact: true }).click()
        await dialog.getByLabel('Profile link').fill('https://www.instagram.com/remote.jobs.eg/')
        await dialog.getByLabel('Name').fill('Remote Jobs EG')
        await dialog.getByLabel('Headline').fill('Page · remote roles')
        await dialog.getByLabel('Usually posts about').fill('Remote engineering roles')

        const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/profiles'))
        await dialog.getByRole('button', { name: 'Add profile' }).click()

        expect((await post).postDataJSON()).toEqual({
            platform: 'instagram',
            url: 'https://www.instagram.com/remote.jobs.eg/',
            name: 'Remote Jobs EG',
            headline: 'Page · remote roles',
            postsAbout: 'Remote engineering roles',
        })

        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(page.getByText(countText(TOTAL + 1), { exact: true })).toHaveCount(2)
        await expect(page.locator('main h3').first()).toHaveText('Remote Jobs EG')
        await expect(page.getByRole('link', { name: 'Follow Remote Jobs EG on Instagram' })).toBeVisible()

        await openFilters(page, isMobile)
        await expect(page.getByRole('button', { name: /^Instagram/ })).toContainText('2')
    })

    test('optional fields are sent as null and the card hides them', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('Profile link').fill('https://linkedin.com/in/minimal-person')
        await dialog.getByLabel('Name').fill('Minimal Person')

        const post = page.waitForRequest((r) => r.method() === 'POST')
        await dialog.getByRole('button', { name: 'Add profile' }).click()
        const body = (await post).postDataJSON()
        expect(body.headline).toBeNull()
        expect(body.postsAbout).toBeNull()

        const card = page.getByRole('article').filter({ hasText: 'Minimal Person' })
        await expect(card).toBeVisible()
        await expect(card.getByText('Posts about')).toHaveCount(0)
    })

    test('"Other" accepts any host', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('button', { name: 'Other', exact: true }).click()
        await dialog.getByLabel('Profile link').fill('https://jobs.example.org/team')
        await dialog.getByLabel('Name').fill('Example Careers')
        await dialog.getByRole('button', { name: 'Add profile' }).click()

        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(page.getByRole('heading', { name: 'Example Careers' })).toBeVisible()
    })

    test.describe('validation', () => {
        let posts = 0
        test.beforeEach(({ page }) => {
            posts = 0
            page.on('request', (r) => r.method() === 'POST' && r.url().includes('/api/profiles') && posts++)
        })

        test('rejects an invalid link', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Profile link').fill('not-a-link')
            await dialog.getByLabel('Name').fill('Someone')
            await dialog.getByRole('button', { name: 'Add profile' }).click()

            await expect(dialog.getByRole('alert')).toHaveText('Enter a valid link starting with https://')
            await expect(dialog).toBeVisible()
            expect(posts).toBe(0)
        })

        test('rejects a link from a different platform', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Profile link').fill('https://x.com/someone')
            await dialog.getByLabel('Name').fill('Someone')
            await dialog.getByRole('button', { name: 'Add profile' }).click()

            await expect(dialog.getByRole('alert')).toHaveText(
                `That link doesn't look like a LinkedIn link — pick "Other" if it's right`
            )
            expect(posts).toBe(0)
        })

        test('rejects a missing name', async ({ page }) => {
            const dialog = page.getByRole('dialog')
            await dialog.getByLabel('Profile link').fill('https://linkedin.com/in/someone')
            await dialog.getByRole('button', { name: 'Add profile' }).click()

            await expect(dialog.getByRole('alert')).toHaveText('Add a name')
            expect(posts).toBe(0)
        })
    })

    test('duplicate link shows the 409 message and keeps the modal open', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        // same profile as Mariam Adel, written with www + trailing slash
        await dialog.getByLabel('Profile link').fill('https://www.linkedin.com/in/mariam-adel/')
        await dialog.getByLabel('Name').fill('Mariam Again')
        await dialog.getByRole('button', { name: 'Add profile' }).click()

        await expect(dialog.getByRole('alert')).toHaveText('That profile is already listed')
        await expect(dialog).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Mariam Again' })).toHaveCount(0)
    })

    test('Cancel, X and Escape close without adding', async ({ page }) => {
        await page.getByRole('dialog').getByLabel('Name').fill('Discard me')
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)

        await page.getByRole('button', { name: 'Add profile' }).click()
        await page.getByRole('button', { name: 'Close' }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)

        await page.getByRole('button', { name: 'Add profile' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)

        await expect(page.getByText(countText(TOTAL), { exact: true })).toHaveCount(2)
    })

    test('reopening gives a fresh form', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('button', { name: 'Telegram', exact: true }).click()
        await dialog.getByLabel('Name').fill('Stale draft')
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)

        await page.getByRole('button', { name: 'Add profile' }).click()
        const fresh = page.getByRole('dialog')
        await expect(fresh.getByLabel('Name')).toHaveValue('')
        await expect(fresh.getByRole('button', { name: 'LinkedIn', exact: true })).toHaveAttribute('aria-pressed', 'true')
    })

    test('modal fits the viewport without horizontal overflow', async ({ page }) => {
        await expectNoHorizontalOverflow(page)
        const box = await page.getByRole('dialog').boundingBox()
        const vp = page.viewportSize()!
        expect(box!.x).toBeGreaterThanOrEqual(-1)
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
    })

    test('on mobile the modal is a bottom sheet', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'bottom-sheet layout only applies below the sm breakpoint')
        const vp = page.viewportSize()!
        await expect
            .poll(async () => {
                const b = await page.getByRole('dialog').boundingBox()
                return b ? Math.round(b.y + b.height) : -1
            })
            .toBe(vp.height)
    })
})

test.describe('Add profile with active filters', () => {
    test('a successful add clears filters so the new profile is visible', async ({ page, isMobile }) => {
        await mockProfilesApi(page)
        await page.goto('/people')
        await waitForList(page)

        await openFilters(page, isMobile)
        await page.getByRole('button', { name: /^X/ }).click()
        await expect(page.getByRole('article')).toHaveCount(1)

        await page.getByRole('button', { name: 'Add profile' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('Profile link').fill('https://linkedin.com/in/new-linkedin-person')
        await dialog.getByLabel('Name').fill('New Linkedin Person')
        await dialog.getByRole('button', { name: 'Add profile' }).click()

        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(page.getByRole('article')).toHaveCount(TOTAL + 1)
        await expect(page.getByRole('button', { name: /^X/ })).toHaveAttribute('aria-pressed', 'false')
    })
})

test.describe('Add profile server errors', () => {
    test('shows a generic server error and keeps the modal open', async ({ page }) => {
        await mockProfilesApi(page, { failPost: { status: 500, error: 'Failed to add profile' } })
        await page.goto('/people')
        await waitForList(page)

        await page.getByRole('button', { name: 'Add profile' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('Profile link').fill('https://linkedin.com/in/will-fail')
        await dialog.getByLabel('Name').fill('Will Fail')
        await dialog.getByRole('button', { name: 'Add profile' }).click()

        await expect(dialog.getByRole('alert')).toHaveText('Failed to add profile')
        await expect(dialog).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Will Fail' })).toHaveCount(0)
    })
})

test.describe('Theme', () => {
    test('page, cards and modal work in light mode', async ({ page }) => {
        await mockProfilesApi(page)
        await page.goto('/people')
        await waitForList(page)

        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)
        const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)

        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await expect(html).not.toHaveClass(/dark/)
        const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
        expect(lightBg).not.toBe(darkBg)

        await expect(page.getByRole('heading', { level: 1 })).toContainText('Follow the people')
        await expect(page.getByRole('heading', { name: 'Mariam Adel' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Follow Mariam Adel on LinkedIn' })).toBeVisible()

        await page.getByRole('button', { name: 'Add profile' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        const dialogBg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)
        const dialogText = await dialog.getByRole('heading', { name: 'Add a profile' }).evaluate((el) => getComputedStyle(el).color)
        expect(dialogBg).not.toBe(dialogText)
    })

    test('theme choice persists from /people to another page', async ({ page }) => {
        await mockProfilesApi(page)
        await mockApi(page)
        await page.goto('/people')
        await waitForList(page)

        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await expect(page.locator('html')).not.toHaveClass(/dark/)

        await page.goto('/')
        await expect(page.locator('html')).not.toHaveClass(/dark/)
    })
})

test.describe('Navigation', () => {
    test('the navbar People link reaches the page', async ({ page, isMobile }) => {
        await mockApi(page)
        await mockProfilesApi(page)
        await page.goto('/')

        if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click()
        await page.getByRole('link', { name: 'People', exact: true }).click()

        await expect(page).toHaveURL('/people')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Follow the people')
    })

    test.describe('tablet width', () => {
        test.use({ viewport: { width: 768, height: 900 } })

        test('all six nav links fit on one row without overflow', async ({ page, isMobile }) => {
            test.skip(isMobile, 'mobile projects use the hamburger menu')
            await mockApi(page)
            await page.goto('/')

            const labels = ['Home', 'Jobs', 'Freelance', 'Social', 'Learn', 'People']
            const ys: number[] = []
            for (const label of labels) {
                const box = await page.getByRole('link', { name: label, exact: true }).first().boundingBox()
                expect(box, `${label} link should be visible`).not.toBeNull()
                ys.push(Math.round(box!.y))
            }
            expect(new Set(ys).size).toBe(1)
            await expectNoHorizontalOverflow(page)
        })
    })
})
