/**
 * Shared audited tool-execution wrapper for Mastra agent tools.
 *
 * Reads the delegated Principal off the request context, runs the tool body,
 * and emits exactly one audit row (allowed/denied). Free-text is never logged
 * (see agent-audit). Returns the body's result, or `{ error }` on failure so
 * the model gets a clean, non-throwing signal.
 */

import { ForbiddenError } from '@personus/db/services';
import { type AgentAuditReason, emitAgentAudit } from './agent-audit';
import { getToolPrincipal } from './principal-context';

export async function runAuditedTool<R>(
  toolName: string,
  ctx: unknown,
  params: Record<string, unknown>,
  body: (principal: ReturnType<typeof getToolPrincipal>) => Promise<R>,
): Promise<R | { success: false; error: string }> {
  const principal = getToolPrincipal(ctx as never);
  let outcome: 'allowed' | 'denied' = 'allowed';
  let reason: AgentAuditReason = 'ok';
  let result: R | { success: false; error: string };
  try {
    result = await body(principal);
    if (result && typeof result === 'object' && 'error' in result) {
      outcome = 'denied';
      reason =
        (result as { error: string }).error === 'Persona not found' ? 'not-found' : 'tool-error';
    }
  } catch (err) {
    outcome = 'denied';
    reason = err instanceof ForbiddenError ? 'forbidden' : 'tool-error';
    result = { success: false as const, error: 'Tool execution failed' };
  }
  await emitAgentAudit({ toolName, principal, outcome, reason, params });
  return result;
}
