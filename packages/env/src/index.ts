/**
 * Environment configuration — the single declaration + validation seam for every
 * `process.env` value the platform reads.
 *
 * Two layers, mirroring the rest of the config stack:
 *   - `env`         — a lazily-parsed, typed view of process.env. Access is
 *                     tolerant: absent optional vars are `undefined`, so importing
 *                     this never crashes a build that doesn't touch them (the same
 *                     tolerance the lazy DB proxy relies on). Only *malformed*
 *                     values (e.g. a non-numeric TIMEOUT_LLM_MS) throw on access.
 *   - `validateEnv()` — fail-fast startup check. Enforces requiredness with
 *                     environment awareness: hard error in production, warning in
 *                     dev/test so the app still boots for UI-only work without a DB.
 *
 * Secrets and per-environment values live here (ENV). Runtime-tunable product
 * settings live in `system_settings` (@personus/db). Domain literals live in
 * `@personus/constants`. This file is the ENV tier of that split.
 */

import { logger } from '@personus/logger';
import { z } from 'zod';

/** Optional millisecond duration supplied as a string env var. */
const optionalPositiveInt = z.coerce.number().int().positive().optional();

const EnvSchema = z.object({
  // ─── Runtime ───────────────────────────────────────────────────────────────
  NODE_ENV: z.string().optional(),

  // ─── Database (Neon Postgres) ────────────────────────────────────────────────
  DATABASE_URL: z.string().url().optional(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  TEST_DATABASE_URL: z.string().url().optional(),

  // ─── AuthN provider (pluggable) ──────────────────────────────────────────────
  // Kept as a free string: the factory tolerates unknown values with a warning.
  AUTH_PROVIDER: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // ─── Feature-flag provider (OpenFeature, pluggable) ──────────────────────────
  FLAGS_PROVIDER: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  LAUNCHDARKLY_SDK_KEY: z.string().optional(),

  // ─── Token compression (pluggable, off by default) ───────────────────────────
  // `noop` (default) is a passthrough. `headroom` requires HEADROOM_PROXY_URL and
  // is gated on the vetting spike before it goes on in any live path.
  COMPRESSION_PROVIDER: z.string().optional(),
  HEADROOM_PROXY_URL: z.string().url().optional(),
  HEADROOM_API_KEY: z.string().optional(),

  // ─── AI (Mastra + OpenAI) ────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().optional(),
  MASTRA_LOG_LEVEL: z.string().optional(),
  LOG_LEVEL: z.string().optional(),

  // ─── CopilotKit runtime ──────────────────────────────────────────────────────
  NEXT_PUBLIC_COPILOT_RUNTIME_URL: z.string().optional(),

  // ─── PlatformChannels (Mastra bots) ──────────────────────────────────────────
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // ─── Operational tuning knobs (safe defaults live in code) ───────────────────
  TIMEOUT_LLM_MS: optionalPositiveInt,
  TIMEOUT_EMBED_MS: optionalPositiveInt,
  TIMEOUT_DB_MS: optionalPositiveInt,
  SETTINGS_CACHE_TTL_MS: optionalPositiveInt,
});

export type Env = z.infer<typeof EnvSchema>;

function formatIssues(error: z.ZodError): string {
  const lines = error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  return `Invalid environment variables:\n${lines.join('\n')}`;
}

let _cache: Env | undefined;

function load(): Env {
  if (!_cache) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      // Malformed values are always fatal — a bad TIMEOUT/URL is never intended.
      throw new Error(formatIssues(parsed.error));
    }
    _cache = parsed.data;
  }
  return _cache;
}

/**
 * Typed, lazily-parsed view of process.env. Reading a key parses on first access
 * and caches. Absent optional vars are `undefined`; malformed values throw.
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return load()[prop as keyof Env];
  },
});

/** Reset the parse cache (tests only). */
export function resetEnvForTests(): void {
  _cache = undefined;
}

/**
 * Fail-fast startup validation. Call once at boot (app instrumentation). Parses
 * all values (throws on malformed) then checks requiredness:
 *   - production → aggregated hard error,
 *   - dev/test   → warning, so UI-only work can run without a full env.
 */
export function validateEnv(): void {
  const e = load();
  const isProd = e.NODE_ENV === 'production';
  const problems: string[] = [];

  if (!e.DATABASE_URL) {
    problems.push('DATABASE_URL is required (Postgres connection)');
  }

  const authProvider = (e.AUTH_PROVIDER ?? 'clerk').toLowerCase();
  if (authProvider === 'clerk') {
    if (!e.CLERK_SECRET_KEY) {
      problems.push('CLERK_SECRET_KEY is required when AUTH_PROVIDER=clerk');
    }
    if (!e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      problems.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required when AUTH_PROVIDER=clerk');
    }
  }

  if (!e.OPENAI_API_KEY) {
    problems.push('OPENAI_API_KEY is required (embeddings + agents)');
  }

  if ((e.COMPRESSION_PROVIDER ?? 'noop').toLowerCase() === 'headroom' && !e.HEADROOM_PROXY_URL) {
    problems.push('HEADROOM_PROXY_URL is required when COMPRESSION_PROVIDER=headroom');
  }

  // A channel that's enabled (bot token present) must carry its webhook secret,
  // or inbound webhook verification silently can't be enforced.
  if (e.SLACK_BOT_TOKEN && !e.SLACK_SIGNING_SECRET) {
    problems.push('SLACK_SIGNING_SECRET is required when SLACK_BOT_TOKEN is set');
  }
  if (e.DISCORD_BOT_TOKEN && !e.DISCORD_PUBLIC_KEY) {
    problems.push('DISCORD_PUBLIC_KEY is required when DISCORD_BOT_TOKEN is set');
  }
  if (e.TELEGRAM_BOT_TOKEN && !e.TELEGRAM_WEBHOOK_SECRET) {
    problems.push('TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_BOT_TOKEN is set');
  }

  if (problems.length === 0) return;

  if (isProd) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }
  logger.warn(
    { problems },
    'Environment configuration incomplete (non-production) — continuing with reduced functionality',
  );
}
