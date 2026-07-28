/**
 * Member-directory read service (PER-20) — integration tests against real Postgres.
 *
 * The service layer is the layer this change reaches, so this is where it is
 * proven. Each case fails without `listCommunityMembers` existing.
 *
 * Skipped without TEST_DATABASE_URL; see the harness for why that is loud.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../index';
import { and, eq } from '../orm';
import { communityMembers } from '../schema';
import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from '../test/harness';
import {
  createCommunity,
  createEndorsement,
  createPersona,
  deletePersona,
  getFeaturedMembers,
  joinCommunity,
  listCommunityMembers,
  type ServicePrincipal,
} from './index';

type P = ServicePrincipal & { networkDepth?: 1 | 2 };

const nonAdminAbility = {
  can: (a: string, s: string) => !(a === 'manage' && s === 'AdminSurface'),
};

const anon: P = {
  userId: null,
  ability: { can: (a, s) => a === 'read' && (s === 'Persona' || s === 'Community') },
  networkDepth: 1,
};

describe.skipIf(!hasTestDb)('listCommunityMembers', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  let seq = 0;
  async function makeUser(): Promise<P> {
    seq += 1;
    const { users, userTraits } = await import('../schema');
    const [u] = await db
      .insert(users)
      .values({
        authSubjectId: `dir_sub_${seq}_${Date.now()}`,
        email: `dir${seq}@x.com`,
        createdBy: 'test',
        updatedBy: 'test',
      })
      .returning();
    await db.insert(userTraits).values({ userId: u.id, createdBy: 'test', updatedBy: 'test' });
    return { userId: String(u.id), ability: nonAdminAbility, networkDepth: 2 };
  }

  /** A community with its founder, plus one joined member. */
  async function seedCommunity() {
    const founder = await makeUser();
    const fp = await createPersona(founder, { displayName: 'Anna Founder' });
    const community = await createCommunity(founder, {
      name: `Guild ${seq}`,
      foundingPersonaUri: fp.uri,
    });

    const member = await makeUser();
    const mp = await createPersona(member, { displayName: 'Bruno Member' });
    await joinCommunity(member, community.slug, mp.uri);

    return { founder, fp, community, member, mp };
  }

  /** Set a member's directory visibility directly, bypassing the PER-27 service. */
  async function setVisible(userId: string, communityId: bigint, visible: boolean) {
    await db
      .update(communityMembers)
      .set({ visible })
      .where(
        and(
          eq(communityMembers.userId, BigInt(userId)),
          eq(communityMembers.communityId, communityId),
        ),
      );
  }

  it('returns visible members to a member of the community', async () => {
    const { community, member } = await seedCommunity();

    const rows = await listCommunityMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Anna Founder', 'Bruno Member']);
    expect(rows.find((r) => r.displayName === 'Anna Founder')?.role).toBe('admin');
    expect(rows.find((r) => r.displayName === 'Bruno Member')?.role).toBe('member');
  });

  it('excludes a member whose visible flag is false', async () => {
    const { community, member, founder } = await seedCommunity();
    await setVisible(founder.userId as string, community.id, false);

    const rows = await listCommunityMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Bruno Member']);
  });

  it('excludes the caller themselves when they are hidden', async () => {
    const { community, member } = await seedCommunity();
    await setVisible(member.userId as string, community.id, false);

    const rows = await listCommunityMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Anna Founder']);
  });

  // A "treats NULL as hidden" case lived here. PER-27 made the column NOT NULL,
  // so that state can no longer be constructed — the service still filters
  // `= true` as defence in depth, but the ambiguity it guarded is gone. The
  // constraint itself is asserted in member-visibility.integration.test.ts.

  it('returns [] to a non-member rather than an error', async () => {
    const { community } = await seedCommunity();
    const outsider = await makeUser();

    await expect(listCommunityMembers(outsider, community.slug)).resolves.toEqual([]);
  });

  it('returns [] to an anonymous caller', async () => {
    const { community } = await seedCommunity();

    await expect(listCommunityMembers(anon, community.slug)).resolves.toEqual([]);
  });

  it('returns [] for an unknown slug, indistinguishable from not-a-member', async () => {
    const { member } = await seedCommunity();

    await expect(listCommunityMembers(member, 'no-such-community')).resolves.toEqual([]);
  });

  it('excludes members whose persona has been soft-deleted', async () => {
    const { community, member, founder, fp } = await seedCommunity();
    await deletePersona(founder, fp.uri);

    const rows = await listCommunityMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Bruno Member']);
  });

  it('orders members by display name', async () => {
    const { community, member } = await seedCommunity();
    const third = await makeUser();
    const tp = await createPersona(third, { displayName: 'Aaron Early' });
    await joinCommunity(third, community.slug, tp.uri);

    const rows = await listCommunityMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Aaron Early', 'Anna Founder', 'Bruno Member']);
  });

  it('lets a platform superuser browse a community they never joined', async () => {
    const { community } = await seedCommunity();
    const admin = await makeUser();
    // Platform superuser: `manage AdminSurface` is what isPlatformAdmin reads.
    admin.ability = { can: () => true };

    const rows = await listCommunityMembers(admin, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Anna Founder', 'Bruno Member']);
  });

  it('still hides a member who opted out, even from a superuser', async () => {
    const { community, founder } = await seedCommunity();
    await setVisible(founder.userId as string, community.id, false);
    const admin = await makeUser();
    admin.ability = { can: () => true };

    const rows = await listCommunityMembers(admin, community.slug);

    // The superuser's reach crosses community boundaries; it does not override
    // a member's own privacy choice. Same reason setMemberVisibility has no
    // admin exemption.
    expect(rows.map((r) => r.displayName)).toEqual(['Bruno Member']);
  });

  it('scopes to the requested community and does not leak a sibling', async () => {
    const { community, member } = await seedCommunity();

    // A second community with its own founder and member. Same display names,
    // so a leak would show up as duplicates rather than as unfamiliar rows.
    const other = await seedCommunity();
    expect(other.community.id).not.toBe(community.id);

    const rows = await listCommunityMembers(member, community.slug);

    // Exactly this community's two members — not four.
    expect(rows).toHaveLength(2);
    // And the caller, being a member of `community` only, sees nothing of `other`.
    await expect(listCommunityMembers(member, other.community.slug)).resolves.toEqual([]);
  });
});

// ─── getFeaturedMembers (PER-28) ──────────────────────────────────────────────
//
// Featured members are the top-endorsed visible members of a community, capped
// at a small limit (default 6). AC-2 of PER-28 requires that this surface draws
// from the same filtered set as `listCommunityMembers` — the `visible` flag is
// never bypassed. A direct query against `community_members` could silently drop
// the filter; these tests pin the contract so that cannot regress.

describe.skipIf(!hasTestDb)('getFeaturedMembers', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  // Re-use the same per-suite counter so email addresses stay unique.
  let seq = 0;
  async function makeUser(): Promise<P> {
    seq += 1;
    const { users, userTraits } = await import('../schema');
    const [u] = await db
      .insert(users)
      .values({
        authSubjectId: `feat_sub_${seq}_${Date.now()}`,
        email: `feat${seq}@x.com`,
        createdBy: 'test',
        updatedBy: 'test',
      })
      .returning();
    await db.insert(userTraits).values({ userId: u.id, createdBy: 'test', updatedBy: 'test' });
    return { userId: String(u.id), ability: nonAdminAbility, networkDepth: 2 };
  }

  async function seedCommunityFeat() {
    const founder = await makeUser();
    const fp = await createPersona(founder, { displayName: 'Founder F' });
    const community = await createCommunity(founder, {
      name: `FeatGuild ${seq}`,
      foundingPersonaUri: fp.uri,
    });
    const member = await makeUser();
    const mp = await createPersona(member, { displayName: 'Member F' });
    await joinCommunity(member, community.slug, mp.uri);
    return { founder, fp, community, member, mp };
  }

  async function setVisible(userId: string, communityId: bigint, visible: boolean) {
    await db
      .update(communityMembers)
      .set({ visible })
      .where(
        and(
          eq(communityMembers.userId, BigInt(userId)),
          eq(communityMembers.communityId, communityId),
        ),
      );
  }

  it('excludes a member whose visible flag is false', async () => {
    // THE test that must fail before `getFeaturedMembers` exists.
    // PER-28 AC-2: the visible filter is never bypassed on this surface.
    const { community, member, founder } = await seedCommunityFeat();
    await setVisible(founder.userId as string, community.id, false);

    const rows = await getFeaturedMembers(member, community.slug);

    expect(rows.map((r) => r.displayName)).toEqual(['Member F']);
  });

  it('returns [] to a non-member, same as listCommunityMembers', async () => {
    const { community } = await seedCommunityFeat();
    const outsider = await makeUser();

    await expect(getFeaturedMembers(outsider, community.slug)).resolves.toEqual([]);
  });

  it('returns [] for an unknown slug', async () => {
    const { member } = await seedCommunityFeat();

    await expect(getFeaturedMembers(member, 'no-such-slug')).resolves.toEqual([]);
  });

  it('orders by endorsement count descending', async () => {
    const { community, member, fp, mp } = await seedCommunityFeat();

    // Member endorses founder — founder gets 1 endorsement, member stays at 0.
    await createEndorsement(member, {
      fromPersonaUri: mp.uri,
      toPersonaUri: fp.uri,
      relationshipType: 'colleague',
    });

    const rows = await getFeaturedMembers(member, community.slug);

    // Founder has 1 endorsement, member has 0 → founder appears first.
    expect(rows[0]?.displayName).toBe('Founder F');
    expect(rows[0]?.endorsementCount).toBe(1);
    expect(rows[1]?.displayName).toBe('Member F');
    expect(rows[1]?.endorsementCount).toBe(0);
  });

  it('respects the limit parameter', async () => {
    const { community, member } = await seedCommunityFeat();
    // Two members exist (founder + member). Limit to 1.
    const rows = await getFeaturedMembers(member, community.slug, 1);

    expect(rows).toHaveLength(1);
  });
});
