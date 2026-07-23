/**
 * system_settings — runtime configuration as typed JSONB key/value rows.
 *
 * Backs the DB feature-flag provider (see @personus/flags) and admin-tunable
 * values (AI model selection, rate limits). Read through the cached
 * `getSetting()` helper. `key` is the natural PK (dot-namespaced). No
 * soft-delete — change history lives in `audit_log`.
 */

import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  defaultValue: jsonb('default_value').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  valueType: text('value_type').notNull().default('string'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 100 }),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
