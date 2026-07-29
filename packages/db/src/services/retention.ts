/**
 * Retention sweeps — PII scrubbing after declared retention windows (PER-31).
 *
 * Each sweep is intentionally narrow: it touches only the columns and rows
 * within the stated window so a misconfigured window never over-deletes. All
 * three operate on the retentionCron system actor (purge AuditLog / update
 * ContactRequest, QueryLog).
 *
 * Conservative production defaults (override via RETENTION_* env vars):
 *   contact_requests  message + triageNote   — 90 days after resolution
 *   query_logs        query_text             — 90 days from creation
 *   audit_log         rows                   — 365 days from creation
 *
 * These numbers are decisions the Issue recorded in scope. The mechanism here
 * is independent of the numbers — swap constants without touching logic.
 */

import { db } from '../index';
import { and, isNull, lt, or, sql } from '../orm';
import { auditLog, contactRequests, queryLogs } from '../schema';
import { ForbiddenError, type ServicePrincipal } from './index';

// ---------------------------------------------------------------------------
// Default retention windows (milliseconds)
// ---------------------------------------------------------------------------

/** 90 days in ms — contact request sensitive-text retention window. */
export const CONTACT_REQUEST_RETENTION_MS =
  Number(process.env.RETENTION_CONTACT_REQUEST_DAYS ?? 90) * 24 * 60 * 60 * 1000;

/** 90 days in ms — query log text retention window. */
export const QUERY_LOG_RETENTION_MS =
  Number(process.env.RETENTION_QUERY_LOG_DAYS ?? 90) * 24 * 60 * 60 * 1000;

/** 365 days in ms — audit log row retention window. */
export const AUDIT_LOG_RETENTION_MS =
  Number(process.env.RETENTION_AUDIT_LOG_DAYS ?? 365) * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sweep functions
// ---------------------------------------------------------------------------

/**
 * Null `message` and `triageNote` on closed contact requests older than
 * `olderThanMs`. "Closed" = status is not `pending` (responded, declined,
 * expired). Only rows where at least one field is still populated are touched
 * to avoid empty UPDATEs. Returns the count of rows cleared.
 *
 * Requires `update ContactRequest` in the principal's ability.
 */
export async function sweepContactRequestPii(
  principal: ServicePrincipal,
  olderThanMs = CONTACT_REQUEST_RETENTION_MS,
): Promise<number> {
  if (!principal.ability.can('update', 'ContactRequest')) throw new ForbiddenError();

  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .update(contactRequests)
    .set({ message: null, triageNote: null })
    .where(
      and(
        // Only rows that have PII left to clear.
        or(
          sql`${contactRequests.message} IS NOT NULL`,
          sql`${contactRequests.triageNote} IS NOT NULL`,
        ),
        // Only closed requests — pending ones may still need human review.
        sql`${contactRequests.status} <> 'pending'`,
        lt(contactRequests.createdAt, cutoff),
        isNull(contactRequests.deletedAt),
      ),
    )
    .returning({ id: contactRequests.id });
  return rows.length;
}

/**
 * Null `query_text` on query log rows older than `olderThanMs`. Analytics
 * columns (matchCount, resultedInContact, etc.) are preserved. Returns the
 * count of rows cleared.
 *
 * Requires `update QueryLog` in the principal's ability.
 */
export async function sweepQueryLogText(
  principal: ServicePrincipal,
  olderThanMs = QUERY_LOG_RETENTION_MS,
): Promise<number> {
  if (!principal.ability.can('update', 'QueryLog')) throw new ForbiddenError();

  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .update(queryLogs)
    .set({ queryText: null })
    .where(
      and(
        // Only rows that still hold the text — avoid empty UPDATEs.
        sql`${queryLogs.queryText} IS NOT NULL`,
        lt(queryLogs.createdAt, cutoff),
      ),
    )
    .returning({ id: queryLogs.id });
  return rows.length;
}

/**
 * Hard-delete audit_log rows older than `olderThanMs`. The audit log is
 * append-only and never soft-deleted; hard deletion is the only mechanism.
 * Returns the count of rows deleted.
 *
 * Requires `purge AuditLog` in the principal's ability.
 */
export async function sweepAuditLog(
  principal: ServicePrincipal,
  olderThanMs = AUDIT_LOG_RETENTION_MS,
): Promise<number> {
  if (!principal.ability.can('purge', 'AuditLog')) throw new ForbiddenError();

  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .delete(auditLog)
    .where(lt(auditLog.createdAt, cutoff))
    .returning({ id: auditLog.id });
  return rows.length;
}
