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
import { and, type Column, eq, inArray, isNull } from '../orm';
import { communityMembers, personas, userTraits } from '../schema';

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

/** Canonical `created_by`/`updated_by` tag for a principal (user or system). */
export function principalTag(principal: ServicePrincipal): string {
  return principal.userId ? `user:${principal.userId}` : 'system';
}

/** Parse an external id string into a bigint, rejecting non-numeric input cleanly. */
export function toBigId(value: string): bigint {
  if (!/^\d+$/.test(value)) throw new NotFoundError('Invalid id');
  return BigInt(value);
}

/** True when `row.userId` (bigint) belongs to the principal. */
export function owns(row: { userId: bigint }, principal: ServicePrincipal): boolean {
  return principal.userId != null && String(row.userId) === principal.userId;
}

/**
 * Platform superuser marker. A platform admin (role=admin → `manage AdminSurface`)
 * bypasses ownership / community-membership scoping at the RESOURCE-management
 * gates below — one role, no per-community grant. Deliberately NOT wired into
 * `owns()` itself: the impersonation gates (acting FROM another user's persona —
 * contact requests, endorsements, joins) stay owner-only. Every admin action
 * still flows through the audit log tagged as the admin actor.
 */
export function isPlatformAdmin(principal: ServicePrincipal): boolean {
  return principal.ability.can('manage', 'AdminSurface');
}

/**
 * Persona-scoped shared-community test behind `'community'` persona visibility:
 * true when `viewerUserId` belongs to a community that persona `personaId` is
 * ALSO a member of (via community_members). Persona-scoped, not owner-scoped —
 * so a viewer only sees the facets (personas) presented into communities they
 * share, never the owner's other personas.
 */
export async function personaSharesCommunity(
  personaId: bigint,
  viewerUserId: string | null,
): Promise<boolean> {
  if (!viewerUserId) return false;
  const viewerCommunities = db
    .select({ cid: communityMembers.communityId })
    .from(communityMembers)
    .where(eq(communityMembers.userId, BigInt(viewerUserId)));
  const [hit] = await db
    .select({ pid: communityMembers.personaId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.personaId, personaId),
        inArray(communityMembers.communityId, viewerCommunities),
      ),
    )
    .limit(1);
  return Boolean(hit);
}

// ─── Persona mutations (Coach-facing) ─────────────────────────────────────────

/**
 * Columns `updatePersona` is allowed to write. Deliberately EXCLUDES `userId`
 * (ownership), `embedding` (gated by `updatePersonaEmbedding`), `traits` (gated
 * by `updatePersonaTraits`), `uri`, and all id/audit/tombstone columns — so a
 * patch can never reassign ownership or bypass a dedicated gate.
 */
export const EDITABLE_PERSONA_FIELDS = [
  'displayName',
  'initial',
  'headline',
  'location',
  'entityType',
  'visibility',
  'contactPreferences',
  'completenessScore',
  'layoutPreset',
  'theme',
  'mcpEnabled',
  'mcpTraitVisibility',
] as const;

export type EditablePersonaPatch = Partial<
  Pick<typeof personas.$inferInsert, (typeof EDITABLE_PERSONA_FIELDS)[number]>
>;

/**
 * Patch base-layer persona fields (headline, location, displayName, …).
 * Enforces CASL `update Persona` + ownership (principal.userId === persona.userId),
 * and only writes allowlisted columns (see EDITABLE_PERSONA_FIELDS).
 * Returns null if the persona doesn't exist.
 */
export async function updatePersona(
  principal: ServicePrincipal,
  uri: string,
  patch: EditablePersonaPatch,
): Promise<typeof personas.$inferSelect | null> {
  if (!principal.ability.can('update', 'Persona')) throw new ForbiddenError();

  const [existing] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, uri), notDeleted(personas)))
    .limit(1);
  if (!existing) return null;
  if (!owns(existing, principal) && !isPlatformAdmin(principal)) throw new ForbiddenError();

  // Defense-in-depth: only ever write allowlisted columns, even if a caller
  // (or the model-driven coach tool, whose `field` is a free string) supplies
  // `userId`/`embedding`/`deletedAt`/ids — those must never be mass-assignable.
  const safe: EditablePersonaPatch = {};
  for (const key of EDITABLE_PERSONA_FIELDS) {
    if (key in patch) (safe as Record<string, unknown>)[key] = patch[key];
  }

  const [updated] = await db
    .update(personas)
    .set({ ...safe, updatedBy: principalTag(principal), updatedAt: new Date() })
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
  if (!owns(existing, principal) && !isPlatformAdmin(principal)) throw new ForbiddenError();

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

export * from './communities';
export * from './contacts';
export * from './endorsements';
// ─── Re-exports ───────────────────────────────────────────────────────────────
// Placed at the bottom so the classes/types above are defined before these
// modules (which import from here) are evaluated.
export * from './gates';
export * from './mutations';
export * from './personas';
export * from './platform-channels';
export * from './reference';
export * from './search';
export * from './settings.service';
