import { drizzle } from 'drizzle-orm/neon-http';

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return drizzle(process.env.DATABASE_URL);
}

// Lazy proxy — avoids build-time crashes when DATABASE_URL is absent (e.g.
// during `next build` of pages that never touch the DB, or the health route).
let _db: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export * as schema from './schema';
