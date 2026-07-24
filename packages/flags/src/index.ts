/**
 * Feature flags — OpenFeature (CNCF standard) as the vendor-neutral seam.
 *
 * `FLAGS_PROVIDER` selects the backend (db | posthog | launchdarkly). The DB
 * provider is the default and reads `system_settings`. Call sites use the thin
 * `flags.isEnabled()` / `flags.getString()` helpers below and never touch a
 * vendor SDK — swapping providers is a one-env-var change.
 */

import { OpenFeature, type Provider } from '@openfeature/server-sdk';
import { env } from '@personus/env';
import { logger } from '@personus/logger';
import { DbProvider } from './providers/db-provider';
import { createLaunchDarklyProvider, createPostHogProvider } from './providers/stubs';

let initialized = false;

function selectProvider(): Provider {
  const name = (env.FLAGS_PROVIDER ?? 'db').toLowerCase();
  if (name === 'db') return new DbProvider();
  try {
    if (name === 'posthog') return createPostHogProvider();
    if (name === 'launchdarkly') return createLaunchDarklyProvider();
    logger.warn({ provider: name }, 'Unknown FLAGS_PROVIDER — falling back to db');
  } catch (err) {
    // A misconfigured/unwired provider must not permanently 500 every flagged
    // route (initFlags would keep re-throwing). Degrade to the DB provider.
    logger.error({ provider: name, err: String(err) }, 'FLAGS_PROVIDER unavailable — using db');
  }
  return new DbProvider();
}

/** Idempotently register the selected provider with OpenFeature. */
export function initFlags(): void {
  if (initialized) return;
  OpenFeature.setProvider(selectProvider());
  initialized = true;
}

function client() {
  initFlags();
  return OpenFeature.getClient();
}

/** Thin, ergonomic wrappers over the OpenFeature client. */
export const flags = {
  isEnabled(key: string, defaultValue = false): Promise<boolean> {
    return client().getBooleanValue(key, defaultValue);
  },
  getString(key: string, defaultValue = ''): Promise<string> {
    return client().getStringValue(key, defaultValue);
  },
  getNumber(key: string, defaultValue = 0): Promise<number> {
    return client().getNumberValue(key, defaultValue);
  },
};

export { DbProvider } from './providers/db-provider';
