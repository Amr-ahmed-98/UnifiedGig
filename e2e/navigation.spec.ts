import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'

test.describe('NavBar', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
    })

    test('toggles between light and dark theme', async ({ page }) => {
        await page.goto('/')
        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)

        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await expect(html).not.toHaveClass(/dark/)
    })

    test('mobile viewport shows a working hamburger menu', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'desktop nav renders links inline, no hamburger to test')

        await page.goto('/')
        const toggle = page.getByRole('button', { name: 'Toggle navigation' })
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')

        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')

        await page.getByRole('link', { name: 'Jobs' }).last().click()
        await expect(page).toHaveURL('/jobs')
    })
})
