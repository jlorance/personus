/**
 * Authorization matrix — the systematic proof of the CASL ability model.
 *
 * A data-driven grid of (action × subject) against every principal profile.
 * Each cell asserts allow/deny, so ANY change to `defineAbilitiesFor` that
 * isn't reflected here fails loudly — this is the guard against silently
 * widening a grant (e.g. giving users `purge`/`index`, or non-community-admins
 * `manage Membership`). Ownership + which-community scoping are NOT expressible
 * in coarse CASL rules and are proved separately in the service integration
 * suite; this file proves the coarse grants only.
 */

import { describe, expect, it } from 'vitest';
import { type Actions, buildNarrowAbility, defineAbilitiesFor, type Subjects } from './abilities';

// ── Principal profiles ─────────────────────────────────────────────────────────
const ctx = (over = {}) => ({
  userId: '1',
  communityIds: [],
  communityRoles: {},
  role: 'user' as const,
  ...over,
});

const PROFILES = {
  anonReader: buildNarrowAbility([
    ['read', 'Persona'],
    ['read', 'Community'],
    ['read', 'Endorsement'],
  ]),
  worker: buildNarrowAbility([['index', 'Persona']]),
  user: defineAbilitiesFor(ctx()),
  member: defineAbilitiesFor(ctx({ communityRoles: { c1: 'member' } })),
  communityAdmin: defineAbilitiesFor(ctx({ communityRoles: { c1: 'admin' } })),
  admin: defineAbilitiesFor(ctx({ role: 'admin' })),
} as const;

type ProfileName = keyof typeof PROFILES;
const ALL: ProfileName[] = Object.keys(PROFILES) as ProfileName[];
/** Every authenticated user profile (excludes anon reader + embeddings worker). */
const AUTHED: ProfileName[] = ['user', 'member', 'communityAdmin', 'admin'];

// ── The grid: [action, subject, profiles allowed] ──────────────────────────────
// Anything not listed for a row is asserted DENIED for that profile.
const MATRIX: Array<[Actions, Subjects, ProfileName[]]> = [
  // Persona CRUD — every authenticated user; anon can only read; worker can only index.
  ['create', 'Persona', ['user', 'member', 'communityAdmin', 'admin']],
  ['read', 'Persona', ['anonReader', 'user', 'member', 'communityAdmin', 'admin']],
  ['update', 'Persona', ['user', 'member', 'communityAdmin', 'admin']],
  ['delete', 'Persona', ['user', 'member', 'communityAdmin', 'admin']],

  // purge (hard-delete) — admin only, across the board.
  ['purge', 'Persona', ['admin']],
  ['purge', 'User', ['admin']],
  ['purge', 'Community', ['admin']],
  ['purge', 'Endorsement', ['admin']],

  // index (embeddings write) — ONLY the embeddings worker; never a normal user or even admin.
  ['index', 'Persona', ['worker']],

  // Admin surface — admin only.
  ['manage', 'AdminSurface', ['admin']],
  ['manage', 'TraitTaxonomy', ['admin']],
  ['manage', 'TraitMetadata', ['admin']],
  ['manage', 'CommunityType', ['admin']],

  // Community management — only the admin OF that community (community-scoped
  // grant); platform admin does NOT get community management via `manage`.
  ['manage', 'Membership', ['communityAdmin']],
  ['manage', 'PlatformChannel', ['communityAdmin']],
  ['manage', 'GuildTaxonomy', ['communityAdmin']],
  ['manage', 'GuildOffering', ['communityAdmin']],
  ['update', 'Community', ['communityAdmin']],
  ['delete', 'Community', ['communityAdmin']],

  // Endorsements are immutable — no profile may update.
  ['update', 'Endorsement', []],

  // Self-service membership — every authenticated user may create/read/update/delete
  // their OWN row (the service scopes it); anon/worker may not.
  ['create', 'Membership', ['user', 'member', 'communityAdmin', 'admin']],

  // Communities — read by anyone signed-in (+ anon reader); create by any user.
  ['read', 'Community', ['anonReader', 'user', 'member', 'communityAdmin', 'admin']],
  ['create', 'Community', ['user', 'member', 'communityAdmin', 'admin']],

  // ── Previously-uncovered subjects (close the systematic gap) ──────────────────
  // Self-scoped user data — every authenticated user; not anon/worker.
  ['read', 'UserTraits', AUTHED],
  ['update', 'UserTraits', AUTHED],
  ['read', 'CoachSession', AUTHED],
  ['create', 'CoachSession', AUTHED],
  ['read', 'ShadowPersona', AUTHED],
  ['create', 'ShadowPersona', AUTHED],
  ['read', 'ContactRequest', AUTHED],
  ['create', 'ContactRequest', AUTHED],
  ['update', 'ContactRequest', AUTHED],
  ['read', 'ActivityEvent', AUTHED],
  ['create', 'ActivityEvent', AUTHED],
  // Guild sub-area — read by members; managed only by the community admin.
  ['read', 'GuildRequest', AUTHED],
  ['manage', 'GuildRequest', ['communityAdmin']],
  // purge on platform-wide subjects — ONLY the platform admin.
  ...(
    [
      'User',
      'UserTraits',
      'CoachSession',
      'ShadowPersona',
      'ContactRequest',
      'Community',
      'ActivityEvent',
      'TraitMetadata',
      'TraitTaxonomy',
      'CommunityType',
    ] as Subjects[]
  ).map((s): [Actions, Subjects, ProfileName[]] => ['purge', s, ['admin']]),
  // purge on COMMUNITY-scoped subjects — platform admin AND the community admin,
  // because a community admin's `manage <X>` grant is a CASL wildcard that
  // INCLUDES purge. NOTE: this contradicts the "purge = admin/system only"
  // comment in abilities.ts — flagged for product review (community-admin
  // hard-delete of memberships/guild data/channels). Asserted here as the true
  // current behavior so a change is a conscious one.
  ...(
    [
      'Membership',
      'GuildTaxonomy',
      'GuildOffering',
      'GuildRequest',
      'PlatformChannel',
    ] as Subjects[]
  ).map((s): [Actions, Subjects, ProfileName[]] => ['purge', s, ['communityAdmin', 'admin']]),
];

describe('authorization matrix (action × subject × principal)', () => {
  for (const [action, subject, allowed] of MATRIX) {
    const allow = new Set<ProfileName>(allowed);
    for (const profile of ALL) {
      const expected = allow.has(profile);
      it(`${profile} ${expected ? 'CAN' : 'cannot'} ${action} ${subject}`, () => {
        expect(PROFILES[profile].can(action, subject)).toBe(expected);
      });
    }
  }

  it('default-deny: a plain user cannot manage anything wildcard', () => {
    for (const s of ['Persona', 'Community', 'Membership', 'AdminSurface'] as Subjects[]) {
      expect(PROFILES.user.can('manage', s)).toBe(false);
    }
  });
});
