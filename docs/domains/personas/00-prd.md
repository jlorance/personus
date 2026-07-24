---
type: prd
title: Personas — PRD
description: Covers
status: current
tags: [personas]
timestamp: 2026-04-14
---

# Personas — PRD

> 2026-04-14 · v1 (frugal shape per `../_prd-shape.md`) · supersedes pre-library 00-prd.md (archived)

## TL;DR

1. **What** — Users maintain one master trait pool and publish selective persona lenses over it; each persona is an addressable, AI-discoverable endpoint with its own visibility, layout, and claim path.
2. **Why** — People are not one thing. An electrician who is also a photography hobbyist and a neighborhood volunteer shouldn't be forced into one profile, and rigid single-identity systems (LinkedIn) exclude most of a person's capabilities from discovery.
3. **How** — Master traits in `user_traits`, persona snapshots in `personas` (copied, never referenced — preserves unlinkability), per-persona visibility + layout + embedding, plus a shadow-persona + claim flow that brings non-users into the network via endorsements.

## Scope

**Covers**
- Master trait pool — viewing, adding, editing, removing, importing
- Persona CRUD — creation wizard, foundations editing, trait selection, deletion
- Persona visibility — public/authenticated/community/private, per-trait overrides, MCP exposure settings, contact preferences
- Persona layout + theming — 5 presets × theme system, preset picker
- Public persona pages — `/p/[uri]`, SEO, JSON-LD, OG images, AIO
- Shadow personas — creation, display, claim flow, endorsement transfer, expiry
- Endorsements — writing, receiving, displaying on personas
- Contact requests — mediated introduction flow (via `ContactRelay`)
- Cross-persona linking — opt-in, community-scoped, explicit voluntary disclosure (not implicit linking)
- Trait metadata system — data-driven rendering and editing via `trait_metadata`
- Profile import — LinkedIn and URL scraping as trait-bootstrap pathways

**Does not cover**
- Community memberships and community-scoped member traits → [Communities PRD](/domains/communities/00-prd.md)
- Persona-coach conversations, completeness coaching, progressive onboarding → [Coaches PRD](../coaches/)
- Semantic search, discovery ranking, MCP tool implementation → [Discovery PRD](../discovery/)
- Commerce personas, per-transaction consent categories → [Commerce PRD](/domains/commerce/00-prd.md) (dormant)
- Per-feature authorization rules → each feature spec's own §Authorization section
- The underlying schema (tables, columns, JSONB shapes) → [`schema-spec.md`](/domains/personas/schema-spec.md) for the full field-level logical schema (and `packages/db/src/schema/*.ts` for the physical truth)

## Workflows

- `User can view and edit their master trait pool in ProfileView` → `02-profile.md`
- `User can add traits to their profile via the trait metadata system in ProfileEditView` → `02-profile.md` + `03-trait-metadata.md`
- `User can import traits from LinkedIn or a URL in ProfileImportFlow` → `02-profile.md`
- `User can create a new persona through a 3-step wizard in PersonaCreateDialog` → `01-persona-lifecycle.md`
- `User can select which traits to publish in a persona in PersonaEditView` → `01-persona-lifecycle.md`
- `User can set persona visibility and per-trait visibility overrides in PersonaEditView` → `04-persona-visibility.md`
- `User can control MCP exposure and contact preferences per persona in PersonaEditView` → `04-persona-visibility.md`
- `User can pick a layout preset and theme for a persona in PersonaEditView` → `05-layout-and-theming.md`
- `User can delete a persona without affecting their master profile in PersonaBrowseView` → `01-persona-lifecycle.md`
- `Visitor can view a public persona page via a stable URI in PublicPersonaPage` → `06-public-pages.md`
- `DiscoveryAgent can discover a persona via JSON-LD + MCP tools in PublicPersonaPage` → `06-public-pages.md` (implementation owned by Discovery PRD)
- `User can create a shadow persona for a non-user in ShadowCreateDialog` → `07-shadow-personas.md`
- `Visitor can claim a shadow persona via an invite token in ClaimShadowFlow` → `07-shadow-personas.md`
- `User can endorse another persona (real or shadow) in EndorseFlow` → `07-shadow-personas.md` + `06-public-pages.md`
- `User can receive a mediated contact request routed through ContactRelay in InboxView` → Personas area (adapter TBD per Open Decision)
- `User can opt-in link two of their personas within a single community in CommunityMemberSheet` → `08-cross-persona-linking.md`

## Feature specs

- `01-persona-lifecycle.md` — Persona list, creation wizard, foundations editing, trait selection, deletion
- `02-profile.md` — Master profile: view, add, edit, remove, import & merge, profile↔persona sync
- `03-trait-metadata.md` — Metadata-driven rendering: display configs, edit configs, taxonomy management, extension
- `04-persona-visibility.md` — Visibility tiers, per-trait overrides, MCP exposure, contact preferences
- `05-layout-and-theming.md` — 5 layout presets, theme system, preset picker, public-page rendering
- `06-public-pages.md` — Public page rendering, SEO, JSON-LD, AIO, OG images, visitor interactions
- `07-shadow-personas.md` — Creation, display, 3-step claim flow, endorsement transfer, expiry
- `08-cross-persona-linking.md` — Opt-in community-scoped linking, management UI, authorization, bidirectional display
- `09-editing-patterns.md` — App-wide editing UX conventions (section-level editing, save behavior, unsaved changes)

Design decisions (8 of them) are captured in [`../../decisions/personas-design-decisions.md`](/decisions/personas-design-decisions.md).

## Pins

1. **Traits are copied from `user_traits` to `personas.traits` on persona creation, never referenced.** Deleting a persona must never affect the master profile or other personas. This is the mechanism by which unlinkability works — without trait copying, personas become implicit links between facets of the same user.
2. **Personas never expose PII in their published traits.** The line between "persona as AI endpoint" and "persona as contact database" runs through this pin. PII detection runs on every free-text trait write; a persona that leaks an email address has compromised the core product promise.
3. **Every public persona surface is AI-queryable and claimable.** A public page must expose JSON-LD + an MCP tool path + a claim/endorse/contact CTA above the fold. A "pretty but silent" public page regresses both `ai-native-discoverability` and `every-public-surface-has-a-claim-path`.

## Open decisions

- **First ContactRelay implementation** — the `masked-contact` principle mandates a `ContactRelay` abstraction but no adapter exists. Which ships first (in-app? email relay? both?) — @jlorance, blocks the mediated contact workflow and the Communities public directory flow
- **Shadow persona expiry + reminder cadence** — `07-shadow-personas.md` §5 covers the mechanics but the cadence (how long before unclaimed shadows expire, how many reminders to endorsers) isn't decided — @jlorance
- **Commerce persona relationship to base Personas area** — when Commerce PRD activates, are commerce personas a separate `personaType` flag or a separate entity? Affects schema + service-layer design — @jlorance, cross-cuts with Commerce PRD
