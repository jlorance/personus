---
type: decision
title: ADR — Communities Design Decisions
description: "Status: Accepted (retroactive) · Date captured: 2026-04-14 · Source: pre-library docs/specs/communities/00-prd.md Decisions Log"
status: current
tags: [decisions]
timestamp: 2026-04-14
---

# ADR — Communities Design Decisions

**Status:** Accepted (retroactive) · **Date captured:** 2026-04-14 · **Source:** pre-library `docs/specs/communities/00-prd.md` Decisions Log

These 18 decisions shaped the Communities area between 2026-02 and 2026-04. They are captured here as a single composite ADR rather than split across 18 files because they are internally consistent design decisions about one area. When any decision here is revisited, promote the revision to its own dated ADR and supersede the entry here.

---

## 1. Communities as a separate spec suite

Foundation docs define the data model and vision. The PRD defines user-facing workflows, server actions, components, and test criteria — the implementation blueprint.

## 2. 12 feature specs + 1 PRD + 1 sub-PRD (guilds)

Each functional area is complex enough to warrant its own spec. Keeps each document focused and reviewable.

## 3. Wave-based priority (core loop → growth → operations)

Can't build analytics before there's anything to analyze. Can't build invitations before there's a join flow. Specific sequencing is tracker-owned (not PRD-owned).

## 4. Guild features live in a separate sub-PRD

The archived 1,100-line guild design is comprehensive. Community specs define the base layer; guild specs define the guild-specific extension. Keeps the main Communities PRD readable and acknowledges that guilds have distinct mechanics.

## 5. Specs describe generic behavior, note type-specific divergence

Avoids 9 copies of every workflow. Most behavior is shared; type-specific behavior (guild tiers, event dates, neighborhood geography) is called out where relevant. Feature flags on `community_types` are the mechanism.

## 6. Persona context is fundamental

Every membership is `(user, persona, community)`. This three-way relationship drives privacy, display, and scoped search. Specs must never treat membership as just "user in community." This is now Pin #2 in the Communities PRD.

## 7. Community profile parallels user profile

Communities have traits (JSONB + embedding) just like users. A community's profile is its public identity — mission, location, focus areas, tags. Enables community-to-community discovery via embedding similarity and gives COs the same "fill in your profile" experience users get.

## 8. Notices are not a message board

Notices are short, time-bound, one-way posts (asks/offers). No replies, no ratings, no threading. Members who want to respond use the standard introduction request flow. Prevents Personus from becoming a forum — the conversation happens on Discord/Slack/Telegram. This is Anti-scope #2 in the Communities PRD.

## 9. Community-to-community discovery uses embeddings

Communities have `embedding vector(1536)`. "Similar communities" is a nearest-neighbor query in embedding space — the same mechanism as persona-to-persona similarity. Makes cross-community discovery automatic as community profiles improve.

## 10. Public presence is a 3-tier model

Private (invisible), Discoverable (business card page), Full Profile (rich page + optional public directory). Replaces the old `visibility` + `publicDirectory.enabled` two-toggle approach. Simpler mental model for COs. Full Profile with public directory still has double opt-in: CO enables public access, each member individually opts in.

## 11. Action bar encourages interaction, not administration

The persistent action bar shows Post Notice, Invite, and Share Link — actions that build community. Management actions (Edit Settings, Manage Members) go in overflow. The bar is role-aware.

## 12. Community CX chat is always present

A collapsed chat bar docked to the bottom of every community dashboard. Primary nudge for "what are you looking for?" and "what can you offer?" interactions. Powered by the Community Coach agent scoped to the current community. Makes discovery and offering conversational rather than click-through.

## 13. Favorites are a user-level quick-access feature

Max 10 favorites. Appears as a chip bar on My Communities and as icon shortcuts in navigation. Simple toggle — no categories, no reordering.

## 14. Public pages prioritize dynamic content over static

The Full Profile public page and public directory lead with "What's Happening" (notices), then "Community Pulse" (aggregate recent stats), then static content (capabilities, about, traits). Makes the page feel alive and encourages notice posting.

## 15. Community closure is its own spec

Archive (reversible) and close (30-day grace period, then permanent) are multi-step processes affecting every other spec — memberships, endorsements, notices, integrations, billing. Deserves dedicated spec `11-community-closure.md`.

## 16. Member search is CX-first, not a search box

"Who knows X?" is conversational — typed in the CX chat, a platform bot command, or via an AI agent. The Members tab is for structured browsing (filters, sort) not semantic search. Keeps UI minimal, mobile-friendly, consistent across surfaces.

## 17. Community visual identity is tiered

Free tier: essentials (profile image, banner, tagline, accent color). Paid tiers: theme customization, featured media galleries, custom sections, member badges. Tier specifics live in [`../foundation/business.md`](/foundation/business.md) §Communities per-tier capability boundaries.

## 18. Community relationships replace `parentCommunityId`

The old `parentCommunityId` self-referencing FK is replaced by a `community_relationships` table supporting four relationship types (chapter_of, affiliated_with, referral_partner, cohort_of). All relationships are opt-in (proposal + acceptance). Referral routing requires CO Pro on both sides. Schema inheritance requires CO Base+.
