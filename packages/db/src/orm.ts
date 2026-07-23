/**
 * Single ORM entry point.
 *
 * All packages import query helpers and column types from HERE, never from
 * `drizzle-orm` directly. drizzle-orm ships an enormous peerDependencies list,
 * so package managers can materialize peer-specialized copies; if two workspace
 * packages resolve different copies, their `SQL`/`Column` types stop unifying.
 * Re-exporting from `@personus/db` (which owns the canonical drizzle-orm +
 * Neon driver resolution) guarantees every consumer shares one instance.
 */

export type { Column, SQL } from 'drizzle-orm';
export {
  and,
  asc,
  cosineDistance,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
