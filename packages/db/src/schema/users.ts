import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';

// Users — humans (and external IdP-managed identities). public_id `usr_<nanoid17>`.
export const users = pgTable(
  'users',
  {
    ...baseFields('usr'),
    // AuthN-provider-agnostic external subject id (Clerk user id, WorkOS id, …).
    // Named generically so the AuthProvider seam isn't tied to one vendor.
    authSubjectId: text('auth_subject_id').unique().notNull(),
    email: text('email').notNull(),
    did: text('did').unique(),
    preferredLanguages: text('preferred_languages').array(),
    defaultLocation: jsonb('default_location'),
    defaultContactPreferences: jsonb('default_contact_preferences')
      .notNull()
      .default(sql`'{}'::jsonb`),
    mcpPreferences: jsonb('mcp_preferences').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [index('idx_users_active').on(table.id).where(sql`deleted_at IS NULL`)],
);

// User traits (master JSONB pool — one per user). One-to-one; CASCADE with user.
export const userTraits = pgTable(
  'user_traits',
  {
    ...baseFields('utr'),
    userId: bigint('user_id', { mode: 'bigint' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    traits: jsonb('traits').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index('idx_user_traits').using('gin', table.traits),
    index('idx_user_traits_active').on(table.id).where(sql`deleted_at IS NULL`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserTraits = typeof userTraits.$inferSelect;
export type NewUserTraits = typeof userTraits.$inferInsert;
