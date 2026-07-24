---
type: prd
title: Communities — PRD
description: Covers
status: current
tags: [communities]
timestamp: 2026-04-14
---

# Communities — PRD

> 2026-04-14 · v3 (frugal shape per `../_prd-shape.md`) · supersedes v2 (421 lines) and v1 pre-library (archived)

## TL;DR

1. **What** — A structured, AI-queryable capability overlay for existing groups (clubs, guilds, workplaces, neighborhoods, chapters) that makes hidden member skills discoverable.
2. **Why** — Every group has a electrician, a grant writer, a member with lighting gear — nobody can discover them. Forums and chat can't answer "who can help with X?" because they aren't structured around capabilities.
3. **How** — Each community is a persona-scoped overlay on one of 9 data-driven [community types](/domains/communities/schema-spec.md#communitytype); members join with a persona, share context-specific member traits, and become discoverable via community-scoped search and external MCP queries.

## Scope

**Covers**
- Community lifecycle — create, edit, configure, archive, close
- Membership — join flows, role changes, persona selection, member trait editing
- Member directory — listing, community-scoped search, public directory
- Community discovery — explore, SEO, similar-community recommendations
- Invitations, notices, moderation, notifications
- Integration UI (from within community admin; per-platform mechanics owned by Integrations PRD)
- Community closure (archive + 30-day grace close) and relationships (chapters, affiliations, referrals, cohorts)
- **Sub-PRD:** [Guilds](/domains/communities/guilds-prd.md) — skill-centric communities with tiered membership, request routing, and offerings

**Does not cover**
- Per-platform integration mechanics → [Integrations PRD](/domains/integrations/00-prd.md)
- Endorsements, shadow personas, persona-level coach chat → [Personas PRD](/domains/personas/00-prd.md) + [Coaches PRD](../coaches/)
- MCP tool implementation, semantic search ranking → [Discovery PRD](../discovery/)
- Payment flows, monetized guild offerings → [Commerce PRD](/domains/commerce/00-prd.md) (dormant)
- Sparks attached to community actions → [Sparks PRD](/domains/sparks/00-prd.md) (dormant)
- Platform-operator override surfaces → [Platform Ops PRD](/domains/platform-ops/00-prd.md)
- Per-feature authorization rules → each feature spec's own §Authorization section
- Tier-gated capability mechanics → [`business.md`](/foundation/business.md) §Communities per-tier capability boundaries

## Workflows

- `User can create a community of any type in CommunityCreateDialog` → `01-community-lifecycle.md`
- `User can edit community profile, member trait schema, and visibility in CommunityEditView` → `01-community-lifecycle.md`
- `User can join a community with a selected persona in CommunityJoinFlow` → `02-membership.md`
- `User can promote or remove members in MemberBrowseView` → `02-membership.md` + `07-moderation.md`
- `User can search community members by capability in CommunityCoachChatView` (conversational, not a search box) → `03-member-directory.md`
- `User can browse the aggregate "who's here" community profile in CommunityDetailView` → `03-member-directory.md`
- `User can post a time-bound notice in NoticeCreateDialog` (no replies, no threading) → `10-notices.md`
- `User can invite members via link, code, or direct invite in CommunityEditView` → `05-invitations.md`
- `Visitor can browse the Explore page and find communities by type + tag in ExploreView` → `04-discovery.md`
- `Visitor can request a mediated introduction from a public directory in PublicDirectoryView` → `03-member-directory.md` (via Personas PRD's `ContactRelay`)
- `DiscoveryAgent can query communities by capability via MCP in DiscoveryView` → `04-discovery.md` (implementation owned by Discovery PRD)
- `User can archive or close a community with a 30-day grace period in CommunityEditView` → `11-community-closure.md`
- `User can declare a community relationship (chapter_of, affiliated_with, referral_partner, cohort_of) in CommunityEditView` → `12-community-relationships.md`

## Feature specs

- `01-community-lifecycle.md` — Create, edit, archive, close; profile editor, schema builder, action bar, CX chat, favorites, share link
- `02-membership.md` — Join (open / approval / invite), role changes, persona selection, member trait editor
- `03-member-directory.md` — Member listing, CX-chat search, "who's here" aggregate view, public directory
- `04-discovery.md` — Explore page, SEO, AIO, similar-community recommendations
- `05-invitations.md` — Invite links, codes, direct invites, onboarding
- `06-activity-and-analytics.md` — Feed, CO dashboard, health signals, unmet-needs analysis
- `07-moderation.md` — Removal, suspension, policy, appeals
- `08-notifications.md` — Event triggers, channels, preferences, digests
- `09-integrations-ui.md` — Platform connection UI (consumes Integrations PRD for mechanics)
- `10-notices.md` — Time-bound community bulletin board (no replies)
- `11-community-closure.md` — Archive + close flow, grace period, data export
- `12-community-relationships.md` — Chapters, affiliations, referrals, cohorts with proposal/acceptance
- **Sub-PRD:** `guilds-prd.md` (placeholder — requires `/plan-prd guilds` against the archived legacy design)

Design decisions (18 of them) are captured in [`../../decisions/communities-design-decisions.md`](/decisions/communities-design-decisions.md).

## Pins

1. **Communities stay an intelligence layer, not a chat room.** Personus does not replace Discord/Slack/Telegram — it's the structured overlay. Notices have no replies; members can't DM through Personus. When a feature proposal starts turning communities into a forum or chat surface, it violates this pin.
2. **Every membership is `(user, persona, community)`.** Never collapse to `(user, community)`. Privacy, display, and cross-community unlinkability all depend on the three-way relationship. This is a hard service-layer invariant.
3. **Discovery is never gated by paywalls.** Every community and every opted-in member is equally discoverable regardless of tier. Pricing gates feature depth (analytics, branding, steward seats), never discoverability itself. PBC commitment.

## Open decisions

- **Community Coach agent implementation** — referenced by the CX chat and "what skills are we missing?" flows but not built. Is it a distinct Mastra agent or a mode of an existing agent? — @jlorance, blocks workflow detail in `01-community-lifecycle.md` and `03-member-directory.md`
- **First ContactRelay implementation** — public directory workflow needs a concrete adapter (in-app? email relay? both?) — @jlorance, cross-cuts with Personas PRD
- **Feature-flag resolution mechanism** — type-specific behavior (guild tiers, event dates, neighborhood geo) resolved at service layer, UI layer, or both? — @jlorance, informs every feature spec in this suite
