/**
 * Atomicity seam — integration tests against a real Postgres.
 *
 * These are the regression guard for the non-atomic multi-write defect
 * (PER-22): four services issued dependent writes as separate awaits, so a
 * failure between them left permanently inconsistent state. `atomic()` is the
 * mechanism that fixes them, and this file proves the mechanism rolls back.
 *
 * Skipped without TEST_DATABASE_URL — see the harness for why that is loud.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { atomic } from './atomic';
import { db } from './index';
import { eq } from './orm';
import { users } from './schema';
import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from './test/harness';

describe.skipIf(!hasTestDb)('atomic()', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });
  beforeEach(async () => {
    await resetTables();
  });

  const row = (n: number) => ({
    authSubjectId: `atomic_sub_${n}`,
    email: `atomic${n}@x.com`,
    createdBy: 'test',
    updatedBy: 'test',
  });

  it('commits every statement when all succeed', async () => {
    await atomic((tx) => [tx.insert(users).values(row(1)), tx.insert(users).values(row(2))]);

    const found = await db.select().from(users);
    expect(found).toHaveLength(2);
  });

  it('rolls the first write back when a later one fails', async () => {
    // Second insert reuses authSubjectId #3 — a unique violation. Without
    // atomicity the first insert would survive; that is exactly the partial
    // state PER-22 describes.
    await expect(
      atomic((tx) => [
        tx.insert(users).values(row(3)),
        tx.insert(users).values({ ...row(4), authSubjectId: row(3).authSubjectId }),
      ]),
    ).rejects.toThrow();

    const found = await db.select().from(users);
    expect(found).toHaveLength(0);
  });

  it('leaves no partial state when the failure is in the last statement', async () => {
    await expect(
      atomic((tx) => [
        tx.insert(users).values(row(5)),
        tx.insert(users).values(row(6)),
        tx.insert(users).values({ ...row(7), authSubjectId: row(5).authSubjectId }),
      ]),
    ).rejects.toThrow();

    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('is a no-op for an empty statement list', async () => {
    await atomic(() => []);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('routes updates through the same guarantee', async () => {
    const [u] = await db.insert(users).values(row(8)).returning();

    await expect(
      atomic((tx) => [
        tx.update(users).set({ email: 'changed@x.com' }).where(eq(users.id, u.id)),
        tx.insert(users).values({ ...row(9), authSubjectId: row(8).authSubjectId }),
      ]),
    ).rejects.toThrow();

    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    expect(after.email).toBe(row(8).email);
  });
});
