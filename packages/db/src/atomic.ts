import { db } from './index';

/**
 * Run dependent writes so that either all of them land or none do.
 *
 * Why this exists: the two drivers in play reach atomicity by different means,
 * and neither mechanism is available in both environments.
 *
 *   - Production uses `drizzle-orm/neon-http`. Each statement is a separate
 *     HTTP request and there is no `db.transaction()`. Its `db.batch([...])`
 *     sends the set in one round trip, wrapped server-side in a transaction.
 *   - Integration tests inject a `drizzle-orm/node-postgres` handle via
 *     `setDbForTests`. That driver has real `db.transaction()` and **no
 *     `.batch()` at all** — calling batch there throws.
 *
 * Writing `db.batch(...)` directly in a service therefore works in production
 * and breaks every test that covers it. This seam picks whichever mechanism the
 * live handle actually has, so one service implementation is atomic in both.
 *
 * Statements are built from the executor passed to `build` rather than closed
 * over `db`, because a drizzle query builder executes against the session that
 * created it — builders made from `db` would bypass an enclosing transaction.
 *
 * Results are returned positionally, matching the statements `build` produced.
 *
 * @example
 *   const results = await atomic((tx) => [
 *     tx.insert(communityMembers).values(row),
 *     tx.update(communities).set({ memberCount: sql`${communities.memberCount} + 1` }),
 *   ]);
 */
type Executor = typeof db;

export async function atomic<T = unknown>(
  build: (executor: Executor) => readonly unknown[],
): Promise<T[]> {
  const handle = db as unknown as {
    batch?: (statements: readonly unknown[]) => Promise<unknown[]>;
    transaction?: (fn: (tx: Executor) => Promise<T[]>) => Promise<T[]>;
  };

  if (typeof handle.batch === 'function') {
    const statements = build(db);
    if (statements.length === 0) return [];
    return (await handle.batch(statements)) as T[];
  }

  if (typeof handle.transaction === 'function') {
    return await handle.transaction(async (tx) => {
      // Sequential, not Promise.all: these writes are dependent by definition,
      // and a single connection cannot interleave them anyway.
      const results: T[] = [];
      for (const statement of build(tx)) {
        results.push((await statement) as T);
      }
      return results;
    });
  }

  throw new Error('atomic(): the active database handle exposes neither batch() nor transaction()');
}
