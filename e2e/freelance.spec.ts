import { test, expect } from '@playwright/test'
import { mockApi, mockProjects } from './fixtures'

test.describe('Freelance page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
        await page.goto('/freelance')
    })

    test('lists all mocked projects by default', async ({ page }) => {
        for (const project of mockProjects) {
            await expect(page.getByRole('link', { name: project.title })).toBeVisible()
        }
    })

    test('filters results by search query', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search projects, descriptions…')
        await searchInput.click()
        await searchInput.fill('landing page')
        await expect(page.getByRole('link', { name: 'Build a landing page' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Fix API rate limiting bug' })).not.toBeVisible()
    })

    test('shows budget and skill tags on each card', async ({ page }) => {
        const card = page.locator('article').first()
        await expect(card.getByText('$500')).toBeVisible()
        await expect(card.getByText('React')).toBeVisible()
        await expect(card.getByText('Tailwind')).toBeVisible()
    })

    test('shows an empty state when nothing matches', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search projects, descriptions…')
        await searchInput.click()
        await searchInput.fill('nothing will match this')
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()
    })

    test('each project card links out to the original listing', async ({ page }) => {
        const firstProject = mockProjects[0]
        await expect(page.getByRole('link', { name: firstProject.title })).toHaveAttribute('href', firstProject.url)
    })
})
