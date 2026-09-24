import { test, expect } from '@playwright/test'
import { mockApi, mockProjects } from './fixtures'
import { buildShareUrl } from '../src/lib/site'

test.describe('Freelance page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
        await page.goto('/freelance')
        // The "N projects" header only renders once the client bundle has
        // hydrated and the first fetch resolved. Typing into the search box
        // before that loses the input event on slow engines (WebKit in dev).
        await expect(page.getByText(`${mockProjects.length} projects`)).toBeVisible()
    })

    test('lists all mocked projects by default', async ({ page }) => {
        for (const project of mockProjects) {
            await expect(page.getByRole('link', { name: project.title })).toBeVisible()
        }
    })

    test('filters results by search query', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search projects, descriptions…')
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
        await searchInput.fill('nothing will match this')
        await expect(page.getByText('Nothing matches — yet.')).toBeVisible()
    })

    test('each project card links out to the original listing', async ({ page }) => {
        const firstProject = mockProjects[0]
        await expect(page.getByRole('link', { name: firstProject.title })).toHaveAttribute('href', firstProject.url)
    })

    test('share menu offers social targets and copies the project link', async ({ page }) => {
        // Clipboard permission grants are Chromium-only; Firefox/WebKit
        // throw "Unknown permission" and rely on user activation instead.
        if (page.context().browser()?.browserType().name() === 'chromium') {
            await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
        }
        const firstProject = mockProjects[0]
        await page
            .getByRole('button', { name: `Share project: ${firstProject.title}` })
            .first()
            .click()

        const menu = page.getByRole('menu')
        await expect(menu).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'Share via LinkedIn' })).toHaveAttribute(
            'href',
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(buildShareUrl('freelance', firstProject.id))}`
        )
        await expect(menu.getByRole('menuitem', { name: 'Share via WhatsApp' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'Share via Facebook' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'Share via X' })).toBeVisible()

        await menu.getByRole('menuitem', { name: 'Copy link' }).click()
        await expect(page.getByText('Copied!')).toBeVisible()
    })
})