import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'

test.describe('Landing page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
        await page.goto('/')
    })

    test('shows the hero heading and stats sourced from the API', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Stop tab-hopping/ })).toBeVisible()
        await expect(page.getByText('Live listings')).toBeVisible()
    })

    test('navigates to the jobs page', async ({ page }) => {
        await page.locator('a').filter({ hasText: 'Full-time & contract' }).click()
        await expect(page).toHaveURL('/jobs')
        await expect(page.getByRole('heading', { name: /Every open role/ })).toBeVisible()
    })

    test('navigates to the freelance page', async ({ page }) => {
        await page.locator('a').filter({ hasText: 'Freelance & fractional' }).click()
        await expect(page).toHaveURL('/freelance')
    })

    test('top nav links to both listing pages', async ({ page, isMobile }) => {
        test.skip(isMobile, 'desktop top nav is collapsed into hamburger on mobile')
        await page.getByRole('navigation').getByRole('link', { name: 'Jobs' }).click()
        await expect(page).toHaveURL('/jobs')
    })
})
