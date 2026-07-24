---
type: foundation
title: Data Model — System Overview
description: Personus uses Postgres with JSONB for flexible trait storage + relational tables for the trust graph and memberships. This is the single most load-bearing data decision in the project.
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# Data Model — System Overview

> **Reconciliation note (2026-07-24):** The shipped build replaced the heavyweight `integrations` table with the lean `platform_channel_bindings` table (community_id, platform, external ref, installed_by, status, tokens). Mastra's first-class Channels own routing / threading / memory. `integrations`-table references below have been renamed; some surrounding prose still describes the pre-reconciliation design and is superseded by `packages/db/src/schema/platform-channels.ts`.

> 2026-04-14 · System-level architectural decisions, cross-area invariants, and the top-level ER map. Field-level detail lives in per-area schema specs. The physical schema lives in `packages/db/src/schema/*.ts` — **the code is truth**.
>
> **Where to find what:**
> - **Per-area schema specs** (field-level, framework-agnostic): `docs/specs/<area>/schema-spec.md`
> - **Physical schema** (Drizzle, source of truth): `packages/db/src/schema/*.ts`
> - **Conceptual domain models** (PM-readable ER): `docs/specs/<area>/domain-model.md`
> - **Schema spec vocabulary** (controlled DSL): `docs/specs/_schema-vocabulary.md`
>
> This file only contains content that **spans multiple areas** or is a **system-level architectural decision**. Anything field-specific, per-entity, or area-local belongs in a per-area schema spec, not here.

## Hybrid JSONB — the core data architecture decision

Personus uses **Postgres with JSONB for flexible trait storage + relational tables for the trust graph and memberships**. This is the single most load-bearing data decision in the project.

### Why not pure 3NF?

The initial design used normalized attribute tables (`attributes`, `user_attributes`, `persona_attributes`). Three problems killed it:

1. **Adding a new trait type required a migration.** Unacceptable when new trait types come from AI extraction and seed data updates.
2. **AI extracts free-form data** from voice/text. Forcing that into rigid column-per-attribute schemas fights the model.
3. **Privacy via unlinkability required denormalization anyway.** The point of persona snapshots is that they don't reference back to the master pool — a normalized design would have undone the privacy guarantee.

### Why not pure document store?

MongoDB would make trait storage easy but would break the rest:

1. **Endorsement graph** (A endorses B endorses C) needs foreign keys and graph traversal.
2. **Community memberships** (persona ↔ community) are fundamentally relational.
3. **Trust path traversal** (find path from X to Y via endorsements) is a graph problem that needs joins.
4. **Vector search** would be a separate system (we'd need pgvector anyway).

### The hybrid

**Stored as JSONB documents** (flexible, schema-defined at runtime via `trait_metadata`):
- `user_traits.traits` — the master trait pool
- `personas.traits` — persona snapshots (copied from master, not referenced)
- `shadow_personas.traits` — AI-extracted from endorsements
- `communities.traits` — community-level trait values
- `community_members.member_traits` — member-level trait values scoped to a community
- `community_types.community_trait_schema` / `member_trait_schema` — schema templates per community type

**Stored as relational tables** (foreign keys, joins, indexes):
- Endorsement graph edges (`endorsements`)
- Community memberships (`community_members`)
- Communities, users, personas, shadow personas, contact requests
- All guild sub-entities (skill categories, tiers, offerings, offering members, requests)
- Activity events, coach sessions, integrations, query logs

**Benefits:**
- Flexible schema without migrations (add `favorite_synthesizer` in seed data, not SQL)
- Fast reads — one row fetch gets an entire persona including all its traits
- Privacy via denormalization — traits are copied to personas, never referenced
- Real graph traversal via foreign keys
- Vector search lives in the same database via pgvector
- Single database, ACID transactions across all operations

## Terminology — internal vs user-facing

The code and database use **"traits"** as the technical term. Users **never** see the word "trait" — the UI and the Coach surfaces use natural language tuned to what's being captured:

| Internal (code / DB / specs) | User-facing (UI / Coach) |
|---|---|
| `user_traits` | "Your profile" |
| `trait_metadata` | — (never exposed) |
| `personas.traits` | "What this persona shares" |
| "Add a trait" | "What skills do you have?" / "Tell me about your work" / "What are your hobbies?" |

This split is load-bearing: the user sees a natural conversation that extracts structured data into a typed trait system; the code operates on the structured data without needing to translate.

## Cross-area invariants

These rules span multiple entities across multiple areas. They are stated once here so every per-area schema spec can reference them without restating.

### 1. Unlinkability is the default

No query surface may automatically reveal that two Personas belong to the same User. The `User → Persona` foreign key exists and is used by the service layer for owner-authentication, but it must not be exposed to any public read surface, MCP tool output, or cross-persona query. Explicit cross-persona linking is opt-in and always community-scoped (see Personas schema spec §Persona and `docs/specs/personas/08-cross-persona-linking.md`).

### 2. Traits are copied, not referenced

When a Persona is created or updated, the published traits are **copied** from `user_traits` into `personas.traits`. Editing `user_traits` does NOT automatically update existing Personas — the owner must re-sync explicitly. Deleting a Persona never affects `user_traits` or other Personas. Same rule applies to `community_members.member_traits` vis-à-vis the community's trait schema: member traits are a persona-scoped, community-scoped snapshot, not a reference.

### 3. Endorsements identify writers by persona, not user

`endorsements.from_persona_uri` points at a Persona, not a User. A user who writes an endorsement from their Professional persona cannot be cross-referenced to their other personas through endorsement history. Same rule for shadow persona creators (`shadow_personas.created_by_persona_uri`) and guild request requesters (`guild_requests.requester_persona_uri`).

### 4. Endorsements and shadow personas are community-scoped

Every `endorsements` row has a non-null `community_id`. Every `shadow_personas` row has a non-null `community_id`. There is no "unscoped" endorsement or shadow. Discovery surfaces may project these into non-community contexts, but the data is always attached to a community.

### 5. Entity-type unification — people and organizations share `personas`

Both people and organizations are stored as `personas` rows differentiated by `entityType`. Same endorsement system, same search, same discovery surface. There is no separate `organizations` table. Guilds are a specific feature-flag pattern on organization-type personas — not a separate entity type. See the `unified-entity-model-for-people-and-orgs` gate in [`principles.md`](/foundation/principles.md).

### 6. PII never appears in persona-level trait snapshots

Free-text fields on `user_traits.traits`, `personas.traits`, `shadow_personas.traits`, `communities.traits`, and `community_members.member_traits` are PII-scanned at write. Detected PII is **rejected**. Free-text fields on user-to-user communication (`endorsements.testimonial`, `contact_requests.message`, `guild_requests.need_description`) are PII-scanned and **warned but allowed**, because the user is legitimately sharing their own contact info.

### 7. Mediated contact indirection

`contact_requests` never stores raw contact details (email, phone, address). The `channelType`-equivalent path routes through a `ContactRelay` (Personas-area abstraction). The adapter resolves the target's channel preferences from `users.default_contact_preferences` or `personas.contact_preferences` and delivers accordingly.

### 8. Soft delete vs hard delete policy

| Entity | Delete mode | Reason |
|---|---|---|
| User | soft delete | Preserves trust graph references |
| Persona | soft delete | Preserves endorsements received |
| Shadow Persona (expired unclaimed) | hard delete | No reason to preserve un-claimable rows |
| Shadow Persona (claimed) | converts to Persona, the shadow row is retained briefly for audit then hard-deleted |
| Endorsement | soft revoke (`active=false`) | Writers can revoke; target cannot delete |
| Contact Request | no delete — expires via `expiresAt` | Immutable audit trail |
| Community | soft archive / hard close (30-day grace) | Reversible archive; closure is permanent |
| Community Member (leave/remove) | hard delete with `activity_events` row | No need to preserve membership history inline |

## Cross-area ER map

Entities grouped by area, with foreign keys across area boundaries marked with `⇢`. Every per-area group expands into a per-area schema spec with field-level detail.

```
┌─ Personas area ──────────────────────────────────────────────────────────┐
│                                                                          │
│   User ─1── 1 ─ UserTraits                                               │
│     │                                                                    │
│     └─1── * ─ Persona ─── hasMany ── Endorsement (as writer, as target)  │
│                   │                                                      │
│                   └── hasMany ── ContactRequest (as sender, as target)   │
│                   │                                                      │
│                   └── hasMany ── ShadowPersona (as creator)              │
│                                                                          │
│   TraitMetadata (seed) ── referenced by UserTraits, Persona.traits keys  │
│   TraitTaxonomy (seed)  ── referenced by TraitMetadata                   │
│                                                                          │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       │ ShadowPersona.communityId      ⇢ Community
                       │ Endorsement.communityId        ⇢ Community
                       │ ContactRequest.toCommunityId   ⇢ Community (optional)
                       │
┌──────────────────────┴───────────────────────────────────────────────────┐
│  Communities area                                                        │
│                                                                          │
│   CommunityType (seed, 9 rows)                                           │
│     │                                                                    │
│     └── determines schema + feature flags for ↓                          │
│                                                                          │
│   Community ─1── * ─ CommunityMember (userId + personaId + communityId)  │
│     │                                                                    │
│     ├── optional backingPersonaUri  ⇢ Persona (Personas area)            │
│     ├── required foundingUserId     ⇢ User (Personas area)               │
│     └── optional billingUserId      ⇢ User (Personas area)               │
│                                                                          │
│   CommunityMember                                                        │
│     ├── userId                      ⇢ User (Personas area)               │
│     └── personaId                   ⇢ Persona (Personas area)            │
│                                                                          │
│   Guild sub-entities (all ⇢ Persona via guildPersonaId):                 │
│     GuildSkillCategory, GuildMembershipTier,                             │
│     GuildOffering, GuildOfferingMember, GuildRequest                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Operational / cross-area ──────────────────────────────────────────────┐
│                                                                          │
│   activity_events  — every mutation, every area. Audit log.              │
│   coach_sessions   — Mastra agent runs, cost attribution.                │
│   integrations     — external platform connections (dormant).            │
│   query_logs       — search analytics (dormant).                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Per-area pointers

| Area | Domain model | Schema spec | Physical (Drizzle) |
|---|---|---|---|
| Personas | [`../specs/personas/domain-model.md`](/domains/personas/domain-model.md) | [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) | `packages/db/src/schema/users.ts`, `traits.ts`, `personas.ts`, `shadow-personas.ts`, `endorsements.ts`, `contact-requests.ts` |
| Communities | [`../specs/communities/domain-model.md`](/domains/communities/domain-model.md) | [`../specs/communities/schema-spec.md`](/domains/communities/schema-spec.md) | `packages/db/src/schema/communities.ts`, `community-types.ts`, `guilds.ts` |
| Discovery | *(pending — Discovery PRD not yet authored)* | *(pending)* | (no new tables expected; consumes embeddings on existing tables) |
| Coaches | *(pending — Coaches PRD not yet authored)* | *(pending)* | `packages/db/src/schema/coach-sessions.ts` |
| Commerce | *(dormant)* | *(dormant)* | *(no tables yet — see Commerce PRD stub for the design)* |
| Sparks | *(dormant)* | *(dormant)* | *(no tables yet)* |
| Platform Ops | *(not data-heavy)* | *(not applicable)* | `packages/db/src/schema/activity-events.ts`, `integrations.ts` |

## Operational tables

These are cross-area operational entities. Each has a per-area consumer but none is owned exclusively by a single area.

### `activity_events`

Every state-changing mutation across every area emits a row. Audit trail for GDPR/CCPA compliance, user-facing activity feeds, moderation forensics, and metric source-of-truth (see [`metrics.md`](/foundation/metrics.md)). Schema in `packages/db/src/schema/activity-events.ts`. Enforced by the `audit-all-mutations` gate in [`principles.md`](/foundation/principles.md).

### `coach_sessions`

Mastra agent run records — conversation turns, tool calls, cost attribution. One row per coach session. Schema in `packages/db/src/schema/coach-sessions.ts`. Owned by the Coaches area when its PRD is authored.

### `platform_channel_bindings`

External platform connection records (Slack, Discord, Matrix, etc.). Currently minimal — the integration state lives inline on `communities.external_platforms` for now. Schema in `packages/db/src/schema/integrations.ts`. Owned by the Integrations area.

### `query_logs`

Search query analytics. Records MCP and internal search queries with their results and outcomes. Feeds the North Star metric (trust-backed matches per week) and the "unmet needs" surfaces in community analytics. Schema in `packages/db/src/schema/integrations.ts` (co-located with integrations for historical reasons).

## Dormant areas

### Commerce Traits

The Commerce area is dormant (no code). The designed schema for commerce-specific traits (transaction categories, per-category consent, agent-disclosure rules) will live in a future `docs/specs/commerce/schema-spec.md` when the area activates. For the current design, see the Commerce PRD stub at [`../specs/commerce/00-prd.md`](/domains/commerce/00-prd.md) and the vision use case at [`vision.md`](/foundation/vision.md) §Use Case 7.

### Sparks Ledger

The Sparks area is dormant (no code). The designed schema will live in a future `docs/specs/sparks/schema-spec.md`. For the design, see the Sparks PRD stub at [`../specs/sparks/00-prd.md`](/domains/sparks/00-prd.md) and the full mechanics at [`../business-model/03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md).

## History

- **2026-02-11** — Original 1,060-line `data-model.md` authored with full field-level detail for all entities
- **2026-04-12** — Filename changed from `02-data-model.md` to `data-model.md` during foundation reorganization
- **2026-04-14** — Trimmed from 1,060 to ~200 lines. Field-level content migrated to per-area schema specs. Pre-trim version preserved at [`_archive/data-model.2026-04-12.md`](/archive/legacy/foundation/_archive/data-model.2026-04-12.md).
