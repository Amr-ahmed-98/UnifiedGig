import { test, expect } from '@playwright/test'
import { mockApi, mockSocialApi, mockSocialPosts } from './fixtures'

test.describe('Social jobs page', () => {
    test.beforeEach(async ({ page }) => {
        await mockSocialApi(page)
        await page.goto('/social-jobs')
    })

    test('lists all mocked social posts by default', async ({ page }) => {
        await expect(page.getByText(`${mockSocialPosts.length} posts`)).toBeVisible()
        for (const post of mockSocialPosts) {
            // heading locator — getByText(str) is a case-insensitive substring
            // match and would also hit descriptions that echo the title
            await expect(page.getByRole('heading', { name: post.title })).toBeVisible()
        }
    })

    test('hero explains the 48h auto-expiry contract', async ({ page }) => {
        await expect(page.locator('main').getByText('LinkedIn post feed')).toBeVisible()
        await expect(page.getByText(/auto-expires in 48h/i)).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Social jobs, straight from LinkedIn.' })
        ).toBeVisible()
    })

    test('warns when a post is expiring within 6h', async ({ page }) => {
        // mockSocialPosts[2] expires in 5h — under the 6h urgency threshold
        await expect(page.getByText('1 expiring within 6h')).toBeVisible()
        await expect(page.getByText('5h left')).toBeVisible()
    })

    test('filters results by search query', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search titles, posters…')
        await searchInput.fill('Fractional')
        // Search input is debounced 300ms before it refetches.
        await expect(page.getByRole('heading', { name: 'Fractional CTO needed' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Senior Frontend Engineer' })).not.toBeVisible()
        await expect(page.getByRole('heading', { name: 'Remote AI Engineer' })).not.toBeVisible()
    })

    test('filters results by tag', async ({ page, isMobile }) => {
        if (isMobile) {
            await page.getByRole('button', { name: 'Filters' }).click()
        }
        await page.getByRole('button', { name: 'AI/ML' }).click()
        await expect(page.getByRole('heading', { name: 'Remote AI Engineer' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Senior Frontend Engineer' })).not.toBeVisible()
    })

    test('filters results by remote-only work mode', async ({ page, isMobile }) => {
        if (isMobile) {
            await page.getByRole('button', { name: 'Filters' }).click()
        }
        await page.getByRole('button', { name: 'Remote only' }).click()
        await expect(page.getByRole('heading', { name: 'Remote AI Engineer' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Senior Frontend Engineer' })).not.toBeVisible()
        await expect(page.getByRole('heading', { name: 'Fractional CTO needed' })).not.toBeVisible()
    })

    test('shows an empty state and can reset filters', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search titles, posters…')
        await searchInput.fill('no such post exists')
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()

        await page.getByRole('button', { name: 'Reset filters' }).click({ force: true })
        await expect(page.getByText(`${mockSocialPosts.length} posts`)).toBeVisible()
    })

    test('each card links out to the original LinkedIn post', async ({ page }) => {
        const first = mockSocialPosts[0]
        const link = page.getByRole('link', { name: 'View on LinkedIn' }).first()
        await expect(link).toHaveAttribute('href', first.url)
        await expect(link).toHaveAttribute('target', '_blank')
    })

    test('cards show a live time-left countdown', async ({ page }) => {
        // social-1 expires in 30h → "1d left"; social-3 (5h) shows the urgent "5h left"
        await expect(page.getByText('1d left').first()).toBeVisible()
    })

    test('load more appends the remaining posts', async ({ page }) => {
        const many = Array.from({ length: 30 }, (_, i) => ({
            ...mockSocialPosts[0],
            id: `social-${i}`,
            title: `Role number ${i}`,
        }))
        await mockSocialApi(page, { posts: many })
        await page.goto('/social-jobs')

        await expect(page.getByRole('heading', { name: 'Role number 0' })).toBeVisible()
        await expect(page.getByText('30 posts')).toBeVisible()

        await page.getByRole('button', { name: 'Load more posts' }).click()
        await expect(page.getByRole('heading', { name: 'Role number 29' })).toBeVisible()
    })

    test('discarding a post removes it from the feed and issues a DELETE', async ({ page }) => {
        const deleteRequest = page.waitForRequest(
            (req) => req.method() === 'DELETE' && req.url().includes('/api/social-jobs/social-1')
        )
        await page
            .locator('article', { hasText: 'Senior Frontend Engineer' })
            .getByRole('button', { name: 'Discard post' })
            .click()
        await deleteRequest

        await expect(
            page.getByRole('heading', { name: 'Senior Frontend Engineer' })
        ).not.toBeVisible()
        await expect(page.getByText('2 active posts')).toBeVisible()
    })

    test('embedding a LinkedIn post end-to-end adds it to the feed', async ({ page }) => {
        await expect(page.getByText('3 active posts')).toBeVisible()

        await page.getByRole('button', { name: 'Embed LinkedIn Post' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()

        await page
            .getByLabel('LinkedIn post URL')
            .fill('https://www.linkedin.com/posts/jane-doe_activity-9')

        // Auto-preview is debounced 600ms — wait for the form to fill itself
        await expect(page.getByLabel('Title')).toHaveValue('Newly Embedded Role', {
            timeout: 10_000,
        })

        await page.getByRole('button', { name: 'Embed & Post Now' }).click()

        await expect(page.getByRole('heading', { name: 'Newly Embedded Role' })).toBeVisible()
        await expect(page.getByText('4 active posts')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Embed LinkedIn Post' })).toBeVisible()
    })
})

test.describe('Social jobs navigation', () => {
    test('the navbar Social link reaches the social jobs page', async ({ page, isMobile }) => {
        await mockApi(page)
        await mockSocialApi(page)
        await page.goto('/')

        // Below the md breakpoint the inline nav links are display:none and the
        // mobile copies only mount once the hamburger is open, so there is no
        // visible "Social" link to click until the menu is toggled.
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click()
        }
        await page.getByRole('link', { name: 'Social', exact: true }).click()

        await expect(page).toHaveURL('/social-jobs')
        await expect(
            page.getByRole('heading', { name: 'Social jobs, straight from LinkedIn.' })
        ).toBeVisible()
    })
})
