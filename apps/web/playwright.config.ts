import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the web app. Tests exercise the credential-free paths (no DB,
 * no API keys) — rendering, navigation, theming, and graceful degradation — so
 * they run anywhere. Playwright starts the dev server itself.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NODE_ENV: 'development' },
  },
});
