---
type: foundation
title: AT Protocol Integration — System Overview
description: "The users table has an optional did field (unique when set). A User with a DID can:"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# AT Protocol Integration — System Overview

> 2026-04-14 · Architectural decisions about Personus's integration with the AT Protocol (Bluesky / atproto) ecosystem. **Not currently implemented** — this file captures the design so it's ready when integration is prioritized.
>
> **Where to find what:**
> - **Design principles + identity model** (this file)
> - **Full pre-trim design** (lexicons, firehose consumer, XRPC endpoints, social graph mapping): archived at [`_archive/at-protocol.2026-04-12.md`](/archive/legacy/foundation/_archive/at-protocol.2026-04-12.md)
> - **Ecosystem survey + strategic positioning** (Bluesky user base, production atmosphere apps, competitive landscape): moved to [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md); pre-trim archived at [`_archive/atmosphere.2026-04-12.md`](/archive/legacy/foundation/_archive/atmosphere.2026-04-12.md)
> - **DID-based authentication** (AT Proto OAuth, DPoP): [`authentication.md`](/foundation/authentication.md) §The three identity modes §Mode 2
> - **User schema `did` field**: [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §User

## Design principles (when integration activates)

1. **User-owned data.** Persona records live in the user's AT Protocol repository when public. Personus indexes them; the user controls the source of truth.
2. **Public by default, private by choice.** Public personas are stored in atproto repos for maximum discoverability. Private/community/authenticated personas stay server-side until atproto ships private namespaces.
3. **Additive, not duplicative.** Personus enriches atproto identity — it doesn't replace Bluesky profiles or compete with them.
4. **Lexicon-first data modeling.** The data model is expressible as atproto lexicons even before the integration ships, ensuring we don't paint ourselves into a corner.
5. **Graceful degradation.** The app works fully without atproto. AT Protocol is an optional identity and portability layer, not a hard dependency.

## The core architectural decisions

### 1. DID as optional identity anchor

The `users` table has an optional `did` field (unique when set). A User with a DID can:
- Authenticate via AT Protocol OAuth (see [`authentication.md`](/foundation/authentication.md))
- Publish public personas as `ai.personus.persona` records in their atproto repo
- Have their endorsements show up in the atproto firehose as `ai.personus.endorsement` records

A User without a DID operates fully via Clerk-only auth. Adding a DID is always an explicit user action ("Connect Bluesky") and is reversible.

### 2. Dual-storage model — atproto + Postgres

When a public persona is published to atproto:
- **Source of truth**: the user's atproto PDS repo, as a lexicon record
- **Personus index**: a denormalized copy in `personas.traits` + `personas.embedding` for fast query, discovery, and ranking
- **Sync direction**: bidirectional — user edits in either surface update the other

Private personas, community-scoped data, and all member traits stay server-side only. They are never published to atproto. This is the private-by-choice rule.

### 3. Lexicon namespace

All Personus atproto records live under the `ai.personus.*` namespace:
- `ai.personus.persona` — a public persona record
- `ai.personus.endorsement` — an endorsement written by one persona about another
- Future: `ai.personus.community`, `ai.personus.offering`, others as needed

The lexicon namespace is registered and stable. Changing it would orphan every Personus record in existing atproto repos.

### 4. Handle as vanity URL

A user's Bluesky handle (e.g., `maya.bsky.social` or `maya.personus.ai`) becomes a vanity URL for their primary public persona. The persona URI is the canonical identifier; the handle is a shortcut.

### 5. Graceful degradation at every layer

The app must function fully if:
- The atproto network is unreachable
- The user has no DID
- The PDS is temporarily offline
- A sync operation fails mid-publish

None of these conditions may block a user from viewing, editing, or discovering content within Personus itself.

## What's designed but not built

The full pre-trim design covers:

- **Lexicon record schemas** for `ai.personus.persona` and `ai.personus.endorsement` — ~160 lines of record shape definitions
- **Data flow diagrams** for the dual-storage sync
- **Firehose consumer** — a background worker that subscribes to the atproto firehose and updates the Personus index when relevant records appear
- **XRPC endpoints** — atproto RPC endpoints Personus would expose for App View queries
- **Labeler design** (optional, Tier 3) — using atproto's labeler infrastructure to publish trust signals as labels
- **Social graph mapping** — importing Bluesky follows as Personus endorsements (with clear semantic distinction), mapping Bluesky lists to Personus communities
- **Implementation phases** — a 3-phase rollout from read-only firehose consumption → publishing personas → publishing endorsements and labels

**All of this lives in the archive** at [`_archive/at-protocol.2026-04-12.md`](/archive/legacy/foundation/_archive/at-protocol.2026-04-12.md). When the integration is prioritized, port it into a proper Integrations feature spec (`docs/specs/integrations/at-protocol.md` or expand the existing `docs/specs/integrations/09-activitypub.md` — note that spec is about ActivityPub, not AT Proto, and they are separate protocols).

## Ecosystem context (moved to research)

The pre-trim `atmosphere.md` file (~272 lines) surveyed the AT Protocol ecosystem — what apps exist, Bluesky's user base, IETF standardization status, infrastructure availability, competitive landscape, strategic positioning, and a mutual-benefit narrative. That content is **research and strategy**, not foundation architecture. It has been:

1. **Preserved in archive**: [`_archive/atmosphere.2026-04-12.md`](/archive/legacy/foundation/_archive/atmosphere.2026-04-12.md)
2. **Pointed at from research**: [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md) (existing research doc; the archived content should be folded in when someone has time)
3. **Referenced from business**: [`business.md`](/foundation/business.md) §Competitive Landscape mentions Bluesky/AT Proto as a **potential integration partner, not competitor**

The foundation layer does not need an ecosystem survey. Research docs and business strategy are the right homes.

## Forward references

| Topic | Where it lives |
|---|---|
| DID authentication flow (OAuth, DPoP, handle verification) | [`authentication.md`](/foundation/authentication.md) §The three identity modes |
| `users.did` schema field | [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §User |
| AT Proto as an integration surface (when built) | `docs/specs/integrations/` (not yet created; distinct from `09-activitypub.md` which is about ActivityPub) |
| Ecosystem survey + strategy | [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md) + [`_archive/atmosphere.2026-04-12.md`](/archive/legacy/foundation/_archive/atmosphere.2026-04-12.md) |
| Competitive positioning vs Bluesky | [`business.md`](/foundation/business.md) §Competitive Landscape |
| Vision use case (Kai: AT Protocol + private neighborhood persona) | [`vision.md`](/foundation/vision.md) §Use Case 8 |
| Open social web citizen principle | [`principles.md`](/foundation/principles.md) §Vision Principles §19 |

## Displacement note

This file replaces two pre-trim files that have been merged and archived:

| Legacy file | Lines | Fate |
|---|---|---|
| `at-protocol.md` (integration design) | 468 | Compressed to the 5 architectural decisions above; full lexicon + firehose + XRPC + implementation phases in [`_archive/at-protocol.2026-04-12.md`](/archive/legacy/foundation/_archive/at-protocol.2026-04-12.md) |
| `atmosphere.md` (ecosystem survey) | 272 | Deleted as a foundation file (it was research, not architecture); preserved in [`_archive/atmosphere.2026-04-12.md`](/archive/legacy/foundation/_archive/atmosphere.2026-04-12.md); content belongs in `docs/research/at_protocol_integration.md` |

**Total: 740 lines → ~130 lines. `atmosphere.md` no longer exists as a foundation file.**

## History

- **2026-02-10** — `at-protocol.md` authored as the integration design spec (468 lines)
- **2026-02-24** — `atmosphere.md` authored as the ecosystem survey + strategic positioning doc (272 lines)
- **2026-04-12** — Both files renamed during foundation reorganization (from `07-at-protocol.md` and `10-atmosphere.md`)
- **2026-04-14** — Merged into this single `at-protocol.md`. `atmosphere.md` removed from the foundation layer. Implementation details moved to archive; ecosystem survey moved to `docs/research/` (via pointer).
