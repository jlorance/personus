/**
 * Persona lifecycle — create / list-mine / soft-delete. Reads + updates live in
 * search.ts (getPersonaByUri) and index.ts (updatePersona/updatePersonaTraits).
 */

import { db } from '../index';
import { and, eq, isNull } from '../orm';
import { personas } from '../schema';
import { publicId } from '../schema/_factory';
import { slugifyName, toPersonaSummary } from './gates';
import { ForbiddenError, type ServicePrincipal } from './index';

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
  if (String(existing.userId) !== principal.userId) throw new ForbiddenError();
  await db
    .update(personas)
    .set({ deletedAt: new Date(), updatedBy: `user:${principal.userId}`, updatedAt: new Date() })
    .where(eq(personas.id, existing.id));
  return true;
}
