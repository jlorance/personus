/**
 * Mastra RequestContext threading for the delegated Principal.
 *
 * Every agent.generate()/stream() call must carry a RequestContext holding the
 * delegated-agent Principal; tools read it via getToolPrincipal(). The Principal
 * is NEVER placed in the system prompt — the LLM must not see or manipulate
 * identity.
 */

import { RequestContext } from '@mastra/core/request-context';
import { asAgent, getDevPrincipal, type Principal } from '@personus/auth/principal';

export const PRINCIPAL_CTX_KEY = 'personus__principal' as const;

export type PersonusRequestContextShape = { [PRINCIPAL_CTX_KEY]: Principal };

/** Build a RequestContext delegating a user's authority to an agent run. */
export function buildAgentRequestContext(
  base: Principal,
  agent: { agentId: string; sessionId: string; constraints?: Record<string, unknown> },
): RequestContext<PersonusRequestContextShape> {
  const delegated = asAgent(base, agent);
  return new RequestContext<PersonusRequestContextShape>([[PRINCIPAL_CTX_KEY, delegated]]);
}

/**
 * Read the principal off a tool's request context. In non-production, if no
 * principal was threaded (e.g. the CopilotKit demo path without a session),
 * falls back to a narrow dev principal so conversational tool calls degrade
 * gracefully instead of hard-failing. In production, a missing principal throws.
 */
export function getToolPrincipal(
  ctx: { requestContext?: RequestContext<unknown> } | undefined,
): Principal {
  const rc = ctx?.requestContext as RequestContext<PersonusRequestContextShape> | undefined;
  const p = rc?.get(PRINCIPAL_CTX_KEY);
  if (p) return p;

  const dev = getDevPrincipal();
  if (dev) return dev;

  throw new Error(
    'Mastra tool invoked without a principal in requestContext. Build one via buildAgentRequestContext() before agent.generate()/stream().',
  );
}
