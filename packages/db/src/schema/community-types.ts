import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { referenceFields } from './_factory';

// Community Types — reference data; external lookup via `slug` (UNIQUE).
export const communityTypes = pgTable(
  'community_types',
  {
    ...referenceFields(),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),
    communityTraitSchema: jsonb('community_trait_schema').notNull().default(sql`'[]'::jsonb`),
    memberTraitSchema: jsonb('member_trait_schema').notNull().default(sql`'[]'::jsonb`),
    defaultJoinPolicy: text('default_join_policy').notNull().default('open'),
    defaultVisibility: text('default_visibility').notNull().default('public'),
    maxMembersDefault: integer('max_members_default'),
    featureFlags: jsonb('feature_flags').notNull().default(sql`'{}'::jsonb`),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('idx_community_types_slug').on(table.slug),
    index('idx_community_types_active').on(table.id).where(sql`deleted_at IS NULL`),
  ],
);

export type CommunityType = typeof communityTypes.$inferSelect;
export type NewCommunityType = typeof communityTypes.$inferInsert;
