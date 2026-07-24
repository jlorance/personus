/**
 * REST discovery endpoint — the plain-HTTP surface for tools that speak REST
 * rather than MCP's JSON-RPC (notably ChatGPT "GPT Actions", which consume an
 * OpenAPI schema; see integrations/chatgpt/openapi.yaml).
 *
 * Anonymous, public-read only, and gated behind the same `mcp_enabled` flag as
 * the MCP endpoint (fails closed). This mirrors MCP's `personus_search`.
 */

import { getAnonymousMcpPrincipal } from '@personus/auth/principal';
import {
  DISCOVERY_DEFAULT_RESULTS,
  MAX_QUERY_LENGTH,
  MAX_SEARCH_RESULTS,
} from '@personus/constants';
import { searchPersonas } from '@personus/db/services';
import { flags } from '@personus/flags';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await flags.isEnabled('mcp_enabled', false))) {
    return NextResponse.json({ error: 'discovery disabled' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return NextResponse.json({ error: 'query parameter `q` is required' }, { status: 400 });
  const limit = Math.min(
    Math.max(
      Number(url.searchParams.get('limit') ?? DISCOVERY_DEFAULT_RESULTS) ||
        DISCOVERY_DEFAULT_RESULTS,
      1,
    ),
    MAX_SEARCH_RESULTS,
  );

  try {
    const principal = getAnonymousMcpPrincipal(req);
    const results = await searchPersonas(principal, {
      query: q,
      maxResults: limit,
      requireMcpEnabled: true,
    });
    return NextResponse.json({
      query: q,
      results: results.map((r) => ({
        uri: r.uri,
        displayName: r.displayName,
        headline: r.headline,
        location: r.location,
        endorsements: r.endorsementCount,
      })),
    });
  } catch (err) {
    logger.error({ err: String(err) }, 'REST discovery failed');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
