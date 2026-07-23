/**
 * Multi-step permission checks — the ~20% CASL attribute rules can't express
 * because they need a DB lookup (ownership, membership). Service functions call
 * these after the coarse CASL `can()` gate passes.
 */

import { db } from '@personus/db';
import { and, eq } from '@personus/db/orm';
import { communityMembers, personas } from '@personus/db/schema';
import { ForbiddenError } from '@personus/db/services';
import type { AppAbility } from './abilities';

interface Actor {
  userId: string | null;
  ability: AppAbility;
}

/** Assert the actor owns the persona identified by `uri`. */
export async function assertOwnsPersona(actor: Actor, uri: string): Promise<void> {
  if (!actor.userId || !actor.ability.can('update', 'Persona')) throw new ForbiddenError();
  const [row] = await db
    .select({ userId: personas.userId })
    .from(personas)
    .where(eq(personas.uri, uri))
    .limit(1);
  if (!row || String(row.userId) !== actor.userId) throw new ForbiddenError();
}

/** Assert the actor is a member of the given community. */
export async function assertInCommunity(actor: Actor, communityId: string): Promise<void> {
  if (!actor.userId) throw new ForbiddenError();
  const [row] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, BigInt(actor.userId)),
        eq(communityMembers.communityId, BigInt(communityId)),
      ),
    )
    .limit(1);
  if (!row) throw new ForbiddenError();
}

/** Assert the actor is an admin of the given community. */
export async function assertCommunityAdmin(actor: Actor, communityId: string): Promise<void> {
  if (!actor.userId) throw new ForbiddenError();
  const [row] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, BigInt(actor.userId)),
        eq(communityMembers.communityId, BigInt(communityId)),
      ),
    )
    .limit(1);
  if (!row || row.role !== 'admin') throw new ForbiddenError();
}
