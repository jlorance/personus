---
type: foundation
title: Communities — Domain Model
description: "Not yet in schema but designed (flagged as drift):"
status: current
tags: [communities]
timestamp: 2026-04-14
---

# Communities — Domain Model

> 2026-04-14 · Conceptual ER for the Communities area. For field-level detail see [`schema-spec.md`](/domains/communities/schema-spec.md). For the physical implementation see `packages/db/src/schema/communities.ts`, `community-types.ts`, `guilds.ts`. For the Guild sub-area design see [`guilds-prd.md`](/domains/communities/guilds-prd.md).

## Entities

- **Community** — A structured capability overlay on a group of people. Has a type (club, guild, workplace, etc.), a trait profile, member list, and optional integrations with external platforms. May be backed by an organization Persona for branding and authority.
- **CommunityType** — Data-driven template that defines a community's trait schema, member trait schema, feature flags, and defaults. Seed data. Changing a type is a seed-data change, not a code change.
- **CommunityMember** — The junction between a User, a Persona, and a Community. Three-way relationship: the User is the human (for permissions and billing), the Persona is what they share with this community (for display and scoped search), and the Community is the context.
- **CommunityJoinRequest** *(shipped PER-8)* — A pending request to join an `approval`-gated community. Created by the requester; an admin approves or declines. Approval atomically creates the `CommunityMember` row. Not used for `open` or `invite_only` communities.
- **CommunityInvitation** *(shipped PER-8)* — A single-use token issued by an admin for an `invite_only` community. The invitee presents the token to claim membership. Each token is either unclaimed or claimed (and optionally expired).
- **GuildSkillCategory** *(guild sub-area)* — Hierarchical skill taxonomy attached to a guild persona. Each category has skill tags and an optional parent.
- **GuildMembershipTier** *(guild sub-area)* — Progressive membership level (apprentice, journeyman, master) with criteria and permissions.
- **GuildOffering** *(guild sub-area)* — Service, workshop, or product offered through the guild. Members opt in to fulfill specific offerings.
- **GuildOfferingMember** *(guild sub-area)* — Which member personas fulfill which offerings.
- **GuildRequest** *(guild sub-area)* — An inbound need routed to qualified guild members based on skill category match.

**Not yet in schema but designed** (flagged as drift):
- **CommunityRelationship** — Designed in the Communities design ADR (decision #18) to replace `Community.parentCommunityId` with a relationship table supporting chapters, affiliations, referral partners, and cohorts. **The code still uses `parentCommunityId`.** This is a real gap. Tracked in `12-community-relationships.md`.
- **CommunityFavorite** — The favorites feature (toggle, per-user list, 10-per-user limit) described in `01-community-lifecycle.md` §2.6 is **not yet implemented**. No `community_favorites` table exists.

## Relationships

```
User ─1─── * ── Community              (as founding user; each community has exactly one)
User ─1─── * ── Community              (as billing user; optional, may differ from founding)
Community ─1── * ── CommunityMember    (0+ members)
User ─1─── * ── CommunityMember        (a user is a member of 0+ communities)
Persona ─1── * ── CommunityMember      (a persona is the face shown in 0+ communities)
Community ─── belongsTo Persona        (backing organization persona, optional)
Community ─1── * ── Community          (self-ref via parentCommunityId — chapter hierarchy, drift)
Community ─1── 1 ── CommunityType      (via slug; every community has exactly one type)
Community ─1── * ── CommunityJoinRequest  (pending requests; approval-gated only)
Community ─1── * ── CommunityInvitation   (unclaimed tokens; invite_only only)
User ─1── * ── CommunityJoinRequest    (as requesting user)
User ─1── * ── CommunityInvitation     (as inviter user)

Guild (= Persona with guild feature flags) ─1─── * ── GuildSkillCategory
Guild ─1─── * ── GuildMembershipTier
Guild ─1─── * ── GuildOffering
GuildOffering ─1─── * ── GuildOfferingMember    (member personas fulfilling the offering)
Guild ─1─── * ── GuildRequest
GuildRequest ─── belongsTo Persona (requester, optional)
GuildRequest ─── belongsTo User (requester, optional — alt sender mode)
```

Cross-area references:
- `Community.backingPersonaUri` → Persona (Personas area) — backing organization persona
- `CommunityMember.personaId` → Persona — the persona shown in this community
- Every Guild entity references a `guildPersonaId` which is a Persona with guild feature flags active
- ShadowPersona, Endorsement, and ContactRequest (Personas area) all reference `communityId` back into this area

## Lifecycle

**Community**
```
Created → Active → (Archived | Closed)
                         ↓
                    (grace period, then hard delete)
```
- **Created** — immediately active with the founding user as sole admin
- **Active** — default operational state
- **Archived** — reversible pause; hidden from discovery, members retained, no new joins
- **Closed** — 30-day grace period during which members are notified and data is exportable; then hard-deleted (per Communities design ADR decision #15)

**CommunityMember**
```
Active → Left | Removed
```
- Membership rows only exist for active members. Pending requests are modeled as `CommunityJoinRequest` rows (not as a `CommunityMember` with `visible=false`). Approval creates the `CommunityMember` directly with `visible=true`.
- `Left` and `Removed` are effected by row deletion with an `activity_events` audit entry — no soft delete

**GuildRequest**
```
pending → matched → (accepted | declined | expired)
```

## Invariants

1. **Community type is data-driven.** Every community has a `communityType` slug that references a `CommunityType` row in seed data. Type determines the trait schema, member trait schema, feature flags, and defaults. Adding a new type is a seed-data change; no code change required.

2. **Membership is a three-way triple.** `CommunityMember` stores both `userId` and `personaId`. Never collapse to `(userId, communityId)` alone. The User identifies the human for permissions and billing; the Persona identifies what they share. This is Pin #2 in the Communities PRD.

3. **Unique membership per user per community.** A User may join a Community only once, regardless of persona. Switching personas within a community means updating the same `CommunityMember` row, not creating a new one. Enforced by `unique(userId, communityId)`.

4. **Guilds are personas, not a separate entity type.** A guild is an organization-type Persona that has guild feature flags activated. All guild sub-entities (skill categories, tiers, offerings, offering members, requests) reference a `guildPersonaId` directly. There is no `guilds` row. The community layer is optional — a guild can exist as a standalone persona with guild mechanics, or it can also have a `Community` row with `communityType='guild'` attached via `backingPersonaUri`.

5. **Community traits and member traits are separate.** `Community.traits` is the community's own profile (mission, focus areas, tags — community-level identity). `CommunityMember.memberTraits` is what each member shares in this specific community context. Both conform to schemas defined by the community's type. They are never conflated.

6. **`foundingUserId` is immutable and cannot be removed from the community.** This is a hard service-layer constraint — the founding user is always an admin and cannot have their role demoted or their membership removed. Closing the community is the only way to dissolve the founding-user relationship.

7. **Every endorsement and every shadow persona in the Personas area is community-scoped.** This invariant lives in the Personas schema but the Communities area is the side that receives the foreign keys. See Personas schema spec §Endorsement and §ShadowPersona.

## Ubiquitous language

| Use | Avoid | Why |
|---|---|---|
| **Community** | Group, org, collective, workspace | "Community" is the canonical user-facing term across all 9 types. "Group" is too generic; "org" conflicts with the `organization` entityType on personas. |
| **Community Organizer (CO)** | Admin, owner, host | "CO" is the product term in pricing tiers and onboarding flows. |
| **Community Member (CM)** | Participant, user (when in-community) | "CM" distinguishes from the broader User when context matters. |
| **Community type** | Category, kind, flavor | "Type" is the schema term (`communityType` field). Nine types are enumerated. |
| **Community traits** | Profile, metadata, bio | "Community traits" parallels "user traits" — the community has its own trait pool shaped by its type's schema. |
| **Member traits** | Member profile, member metadata | Distinct from community traits: what a member shares within a specific community. Community-scoped. |
| **Steward** | Moderator, helper, editor | "Steward" is the middle tier between member and admin. |
| **Backing persona** | Owner persona, org profile | When a community is backed by an organization persona, that persona is the "backing persona." |
| **Guild** | Skill community, professional community | "Guild" is the project term for the skill-centric community type. Guild is both a community type and a persona feature-flag set. |
| **Community-scoped** | Local, private, internal | "Community-scoped" means "tied to a specific community via foreign key." The phrase appears on endorsements, shadows, member traits, and discovery queries. |
