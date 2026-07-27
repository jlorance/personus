/**
 * Integration test harness — runs the service layer against a REAL Postgres
 * (with pgvector), not a mock. Enabled only when `TEST_DATABASE_URL` is set, so
 * the default `bun run test` still passes with no database; CI provides a
 * pgvector Postgres and the suite runs for real.
 *
 * It applies the committed Drizzle migration(s) to a throwaway database, then
 * injects a node-postgres drizzle handle via `setDbForTests` so every service
 * (which imports the `db` singleton) transparently runs against it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { setDbForTests } from '../index';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/**
 * A silent skip is indistinguishable from a pass. Without TEST_DATABASE_URL the
 * whole service layer goes untested while `bun run test` still exits 0 — and
 * Turbo's summary line reports only "N successful", so the skip disappears
 * entirely at the top level.
 *
 * Set REQUIRE_TEST_DB=1 anywhere the database is expected (CI, build machines)
 * and a missing database fails the run instead of quietly reducing its scope.
 */
if (!hasTestDb) {
  const detail =
    'TEST_DATABASE_URL is not set — the service-layer integration suite will NOT run. ' +
    'Start one with `bun run test:db` and re-run with that URL exported.';
  if (process.env.REQUIRE_TEST_DB) {
    throw new Error(`REQUIRE_TEST_DB is set but ${detail}`);
  }
  // Direct to stderr rather than @personus/logger: this is test infrastructure,
  // it must surface before any app wiring exists, and the runner shows stderr.
  process.stderr.write(`\n⚠️  REDUCED COVERAGE: ${detail}\n\n`);
}

let pool: Pool | null = null;
let vectorAvailable = false;

/** Whether pgvector loaded for this run (false on the plain-Postgres fallback). */
export function isVectorAvailable(): boolean {
  return vectorAvailable;
}

/** All base tables, for TRUNCATE between tests (order-independent via CASCADE). */
const TABLES = [
  'users',
  'user_traits',
  'personas',
  'shadow_personas',
  'endorsements',
  'communities',
  'community_members',
  'community_types',
  'contact_requests',
  'trait_metadata',
  'trait_taxonomies',
  'guild_skill_categories',
  'guild_membership_tiers',
  'guild_offerings',
  'guild_offering_members',
  'guild_requests',
  'guild_request_routes',
  'activity_events',
  'audit_log',
  'platform_channel_bindings',
  'query_logs',
  'rate_limit_buckets',
  'system_settings',
];

function migrationsDir(): string {
  return join(__dirname, '..', '..', 'drizzle');
}

function migrationSql(): string {
  const dir = migrationsDir();
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return folders.map((f) => readFileSync(join(dir, f, 'migration.sql'), 'utf8')).join('\n');
}

/** Create the schema + inject the handle. Call in beforeAll. */
export async function setupTestDb(): Promise<ReturnType<typeof drizzle>> {
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const client = await pool.connect();
  try {
    // Start from a clean slate so setup is idempotent across runs / suites.
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');

    // Prefer the real pgvector DDL (CI uses a pgvector image). If the extension
    // isn't installed (local plain Postgres), fall back to a vector-free variant:
    // embedding columns become `text` and ivfflat indexes are skipped. The
    // service-layer tests never touch embeddings, so this is faithful for them.
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      vectorAvailable = true;
    } catch {
      vectorAvailable = false;
    }

    const statements = migrationSql()
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const raw of statements) {
      if (!vectorAvailable) {
        if (/using\s+ivfflat/i.test(raw)) continue; // skip vector indexes
        await client.query(raw.replace(/vector\(\d+\)/gi, 'text'));
      } else {
        await client.query(raw);
      }
    }
  } finally {
    client.release();
  }
  const db = drizzle({ client: pool });
  setDbForTests(db);
  return db;
}

/** Empty every table. Call in beforeEach for isolation. */
export async function resetTables(): Promise<void> {
  if (!pool) return;
  await pool.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

/** Close the pool + clear the injected handle. Call in afterAll. */
export async function teardownTestDb(): Promise<void> {
  setDbForTests(null);
  await pool?.end();
  pool = null;
}
