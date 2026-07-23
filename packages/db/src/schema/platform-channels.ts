import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';

/**
 * PlatformChannelBindings — the lean binding record for the PlatformChannels
 * concept (one of the three de-conflated "channel" ideas; see the founding
 * plan). This REPLACES the old heavyweight `integrations` table.
 *
 * Rationale: Mastra's first-class `channels` primitive (@mastra/core ≥1.22)
 * owns webhook routing, threading, dedup, and per-thread memory for Slack /
 * Discord / Telegram bots. We no longer hand-roll that plumbing, so all we need
 * to persist is which community is bound to which platform channel and the
 * minimal install/credential metadata. Mastra owns the rest.
 *
 * public_id `pcb_<nanoid17>`. CASCADE on communityId.
 */
export const platformChannelBindings = pgTable(
  'platform_channel_bindings',
  {
    ...baseFields('pcb'),
    communityId: bigint('community_id', { mode: 'bigint' })
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    // 'slack' | 'discord' | 'telegram' — see PLATFORM_CHANNELS in @personus/constants.
    platform: text('platform').notNull(),
    // Platform-native container id the bot is bound to (Slack channel id,
    // Discord guild/channel id, Telegram chat id). What Mastra's adapter keys on.
    externalRef: text('external_ref').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'revoked'
    // Opaque adapter config / credential handle. Kept as JSONB so the shape can
    // follow whatever the chosen Mastra chat-adapter needs, without schema churn.
    adapterConfig: jsonb('adapter_config').notNull().default(sql`'{}'::jsonb`),
    installedBy: text('installed_by').notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_platform_channel_bindings_platform_ref').on(table.platform, table.externalRef),
    index('idx_platform_channel_bindings_community')
      .on(table.communityId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type PlatformChannelBinding = typeof platformChannelBindings.$inferSelect;
export type NewPlatformChannelBinding = typeof platformChannelBindings.$inferInsert;
