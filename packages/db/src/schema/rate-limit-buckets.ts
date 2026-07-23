import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Rate-Limit Buckets — operational table backing the DB-backed rate-limit store.
// Natural-keyed, no public_id, no audit columns, no soft-delete.
export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('idx_rate_limit_buckets_expires').on(table.expiresAt)],
);

export type RateLimitBucketRow = typeof rateLimitBuckets.$inferSelect;
export type NewRateLimitBucketRow = typeof rateLimitBuckets.$inferInsert;
