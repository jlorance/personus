/**
 * Platform bot webhook — one endpoint per platform (Slack / Discord / Telegram),
 * the surface a Mastra channel adapter points at. It verifies the platform's
 * signature, normalizes the payload to a common shape, and hands off to
 * `handlePlatformMessage`, which runs the Discovery agent for the bound community.
 *
 * Signature verification (Slack HMAC / Discord Ed25519 / Telegram token) runs
 * whenever the platform's secret is configured, and is REQUIRED in production.
 * In local dev without secrets it's skipped so the normalized body is testable.
 */

import {
  handlePlatformMessage,
  type InboundPlatformMessage,
  verifyPlatformSignature,
} from '@personus/ai';
import { flags } from '@personus/flags';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isPlatform(p: string): p is InboundPlatformMessage['platform'] {
  return p === 'slack' || p === 'discord' || p === 'telegram';
}

export async function POST(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  // Flag first (fail closed) so a disabled endpoint reveals nothing — including
  // which platform slugs are recognized.
  if (!(await flags.isEnabled('platform_channels_enabled', false))) {
    return NextResponse.json({ error: 'platform channels disabled' }, { status: 403 });
  }

  const { platform } = await params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: 'unknown platform' }, { status: 404 });
  }

  // Read the raw body once — needed for signature verification and parsing.
  const rawBody = await req.text();

  // Verify the signature. Enforce whenever a secret is configured, and always in
  // production (an unconfigured prod endpoint is refused rather than left open).
  const { ok, configured } = verifyPlatformSignature(platform, req.headers, rawBody);
  if ((configured || process.env.NODE_ENV === 'production') && !ok) {
    return NextResponse.json({ error: 'unverified' }, { status: 401 });
  }

  let body: Partial<InboundPlatformMessage>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { externalRef, text, senderRef } = body;
  if (!externalRef || !text || !senderRef) {
    return NextResponse.json({ error: 'externalRef, text, senderRef required' }, { status: 400 });
  }

  try {
    const reply = await handlePlatformMessage({ platform, externalRef, text, senderRef });
    return NextResponse.json(reply);
  } catch (err) {
    logger.error({ err: String(err), platform }, 'platform webhook failed');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
