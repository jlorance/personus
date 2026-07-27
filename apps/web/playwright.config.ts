import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the web app. Tests exercise the credential-free paths (no DB,
 * no API keys) — rendering, navigation, theming, and graceful degradation — so
 * they run anywhere. Playwright starts the dev server itself.
 *
 * The dev server is deliberate, not a shortcut: `packages/env` fail-fasts in
 * production and only degrades to a warning outside it, so `next start` cannot
 * boot without real credentials. Credential-free e2e therefore has to run
 * against `next dev`.
 *
 * That has one consequence worth compensating for. `next dev` compiles routes
 * ON DEMAND, so the first navigation to an uncompiled route can take many
 * seconds. Playwright's default 5s assertion timeout is shorter than that,
 * which made the `e2e` job fail on every cold CI runner while passing locally
 * against a warm `.next` cache — a standing red gate whose failure looked like
 * a product bug and was not.
 *
 * The timeouts below are sized for first-compile latency, not for slow product
 * code. A genuinely broken navigation still fails; it just takes longer to say
 * so, which is the right trade for a gate that must be trustworthy.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 90_000,
  expect: {
    // Covers a cold turbopack compile of the route under assertion.
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NODE_ENV: 'development' },
  },
});
