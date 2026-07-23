/**
 * Base-field factory helpers (inherited from the prior data model).
 *
 * Personus uses four canonical table shapes, each produced by a dedicated
 * factory. Pick the factory that matches the table's role — never hand-roll
 * audit columns, and never mix-and-match.
 *
 * | Factory              | Used by                            | Has                                                     |
 * |----------------------|------------------------------------|---------------------------------------------------------|
 * | `baseFields(prefix)` | Externally-referenced entities     | bigserial id + public_id + audit + soft-delete          |
 * | `referenceFields()`  | Reference / lookup tables          | bigserial id + audit + soft-delete (no public_id)       |
 * | `junctionFields()`   | Pure many-to-many junctions        | bigserial id + audit (no public_id, no soft-delete)     |
 * | `auditLogFields()`   | Append-only event streams          | uuid id + created_by + created_at                       |
 *
 * `created_by` / `updated_by` are `varchar(100)` principal strings (NOT FKs),
 * using a colon-namespace convention: `clerk:<id>`, `system`, `system:<origin>`,
 * `agent:<name>`, `webhook:<source>`, `migration:<name>`. Build them with
 * `formatPrincipal`.
 */

import { bigserial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { customAlphabet } from 'nanoid';

// URL-safe alphabet, 17 chars from 64 symbols → ~102 bits of entropy.
const NANOID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
const NANOID_LENGTH = 17;
const generateNanoid = customAlphabet(NANOID_ALPHABET, NANOID_LENGTH);

/** Generate a prefixed public ID, e.g. `publicId('per')` → `per_V1StGXR8_Z5jdHi6B`. */
export function publicId(prefix: string): string {
  return `${prefix}_${generateNanoid()}`;
}

function auditCols() {
  return {
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedBy: varchar('updated_by', { length: 100 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  } as const;
}

/** Base fields for normal entities — externally referenced via `public_id`. */
export function baseFields(prefix: string) {
  return {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    publicId: varchar('public_id', { length: 21 })
      .notNull()
      .unique()
      .$defaultFn(() => publicId(prefix)),
    ...auditCols(),
  } as const;
}

/** Base fields for reference/lookup tables — natural-keyed, no `public_id`. */
export function referenceFields() {
  return {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    ...auditCols(),
  } as const;
}

/** Base fields for pure M2M junction tables — no `public_id`, no `deleted_at`. */
export function junctionFields() {
  return {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedBy: varchar('updated_by', { length: 100 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  } as const;
}

/** Base fields for append-only event streams — uuid id, created_* only. */
export function auditLogFields() {
  return {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  } as const;
}

/** Construct principal strings for `created_by` / `updated_by`. */
export const formatPrincipal = {
  clerk: (userId: string) => `clerk:${userId}` as const,
  system: (origin?: string) => (origin ? (`system:${origin}` as const) : ('system' as const)),
  agent: (name: string) => `agent:${name}` as const,
  webhook: (source: string) => `webhook:${source}` as const,
  migration: (name: string) => `migration:${name}` as const,
};
