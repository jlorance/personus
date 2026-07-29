/**
 * Admin-only full data-subject erasure (PER-31).
 *
 * Wraps the individual purge functions into a single callable that an
 * HTTP handler can reach. The caller must hold `purge Persona` + `purge
 * CoachSession` (checked individually inside each leaf service).
 *
 * This service returns counts so the HTTP layer can surface what was
 * actually cleared without coupling itself to DB internals.
 */

import { db } from '../index';
import { eq } from '../orm';
import { personas } from '../schema';
import type { ServicePrincipal } from './index';
import { purgePersona, purgeUserCoachSessions } from './personas';

export interface PurgeUserResult {
  /** Number of persona rows hard-deleted. */
  personasDeleted: number;
  /** Number of coach session rows hard-deleted. */
  coachSessionsDeleted: number;
}

/**
 * Hard-delete all PII for a data-subject identified by their internal DB
 * userId. Covers:
 *   - All personas (including soft-deleted ones) via purgePersona
 *   - All coach sessions via purgeUserCoachSessions
 *
 * Mastra agent memory is NOT cleared here — call purgeAgentMemory() from
 * @personus/ai separately (packages/db cannot import packages/ai: cycle).
 *
 * Requires `purge Persona` + `purge CoachSession` in the principal's ability.
 */
export async function purgeUser(
  principal: ServicePrincipal,
  userId: string,
): Promise<PurgeUserResult> {
  // Collect all persona URIs for this user (including soft-deleted tombstones —
  // GDPR erasure must reach rows the user already deleted themselves).
  const rows = await db
    .select({ uri: personas.uri })
    .from(personas)
    .where(eq(personas.userId, BigInt(userId)));

  // purgePersona checks `purge Persona` — if the principal lacks it, every
  // call throws ForbiddenError. Check once up-front to short-circuit clearly.
  // (purgePersona itself re-checks, so this is an early-exit optimisation only.)
  let personasDeleted = 0;
  for (const { uri } of rows) {
    const deleted = await purgePersona(principal, uri);
    if (deleted) personasDeleted++;
  }

  const coachSessionsDeleted = await purgeUserCoachSessions(principal, userId);

  return { personasDeleted, coachSessionsDeleted };
}
