/**
 * DB-backed sliding-window rate limiter.
 *
 * Uses the `rate_limit_buckets` table (already in the schema) to track per-key
 * counters. A single `INSERT … ON CONFLICT DO UPDATE … RETURNING` atomically
 * increments or resets the counter depending on whether the current window has
 * expired, with no transaction needed (safe for the Neon HTTP driver).
 *
 * Public-endpoint callers pass a key derived from the client IP so each address
 * gets its own independent window.
 */

import { db } from '../index';
import { sql } from '../orm';
import { rateLimitBuckets } from '../schema';

export interface RateLimitResult {
  /** Whether this request is within the allowed limit. */
  allowed: boolean;
  /** Remaining requests in the current window after this call. */
  remaining: number;
  /**
   * Seconds until the window resets. Only present when `allowed` is false so
   * callers can forward it as a `Retry-After` response header.
   */
  retryAfter?: number;
}

/**
 * Check (and record) one request against a rate-limit bucket.
 *
 * @param key       Unique bucket identifier (e.g. `"discover:1.2.3.4"`).
 * @param windowMs  Sliding-window duration in milliseconds.
 * @param max       Maximum allowed requests per window.
 */
export async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  // Compute the expiry for a freshly opened window. The CASE inside the SQL
  // uses this value only when the existing bucket has already expired so it
  // does not shift the window on every call — the expiry is locked at the
  // moment the first request in a window arrives.
  const expiresAt = new Date(Date.now() + windowMs);

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        // If the stored window has expired, start fresh (count=1, new expiry).
        // Otherwise, increment within the existing window.
        count: sql`CASE WHEN ${rateLimitBuckets.expiresAt} <= NOW() THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimitBuckets.expiresAt} <= NOW() THEN ${expiresAt}::timestamptz ELSE ${rateLimitBuckets.expiresAt} END`,
      },
    })
    .returning();

  const count = row.count;
  const allowed = count <= max;
  const retryAfterMs = row.expiresAt.getTime() - Date.now();

  return {
    allowed,
    remaining: Math.max(0, max - count),
    ...(allowed ? {} : { retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) }),
  };
}
