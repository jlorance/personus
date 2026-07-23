import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditLogFields } from './_factory';
import { users } from './users';

// Activity Events — append-only user-facing timeline. uuid PK, no public_id.
export const activityEvents = pgTable(
  'activity_events',
  {
    ...auditLogFields(),
    userId: bigint('user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    personaUri: text('persona_uri').notNull(),
    communityId: uuid('community_id'),
    type: text('type').notNull(),
    payload: jsonb('payload').default(sql`'{}'::jsonb`),
    summary: text('summary').notNull(),
  },
  (table) => [index('idx_activity_events_user').on(table.userId, table.createdAt.desc())],
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
