/**
 * PlatformChannel bindings — the persistence behind the bot surfaces (Slack /
 * Discord / Telegram) that Mastra's `channels` primitive drives. A binding links
 * a community to an external platform channel; Mastra owns routing/threading, so
 * we store only the minimal binding + adapter config.
 *
 * Mutations require the CASL `manage PlatformChannel` ability AND community-admin
 * membership; reads are open to community members.
 */

import { db } from '../index';
import { and, eq, isNull } from '../orm';
import { communityMembers, platformChannelBindings } from '../schema';
import {
  ForbiddenError,
  isPlatformAdmin,
  NotFoundError,
  type ServicePrincipal,
  toBigId,
} from './index';

async function memberRole(
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

async function assertCommunityAdmin(
  principal: ServicePrincipal,
  communityId: bigint,
): Promise<void> {
  if (isPlatformAdmin(principal)) return; // platform superuser manages any community
  if ((await memberRole(principal, communityId)) !== 'admin') throw new ForbiddenError();
}

export interface BindingView {
  publicId: string;
  communityId: string;
  platform: string;
  externalRef: string;
  status: string;
}

/** Bind a community to a platform channel (community admin only). Idempotent per (platform, externalRef). */
export async function bindPlatformChannel(
  principal: ServicePrincipal,
  input: {
    communityId: string;
    platform: 'slack' | 'discord' | 'telegram';
    externalRef: string;
    adapterConfig?: Record<string, unknown>;
  },
): Promise<typeof platformChannelBindings.$inferSelect> {
  if (!principal.ability.can('manage', 'PlatformChannel')) throw new ForbiddenError();
  const communityId = toBigId(input.communityId);
  await assertCommunityAdmin(principal, communityId);

  const tag = `user:${principal.userId}`;
  const [existing] = await db
    .select()
    .from(platformChannelBindings)
    .where(
      and(
        eq(platformChannelBindings.platform, input.platform),
        eq(platformChannelBindings.externalRef, input.externalRef),
      ),
    )
    .limit(1);

  if (existing) {
    // A channel already actively bound to a DIFFERENT community cannot be stolen —
    // only a revoked/soft-deleted binding is free to claim. (The (platform,
    // externalRef) unique constraint means there is at most one row per channel.)
    const stillActive = existing.deletedAt === null && existing.status === 'active';
    if (stillActive && existing.communityId !== communityId) {
      throw new ForbiddenError('That channel is already bound to another community');
    }
    // Re-activate / re-point an existing binding rather than violating the unique key.
    const [updated] = await db
      .update(platformChannelBindings)
      .set({
        communityId,
        status: 'active',
        adapterConfig: input.adapterConfig ?? existing.adapterConfig,
        revokedAt: null,
        updatedBy: tag,
        updatedAt: new Date(),
      })
      .where(eq(platformChannelBindings.id, existing.id))
      .returning();
    return updated;
  }

  const [row] = await db
    .insert(platformChannelBindings)
    .values({
      communityId,
      platform: input.platform,
      externalRef: input.externalRef,
      status: 'active',
      adapterConfig: input.adapterConfig ?? {},
      installedBy: tag,
      createdBy: tag,
      updatedBy: tag,
    })
    .returning();
  return row;
}

/** List a community's active bindings — visible to members of that community only. */
export async function listPlatformChannels(
  principal: ServicePrincipal,
  communityId: string,
): Promise<BindingView[]> {
  if (!principal.userId || !principal.ability.can('read', 'Community')) return [];
  const cid = toBigId(communityId);
  // Membership gate — an authenticated non-member must not enumerate a community's
  // bindings; a platform superuser may, for support/moderation.
  if (!isPlatformAdmin(principal) && (await memberRole(principal, cid)) === null) return [];

  const rows = await db
    .select({
      publicId: platformChannelBindings.publicId,
      communityId: platformChannelBindings.communityId,
      platform: platformChannelBindings.platform,
      externalRef: platformChannelBindings.externalRef,
      status: platformChannelBindings.status,
    })
    .from(platformChannelBindings)
    .where(
      and(
        eq(platformChannelBindings.communityId, cid),
        eq(platformChannelBindings.status, 'active'),
        isNull(platformChannelBindings.deletedAt),
      ),
    );
  return rows.map((r) => ({ ...r, communityId: String(r.communityId) }));
}

/** Revoke a binding (community admin only). */
export async function revokePlatformChannel(
  principal: ServicePrincipal,
  bindingPublicId: string,
): Promise<boolean> {
  if (!principal.ability.can('manage', 'PlatformChannel')) throw new ForbiddenError();
  const [binding] = await db
    .select({ id: platformChannelBindings.id, communityId: platformChannelBindings.communityId })
    .from(platformChannelBindings)
    .where(
      and(
        eq(platformChannelBindings.publicId, bindingPublicId),
        isNull(platformChannelBindings.deletedAt),
      ),
    )
    .limit(1);
  if (!binding) throw new NotFoundError('Binding not found');
  await assertCommunityAdmin(principal, binding.communityId);

  await db
    .update(platformChannelBindings)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      deletedAt: new Date(),
      updatedBy: `user:${principal.userId}`,
      updatedAt: new Date(),
    })
    .where(eq(platformChannelBindings.id, binding.id));
  return true;
}

/** Resolve the community bound to a platform channel (for inbound webhooks). */
export async function resolveBoundCommunity(
  platform: string,
  externalRef: string,
): Promise<{ communityId: string } | null> {
  const [b] = await db
    .select({ communityId: platformChannelBindings.communityId })
    .from(platformChannelBindings)
    .where(
      and(
        eq(platformChannelBindings.platform, platform),
        eq(platformChannelBindings.externalRef, externalRef),
        eq(platformChannelBindings.status, 'active'),
        isNull(platformChannelBindings.deletedAt),
      ),
    )
    .limit(1);
  return b ? { communityId: String(b.communityId) } : null;
}
