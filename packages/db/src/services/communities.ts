/**
 * Community lifecycle — create (founder becomes admin member), join, leave.
 * Listing lives in mutations.ts (listCommunities).
 */

import { atomic } from '../atomic';
import { db } from '../index';
import { and, eq, isNull, sql } from '../orm';
import { communities, communityMembers, personas } from '../schema';
import { slugifyName } from './gates';
import { ForbiddenError, NotFoundError, owns, type ServicePrincipal } from './index';

/** Create a community; the founder joins as an admin member with the given persona. */
export async function createCommunity(
  principal: ServicePrincipal,
  input: { name: string; communityType?: string; description?: string; foundingPersonaUri: string },
): Promise<typeof communities.$inferSelect> {
  if (!principal.userId || !principal.ability.can('create', 'Community'))
    throw new ForbiddenError();

  const [foundingPersona] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, input.foundingPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  if (!foundingPersona || !owns(foundingPersona, principal)) {
    throw new ForbiddenError();
  }

  const base = slugifyName(input.name);
  let slug = base;
  let unique = false;
  for (let i = 0; i < 5; i++) {
    const [taken] = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.slug, slug))
      .limit(1);
    if (!taken) {
      unique = true;
      break;
    }
    slug = `${base}-${i + 1}`;
  }
  if (!unique) throw new Error(`Could not allocate a unique community slug for "${input.name}"`);

  const tag = `user:${principal.userId}`;
  const [community] = await db
    .insert(communities)
    .values({
      slug,
      name: input.name,
      description: input.description ?? null,
      communityType: input.communityType ?? 'club',
      foundingUserId: BigInt(principal.userId),
      memberCount: 1,
      createdBy: tag,
      updatedBy: tag,
    })
    .returning();

  // The Neon HTTP driver has no interactive transactions, so guard the founder
  // membership insert with a compensating delete — never leave an orphan
  // community with memberCount:1 and no member row.
  try {
    await db.insert(communityMembers).values({
      userId: BigInt(principal.userId),
      personaId: foundingPersona.id,
      communityId: community.id,
      role: 'admin',
      createdBy: tag,
      updatedBy: tag,
    });
  } catch (err) {
    await db.delete(communities).where(eq(communities.id, community.id));
    throw err;
  }

  return community;
}

/** Join a community with one of the principal's personas (idempotent). */
export async function joinCommunity(
  principal: ServicePrincipal,
  slug: string,
  personaUri: string,
): Promise<void> {
  if (!principal.userId || !principal.ability.can('create', 'Membership'))
    throw new ForbiddenError();

  const [community] = await db
    .select({ id: communities.id, joinPolicy: communities.joinPolicy })
    .from(communities)
    .where(and(eq(communities.slug, slug), isNull(communities.deletedAt)))
    .limit(1);
  if (!community) throw new NotFoundError('Community not found');
  // Only open communities allow self-service join; approval/invite_only need a
  // flow that isn't built yet, so refuse rather than silently bypass the policy.
  if (community.joinPolicy !== 'open') {
    throw new ForbiddenError('This community requires an invitation or approval to join');
  }

  const [persona] = await db
    .select({ id: personas.id, userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, personaUri), isNull(personas.deletedAt)))
    .limit(1);
  if (!persona || !owns(persona, principal)) throw new ForbiddenError();

  const [existing] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, BigInt(principal.userId)),
        eq(communityMembers.communityId, community.id),
      ),
    )
    .limit(1);
  if (existing) return; // already a member

  const tag = `user:${principal.userId}`;
  // Hoisted out of the closure: `owns()` above narrows `principal.userId` to
  // non-null, but that narrowing does not survive into a callback.
  const memberUserId = BigInt(principal.userId as string);
  // Membership and the denormalised counter must land together: a failure
  // between them leaves the user a member of a community whose memberCount
  // never incremented, and the drift is permanent (PER-22).
  await atomic((tx) => [
    tx.insert(communityMembers).values({
      userId: memberUserId,
      personaId: persona.id,
      communityId: community.id,
      role: 'member',
      createdBy: tag,
      updatedBy: tag,
    }),
    tx
      .update(communities)
      .set({ memberCount: sql`${communities.memberCount} + 1` })
      .where(eq(communities.id, community.id)),
  ]);
}

/** Leave a community. Returns false if the principal wasn't a member. */
export async function leaveCommunity(principal: ServicePrincipal, slug: string): Promise<boolean> {
  if (!principal.userId || !principal.ability.can('delete', 'Membership'))
    throw new ForbiddenError();
  const [community] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(and(eq(communities.slug, slug), isNull(communities.deletedAt)))
    .limit(1);
  if (!community) return false;

  const memberPredicate = and(
    eq(communityMembers.userId, BigInt(principal.userId)),
    eq(communityMembers.communityId, community.id),
  );

  // Decrement first, guarded on the membership still existing, then delete —
  // both in one atomic unit. Ordering matters: the guard has to observe the row
  // before it is removed. Doing the delete first and the decrement after (the
  // previous shape) drops the counter update entirely if the second call fails.
  const results = await atomic((tx) => [
    tx
      .update(communities)
      .set({ memberCount: sql`GREATEST(0, ${communities.memberCount} - 1)` })
      .where(
        and(
          eq(communities.id, community.id),
          sql`EXISTS (SELECT 1 FROM ${communityMembers} WHERE ${memberPredicate})`,
        ),
      ),
    tx.delete(communityMembers).where(memberPredicate).returning({ id: communityMembers.id }),
  ]);

  const deleted = (results[1] ?? []) as { id: unknown }[];
  return deleted.length > 0;
}
