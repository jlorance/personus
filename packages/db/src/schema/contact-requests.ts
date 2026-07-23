import { sql } from 'drizzle-orm';
import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';
import { personas } from './personas';

// Contact Requests — mediated introductions. public_id `con_<nanoid17>`.
// Never stores raw contact details; delivery is resolved by ContactRelay
// (see @personus/contact). `fromAgentId` is an opaque agent uuid (NOT a FK).
export const contactRequests = pgTable(
  'contact_requests',
  {
    ...baseFields('con'),
    fromPersonaUri: text('from_persona_uri').references(() => personas.uri, {
      onDelete: 'cascade',
    }),
    fromAgentId: uuid('from_agent_id'),
    fromAnonymous: jsonb('from_anonymous'),
    toPersonaUri: text('to_persona_uri')
      .references(() => personas.uri, { onDelete: 'cascade' })
      .notNull(),
    toCommunityId: bigint('to_community_id', { mode: 'bigint' }).references(() => communities.id, {
      onDelete: 'cascade',
    }),
    reason: text('reason').notNull(),
    message: text('message'),
    triageNote: text('triage_note'),
    triageScore: integer('triage_score'),
    matchedOpenTo: text('matched_open_to').array(),
    trustChain: text('trust_chain').array(),
    status: text('status').notNull().default('pending'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    responseNote: text('response_note'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_contact_requests_to').on(table.toPersonaUri),
    index('idx_contact_requests_status').on(table.status),
    index('idx_contact_requests_active').on(table.toPersonaUri).where(sql`deleted_at IS NULL`),
  ],
);

export type ContactRequest = typeof contactRequests.$inferSelect;
export type NewContactRequest = typeof contactRequests.$inferInsert;
