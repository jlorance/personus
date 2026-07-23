/**
 * Service layer (founding slice).
 *
 * Holds the typed errors shared across the DB/auth boundary and the minimal
 * persona mutations the Persona Coach agent needs. Services take a structural
 * `ServicePrincipal` (userId + CASL ability) rather than importing the full
 * `Principal` from @personus/auth — that keeps the dependency one-directional
 * (auth → db) and avoids a cycle. @personus/auth re-exports these errors.
 */

import { db } from '../index';
import { and, type Column, eq, isNull } from '../orm';
import { personas, userTraits } from '../schema';

// ─── Typed errors ─────────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ─── Structural principal ─────────────────────────────────────────────────────
// Just enough of @personus/auth's Principal for the service layer to gate on,
// without importing it (avoids the auth→db→auth cycle).

export interface ServicePrincipal {
  userId: string | null;
  ability: { can(action: string, subject: string): boolean };
}

/** Filter tombstones on a soft-deletable table with a `deletedAt` column. */
export function notDeleted(table: { deletedAt: Column }) {
  return isNull(table.deletedAt);
}

function principalTag(principal: ServicePrincipal): string {
  return principal.userId ? `user:${principal.userId}` : 'system';
}

// ─── Persona mutations (Coach-facing) ─────────────────────────────────────────

/**
 * Patch base-layer persona fields (headline, location, displayName, …).
 * Enforces CASL `update Persona` + ownership (principal.userId === persona.userId).
 * Returns null if the persona doesn't exist.
 */
export async function updatePersona(
  principal: ServicePrincipal,
  uri: string,
  patch: Partial<typeof personas.$inferInsert>,
): Promise<typeof personas.$inferSelect | null> {
  if (!principal.ability.can('update', 'Persona')) throw new ForbiddenError();

  const [existing] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, uri), notDeleted(personas)))
    .limit(1);
  if (!existing) return null;
  if (String(existing.userId) !== principal.userId) throw new ForbiddenError();

  const [updated] = await db
    .update(personas)
    .set({ ...patch, updatedBy: principalTag(principal), updatedAt: new Date() })
    .where(eq(personas.id, existing.id))
    .returning();
  return updated ?? null;
}

/**
 * Replace a persona's `traits` JSONB and mirror the pool back to the owner's
 * `user_traits`. Callers merge-by-key before passing the full object in.
 */
export async function updatePersonaTraits(
  principal: ServicePrincipal,
  uri: string,
  traits: Record<string, unknown>,
): Promise<typeof personas.$inferSelect | null> {
  if (!principal.ability.can('update', 'Persona')) throw new ForbiddenError();

  const [existing] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, uri), notDeleted(personas)))
    .limit(1);
  if (!existing) return null;
  if (String(existing.userId) !== principal.userId) throw new ForbiddenError();

  const tag = principalTag(principal);
  const [updated] = await db
    .update(personas)
    .set({ traits, updatedBy: tag, updatedAt: new Date() })
    .where(eq(personas.id, existing.id))
    .returning();

  // Mirror into the master trait pool (best-effort; pool is source of truth for reuse).
  await db
    .update(userTraits)
    .set({ traits, updatedBy: tag, updatedAt: new Date() })
    .where(eq(userTraits.userId, existing.userId));

  return updated ?? null;
}

export * from './mutations';
// ─── Re-exports (search + discovery/recommender mutations) ────────────────────
// Placed at the bottom so the classes/types above are defined before these
// modules (which import from here) are evaluated.
export * from './search';
