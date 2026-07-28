import { sql } from 'drizzle-orm';
import { bigint, boolean, index, integer, jsonb, pgTable, text, vector } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { users } from './users';

// Personas — published views that selectively include traits from a user's pool.
// public_id `per_<nanoid17>`. `uri` is the user-visible slug used in routes.
export const personas = pgTable(
  'personas',
  {
    ...baseFields('per'),
    uri: text('uri').unique().notNull(),
    userId: bigint('user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    displayName: text('display_name').notNull(),
    initial: text('initial'),
    headline: text('headline').notNull().default(''),
    location: text('location'),
    entityType: text('entity_type').notNull().default('person'),
    visibility: text('visibility').notNull().default('community'),
    contactPreferences: jsonb('contact_preferences').notNull().default(sql`'{}'::jsonb`),
    completenessScore: integer('completeness_score').default(0),

    layoutPreset: text('layout_preset').notNull().default('auto'),
    theme: jsonb('theme').notNull().default(sql`'{}'::jsonb`),

    traits: jsonb('traits').notNull().default(sql`'{}'::jsonb`),

    mcpEnabled: boolean('mcp_enabled').notNull().default(false),
    mcpTraitVisibility: jsonb('mcp_trait_visibility').notNull().default(sql`'{}'::jsonb`),

    embedding: vector('embedding', { dimensions: 1536 }),
  },
  (table) => [
    index('idx_personas_user').on(table.userId),
    index('idx_personas_uri').on(table.uri),
    index('idx_personas_entity_type').on(table.entityType),
    index('idx_personas_traits').using('gin', table.traits),
    // Partial filter aligns this index with idx_personas_active: tombstoned
    // personas are excluded so their 1536-dim fingerprint is not reachable via
    // similarity search after a soft-delete or purge (PER-24).
    index('idx_personas_embedding')
      .using('ivfflat', table.embedding.op('vector_cosine_ops'))
      .where(sql`deleted_at IS NULL`),
    index('idx_personas_active').on(table.id).where(sql`deleted_at IS NULL`),
  ],
);

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
