/**
 * Persona lifecycle — create / list-mine / soft-delete / hard-delete (purge).
 * Reads + updates live in search.ts (getPersonaByUri) and index.ts
 * (updatePersona/updatePersonaTraits).
 */

import { atomic } from '../atomic';
import { db } from '../index';
import { and, eq, isNull } from '../orm';
import { coachSessions, contactRequests, personas } from '../schema';
import { publicId } from '../schema/_factory';
import { slugifyName, toPersonaSummary } from './gates';
import {
  ForbiddenError,
  isPlatformAdmin,
  owns,
  principalTag,
  type ServicePrincipal,
} from './index';

/** Create a persona owned by the principal. Ensures a unique `uri`. */
export async function createPersona(
  principal: ServicePrincipal,
  input: {
    displayName: string;
    headline?: string;
    location?: string;
    visibility?: string;
    entityType?: string;
  },
): Promise<typeof personas.$inferSelect> {
  if (!principal.ability.can('create', 'Persona') || !principal.userId) throw new ForbiddenError();

  const base = slugifyName(input.displayName);
  let uri = base;
  let unique = false;
  // Resolve collisions with a short random suffix (bounded retries).
  for (let i = 0; i < 5; i++) {
    const [taken] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.uri, uri))
      .limit(1);
    if (!taken) {
      unique = true;
      break;
    }
    uri = `${base}-${publicId('x').slice(2, 7)}`;
  }
  if (!unique)
    throw new Error(`Could not allocate a unique persona uri for "${input.displayName}"`);

  const tag = `user:${principal.userId}`;
  const [row] = await db
    .insert(personas)
    .values({
      uri,
      userId: BigInt(principal.userId),
      displayName: input.displayName,
      headline: input.headline ?? '',
      location: input.location ?? null,
      visibility: input.visibility ?? 'community',
      entityType: input.entityType ?? 'person',
      createdBy: tag,
      updatedBy: tag,
    })
    .returning();
  return row;
}

/** List the principal's own personas (summaries), newest first. */
export async function listMyPersonas(principal: ServicePrincipal) {
  if (!principal.userId || !principal.ability.can('read', 'Persona')) return [];
  const rows = await db
    .select({
      uri: personas.uri,
      displayName: personas.displayName,
      headline: personas.headline,
      location: personas.location,
      completenessScore: personas.completenessScore,
    })
    .from(personas)
    .where(and(eq(personas.userId, BigInt(principal.userId)), isNull(personas.deletedAt)))
    .orderBy(personas.createdAt);
  return rows.map(toPersonaSummary);
}

/** Soft-delete a persona the principal owns. Returns false if not found/owned. */
export async function deletePersona(principal: ServicePrincipal, uri: string): Promise<boolean> {
  if (!principal.ability.can('delete', 'Persona') || !principal.userId) throw new ForbiddenError();
  const [existing] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
    .limit(1);
  if (!existing) return false;
  if (!owns(existing, principal) && !isPlatformAdmin(principal)) throw new ForbiddenError();

  const now = new Date();
  const tag = principalTag(principal);
  // The soft-delete and the decline must land together. Split across two calls,
  // a failure between them produces exactly the state the comment below warns
  // about: requests stuck pending with no owner able to respond (PER-22).
  // Null the embedding so the soft-deleted persona is evicted from the vector
  // index immediately — the ivfflat index has no partial WHERE filter that
  // would exclude it automatically (PER-24).
  await atomic((tx) => [
    tx
      .update(personas)
      .set({ deletedAt: now, embedding: null, updatedBy: tag, updatedAt: now })
      .where(eq(personas.id, existing.id)),
    // Decline any pending introductions addressed to this persona so they aren't
    // wedged forever with no owner able to respond.
    tx
      .update(contactRequests)
      .set({ status: 'declined', respondedAt: now, updatedBy: tag, updatedAt: now })
      .where(and(eq(contactRequests.toPersonaUri, uri), eq(contactRequests.status, 'pending'))),
  ]);

  return true;
}

/**
 * Hard-delete a persona (GDPR purge). Only platform admins may call this
 * (`purge Persona` in CASL). Nulls the embedding before deletion so the
 * 1536-dimensional fingerprint is evicted from the vector index before the
 * row is hard-deleted (PER-24).
 *
 * FK cascades on hard-delete:
 *   - endorsements.from_persona_uri / to_persona_uri → CASCADE (rows deleted)
 *   - contact_requests.from_persona_uri / to_persona_uri → CASCADE (rows deleted)
 *   - coach_sessions.persona_uri → SET NULL (session row kept; use
 *     purgeUserCoachSessions to clear transcript data separately)
 *
 * Returns false when the URI does not exist (including previously hard-deleted).
 */
export async function purgePersona(principal: ServicePrincipal, uri: string): Promise<boolean> {
  if (!principal.ability.can('purge', 'Persona')) throw new ForbiddenError();

  // Include soft-deleted rows — a GDPR erasure request must reach tombstones.
  const [existing] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.uri, uri))
    .limit(1);
  if (!existing) return false;

  // Null the embedding before hard-deletion so the vector is evicted from the
  // ivfflat index immediately, not deferred to a background VACUUM.
  await db
    .update(personas)
    .set({ embedding: null, updatedAt: new Date(), updatedBy: principalTag(principal) })
    .where(eq(personas.id, existing.id));

  await db.delete(personas).where(eq(personas.id, existing.id));
  return true;
}

/**
 * Hard-delete all coach sessions for a user (GDPR purge of transcript data).
 * Only platform admins may call this (`purge CoachSession` in CASL). The
 * `transcript` JSONB column holds verbatim coaching conversations; hard-deletion
 * is the only way to comply with a data-subject erasure request (PER-24).
 *
 * Returns the count of session rows deleted.
 */
export async function purgeUserCoachSessions(
  principal: ServicePrincipal,
  userId: string,
): Promise<number> {
  if (!principal.ability.can('purge', 'CoachSession')) throw new ForbiddenError();

  const deleted = await db
    .delete(coachSessions)
    .where(eq(coachSessions.userId, BigInt(userId)))
    .returning({ id: coachSessions.id });
  return deleted.length;
}
