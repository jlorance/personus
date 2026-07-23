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

import { logger } from '@personus/logger';

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
