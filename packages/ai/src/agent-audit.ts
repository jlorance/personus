/**
 * Agent tool-call audit — one `audit_log` row per tool invocation. Free-text
 * fields (messages, testimonials) are NEVER logged; only presence booleans.
 */

import type { Principal } from '@personus/auth/principal';
import { db } from '@personus/db';
import { auditLog } from '@personus/db/schema';
import { logger } from '@personus/logger';

export type AgentAuditReason = 'ok' | 'forbidden' | 'not-found' | 'tool-error';

/** Redact free-text values to presence booleans before persisting. */
function sanitize(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = typeof v === 'string' ? { present: v.length > 0 } : v;
  }
  return out;
}

export async function emitAgentAudit(args: {
  toolName: string;
  principal: Principal;
  outcome: 'allowed' | 'denied';
  reason: AgentAuditReason;
  params: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      kind: `agent.tool.call.${args.outcome}`,
      reasonCode: args.reason,
      createdBy: args.principal.actorId,
      metadata: {
        tool: args.toolName,
        delegatingUserId: args.principal.userId,
        params: sanitize(args.params),
      },
    });
  } catch (err) {
    // Auditing must never break a tool call — log and continue.
    logger.warn({ err: String(err), tool: args.toolName }, 'agent audit write failed');
  }
}
