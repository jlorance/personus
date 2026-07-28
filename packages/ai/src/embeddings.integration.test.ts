/**
 * Integration tests for refreshPersonaEmbedding — run against a real Postgres
 * (pgvector) when TEST_DATABASE_URL is set; skipped otherwise. These verify
 * that the re-embedding path writes the vector to the database and is fail-soft
 * when the persona doesn't exist.
 *
 * Uses the same DB harness as packages/db integration tests so both suites
 * share the provisioned database.
 */

import { db } from '@personus/db';
import { eq } from '@personus/db/orm';
import { personas, users, userTraits } from '@personus/db/schema';
import { createPersona, type ServicePrincipal, updatePersonaTraits } from '@personus/db/services';
import {
  hasTestDb,
  isVectorAvailable,
  resetTables,
  setupTestDb,
  teardownTestDb,
} from '@personus/db/test';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EMBEDDING_RELEVANT_FIELDS, refreshPersonaEmbedding } from './embeddings';

const nonAdminAbility = {
  can: (a: string, s: string) => !(a === 'manage' && s === 'AdminSurface'),
};
type P = ServicePrincipal & { networkDepth?: 1 | 2 };

async function insertUser(n: number): Promise<bigint> {
  const [u] = await db
    .insert(users)
    .values({
      authSubjectId: `sub_emb_${n}_${Date.now()}`,
      email: `emb${n}@test.com`,
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

describe.skipIf(!hasTestDb)('refreshPersonaEmbedding (integration)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  it('writes the embedding vector to the database after a traits update', async (ctx) => {
    // The embedding column is vector(1536) only when pgvector is available.
    if (!isVectorAvailable()) return ctx.skip();

    const user = await makeUser(1);
    const p = await createPersona(user, {
      displayName: 'Refreshable',
      headline: 'Needs re-embedding',
      visibility: 'public',
    });

    // Initially the embedding is null.
    const [before] = await db
      .select({ embedding: personas.embedding })
      .from(personas)
      .where(eq(personas.uri, p.uri))
      .limit(1);
    expect(before.embedding).toBeNull();

    // Update traits — this is the trigger the issue asks to cover.
    await updatePersonaTraits(user, p.uri, { skills: [{ name: 'Testing' }] });

    // Inject a deterministic fake embedder so we don't need OPENAI_API_KEY in CI.
    const fakeVec = Array.from({ length: 1536 }, (_, k) => (k === 0 ? 1.0 : 0));
    await refreshPersonaEmbedding(p.uri, { _embed: async () => fakeVec });

    // The embedding column must now be populated.
    const [after] = await db
      .select({ embedding: personas.embedding })
      .from(personas)
      .where(eq(personas.uri, p.uri))
      .limit(1);
    expect(after.embedding).not.toBeNull();
    expect(Array.isArray(after.embedding)).toBe(true);
    expect((after.embedding as number[]).length).toBe(1536);
  });

  it('skips without error when the persona does not exist', async () => {
    // refreshPersonaEmbedding is fail-soft; a missing URI should resolve cleanly.
    await expect(
      refreshPersonaEmbedding('nonexistent-per10-uri', { _embed: async () => [1, 2, 3] }),
    ).resolves.toBeUndefined();
  });

  it('skips without error when the embedder returns null', async () => {
    // Mirrors the fail-soft path when OPENAI_API_KEY is absent in production.
    const user = await makeUser(2);
    const p = await createPersona(user, {
      displayName: 'NullEmbed',
      headline: 'Test',
      visibility: 'public',
    });

    await expect(
      refreshPersonaEmbedding(p.uri, { _embed: async () => null }),
    ).resolves.toBeUndefined();

    // Embedding stays null after a null-returning embedder.
    const [row] = await db
      .select({ embedding: personas.embedding })
      .from(personas)
      .where(eq(personas.uri, p.uri))
      .limit(1);
    expect(row.embedding).toBeNull();
  });
});

describe('EMBEDDING_RELEVANT_FIELDS', () => {
  it('contains all fields that personaEmbeddingText draws from', () => {
    // These are the keys that feed into the embedding text (see personaEmbeddingText).
    for (const field of [
      'displayName',
      'headline',
      'location',
      'skills',
      'qualities',
      'values',
      'offerings',
      'seekingOpportunities',
    ]) {
      expect(EMBEDDING_RELEVANT_FIELDS.has(field), `${field} should be relevant`).toBe(true);
    }
  });

  it('excludes UI/layout fields that do not affect the embedding text', () => {
    for (const field of [
      'completenessScore',
      'layoutPreset',
      'theme',
      'mcpEnabled',
      'visibility',
    ]) {
      expect(EMBEDDING_RELEVANT_FIELDS.has(field), `${field} should NOT be relevant`).toBe(false);
    }
  });
});
