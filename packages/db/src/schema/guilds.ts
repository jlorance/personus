import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { baseFields, junctionFields } from './_factory';
import { personas } from './personas';
import { users } from './users';

export const guildRequestRouteOutcome = pgEnum('guild_request_route_outcome', [
  'routed',
  'responded',
  'declined',
  'expired',
]);

// Guild Skill Categories — hierarchical skill taxonomy per guild. `gsc_<nanoid17>`.
export const guildSkillCategories = pgTable(
  'guild_skill_categories',
  {
    ...baseFields('gsc'),
    guildPersonaId: bigint('guild_persona_id', { mode: 'bigint' })
      .references(() => personas.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    parentCategoryId: bigint('parent_category_id', { mode: 'bigint' }).references(
      (): AnyPgColumn => guildSkillCategories.id,
      { onDelete: 'set null' },
    ),
    skillTags: text('skill_tags').array().notNull(),
    displayOrder: integer('display_order'),
    icon: text('icon'),
    color: text('color'),
  },
  (table) => [
    uniqueIndex('uq_guild_skill_categories_persona_name_active')
      .on(table.guildPersonaId, table.name)
      .where(sql`deleted_at IS NULL`),
    index('idx_guild_skill_categories_active')
      .on(table.guildPersonaId)
      .where(sql`deleted_at IS NULL`),
  ],
);

// Guild Membership Tiers — progressive levels. `gmt_<nanoid17>`.
export const guildMembershipTiers = pgTable(
  'guild_membership_tiers',
  {
    ...baseFields('gmt'),
    guildPersonaId: bigint('guild_persona_id', { mode: 'bigint' })
      .references(() => personas.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    displayOrder: integer('display_order'),
    criteria: jsonb('criteria').notNull(),
    permissions: jsonb('permissions'),
    badgeConfig: jsonb('badge_config'),
  },
  (table) => [
    uniqueIndex('uq_guild_membership_tiers_persona_name_active')
      .on(table.guildPersonaId, table.name)
      .where(sql`deleted_at IS NULL`),
    index('idx_guild_membership_tiers_active')
      .on(table.guildPersonaId)
      .where(sql`deleted_at IS NULL`),
  ],
);

// Guild Offerings — services/products offered through the guild. `gof_<nanoid17>`.
export const guildOfferings = pgTable(
  'guild_offerings',
  {
    ...baseFields('gof'),
    guildPersonaId: bigint('guild_persona_id', { mode: 'bigint' })
      .references(() => personas.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category'),
    skillCategoryIds: bigint('skill_category_ids', { mode: 'bigint' }).array(),
    priceModel: jsonb('price_model'),
    availability: text('availability'),
    status: text('status').notNull().default('active'),
    displayOrder: integer('display_order'),
  },
  (table) => [
    index('idx_guild_offerings_active').on(table.guildPersonaId).where(sql`deleted_at IS NULL`),
  ],
);

// Guild Offering Members — junction: which personas fulfill which offerings.
export const guildOfferingMembers = pgTable(
  'guild_offering_members',
  {
    ...junctionFields(),
    offeringId: bigint('offering_id', { mode: 'bigint' })
      .references(() => guildOfferings.id, { onDelete: 'cascade' })
      .notNull(),
    memberPersonaUri: text('member_persona_uri')
      .references(() => personas.uri, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').notNull().default('active'),
    notes: text('notes'),
  },
  (table) => [unique().on(table.offeringId, table.memberPersonaUri)],
);

// Guild Requests — inbound needs routed to guild members. `gre_<nanoid17>`.
export const guildRequests = pgTable(
  'guild_requests',
  {
    ...baseFields('gre'),
    guildPersonaId: bigint('guild_persona_id', { mode: 'bigint' })
      .references(() => personas.id, { onDelete: 'cascade' })
      .notNull(),
    requesterId: bigint('requester_id', { mode: 'bigint' }).references(() => users.id, {
      onDelete: 'cascade',
    }),
    requesterPersonaUri: text('requester_persona_uri').references(() => personas.uri, {
      onDelete: 'cascade',
    }),
    needDescription: text('need_description').notNull(),
    matchedCategoryIds: bigint('matched_category_ids', { mode: 'bigint' }).array(),
    matchedOfferingId: bigint('matched_offering_id', { mode: 'bigint' }).references(
      () => guildOfferings.id,
      { onDelete: 'set null' },
    ),
    selectedPersonaUri: text('selected_persona_uri').references(() => personas.uri, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('pending'),
    urgency: text('urgency').notNull().default('normal'),
    responseDeadline: timestamp('response_deadline', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_guild_requests_active').on(table.guildPersonaId).where(sql`deleted_at IS NULL`),
  ],
);

// Guild Request Routes — junction: which personas were offered a given request.
export const guildRequestRoutes = pgTable(
  'guild_request_routes',
  {
    ...junctionFields(),
    requestId: bigint('request_id', { mode: 'bigint' })
      .references(() => guildRequests.id, { onDelete: 'cascade' })
      .notNull(),
    personaUri: text('persona_uri')
      .references(() => personas.uri, { onDelete: 'cascade' })
      .notNull(),
    routedAt: timestamp('routed_at', { withTimezone: true }).defaultNow().notNull(),
    outcome: guildRequestRouteOutcome('outcome').notNull().default('routed'),
  },
  (table) => [
    unique('uq_guild_request_routes_request_persona').on(table.requestId, table.personaUri),
    index('idx_guild_request_routes_persona_uri').on(table.personaUri),
  ],
);

export type GuildSkillCategory = typeof guildSkillCategories.$inferSelect;
export type GuildMembershipTier = typeof guildMembershipTiers.$inferSelect;
export type GuildOffering = typeof guildOfferings.$inferSelect;
export type GuildOfferingMember = typeof guildOfferingMembers.$inferSelect;
export type GuildRequest = typeof guildRequests.$inferSelect;
export type GuildRequestRoute = typeof guildRequestRoutes.$inferSelect;
export type GuildRequestRouteOutcome = (typeof guildRequestRouteOutcome.enumValues)[number];
