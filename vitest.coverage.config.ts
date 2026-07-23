import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config — runs every package's unit tests in one process and
 * reports coverage across all package source. DB-glue services, Next app code,
 * and live-LLM agent paths need an integration/e2e harness (a provisioned
 * Postgres + API keys) and are covered separately; this number reflects the
 * pure/domain logic that unit tests can exercise deterministically.
 */
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'text'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts', // barrels
        'packages/typescript-config/**',
        'packages/db/src/schema/**',
        'packages/db/src/seed/**',
      ],
    },
  },
});
