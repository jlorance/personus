/**
 * Community lifecycle — create (founder becomes admin member), join, leave.
 * Listing lives in mutations.ts (listCommunities).
 */

import { atomic } from '../atomic';
import { db } from '../index';
import { and, asc, desc, eq, isNull, sql } from '../orm';
import { communities, communityMembers, endorsements, personas } from '../schema';
import { slugifyName } from './gates';
import {
  ForbiddenError,
  isPlatformAdmin,
  NotFoundError,
  owns,
  type ServicePrincipal,
} from './index';

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

/**
 * The caller's role in a community, or null when they are not a member.
 * Lives here rather than in a consuming module because community membership is
 * this module's concern; `platform-channels` imports it.
 */
export async function memberRole(
  principal: ServicePrincipal,
  communityId: bigint,
): Promise<string | null> {
  if (!principal.userId) return null;
  const [m] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, BigInt(principal.userId)),
        eq(communityMembers.communityId, communityId),
      ),
    )
    .limit(1);
  return m?.role ?? null;
}

/**
 * Set whether the caller appears in a community's browsable member directory.
 *
 * Self-only by construction — there is no target parameter, so no member can
 * change another's. Community admins are deliberately not exempt: this is a
 * personal privacy control, not a moderation one. Hiding a member as an act of
 * moderation is a different capability and wants its own audit trail.
 *
 * Unlike the read path, which returns `[]` for anyone not entitled to look,
 * this refuses loudly. A read that says nothing leaks nothing; a write that
 * silently does nothing tells the caller their preference was saved when it
 * was not.
 */
export async function setMemberVisibility(
  principal: ServicePrincipal,
  slug: string,
  visible: boolean,
): Promise<void> {
  if (!principal.userId || !principal.ability.can('update', 'Membership'))
    throw new ForbiddenError();

  const [community] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(and(eq(communities.slug, slug), isNull(communities.deletedAt)))
    .limit(1);
  // An unknown slug and a community the caller isn't in are the same refusal:
  // distinguishing them would confirm the community exists.
  if (!community) throw new ForbiddenError();

  const updated = await db
    .update(communityMembers)
    .set({ visible, updatedBy: `user:${principal.userId}`, updatedAt: new Date() })
    .where(
      and(
        eq(communityMembers.userId, BigInt(principal.userId)),
        eq(communityMembers.communityId, community.id),
      ),
    )
    .returning({ id: communityMembers.id });

  if (updated.length === 0) throw new ForbiddenError();
}

/** One row of a community's browsable member directory. */
export interface CommunityMemberSummary {
  uri: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  completenessScore: number | null;
  role: string;
}

/**
 * The browsable member directory for a community, visible to its members.
 *
 * Returns `[]` — never an error — for a non-member, an anonymous caller, or an
 * unknown slug. That is deliberate: an error would confirm the community exists
 * to someone not entitled to know, and it matches the repo's 404-not-403 shape.
 *
 * `visible` is nullable (`boolean().default(true)`, no `.notNull()`), so this
 * filters on `= true` and treats NULL as hidden. It fails closed: an
 * indeterminate flag never exposes someone in a browsable list.
 */
export async function listCommunityMembers(
  principal: ServicePrincipal,
  slug: string,
): Promise<CommunityMemberSummary[]> {
  const [community] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(and(eq(communities.slug, slug), isNull(communities.deletedAt)))
    .limit(1);
  if (!community) return [];

  // Membership gate — a platform superuser may browse any community's directory
  // for support/moderation, matching listPlatformChannels.
  //
  // The `visible = true` filter below still applies to them. That reach is about
  // crossing community boundaries, not about overriding a member's own privacy
  // choice — the same reason setMemberVisibility has no admin exemption.
  if (!isPlatformAdmin(principal) && (await memberRole(principal, community.id)) === null) {
    return [];
  }

  return await db
    .select({
      uri: personas.uri,
      displayName: personas.displayName,
      headline: personas.headline,
      location: personas.location,
      completenessScore: personas.completenessScore,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .innerJoin(personas, eq(personas.id, communityMembers.personaId))
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        eq(communityMembers.visible, true),
        isNull(personas.deletedAt),
      ),
    )
    .orderBy(asc(personas.displayName));
}

/** One row of a community's featured-members surface. */
export interface FeaturedMemberSummary extends CommunityMemberSummary {
  /** Community-scoped endorsement count, used for ranking. */
  endorsementCount: number;
}

/**
 * Top-endorsed visible members of a community, capped at `limit` (default 6).
 *
 * All surfaces that display aggregated or highlighted member data MUST use this
 * function rather than querying `community_members` directly. That keeps the
 * `visible` filter in one place and prevents it from silently dropping on any
 * given surface (PER-28 AC-2).
 *
 * Returns `[]` — never an error — for non-members, anonymous callers, and
 * unknown slugs, matching `listCommunityMembers` for the same reasons.
 */
export async function getFeaturedMembers(
  principal: ServicePrincipal,
  slug: string,
  limit = 6,
): Promise<FeaturedMemberSummary[]> {
  const [community] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(and(eq(communities.slug, slug), isNull(communities.deletedAt)))
    .limit(1);
  if (!community) return [];

  if (!isPlatformAdmin(principal) && (await memberRole(principal, community.id)) === null) {
    return [];
  }

  // Count active, non-deleted endorsements received by each persona.
  // A left join keeps members with zero endorsements in the result — they
  // appear at the bottom of the ranking, ordered alphabetically when counts tie.
  //
  // Note: endorsement count is not community-scoped for the MVP because
  // createEndorsement does not yet record communityId. The filter is added here
  // as soon as that field is reliably populated.
  const endorsementCount = sql<number>`cast(count(${endorsements.id}) as int)`;

  return await db
    .select({
      uri: personas.uri,
      displayName: personas.displayName,
      headline: personas.headline,
      location: personas.location,
      completenessScore: personas.completenessScore,
      role: communityMembers.role,
      endorsementCount,
    })
    .from(communityMembers)
    .innerJoin(personas, eq(personas.id, communityMembers.personaId))
    .leftJoin(
      endorsements,
      and(
        eq(endorsements.toPersonaUri, personas.uri),
        isNull(endorsements.deletedAt),
        eq(endorsements.active, true),
      ),
    )
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        eq(communityMembers.visible, true),
        isNull(personas.deletedAt),
      ),
    )
    .groupBy(
      personas.uri,
      personas.displayName,
      personas.headline,
      personas.location,
      personas.completenessScore,
      communityMembers.role,
    )
    .orderBy(desc(endorsementCount), asc(personas.displayName))
    .limit(limit);
}
