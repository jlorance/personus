import { sql } from 'drizzle-orm';
import { bigint, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';
import { personas } from './personas';
import { users } from './users';

// Coach Sessions — tracks AI coaching interactions. public_id `cos_<nanoid17>`.
// `kind` discriminates Mastra agent flows (persona_coach | recommender).
export const coachSessions = pgTable(
  'coach_sessions',
  {
    ...baseFields('cos'),
    userId: bigint('user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    personaUri: text('persona_uri').references(() => personas.uri, { onDelete: 'set null' }),
    communityId: bigint('community_id', { mode: 'bigint' }).references(() => communities.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').notNull().default('persona_coach').$type<'persona_coach' | 'recommender'>(),
    status: text('status').notNull().default('active'),
    mode: text('mode').notNull().default('creation'),
    transcript: jsonb('transcript').default(sql`'[]'::jsonb`),
    traitsUpdated: jsonb('traits_updated').default(sql`'[]'::jsonb`),
    completenessAtStart: integer('completeness_at_start'),
    completenessAtEnd: integer('completeness_at_end'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('idx_coach_sessions_active').on(table.userId).where(sql`deleted_at IS NULL`)],
);

export type CoachSession = typeof coachSessions.$inferSelect;
export type NewCoachSession = typeof coachSessions.$inferInsert;
