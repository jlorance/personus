import { describe, expect, it, vi } from 'vitest';

// Mock the DB settings read so the DbProvider resolves without a database.
vi.mock('@personus/db/settings', () => ({
  getSetting: vi.fn(async (key: string, fallback: unknown) =>
    key === 'features.coach_enabled' ? true : fallback,
  ),
}));

import { DbProvider } from './providers/db-provider';

describe('DbProvider (OpenFeature)', () => {
  it('resolves a seeded boolean flag via the features.* namespace', async () => {
    const p = new DbProvider();
    const res = await p.resolveBooleanEvaluation('coach_enabled', false, {});
    expect(res.value).toBe(true);
    expect(res.reason).toBe('TARGETING_MATCH');
  });

  it('falls back to the default when the key is absent', async () => {
    const p = new DbProvider();
    const res = await p.resolveBooleanEvaluation('does_not_exist', false, {});
    expect(res.value).toBe(false);
    expect(res.reason).toBe('DEFAULT');
  });
});
