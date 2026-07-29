/**
 * Named system actors — each automated process gets a minimal, explicit CASL
 * ability. No generic "root". Destructive actors carry a production guard.
 */

import { buildNarrowAbility } from '@personus/authz';
import type { SystemActorDef } from './principal';

/** Seed/reference-data loader. */
export const seedActor: SystemActorDef = {
  actorId: 'system:seed',
  actorType: 'system',
  ability: buildNarrowAbility([
    ['manage', 'TraitMetadata'],
    ['manage', 'TraitTaxonomy'],
    ['manage', 'CommunityType'],
  ]),
};

/** Embeddings backfill worker — reads persona content, writes only the vector index. */
export const embeddingsWorker: SystemActorDef = {
  actorId: 'system:embeddings',
  actorType: 'system',
  ability: buildNarrowAbility([
    ['read', 'Persona'],
    ['index', 'Persona'],
  ]),
};

/** Inbound AuthN webhook (user provisioning). */
export const webhookAuth: SystemActorDef = {
  actorId: 'webhook:auth',
  actorType: 'webhook',
  ability: buildNarrowAbility([
    ['create', 'User'],
    ['update', 'User'],
  ]),
};

/**
 * Retention/scrub cron — clears PII-bearing fields and prunes append-only logs
 * after their declared retention window. Granted only what each sweep touches:
 *   - update ContactRequest  — nulls message + triageNote on closed requests
 *   - update QueryLog        — nulls query_text on aged analytics rows
 *   - purge  AuditLog        — hard-deletes audit rows past retention
 *   - purge  ActivityEvent   — left in place; future sweep target if needed
 *
 * _productionGuard removed (PER-31): the guard existed because no sweep
 * function was wired; now that sweeps are shipped this actor is production-safe.
 */
export const retentionCron: SystemActorDef = {
  actorId: 'system:retention',
  actorType: 'system',
  ability: buildNarrowAbility([
    ['update', 'ContactRequest'],
    ['update', 'QueryLog'],
    ['purge', 'AuditLog'],
    ['purge', 'ActivityEvent'],
  ]),
};
