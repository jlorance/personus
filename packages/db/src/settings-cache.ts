/**
 * Settings cache — in-process, per-key TTL cache over system_settings.
 *
 * Module-level `Map` cache, no init ceremony. Fails CLOSED: if the DB read
 * throws (outage, pre-migration), `getSetting` returns the caller's fallback so
 * the app stays operational. This is the read path the DB feature-flag provider
 * (@personus/flags) sits on top of.
 */

import { eq } from 'drizzle-orm';
import { db } from './index';
import { type SystemSetting, systemSettings } from './schema/system-settings';

const BOOTSTRAP_TTL_MS = 60_000;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheSet(key: string, value: unknown, now: number): void {
  cache.set(key, { value, expiresAt: now + BOOTSTRAP_TTL_MS });
}

/** Read a single setting by key. Returns `fallback` if absent or on DB error. */
export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value as T;

  try {
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    if (rows.length === 0) {
      cacheSet(key, fallback, now);
      return fallback as T;
    }
    cacheSet(key, rows[0].value, now);
    return rows[0].value as T;
  } catch {
    return fallback as T;
  }
}

/** Read all settings (optionally by category); warms the per-key cache. */
export async function getSettings(category?: string): Promise<SystemSetting[]> {
  const now = Date.now();
  const rows = category
    ? await db.select().from(systemSettings).where(eq(systemSettings.category, category))
    : await db.select().from(systemSettings);
  for (const row of rows) cacheSet(row.key, row.value, now);
  return rows;
}

/** Evict one key — call after a write so the next read is fresh. */
export function invalidateSetting(key: string): void {
  cache.delete(key);
}

/** Clear the whole cache — tests / on demand. */
export function invalidateSettingsCache(): void {
  cache.clear();
}
