import { env } from '@personus/env';
import { drizzle } from 'drizzle-orm/neon-http';

function createDb() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return drizzle(env.DATABASE_URL);
}

// Lazy proxy — avoids build-time crashes when DATABASE_URL is absent (e.g.
// during `next build` of pages that never touch the DB, or the health route).
// `_db` can also be injected by the test harness via `setDbForTests` so service
// code (which imports this singleton) can run against an in-memory Postgres.
let _db: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Inject a drizzle handle for integration tests. Pass null to reset. */
export function setDbForTests(handle: unknown | null): void {
  _db = handle as ReturnType<typeof createDb> | null;
}

export * as schema from './schema';
