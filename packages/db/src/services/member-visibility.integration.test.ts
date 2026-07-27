/**
 * Member-directory visibility toggle (PER-27) — integration tests.
 *
 * The write half of the directory. PER-20's read service is what makes the
 * effect observable, so these assert through it rather than by reading the
 * column: a toggle that writes a value nothing honours is not a working toggle.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../index';
import { and, eq } from '../orm';
import { communityMembers, users, userTraits } from '../schema';
import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from '../test/harness';
import {
  createCommunity,
  createPersona,
  ForbiddenError,
  joinCommunity,
  listCommunityMembers,
  type ServicePrincipal,
  setMemberVisibility,
} from './index';

type P = ServicePrincipal & { networkDepth?: 1 | 2 };

const nonAdminAbility = {
  can: (a: string, s: string) => !(a === 'manage' && s === 'AdminSurface'),
};

const anon: P = {
  userId: null,
  ability: { can: () => true },
  networkDepth: 1,
};

describe.skipIf(!hasTestDb)('setMemberVisibility', () => {
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
    const [u] = await db
      .insert(users)
      .values({
        authSubjectId: `vis_sub_${seq}_${Date.now()}`,
        email: `vis${seq}@x.com`,
        createdBy: 'test',
        updatedBy: 'test',
      })
      .returning();
    await db.insert(userTraits).values({ userId: u.id, createdBy: 'test', updatedBy: 'test' });
    return { userId: String(u.id), ability: nonAdminAbility, networkDepth: 2 };
  }

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
    return { founder, community, member };
  }

  it('hides the caller from the directory when set to false', async () => {
    const { community, member } = await seedCommunity();

    await setMemberVisibility(member, community.slug, false);

    const rows = await listCommunityMembers(member, community.slug);
    expect(rows.map((r) => r.displayName)).toEqual(['Anna Founder']);
  });

  it('restores the caller when set back to true', async () => {
    const { community, member } = await seedCommunity();

    await setMemberVisibility(member, community.slug, false);
    await setMemberVisibility(member, community.slug, true);

    const rows = await listCommunityMembers(member, community.slug);
    expect(rows.map((r) => r.displayName)).toEqual(['Anna Founder', 'Bruno Member']);
  });

  it('affects only the caller, leaving other members visible', async () => {
    const { community, founder, member } = await seedCommunity();

    await setMemberVisibility(founder, community.slug, false);

    const rows = await listCommunityMembers(member, community.slug);
    expect(rows.map((r) => r.displayName)).toEqual(['Bruno Member']);
  });

  it('is scoped to one community — membership elsewhere is untouched', async () => {
    const { community, member } = await seedCommunity();
    const other = await seedCommunity();
    // Same user joins the second community with a fresh persona.
    const p2 = await createPersona(member, { displayName: 'Bruno Elsewhere' });
    await joinCommunity(member, other.community.slug, p2.uri);

    await setMemberVisibility(member, community.slug, false);

    expect((await listCommunityMembers(member, community.slug)).map((r) => r.displayName)).toEqual([
      'Anna Founder',
    ]);
    expect(
      (await listCommunityMembers(member, other.community.slug)).map((r) => r.displayName),
    ).toContain('Bruno Elsewhere');
  });

  it('refuses a non-member loudly, unlike the read path', async () => {
    const { community } = await seedCommunity();
    const outsider = await makeUser();

    await expect(setMemberVisibility(outsider, community.slug, false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('refuses an anonymous caller', async () => {
    const { community } = await seedCommunity();

    await expect(setMemberVisibility(anon, community.slug, false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('refuses an unknown slug', async () => {
    const { member } = await seedCommunity();

    await expect(setMemberVisibility(member, 'no-such-community', false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('is idempotent — setting the same value twice is not an error', async () => {
    const { community, member } = await seedCommunity();

    await setMemberVisibility(member, community.slug, false);
    await expect(setMemberVisibility(member, community.slug, false)).resolves.not.toThrow();

    expect((await listCommunityMembers(member, community.slug)).map((r) => r.displayName)).toEqual([
      'Anna Founder',
    ]);
  });

  it('rejects a NULL visible at the database level after the migration', async () => {
    const { community, member } = await seedCommunity();

    // The column is NOT NULL as of this change, so the ambiguity the read path
    // had to fail closed against can no longer be created at all.
    await expect(
      db
        .update(communityMembers)
        .set({ visible: null as unknown as boolean })
        .where(eq(communityMembers.userId, BigInt(member.userId as string))),
    ).rejects.toThrow();

    // And the directory is unaffected by the failed write.
    const rows = await listCommunityMembers(member, community.slug);
    expect(rows).toHaveLength(2);
  });

  it('writes through to the column the read path filters on', async () => {
    const { community, member } = await seedCommunity();

    await setMemberVisibility(member, community.slug, false);

    const [row] = await db
      .select({ visible: communityMembers.visible })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.userId, BigInt(member.userId as string)),
          eq(communityMembers.communityId, community.id),
        ),
      );
    expect(row.visible).toBe(false);
  });
});
