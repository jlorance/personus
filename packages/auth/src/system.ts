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

/** Destructive retention/scrub cron — dev/test only. */
export const retentionCron: SystemActorDef = {
  actorId: 'system:retention',
  actorType: 'system',
  ability: buildNarrowAbility([['purge', 'ActivityEvent']]),
  _productionGuard: true,
};
