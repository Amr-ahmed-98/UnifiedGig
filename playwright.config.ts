import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1,
    reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
    timeout: 45_000,
    expect: {
        timeout: 10_000,
    },

    use: {
        baseURL,
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        // The app's hero backgrounds run infinite blur/transform animations that
        // globals.css already turns off under prefers-reduced-motion. Software-rendered
        // browsers (WebKit on Windows, headless CI) drop to a few fps with them on, which
        // starves Playwright's stable/visible checks and causes click timeouts.
        reducedMotion: 'reduce',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    ],


    webServer: {
        // E2E_PROD=1 runs the production build (run `npm run build` first). Much lighter
        // than `next dev`, which compiles routes on demand and hydrates slowly.
        command: process.env.E2E_PROD ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
        },
    },
})
