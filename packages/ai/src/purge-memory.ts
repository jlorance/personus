/**
 * Mastra agent memory erasure (PER-31).
 *
 * Memory threads are keyed by `resourceId = principal.userId` in whatever
 * external store the agent is configured with. A GDPR erasure request must
 * clear all threads for the user so conversational history cannot outlive
 * the account.
 *
 * Primitive verified against @mastra/core 1.51.0:
 *   MastraMemory.listThreads({ filter: { resourceId } }) → { threads[] }
 *   MastraMemory.deleteThread(threadId)                  → void
 *
 * Agents that have no memory configured (hasOwnMemory() === false) are
 * skipped — currently all three agents fall into this category, so
 * purgeAgentMemory() returns 0 safely. When memory is added to an agent,
 * this function picks it up automatically (no change required here).
 */

import type { MastraMemory } from '@mastra/core/memory';
import { mastra } from './index';
import { AGENT_IDS } from './principal-context';

/**
 * Erase all Mastra memory threads keyed to `userId` across every registered
 * agent. Returns the total number of threads deleted.
 */
export async function purgeAgentMemory(userId: string): Promise<number> {
  const memories = await resolveAgentMemories();
  return purgeMemoryInstances(memories, userId);
}

/**
 * Inner: delete every thread for `userId` in the given memory instances.
 * Exported separately so tests can inject a MockMemory without touching the
 * live Mastra singleton.
 */
export async function purgeMemoryInstances(
  memories: MastraMemory[],
  userId: string,
): Promise<number> {
  let total = 0;
  for (const memory of memories) {
    // perPage: false — fetch all threads in a single page so we cannot
    // silently miss threads on subsequent pages.
    const { threads } = await memory.listThreads({
      filter: { resourceId: userId },
      perPage: false,
    });
    for (const thread of threads) {
      await memory.deleteThread(thread.id);
      total++;
    }
  }
  return total;
}

/** Resolve unique memory instances for all registered agents. */
async function resolveAgentMemories(): Promise<MastraMemory[]> {
  const seen = new Set<MastraMemory>();
  for (const agentId of AGENT_IDS) {
    const agent = mastra.getAgent(agentId);
    if (!agent.hasOwnMemory()) continue;
    const memory = await agent.getMemory();
    if (memory && !seen.has(memory)) seen.add(memory);
  }
  return [...seen];
}
