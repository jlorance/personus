---
type: foundation
title: Authorization — System Overview
description: "Every authorization decision in Personus answers four questions:"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# Authorization — System Overview

> 2026-04-14 · Architectural pattern and cross-area invariants for authorization in Personus. Per-feature rules live in each feature spec's §Authorization section. Implementation details (Clerk↔CASL wiring, server action patterns, multi-step orchestration) live in the ADR at [`../decisions/authorization-casl.md`](/decisions/authorization-casl.md) and in the code at `packages/auth/`. **The CASL abilities in `packages/auth/src/abilities.ts` are truth.**
>
> **Where to find what:**
> - **System-level pattern** (this file): principal parameter, layered evaluation, default deny, actor taxonomy, cross-area invariants, sensitive entities
> - **Per-area authz rules**: each feature spec's §Authorization section (e.g., `docs/specs/communities/02-membership.md` §Authorization, `docs/specs/personas/04-persona-visibility.md`)
> - **Persona visibility mechanics**: [`../specs/personas/04-persona-visibility.md`](/domains/personas/04-persona-visibility.md) (full feature spec)
> - **Cross-persona linking authz**: [`../specs/personas/08-cross-persona-linking.md`](/domains/personas/08-cross-persona-linking.md)
> - **Implementation** (Clerk→CASL, server action pattern, ability definitions): `packages/auth/src/abilities.ts`, `packages/auth/src/permissions.ts` + ADR
> - **Actor catalog**: [`../../.claude/actors-and-contexts.md`](../../.claude/actors-and-contexts.md)

## The four questions

Every authorization decision in Personus answers four questions:

```
1. WHO is the actor?           → Actor type + identity
2. WHAT are they trying to do? → Action (view, search, contact, manage, ...)
3. ON WHAT target?              → Entity + specific data within it
4. IN WHAT context?             → Global, community, guild, direct
```

A CASL ability check encapsulates all four: `ability.can(action, subject, field?)` where the ability was constructed from the actor's identity, and the subject carries its context (ownership, community membership, etc.).

## Layered evaluation

Authorization is evaluated as a series of layers. Each layer can narrow access but never widen it. **Any layer's denial is final.**

| Layer | What it checks | Denied result |
|---|---|---|
| **1. Authentication** | Is the actor identified? (anonymous vs authenticated vs system) | No session → treat as anonymous; invalid token → reject |
| **2. Persona/Community visibility** | Does the target's visibility setting permit this actor type? | Return 404 for private resources (per `sensitive-resource-returns-404`) |
| **3. Context scope** | Is the actor in the right context? (community member, network connection) | Return 404 or 403 depending on whether existence is sensitive |
| **4. Owner preferences** | Do the data owner's preferences allow this action? (contact prefs, trait selection, MCP exposure) | 403 with explanation |
| **5. Role / tier permissions** | Does the actor have the required role for this action? (member, steward, admin; guild tiers) | 403 |
| **6. Rate & abuse limits** | Has the actor exceeded usage limits? (search rate, contact request caps, cost caps) | 429 (rate limit) |

Layers 2 and 3 are the most frequent denial points and the ones where the `sensitive-resource-returns-404` gate applies — unauthorized access to a private or authenticated resource returns 404, not 403, to prevent enumeration attacks.

## Principal pattern

Every service-layer function that reads or mutates a sensitive entity takes a **`principal` parameter** as its first argument. The service function **never** derives `userId` from the request body or from route parameters.

```
// Pseudocode — actual implementation in packages/auth/src/permissions.ts
async function updatePersona(principal: Principal, personaUri: string, patch: PersonaPatch) {
  const ability = defineAbilitiesFor(principal);
  const persona = await loadPersona(personaUri);
  ability.can('update', persona).orThrow();     // CASL ability check
  // ... perform update
}
```

**Why this matters:** routes can be bypassed by internal callers, agents, and MCP tool exposure. Service-layer enforcement is the only layer that catches every call site. This is the `authz-at-service-layer` gate in [`principles.md`](/foundation/principles.md).

**No exceptions** for sensitive entities. Read-only public endpoints (e.g., fetching a public persona's JSON-LD) may skip the principal parameter when the data is fully public and no ownership check is required, but the function must still go through a service-layer read function — never a direct database query from a route handler.

## Default deny, owner grants

Nothing is visible or accessible by default. Access exists because the owner explicitly granted it:

1. Persona owner set `visibility` to a level that includes the actor type
2. Persona owner published specific traits on a specific persona (traits are copied, not referenced)
3. Persona owner opted into a cross-persona link (community-scoped, explicit)
4. Persona owner joined a community and filled in `memberTraits`
5. A community admin granted a role (member → steward → admin)
6. A guild tier grants specific permissions (future; see Guilds sub-PRD)

**The owner can always revoke.** The system never infers or expands access beyond what was explicitly granted. A feature that wants to "help the user by defaulting to more visibility" has to be explicitly designed, documented, and approved against this principle.

## Actors

Full actor catalog: [`../../.claude/actors-and-contexts.md`](../../.claude/actors-and-contexts.md). This file only names the **authorization-relevant** actor types and how they're resolved:

| Actor type | Identity | How resolved | Typical actions |
|---|---|---|---|
| **Anonymous** | None | No auth token | View public personas, view public community directories |
| **Authenticated User** | Clerk user ID | Valid session/JWT | Browse, search, create personas, join communities |
| **Persona** | User + active persona URI | User selects active persona in UI | Endorse, contact, join community, manage own data |
| **Community Member** | Persona + membership row | `community_members` row exists | View directory, search within community, see member traits |
| **Community Steward** | Member + `role='steward'` | Role on membership | Approve join requests, invite directly, moderate |
| **Community Admin** | Member + `role='admin'` | Role on membership | Manage schema, configure integrations, archive/close |
| **System** | Service account | Internal job, cron, webhook | Background processing, audit writes, embeddings regeneration |
| **AI Agent (MCP client)** | API token + tier | Token validated against tier table | Search, get persona, request introduction (per tier) |

**Three sender modes for contact requests** (see [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §ContactRequest): another Persona, an AI agent, or an anonymous visitor. Each mode has its own authorization path — anonymous visitors must sign up before a request is finalized, AI agents are subject to MCP tier limits, and persona-to-persona requests flow through the mediated contact adapter.

## Sensitive entities

The canonical list of tables that require service-layer principal-parameter enforcement. This list is duplicated in CLAUDE.md `authz.sensitive_entities` and the two must stay in sync.

Current entries (as of 2026-04-14):

- `users`
- `user_traits`
- `personas`
- `shadow_personas`
- `contact_requests`
- `endorsements`
- `platform_channel_bindings`
- `coach_sessions`

**Additions pending** (flagged by the Communities PRD §AR):
- `community_members` — read gated by community visibility + role, mutate gated by role
- `notices` (future table) — read gated by community visibility, mutate gated by author or admin

Add these to CLAUDE.md `authz.sensitive_entities` when the first Communities feature spec ships.

**Not sensitive** (but still authorization-aware):
- `communities` — read gated by visibility but not by ownership (any logged-in user can see a public community)
- `community_types` — seed data, public read
- `trait_metadata`, `trait_taxonomies` — seed data, public read
- `activity_events` — audit writes only; reads gated by owner (a user can see their own history)

## Cross-area authorization invariants

Rules that span multiple entities and multiple areas. Each is stated once here; per-area feature specs cite these rather than restating them.

### 1. Founding user immutability

`Community.foundingUserId` is set at creation and is always admin. No role demotion, no membership removal. The only way to dissolve the founding relationship is community closure. Enforced as a hard service-layer constraint — any attempted role change on the founding user is rejected before reaching the database.

### 2. Unlinkability across personas

No query surface may reveal that two Personas belong to the same User except via the explicit, community-scoped, opt-in cross-persona linking feature. The `User → Persona` foreign key exists but is only used by the service layer for owner-authentication. Public surfaces, MCP tools, and cross-persona queries must not traverse `userId` to find "other personas of this user."

### 3. Community-scoped visibility

A persona's membership traits (`community_members.member_traits`) are visible only within the community where they were set. Another community never sees them, even if the same user is a member of both. This is enforced at the service layer by always scoping member trait reads to a `communityId`.

### 4. Mediated contact only

`contact_requests` never stores raw contact details. The `ContactRelay` resolves delivery based on the target's `contact_preferences` (stored at the persona level, with user-level defaults). No endpoint, MCP tool, or admin surface exposes raw contact info.

### 5. Writer anonymity preservation

Endorsements and shadow personas identify their creator by persona (`fromPersonaUri`, `createdByPersonaUri`), not by user. This preserves unlinkability across endorsement history.

### 6. 404 not 403 for sensitive reads

When an unauthorized actor attempts to read a private persona, private community, or any other sensitive resource, the response is `404 Not Found`, not `403 Forbidden`. This prevents enumeration. Enforced at the service-layer read functions and in the route handlers that render them.

### 7. Audit on every mutation

Every state-changing operation on a sensitive entity emits an `activity_events` row via the shared events helper. No service function may mutate a sensitive entity without emitting the audit event. Enforced by code review and by the `audit-all-mutations` gate — no automated check yet.

## Data ownership and delegation

**Persona ownership.** A Persona belongs to exactly one User (`personas.userId`). Ownership cannot be transferred. The only way to "transfer" a persona is to delete the original and create a new one under the new owner.

**Shadow persona ownership transfer.** A Shadow Persona is created by one Persona (`createdByPersonaUri`) but is claimed by a different User. On claim:
1. The claimed shadow's traits are copied into a new Persona owned by the claiming User
2. All Endorsements with `toShadowPersonaId = shadow.id` are atomically re-targeted to the new Persona
3. The `claimedByPersonaUri` is set on the shadow row
4. The `claimToken` is nulled, preventing re-claim

This is the only supported ownership-transfer flow in the system. See [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §ShadowPersona and [`../specs/personas/07-shadow-personas.md`](/domains/personas/07-shadow-personas.md).

**Organization persona delegation** *(future)*. When an organization persona wants to grant management rights to multiple people (e.g., a company's social media manager), the intended model is a separate `persona_delegates` table — not role-based, but per-persona ACL. Not implemented. When designed, it lives in the Personas area.

**Guild tier permissions** *(future)*. Guild membership tiers (apprentice/journeyman/master) will carry tier-specific permissions stored in `guild_membership_tiers.permissions` JSONB. The authorization layer for guilds is part of the Guilds sub-PRD; see [`../specs/communities/guilds-prd.md`](/domains/communities/guilds-prd.md).

## Implementation pointer

**Technology stack:**
- **Authentication**: Clerk (`@clerk/nextjs`) — see [`../decisions/auth-provider-clerk.md`](/decisions/auth-provider-clerk.md)
- **Authorization**: CASL (`@casl/ability`) — see [`../decisions/authorization-casl.md`](/decisions/authorization-casl.md)
- **Pattern**: principal parameter, service-layer enforcement, 404-not-403 for sensitive reads

**Where the code lives:**
- `packages/auth/src/provider.ts` — Clerk session → principal
- `packages/auth/src/abilities.ts` — CASL ability builders per actor type
- `packages/auth/src/permissions.ts` — `canViewPersona`, `assertOwnsPersona`, multi-step orchestration helpers
- `apps/web/app/actions/*.ts` — every server action starts with `const principal = await getPrincipal()` and passes it to the service layer

**Implementation guidance** (Clerk→CASL integration patterns, server action skeleton, client-side conditional rendering via `ability.can()`, multi-step orchestration, what CASL handles vs custom logic, audit trail, database-level RLS considerations) lives in the archived pre-trim version at [`_archive/authorization.2026-04-12.md`](/archive/legacy/foundation/_archive/authorization.2026-04-12.md) §Implementation Guidance. That content should eventually migrate into JSDoc on the relevant code functions and into a dedicated ADR at `docs/decisions/authorization-implementation.md`.

## Forward references

Per-feature authorization rules are owned by the feature specs, not this file:

| Area | Where rules live |
|---|---|
| Personas lifecycle | [`../specs/personas/01-persona-lifecycle.md`](/domains/personas/01-persona-lifecycle.md) §Authorization |
| Persona visibility | [`../specs/personas/04-persona-visibility.md`](/domains/personas/04-persona-visibility.md) — full feature spec |
| Cross-persona linking | [`../specs/personas/08-cross-persona-linking.md`](/domains/personas/08-cross-persona-linking.md) — full feature spec including authz |
| Shadow personas + claim | [`../specs/personas/07-shadow-personas.md`](/domains/personas/07-shadow-personas.md) |
| Community lifecycle | [`../specs/communities/01-community-lifecycle.md`](/domains/communities/01-community-lifecycle.md) §Authorization |
| Community membership | [`../specs/communities/02-membership.md`](/domains/communities/02-membership.md) §Authorization |
| Moderation | [`../specs/communities/07-moderation.md`](/domains/communities/07-moderation.md) §Authorization |
| Community closure | [`../specs/communities/11-community-closure.md`](/domains/communities/11-community-closure.md) §Authorization |
| Guild tiers + routing | [`../specs/communities/guilds-prd.md`](/domains/communities/guilds-prd.md) (sub-PRD placeholder) |
| MCP access tiers | [`api-surface.md`](/foundation/api-surface.md) §MCP Tools §Access Tiers |

## Displacement note

The pre-2026-04-14 version of this file (archived at [`_archive/authorization.2026-04-12.md`](/archive/legacy/foundation/_archive/authorization.2026-04-12.md)) contained ~1,530 lines covering persona visibility mechanics, trait-level disclosure rules, cross-persona linking, community authorization, guild tier matrices, contact authorization flows, endorsement authorization, AI agent access tiers, a quick-reference matrix, and ~420 lines of implementation guidance. The displacement was:

| Legacy section | Lines | New home |
|---|---|---|
| §Persona Visibility (levels, what it controls, rules, search) | ~89 | Already covered by [`../specs/personas/04-persona-visibility.md`](/domains/personas/04-persona-visibility.md) (1,140 lines) |
| §Trait-Level Disclosure | ~74 | Already covered by `personas/04-persona-visibility.md` |
| §Cross-Persona Linking (concept, data model, rules, edges) | ~112 | Already covered by [`../specs/personas/08-cross-persona-linking.md`](/domains/personas/08-cross-persona-linking.md) (1,250 lines) |
| §Community Authorization | ~49 | Delegated to per-feature `communities/*` specs |
| §Guild Authorization (tier matrix) | ~66 | Delegated to [`../specs/communities/guilds-prd.md`](/domains/communities/guilds-prd.md) |
| §Contact Authorization | ~137 | Delegated to `personas/schema-spec.md` §ContactRequest + per-feature contact specs |
| §Endorsement Authorization | ~71 | Delegated to `personas/schema-spec.md` §Endorsement |
| §AI Agent & MCP Authorization | ~69 | Delegated to [`api-surface.md`](/foundation/api-surface.md) §MCP Tools §Access Tiers |
| §Authorization Decision Reference (quick-ref matrix) | ~73 | Deleted — matrix was cross-area; now distributed to per-area feature specs |
| §Implementation Guidance | ~423 | Flagged for migration to JSDoc + ADR; content lives in archive until migrated |

**Nothing was lost.** The archive is at [`_archive/authorization.2026-04-12.md`](/archive/legacy/foundation/_archive/authorization.2026-04-12.md) in full.

## History

- **2026-02-24** — Original 1,527-line `09-authorization.md` authored with full per-area rule enumeration and implementation guidance
- **2026-04-12** — Renamed to `authorization.md` during foundation reorganization
- **2026-04-14** — Trimmed to ~220 lines. Per-area rules delegated to feature specs; implementation guidance flagged for migration to JSDoc + ADR.
