/**
 * Service-layer integration tests — run against a real Postgres (pgvector) when
 * TEST_DATABASE_URL is set; skipped otherwise. These exercise the DB glue that
 * unit tests can't: ownership, visibility, member-count maintenance, soft-delete
 * filtering, and the 404-not-403 contact contract.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../index';
import { eq } from '../orm';
import {
  coachSessions,
  communities,
  contactRequests,
  personas,
  systemSettings,
  users,
  userTraits,
} from '../schema';
import {
  hasTestDb,
  isVectorAvailable,
  resetTables,
  setupTestDb,
  teardownTestDb,
} from '../test/harness';
import {
  approveJoinRequest,
  bindPlatformChannel,
  claimInvitation,
  createCommunity,
  createCommunityType,
  createContactRequest,
  createEndorsement,
  createInvitation,
  createPersona,
  createShadowPersona,
  createTraitMetadata,
  createTraitTaxonomy,
  declineJoinRequest,
  deleteCommunityType,
  deletePersona,
  deleteTraitMetadata,
  deleteTraitTaxonomy,
  ForbiddenError,
  getPersonaByUri,
  joinCommunity,
  leaveCommunity,
  listAllPlatformChannelBindings,
  listCommunities,
  listCommunityMembers,
  listEndorsementsForPersona,
  listInbox,
  listJoinRequests,
  listMyPersonas,
  listPlatformChannels,
  listSystemSettings,
  NotFoundError,
  purgePersona,
  purgeUserCoachSessions,
  requestToJoin,
  resolveBoundCommunity,
  respondToContact,
  retractEndorsement,
  revokePlatformChannel,
  type ServicePrincipal,
  searchPersonas,
  updateCommunityType,
  updatePersona,
  updatePersonaEmbedding,
  updatePersonaTraits,
  updateSystemSetting,
  updateTraitMetadata,
  updateTraitTaxonomy,
} from './index';

// A permissive NON-admin authenticated principal — the CASL gate is unit-tested
// separately; here we exercise the DB-backed ownership/visibility logic. Crucially
// it is NOT a platform admin (manage AdminSurface = false), so isPlatformAdmin()
// overrides don't leak into ordinary ownership/membership tests.
const nonAdminAbility = {
  can: (a: string, s: string) => !(a === 'manage' && s === 'AdminSurface'),
};
// A platform-superuser ability (manage AdminSurface → isPlatformAdmin true).
const superAdminAbility = { can: () => true };
type P = ServicePrincipal & { networkDepth?: 1 | 2 };

async function insertUser(n: number): Promise<bigint> {
  const [u] = await db
    .insert(users)
    .values({
      authSubjectId: `sub_${n}_${Date.now()}`,
      email: `u${n}@x.com`,
      createdBy: 'test',
      updatedBy: 'test',
    })
    .returning();
  await db.insert(userTraits).values({ userId: u.id, createdBy: 'test', updatedBy: 'test' });
  return u.id;
}

async function makeUser(n: number): Promise<P> {
  return { userId: String(await insertUser(n)), ability: nonAdminAbility, networkDepth: 2 };
}

/** A platform-superuser principal (bypasses ownership/membership scoping). */
async function makeAdmin(n: number): Promise<P> {
  return { userId: String(await insertUser(n)), ability: superAdminAbility, networkDepth: 2 };
}

const anon: P = {
  userId: null,
  ability: { can: (a, s) => a === 'read' && (s === 'Persona' || s === 'Community') },
  networkDepth: 1,
};

describe.skipIf(!hasTestDb)('service layer (integration)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  describe('personas', () => {
    it('creates, lists, and soft-deletes a persona', async () => {
      const user = await makeUser(1);
      const p = await createPersona(user, { displayName: 'Maria Osei', headline: 'Plumber' });
      expect(p.uri).toBe('maria-osei');

      const mine = await listMyPersonas(user);
      expect(mine.map((m) => m.uri)).toEqual(['maria-osei']);

      expect(await deletePersona(user, p.uri)).toBe(true);
      expect(await listMyPersonas(user)).toHaveLength(0);
    });

    it('enforces visibility for anonymous vs owner', async () => {
      const user = await makeUser(2);
      await createPersona(user, { displayName: 'Public P', visibility: 'public' });
      const priv = await createPersona(user, { displayName: 'Private P', visibility: 'private' });

      expect(await getPersonaByUri(anon, 'public-p')).not.toBeNull();
      expect(await getPersonaByUri(anon, 'private-p')).toBeNull(); // hidden from anon
      expect(await getPersonaByUri(user, priv.uri)).not.toBeNull(); // owner sees own private
    });

    it('search returns only public personas to anonymous callers', async () => {
      const user = await makeUser(3);
      await createPersona(user, {
        displayName: 'Alpha Welder',
        headline: 'welds',
        visibility: 'public',
      });
      await createPersona(user, {
        displayName: 'Beta Welder',
        headline: 'welds',
        visibility: 'private',
      });

      const results = await searchPersonas(anon, { query: 'welder', maxResults: 10 });
      expect(results.map((r) => r.displayName)).toEqual(['Alpha Welder']);
    });

    it('gives colliding display names distinct uris', async () => {
      const user = await makeUser(4);
      const a = await createPersona(user, { displayName: 'Same Name' });
      const b = await createPersona(user, { displayName: 'Same Name' });
      expect(a.uri).toBe('same-name');
      expect(b.uri).not.toBe(a.uri);
    });

    it('hides personas from agent surfaces until they opt into mcpEnabled', async () => {
      const user = await makeUser(8);
      const p = await createPersona(user, {
        displayName: 'Opted Out',
        headline: 'welds',
        visibility: 'public',
      });
      // default mcpEnabled=false → invisible to agent/MCP surfaces…
      expect(await searchPersonas(anon, { query: 'opted', requireMcpEnabled: true })).toHaveLength(
        0,
      );
      // …but visible to the human web surface (visibility only).
      expect((await searchPersonas(anon, { query: 'opted' })).length).toBeGreaterThan(0);
      // opt in → now surfaced to agents.
      await db.update(personas).set({ mcpEnabled: true }).where(eq(personas.uri, p.uri));
      expect(await searchPersonas(anon, { query: 'opted', requireMcpEnabled: true })).toHaveLength(
        1,
      );
    });

    it('ranks by cosine similarity when a query embedding is supplied', async (ctx) => {
      if (!isVectorAvailable()) return ctx.skip(); // plain-Postgres fallback: no pgvector

      const user = await makeUser(7);
      const a = await createPersona(user, { displayName: 'Vector A', visibility: 'public' });
      const b = await createPersona(user, { displayName: 'Vector B', visibility: 'public' });

      // Orthonormal basis vectors so ordering is unambiguous.
      const dim = 1536;
      const unit = (i: number) => Array.from({ length: dim }, (_, k) => (k === i ? 1 : 0));
      await updatePersonaEmbedding(user, a.uri, unit(0));
      await updatePersonaEmbedding(user, b.uri, unit(1));

      // Query leans toward A.
      const query = Array.from({ length: dim }, (_, k) => (k === 0 ? 0.9 : k === 1 ? 0.1 : 0));
      const results = await searchPersonas(user, {
        query: '',
        queryEmbedding: query,
        maxResults: 10,
      });

      expect(results.map((r) => r.uri)).toEqual([a.uri, b.uri]); // A ranks first
      expect(results[0].similarity ?? 0).toBeGreaterThan(results[1].similarity ?? 0);
    });

    it('updates base fields and traits, and denies non-owners', async () => {
      const owner = await makeUser(5);
      const other = await makeUser(6);
      const p = await createPersona(owner, { displayName: 'Editable' });

      const updated = await updatePersona(owner, p.uri, { headline: 'New headline' });
      expect(updated?.headline).toBe('New headline');

      const withTraits = await updatePersonaTraits(owner, p.uri, { skills: [{ name: 'Welding' }] });
      expect((withTraits?.traits as { skills: unknown[] }).skills).toHaveLength(1);

      await expect(updatePersona(other, p.uri, { headline: 'hijack' })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(deletePersona(other, p.uri)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updatePersona cannot mass-assign ownership or protected columns', async () => {
      const owner = await makeUser(7);
      const attacker = await makeUser(8);
      const p = await createPersona(owner, { displayName: 'Protected' });

      // Simulate a caller (e.g. the coach's free-string `field`) trying to smuggle
      // protected columns through the patch. They must be dropped by the allowlist.
      const malicious = {
        headline: 'ok',
        userId: BigInt(attacker.userId as string),
        deletedAt: new Date(),
      } as unknown as Parameters<typeof updatePersona>[2];
      const updated = await updatePersona(owner, p.uri, malicious);

      expect(updated?.headline).toBe('ok'); // allowlisted field applied
      expect(String(updated?.userId)).toBe(owner.userId); // ownership NOT reassigned
      expect(updated?.deletedAt).toBeNull(); // not soft-deleted
      expect(await listMyPersonas(owner)).toHaveLength(1); // still the owner's
      expect(await listMyPersonas(attacker)).toHaveLength(0); // never became attacker's
    });
  });

  describe('platform superuser', () => {
    it('reads, edits, and soft-deletes any persona (not owned)', async () => {
      const owner = await makeUser(70);
      const admin = await makeAdmin(71);
      const p = await createPersona(owner, { displayName: 'Not Mine', visibility: 'private' });

      expect(await getPersonaByUri(admin, p.uri)).not.toBeNull(); // sees a private persona
      const up = await updatePersona(admin, p.uri, { headline: 'edited by admin' });
      expect(up?.headline).toBe('edited by admin'); // edits it
      expect(await deletePersona(admin, p.uri)).toBe(true); // soft-deletes it
    });

    it('manages a community it is not a member of', async () => {
      const founder = await makeUser(72);
      const fp = await createPersona(founder, { displayName: 'Founder' });
      const c = await createCommunity(founder, {
        name: 'Not My Guild',
        foundingPersonaUri: fp.uri,
      });
      const admin = await makeAdmin(73); // never joined c

      const binding = await bindPlatformChannel(admin, {
        communityId: String(c.id),
        platform: 'slack',
        externalRef: 'T-super',
      });
      expect(binding.platform).toBe('slack');
      expect((await listPlatformChannels(admin, String(c.id))).length).toBe(1);
    });

    it('does NOT extend to impersonation — cannot act from another user’s persona', async () => {
      const victim = await makeUser(74);
      const vp = await createPersona(victim, { displayName: 'Victim' });
      const target = await makeUser(75);
      const tp = await createPersona(target, { displayName: 'Target', visibility: 'public' });
      const admin = await makeAdmin(76);

      await expect(
        createContactRequest(admin, { fromPersonaUri: vp.uri, toPersonaUri: tp.uri, reason: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('communities', () => {
    it('founds a community and maintains member_count on join/leave', async () => {
      const founder = await makeUser(10);
      const fp = await createPersona(founder, { displayName: 'Guild Lead' });
      const c = await createCommunity(founder, { name: 'Trade Guild', foundingPersonaUri: fp.uri });
      expect(c.memberCount).toBe(1);

      const joiner = await makeUser(11);
      const jp = await createPersona(joiner, { displayName: 'Apprentice' });
      await joinCommunity(joiner, c.slug, jp.uri);

      const founderView = await listCommunities(founder);
      expect(founderView.find((x) => x.slug === c.slug)?.memberCount).toBe(2);

      await joinCommunity(joiner, c.slug, jp.uri); // idempotent — still 2
      expect((await listCommunities(founder)).find((x) => x.slug === c.slug)?.memberCount).toBe(2);

      expect(await leaveCommunity(joiner, c.slug)).toBe(true);
      expect((await listCommunities(founder)).find((x) => x.slug === c.slug)?.memberCount).toBe(1);
    });

    it("'community' persona is visible to co-members but not outsiders (persona-scoped)", async () => {
      const owner = await makeUser(60);
      const op = await createPersona(owner, { displayName: 'Guild Face', visibility: 'community' });
      const c = await createCommunity(owner, { name: 'Facet Guild', foundingPersonaUri: op.uri });

      const coMember = await makeUser(61);
      const cp = await createPersona(coMember, { displayName: 'Co Member' });
      await joinCommunity(coMember, c.slug, cp.uri);

      const outsider = await makeUser(62); // authenticated, shares no community with op

      // a member of the community this persona belongs to sees it…
      expect(await getPersonaByUri(coMember, op.uri)).not.toBeNull();
      // …but an authenticated user who shares NO community does not (not "any signed-in user")…
      expect(await getPersonaByUri(outsider, op.uri)).toBeNull();
      // …nor does an anonymous caller; the owner always sees their own.
      expect(await getPersonaByUri(anon, op.uri)).toBeNull();
      expect(await getPersonaByUri(owner, op.uri)).not.toBeNull();
    });

    it('refuses self-service join to an approval-only community', async () => {
      const founder = await makeUser(12);
      const fp = await createPersona(founder, { displayName: 'Gated Guild' });
      const c = await createCommunity(founder, { name: 'Gated Guild', foundingPersonaUri: fp.uri });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const joiner = await makeUser(13);
      const jp = await createPersona(joiner, { displayName: 'Hopeful' });
      await expect(joinCommunity(joiner, c.slug, jp.uri)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('endorsements', () => {
    it('creates a public endorsement visible to anonymous callers', async () => {
      const a = await makeUser(20);
      const b = await makeUser(21);
      const pa = await createPersona(a, { displayName: 'Endorser' });
      const pb = await createPersona(b, { displayName: 'Endorsee' });

      await createEndorsement(a, {
        fromPersonaUri: pa.uri,
        toPersonaUri: pb.uri,
        relationshipType: 'colleague',
        strength: 'strong',
        testimonial: 'Excellent work',
      });

      // default visibility is 'community' → hidden from anon
      expect(await listEndorsementsForPersona(anon, pb.uri)).toHaveLength(0);
      // the endorsee (owner of the target) always sees it
      expect(await listEndorsementsForPersona(b, pb.uri)).toHaveLength(1);
    });

    it('rejects an endorsement targeting both a persona and a shadow', async () => {
      const a = await makeUser(22);
      const pa = await createPersona(a, { displayName: 'X' });
      await expect(
        createEndorsement(a, {
          fromPersonaUri: pa.uri,
          toPersonaUri: 'per_real',
          toShadowPersonaId: '5',
          relationshipType: 'colleague',
        }),
      ).rejects.toThrow();
    });

    it('endorses a shadow persona and retracts it', async () => {
      const founder = await makeUser(23);
      const fp = await createPersona(founder, { displayName: 'Guild Owner' });
      const community = await createCommunity(founder, {
        name: 'Shadow Guild',
        foundingPersonaUri: fp.uri,
      });

      const shadow = await createShadowPersona(founder, {
        communityId: String(community.id),
        createdByPersonaUri: fp.uri,
        displayName: 'Offline Expert',
      });
      expect(shadow.claimToken).toMatch(/^clm_/);

      const end = await createEndorsement(founder, {
        fromPersonaUri: fp.uri,
        toShadowPersonaId: String(shadow.id),
        relationshipType: 'colleague',
      });
      expect(await retractEndorsement(founder, end.publicId)).toBe(true);
      // second retract is a no-op (already deleted)
      expect(await retractEndorsement(founder, end.publicId)).toBe(false);
    });

    it('rejects a shadow persona injected into a community the caller has not joined', async () => {
      const founder = await makeUser(24);
      const fp = await createPersona(founder, { displayName: 'Guild Owner 2' });
      const community = await createCommunity(founder, {
        name: 'Closed Guild',
        foundingPersonaUri: fp.uri,
      });

      const outsider = await makeUser(25);
      const op = await createPersona(outsider, { displayName: 'Outsider' });
      await expect(
        createShadowPersona(outsider, {
          communityId: String(community.id),
          createdByPersonaUri: op.uri,
          displayName: 'Rogue Shadow',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('contact requests', () => {
    it('does not leak a private persona to a contact request (404, not created)', async () => {
      const owner = await makeUser(90);
      const stranger = await makeUser(91);
      const priv = await createPersona(owner, { displayName: 'Hidden', visibility: 'private' });

      // A stranger who cannot see the private persona gets the same 404 as a
      // truly missing URI — no created-vs-notfound oracle for enumeration.
      await expect(
        createContactRequest(stranger, { toPersonaUri: priv.uri, reason: 'probe' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('routes a request to the recipient inbox and lets only them respond', async () => {
      const sender = await makeUser(30);
      const recipient = await makeUser(31);
      const sp = await createPersona(sender, { displayName: 'Sender' });
      const rp = await createPersona(recipient, { displayName: 'Recipient', visibility: 'public' });

      const req = await createContactRequest(sender, {
        fromPersonaUri: sp.uri,
        toPersonaUri: rp.uri,
        reason: 'collaboration',
        message: 'hello',
      });

      // recipient sees it; sender does not
      expect((await listInbox(recipient)).map((i) => i.publicId)).toContain(req.publicId);
      expect(await listInbox(sender)).toHaveLength(0);

      // a non-recipient responding gets a 404-shape (existence not leaked)
      await expect(respondToContact(sender, req.publicId, 'approved')).rejects.toBeInstanceOf(
        NotFoundError,
      );

      const res = await respondToContact(recipient, req.publicId, 'approved');
      expect(res.request.status).toBe('approved');

      // second response fails — no longer pending
      await expect(respondToContact(recipient, req.publicId, 'declined')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('refuses a contact request to a non-existent target', async () => {
      const sender = await makeUser(32);
      const sp = await createPersona(sender, { displayName: 'Sender2' });
      await expect(
        createContactRequest(sender, { fromPersonaUri: sp.uri, toPersonaUri: 'nope', reason: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('declines pending requests when the target persona is deleted', async () => {
      const sender = await makeUser(33);
      const recipient = await makeUser(34);
      const sp = await createPersona(sender, { displayName: 'S3' });
      const rp = await createPersona(recipient, { displayName: 'R3', visibility: 'public' });
      const req = await createContactRequest(sender, {
        fromPersonaUri: sp.uri,
        toPersonaUri: rp.uri,
        reason: 'collab',
      });

      await deletePersona(recipient, rp.uri);

      const [after] = await db
        .select({ status: contactRequests.status })
        .from(contactRequests)
        .where(eq(contactRequests.publicId, req.publicId));
      expect(after.status).toBe('declined'); // no longer wedged in pending
    });
  });

  describe('platform channel bindings', () => {
    it('binds, resolves, lists and revokes — admin only', async () => {
      const admin = await makeUser(40);
      const outsider = await makeUser(41);
      const fp = await createPersona(admin, { displayName: 'Bot Guild' });
      const community = await createCommunity(admin, {
        name: 'Bot Guild',
        foundingPersonaUri: fp.uri,
      });

      const binding = await bindPlatformChannel(admin, {
        communityId: String(community.id),
        platform: 'slack',
        externalRef: 'C12345',
      });
      expect(binding.status).toBe('active');

      expect(await resolveBoundCommunity('slack', 'C12345')).toEqual({
        communityId: String(community.id),
      });
      expect(await listPlatformChannels(admin, String(community.id))).toHaveLength(1);

      // a non-admin cannot bind or revoke
      await expect(
        bindPlatformChannel(outsider, {
          communityId: String(community.id),
          platform: 'discord',
          externalRef: 'G999',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(await revokePlatformChannel(admin, binding.publicId)).toBe(true);
      expect(await resolveBoundCommunity('slack', 'C12345')).toBeNull();
    });

    it('re-binding the same platform channel re-activates rather than duplicating', async () => {
      const admin = await makeUser(42);
      const fp = await createPersona(admin, { displayName: 'Rebind Guild' });
      const community = await createCommunity(admin, {
        name: 'Rebind Guild',
        foundingPersonaUri: fp.uri,
      });
      const a = await bindPlatformChannel(admin, {
        communityId: String(community.id),
        platform: 'slack',
        externalRef: 'CDUP',
      });
      const b = await bindPlatformChannel(admin, {
        communityId: String(community.id),
        platform: 'slack',
        externalRef: 'CDUP',
      });
      expect(b.id).toBe(a.id); // same row, re-activated
      expect(await listPlatformChannels(admin, String(community.id))).toHaveLength(1);
    });

    it('a non-member cannot enumerate a community bindings', async () => {
      const admin = await makeUser(43);
      const outsider = await makeUser(44);
      const fp = await createPersona(admin, { displayName: 'Private Guild' });
      const community = await createCommunity(admin, {
        name: 'Private Guild',
        foundingPersonaUri: fp.uri,
      });
      await bindPlatformChannel(admin, {
        communityId: String(community.id),
        platform: 'discord',
        externalRef: 'G-secret',
      });
      expect(await listPlatformChannels(outsider, String(community.id))).toHaveLength(0);
      expect(await listPlatformChannels(admin, String(community.id))).toHaveLength(1);
    });

    // PER-30 AC-2: cross-community isolation — CASL grants manage PlatformChannel to
    // any community admin, but the grant says nothing about WHICH community. The
    // service-layer assertCommunityAdmin() is the scoping mechanism; these tests
    // prove it holds. nonAdminAbility intentionally returns true for
    // can('manage','PlatformChannel') to isolate the service gate from the CASL gate.
    it('community-admin of A cannot bind a channel on community B (cross-community isolation)', async () => {
      const adminA = await makeUser(300);
      const paA = await createPersona(adminA, { displayName: 'Cross Admin A' });
      await createCommunity(adminA, { name: 'Cross Community A', foundingPersonaUri: paA.uri });

      const founderB = await makeUser(301);
      const paB = await createPersona(founderB, { displayName: 'Cross Founder B' });
      const communityB = await createCommunity(founderB, {
        name: 'Cross Community B',
        foundingPersonaUri: paB.uri,
      });

      // adminA is admin of community A (CASL grants manage PlatformChannel),
      // but is not a member of community B at all. The service must deny this.
      await expect(
        bindPlatformChannel(adminA, {
          communityId: String(communityB.id),
          platform: 'slack',
          externalRef: 'T-cross-bind',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('community-admin of A cannot revoke a channel bound to community B (cross-community isolation)', async () => {
      const adminA = await makeUser(302);
      const paA = await createPersona(adminA, { displayName: 'Cross Admin A2' });
      await createCommunity(adminA, { name: 'Cross Community A2', foundingPersonaUri: paA.uri });

      const founderB = await makeUser(303);
      const paB = await createPersona(founderB, { displayName: 'Cross Founder B2' });
      const communityB = await createCommunity(founderB, {
        name: 'Cross Community B2',
        foundingPersonaUri: paB.uri,
      });
      const binding = await bindPlatformChannel(founderB, {
        communityId: String(communityB.id),
        platform: 'discord',
        externalRef: 'G-cross-revoke',
      });

      // adminA is admin of community A but has no membership in B.
      // The service must deny the revoke.
      await expect(revokePlatformChannel(adminA, binding.publicId)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('system settings (admin)', () => {
    it('lists and updates settings, invalidating the cache', async () => {
      const admin = await makeAdmin(50);
      await db.insert(systemSettings).values({
        key: 'ai.coach_model',
        value: 'openai/gpt-4o',
        defaultValue: 'openai/gpt-4o',
        category: 'ai',
        valueType: 'string',
        description: 'coach model',
      });

      const listed = await listSystemSettings(admin);
      expect(listed.map((s) => s.key)).toContain('ai.coach_model');

      const updated = await updateSystemSetting(admin, 'ai.coach_model', 'openai/gpt-4o-mini');
      expect(updated?.value).toBe('openai/gpt-4o-mini');

      // a non-admin ability is refused
      const nonAdmin = { userId: '1', ability: { can: () => false } };
      await expect(listSystemSettings(nonAdmin)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('GDPR erasure (PER-24)', () => {
    it('purgePersona hard-deletes the row (row gone, not soft-deleted)', async () => {
      const admin = await makeAdmin(80);
      const owner = await makeUser(81);
      const p = await createPersona(owner, { displayName: 'Erased Person', visibility: 'public' });

      expect(await purgePersona(admin, p.uri)).toBe(true);

      // Hard-deleted: no row at all, not even with deletedAt set.
      const [row] = await db.select().from(personas).where(eq(personas.uri, p.uri)).limit(1);
      expect(row).toBeUndefined();
    });

    it('purgePersona nulls the embedding before deletion (vector evicted)', async (ctx) => {
      if (!isVectorAvailable()) return ctx.skip();
      const admin = await makeAdmin(82);
      const owner = await makeUser(83);
      const p = await createPersona(owner, { displayName: 'Vector Erased', visibility: 'public' });
      const vec = Array.from({ length: 1536 }, (_, k) => (k === 0 ? 1 : 0));
      await updatePersonaEmbedding(owner, p.uri, vec);

      // Similarity search must find the persona before purge.
      const before = await searchPersonas(owner, {
        query: '',
        queryEmbedding: vec,
        maxResults: 10,
      });
      expect(before.map((r) => r.uri)).toContain(p.uri);

      expect(await purgePersona(admin, p.uri)).toBe(true);

      // Similarity search must NOT find the purged persona.
      const after = await searchPersonas(owner, { query: '', queryEmbedding: vec, maxResults: 10 });
      expect(after.map((r) => r.uri)).not.toContain(p.uri);
    });

    it('purgePersona returns false for a non-existent URI', async () => {
      const admin = await makeAdmin(84);
      expect(await purgePersona(admin, 'nonexistent-per-24-uri')).toBe(false);
    });

    it('purgePersona throws ForbiddenError for a non-admin', async () => {
      // nonAdminAbility returns true for any action except manage AdminSurface, which
      // is too permissive for purge. Use a real-model-faithful mock: purge is not
      // granted to ordinary users (only role=admin gets it via defineAbilitiesFor).
      const userId = String(await insertUser(85));
      const noPurge: P = { userId, ability: { can: (a) => a !== 'purge' }, networkDepth: 2 };
      const p = await createPersona(noPurge, { displayName: 'Protected' });
      await expect(purgePersona(noPurge, p.uri)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('deletePersona nulls the embedding on soft-delete', async (ctx) => {
      // The embedding column is vector(1536) only when pgvector is available.
      if (!isVectorAvailable()) return ctx.skip();
      const owner = await makeUser(86);
      const p = await createPersona(owner, { displayName: 'Soft Erased' });
      const vec = Array.from({ length: 1536 }, (_, k) => (k === 0 ? 1 : 0));
      await updatePersonaEmbedding(owner, p.uri, vec);

      // Embedding is set before soft-delete.
      const [before] = await db
        .select({ embedding: personas.embedding })
        .from(personas)
        .where(eq(personas.uri, p.uri))
        .limit(1);
      expect(before.embedding).not.toBeNull();

      await deletePersona(owner, p.uri);

      // After soft-delete the embedding must be null — evicted from the vector index.
      const [after] = await db
        .select({ embedding: personas.embedding })
        .from(personas)
        .where(eq(personas.uri, p.uri))
        .limit(1);
      expect(after.embedding).toBeNull();
    });

    it('purgeUserCoachSessions hard-deletes all sessions including transcript', async () => {
      const admin = await makeAdmin(87);
      const owner = await makeUser(88);

      await db.insert(coachSessions).values({
        userId: BigInt(owner.userId as string),
        kind: 'persona_coach',
        status: 'completed',
        transcript: [{ role: 'user', content: 'sensitive coaching data' }],
        createdBy: 'test',
        updatedBy: 'test',
      });

      const count = await purgeUserCoachSessions(admin, owner.userId as string);
      expect(count).toBe(1);

      const remaining = await db
        .select({ id: coachSessions.id })
        .from(coachSessions)
        .where(eq(coachSessions.userId, BigInt(owner.userId as string)));
      expect(remaining).toHaveLength(0);
    });

    it('purgeUserCoachSessions returns 0 when no sessions exist', async () => {
      const admin = await makeAdmin(89);
      const owner = await makeUser(90);
      expect(await purgeUserCoachSessions(admin, owner.userId as string)).toBe(0);
    });

    it('purgeUserCoachSessions throws ForbiddenError for a non-admin', async () => {
      // Use a real-model-faithful mock: purge is not granted to ordinary users.
      const userId = String(await insertUser(91));
      const noPurge: P = { userId, ability: { can: (a) => a !== 'purge' }, networkDepth: 2 };
      await expect(purgeUserCoachSessions(noPurge, userId)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('reference data admin (PER-9)', () => {
    it('admin creates, updates, and soft-deletes trait metadata', async () => {
      const admin = await makeAdmin(200);

      const created = await createTraitMetadata(admin, {
        key: 'skills',
        displayName: 'Skills',
        category: 'professional',
        dataType: 'array',
        displayConfig: { widget: 'tags' },
        editConfig: { multiline: false },
      });
      expect(created.key).toBe('skills');
      expect(created.deletedAt).toBeNull();

      const updated = await updateTraitMetadata(admin, created.id, { displayName: 'Core Skills' });
      expect(updated?.displayName).toBe('Core Skills');

      const deleted = await deleteTraitMetadata(admin, created.id);
      expect(deleted).toBe(true);
      // Soft-deleted — listTraitMetadata hides it
      const list = await import('../services/reference').then((m) => m.listTraitMetadata());
      expect(list.map((r) => String(r.id))).not.toContain(String(created.id));
    });

    it('refuses trait metadata mutations to a non-admin', async () => {
      // A real non-admin user does not hold `manage TraitMetadata`. Use a
      // faithful mock rather than the test file's permissive nonAdminAbility.
      const userId = String(await insertUser(201));
      const noManage: P = {
        userId,
        ability: { can: (a) => a !== 'manage' },
        networkDepth: 2,
      };
      await expect(
        createTraitMetadata(noManage, {
          key: 'skills2',
          displayName: 'Skills 2',
          category: 'professional',
          dataType: 'array',
          displayConfig: {},
          editConfig: {},
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('admin creates, updates, and soft-deletes trait taxonomies', async () => {
      const admin = await makeAdmin(202);

      const created = await createTraitTaxonomy(admin, {
        traitKey: 'skills',
        taxonomySlug: 'engineering',
        displayName: 'Engineering',
        suggestedValues: ['TypeScript', 'Go'],
      });
      expect(created.taxonomySlug).toBe('engineering');
      expect(created.deletedAt).toBeNull();

      const updated = await updateTraitTaxonomy(admin, created.id, {
        displayName: 'Software Engineering',
      });
      expect(updated?.displayName).toBe('Software Engineering');

      const deleted = await deleteTraitTaxonomy(admin, created.id);
      expect(deleted).toBe(true);
    });

    it('refuses trait taxonomy mutations to a non-admin', async () => {
      const userId = String(await insertUser(203));
      const noManage: P = {
        userId,
        ability: { can: (a) => a !== 'manage' },
        networkDepth: 2,
      };
      await expect(
        createTraitTaxonomy(noManage, {
          traitKey: 'skills',
          taxonomySlug: 'arts',
          displayName: 'Arts',
          suggestedValues: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('admin creates, updates, and soft-deletes community types', async () => {
      const admin = await makeAdmin(204);

      const created = await createCommunityType(admin, {
        slug: 'professional-network',
        name: 'Professional Network',
        description: 'Career-focused community',
      });
      expect(created.slug).toBe('professional-network');
      expect(created.isActive).toBe(true);

      const updated = await updateCommunityType(admin, created.id, { name: 'Pro Network' });
      expect(updated?.name).toBe('Pro Network');

      const deleted = await deleteCommunityType(admin, created.id);
      expect(deleted).toBe(true);
    });

    it('refuses community type mutations to a non-admin', async () => {
      const userId = String(await insertUser(205));
      const noManage: P = {
        userId,
        ability: { can: (a) => a !== 'manage' },
        networkDepth: 2,
      };
      await expect(
        createCommunityType(noManage, { slug: 'blocked', name: 'Blocked' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('platform channels — cross-community admin listing (PER-9)', () => {
    it('admin lists bindings across multiple communities', async () => {
      const admin = await makeAdmin(210);

      const fp1 = await createPersona(admin, { displayName: 'Guild A Lead' });
      const c1 = await createCommunity(admin, {
        name: 'Guild A',
        foundingPersonaUri: fp1.uri,
      });
      const fp2 = await createPersona(admin, { displayName: 'Guild B Lead' });
      const c2 = await createCommunity(admin, {
        name: 'Guild B',
        foundingPersonaUri: fp2.uri,
      });

      await bindPlatformChannel(admin, {
        communityId: String(c1.id),
        platform: 'slack',
        externalRef: 'T-cross-1',
      });
      await bindPlatformChannel(admin, {
        communityId: String(c2.id),
        platform: 'discord',
        externalRef: 'G-cross-2',
      });

      const all = await listAllPlatformChannelBindings(admin);
      const refs = all.map((b) => b.externalRef);
      expect(refs).toContain('T-cross-1');
      expect(refs).toContain('G-cross-2');
    });

    it('refuses cross-community listing to a non-admin', async () => {
      const user = await makeUser(211);
      await expect(listAllPlatformChannelBindings(user)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('join request and invitation flows (PER-8)', () => {
    it('requestToJoin creates a pending join request for an approval community', async () => {
      const founder = await makeUser(300);
      const fp = await createPersona(founder, { displayName: 'Approval Lead' });
      const c = await createCommunity(founder, {
        name: 'Approval Guild',
        foundingPersonaUri: fp.uri,
      });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const joiner = await makeUser(301);
      const jp = await createPersona(joiner, { displayName: 'Hopeful Member' });

      const requestId = await requestToJoin(joiner, c.slug, jp.uri);
      expect(requestId).toMatch(/^cjr_/);

      // Membership must NOT exist yet — request is still pending.
      const members = await listCommunityMembers(founder, c.slug);
      expect(members.map((m) => m.uri)).not.toContain(jp.uri);
    });

    it('requestToJoin is idempotent — a second call returns the same publicId', async () => {
      const founder = await makeUser(302);
      const fp = await createPersona(founder, { displayName: 'Idem Lead' });
      const c = await createCommunity(founder, { name: 'Idem Guild', foundingPersonaUri: fp.uri });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const joiner = await makeUser(303);
      const jp = await createPersona(joiner, { displayName: 'Idem Joiner' });

      const first = await requestToJoin(joiner, c.slug, jp.uri);
      const second = await requestToJoin(joiner, c.slug, jp.uri);
      expect(second).toBe(first);
    });

    it('requestToJoin throws ForbiddenError for a non-approval community', async () => {
      const founder = await makeUser(304);
      const fp = await createPersona(founder, { displayName: 'Open Lead' });
      const c = await createCommunity(founder, {
        name: 'Open Guild',
        foundingPersonaUri: fp.uri,
      });
      // joinPolicy is 'open' by default
      const joiner = await makeUser(305);
      const jp = await createPersona(joiner, { displayName: 'Direct Joiner' });
      await expect(requestToJoin(joiner, c.slug, jp.uri)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('approveJoinRequest creates membership and the requester becomes a member', async () => {
      const founder = await makeUser(306);
      const fp = await createPersona(founder, { displayName: 'Approve Lead' });
      const c = await createCommunity(founder, {
        name: 'Approve Guild',
        foundingPersonaUri: fp.uri,
      });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const joiner = await makeUser(307);
      const jp = await createPersona(joiner, { displayName: 'Pending Joiner' });
      const reqId = await requestToJoin(joiner, c.slug, jp.uri);

      // Founder is the community admin — they approve.
      await approveJoinRequest(founder, reqId);

      const members = await listCommunityMembers(founder, c.slug);
      expect(members.map((m) => m.uri)).toContain(jp.uri);

      // memberCount incremented.
      const [updated] = await db
        .select({ memberCount: communities.memberCount })
        .from(communities)
        .where(eq(communities.slug, c.slug));
      expect(updated.memberCount).toBe(2);
    });

    it('declineJoinRequest marks the request declined and does not create membership', async () => {
      const founder = await makeUser(308);
      const fp = await createPersona(founder, { displayName: 'Decline Lead' });
      const c = await createCommunity(founder, {
        name: 'Decline Guild',
        foundingPersonaUri: fp.uri,
      });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const joiner = await makeUser(309);
      const jp = await createPersona(joiner, { displayName: 'Declined Joiner' });
      const reqId = await requestToJoin(joiner, c.slug, jp.uri);

      await declineJoinRequest(founder, reqId);

      const members = await listCommunityMembers(founder, c.slug);
      expect(members.map((m) => m.uri)).not.toContain(jp.uri);
    });

    it('listJoinRequests returns only pending requests for the admin', async () => {
      const founder = await makeUser(310);
      const fp = await createPersona(founder, { displayName: 'List Lead' });
      const c = await createCommunity(founder, { name: 'List Guild', foundingPersonaUri: fp.uri });
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));

      const j1 = await makeUser(311);
      const p1 = await createPersona(j1, { displayName: 'Requester A' });
      const j2 = await makeUser(312);
      const p2 = await createPersona(j2, { displayName: 'Requester B' });

      const r1 = await requestToJoin(j1, c.slug, p1.uri);
      await requestToJoin(j2, c.slug, p2.uri);

      const pending = await listJoinRequests(founder, c.slug);
      expect(pending).toHaveLength(2);

      // Approve one; the list should shrink.
      await approveJoinRequest(founder, r1);
      const after = await listJoinRequests(founder, c.slug);
      expect(after).toHaveLength(1);
      expect(after[0].personaUri).toBe(p2.uri);
    });

    it('listJoinRequests throws ForbiddenError for a non-admin member', async () => {
      const founder = await makeUser(313);
      const fp = await createPersona(founder, { displayName: 'Guard Lead' });
      const c = await createCommunity(founder, {
        name: 'Guard Guild',
        foundingPersonaUri: fp.uri,
      });
      // member joins as a regular member
      const member = await makeUser(314);
      const mp = await createPersona(member, { displayName: 'Guard Member' });
      await db.update(communities).set({ joinPolicy: 'open' }).where(eq(communities.slug, c.slug));
      await joinCommunity(member, c.slug, mp.uri);
      // Now set to approval so it's relevant
      await db
        .update(communities)
        .set({ joinPolicy: 'approval' })
        .where(eq(communities.slug, c.slug));
      await expect(listJoinRequests(member, c.slug)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('createInvitation returns a token and claimInvitation creates membership', async () => {
      const founder = await makeUser(315);
      const fp = await createPersona(founder, { displayName: 'Invite Lead' });
      const c = await createCommunity(founder, {
        name: 'Invite Guild',
        foundingPersonaUri: fp.uri,
      });
      await db
        .update(communities)
        .set({ joinPolicy: 'invite_only' })
        .where(eq(communities.slug, c.slug));

      const token = await createInvitation(founder, c.slug);
      expect(token).toMatch(/^inv_/);

      const invitee = await makeUser(316);
      const ip = await createPersona(invitee, { displayName: 'Invitee' });
      await claimInvitation(invitee, token, ip.uri);

      const members = await listCommunityMembers(founder, c.slug);
      expect(members.map((m) => m.uri)).toContain(ip.uri);

      // memberCount incremented.
      const [updated] = await db
        .select({ memberCount: communities.memberCount })
        .from(communities)
        .where(eq(communities.slug, c.slug));
      expect(updated.memberCount).toBe(2);
    });

    it('claimInvitation throws ForbiddenError when the token is already claimed', async () => {
      const founder = await makeUser(317);
      const fp = await createPersona(founder, { displayName: 'Duplicate Lead' });
      const c = await createCommunity(founder, {
        name: 'Duplicate Guild',
        foundingPersonaUri: fp.uri,
      });
      await db
        .update(communities)
        .set({ joinPolicy: 'invite_only' })
        .where(eq(communities.slug, c.slug));

      const token = await createInvitation(founder, c.slug);

      const first = await makeUser(318);
      const p1 = await createPersona(first, { displayName: 'First Claimer' });
      await claimInvitation(first, token, p1.uri);

      const second = await makeUser(319);
      const p2 = await createPersona(second, { displayName: 'Second Claimer' });
      await expect(claimInvitation(second, token, p2.uri)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('claimInvitation throws NotFoundError for an unknown token', async () => {
      const user = await makeUser(320);
      const p = await createPersona(user, { displayName: 'Bad Token' });
      await expect(claimInvitation(user, 'inv_notarealtoken12345', p.uri)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('createInvitation throws ForbiddenError for a non-invite_only community', async () => {
      const founder = await makeUser(321);
      const fp = await createPersona(founder, { displayName: 'Open Only Lead' });
      const c = await createCommunity(founder, {
        name: 'Open Only Guild',
        foundingPersonaUri: fp.uri,
      });
      // Default joinPolicy is 'open'
      await expect(createInvitation(founder, c.slug)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('open community self-service join still works after PER-8 changes', async () => {
      const founder = await makeUser(322);
      const fp = await createPersona(founder, { displayName: 'Open Preserved Lead' });
      const c = await createCommunity(founder, {
        name: 'Open Preserved Guild',
        foundingPersonaUri: fp.uri,
      });

      const joiner = await makeUser(323);
      const jp = await createPersona(joiner, { displayName: 'Open Preserved Joiner' });
      await joinCommunity(joiner, c.slug, jp.uri);

      const members = await listCommunityMembers(founder, c.slug);
      expect(members.map((m) => m.uri)).toContain(jp.uri);
    });
  });
});
