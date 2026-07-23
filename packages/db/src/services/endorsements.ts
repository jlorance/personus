/**
 * Endorsement reads — visibility-filtered listing for a persona, and retract.
 * Creation lives in mutations.ts. Visibility decisions delegate to gates.ts.
 */

import { db } from '../index';
import { and, eq, isNull } from '../orm';
import { communityMembers, endorsements, personas } from '../schema';
import { canViewEndorsement, type Viewer } from './gates';
import { ForbiddenError, type ServicePrincipal } from './index';

export interface EndorsementView {
  publicId: string;
  fromPersonaUri: string;
  relationshipType: string;
  strength: string;
  testimonial: string | null;
}

/** List endorsements addressed to a persona that the viewer is allowed to see. */
export async function listEndorsementsForPersona(
  principal: ServicePrincipal & { networkDepth?: 1 | 2 },
  toPersonaUri: string,
): Promise<EndorsementView[]> {
  if (!principal.ability.can('read', 'Endorsement')) return [];
  const viewer: Viewer = { userId: principal.userId, networkDepth: principal.networkDepth ?? 1 };

  // Resolve owner of the "from" persona and the target owner for the owner-bypass.
  const rows = await db
    .select({
      publicId: endorsements.publicId,
      fromPersonaUri: endorsements.fromPersonaUri,
      relationshipType: endorsements.relationshipType,
      strength: endorsements.strength,
      testimonial: endorsements.testimonial,
      visibility: endorsements.visibility,
      communityId: endorsements.communityId,
      fromOwnerUserId: personas.userId,
    })
    .from(endorsements)
    .leftJoin(
      personas,
      and(eq(personas.uri, endorsements.fromPersonaUri), isNull(personas.deletedAt)),
    )
    .where(and(eq(endorsements.toPersonaUri, toPersonaUri), isNull(endorsements.deletedAt)));

  // Target owner (single lookup) for the recipient-bypass — live rows only.
  const [target] = await db
    .select({ userId: personas.userId })
    .from(personas)
    .where(and(eq(personas.uri, toPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  const toOwnerUserId = target ? String(target.userId) : null;

  // Community memberships (for 'community'-visibility endorsements).
  const memberCommunityIds = new Set<string>();
  if (principal.userId) {
    const memberships = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(eq(communityMembers.userId, BigInt(principal.userId)));
    for (const m of memberships) memberCommunityIds.add(String(m.communityId));
  }

  return rows
    .filter((r) =>
      canViewEndorsement(
        viewer,
        {
          visibility: r.visibility,
          fromOwnerUserId: r.fromOwnerUserId != null ? String(r.fromOwnerUserId) : null,
          toOwnerUserId,
        },
        r.communityId != null && memberCommunityIds.has(String(r.communityId)),
      ),
    )
    .map((r) => ({
      publicId: r.publicId,
      fromPersonaUri: r.fromPersonaUri,
      relationshipType: r.relationshipType,
      strength: r.strength,
      testimonial: r.testimonial,
    }));
}

/** Retract (soft-delete) an endorsement the principal authored or received. */
export async function retractEndorsement(
  principal: ServicePrincipal,
  endorsementPublicId: string,
): Promise<boolean> {
  if (!principal.ability.can('delete', 'Endorsement') || !principal.userId)
    throw new ForbiddenError();

  const [row] = await db
    .select({
      id: endorsements.id,
      fromPersonaUri: endorsements.fromPersonaUri,
      toPersonaUri: endorsements.toPersonaUri,
    })
    .from(endorsements)
    .where(and(eq(endorsements.publicId, endorsementPublicId), isNull(endorsements.deletedAt)))
    .limit(1);
  if (!row) return false;

  // Authored-or-received check: the principal must own from- or to-persona.
  const uris = [row.fromPersonaUri, row.toPersonaUri].filter(Boolean) as string[];
  const owned = await db
    .select({ uri: personas.uri })
    .from(personas)
    .where(and(eq(personas.userId, BigInt(principal.userId)), isNull(personas.deletedAt)));
  const ownedSet = new Set(owned.map((o) => o.uri));
  if (!uris.some((u) => ownedSet.has(u))) throw new ForbiddenError();

  await db
    .update(endorsements)
    .set({ deletedAt: new Date(), updatedBy: `user:${principal.userId}`, updatedAt: new Date() })
    .where(eq(endorsements.id, row.id));
  return true;
}
