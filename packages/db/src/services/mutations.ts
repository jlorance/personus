/**
 * Discovery/Recommender-facing mutations: mediated contact requests, shadow
 * personas, endorsements, and community listing. Each enforces its CASL gate
 * and ownership. Kept lean for the founding pass; extend with richer validation
 * as the UI lands.
 */

import { db } from '../index';
import { and, eq, isNull } from '../orm';
import {
  communities,
  communityMembers,
  contactRequests,
  endorsements,
  personas,
  shadowPersonas,
} from '../schema';
import { endorsementTargetValid } from './gates';
import {
  ForbiddenError,
  NotFoundError,
  owns,
  type ServicePrincipal,
  principalTag as tag,
  toBigId,
} from './index';

/** Create a mediated contact request. Stores NO raw contact details (ContactRelay resolves delivery). */
export async function createContactRequest(
  principal: ServicePrincipal,
  input: { fromPersonaUri?: string; toPersonaUri: string; reason: string; message?: string },
): Promise<typeof contactRequests.$inferSelect> {
  // A contact request is an authenticated action — an anonymous caller must not
  // be able to spam introductions even if granted the CASL create ability.
  if (!principal.userId || !principal.ability.can('create', 'ContactRequest')) {
    throw new ForbiddenError();
  }

  // If a from-persona is claimed, it must belong to the principal (live rows only).
  if (input.fromPersonaUri) {
    const [owned] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(and(eq(personas.uri, input.fromPersonaUri), isNull(personas.deletedAt)))
      .limit(1);
    if (!owned || !owns(owned, principal)) throw new ForbiddenError();
  }

  // The target persona must exist and be live.
  const [target] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.uri, input.toPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  if (!target) throw new NotFoundError('Target persona not found');

  const [row] = await db
    .insert(contactRequests)
    .values({
      fromPersonaUri: input.fromPersonaUri ?? null,
      toPersonaUri: input.toPersonaUri,
      reason: input.reason,
      message: input.message ?? null,
      status: 'pending',
      createdBy: tag(principal),
      updatedBy: tag(principal),
    })
    .returning();
  return row;
}

/** Create a shadow persona (placeholder for a non-user) in a community. */
export async function createShadowPersona(
  principal: ServicePrincipal,
  input: {
    communityId: string;
    createdByPersonaUri: string;
    displayName: string;
    traits?: Record<string, unknown>;
  },
): Promise<typeof shadowPersonas.$inferSelect> {
  if (!principal.userId || !principal.ability.can('create', 'ShadowPersona')) {
    throw new ForbiddenError();
  }
  const [owned] = await db
    .select({ userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, input.createdByPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  if (!owned || !owns(owned, principal)) throw new ForbiddenError();

  const claimToken = `clm_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const [row] = await db
    .insert(shadowPersonas)
    .values({
      communityId: toBigId(input.communityId),
      createdByPersonaUri: input.createdByPersonaUri,
      displayName: input.displayName,
      traits: input.traits ?? {},
      claimStatus: 'unclaimed',
      claimToken,
      createdBy: tag(principal),
      updatedBy: tag(principal),
    })
    .returning();
  return row;
}

/** Create an endorsement toward a real persona or a shadow persona. */
export async function createEndorsement(
  principal: ServicePrincipal,
  input: {
    fromPersonaUri: string;
    toPersonaUri?: string;
    toShadowPersonaId?: string;
    relationshipType: string;
    strength?: string;
    testimonial?: string;
  },
): Promise<typeof endorsements.$inferSelect> {
  if (!principal.userId || !principal.ability.can('create', 'Endorsement')) {
    throw new ForbiddenError();
  }
  // Exactly one target (real XOR shadow) — mirrors the DB check constraint.
  if (!endorsementTargetValid(input)) {
    throw new ForbiddenError(
      'Endorsement must target exactly one of a persona or a shadow persona',
    );
  }
  const [owned] = await db
    .select({ userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, input.fromPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  if (!owned || !owns(owned, principal)) throw new ForbiddenError();

  const [row] = await db
    .insert(endorsements)
    .values({
      fromPersonaUri: input.fromPersonaUri,
      toPersonaUri: input.toPersonaUri ?? null,
      toShadowPersonaId: input.toShadowPersonaId ? toBigId(input.toShadowPersonaId) : null,
      relationshipType: input.relationshipType,
      strength: input.strength ?? 'moderate',
      testimonial: input.testimonial ?? null,
      createdBy: tag(principal),
      updatedBy: tag(principal),
    })
    .returning();
  return row;
}

/** List communities visible to the principal (their memberships, else public). */
export async function listCommunities(
  principal: ServicePrincipal & { networkDepth?: 1 | 2 },
): Promise<
  Array<{ slug: string; name: string; communityType: string; memberCount: number | null }>
> {
  if (!principal.ability.can('read', 'Community')) return [];

  if (principal.userId) {
    return db
      .select({
        slug: communities.slug,
        name: communities.name,
        communityType: communities.communityType,
        memberCount: communities.memberCount,
      })
      .from(communities)
      .innerJoin(communityMembers, eq(communityMembers.communityId, communities.id))
      .where(
        and(eq(communityMembers.userId, BigInt(principal.userId)), isNull(communities.deletedAt)),
      );
  }

  return db
    .select({
      slug: communities.slug,
      name: communities.name,
      communityType: communities.communityType,
      memberCount: communities.memberCount,
    })
    .from(communities)
    .where(and(eq(communities.visibility, 'public'), isNull(communities.deletedAt)))
    .limit(50);
}
