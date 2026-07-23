/**
 * MCP endpoint — exposes Personus discovery tools to external AI assistants
 * (Claude Desktop, ChatGPT, …).
 *
 * Implemented as a protocol-correct JSON-RPC 2.0 subset (initialize, tools/list,
 * tools/call, ping) rather than binding a specific MCP-SDK HTTP transport to the
 * App Router — this keeps it deterministic and curl-testable. It can be swapped
 * for the official StreamableHTTP transport later without changing the tools.
 *
 * AuthZ: anonymous callers get a public-read-only Principal (networkDepth 1).
 * Bearer-token (authenticated) callers are a later refinement. Gated behind the
 * `features.mcp_enabled` flag.
 */

import { getAnonymousMcpPrincipal } from '@personus/auth/principal';
import { getPersonaByUri, listCommunities, searchPersonas } from '@personus/db/services';
import { flags } from '@personus/flags';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'personus_search',
    description: 'Search Personus trust networks for personas matching a natural-language query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Who they need' },
        maxResults: { type: 'number', description: 'Max results (default 3)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'personus_get_persona',
    description: 'Get full details of a persona by URI (visibility-gated).',
    inputSchema: {
      type: 'object',
      properties: { personaUri: { type: 'string' } },
      required: ['personaUri'],
    },
  },
  {
    name: 'personus_list_communities',
    description: 'List public communities.',
    inputSchema: { type: 'object', properties: {} },
  },
] as const;

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}
function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}
function toolContent(data: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export async function POST(req: Request) {
  if (!(await flags.isEnabled('mcp_enabled', true))) {
    return rpcError(null, -32000, 'MCP endpoint disabled');
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: any };
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }
  const { id = null, method, params } = body;

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'personus', version: '0.1.0' },
      });
    case 'notifications/initialized':
      return new NextResponse(null, { status: 202 });
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      const principal = getAnonymousMcpPrincipal(req);
      const name = params?.name as string;
      const args = (params?.arguments ?? {}) as Record<string, any>;
      try {
        switch (name) {
          case 'personus_search':
            return rpcResult(
              id,
              toolContent(
                await searchPersonas(principal, {
                  query: String(args.query ?? ''),
                  maxResults: args.maxResults,
                }),
              ),
            );
          case 'personus_get_persona':
            return rpcResult(
              id,
              toolContent(await getPersonaByUri(principal, String(args.personaUri ?? ''))),
            );
          case 'personus_list_communities':
            return rpcResult(id, toolContent(await listCommunities(principal)));
          default:
            return rpcError(id, -32601, `Unknown tool: ${name}`);
        }
      } catch {
        return rpcResult(id, { ...toolContent({ error: 'Tool execution failed' }), isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export function GET() {
  return NextResponse.json({
    service: 'personus-mcp',
    transport: 'json-rpc over POST',
    tools: TOOLS.map((t) => t.name),
  });
}
