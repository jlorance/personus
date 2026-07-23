/**
 * DbProvider — the default OpenFeature provider, backed by `system_settings`.
 *
 * Ports the inherited DB-backed flag approach onto the OpenFeature standard: it
 * reads through the cached, fail-closed `getSetting()` helper. Flag keys are
 * namespaced under `features.` — callers pass the short key (`mcp_enabled`) and
 * the provider resolves `features.mcp_enabled`.
 */

import type {
  EvaluationContext,
  JsonValue,
  Provider,
  ResolutionDetails,
} from '@openfeature/server-sdk';
import { getSetting } from '@personus/db/settings';

function settingKey(flagKey: string): string {
  return flagKey.includes('.') ? flagKey : `features.${flagKey}`;
}

async function resolve<T>(flagKey: string, defaultValue: T): Promise<ResolutionDetails<T>> {
  const value = await getSetting<T>(settingKey(flagKey), defaultValue);
  return { value, reason: value === defaultValue ? 'DEFAULT' : 'TARGETING_MATCH' };
}

export class DbProvider implements Provider {
  readonly runsOn = 'server';
  readonly metadata = { name: 'personus-db-provider' } as const;
  readonly hooks = [];

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    _ctx: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> {
    return resolve(flagKey, defaultValue);
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    _ctx: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    return resolve(flagKey, defaultValue);
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    _ctx: EvaluationContext,
  ): Promise<ResolutionDetails<number>> {
    return resolve(flagKey, defaultValue);
  }

  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    _ctx: EvaluationContext,
  ): Promise<ResolutionDetails<T>> {
    return resolve(flagKey, defaultValue);
  }
}
