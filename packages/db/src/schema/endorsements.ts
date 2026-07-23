import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, pgTable, text } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';
import { personas } from './personas';
import { shadowPersonas } from './shadow-personas';

// Endorsements — directional attestations. public_id `end_<nanoid17>`.
// Community link is SET NULL — the endorsement survives community deletion.
export const endorsements = pgTable(
  'endorsements',
  {
    ...baseFields('end'),
    fromPersonaUri: text('from_persona_uri')
      .references(() => personas.uri, { onDelete: 'cascade' })
      .notNull(),
    toPersonaUri: text('to_persona_uri').references(() => personas.uri, { onDelete: 'cascade' }),
    toShadowPersonaId: bigint('to_shadow_persona_id', { mode: 'bigint' }).references(
      () => shadowPersonas.id,
      { onDelete: 'cascade' },
    ),
    communityId: bigint('community_id', { mode: 'bigint' }).references(() => communities.id, {
      onDelete: 'set null',
    }),
    relationshipType: text('relationship_type').notNull(),
    endorsementContext: text('endorsement_context').array().default([]),
    strength: text('strength').notNull().default('standard'),
    testimonial: text('testimonial'),
    visibility: text('visibility').notNull().default('community'),
    active: boolean('active').default(true),
  },
  (table) => [
    check(
      'endorsement_target_check',
      sql`${table.toPersonaUri} IS NOT NULL OR ${table.toShadowPersonaId} IS NOT NULL`,
    ),
    index('idx_endorsements_to').on(table.toPersonaUri),
    index('idx_endorsements_from').on(table.fromPersonaUri),
    index('idx_endorsements_community').on(table.communityId),
    index('idx_endorsements_shadow').on(table.toShadowPersonaId),
    index('idx_endorsements_active').on(table.toPersonaUri).where(sql`deleted_at IS NULL`),
  ],
);

export type Endorsement = typeof endorsements.$inferSelect;
export type NewEndorsement = typeof endorsements.$inferInsert;
