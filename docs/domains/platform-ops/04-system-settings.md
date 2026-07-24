---
type: spec
title: "Platform & Operations -- System Settings"
description: "System settings provide runtime configuration that controls application behavior without code deploys. Today, rate limits, feature flags, AI model selection, completeness weights, cache TTLs, and…"
status: current
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations -- System Settings

> Date: 2026-02-24
> Status: Draft
> Depends on: `00-prd.md`, `01-monorepo-migration.md`
> Primary actors: Admin

System settings provide runtime configuration that controls application behavior without code deploys. Today, rate limits, feature flags, AI model selection, completeness weights, cache TTLs, and import limits are hardcoded across the codebase. This spec introduces a `system_settings` table, a cached read API shared by both apps, an admin UI for viewing and editing settings, and an audit trail for every change.

---

## 1. Settings Table Design

### Overview

The `system_settings` table stores key-value configuration as typed JSONB values. Each setting has a key (primary key), a current value, a default value, a human-readable description, a category for grouping, and a value type for UI rendering. Both apps read settings through a shared helper with in-memory caching. Only the admin app writes settings.

The table replaces hardcoded values scattered across the codebase -- `lib/personas/completeness.ts` (scoring weights), `lib/mastra/agents/persona-coach.ts` (model selection), `lib/embeddings/index.ts` (embedding model), `docs/specs/personas/02-profile.md` (rate limits), and others. After migration, each of these reads from the settings table via the `getSetting()` helper instead of importing constants.

### Schema

```typescript
// packages/db/src/schema/system-settings.ts

import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  valueType: text('value_type').notNull().default('string'),
  defaultValue: jsonb('default_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'), // admin user ID (Clerk)
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
```

**Column semantics:**

| Column | Type | Purpose |
|--------|------|---------|
| `key` | `text` PK | Dot-namespaced identifier (e.g., `rate_limits.url_scrape_per_hour`) |
| `value` | `jsonb` NOT NULL | Current runtime value |
| `description` | `text` | Human-readable explanation shown in admin UI |
| `category` | `text` NOT NULL | Grouping key for the admin UI: `rate_limits`, `ai`, `features`, `cache`, `import`, `defaults` |
| `valueType` | `text` NOT NULL | Hint for admin UI rendering: `string`, `number`, `boolean`, `json` |
| `defaultValue` | `jsonb` NOT NULL | Factory default -- used for "Reset to Default" and shown as reference |
| `updatedAt` | `timestamptz` | Last modification time |
| `updatedBy` | `text` | Clerk user ID of the admin who last changed this setting |

**Design decisions:**

- **No separate `active` column.** Settings are always active. Feature flags use `boolean` values. Removing a setting entirely is a developer action (schema migration), not an admin action.
- **JSONB for both `value` and `defaultValue`.** This allows numbers, booleans, strings, and complex objects to be stored natively. The `valueType` column tells the admin UI how to render the editor (number input, toggle, text input, JSON textarea).
- **Primary key on `key`, not UUID.** Settings are referenced by key in application code (`getSetting('ai.coach_model')`). A UUID would add indirection with no benefit. The key namespace uses dots to visually group related settings.
- **No `version` or `history` column.** Change history is tracked via the `admin_audit_log` table (see section 5), not inline.

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | Developer can define the system_settings table schema in the shared DB package | New `packages/db/src/schema/system-settings.ts`. Export from barrel `index.ts`. Add to Drizzle config. |
| 1.2 | Developer can push the system_settings table to the database | `bun run db:push` creates the table. No migration needed (additive). |
| 1.3 | Developer can seed all initial settings with factory defaults | New `packages/db/src/seed/system-settings.ts` with upsert logic. All settings from section 2. |

### Edge Cases

- [ ] Setting key contains characters that break dot-notation parsing -- keys are validated against `/^[a-z][a-z0-9_.]+$/` regex in the seed script and admin UI
- [ ] `value` and `defaultValue` type mismatch -- seed script validates that `typeof value === typeof defaultValue` for primitive types
- [ ] Table does not exist at runtime (pre-migration) -- `getSetting()` falls back to hardcoded defaults (see section 4)
- [ ] Setting deleted from seed script but still in DB -- orphaned settings remain but are harmless; admin can identify them (no `description` update from seed)

---

## 2. Settings Categories & Initial Values

### Overview

All initial settings are defined in a seed script that upserts rows into `system_settings`. The seed is idempotent -- re-running it updates `description`, `category`, `valueType`, and `defaultValue` but does not overwrite a `value` that an admin has changed. This preserves admin overrides while keeping metadata current.

### Settings Registry

#### Rate Limits

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `rate_limits.url_scrape_per_hour` | `10` | number | Maximum URL scrapes per user per hour |
| `rate_limits.url_scrape_per_day` | `50` | number | Maximum URL scrapes per user per day |
| `rate_limits.api_rate_limit_per_minute` | `100` | number | API requests per minute per authenticated user |
| `rate_limits.mcp_rate_limit_per_minute` | `100` | number | MCP endpoint requests per minute per API key |
| `rate_limits.community_feed_per_hour` | `100` | number | Community feed requests per hour per IP |

#### AI Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `ai.default_llm_model` | `"openai/gpt-4o"` | string | Default LLM model for agents without a specific override |
| `ai.coach_model` | `"openai/gpt-4o"` | string | LLM model for the Persona Coach agent |
| `ai.recommender_model` | `"openai/gpt-4o"` | string | LLM model for the Recommender Coach agent |
| `ai.discovery_model` | `"openai/gpt-4o"` | string | LLM model for the Discovery Agent |
| `ai.extraction_model` | `"openai/gpt-4o-mini"` | string | LLM model for URL import trait extraction and classification |
| `ai.coach_temperature` | `0.7` | number | Temperature for coach agents (0.0-2.0) |
| `ai.extraction_temperature` | `0.2` | number | Temperature for structured extraction (lower = more deterministic) |
| `ai.embedding_model` | `"text-embedding-3-small"` | string | OpenAI embedding model for persona/community vectors |
| `ai.embedding_dimensions` | `1536` | number | Vector dimensions (must match pgvector column definition) |

#### Feature Flags

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `features.mcp_enabled` | `true` | boolean | Enable/disable the MCP protocol endpoint |
| `features.shadow_personas_enabled` | `true` | boolean | Enable/disable shadow persona creation |
| `features.communities_enabled` | `true` | boolean | Enable/disable community features |
| `features.url_import_enabled` | `true` | boolean | Enable/disable URL-based trait import |
| `features.coach_enabled` | `true` | boolean | Enable/disable the AI coach chat |
| `features.public_profiles_enabled` | `true` | boolean | Enable/disable public persona pages (/p/{uri}) |

#### Cache

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `cache.taxonomy_cache_ttl_seconds` | `3600` | number | How long taxonomy data is cached in memory (1 hour) |
| `cache.metadata_cache_ttl_seconds` | `3600` | number | How long trait metadata is cached in memory (1 hour) |
| `cache.settings_cache_ttl_seconds` | `60` | number | How long settings themselves are cached in memory |
| `cache.contextual_summary_ttl_seconds` | `3600` | number | How long MCP contextual summaries are cached |

#### Import

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `import.max_file_size_mb` | `10` | number | Maximum file size for CSV/ZIP imports in megabytes |
| `import.max_items_per_import` | `500` | number | Maximum items (skills, experiences, etc.) extracted per import |
| `import.max_content_length_kb` | `30` | number | Maximum scraped content length sent to LLM (truncation threshold) |

#### Defaults

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `defaults.persona_visibility` | `"community"` | string | Default visibility level for newly created personas |
| `defaults.community_join_policy` | `"approval"` | string | Default join policy for new communities |
| `defaults.max_community_members` | `500` | number | Default maximum members for a new community |
| `defaults.max_personas_per_user` | `10` | number | Maximum personas a user can create |

### Seed Script

```typescript
// packages/db/src/seed/system-settings.ts

import { eq } from 'drizzle-orm';
import type { DB } from '../index';
import { systemSettings } from '../schema/system-settings';

interface SettingDefinition {
  key: string;
  value: unknown;
  description: string;
  category: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
}

const SETTINGS: SettingDefinition[] = [
  // Rate Limits
  {
    key: 'rate_limits.url_scrape_per_hour',
    value: 10,
    description: 'Maximum URL scrapes per user per hour',
    category: 'rate_limits',
    valueType: 'number',
  },
  {
    key: 'rate_limits.url_scrape_per_day',
    value: 50,
    description: 'Maximum URL scrapes per user per day',
    category: 'rate_limits',
    valueType: 'number',
  },
  {
    key: 'rate_limits.api_rate_limit_per_minute',
    value: 100,
    description: 'API requests per minute per authenticated user',
    category: 'rate_limits',
    valueType: 'number',
  },
  {
    key: 'rate_limits.mcp_rate_limit_per_minute',
    value: 100,
    description: 'MCP endpoint requests per minute per API key',
    category: 'rate_limits',
    valueType: 'number',
  },
  {
    key: 'rate_limits.community_feed_per_hour',
    value: 100,
    description: 'Community feed requests per hour per IP',
    category: 'rate_limits',
    valueType: 'number',
  },
  // AI Configuration
  {
    key: 'ai.default_llm_model',
    value: 'openai/gpt-4o',
    description: 'Default LLM model for agents without a specific override',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.coach_model',
    value: 'openai/gpt-4o',
    description: 'LLM model for the Persona Coach agent',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.recommender_model',
    value: 'openai/gpt-4o',
    description: 'LLM model for the Recommender Coach agent',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.discovery_model',
    value: 'openai/gpt-4o',
    description: 'LLM model for the Discovery Agent',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.extraction_model',
    value: 'openai/gpt-4o-mini',
    description: 'LLM model for URL import trait extraction and classification',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.coach_temperature',
    value: 0.7,
    description: 'Temperature for coach agents (0.0-2.0)',
    category: 'ai',
    valueType: 'number',
  },
  {
    key: 'ai.extraction_temperature',
    value: 0.2,
    description: 'Temperature for structured extraction (lower = more deterministic)',
    category: 'ai',
    valueType: 'number',
  },
  {
    key: 'ai.embedding_model',
    value: 'text-embedding-3-small',
    description: 'OpenAI embedding model for persona/community vectors',
    category: 'ai',
    valueType: 'string',
  },
  {
    key: 'ai.embedding_dimensions',
    value: 1536,
    description: 'Vector dimensions (must match pgvector column definition)',
    category: 'ai',
    valueType: 'number',
  },
  // Feature Flags
  {
    key: 'features.mcp_enabled',
    value: true,
    description: 'Enable/disable the MCP protocol endpoint',
    category: 'features',
    valueType: 'boolean',
  },
  {
    key: 'features.shadow_personas_enabled',
    value: true,
    description: 'Enable/disable shadow persona creation',
    category: 'features',
    valueType: 'boolean',
  },
  {
    key: 'features.communities_enabled',
    value: true,
    description: 'Enable/disable community features',
    category: 'features',
    valueType: 'boolean',
  },
  {
    key: 'features.url_import_enabled',
    value: true,
    description: 'Enable/disable URL-based trait import',
    category: 'features',
    valueType: 'boolean',
  },
  {
    key: 'features.coach_enabled',
    value: true,
    description: 'Enable/disable the AI coach chat',
    category: 'features',
    valueType: 'boolean',
  },
  {
    key: 'features.public_profiles_enabled',
    value: true,
    description: 'Enable/disable public persona pages (/p/{uri})',
    category: 'features',
    valueType: 'boolean',
  },
  // Cache
  {
    key: 'cache.taxonomy_cache_ttl_seconds',
    value: 3600,
    description: 'How long taxonomy data is cached in memory (seconds)',
    category: 'cache',
    valueType: 'number',
  },
  {
    key: 'cache.metadata_cache_ttl_seconds',
    value: 3600,
    description: 'How long trait metadata is cached in memory (seconds)',
    category: 'cache',
    valueType: 'number',
  },
  {
    key: 'cache.settings_cache_ttl_seconds',
    value: 60,
    description: 'How long settings themselves are cached in memory (seconds)',
    category: 'cache',
    valueType: 'number',
  },
  {
    key: 'cache.contextual_summary_ttl_seconds',
    value: 3600,
    description: 'How long MCP contextual summaries are cached (seconds)',
    category: 'cache',
    valueType: 'number',
  },
  // Import
  {
    key: 'import.max_file_size_mb',
    value: 10,
    description: 'Maximum file size for CSV/ZIP imports in megabytes',
    category: 'import',
    valueType: 'number',
  },
  {
    key: 'import.max_items_per_import',
    value: 500,
    description: 'Maximum items (skills, experiences, etc.) extracted per import',
    category: 'import',
    valueType: 'number',
  },
  {
    key: 'import.max_content_length_kb',
    value: 30,
    description: 'Maximum scraped content length sent to LLM in KB',
    category: 'import',
    valueType: 'number',
  },
  // Defaults
  {
    key: 'defaults.persona_visibility',
    value: 'community',
    description: 'Default visibility level for newly created personas',
    category: 'defaults',
    valueType: 'string',
  },
  {
    key: 'defaults.community_join_policy',
    value: 'approval',
    description: 'Default join policy for new communities',
    category: 'defaults',
    valueType: 'string',
  },
  {
    key: 'defaults.max_community_members',
    value: 500,
    description: 'Default maximum members for a new community',
    category: 'defaults',
    valueType: 'number',
  },
  {
    key: 'defaults.max_personas_per_user',
    value: 10,
    description: 'Maximum personas a user can create',
    category: 'defaults',
    valueType: 'number',
  },
];

export async function seedSystemSettings(db: DB) {
  console.log('Seeding system settings...');

  for (const setting of SETTINGS) {
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, setting.key))
      .limit(1);

    if (existing.length === 0) {
      // New setting -- insert with default as both value and defaultValue
      await db.insert(systemSettings).values({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        valueType: setting.valueType,
        defaultValue: setting.value,
      });
    } else {
      // Existing setting -- update metadata but preserve admin-changed value
      await db
        .update(systemSettings)
        .set({
          description: setting.description,
          category: setting.category,
          valueType: setting.valueType,
          defaultValue: setting.value,
        })
        .where(eq(systemSettings.key, setting.key));
    }
  }

  console.log(`Seeded ${SETTINGS.length} system settings`);
}
```

**Seed behavior:**

| Scenario | `value` | `defaultValue` | `description` / `category` / `valueType` |
|----------|---------|----------------|-------------------------------------------|
| First run (key does not exist) | Set to factory default | Set to factory default | Set from seed definition |
| Re-run (key exists, admin has NOT changed value) | Unchanged | Updated to latest factory default | Updated from seed definition |
| Re-run (key exists, admin HAS changed value) | Preserved (admin override intact) | Updated to latest factory default | Updated from seed definition |
| `--fresh` mode | Reset to factory default | Reset to factory default | Set from seed definition |

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | Developer can define all initial settings in a typed seed registry | `SETTINGS` array with `SettingDefinition` type. 30 initial settings across 6 categories. |
| 2.2 | Developer can seed settings idempotently without overwriting admin changes | Upsert logic: insert if missing, update metadata only if present. `value` only written on first insert or `--fresh`. |
| 2.3 | Developer can add a new setting by adding one entry to the SETTINGS array | Single source of truth. No code changes needed beyond the seed entry and the consumer code that calls `getSetting()`. |

### Edge Cases

- [ ] Developer adds a new setting to SETTINGS array -- next seed run creates it with default value, no admin action needed
- [ ] Developer changes a setting's `defaultValue` in SETTINGS array -- next seed run updates `defaultValue` column, `value` column unchanged
- [ ] Developer removes a setting from SETTINGS array -- row remains in DB (orphaned). Admin can identify orphans where `updatedAt < lastSeedRun` and description hasn't been refreshed. No automatic cleanup.
- [ ] Two settings with the same key in SETTINGS array -- seed script deduplicates by last-wins (but this is a developer bug; lint check recommended)
- [ ] `--fresh` mode -- truncate table, re-insert all settings with factory defaults (same behavior as other seed tables)

---

## 3. Settings Admin Page

### Overview

The admin settings page displays all system settings grouped by category. Each setting shows its current value, factory default, description, last update time, and who changed it. Admins edit settings inline with immediate save per field. The page is the primary control surface for runtime configuration changes.

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ System Settings                                                              │
│ Runtime configuration for Personus. Changes take effect within 60 seconds.   │
│                                                                              │
│ [Rate Limits] [AI Config] [Features] [Cache] [Import] [Defaults]            │
│                                                                              │
│ ── Rate Limits ──────────────────────────────────────────────────────────── │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ URL Scrapes per Hour                                                     │ │
│ │ rate_limits.url_scrape_per_hour                                          │ │
│ │                                                                          │ │
│ │ Maximum URL scrapes per user per hour                                    │ │
│ │                                                                          │ │
│ │ Current: [ 10           ]  [Save]   Default: 10                          │ │
│ │                                                                          │ │
│ │ Last updated: never (factory default)                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ URL Scrapes per Day                                                      │ │
│ │ rate_limits.url_scrape_per_day                                           │ │
│ │                                                                          │ │
│ │ Maximum URL scrapes per user per day                                     │ │
│ │                                                                          │ │
│ │ Current: [ 50           ]  [Save]   Default: 50                          │ │
│ │                                                                          │ │
│ │ Last updated: never (factory default)                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ── AI Config ────────────────────────────────────────────────────────────── │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Coach Model                                                              │ │
│ │ ai.coach_model                                                           │ │
│ │                                                                          │ │
│ │ LLM model for the Persona Coach agent                                   │ │
│ │                                                                          │ │
│ │ Current: [ openai/gpt-4o ]  [Save]   Default: openai/gpt-4o             │ │
│ │                                                                          │ │
│ │ Last updated: 2026-02-20 14:32 by admin@personus.ai                     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ── Features ─────────────────────────────────────────────────────────────── │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ MCP Enabled                                                              │ │
│ │ features.mcp_enabled                                                     │ │
│ │                                                                          │ │
│ │ Enable/disable the MCP protocol endpoint                                │ │
│ │                                                                          │ │
│ │ Current: [x] Enabled     [Save]   Default: Enabled                       │ │
│ │                                                                          │ │
│ │ Last updated: never (factory default)                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                                              │
│ Modified settings (value differs from default):                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ ai.coach_model: "openai/gpt-4o" → "openai/gpt-4o-mini" [Reset]         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

Setting editor by valueType:
- number:  <input type="number">
- string:  <input type="text">
- boolean: <Switch> toggle
- json:    <textarea> with JSON validation
```

### Component Hierarchy

```
apps/admin/app/settings/page.tsx                    <- Server Component (data fetching)
  └─ apps/admin/components/settings-client.tsx      <- Client Component ("use client")
       ├─ apps/admin/components/settings-category.tsx <- Presentational (one category group)
       │    └─ apps/admin/components/setting-card.tsx  <- Presentational (one setting)
       │         ├─ components/ui/input.tsx             <- EXISTS (shared or copied)
       │         ├─ components/ui/switch.tsx            <- EXISTS
       │         ├─ components/ui/textarea.tsx          <- EXISTS
       │         └─ components/ui/button.tsx            <- EXISTS
       ├─ apps/admin/components/settings-tabs.tsx      <- Category tab navigation
       └─ apps/admin/components/modified-settings-summary.tsx <- Shows overridden settings
       └─ calls: apps/admin/app/actions/settings.ts    <- Server Actions
            └─ reads/writes: packages/db/src/schema/system-settings.ts
```

### Editing Behavior

**Per-setting inline editing.** Each setting card has an input field (rendered by `valueType`) and a Save button. There is no global save -- each setting saves independently. This avoids the risk of accidentally bulk-changing multiple settings.

**Input rendering by `valueType`:**

| `valueType` | Input | Validation |
|-------------|-------|------------|
| `number` | `<input type="number">` with step appropriate to the value (1 for integers, 0.1 for decimals) | Must be a valid number. Range validation where applicable (e.g., temperature 0.0-2.0). |
| `string` | `<input type="text">` | Non-empty. Max 500 characters. |
| `boolean` | `<Switch>` toggle from shadcn/ui | No validation needed. |
| `json` | `<textarea>` with monospace font | Must be valid JSON (parsed on save, error shown inline if invalid). |

**Save behavior:**
1. Admin modifies the value in the input.
2. Admin clicks "Save" (or presses Enter for text/number inputs).
3. Server action `updateSetting(key, value)` is called.
4. Server validates the value type matches `valueType` and writes to DB.
5. Audit log entry created with before/after values (see section 5).
6. Settings cache invalidated (see section 4).
7. Toast: "Setting updated" on success, "Failed to update setting" on error.

**Reset to default:** Each setting card whose `value` differs from `defaultValue` shows a "Reset" link. Clicking it sets `value = defaultValue`, logs the change, and invalidates cache.

**Modified settings summary:** Below the category tabs, a collapsible section lists all settings where `value !== defaultValue`. This gives the admin a quick view of what has been customized from factory defaults.

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | Admin can view all system settings grouped by category on the settings page | Server-fetches all rows, groups by `category`, renders tabs. |
| 3.2 | Admin can filter settings by category using tabs | Client-side filtering. All data loaded on mount. Tab bar with 6 categories. |
| 3.3 | Admin can edit a number setting with a number input | `<input type="number">`. Validates on save. Step attribute derived from current value (integer vs decimal). |
| 3.4 | Admin can edit a string setting with a text input | `<input type="text">`. Max 500 chars. |
| 3.5 | Admin can toggle a boolean setting with a switch | `<Switch>`. Saves immediately on toggle (no separate Save button). |
| 3.6 | Admin can edit a JSON setting with a validated textarea | `<textarea>`. `JSON.parse()` validation before save. Syntax error shown inline. |
| 3.7 | Admin can save a setting change with per-field save | "Save" button per card. No global save. Toast feedback. |
| 3.8 | Admin can reset a setting to its factory default | "Reset" link shown when `value !== defaultValue`. Confirmation: "Reset to default?" |
| 3.9 | Admin can see which settings have been modified from defaults | "Modified settings" summary section. Lists key + before/after. Quick navigation to each. |
| 3.10 | Admin can see when and by whom a setting was last changed | `updatedAt` + `updatedBy` displayed on each card. "never (factory default)" if `updatedBy` is null. |

### Server Actions

```typescript
// apps/admin/app/actions/settings.ts

// [Admin] required. Returns all settings, grouped by category.
listSettings(): Promise<Record<string, SystemSetting[]>>

// [Admin] required. Updates a single setting value. Validates valueType.
// Logs to admin_audit_log. Invalidates settings cache.
updateSetting(key: string, value: unknown): Promise<{ success: boolean; error?: string }>

// [Admin] required. Resets a setting to its defaultValue.
// Logs to admin_audit_log. Invalidates settings cache.
resetSetting(key: string): Promise<{ success: boolean }>
```

### Validation

```typescript
// packages/validations/src/settings.ts

import { z } from 'zod';

export const settingCategories = [
  'rate_limits',
  'ai',
  'features',
  'cache',
  'import',
  'defaults',
] as const;
export type SettingCategory = (typeof settingCategories)[number];

export const settingValueTypes = ['string', 'number', 'boolean', 'json'] as const;
export type SettingValueType = (typeof settingValueTypes)[number];

export const updateSettingSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_.]+$/, 'Invalid setting key format'),
  value: z.unknown(),
});

export const settingKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_.]+$/, 'Invalid setting key format');
```

### Edge Cases

- [ ] Admin changes `ai.embedding_dimensions` -- this is a read-only display value; changing it does NOT alter the pgvector column definition. A warning should note: "Changing this value does not modify the database schema. Coordinate with a developer."
- [ ] Admin sets `rate_limits.url_scrape_per_hour` to 0 -- effectively disables URL scraping. Valid but should show a warning: "Setting this to 0 will block all URL scraping."
- [ ] Admin sets `ai.coach_temperature` to a value outside 0.0-2.0 -- server action rejects with validation error
- [ ] Admin enters invalid JSON in a `json` type field -- `JSON.parse()` fails, error shown inline, save blocked
- [ ] Two admins edit the same setting simultaneously -- last write wins (no optimistic locking for settings)
- [ ] Admin tries to create a new setting via the UI -- not allowed. New settings are developer-only (added via seed script).
- [ ] Boolean toggle saves immediately -- no separate Save button click needed for toggles (saves on toggle)

### Test Criteria

**Unit tests:**
- `updateSettingSchema` accepts valid key formats and rejects invalid ones
- `updateSetting()` rejects non-number values for `valueType: 'number'` settings
- `updateSetting()` rejects invalid JSON for `valueType: 'json'` settings
- `resetSetting()` sets value to defaultValue

**Integration tests:**
- `listSettings()` returns all settings grouped by category
- `updateSetting()` writes new value to DB and creates audit log entry
- `resetSetting()` restores default and creates audit log entry

**E2E tests:**
- Admin views settings page, sees all categories
- Admin changes a number setting, verifies toast and new value persists on reload
- Admin toggles a feature flag, verifies immediate save
- Admin resets a modified setting, verifies default restored

---

## 4. Settings Read API

### Overview

Both the consumer app and admin app need to read settings at runtime. A shared `getSettings()` / `getSetting(key)` helper lives in `@personus/db` and provides in-memory caching with a configurable TTL. The cache is a simple `Map` with timestamp-based expiry -- not Next.js `unstable_cache`, not Redis, not `revalidateTag`. This keeps the implementation portable and predictable across both apps.

### Read Helper

```typescript
// packages/db/src/settings.ts

import { eq } from 'drizzle-orm';
import type { DB } from './index';
import { systemSettings } from './schema/system-settings';

/**
 * In-memory settings cache.
 *
 * Structure: Map<key, { value: unknown; expiresAt: number }>
 *
 * This is a process-level cache — each serverless function invocation
 * gets its own cache instance. In Vercel's edge runtime, function instances
 * are reused for ~5 minutes, so the cache provides real benefit during
 * traffic bursts without risk of serving stale data for long.
 *
 * Cache TTL is itself a setting (cache.settings_cache_ttl_seconds),
 * but we bootstrap with a hardcoded default of 60s to avoid the
 * chicken-and-egg problem.
 */
const BOOTSTRAP_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Module-level DB reference, set by initSettings()
let dbRef: DB | null = null;

/**
 * Initialize the settings reader with a database connection.
 * Call once at app startup (e.g., in a layout.tsx or middleware).
 */
export function initSettings(db: DB): void {
  dbRef = db;
}

/**
 * Get a single setting value by key.
 *
 * Returns the cached value if fresh, otherwise queries the DB.
 * Falls back to the provided defaultValue if the setting does not
 * exist in the DB (pre-migration safety).
 */
export async function getSetting<T = unknown>(
  key: string,
  defaultValue?: T,
): Promise<T> {
  // Check cache
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  // Query DB
  if (!dbRef) {
    console.warn(`Settings not initialized. Returning default for "${key}".`);
    return defaultValue as T;
  }

  try {
    const [row] = await dbRef
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    if (!row) {
      // Setting not in DB -- use provided default
      if (defaultValue !== undefined) {
        cacheSet(key, defaultValue);
        return defaultValue;
      }
      throw new Error(`Setting "${key}" not found and no default provided`);
    }

    cacheSet(key, row.value);
    return row.value as T;
  } catch (error) {
    // DB query failed -- return default if available
    if (defaultValue !== undefined) {
      console.warn(`Failed to read setting "${key}", using default:`, error);
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Get all settings, optionally filtered by category.
 * Used by the admin page to load all settings at once.
 */
export async function getSettings(
  category?: string,
): Promise<Record<string, unknown>> {
  if (!dbRef) {
    console.warn('Settings not initialized.');
    return {};
  }

  const query = category
    ? dbRef
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category))
    : dbRef.select().from(systemSettings);

  const rows = await query;
  const result: Record<string, unknown> = {};

  for (const row of rows) {
    result[row.key] = row.value;
    cacheSet(row.key, row.value);
  }

  return result;
}

/**
 * Invalidate the entire settings cache.
 * Called by the admin app after writing a setting.
 */
export function invalidateSettingsCache(): void {
  cache.clear();
}

/**
 * Invalidate a single setting from cache.
 * Called by the admin app after updating one setting.
 */
export function invalidateSetting(key: string): void {
  cache.delete(key);
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + BOOTSTRAP_TTL_MS,
  });
}
```

### Consumer App Integration

Code that currently uses hardcoded values migrates to `getSetting()` calls:

```typescript
// Before (lib/mastra/agents/persona-coach.ts line 289):
model: 'openai/gpt-4o',

// After:
model: await getSetting<string>('ai.coach_model', 'openai/gpt-4o'),
```

```typescript
// Before (lib/embeddings/index.ts line 14):
const embeddingModel = openai.textEmbeddingModel('text-embedding-3-small');

// After:
const modelName = await getSetting<string>('ai.embedding_model', 'text-embedding-3-small');
const embeddingModel = openai.textEmbeddingModel(modelName);
```

```typescript
// Before (lib/personas/completeness.ts line 16-26):
const MAX_SCORES: CompletenessBreakdown = { headline: 15, skills: 20, ... };

// After (completeness weights remain hardcoded for v1):
// Completeness weights are a structured algorithm, not a simple setting.
// Moving individual weights to settings is a future enhancement.
// For v1, the setting controls whether completeness is calculated at all:
const completenessEnabled = await getSetting<boolean>('features.coach_enabled', true);
```

```typescript
// Before (app/actions/import.ts — rate limit check):
const SCRAPE_LIMIT_PER_HOUR = 10;

// After:
const limitPerHour = await getSetting<number>('rate_limits.url_scrape_per_hour', 10);
```

**Important:** Every `getSetting()` call includes a hardcoded fallback as the second argument. This ensures the app works correctly before the settings table exists (pre-migration) and if the DB is unreachable. The fallback matches the factory default from the seed script.

### Feature Flag Pattern

Feature flags gate entire features at the server action level:

```typescript
// Pattern for feature-gating a server action

export async function createShadowPersona(input: CreateShadowPersonaInput) {
  const enabled = await getSetting<boolean>('features.shadow_personas_enabled', true);
  if (!enabled) {
    throw new Error('Shadow personas are currently disabled');
  }
  // ... existing logic
}
```

For UI-level gating, the consumer app fetches relevant flags in a layout or page server component and passes them as props:

```typescript
// app/(dashboard)/layout.tsx (server component)
const flags = {
  mcpEnabled: await getSetting<boolean>('features.mcp_enabled', true),
  coachEnabled: await getSetting<boolean>('features.coach_enabled', true),
  communitiesEnabled: await getSetting<boolean>('features.communities_enabled', true),
};

// Pass to client components as props or via React context
```

### Cache Invalidation

When the admin app writes a setting, it invalidates the local cache. However, the consumer app runs in separate serverless function instances. The consumer app's cache expires naturally via TTL (default 60 seconds). There is no cross-process cache invalidation for v1.

**Why this is acceptable:**
- Settings change infrequently (minutes/hours between changes, not seconds).
- A 60-second propagation delay is fine for rate limits, model selection, and feature flags.
- If an admin needs immediate propagation (e.g., disabling a feature due to abuse), they can trigger a Vercel redeploy of the consumer app, which clears all process-level caches.

**Future enhancement:** For sub-second propagation, add a `settings_version` row that increments on every write. The consumer app checks this single row periodically and invalidates its cache when the version changes. This adds one lightweight query per TTL interval instead of querying all settings.

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | Developer can initialize the settings reader with a DB connection at app startup | `initSettings(db)` called once per app. Consumer: `apps/web/app/layout.tsx`. Admin: `apps/admin/app/layout.tsx`. |
| 4.2 | Developer can read a single setting with a typed fallback | `getSetting<number>('rate_limits.url_scrape_per_hour', 10)`. Returns cached value or queries DB. Falls back to default if DB unavailable. |
| 4.3 | Developer can read all settings for a category | `getSettings('ai')` returns `Record<string, unknown>`. Used by admin page to bulk-load settings. |
| 4.4 | System caches settings in-memory with configurable TTL | Process-level `Map` cache. Default 60s TTL. No external cache dependency. |
| 4.5 | Admin app can invalidate cache after writing a setting | `invalidateSetting(key)` called after `updateSetting()`. Forces next read to hit DB. |
| 4.6 | Consumer app reads settings correctly before the settings table exists | `getSetting()` catches DB errors and returns the fallback default. No startup failure. |
| 4.7 | Developer can migrate existing hardcoded values to getSetting() calls | Each hardcoded value replaced with `getSetting(key, currentHardcodedValue)`. Fallback matches existing behavior. |

### Edge Cases

- [ ] Settings table does not exist (pre-migration) -- `getSetting()` catches the query error and returns the fallback default, logs a warning
- [ ] DB connection lost during runtime -- cached values continue to serve until TTL expires, then fallback defaults kick in
- [ ] Cache TTL set to 0 -- every read hits DB (no caching). Valid but not recommended.
- [ ] Admin changes `cache.settings_cache_ttl_seconds` -- takes effect after the current cache entries expire (bootstrap TTL used internally, not self-referential to avoid chicken-and-egg)
- [ ] Concurrent reads for the same key -- both queries hit DB (Map is not locked). Second write overwrites first in cache (same value). Harmless.
- [ ] `getSetting()` called in a client component -- not supported. Settings are server-only. Client components receive settings via props from server components.

### Test Criteria

**Unit tests:**
- `getSetting()` returns cached value when cache is fresh
- `getSetting()` queries DB when cache is expired
- `getSetting()` returns fallback when DB is unavailable
- `invalidateSetting()` forces next read to query DB
- `invalidateSettingsCache()` clears all cached entries
- `getSettings('ai')` returns only AI category settings

**Integration tests:**
- `getSetting()` reads a value written by `updateSetting()`
- Cache respects TTL -- stale entries are refreshed from DB
- `initSettings()` with a valid DB connection enables DB reads

---

## 5. Settings Audit

### Overview

Every setting change is logged to the `admin_audit_log` table with before and after values, the admin who made the change, and a timestamp. The audit log is append-only and immutable -- rows are never updated or deleted. This provides a complete history of every runtime configuration change.

The `admin_audit_log` table is defined in `05-user-and-community-ops.md` as part of the broader admin audit system. This section defines the audit integration specific to settings changes.

### Audit Log Entry Format

```typescript
// Audit log entry created by settings changes
// Table defined in 05-user-and-community-ops.md — referenced here for settings usage

interface SettingsAuditEntry {
  id: string;                    // UUID
  action: 'setting_updated' | 'setting_reset';
  entityType: 'system_setting';
  entityId: string;              // setting key (e.g., 'ai.coach_model')
  adminUserId: string;           // Clerk user ID
  before: unknown;               // previous value (JSONB)
  after: unknown;                // new value (JSONB)
  metadata: {
    category: string;            // setting category
    valueType: string;           // setting valueType
    wasDefault: boolean;         // was the previous value the factory default?
    isDefault: boolean;          // is the new value the factory default?
  };
  createdAt: Date;
}
```

### Audit Schema

```typescript
// packages/db/src/schema/admin-audit-log.ts
// This table serves all admin audit needs (settings, taxonomy, metadata, user ops).
// Defined here for the settings spec; expanded in 05-user-and-community-ops.md.

import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  adminUserId: text('admin_user_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
```

### Audit Integration in Settings Actions

```typescript
// Inside updateSetting() server action (simplified):

async function updateSetting(key: string, newValue: unknown) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (!existing) throw new Error(`Setting "${key}" not found`);

  // Validate value type
  validateValueType(existing.valueType, newValue);

  const previousValue = existing.value;

  // Update setting
  await db
    .update(systemSettings)
    .set({
      value: newValue,
      updatedAt: new Date(),
      updatedBy: adminUserId,
    })
    .where(eq(systemSettings.key, key));

  // Write audit log
  await db.insert(adminAuditLog).values({
    action: 'setting_updated',
    entityType: 'system_setting',
    entityId: key,
    adminUserId,
    before: previousValue,
    after: newValue,
    metadata: {
      category: existing.category,
      valueType: existing.valueType,
      wasDefault: JSON.stringify(previousValue) === JSON.stringify(existing.defaultValue),
      isDefault: JSON.stringify(newValue) === JSON.stringify(existing.defaultValue),
    },
  });

  // Invalidate cache
  invalidateSetting(key);

  return { success: true };
}
```

### Viewing Audit History

The settings admin page includes a "History" link on each setting card that opens a slide-over or sub-page showing the change history for that specific setting key. The full audit log viewer is specified in `05-user-and-community-ops.md`.

```
Setting history slide-over:
┌──────────────────────────────────────────────────────────────────┐
│ History: ai.coach_model                              [Close]     │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 2026-02-20 14:32 — admin@personus.ai                        │ │
│ │ Changed: "openai/gpt-4o" → "openai/gpt-4o-mini"            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 2026-02-18 09:15 — admin@personus.ai                        │ │
│ │ Reset to default: "openai/gpt-4o"                           │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 2026-02-17 11:00 — admin@personus.ai                        │ │
│ │ Changed: "openai/gpt-4o" → "openai/gpt-4o-mini"            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 2026-02-15 — System                                         │ │
│ │ Initialized with default: "openai/gpt-4o"                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | System logs an audit entry when an admin updates a setting | `admin_audit_log` row with action `setting_updated`. Before/after JSONB values. Metadata includes category and default status. |
| 5.2 | System logs an audit entry when an admin resets a setting to default | `admin_audit_log` row with action `setting_reset`. After value equals defaultValue. |
| 5.3 | Admin can view the change history for a specific setting | History slide-over shows all audit entries for `entityType: 'system_setting'` and `entityId: key`. Ordered by `createdAt` descending. |

### Edge Cases

- [ ] Admin updates a setting to the same value it already has -- still logged (idempotent write, before === after). Harmless but visible in history.
- [ ] Admin account deleted after making changes -- audit log preserves the `adminUserId`. UI shows "Unknown admin" if the Clerk account no longer resolves.
- [ ] Very frequent changes to the same setting (e.g., rate limit tuning) -- no aggregation or deduplication. Each change is a separate log entry.
- [ ] Audit log grows large (years of operation) -- pagination required. Index on `(entity_type, entity_id, created_at DESC)` supports efficient per-setting queries.

### Test Criteria

**Unit tests:**
- `updateSetting()` creates an audit log entry with correct before/after values
- `resetSetting()` creates an audit log entry with action `setting_reset`
- Audit entry `metadata.wasDefault` and `metadata.isDefault` are correctly computed

**Integration tests:**
- Multiple changes to the same setting produce multiple audit entries in correct order
- Audit entries are queryable by `entityId` (setting key) and ordered by `createdAt`

---

## 6. Implementation Order

### Phase 1: Schema & Seed (foundation -- no UI)

1. Create `packages/db/src/schema/system-settings.ts` with table definition and types (story 1.1)
2. Create `packages/db/src/schema/admin-audit-log.ts` with table definition and types (story 5.1)
3. Export both new tables from `packages/db/src/schema/index.ts` (story 1.1)
4. Push schema to database via `db:push` (story 1.2)
5. Create `packages/db/src/seed/system-settings.ts` with all 30 initial settings (stories 2.1, 2.2)
6. Wire seed script into the main seed runner (story 2.2)
7. Run seed to populate settings table (story 2.3)

### Phase 2: Read API (enables consumer app migration)

8. Create `packages/db/src/settings.ts` with `getSetting()`, `getSettings()`, `initSettings()`, cache logic (stories 4.1, 4.2, 4.3, 4.4)
9. Create `packages/validations/src/settings.ts` with Zod schemas (story 3.7)
10. Write unit tests for `getSetting()` caching behavior and fallback logic (story 4.6)
11. Call `initSettings(db)` in consumer app layout (story 4.1) -- requires step 8

### Phase 3: Consumer app migration (incremental, one file at a time)

12. Replace hardcoded model strings in `lib/mastra/agents/persona-coach.ts` with `getSetting()` (story 4.7)
13. Replace hardcoded model strings in `lib/mastra/agents/recommender-and-discovery.ts` with `getSetting()` (story 4.7)
14. Replace hardcoded model in `lib/embeddings/index.ts` with `getSetting()` (story 4.7)
15. Replace hardcoded rate limits in import actions with `getSetting()` (story 4.7)
16. Add feature flag checks to gated server actions (story 4.7)
17. Pass feature flags from dashboard layout to client components (story 4.7)

### Phase 4: Admin UI

18. Create `apps/admin/app/actions/settings.ts` with `listSettings()`, `updateSetting()`, `resetSetting()` server actions (stories 3.7, 3.8)
19. Wire audit logging into `updateSetting()` and `resetSetting()` (stories 5.1, 5.2)
20. Create `apps/admin/components/setting-card.tsx` with type-specific input rendering (stories 3.3, 3.4, 3.5, 3.6)
21. Create `apps/admin/components/settings-category.tsx` grouping component (story 3.1)
22. Create `apps/admin/components/settings-tabs.tsx` tab navigation (story 3.2)
23. Create `apps/admin/components/modified-settings-summary.tsx` (story 3.9)
24. Create `apps/admin/components/settings-client.tsx` composing all sub-components (story 3.1)
25. Create `apps/admin/app/settings/page.tsx` server component with data fetching (story 3.1)
26. Create setting history slide-over component (story 5.3) -- requires step 19

### Phase 5: Tests

27. Write integration tests for `updateSetting()` + audit log (stories 5.1, 5.2)
28. Write integration tests for cache invalidation across read/write cycle (story 4.5)
29. Write E2E tests for admin settings page (stories 3.1-3.10)

---

## Appendix: Linear Issue Mapping

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Define system_settings table schema in shared DB package | `platform-ops`, `schema` | -- | -- |
| 1.2 | Push system_settings table to database | `platform-ops`, `schema` | 1.1 | -- |
| 1.3 | Create settings seed script with factory defaults | `platform-ops`, `seed` | 1.1 | -- |
| 2.1 | Define all initial settings in typed seed registry | `platform-ops`, `seed` | 1.1 | -- |
| 2.2 | Implement idempotent seed logic preserving admin overrides | `platform-ops`, `seed` | 2.1 | -- |
| 2.3 | Add new setting by adding one entry to SETTINGS array | `platform-ops`, `seed` | 2.1 | -- |
| 3.1 | Admin can view all system settings grouped by category | `platform-ops`, `admin-ui` | 4.1 | -- |
| 3.2 | Admin can filter settings by category using tabs | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.3 | Admin can edit a number setting with a number input | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.4 | Admin can edit a string setting with a text input | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.5 | Admin can toggle a boolean setting with a switch | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.6 | Admin can edit a JSON setting with a validated textarea | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.7 | Admin can save a setting change with per-field save | `platform-ops`, `admin-ui` | 3.3, 3.4, 3.5, 3.6 | -- |
| 3.8 | Admin can reset a setting to factory default | `platform-ops`, `admin-ui` | 3.7 | -- |
| 3.9 | Admin can see which settings have been modified from defaults | `platform-ops`, `admin-ui` | 3.1 | -- |
| 3.10 | Admin can see when and by whom a setting was last changed | `platform-ops`, `admin-ui` | 3.1 | -- |
| 4.1 | Initialize settings reader with DB connection at app startup | `platform-ops`, `read-api` | 1.1 | -- |
| 4.2 | Read a single setting with typed fallback via getSetting() | `platform-ops`, `read-api` | 4.1 | -- |
| 4.3 | Read all settings for a category via getSettings() | `platform-ops`, `read-api` | 4.1 | -- |
| 4.4 | Cache settings in-memory with configurable TTL | `platform-ops`, `read-api` | 4.2 | -- |
| 4.5 | Admin app can invalidate cache after writing a setting | `platform-ops`, `read-api` | 4.4 | -- |
| 4.6 | Consumer app reads settings before settings table exists | `platform-ops`, `read-api` | 4.2 | -- |
| 4.7 | Migrate hardcoded values to getSetting() calls | `platform-ops`, `migration` | 4.2 | -- |
| 5.1 | System logs audit entry when admin updates a setting | `platform-ops`, `audit` | 3.7 | -- |
| 5.2 | System logs audit entry when admin resets a setting | `platform-ops`, `audit` | 3.8 | -- |
| 5.3 | Admin can view change history for a specific setting | `platform-ops`, `audit`, `admin-ui` | 5.1 | -- |

**Conventions:**
- Story titles follow "Actor can DO THING" format for user-facing stories and imperative form for system/developer stories
- Labels include the spec suite (`platform-ops`) and feature area (`schema`, `seed`, `admin-ui`, `read-api`, `migration`, `audit`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
