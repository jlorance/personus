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
import { mastra } from '@personus/ai';
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

  const copilotRuntime = new CopilotRuntime({
    // resourceId scopes agent memory to the signed-in user (falls back to a
    // shared id only on the credential-free dev path).
    agents: MastraAgent.getLocalAgents({
      mastra,
      resourceId: principal?.userId ?? 'anonymous',
    }) as never,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
