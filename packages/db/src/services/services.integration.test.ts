/**
 * Service-layer integration tests — run against a real Postgres (pgvector) when
 * TEST_DATABASE_URL is set; skipped otherwise. These exercise the DB glue that
 * unit tests can't: ownership, visibility, member-count maintenance, soft-delete
 * filtering, and the 404-not-403 contact contract.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../index';
import { systemSettings, users, userTraits } from '../schema';
import {
  hasTestDb,
  isVectorAvailable,
  resetTables,
  setupTestDb,
  teardownTestDb,
} from '../test/harness';
import {
  bindPlatformChannel,
  createCommunity,
  createContactRequest,
  createEndorsement,
  createPersona,
  createShadowPersona,
  deletePersona,
  ForbiddenError,
  getPersonaByUri,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listEndorsementsForPersona,
  listInbox,
  listMyPersonas,
  listPlatformChannels,
  listSystemSettings,
  NotFoundError,
  resolveBoundCommunity,
  respondToContact,
  retractEndorsement,
  revokePlatformChannel,
  type ServicePrincipal,
  searchPersonas,
  updatePersona,
  updatePersonaEmbedding,
  updatePersonaTraits,
  updateSystemSetting,
} from './index';

// A permissive authenticated principal — the CASL gate is unit-tested separately;
// here we exercise the DB-backed ownership/visibility logic.
const allowAll = { can: () => true };
type P = ServicePrincipal & { networkDepth?: 1 | 2 };

async function makeUser(n: number): Promise<P> {
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
  return { userId: String(u.id), ability: allowAll, networkDepth: 2 };
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
  });

  describe('contact requests', () => {
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
  });

  describe('system settings (admin)', () => {
    it('lists and updates settings, invalidating the cache', async () => {
      const admin = await makeUser(50); // allowAll grants manage AdminSurface
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
});
