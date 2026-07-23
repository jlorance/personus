/**
 * Audit log — append-only record of security-relevant events.
 * Distinct from `activity_events` (user-facing timeline). Rows are NEVER
 * updated and NEVER soft-deleted; retention is a separate concern.
 */

import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditLogFields } from './_factory';

export const auditLog = pgTable(
  'audit_log',
  {
    ...auditLogFields(),
    kind: varchar('kind', { length: 100 }).notNull(),
    reasonCode: varchar('reason_code', { length: 100 }).notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index('idx_audit_log_kind').on(table.kind, table.createdAt.desc()),
    index('idx_audit_log_created_by').on(table.createdBy, table.createdAt.desc()),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
