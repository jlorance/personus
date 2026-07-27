/**
 * Atomicity seam — dispatch tests. No database required.
 *
 * `atomic()` picks a mechanism from whatever handle is live: `batch()` on the
 * production neon-http driver, `transaction()` on the node-postgres handle the
 * integration harness injects. `atomic.integration.test.ts` proves the
 * transaction branch really rolls back; only production exercises the batch
 * branch, so until now it was verified by type declaration alone.
 *
 * These tests inject fake handles to prove the dispatch itself — which branch
 * runs, what it is handed, and what it returns — without needing a Neon
 * database. They cover the decision; the integration file covers the behaviour.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { atomic } from './atomic';
import { setDbForTests } from './index';

afterEach(() => {
  setDbForTests(null);
});

describe('atomic() dispatch', () => {
  it('prefers batch() when the handle has one', async () => {
    const batch = vi.fn(async () => ['batched']);
    const transaction = vi.fn(async () => ['transacted']);
    setDbForTests({ batch, transaction });

    const out = await atomic(() => ['stmt']);

    expect(batch).toHaveBeenCalledTimes(1);
    expect(transaction).not.toHaveBeenCalled();
    expect(out).toEqual(['batched']);
  });

  it('hands batch() exactly the statements build produced, in order', async () => {
    const batch = vi.fn(async () => []);
    setDbForTests({ batch });

    await atomic(() => ['first', 'second', 'third']);

    expect(batch).toHaveBeenCalledWith(['first', 'second', 'third']);
  });

  it('builds statements from the live executor, not a captured one', async () => {
    // A drizzle builder executes against the session that created it, so
    // `build` must be handed the executor rather than closing over `db`.
    const handle = { batch: vi.fn(async () => []), marker: 'live' };
    setDbForTests(handle);

    let seen: unknown;
    await atomic((executor) => {
      seen = (executor as unknown as { marker: string }).marker;
      return ['stmt'];
    });

    expect(seen).toBe('live');
  });

  it('short-circuits an empty statement list without calling batch()', async () => {
    const batch = vi.fn(async () => []);
    setDbForTests({ batch });

    await expect(atomic(() => [])).resolves.toEqual([]);
    expect(batch).not.toHaveBeenCalled();
  });

  it('falls back to transaction() when the handle has no batch()', async () => {
    const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown[]>) => fn({ tx: true }));
    setDbForTests({ transaction });

    const out = await atomic(() => [Promise.resolve('a'), Promise.resolve('b')]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(out).toEqual(['a', 'b']);
  });

  it('propagates a batch() rejection rather than swallowing it', async () => {
    setDbForTests({
      batch: async () => {
        throw new Error('constraint violation');
      },
    });

    await expect(atomic(() => ['stmt'])).rejects.toThrow('constraint violation');
  });

  it('throws a diagnosable error when the handle offers neither mechanism', async () => {
    setDbForTests({ select: () => undefined });

    await expect(atomic(() => ['stmt'])).rejects.toThrow(/neither batch\(\) nor transaction\(\)/);
  });
});
