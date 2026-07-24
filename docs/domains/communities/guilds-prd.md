---
type: prd
title: Guilds — PRD (Sub-PRD of Communities)
description: "Guilds are a specialized type of community with distinct mechanics that the base Communities PRD doesn't cover:"
status: planned
tags: [communities]
timestamp: 2026-04-13
---


# Guilds — Product Requirements Document (PLACEHOLDER)

> **This is a placeholder file.** The Guilds sub-PRD is the highest-leverage migration target from the archived legacy documentation. The full design lives in [`../../foundation/_archive/legacy-2026-02-24/08-guilds.md`](/archive/legacy/foundation/_archive/legacy-2026-02-24/08-guilds.md) — ~1,100 lines covering skill taxonomy, tiered membership, request routing, and offerings.
>
> **Do not author feature specs against this placeholder.** Run `/plan-prd guilds` to replace this file with a canonical library PRD using the archived file as seed material.

## Why a sub-PRD

Guilds are a specialized type of community with distinct mechanics that the base Communities PRD doesn't cover:

1. **Skill taxonomy** — guilds define a hierarchical skill tree with sub-categories and tags (`guild_skill_categories` table)
2. **Tiered membership** — apprentice / journeyman / master tiers with distinct permissions (`guild_membership_tiers` table)
3. **Request routing** — inbound requests (a customer needs a plumber) routed to qualified members (`guild_requests` table)
4. **Guild offerings** — services, workshops, mentoring, etc., exposed by the guild (`guild_offerings`, `guild_offering_members` tables)

These 5 sub-tables and ~1,100 lines of design justify a separate PRD at the Communities-subsuite level. A Communities PRD that included all guild content would be 2,500+ lines and unreadable.

## Seed material

**Primary:** [`../../foundation/_archive/legacy-2026-02-24/08-guilds.md`](/archive/legacy/foundation/_archive/legacy-2026-02-24/08-guilds.md) — full design, archived 2026-04-12.

**Supporting:**
- [`00-prd.md`](/domains/communities/00-prd.md) — the parent Communities PRD. Guild-relevant sections are marked "guild" throughout.
- [`schema-spec.md`](/domains/communities/schema-spec.md) §Guild sub-entities — 5 sub-table schemas (GuildSkillCategory, GuildMembershipTier, GuildOffering, GuildOfferingMember, GuildRequest)
- [`../../foundation/vision.md`](/foundation/vision.md) §Use Case 1 (Maya's AAPI Tech Workers membership includes guild-like mechanics) and §Time Horizons (guilds are a Year 1-2 wedge)
- [`../../business-model/02_packaging_and_pricing.md`](/business-model/02_packaging_and_pricing.md) §Community Organizer — the CO pricing tier targets guild stewards
- [`../../foundation/principles.md`](/foundation/principles.md) §verification-is-explicit — guild verification tiers
- [`../_decomposition.md`](/domains/_decomposition.md) §Rule-1 — guilds collapse into Communities because Rule 1's one-sentence test for Communities absorbs "group-scoped presences with community-specific mechanics"

## Target scope (preview)

The PRD session should produce workflows for:
1. **Guild creation** — steward creates a guild, defines skill taxonomy, sets tiers
2. **Member application + admission** — applicant applies, steward approves into a tier
3. **Skill categorization** — members tag their personas with guild-specific skills
4. **Inbound request routing** — customer query comes in, routed to qualified members based on skills + tier + availability
5. **Guild offering creation** — steward or member publishes an offering (mentoring, workshops, shared services)
6. **Offering discovery** — external querier finds guild offerings via Discovery area's search surface
7. **Tier progression** — member advances from apprentice → journeyman → master via steward approval or automated criteria
8. **Guild verification** — delegated verification from a parent org (e.g., a trades association)

## Open questions (for PRD session)

1. **Scope split with base Communities.** How much of "guild creation" is actually "community creation with a guild type flag" vs. dedicated guild-only flows?
2. **Request routing algorithm** — first-come-first-served, reputation-weighted, round-robin, steward-assigned? Design document has recommendations but PRD must pick.
3. **Skill taxonomy seed data** — does Personus ship with pre-populated taxonomies (plumbing trades, software engineering specializations) or does each guild define its own from scratch?
4. **Tier criteria** — manual steward approval, automated based on endorsement count, or hybrid?
5. **Offering commerce** — do guild offerings eventually integrate with the Commerce area (dormant) for ACP-enabled bookings? Tag as "future cross-area interaction."
6. **Guild stewards vs. community organizers** — same role or distinct? Impacts the Community Coach agent scope (when it's built).

## Activation criteria

Guilds PRD can be authored as soon as there's product-leader capacity. The design is complete. This is the shortest path from archived material → canonical PRD in the whole migration.

When ready: run `/plan-prd guilds` and replace this file.

## Cross-references

- Parent Communities PRD: [`00-prd.md`](/domains/communities/00-prd.md)
- Product area inventory: [`../_areas.md`](/domains/_areas.md) §Area-2-Communities
- Decomposition rubric: [`../_decomposition.md`](/domains/_decomposition.md)
- Archived source: [`../../foundation/_archive/legacy-2026-02-24/08-guilds.md`](/archive/legacy/foundation/_archive/legacy-2026-02-24/08-guilds.md)

_Placeholder authored 2026-04-13 by `/plan-foundation` during product area decomposition. This is the highest-priority PRD authoring target in Phase B of the migration plan._
