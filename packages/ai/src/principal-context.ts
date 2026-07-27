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
  agent: Parameters<typeof asAgent>[1],
): RequestContext<PersonusRequestContextShape> {
  const delegated = asAgent(base, agent);
  return new RequestContext<PersonusRequestContextShape>([[PRINCIPAL_CTX_KEY, delegated]]);
}

/** The agents registered on the Mastra instance. */
export const AGENT_IDS = ['persona-coach', 'discovery', 'recommender'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/**
 * One delegated RequestContext per registered agent.
 *
 * Per-agent, not one shared context, because `asAgent` stamps `actorId` and
 * `delegatedAuthority.agentId` from the agent it is given — and the audit log
 * writes `principal.actorId`. A single shared context would attribute every
 * tool call to whichever agent id happened to be chosen, so Discovery's actions
 * would be logged as the Coach's.
 *
 * Returns `undefined` per agent for an anonymous caller: there is no user
 * authority to delegate, and `getToolPrincipal` should take its own path rather
 * than be handed an empty context.
 */
export function agentRequestContexts(
  base: Principal | null | undefined,
  sessionId: string,
): Record<AgentId, RequestContext<PersonusRequestContextShape> | undefined> {
  return Object.fromEntries(
    AGENT_IDS.map((agentId) => [
      agentId,
      base ? buildAgentRequestContext(base, { agentId, sessionId }) : undefined,
    ]),
  ) as Record<AgentId, RequestContext<PersonusRequestContextShape> | undefined>;
}

/**
 * Wrap an already-scoped principal (e.g. a platform-bot or MCP principal that is
 * not a user actor) into a RequestContext, without the asAgent user-delegation
 * step. Use for non-user actors that are already at their intended authority.
 */
export function contextWithPrincipal(
  principal: Principal,
): RequestContext<PersonusRequestContextShape> {
  return new RequestContext<PersonusRequestContextShape>([[PRINCIPAL_CTX_KEY, principal]]);
}

/**
 * Read the principal off a tool's request context. In non-production, if no
 * principal was threaded (e.g. the CopilotKit demo path without a session),
 * falls back to a narrow dev principal so conversational tool calls degrade
 * gracefully instead of hard-failing. In production, a missing principal throws.
 */
// Generic in the context's shape: RequestContext is invariant, so a fixed
// `RequestContext<unknown>` parameter rejects the very contexts this module
// builds. Callers pass whatever they hold; the read is narrowed below.
export function getToolPrincipal<T>(
  ctx: { requestContext?: RequestContext<T> } | undefined,
): Principal {
  const rc = ctx?.requestContext as RequestContext<PersonusRequestContextShape> | undefined;
  const p = rc?.get(PRINCIPAL_CTX_KEY);
  if (p) return p;

  // Defense in depth: the dev fallback is ONLY ever consulted outside production.
  // (getDevPrincipal also fails closed in production, but never rely on one guard.)
  if (process.env.NODE_ENV !== 'production') {
    const dev = getDevPrincipal();
    if (dev) return dev;
  }

  throw new Error(
    'Mastra tool invoked without a principal in requestContext. Build one via buildAgentRequestContext() before agent.generate()/stream().',
  );
}
