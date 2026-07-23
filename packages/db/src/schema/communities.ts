import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  vector,
} from 'drizzle-orm/pg-core';
import { baseFields, junctionFields } from './_factory';
import { personas } from './personas';
import { users } from './users';

// Communities — the universal container for all group-like entities.
// Community type is data-driven via community_types.slug. public_id `com_<nanoid17>`.
export const communities = pgTable(
  'communities',
  {
    ...baseFields('com'),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),

    communityType: text('community_type').notNull().default('club'),
    traits: jsonb('traits').notNull().default(sql`'{}'::jsonb`),
    embedding: vector('embedding', { dimensions: 1536 }),

    backingPersonaUri: text('backing_persona_uri').references(() => personas.uri, {
      onDelete: 'set null',
    }),

    tags: text('tags').array().default([]),

    // Informational references to external platforms where this community lives.
    // Live bot wiring is handled separately via PlatformChannels (see
    // platform-channels.ts) — this is display metadata only.
    externalPlatforms: jsonb('external_platforms').notNull().default(sql`'[]'::jsonb`),

    visibility: text('visibility').notNull().default('public'),
    joinPolicy: text('join_policy').notNull().default('open'),
    memberCount: integer('member_count').default(0),
    maxMembers: integer('max_members'),

    // RESTRICT: communities outlive their creator — admin must reassign first.
    foundingUserId: bigint('founding_user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    billingUserId: bigint('billing_user_id', { mode: 'bigint' }).references(() => users.id, {
      onDelete: 'set null',
    }),

    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    geographicBounds: jsonb('geographic_bounds'),
    parentCommunityId: bigint('parent_community_id', { mode: 'bigint' }).references(
      (): AnyPgColumn => communities.id,
      { onDelete: 'set null' },
    ),
    autoArchive: boolean('auto_archive').notNull().default(false),
  },
  (table) => [
    index('idx_communities_type').on(table.communityType),
    index('idx_communities_slug').on(table.slug),
    index('idx_communities_founding_user').on(table.foundingUserId),
    index('idx_communities_billing_user').on(table.billingUserId),
    index('idx_communities_backing').on(table.backingPersonaUri),
    index('idx_communities_parent').on(table.parentCommunityId),
    index('idx_communities_tags').using('gin', table.tags),
    index('idx_communities_traits').using('gin', table.traits),
    index('idx_communities_embedding').using('ivfflat', table.embedding.op('vector_cosine_ops')),
    index('idx_communities_active').on(table.id).where(sql`deleted_at IS NULL`),
  ],
);

// Community Members (junction: user + persona + community).
export const communityMembers = pgTable(
  'community_members',
  {
    ...junctionFields(),
    userId: bigint('user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    personaId: bigint('persona_id', { mode: 'bigint' })
      .references(() => personas.id, { onDelete: 'cascade' })
      .notNull(),
    communityId: bigint('community_id', { mode: 'bigint' })
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull().default('member'),
    memberTraits: jsonb('member_traits').notNull().default(sql`'{}'::jsonb`),
    visible: boolean('visible').default(true),
    invitedByUserId: bigint('invited_by_user_id', { mode: 'bigint' }).references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    unique('uq_community_members_user_community').on(table.userId, table.communityId),
    index('idx_community_members_user').on(table.userId),
    index('idx_community_members_persona').on(table.personaId),
    index('idx_community_members_community').on(table.communityId),
    index('idx_community_members_role').on(table.role),
  ],
);

export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;
