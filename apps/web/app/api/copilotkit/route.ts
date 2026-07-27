/**
 * CopilotKit runtime endpoint — the agentic-UI front door.
 *
 * CopilotKit talks to our Mastra agents over the AG-UI protocol: `@ag-ui/mastra`
 * exposes the local Mastra instance as AG-UI agents, and CopilotRuntime serves
 * them here. The React `<CopilotKit runtimeUrl="/api/copilotkit">` provider
 * streams from these. Needs the Node runtime (Mastra + Neon are server-only).
 */

import { MastraAgent } from '@ag-ui/mastra';
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
} from '@copilotkit/runtime';
import { AGENT_IDS, agentRequestContexts, mastra } from '@personus/ai';
import { getOptionalPrincipal } from '@personus/auth/principal';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const serviceAdapter = new ExperimentalEmptyAdapter();

export const POST = async (req: NextRequest) => {
  // Don't let anonymous callers stream agents against the OpenAI key in
  // production. Locally (no auth configured) the dev principal path applies.
  const principal = await getOptionalPrincipal();
  if (process.env.NODE_ENV === 'production' && !principal) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Identity has to reach the tools, and it rides the RequestContext — never the
  // prompt. Without it every tool call lands in getToolPrincipal's failure path:
  // a throw in production, a read-only dev principal elsewhere. Both present to
  // the model as a generic "tool execution failed", which is why this went
  // unnoticed (PER-23).
  //
  // One context PER AGENT, built via getLocalAgent rather than getLocalAgents:
  // asAgent stamps actorId and delegatedAuthority from the agent it is given,
  // and the audit log writes actorId. A single shared context would log
  // Discovery's actions as the Coach's.
  const sessionId = crypto.randomUUID();
  const contexts = agentRequestContexts(principal, sessionId);
  const resourceId = principal?.userId ?? 'anonymous';

  const copilotRuntime = new CopilotRuntime({
    // resourceId scopes agent memory to the signed-in user (falls back to a
    // shared id only on the credential-free dev path).
    agents: Object.fromEntries(
      AGENT_IDS.map((agentId) => [
        agentId,
        MastraAgent.getLocalAgent({
          mastra,
          agentId,
          resourceId,
          // RequestContext is invariant and the bridge's parameter is fixed at
          // its default shape, so a typed context cannot assign to it. The cast
          // is at this boundary only; getToolPrincipal re-narrows on the way out.
          requestContext: contexts[agentId] as never,
        }),
      ]),
    ) as never,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
