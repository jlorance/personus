/**
 * CASL ability definitions — the AuthZ model for Personus.
 *
 * Deliberately split from AuthN (@personus/auth): the AuthN provider (Clerk,
 * WorkOS, …) answers "who is this?"; this package answers "what may they do?".
 * ~80% of decisions are expressible here as attribute-based rules; multi-step
 * checks that need DB lookups live in permissions.ts.
 *
 * Default deny: nothing is permitted unless an explicit `can()` grants it.
 */

import { AbilityBuilder, createMongoAbility, type PureAbility } from '@casl/ability';
import { db } from '@personus/db';
import { and, eq, isNull } from '@personus/db/orm';
import { communityMembers, personas } from '@personus/db/schema';

export type Subjects =
  | 'User'
  | 'Persona'
  | 'UserTraits'
  | 'CoachSession'
  | 'Endorsement'
  | 'ShadowPersona'
  | 'ContactRequest'
  | 'Community'
  | 'Membership'
  | 'ActivityEvent'
  | 'GuildTaxonomy'
  | 'GuildOffering'
  | 'GuildRequest'
  | 'PlatformChannel'
  | 'AdminSurface'
  | 'TraitMetadata'
  | 'TraitTaxonomy'
  | 'CommunityType'
  | 'all';

export type Role = 'user' | 'admin';

// `delete` = soft-delete (writes deleted_at). `purge` = hard-delete escape
// hatch, never granted to ordinary users — admin/system actors only. `index` =
// write derived search data (embeddings) — granted only to the embeddings worker,
// distinct from `update` so an ordinary editing principal can't poison vectors.
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'purge' | 'index' | 'manage';

export type AppAbility = PureAbility<[Actions, Subjects]>;

export interface AbilityContext {
  userId: string;
  personaUris: string[];
  communityIds: string[];
  communityRoles: Record<string, string>;
  role: Role;
}

const PURGE_SUBJECTS: Subjects[] = [
  'User',
  'Persona',
  'UserTraits',
  'CoachSession',
  'Endorsement',
  'ShadowPersona',
  'ContactRequest',
  'Community',
  'Membership',
  'ActivityEvent',
  'GuildTaxonomy',
  'GuildOffering',
  'GuildRequest',
  'PlatformChannel',
  'TraitMetadata',
  'TraitTaxonomy',
  'CommunityType',
];

/** Build CASL abilities for an authenticated user. Default deny, owner grants. */
export function defineAbilitiesFor(context: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  const { communityRoles, role } = context;

  if (role === 'admin') {
    can('manage', 'AdminSurface');
    for (const s of PURGE_SUBJECTS) can('purge', s);
    can('manage', 'TraitTaxonomy');
    can('manage', 'TraitMetadata');
    can('manage', 'CommunityType');
  }

  // Personas — create/read/update/delete; ownership filtered in queries/services.
  can('create', 'Persona');
  can('read', 'Persona');
  can('update', 'Persona');
  can('delete', 'Persona');

  // User + trait pool (self).
  can('read', 'User');
  can('update', 'User');
  can('delete', 'User');
  can('read', 'UserTraits');
  can('update', 'UserTraits');
  can('delete', 'UserTraits');

  // Coach sessions (self, filtered by userId in services).
  can('create', 'CoachSession');
  can('read', 'CoachSession');
  can('update', 'CoachSession');
  can('delete', 'CoachSession');

  // Endorsements — immutable once created.
  can('create', 'Endorsement');
  can('read', 'Endorsement');
  cannot('update', 'Endorsement');
  can('delete', 'Endorsement');

  // Shadow personas.
  can('create', 'ShadowPersona');
  can('read', 'ShadowPersona');

  // Contact requests.
  can('create', 'ContactRequest');
  can('read', 'ContactRequest');
  can('update', 'ContactRequest');

  // Communities.
  can('create', 'Community');
  can('read', 'Community');

  const adminCommunityIds = Object.entries(communityRoles)
    .filter(([, r]) => r === 'admin')
    .map(([communityId]) => communityId);

  if (adminCommunityIds.length > 0) {
    can('update', 'Community');
    can('delete', 'Community');
    can('manage', 'Membership');
    can('manage', 'GuildTaxonomy');
    can('manage', 'GuildOffering');
    can('manage', 'GuildRequest');
    can('manage', 'PlatformChannel');
  }

  // Self-service join/leave — the service scopes create/delete to the caller's
  // own membership row (and enforces the community's joinPolicy on create).
  can('create', 'Membership');
  can('read', 'Membership');
  can('update', 'Membership');
  can('delete', 'Membership');
  can('read', 'GuildTaxonomy');
  can('read', 'GuildOffering');
  can('read', 'GuildRequest');
  can('read', 'ActivityEvent');
  can('create', 'ActivityEvent');

  return build();
}

/** Build a narrow ability from an explicit list of (action, subject) pairs. */
export function buildNarrowAbility(rules: ReadonlyArray<[Actions, Subjects]>): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const [action, subject] of rules) can(action, subject);
  return build();
}

/** Parse an IdP role claim into a typed Role. Fail closed to 'user'. */
export function parseRole(raw: unknown): Role {
  return raw === 'admin' ? 'admin' : 'user';
}

/** Role-only ability for pre-DB surfaces (proxy/middleware admin gate). */
export function defineAbilitiesForRole(role: Role): AppAbility {
  return defineAbilitiesFor({
    userId: '',
    personaUris: [],
    communityIds: [],
    communityRoles: {},
    role,
  });
}

/** Build the ability context for a user by querying the DB. */
export async function buildAbilityContext(
  userId: string,
  role: Role = 'user',
): Promise<AbilityContext> {
  const userIdBig = BigInt(userId);

  const userPersonas = await db
    .select({ uri: personas.uri })
    .from(personas)
    .where(and(eq(personas.userId, userIdBig), isNull(personas.deletedAt)));

  const memberships = await db
    .select({ communityId: communityMembers.communityId, role: communityMembers.role })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userIdBig));

  const communityIds = [...new Set(memberships.map((m) => String(m.communityId)))];
  const communityRoles: Record<string, string> = {};
  for (const m of memberships) {
    const cid = String(m.communityId);
    if (!communityRoles[cid] || m.role === 'admin') communityRoles[cid] = m.role;
  }

  return {
    userId,
    personaUris: userPersonas.map((p) => p.uri),
    communityIds,
    communityRoles,
    role,
  };
}
