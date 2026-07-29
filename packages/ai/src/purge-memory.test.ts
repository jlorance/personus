/**
 * Unit tests for purgeMemoryInstances (PER-31).
 *
 * These use MockMemory (in-process store, no network) to verify the erasure
 * primitive. The `purgeAgentMemory` convenience wrapper talks to the live
 * Mastra singleton; it isn't tested here because none of the current agents
 * configure memory (they'd all short-circuit to 0). The inner function is the
 * load-bearing logic.
 */

import { MockMemory } from '@mastra/core/memory';
import { beforeEach, describe, expect, it } from 'vitest';
import { purgeMemoryInstances } from './purge-memory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESOURCE_A = 'user-111';
const RESOURCE_B = 'user-222';

/**
 * Seed a memory instance with two threads for resourceA and one for resourceB.
 * Returns the created thread IDs so callers can assert deletion.
 */
async function seedMemory(memory: MockMemory): Promise<{ aIds: string[]; bId: string }> {
  const t1 = await memory.createThread({ resourceId: RESOURCE_A, title: 'Session 1' });
  const t2 = await memory.createThread({ resourceId: RESOURCE_A, title: 'Session 2' });
  const t3 = await memory.createThread({ resourceId: RESOURCE_B, title: 'Session 3' });
  return { aIds: [t1.id, t2.id], bId: t3.id };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('purgeMemoryInstances', () => {
  let memory: MockMemory;

  beforeEach(() => {
    memory = new MockMemory();
  });

  it('deletes all threads for the target user and returns the count', async () => {
    const { aIds } = await seedMemory(memory);

    const deleted = await purgeMemoryInstances([memory], RESOURCE_A);

    expect(deleted).toBe(aIds.length);

    // User A's threads are gone.
    const { threads: remaining } = await memory.listThreads({
      filter: { resourceId: RESOURCE_A },
    });
    expect(remaining).toHaveLength(0);
  });

  it('does not touch threads belonging to other users', async () => {
    await seedMemory(memory);

    await purgeMemoryInstances([memory], RESOURCE_A);

    // User B's thread is untouched.
    const { threads: bThreads } = await memory.listThreads({
      filter: { resourceId: RESOURCE_B },
    });
    expect(bThreads).toHaveLength(1);
  });

  it('returns 0 when the user has no threads', async () => {
    await seedMemory(memory);

    const deleted = await purgeMemoryInstances([memory], 'user-999');
    expect(deleted).toBe(0);
  });

  it('handles multiple memory instances and de-dupes deletion', async () => {
    const memory2 = new MockMemory();

    // Seed both instances with threads for RESOURCE_A.
    const t1 = await memory.createThread({ resourceId: RESOURCE_A, title: 'Mem1 Session' });
    const t2 = await memory2.createThread({ resourceId: RESOURCE_A, title: 'Mem2 Session' });

    const deleted = await purgeMemoryInstances([memory, memory2], RESOURCE_A);
    expect(deleted).toBe(2); // one from each instance

    // Both stores are empty for the user.
    const { threads: m1 } = await memory.listThreads({ filter: { resourceId: RESOURCE_A } });
    const { threads: m2 } = await memory2.listThreads({ filter: { resourceId: RESOURCE_A } });
    expect(m1).toHaveLength(0);
    expect(m2).toHaveLength(0);

    // Suppress unused warnings.
    void t1;
    void t2;
  });

  it('returns 0 when no memory instances are given', async () => {
    const deleted = await purgeMemoryInstances([], RESOURCE_A);
    expect(deleted).toBe(0);
  });
});
