/**
 * Platform webhook signature verification.
 *
 * Real cryptographic verification for the three bot platforms, so the webhook
 * route can prove an inbound request actually came from the platform (not just
 * that a secret env var is set). Pure functions of (secret/key, headers, raw
 * body) — unit-tested with self-generated signatures, no live platform needed.
 *
 * - Slack:    HMAC-SHA256 over `v0:{ts}:{body}` == `X-Slack-Signature`, ts fresh.
 * - Discord:  Ed25519 over `{ts}{body}` with the app public key.
 * - Telegram: constant-time compare of the `X-Telegram-Bot-Api-Secret-Token`.
 */

import crypto from 'node:crypto';
import { env } from '@personus/env';
import type { PlatformChannelName } from './platform-channels';

/**
 * Constant-time string compare. Pads to equal length before comparing so the
 * caller can't learn the secret's length from response timing (matters for the
 * arbitrary-length Telegram token), then still requires exact-length equality.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  const len = Math.max(ab.length, bb.length);
  const pa = Buffer.concat([ab, Buffer.alloc(len - ab.length)]);
  const pb = Buffer.concat([bb, Buffer.alloc(len - bb.length)]);
  return crypto.timingSafeEqual(pa, pb) && ab.length === bb.length;
}

export function verifySlack(
  signingSecret: string,
  timestamp: string | null,
  signature: string | null,
  rawBody: string,
  nowSeconds = Date.now() / 1000,
): boolean {
  if (!signingSecret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false; // replay window
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
  return timingSafeEqualStr(expected, signature);
}

/** Build an Ed25519 public KeyObject from a raw 32-byte hex key (DER-wrapped). */
function ed25519FromHex(hex: string): crypto.KeyObject {
  const raw = Buffer.from(hex, 'hex');
  if (raw.length !== 32) throw new Error('bad ed25519 key length');
  const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

export function verifyDiscord(
  publicKeyHex: string,
  timestamp: string | null,
  signature: string | null,
  rawBody: string,
): boolean {
  if (!publicKeyHex || !timestamp || !signature) return false;
  try {
    const key = ed25519FromHex(publicKeyHex);
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

export function verifyTelegram(secret: string, headerToken: string | null): boolean {
  if (!secret || !headerToken) return false;
  return timingSafeEqualStr(secret, headerToken);
}

/** Header lookup that accepts a Fetch `Headers` or a plain record. */
type HeaderSource = Headers | Record<string, string>;
function getHeader(h: HeaderSource, name: string): string | null {
  if (h instanceof Headers) return h.get(name);
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(h)) if (k.toLowerCase() === lower) return v;
  return null;
}

export interface VerifyResult {
  /** True when the signature verified. */
  ok: boolean;
  /** True when a secret/key IS configured for this platform (so verification is expected). */
  configured: boolean;
}

/**
 * Verify an inbound platform webhook against the configured secret/key (read
 * from env). Returns whether it verified AND whether a secret is configured, so
 * the route can decide policy (e.g. require verification whenever configured,
 * and always in production).
 */
export function verifyPlatformSignature(
  platform: PlatformChannelName,
  headers: HeaderSource,
  rawBody: string,
): VerifyResult {
  switch (platform) {
    case 'slack': {
      const secret = env.SLACK_SIGNING_SECRET ?? '';
      return {
        configured: Boolean(secret),
        ok: verifySlack(
          secret,
          getHeader(headers, 'x-slack-request-timestamp'),
          getHeader(headers, 'x-slack-signature'),
          rawBody,
        ),
      };
    }
    case 'discord': {
      const key = env.DISCORD_PUBLIC_KEY ?? '';
      return {
        configured: Boolean(key),
        ok: verifyDiscord(
          key,
          getHeader(headers, 'x-signature-timestamp'),
          getHeader(headers, 'x-signature-ed25519'),
          rawBody,
        ),
      };
    }
    case 'telegram': {
      const secret = env.TELEGRAM_WEBHOOK_SECRET ?? '';
      return {
        configured: Boolean(secret),
        ok: verifyTelegram(secret, getHeader(headers, 'x-telegram-bot-api-secret-token')),
      };
    }
    default:
      return { ok: false, configured: false };
  }
}
