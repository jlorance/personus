/**
 * system_settings seed registry + idempotent seeder.
 *
 * `SettingDef` is a discriminated union keyed on `valueType`, so a setting's
 * `value` MUST match its declared type at compile time. Includes the six
 * `features.*` flags read by the DB feature-flag provider (@personus/flags).
 *
 * Idempotency: insert on first run (value === defaultValue); on re-run, refresh
 * metadata only and PRESERVE any admin-overridden `value`.
 */

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { systemSettings } from '../schema';

export type SettingDef =
  | { key: string; valueType: 'string'; value: string; category: string; description: string }
  | { key: string; valueType: 'number'; value: number; category: string; description: string }
  | { key: string; valueType: 'boolean'; value: boolean; category: string; description: string }
  | {
      key: string;
      valueType: 'json';
      value: Record<string, unknown>;
      category: string;
      description: string;
    };

export const SYSTEM_SETTINGS: readonly SettingDef[] = [
  // ─── AI configuration ────────────────────────────────────────────────────
  {
    key: 'ai.default_llm_model',
    value: 'openai/gpt-4o',
    valueType: 'string',
    category: 'ai',
    description: 'Default LLM model for agents without a specific override',
  },
  {
    key: 'ai.coach_model',
    value: 'openai/gpt-4o',
    valueType: 'string',
    category: 'ai',
    description: 'LLM model for the Persona Coach agent',
  },
  {
    key: 'ai.discovery_model',
    value: 'openai/gpt-4o',
    valueType: 'string',
    category: 'ai',
    description: 'LLM model for the Discovery agent',
  },
  {
    key: 'ai.recommender_model',
    value: 'openai/gpt-4o',
    valueType: 'string',
    category: 'ai',
    description: 'LLM model for the Recommender agent',
  },
  {
    key: 'ai.embedding_model',
    value: 'text-embedding-3-small',
    valueType: 'string',
    category: 'ai',
    description: 'OpenAI embedding model for persona/community vectors',
  },
  {
    key: 'ai.embedding_dimensions',
    value: 1536,
    valueType: 'number',
    category: 'ai',
    description: 'Vector dimensions (LOCKED — must match the pgvector column)',
  },
  {
    key: 'ai.completeness_weights',
    value: {
      headline: 15,
      skills: 20,
      qualities: 15,
      values: 10,
      seekingOpportunities: 10,
      offerings: 15,
      focusAreas: 15,
    },
    valueType: 'json',
    category: 'ai',
    description: 'Persona completeness dimension weights — should sum to 100',
  },

  // ─── Feature flags (read via @personus/flags DbProvider) ──────────────────
  {
    key: 'features.mcp_enabled',
    value: true,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable the MCP protocol endpoint',
  },
  {
    key: 'features.shadow_personas_enabled',
    value: true,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable shadow persona creation',
  },
  {
    key: 'features.communities_enabled',
    value: true,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable community features',
  },
  {
    key: 'features.platform_channels_enabled',
    value: false,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable PlatformChannels bots (Slack/Discord/Telegram via Mastra)',
  },
  {
    key: 'features.coach_enabled',
    value: true,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable the AI Persona Coach chat',
  },
  {
    key: 'features.public_profiles_enabled',
    value: true,
    valueType: 'boolean',
    category: 'features',
    description: 'Enable/disable public persona pages (/p/{uri})',
  },
] as const;

/** Idempotently seed all settings. Preserves admin-overridden `value` on re-run. */
export async function seedSystemSettings(): Promise<void> {
  for (const s of SYSTEM_SETTINGS) {
    const existing = await db
      .select({ key: systemSettings.key })
      .from(systemSettings)
      .where(eq(systemSettings.key, s.key));

    if (existing.length === 0) {
      await db.insert(systemSettings).values({
        key: s.key,
        value: s.value,
        defaultValue: s.value,
        description: s.description,
        category: s.category,
        valueType: s.valueType,
        updatedBy: 'system:seed',
      });
    } else {
      await db
        .update(systemSettings)
        .set({
          defaultValue: s.value,
          description: s.description,
          category: s.category,
          valueType: s.valueType,
        })
        .where(eq(systemSettings.key, s.key));
    }
  }
}
