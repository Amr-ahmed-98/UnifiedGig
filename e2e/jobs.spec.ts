import { test, expect } from '@playwright/test'
import { mockApi, mockJobs } from './fixtures'

test.describe('Jobs page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
        await page.goto('/jobs')
    })

    test('lists all mocked jobs by default', async ({ page }) => {
        await expect(page.getByText(`${mockJobs.length} roles`)).toBeVisible()
        for (const job of mockJobs) {
            await expect(page.getByRole('link', { name: job.title })).toBeVisible()
        }
    })

    test('filters results by search query', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search titles, companies…')
        await searchInput.click()
        await searchInput.fill('Frontend')
        // Search input is debounced 300ms before it refetches.
        await expect(page.getByRole('link', { name: 'Frontend Engineer' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Senior Backend Developer' })).not.toBeVisible()
    })

    test('filters results by work mode', async ({ page, isMobile }) => {
        if (isMobile) {
            await page.getByRole('button', { name: 'Filters' }).click()
        }
        await page.getByRole('button', { name: 'Remote' }).click()
        await expect(page.getByRole('link', { name: 'Senior Backend Developer' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'On-site DevOps Engineer' })).not.toBeVisible()
    })

    test('filters results by source site', async ({ page, isMobile }) => {
        if (isMobile) {
            await page.getByRole('button', { name: 'Filters' }).click()
        }
        await page.getByRole('button', { name: 'Indeed' }).click()
        await expect(page.getByRole('link', { name: 'On-site DevOps Engineer' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Senior Backend Developer' })).not.toBeVisible()
    })

    test('shows an empty state and can reset filters', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search titles, companies…')
        await searchInput.click()
        await searchInput.fill('no such role exists')
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()

        await page.getByRole('button', { name: 'Reset filters' }).click({ force: true })
        await expect(page.getByText(`${mockJobs.length} roles`)).toBeVisible()
    })

    test('each job card links out to the original posting', async ({ page }) => {
        const firstJob = mockJobs[0]
        await expect(page.getByRole('link', { name: firstJob.title })).toHaveAttribute('href', firstJob.url)
    })
})
