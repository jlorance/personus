---
type: spec
title: Personas — Schema Spec
description: The authenticated account. One per human.
status: current
tags: [personas]
timestamp: 2026-04-14
---

# Personas — Schema Spec

> 2026-04-14 · Framework-agnostic logical schema for the Personas area. See [`../_schema-vocabulary.md`](/domains/_schema-vocabulary.md) for the controlled vocabulary. For the conceptual ER and lifecycle see [`domain-model.md`](/domains/personas/domain-model.md). The physical implementation lives in `packages/db/src/schema/users.ts`, `traits.ts`, `personas.ts`, `shadow-personas.ts`, `endorsements.ts`, `contact-requests.ts`.

## Entities

### User

The authenticated account. One per human.

**Fields**
- `id` — identifier (uuid)
- `clerkUserId` — string, required, unique, indexed — external auth identifier from Clerk
- `email` — string, required — user's email (stored, not displayed in personas)
- `did` — string, optional, unique — decentralized identifier (DID) for AT Protocol integration
- `preferredLanguages` — array of string, optional — ISO language codes
- `defaultLocation` — object, optional — default location data for persona creation
- `defaultContactPreferences` — object, required, default `{}` — default consent categories inherited by new personas
- `mcpPreferences` — object, required, default `{}` — user-level MCP exposure defaults
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- hasOne `UserTraits` (exactly one, created alongside User)
- hasMany `Personas` (as owner; 0+)

**Lifecycle:** soft delete on account deletion (via `deletedAt` not shown — deletion flow TBD per Personas PRD open decision). Cascades: UserTraits (deleted), Personas (deleted), Personas-as-writer Endorsements (preserved but marked).

**Invariants**
1. `clerkUserId` is immutable after creation (coupling to Clerk's identity graph).
2. `did` is optional but unique when set — a user may register a DID after account creation.
3. `email` is never surfaced by any public Persona or MCP tool output.

---

### UserTraits

The master trait pool. Exactly one per User. Source of truth for every Persona's published traits.

**Fields**
- `id` — identifier (uuid)
- `userId` — reference to User, required, unique — enforces one-per-user
- `traits` — object, required, default `{}`, pii-scanned — JSON shape defined by TraitMetadata; keys are trait metadata `key` values
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `User`

**Lifecycle:** created with User, updated incrementally, deleted on User cascade.

**Invariants**
1. Every top-level key in `traits` must correspond to an existing `TraitMetadata.key`. Unknown keys are rejected at the service layer.
2. Free-text values within `traits` are pii-scanned at write. Detected PII is rejected.
3. UserTraits is never read directly by any public surface. Only the service layer reads it when constructing or updating a Persona.
4. Indexed via gin on `traits` for efficient JSONB queries by key.

---

### TraitMetadata

Data-driven definition of a trait type: its key, category, display rules, edit rules, searchability. Seed data.

**Fields**
- `id` — identifier (uuid)
- `key` — string, required, unique, immutable — the trait type identifier (e.g., `skills`, `experience`, `offerings`)
- `displayName` — string, required — human-readable label
- `description` — string, optional — purpose of this trait type
- `category` — enum [`foundations`, `capabilities`, `direction`, `offerings`, `commerce`], required, indexed
- `groupKey` — string, optional — secondary grouping within a category
- `dataType` — enum [`tag_list`, `multi_item`, `timeline`, `single_value`, `text_block`, `markdown`], required — determines rendering strategy
- `itemSchema` — object, optional — shape definition for `multi_item` data types
- `displayConfig` — object, required — rendering rules (tag style, timeline direction, visibility toggles)
- `editConfig` — object, required — editing rules (input type, validation, autocomplete source)
- `isSearchable` — boolean, default `true` — does this trait contribute to the persona embedding?
- `isEndorsable` — boolean, default `false` — can an endorser cite this specific trait in an endorsement context?
- `icon` — string, optional — icon identifier
- `displayOrder` — integer, optional — display order within its category
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships** none at the schema level. Referenced by `UserTraits.traits` keys and `Persona.traits` keys.

**Lifecycle:** seed data. Rare updates. No deletes — deprecated trait types are marked in `displayConfig` but never removed (would orphan persona trait snapshots).

**Invariants**
1. `key` is immutable after creation. Changing it would orphan every UserTraits and Persona that references it.
2. `isSearchable: true` means the trait's values contribute to the persona embedding generation. `isEndorsable: true` means the trait can appear as `endorsementContext` on an Endorsement.

---

### TraitTaxonomy

Suggested values for a trait type (e.g., programming languages for `skills`, interest categories for `interests`). Seed data, user-extensible.

**Fields**
- `id` — identifier (uuid)
- `traitKey` — string, required — references a `TraitMetadata.key`
- `taxonomySlug` — slug, required — unique identifier for this taxonomy within the trait key
- `displayName` — string, required
- `description` — string, optional
- `icon` — string, optional
- `suggestedValues` — array of string, required — the enumerated suggested values
- `displayOrder` — integer, optional
- `createdAt` — timestamp, generated, system

**Relationships** none at the schema level.

**Constraints**
- `unique within (traitKey, taxonomySlug)` — a trait can have multiple taxonomies, each with a unique slug.

**Lifecycle:** seed data + runtime extensions from user-submitted values (application-layer curation).

---

### Persona

A selective published view of a User's traits. Addressable via a URI, with its own visibility, layout, theme, and embedding.

**Fields**
- `id` — identifier (uuid)
- `uri` — slug, required, unique, immutable, indexed, lookup by uri — permanent URL-safe identifier
- `userId` — reference to User, required, indexed — owner
- `displayName` — string, required, pii-scanned — public name shown on the persona
- `initial` — string, optional — single-character fallback for avatar display
- `headline` — string, required, default `''`, pii-scanned — short tagline
- `location` — string, optional, pii-scanned — free-text location (city/region, not address)
- `entityType` — enum [`person`, `organization`], required, default `person`, indexed
- `visibility` — enum [`public`, `authenticated`, `community`, `private`], required, default `community`
- `contactPreferences` — object, required, default `{}` — per-persona consent categories (overrides User defaults)
- `completenessScore` — integer 0-100, generated, system — derived from traits via the 9-dimension scoring rubric
- `layoutPreset` — enum [`auto`, `professional`, `personal`, `community`, `service`, `creative`], required, default `auto`
- `theme` — object, required, default `{}` — color palette, header treatment, density settings
- `traits` — object, required, default `{}`, pii-scanned — **snapshot copied from UserTraits at write time**
- `mcpEnabled` — boolean, required, default `false` — is this persona exposed via MCP tools?
- `mcpTraitVisibility` — object, required, default `{}` — per-trait-key visibility overrides for MCP exposure
- `embedding` — vector[1536], generated, system — derived from searchable trait text via text-embedding-3-small
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `User` (via `userId`)
- hasMany `Endorsements` (as target, via `toPersonaUri`)
- hasMany `Endorsements` (as writer, via `fromPersonaUri`)
- hasMany `ContactRequests` (as target, via `toPersonaUri`)
- hasMany `ContactRequests` (as sender, via `fromPersonaUri`)
- hasMany `ShadowPersonas` (as creator, via `createdByPersonaUri`)
- hasMany `CommunityMemberships` (in the Communities area; via `personaId` on the membership)

**Lifecycle:** `Draft → Published → Deleted`. No archive state — `visibility=private` serves as "hidden but preserved." Hard delete removes the Persona and its received Endorsements and ContactRequests; written Endorsements persist.

**Invariants**
1. **`traits` is a snapshot.** Copied from UserTraits at create/update time. Subsequent edits to UserTraits do NOT propagate automatically. Deleting a Persona never affects UserTraits or other Personas.
2. **`uri` is immutable.** Changing it would break public links, cached embeddings, and external endorsement/contact records.
3. **`embedding` regenerates on trait write.** On any update to `traits`, the embedding is regenerated from searchable trait values (see TraitMetadata.isSearchable).
4. **`visibility=private` is invisible to all non-owners.** Unauthorized reads return 404 per `sensitive-resource-returns-404`.
5. **`traits` is pii-scanned.** Free-text trait values are scanned; detected PII is rejected at write.
6. **`layoutPreset=auto` resolves at read time** to `professional` (if entityType=person) or `community` (if entityType=organization).
7. **`mcpEnabled=false` fully suppresses MCP exposure.** Even if `mcpTraitVisibility` specifies visible traits, the `mcpEnabled=false` master switch wins.

**Indexes (query patterns)**
- `uri` unique — public URL routing and MCP tool lookup
- `userId` — persona list by owner
- `entityType` — filtered discovery queries
- `traits` gin — JSONB trait-value search
- `embedding` ivfflat (vector cosine) — semantic similarity discovery

---

### ShadowPersona

A Persona-like placeholder created for a non-user, always within a community context, built from endorsements. Claimable via token.

**Fields**
- `id` — identifier (uuid)
- `communityId` — reference to Community (Communities area), required, indexed — the community context
- `createdByPersonaUri` — reference to Persona, required — the persona of the creator (not the User directly, to preserve unlinkability)
- `displayName` — string, required, pii-scanned
- `entityType` — enum [`person`, `organization`], required, default `person`
- `traits` — object, required, default `{}`, pii-scanned — AI-extracted from endorsements written about this shadow
- `embedding` — vector[1536], generated, system — derived from traits
- `claimStatus` — enum [`unclaimed`, `invited`, `claimed`, `expired`], required, default `unclaimed`, indexed
- `claimToken` — string, optional, unique, lookup by claimToken — one-time token, null after claim
- `claimedByPersonaUri` — reference to Persona, optional — set when claimed
- `inviteSentVia` — string, optional — channel used for the invite (e.g., `email`, `signal`)
- `inviteSentAt` — timestamp, optional — when the invite was sent
- `expiresAt` — timestamp, optional — claim window end (value TBD per Personas PRD open decision)
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `Community` (via `communityId`) — cross-area reference
- belongsTo `Persona` (as creator, via `createdByPersonaUri`)
- belongsTo `Persona` (as claimed result, via `claimedByPersonaUri`; set on claim)
- hasMany `Endorsements` (as target, via `toShadowPersonaId`)

**Lifecycle**
```
unclaimed → invited (inviteSentAt set) → claimed (claimedByPersonaUri set, claimToken nulled)
                            ↓
                         expired → hard delete after grace period
```

**Invariants**
1. **Community-scoped.** `communityId` is required; shadows never exist outside a community context.
2. **Creator is a persona, not a user.** `createdByPersonaUri` preserves unlinkability — other users cannot trace a shadow back to its creator's User account.
3. **Claim is idempotent and exclusive.** Once `claimedByPersonaUri` is set, `claimToken` is nulled and the shadow cannot be re-claimed.
4. **On claim, endorsements transfer atomically.** All Endorsements with `toShadowPersonaId = this.id` are updated in a single transaction to point at the claiming Persona's `uri` via `toPersonaUri`, and `toShadowPersonaId` is nulled.
5. **Expired shadows are hard-deleted**, not soft-deleted. There is no reason to preserve an un-claimable shadow.

---

### Endorsement

A positive trust signal written by one Persona about another Persona or ShadowPersona, always community-scoped.

**Fields**
- `id` — identifier (uuid)
- `fromPersonaUri` — reference to Persona, required, indexed — the writer's persona
- `toPersonaUri` — reference to Persona, optional, indexed — target persona (exclusive with `toShadowPersonaId`)
- `toShadowPersonaId` — reference to ShadowPersona, optional, indexed — target shadow (exclusive with `toPersonaUri`)
- `communityId` — reference to Community (Communities area), required, indexed — every endorsement is community-scoped
- `relationshipType` — enum [`coworker`, `client`, `collaborator`, `neighbor`, `friend`, `mentor`, `other`], required — declared relationship between writer and target
- `endorsementContext` — array of string, optional, default `[]` — the specific trait keys the endorsement speaks to (each must reference a `TraitMetadata.key` with `isEndorsable=true`)
- `strength` — enum [`standard`, `strong`], required, default `standard`
- `testimonial` — markdown, optional, pii-scanned — free-text positive testimonial
- `visibility` — enum [`public`, `authenticated`, `community`, `private`], required, default `community`
- `active` — boolean, default `true` — soft-revoke flag (set to false when a writer revokes)
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `Persona` (as writer, via `fromPersonaUri`)
- belongsTo `Persona` **or** `ShadowPersona` (as target, xor)
- belongsTo `Community` (via `communityId`) — cross-area reference

**Constraints**
- `check: (toPersonaUri IS NOT NULL) OR (toShadowPersonaId IS NOT NULL)` — exactly one target must be set (enforced as a CHECK constraint at the database level).

**Lifecycle:** no update lifecycle beyond `active=true → active=false` (soft revoke). Endorsements are otherwise immutable. Hard delete only when the containing community is closed.

**Invariants**
1. **Positive-only.** No `rating` field. No `score`. No `complaint`. No `negative` flag. The schema shape itself enforces that endorsements cannot become reviews.
2. **Writer is a persona, not a user.** This is the core unlinkability preservation — a user who writes an endorsement from their Professional persona cannot be cross-referenced to their other personas via endorsement history.
3. **Community-scoped.** `communityId` is required. Every endorsement is tied to the community context in which it was given.
4. **Target xor.** Exactly one of `toPersonaUri` or `toShadowPersonaId` is set. Never both, never neither.
5. **`endorsementContext` values must reference endorsable traits.** Each entry must correspond to a `TraitMetadata.key` with `isEndorsable=true`.
6. **On target Persona deletion**, the Endorsement is preserved but the target reference becomes dangling; the UI handles this by rendering "endorsement of a deleted persona."
7. **Written by a deleted persona:** preserved but marked inactive (`active=false`) so the trust signal is retained without exposing the deleted writer.

---

### ContactRequest

A mediated introduction request to a Persona. Routes through a ContactRelay — raw contact details are never stored here.

**Fields**
- `id` — identifier (uuid)
- `fromPersonaUri` — reference to Persona, optional — sender is another Persona
- `fromAgentId` — reference to an AI agent, optional — sender is an AI agent acting on behalf of a user
- `fromAnonymous` — object, optional — sender is a visitor (e.g., from a public directory); JSON blob captures whatever identification the visitor provided
- `toPersonaUri` — reference to Persona, required, indexed — target
- `toCommunityId` — reference to Community (Communities area), optional — community context when the request originated inside a community surface
- `reason` — string, required — brief reason for the contact request
- `message` — markdown, optional, pii-scanned — free-text message (users may legitimately include their own contact info)
- `triageNote` — string, optional — AI-generated triage commentary shown to the target
- `triageScore` — integer 0-100, optional — AI-generated relevance score
- `matchedOpenTo` — array of string, optional — target's "open to" trait values this request matched
- `trustChain` — array of string, optional — the chain of endorsements linking sender to target (e.g., `["user_priya_kumar", "strong_endorsement"]`)
- `status` — enum [`pending`, `delivered`, `accepted`, `declined`, `expired`], required, default `pending`, indexed
- `respondedAt` — timestamp, optional — set when target responds
- `responseNote` — string, optional — target's free-text response
- `createdAt` — timestamp, generated, system (no `updatedAt` — see Invariants)
- `expiresAt` — timestamp, optional — request window end

**Relationships**
- belongsTo `Persona` (as sender, via `fromPersonaUri`) — optional, one of three sender modes
- belongsTo `Persona` (as target, via `toPersonaUri`) — required
- belongsTo `Community` (via `toCommunityId`) — optional, cross-area reference

**Constraints**
- `check: exactly one of (fromPersonaUri, fromAgentId, fromAnonymous) is set` — three sender modes, exclusive.

**Lifecycle**
```
pending → delivered → accepted | declined | expired
```
No `updatedAt` column. Once responded, `respondedAt` + `responseNote` are set and the row is never modified again.

**Invariants**
1. **Raw contact details never stored here.** The request routes through a `ContactRelay` (to be built per Personas PRD open decision). The adapter resolves the target's channel preferences and delivers; contact details live in User-level preferences, not on the request.
2. **Three sender modes, mutually exclusive.** A request comes from exactly one of: another Persona, an AI agent, or an anonymous visitor.
3. **`message` is pii-scanned but not rejected.** Users may legitimately share their own contact info in the message. PII detection warns but does not block.
4. **Immutability after response.** Status transitions are one-way (`pending → delivered → accepted|declined|expired`). A responded-to request is immutable.
5. **Every status transition emits an `activity_events` row** per `audit-all-mutations`.

---

## Cross-entity invariants (area-level)

1. **Unlinkability.** No query surface may automatically reveal that two Personas belong to the same User. The `User → Persona` foreign key exists in schema but is only used by the service layer when authenticating the owner. Public surfaces, MCP tools, and internal cross-persona queries must not traverse `userId`.

2. **Trait copy, not reference.** When a Persona is created or updated, the published traits are copied from UserTraits into `Persona.traits`. Subsequent updates to UserTraits do NOT propagate automatically. The owner must re-sync explicitly.

3. **Endorsement writer is a Persona, not a User.** The writer-side foreign key is `fromPersonaUri`, not a User reference. This preserves unlinkability across personas written from different facets of the same user's identity.

4. **Community scoping for endorsements and shadows.** Every Endorsement and every ShadowPersona has a non-null `communityId`. There is no "global" endorsement or shadow. Discovery surfaces may project these into non-community contexts but the data is always attached to a community.

5. **Contact channel indirection.** ContactRequest never stores raw contact details. The `ContactRelay` abstraction owns channel resolution and delivery.

6. **PII boundary.** Free-text fields on User (`email`), UserTraits (`traits`), Persona (`displayName`, `headline`, `location`, `traits`), ShadowPersona (`displayName`, `traits`), Endorsement (`testimonial`), and ContactRequest (`message`) are pii-scanned at write. Detected PII is **rejected** on persona-level trait snapshots (Persona, UserTraits, ShadowPersona) and **warned-but-allowed** on user-to-user communication fields (Endorsement testimonial, ContactRequest message).

7. **Soft delete vs hard delete.** Personas and Users are soft-deleted to preserve trust graph integrity. ShadowPersonas that expire unclaimed are hard-deleted. Endorsements are soft-revoked via `active=false` but never hard-deleted except on community closure. ContactRequests have no delete — they expire naturally.

## Indexes (query patterns)

Read paths the area supports and the indexes that back them:

| Query | Backing index |
|---|---|
| Persona lookup by URI | `personas.uri` (unique) |
| Persona list by owner | `personas.userId` |
| Persona discovery by entityType + visibility | `personas.entityType` |
| Persona trait search (JSONB) | `personas.traits` (gin) |
| Persona semantic similarity | `personas.embedding` (ivfflat, vector cosine) |
| UserTraits by user | `user_traits.userId` (unique) |
| UserTraits JSONB queries | `user_traits.traits` (gin) |
| Endorsements received by a persona | `endorsements.toPersonaUri` |
| Endorsements written by a persona | `endorsements.fromPersonaUri` |
| Endorsements in a community | `endorsements.communityId` |
| Endorsements received by a shadow | `endorsements.toShadowPersonaId` |
| Shadow lookup for claim | `shadow_personas.claimToken` (unique) |
| Shadows in a community | `shadow_personas.communityId` |
| Shadows by claim status | `shadow_personas.claimStatus` |
| Shadow semantic similarity | `shadow_personas.embedding` (ivfflat) |
| Contact requests received | `contact_requests.toPersonaUri` |
| Contact requests by status | `contact_requests.status` |

## Cross-area references

- `ShadowPersona.communityId` → `Community.id` (Communities area — see [`../communities/schema-spec.md`](/domains/communities/schema-spec.md) when it exists)
- `Endorsement.communityId` → `Community.id` (Communities area)
- `ContactRequest.toCommunityId` → `Community.id` (Communities area, optional)
- `Persona` is referenced from the Communities area via `community_members.personaId` — see the Communities schema spec for the membership model
