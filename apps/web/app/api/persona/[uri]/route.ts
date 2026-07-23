/**
 * REST persona lookup — public projection of a single persona by URI, for REST
 * clients / GPT Actions. Visibility-gated (anonymous → public only) and gated
 * behind `mcp_enabled` like the other external-AI surfaces.
 */

import { getAnonymousMcpPrincipal } from '@personus/auth/principal';
import { getPersonaByUri, toPublicPersona } from '@personus/db/services';
import { flags } from '@personus/flags';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ uri: string }> }) {
  if (!(await flags.isEnabled('mcp_enabled', false))) {
    return NextResponse.json({ error: 'discovery disabled' }, { status: 403 });
  }
  const { uri } = await params;
  try {
    const principal = getAnonymousMcpPrincipal(req);
    const row = await getPersonaByUri(principal, uri);
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(toPublicPersona(row));
  } catch (err) {
    logger.error({ err: String(err), uri }, 'REST persona lookup failed');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
