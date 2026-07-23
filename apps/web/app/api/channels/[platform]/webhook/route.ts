/**
 * Platform bot webhook — one endpoint per platform (Slack / Discord / Telegram),
 * the surface a Mastra channel adapter points at. It normalizes the platform's
 * payload to a common shape and hands off to `handlePlatformMessage`, which runs
 * the Discovery agent for the bound community.
 *
 * Real adapters (`@chat-adapter/slack`, etc.) do signature verification and
 * payload shaping; until those are installed this route accepts a normalized
 * `{ externalRef, text, senderRef }` body (so it's testable) and requires a
 * per-platform signing secret in production before doing anything.
 */

import { handlePlatformMessage, type InboundPlatformMessage } from '@personus/ai';
import { flags } from '@personus/flags';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PLATFORMS = new Set(['slack', 'discord', 'telegram']);

function signingSecretFor(platform: string): string | undefined {
  return {
    slack: process.env.SLACK_SIGNING_SECRET,
    discord: process.env.DISCORD_PUBLIC_KEY,
    telegram: process.env.TELEGRAM_WEBHOOK_SECRET,
  }[platform];
}

export async function POST(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  // Flag check first (fail closed) so a disabled endpoint reveals nothing —
  // including which platform slugs are recognized.
  if (!(await flags.isEnabled('platform_channels_enabled', false))) {
    return NextResponse.json({ error: 'platform channels disabled' }, { status: 403 });
  }

  const { platform } = await params;
  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'unknown platform' }, { status: 404 });
  }

  // In production, refuse unless a signing secret is configured (real adapters
  // verify the signature here; the guard prevents an open bot endpoint).
  if (process.env.NODE_ENV === 'production' && !signingSecretFor(platform)) {
    return NextResponse.json({ error: 'unverified' }, { status: 401 });
  }

  let body: Partial<InboundPlatformMessage>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { externalRef, text, senderRef } = body;
  if (!externalRef || !text || !senderRef) {
    return NextResponse.json({ error: 'externalRef, text, senderRef required' }, { status: 400 });
  }

  try {
    const reply = await handlePlatformMessage({
      platform: platform as InboundPlatformMessage['platform'],
      externalRef,
      text,
      senderRef,
    });
    return NextResponse.json(reply);
  } catch (err) {
    logger.error({ err: String(err), platform }, 'platform webhook failed');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
