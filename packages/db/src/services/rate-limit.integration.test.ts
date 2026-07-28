/**
 * Rate-limit service integration tests — run against a real Postgres when
 * TEST_DATABASE_URL is set; skipped otherwise.
 *
 * Covers: sliding-window enforcement, window expiry reset, independent key isolation.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from '../test/harness';
import { checkRateLimit } from './rate-limit';

describe.skipIf(!hasTestDb)('checkRateLimit (integration)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  it('allows calls up to the limit and blocks the one that exceeds it', async () => {
    const r1 = await checkRateLimit('ip:1.2.3.4', 60_000, 2);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = await checkRateLimit('ip:1.2.3.4', 60_000, 2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    // Third call exceeds the limit.
    const r3 = await checkRateLimit('ip:1.2.3.4', 60_000, 2);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfter).toBeGreaterThan(0);
  });

  it('resets the counter when the window expires', async () => {
    // 1 ms window — expires almost immediately.
    await checkRateLimit('ip:expire-test', 1, 1);
    // Wait for the window to expire.
    await new Promise((r) => setTimeout(r, 20));

    const after = await checkRateLimit('ip:expire-test', 60_000, 1);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it('tracks distinct keys independently', async () => {
    await checkRateLimit('ip:a', 60_000, 1);
    await checkRateLimit('ip:a', 60_000, 1); // key a is now blocked

    const b = await checkRateLimit('ip:b', 60_000, 1);
    expect(b.allowed).toBe(true); // key b is unaffected
  });
});
