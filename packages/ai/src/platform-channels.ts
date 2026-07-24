/**
 * PlatformChannels — the bot-surface concept, built on Mastra's first-class
 * `channels` primitive (@mastra/core ≥1.22). This is the modern replacement for
 * the old hand-rolled `integrations` webhook plumbing: Mastra owns routing,
 * threading, dedup, and per-thread memory; we just attach adapters and resolve
 * a Personus Principal per inbound message.
 *
 * Pass one ships the CONFIG SEAM only — adapters are gated behind the
 * `features.platform_channels_enabled` flag and the relevant bot tokens, and
 * live wiring (installing @chat-adapter/slack etc.) is a later pass. Keeping the
 * seam here means turning bots on is additive, not a refactor.
 */

import { getPlatformPrincipal } from '@personus/auth/principal';
import { resolveBoundCommunity } from '@personus/db/services';
import { logger } from '@personus/logger';
import { TIMEOUTS, withTimeout } from '@personus/timeout';
import { discoveryAgent } from './agents/discovery';
import { contextWithPrincipal } from './principal-context';

export type PlatformChannelName = 'slack' | 'discord' | 'telegram';

export interface PlatformChannelAdapterConfig {
  platform: PlatformChannelName;
  enabled: boolean;
}

/**
 * Resolve which platform adapters are configured from env. Returns an empty set
 * when disabled or unconfigured — safe to call at boot.
 */
export function resolvePlatformChannels(): PlatformChannelAdapterConfig[] {
  const configs: PlatformChannelAdapterConfig[] = [
    { platform: 'slack', enabled: Boolean(process.env.SLACK_BOT_TOKEN) },
    { platform: 'discord', enabled: Boolean(process.env.DISCORD_BOT_TOKEN) },
    { platform: 'telegram', enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
  ];
  return configs.filter((c) => c.enabled);
}

/**
 * Build the `channels` config object to spread onto an Agent once adapters are
 * installed. Today it logs intent and returns undefined (no adapters), so the
 * Agent constructor stays channel-free until a later pass wires real adapters:
 *
 *   // later: import { createSlackAdapter } from '@chat-adapter/slack'
 *   new Agent({ ..., channels: buildChannelsConfig() })
 */
export function buildChannelsConfig(): undefined {
  const active = resolvePlatformChannels();
  if (active.length > 0) {
    logger.info(
      { platforms: active.map((c) => c.platform) },
      'PlatformChannels: adapters detected but not yet wired (later pass)',
    );
  }
  return undefined;
}

export interface InboundPlatformMessage {
  platform: PlatformChannelName;
  /** Platform-native container id the bot is bound to (Slack channel, Discord guild, …). */
  externalRef: string;
  /** The user's message text. */
  text: string;
  /** Platform user id of the sender (hashed into the principal for audit). */
  senderRef: string;
}

/**
 * Handle one inbound platform-bot message: resolve the bound community, thread a
 * narrow platform Principal into the Discovery agent, and return its reply. This
 * is the single entry point a Mastra channel adapter (or our webhook route)
 * calls once it has normalized the platform payload. Fails soft — a missing
 * binding or an absent OPENAI_API_KEY yields a friendly message, never a throw.
 */
export async function handlePlatformMessage(
  msg: InboundPlatformMessage,
): Promise<{ text: string; matched: boolean }> {
  const bound = await resolveBoundCommunity(msg.platform, msg.externalRef);
  if (!bound) {
    return {
      text: "This channel isn't connected to a Personus community yet. An admin can link it in community settings.",
      matched: false,
    };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { text: 'Discovery is temporarily offline. Please try again later.', matched: true };
  }

  const principal = getPlatformPrincipal(msg.platform, msg.senderRef);
  // Strip the fence delimiters from untrusted input so a sender can't close the
  // data fence early and inject instructions (the LLM's "treat as data" rule is
  // a soft guard; this removes the technical escape).
  const fenced = msg.text.replace(/<<<\/?USER_MESSAGE>>>/g, '');
  try {
    const result = await withTimeout(
      discoveryAgent.generate(`<<<USER_MESSAGE>>>${fenced}<<</USER_MESSAGE>>>`, {
        requestContext: contextWithPrincipal(principal),
      }),
      TIMEOUTS.llm,
      'platform-discovery',
    );
    return { text: (result as { text: string }).text, matched: true };
  } catch (err) {
    logger.warn({ err: String(err), platform: msg.platform }, 'platform message handling failed');
    return { text: 'Something went wrong searching just now. Please try again.', matched: true };
  }
}
