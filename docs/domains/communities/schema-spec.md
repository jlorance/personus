---
type: spec
title: Communities — Schema Spec
description: "Data-driven template defining a community's trait schemas, feature flags, and defaults. Seed data. The 9 types are enumerated in the seed data at packages/db/src/seed/community-types.ts."
status: current
tags: [communities]
timestamp: 2026-04-14
---

# Communities — Schema Spec

> 2026-04-14 · Framework-agnostic logical schema for the Communities area. See [`../_schema-vocabulary.md`](/domains/_schema-vocabulary.md) for the controlled vocabulary. For the conceptual ER and lifecycle see [`domain-model.md`](/domains/communities/domain-model.md). The physical implementation lives in `packages/db/src/schema/communities.ts`, `community-types.ts`, `guilds.ts`.

## Entities

### CommunityType

Data-driven template defining a community's trait schemas, feature flags, and defaults. Seed data. The 9 types are enumerated in the seed data at `packages/db/src/seed/community-types.ts`.

**Fields**
- `id` — identifier (uuid)
- `slug` — slug, required, unique, immutable, indexed, lookup by slug — type identifier (`club`, `organization`, `friends`, `guild`, `workplace`, `customer`, `neighborhood`, `event`, `educational`)
- `name` — string, required — human-readable label
- `description` — string, optional
- `icon` — string, optional — icon identifier
- `communityTraitSchema` — array of object, required, default `[]` — JSON shape defining the community-level trait fields (mission, location, tags, etc.)
- `memberTraitSchema` — array of object, required, default `[]` — JSON shape defining the member-level trait fields for this type
- `defaultJoinPolicy` — enum [`open`, `invite`, `approval`], required, default `open`
- `defaultVisibility` — enum [`public`, `authenticated`, `community`, `private`], required, default `public`
- `maxMembersDefault` — integer, optional — default member cap
- `featureFlags` — object, required, default `{}` — feature toggles active for this type (`events`, `chapters`, `skill_taxonomy`, `request_routing`, `offerings`, `membership_tiers`, etc.)
- `displayOrder` — integer, required, default 0
- `isActive` — boolean, required, default `true` — types can be deactivated without deletion
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships** none at the schema level. Referenced by `Community.communityType` via slug.

**Lifecycle:** seed data. Rare updates. No deletes — deprecated types are marked `isActive=false` but never removed (would orphan existing communities).

**Invariants**
1. `slug` is immutable after creation. Changing it would orphan every Community that references it.
2. `communityTraitSchema` and `memberTraitSchema` are the source of truth for what fields are valid in `Community.traits` and `CommunityMember.memberTraits` respectively.
3. `featureFlags` drives per-type UI and behavior divergence. Specs describe generic behavior and check feature flags at the service layer for type-specific divergence.

---

### Community

The central entity. A structured capability overlay on a group of people.

**Fields**
- `id` — identifier (uuid)
- `slug` — slug, required, unique, immutable, indexed, lookup by slug — URL-safe permanent identifier
- `name` — string, required — display name
- `description` — string, optional
- `icon` — string, optional
- `communityType` — string, required, default `club`, indexed — references `CommunityType.slug`
- `traits` — object, required, default `{}`, pii-scanned — community-level trait values (shape defined by the type's `communityTraitSchema`)
- `embedding` — vector[1536], generated, system — derived from `traits` for semantic similarity
- `backingPersonaUri` — reference to Persona, optional, indexed — organization Persona that backs this community (if any)
- `tags` — array of string, optional, default `[]`, indexed (gin) — free-form Explore-page discovery tags
- `externalPlatforms` — array of object, required, default `[]` — linked external platforms (`{platform, url, connectedAt}`), stored as JSONB
- `visibility` — enum [`public`, `authenticated`, `community`, `private`], required, default `public`
- `joinPolicy` — enum [`open`, `invite`, `approval`], required, default `open`
- `memberCount` — integer, default 0, generated, system — denormalized count, updated by triggers
- `maxMembers` — integer, optional — member cap (nullable = unlimited)
- `foundingUserId` — reference to User (Personas area), required, indexed — the user who created the community
- `billingUserId` — reference to User, optional, indexed — user who pays for the community tier (may differ from founder)
- `startDate` — timestamp, optional — event-type communities only
- `endDate` — timestamp, optional — event-type communities only
- `geographicBounds` — object, optional — neighborhood-type communities only (GeoJSON-like)
- `parentCommunityId` — reference to Community, optional, indexed — chapter hierarchy (**drift:** planned to be replaced by `community_relationships` per design ADR decision #18)
- `autoArchive` — boolean, required, default `false` — event-type: auto-archive after `endDate`
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `CommunityType` (via `communityType` slug)
- belongsTo `User` (as founder, via `foundingUserId`) — cross-area reference
- belongsTo `User` (as billing contact, via `billingUserId`) — cross-area reference, optional
- belongsTo `Persona` (as backing persona, via `backingPersonaUri`) — cross-area reference, optional
- hasMany `CommunityMember` (via `communityId`)
- hasMany `Community` (self-ref via `parentCommunityId`, drift)
- referenced by `ShadowPersona.communityId`, `Endorsement.communityId`, `ContactRequest.toCommunityId` (Personas area)

**Lifecycle:**
```
Created → Active → (Archived | Closed → grace period → hard delete)
```
Archive is reversible. Close triggers a 30-day grace period, notifications to all members, and then hard delete of the community row and cascaded cleanup of memberships.

**Invariants**
1. **`slug` is immutable.** Changing it breaks public URLs and external references.
2. **`foundingUserId` is immutable and the founding user is always an admin.** Enforced by hard service-layer constraint — no role demotion, no membership removal for the founder.
3. **`communityType` references a valid seed row.** At write time, the service layer verifies the slug exists in `CommunityType`.
4. **`traits` is PII-scanned** at write; detected PII is rejected.
5. **`traits` and `memberTraits` schemas are enforced by type.** The `Community.communityType` determines which keys are valid in `traits`; the service layer validates against `CommunityType.communityTraitSchema`.
6. **`embedding` regenerates on `traits` write.**
7. **Private communities return 404** to unauthorized readers per `sensitive-resource-returns-404`.
8. **`externalPlatforms` is a JSONB array.** No separate platform_channel_bindings table for community-level integrations; the integration state lives inline on the community row. This is a simplification; may be revisited if integration state grows complex.

**Indexes (query patterns)**
- `slug` unique — public URL routing
- `communityType` — filtered browse by type
- `foundingUserId` — list communities by founder
- `backingPersonaUri` — list communities backed by a given org persona
- `parentCommunityId` — chapter hierarchy traversal
- `tags` gin — Explore page tag filtering
- `traits` gin — JSONB trait queries
- `embedding` ivfflat (vector cosine) — similar communities

---

### CommunityMember

The junction between User, Persona, and Community. **Three-way relationship** — never collapse to (user, community) or (persona, community) alone.

**Fields**
- `id` — identifier (uuid)
- `userId` — reference to User, required, indexed — the human (for permissions, billing, dedup)
- `personaId` — reference to Persona, required, indexed — what the user shares with this community (for display and scoped search)
- `communityId` — reference to Community, required, indexed
- `role` — enum [`member`, `steward`, `admin`], required, default `member`, indexed
- `memberTraits` — object, required, default `{}`, pii-scanned — member-level trait values (shape defined by the community's type `memberTraitSchema`)
- `visible` — boolean, default `true` — soft-hide for approval-required flows before activation
- `joinedAt` — timestamp, generated, system
- `invitedByUserId` — reference to User, optional — who invited this member (for invite tracking)
- `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `User` (as member, via `userId`) — cross-area reference
- belongsTo `Persona` (as displayed persona, via `personaId`) — cross-area reference
- belongsTo `Community` (via `communityId`)
- belongsTo `User` (as inviter, via `invitedByUserId`) — optional

**Constraints**
- `unique(userId, communityId)` — a user may join a community only once, regardless of persona. Switching personas is an update to the existing row.

**Lifecycle:**
```
(Pending | Active) → Left | Removed
```
- `visible=false, role='member'` is the pending state for approval-required communities
- `visible=true, role='member'` is active
- Leave and remove are effected by row deletion with an `activity_events` audit entry — no soft delete

**Invariants**
1. **Three-way triple.** `userId`, `personaId`, and `communityId` are all required. Never allow a null on any of the three.
2. **Unique per user per community.** The `unique(userId, communityId)` constraint means a user is either a member or not; they cannot have multiple memberships in the same community under different personas. Changing persona is an update operation.
3. **Founding user role cannot be demoted.** Service-layer check: any attempt to change the `role` of the user matching `Community.foundingUserId` is rejected.
4. **`memberTraits` conforms to the community's type schema.** Service layer validates against `CommunityType.memberTraitSchema` at write.
5. **`memberTraits` is PII-scanned;** detected PII is rejected.
6. **Member traits are community-scoped.** What a user shares in one community is not automatically visible in any other community. Cross-community visibility requires explicit opt-in cross-persona linking (Personas area).

**Indexes**
- `userId` — list my communities
- `personaId` — list communities where a given persona is shown
- `communityId` — member directory queries
- `role` — role-filtered queries (e.g., "all stewards in this community")

---

## Guild sub-entities

Guilds are an organization-type Persona with guild feature flags active. All guild entities reference a `guildPersonaId` directly, not a `communityId`. A Community row of type `guild` may optionally be attached via `backingPersonaUri` for discovery, but the guild mechanics live on the persona.

### GuildSkillCategory

Hierarchical skill taxonomy owned by a guild persona.

**Fields**
- `id` — identifier (uuid)
- `guildPersonaId` — reference to Persona, required — the guild persona this taxonomy belongs to
- `name` — string, required — category name
- `description` — string, optional
- `parentCategoryId` — reference to GuildSkillCategory, optional — self-reference for hierarchy
- `skillTags` — array of string, required — skill keywords in this category
- `displayOrder` — integer, optional
- `icon`, `color` — strings, optional
- `createdAt`, `updatedAt` — timestamp, generated, system

**Constraints:** `unique(guildPersonaId, name)` — category names are unique within a guild.

**Relationships**
- belongsTo `Persona` (as guild persona)
- belongsTo `GuildSkillCategory` (self-ref, parent)
- hasMany `GuildSkillCategory` (self-ref, children)
- referenced by `GuildOffering.skillCategoryIds` and `GuildRequest.matchedCategoryIds`

---

### GuildMembershipTier

Progressive membership level (e.g., apprentice, journeyman, master) with criteria and permissions.

**Fields**
- `id` — identifier (uuid)
- `guildPersonaId` — reference to Persona, required
- `name` — string, required — tier name
- `description` — string, optional
- `displayOrder` — integer, optional — sequencing of tiers (0 = lowest)
- `criteria` — object, required — the rules for qualifying for this tier (e.g., `{minEndorsements: 5, requiredSkillCategories: [...], minYearsActive: 2}`)
- `permissions` — object, optional — tier-specific permission overrides
- `badgeConfig` — object, optional — visual badge configuration for member cards
- `createdAt`, `updatedAt` — timestamp, generated, system

**Constraints:** `unique(guildPersonaId, name)` — tier names are unique within a guild.

**Relationships**
- belongsTo `Persona` (as guild persona)

---

### GuildOffering

A service, workshop, mentoring slot, or product offered through the guild.

**Fields**
- `id` — identifier (uuid)
- `guildPersonaId` — reference to Persona, required
- `title` — string, required
- `description` — string, required
- `category` — string, optional — free-form category tag
- `skillCategoryIds` — array of reference to GuildSkillCategory, optional — which skill categories fulfill this offering
- `priceModel` — object, optional — pricing structure (free, hourly, project-based, tiered, etc.)
- `availability` — string, optional — availability description
- `status` — enum [`active`, `paused`, `closed`], required, default `active`
- `displayOrder` — integer, optional
- `createdAt`, `updatedAt` — timestamp, generated, system

**Relationships**
- belongsTo `Persona` (as guild persona)
- hasMany `GuildOfferingMember`
- referenced by `GuildRequest.matchedOfferingId`

**Lifecycle:** `active → paused → active | closed`

---

### GuildOfferingMember

Which member personas fulfill which offerings. A member must opt in to each offering they want to be routed to.

**Fields**
- `id` — identifier (uuid)
- `offeringId` — reference to GuildOffering, required
- `memberPersonaUri` — reference to Persona, required — the member's persona
- `status` — enum [`active`, `paused`, `removed`], required, default `active`
- `notes` — string, optional — free-form notes (availability, specialization, etc.)
- `createdAt` — timestamp, generated, system

**Constraints:** `unique(offeringId, memberPersonaUri)` — a persona can opt into an offering at most once.

**Relationships**
- belongsTo `GuildOffering`
- belongsTo `Persona` (as member, via URI)

---

### GuildRequest

An inbound need routed to qualified guild members.

**Fields**
- `id` — identifier (uuid)
- `guildPersonaId` — reference to Persona, required — the guild being asked
- `requesterId` — reference to User, optional — authenticated requester
- `requesterPersonaUri` — reference to Persona, optional — the requester's persona
- `needDescription` — string, required, pii-scanned — what the requester needs
- `matchedCategoryIds` — array of reference to GuildSkillCategory, optional — matched skill categories
- `matchedOfferingId` — reference to GuildOffering, optional — matched offering (if any)
- `routedToPersonaUris` — array of string, optional — the personas the request was routed to
- `selectedPersonaUri` — reference to Persona, optional — the persona the requester selected (if any)
- `status` — enum [`pending`, `matched`, `accepted`, `declined`, `expired`], required, default `pending`
- `urgency` — enum [`low`, `normal`, `high`, `urgent`], required, default `normal`
- `responseDeadline` — timestamp, optional
- `createdAt` — timestamp, generated, system
- `expiresAt` — timestamp, optional

**Relationships**
- belongsTo `Persona` (as guild, via `guildPersonaId`)
- belongsTo `User` (as requester, via `requesterId`) — optional cross-area reference
- belongsTo `Persona` (as requester persona, via `requesterPersonaUri`) — optional cross-area reference
- belongsTo `GuildOffering` (as matched offering, via `matchedOfferingId`) — optional
- belongsTo `Persona` (as selected fulfiller, via `selectedPersonaUri`) — optional

**Lifecycle:**
```
pending → matched (matchedCategoryIds + routedToPersonaUris set) → accepted | declined | expired
```

**Invariants**
1. **`needDescription` is pii-scanned** (warned but allowed — requester may legitimately share their contact info in a request).
2. **Requester identification is flexible.** At least one of `requesterId` or `requesterPersonaUri` should typically be set, but both may be null for anonymous inbound requests (the request still includes `needDescription` and whatever identification the front-end collected).

---

## Cross-entity invariants (area-level)

1. **Community type drives behavior.** Every community has a `communityType` slug that references a seed `CommunityType` row. Type determines trait schemas, member trait schemas, feature flags, and defaults. Behavior differences across types are resolved via feature flag checks at the service layer, not code branches in feature specs.

2. **Membership is a three-way triple.** `CommunityMember` stores `(userId, personaId, communityId)`. The User is the human for permissions and billing; the Persona is what's shown in the community; the Community is the context. Never collapse.

3. **Unique membership per user per community.** Switching personas in a community is an update to the existing `CommunityMember` row, not a new row. Enforced by `unique(userId, communityId)`.

4. **Founding user immutability.** `Community.foundingUserId` is set on creation and is always an admin. No role change, no membership removal. Only closure dissolves this relationship.

5. **Guilds are personas, not a separate entity type.** All guild sub-entities (skill categories, tiers, offerings, offering members, requests) reference `guildPersonaId` — a Persona with guild feature flags — directly. There is no `guilds` table. A guild may optionally have a `Community` row with `communityType='guild'` attached via `backingPersonaUri`, but the mechanics live on the persona.

6. **Trait schemas cascade from CommunityType.** `Community.traits` is validated against `CommunityType.communityTraitSchema` at write. `CommunityMember.memberTraits` is validated against `CommunityType.memberTraitSchema`. Both are PII-scanned.

7. **Community-scoped endorsements and shadows.** Every Endorsement and ShadowPersona (Personas area) has a `communityId` foreign key into this area. The Personas area owns those entities, but the Communities area provides the scoping context.

## Indexes (query patterns)

| Query | Backing index |
|---|---|
| Community lookup by slug | `communities.slug` (unique) |
| Community list by type | `communities.communityType` |
| Community list by founding user | `communities.foundingUserId` |
| Community list by backing persona | `communities.backingPersonaUri` |
| Chapter hierarchy traversal | `communities.parentCommunityId` |
| Tag filtering on Explore page | `communities.tags` (gin) |
| Community trait search | `communities.traits` (gin) |
| Similar communities | `communities.embedding` (ivfflat, vector cosine) |
| My communities (member-side) | `community_members.userId` |
| Communities where a persona is shown | `community_members.personaId` |
| Community member directory | `community_members.communityId` |
| Stewards/admins of a community | `community_members.role` |

## Cross-area references

- `Community.foundingUserId`, `Community.billingUserId` → `User` (Personas area)
- `Community.backingPersonaUri` → `Persona` (Personas area)
- `CommunityMember.userId` → `User` (Personas area)
- `CommunityMember.personaId` → `Persona` (Personas area)
- `CommunityMember.invitedByUserId` → `User` (Personas area)
- All guild sub-entities → `Persona` (Personas area) via `guildPersonaId` and various persona URI references
- `ShadowPersona.communityId`, `Endorsement.communityId`, `ContactRequest.toCommunityId` → `Community` (inbound from Personas area)

## Drift and open questions

1. **`parentCommunityId` vs. `community_relationships` table** — Communities design ADR decision #18 specifies replacing the self-reference with a relationship table supporting four relationship types (chapter_of, affiliated_with, referral_partner, cohort_of). **The code still uses the self-reference.** When the replacement is implemented, update this schema spec and the `02-data-model.md` cross-area ER map.

2. **`externalPlatforms` as inline JSONB array** — Currently integration state lives on `Community.externalPlatforms`. If integration state grows (status, health, last sync, credentials reference), this may need to become a separate `community_integrations` table. Not blocking.

3. **GuildRequest requester identification** — Both `requesterId` and `requesterPersonaUri` are optional. For anonymous inbound requests, both may be null. The schema allows this but the PRD should clarify whether fully-anonymous guild requests are a supported flow. See Personas PRD §ContactRequest (three-sender-mode pattern) — it may make sense to harmonize these.
