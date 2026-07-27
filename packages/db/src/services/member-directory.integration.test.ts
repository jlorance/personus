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
import { communities, communityMembers } from '../schema';
import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from '../test/harness';
import {
  createCommunity,
  createPersona,
  deletePersona,
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
