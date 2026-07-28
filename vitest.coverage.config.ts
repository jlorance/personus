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
    include: ['packages/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    // More than one integration file now shares a single database, and the
    // harness resets it with `DROP SCHEMA public CASCADE` in beforeAll. Run
    // files one at a time: in parallel they race, and the loser dies with
    // `schema "public" already exists` or — worse — passes against a schema
    // another file is mid-drop.
    //
    // This config does NOT inherit packages/db/vitest.config.ts, so the same
    // setting is required in both. CI's `verify` job runs this one.
    fileParallelism: false,
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
