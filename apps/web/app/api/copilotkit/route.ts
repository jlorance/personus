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
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const serviceAdapter = new ExperimentalEmptyAdapter();

export const POST = async (req: NextRequest) => {
  const copilotRuntime = new CopilotRuntime({
    // resourceId scopes agent memory; a per-user id is threaded in a later pass.
    agents: MastraAgent.getLocalAgents({ mastra, resourceId: 'personus' }) as never,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
