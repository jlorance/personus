import { bigint, boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';

// Query Logs — discovery query analytics. public_id `qry_<nanoid17>`.
// `agentId` is an opaque external agent id (NOT a FK).
export const queryLogs = pgTable('query_logs', {
  ...baseFields('qry'),
  communityId: bigint('community_id', { mode: 'bigint' })
    .references(() => communities.id, { onDelete: 'cascade' })
    .notNull(),
  // Nullable after retention sweep — the analytics row is kept but the
  // free-text search string is cleared when the retention window expires (PER-31).
  queryText: text('query_text'),
  querySource: text('query_source').notNull(),
  agentId: uuid('agent_id'),
  matchCount: integer('match_count').default(0),
  matchedSkills: text('matched_skills').array(),
  resultedInContact: boolean('resulted_in_contact').default(false),
});

export type QueryLog = typeof queryLogs.$inferSelect;
export type NewQueryLog = typeof queryLogs.$inferInsert;
