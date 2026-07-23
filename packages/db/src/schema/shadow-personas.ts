import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, timestamp, vector } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';
import { personas } from './personas';

// Shadow Personas — placeholders for non-users, claimable via token. `sha_<nanoid17>`.
export const shadowPersonas = pgTable(
  'shadow_personas',
  {
    ...baseFields('sha'),
    communityId: bigint('community_id', { mode: 'bigint' })
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    createdByPersonaUri: text('created_by_persona_uri')
      .references(() => personas.uri, { onDelete: 'cascade' })
      .notNull(),
    displayName: text('display_name').notNull(),
    entityType: text('entity_type').notNull().default('person'),
    traits: jsonb('traits').notNull().default(sql`'{}'::jsonb`),
    embedding: vector('embedding', { dimensions: 1536 }),
    claimStatus: text('claim_status').default('unclaimed'),
    claimToken: text('claim_token').unique(),
    claimedByPersonaUri: text('claimed_by_persona_uri').references(() => personas.uri, {
      onDelete: 'set null',
    }),
    inviteSentVia: text('invite_sent_via'),
    inviteSentAt: timestamp('invite_sent_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_shadow_community').on(table.communityId),
    index('idx_shadow_claim').on(table.claimStatus),
    index('idx_shadow_embedding').using('ivfflat', table.embedding.op('vector_cosine_ops')),
    index('idx_shadow_personas_active').on(table.communityId).where(sql`deleted_at IS NULL`),
  ],
);

export type ShadowPersona = typeof shadowPersonas.$inferSelect;
export type NewShadowPersona = typeof shadowPersonas.$inferInsert;
