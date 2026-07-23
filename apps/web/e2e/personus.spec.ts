import { expect, test } from '@playwright/test';

test.describe('landing', () => {
  test('shows the thesis and the register preview', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Your value is what you can');
    await expect(page.getByText('A glimpse of the register')).toBeVisible();
    // ledger rows render (sample entries)
    await expect(page.getByText('Maria Osei')).toBeVisible();
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const before = await html.getAttribute('class');
    await page.getByRole('button', { name: /switch to (light|dark) mode/i }).click();
    await expect(async () => {
      expect(await html.getAttribute('class')).not.toBe(before);
    }).toPass();
  });
});

test.describe('navigation', () => {
  test('nav links reach the core surfaces', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore' }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole('heading', { name: /who can do what you need/i })).toBeVisible();

    await page.getByRole('link', { name: 'Coach' }).click();
    await expect(page).toHaveURL(/\/coach$/);
    // agent switcher tabs are present
    await expect(page.getByRole('tab', { name: 'Persona Coach' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Discovery' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Recommender' })).toBeVisible();
  });

  test('gated surfaces show a sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByText(/sign in to manage your personas/i)).toBeVisible();
  });
});

test.describe('explore (credential-free)', () => {
  test('a search degrades gracefully when discovery is offline', async ({ page }) => {
    await page.goto('/explore');
    await page.getByPlaceholder(/a plumber who mentors/i).fill('welder');
    await page.getByRole('button', { name: /^search$/i }).click();
    // no DB configured → the action returns the offline empty state
    await expect(page.getByText(/offline|no one in the register/i)).toBeVisible();
  });
});

test.describe('api', () => {
  test('health is public and reports config', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('personus-web');
  });

  test('MCP initialize responds over JSON-RPC', async ({ request }) => {
    const res = await request.post('/api/mcp', {
      data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe('personus');
  });
});
