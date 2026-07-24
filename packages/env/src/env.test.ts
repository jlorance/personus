import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env, resetEnvForTests, validateEnv } from './index';

// Snapshot/restore process.env so each case is isolated.
const ORIGINAL = { ...process.env };

/** Replace process.env with a clean slate plus the given overrides. */
function setEnv(overrides: Record<string, string>): void {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, overrides);
  resetEnvForTests();
}

const FULL_PROD = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@host/db',
  AUTH_PROVIDER: 'clerk',
  CLERK_SECRET_KEY: 'sk_test_x',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x',
  OPENAI_API_KEY: 'sk-x',
};

beforeEach(() => {
  resetEnvForTests();
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
  resetEnvForTests();
  vi.restoreAllMocks();
});

describe('env parsing', () => {
  it('returns undefined for absent optional vars (build-tolerant)', () => {
    setEnv({});
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.SETTINGS_CACHE_TTL_MS).toBeUndefined();
  });

  it('coerces numeric knobs to numbers', () => {
    setEnv({ SETTINGS_CACHE_TTL_MS: '30000' });
    expect(env.SETTINGS_CACHE_TTL_MS).toBe(30000);
  });

  it('throws on a malformed numeric knob', () => {
    setEnv({ TIMEOUT_LLM_MS: 'not-a-number' });
    expect(() => env.TIMEOUT_LLM_MS).toThrow(/Invalid environment variables/);
  });

  it('throws on a malformed URL', () => {
    setEnv({ DATABASE_URL: 'not a url' });
    expect(() => env.DATABASE_URL).toThrow(/Invalid environment variables/);
  });
});

describe('validateEnv', () => {
  it('passes when all required prod vars are present', () => {
    setEnv(FULL_PROD);
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws in production with an aggregated message when required vars are missing', () => {
    setEnv({ NODE_ENV: 'production' });
    expect(() => validateEnv()).toThrow(/DATABASE_URL[\s\S]*OPENAI_API_KEY/);
  });

  it('only warns (does not throw) outside production', () => {
    setEnv({ NODE_ENV: 'development' });
    expect(() => validateEnv()).not.toThrow();
  });

  it('requires a channel webhook secret once its bot token is set', () => {
    setEnv({ ...FULL_PROD, SLACK_BOT_TOKEN: 'xoxb-x' });
    expect(() => validateEnv()).toThrow(/SLACK_SIGNING_SECRET/);
  });

  it('does not require Clerk keys when AUTH_PROVIDER is not clerk', () => {
    setEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://u:p@host/db',
      AUTH_PROVIDER: 'workos',
      OPENAI_API_KEY: 'sk-x',
    });
    expect(() => validateEnv()).not.toThrow();
  });
});
