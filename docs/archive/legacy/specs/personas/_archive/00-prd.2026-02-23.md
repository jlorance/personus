---
type: spec
title: "Identity & Personas — Product Requirements Document"
description: "Personus is built on a simple idea: you are not one thing. A person who is an electrician, a photography hobbyist, and a neighborhood volunteer shouldn't be forced into a single profile. Personas…"
status: superseded
tags: [archived]
timestamp: 2026-02-23
---

# Identity & Personas — Product Requirements Document

> Date: 2026-02-23
> Status: Draft
> Suite: `docs/specs/identity-and-personas/`

## 1. Core Thesis

Personus is built on a simple idea: **you are not one thing.** A person who is an electrician, a photography hobbyist, and a neighborhood volunteer shouldn't be forced into a single profile. Personas let users present different facets of themselves to different audiences — each with its own traits, visibility, layout, and context.

The user's **traits** are the master collection of everything about a user. **Personas** are published views that selectively include traits from that collection. This two-layer model (traits → persona) is the architectural foundation of the entire product. Communities, endorsements, discovery, and AI agents all operate on personas, not users.

## 2. Key Concepts

| Concept | What It Is | Where It Lives |
|---------|-----------|---------------|
| **User** | Authenticated account (Clerk). One per human. | `users` table |
| **User Traits** | Master JSONB collection of all user attributes (skills, experience, values, etc.). One per user. | `user_traits` table |
| **Trait Metadata** | Describes how each trait type renders and edits. Data-driven, not hardcoded. | `trait_metadata` table (seed data) |
| **Trait Taxonomies** | Suggested values for trait fields (e.g., programming languages, interests). | `trait_taxonomies` table (seed data) |
| **Persona** | A published view that selectively includes traits from the user's traits. Has its own name, headline, visibility, layout, and embedding. | `personas` table |
| **Shadow Persona** | A persona created *for* someone else (non-user). Claimable via token. Carries endorsements that transfer on claim. | `shadow_personas` table |
| **Layout Preset** | Controls information architecture on the public page (Professional, Personal, Community, Service, Creative). | `personas.layoutPreset` + `lib/personas/layout-config.ts` |
| **Theme** | Controls visual styling on the public page (color palette, header treatment, density). Independent of preset. | `personas.theme` JSONB |
| **Embedding** | 1536-dim vector generated from persona traits. Powers semantic search and discovery. | `personas.embedding` (pgvector) |
| **Completeness Score** | 0-100 score measuring how "filled out" a persona is. Drives coach suggestions. | `personas.completenessScore` |

## 3. Two-Role Model

| Role | Who | What They Do |
|------|-----|-------------|
| **Owner** | The user who created the persona | CRUD, trait selection, visibility control, layout customization, publishing |
| **Viewer** | Anyone else (authenticated user, visitor, AI agent) | View public page, endorse, request introduction, discover via search |

## 4. Three-Layer Persona Model

```
┌─────────────────────────────────────────────────┐
│ CONTEXT LAYER (community-specific)              │
│ memberTraits in community_members table          │
│ What this persona shares in a specific community │
├─────────────────────────────────────────────────┤
│ ATTRIBUTE LAYER (persona-level)                 │
│ personas.traits JSONB                            │
│ Selected subset of the user's traits              │
├─────────────────────────────────────────────────┤
│ BASE LAYER (identity)                           │
│ displayName, headline, location, entityType      │
│ The persona's public identity                    │
└─────────────────────────────────────────────────┘
```

- **Base layer** is always visible (when the persona is visible at all).
- **Attribute layer** is the persona's published traits — a curated selection from the user's traits.
- **Context layer** is what a persona shares in a specific community (stored on `community_members.memberTraits`, not on the persona itself). Defined per-community by the community's `memberTraitSchema`.

## 5. Spec Breakdown

| File | What It Covers | Primary Actor |
|------|---------------|---------------|
| **`00-prd.md`** (this file) | Vision, concepts, inventory | — |
| **`01-persona-lifecycle.md`** | Create, edit, delete personas. The creation wizard, foundations editing, trait selection from user traits. | Owner |
| **`02-profile.md`** | Your profile: viewing, adding, editing, removing traits. Import (LinkedIn, URL, CSV). Profile-to-persona sync. | Owner |
| **`03-trait-metadata.md`** | How trait types are defined, rendered, and edited. The metadata-driven system. Display configs, edit configs, taxonomy lookups. | System (data-driven) |
| **`04-persona-visibility.md`** | Public/authenticated/community/private visibility. Per-trait visibility overrides. MCP exposure settings. Contact preferences. | Owner |
| **`05-layout-and-theming.md`** | Layout presets (Professional, Personal, Community, Service, Creative). Theme system (color palettes, header treatments, density). Preset picker UI. | Owner |
| **`06-public-pages.md`** | The public persona page (`/p/[uri]`). SEO metadata, structured data (schema.org Person), OG images, AIO optimization. Visitor experience. | Viewer + Search Engines + AI Agents |
| **`07-shadow-personas.md`** | Creating personas for non-users, claim flow, endorsement transfer, expiry. The "someone created a profile for you" experience. | Owner (creator) + Claimant |
| **`08-cross-persona-linking.md`** | Opt-in linking of personas owned by the same user. Community-scoped. Visibility rules for linked personas. | Owner + CO |

## 6. Existing Code

Significant code already exists. Specs should build on what's here, not rewrite from scratch.

### Schema (implemented)
- `lib/db/schema/users.ts` — `users` + `userTraits` tables
- `lib/db/schema/personas.ts` — `personas` table (base fields, JSONB traits, vector embedding, layout, MCP settings)
- `lib/db/schema/traits.ts` — `traitMetadata` + `traitTaxonomies` tables
- `lib/db/schema/shadow-personas.ts` — `shadowPersonas` table (community-scoped, claim flow)

### Server Actions (implemented)
- `app/actions/personas.ts` — `listPersonas`, `getPersona`, `getViewablePersona`, `createPersona`, `updatePersona`, `updatePersonaTraits`, `deletePersona`, `getCompletenessScore`
- `app/actions/shadows.ts` — `createShadowAction`, `claimShadowAction`, `getUnclaimedShadowsAction`, `getShadowByTokenPublic`, `submitPublicClaim`
- `app/actions/explore.ts` — `loadMorePersonas` (minimal, pagination only)

### Pages (implemented)
- `app/(dashboard)/personas/page.tsx` — Persona list (server component, cards with completeness bars)
- `app/(dashboard)/personas/new/page.tsx` — 3-step creation wizard (type → basics → coach redirect)
- `app/(dashboard)/personas/[uri]/page.tsx` — Persona detail (owner + visitor views, endorsements, traits)
- `app/(dashboard)/personas/[uri]/edit/page.tsx` — Foundations + traits editing (client component)
- `app/p/[uri]/page.tsx` — Public persona page (server component, SEO metadata, layout resolution)
- `app/p/[uri]/persona-public-view.tsx` — Public display (client component, 5 presets, 7 palettes)
- `app/s/[id]/page.tsx` — Shadow persona display
- `app/claim/[token]/page.tsx` + `claim-flow.tsx` — 3-step claim flow
- `app/endorse/[uri]/page.tsx` + `endorse-form.tsx` — Public endorsement form

### Utilities (implemented)
- `lib/personas/completeness.ts` — Completeness scoring (9 dimensions, weighted)
- `lib/personas/layout-config.ts` — 5 presets with full configs, theme system, helpers
- `lib/personas/profile-summary.ts` — AI-style profile summary builder
- `lib/embeddings/index.ts` — Embedding generation (text-embedding-3-small, 1536-dim)
- `lib/embeddings/search.ts` — Semantic search via pgvector cosine similarity
- `lib/validations/personas.ts` — Zod schemas (create, update, traits)
- `lib/validations/traits.ts` — Zod schemas for all trait types + contact preferences
- `lib/auth/permissions.ts` — `canViewPersona`, `assertOwnsPersona`, persona visibility checks

### Seed Data (implemented)
- `lib/db/seed/trait-metadata.ts` — 41 trait metadata rows across 5 categories (Foundations, Capabilities, Direction, Offerings, Commerce)
- `lib/db/seed/taxonomies/` — 10 taxonomy files (skills, qualities, values, interests, etc.)

## 7. Spec Index

| # | File | Status | Summary |
|---|------|--------|---------|
| 00 | **`00-prd.md`** (this file) | Draft | Vision, concepts, existing code inventory |
| 01 | **`01-persona-lifecycle.md`** | Draft | Create → edit → delete, wizard, foundations, trait selection |
| 02 | **`02-profile.md`** | Draft | Your profile: view, add, edit, remove, import, persona sync |
| 03 | **`03-trait-metadata.md`** | Draft | Metadata-driven rendering, display/edit configs, taxonomy |
| 04 | **`04-persona-visibility.md`** | Draft | Visibility tiers, per-trait overrides, MCP, contact prefs |
| 05 | **`05-layout-and-theming.md`** | Draft | 5 presets, theme system, preset picker |
| 06 | **`06-public-pages.md`** | Draft | Public page, SEO, structured data, AIO, OG images |
| 07 | **`07-shadow-personas.md`** | Draft | Shadow creation, claim flow, endorsement transfer |
| 08 | **`08-cross-persona-linking.md`** | Draft | Opt-in linking, community-scoped, visibility rules |
| 09 | **`09-editing-patterns.md`** | Proposed | App-wide editing UX patterns: section-level editing, save behavior, unsaved changes, mobile |

## 8. Implementation Priority

### Wave 1: Core Identity (Must Have)

These define how users create and manage their identity on Personus.

1. **`01-persona-lifecycle.md`** — The CRUD foundation everything else builds on
2. **`02-profile.md`** — Your profile: where traits live (profile → persona flow)
3. **`03-trait-metadata.md`** — How traits render and edit (data-driven system)

### Wave 2: Visibility & Presentation (Should Have)

These control how personas appear to the outside world.

4. **`04-persona-visibility.md`** — Who sees what
5. **`05-layout-and-theming.md`** — How the public page looks
6. **`06-public-pages.md`** — SEO, AIO, structured data for the public page

### Wave 3: Advanced Identity (Nice to Have for Launch)

7. **`07-shadow-personas.md`** — Shadow personas + claim flow
8. **`08-cross-persona-linking.md`** — Multi-persona linking

## 9. Dependency Order

```
03-trait-metadata (standalone — metadata system)
  ↓
02-profile (needs metadata to render traits)
  ↓
01-persona-lifecycle (needs traits to select from)
  ↓
04-persona-visibility (needs persona to apply visibility to)
  ↓
05-layout-and-theming (needs persona to theme)
  ↓
06-public-pages (needs layout + visibility to render public page)
  ↓
07-shadow-personas (needs persona model)
  ↓
08-cross-persona-linking (needs multiple personas + communities)
```

## 10. Decisions Log

| # | Decision | Date | Context |
|---|----------|------|---------|
| 1 | Hybrid JSONB for traits (not normalized tables) | 2026-02-09 | Doc 02 — flexibility for AI-extracted data, privacy via denormalization |
| 2 | Traits → persona copy (not reference) | 2026-02-09 | Privacy isolation — deleting a persona doesn't affect the user's traits or other personas |
| 3 | Metadata-driven trait rendering | 2026-02-10 | `trait_metadata` table controls display/edit — no hardcoded components per trait type |
| 4 | 5 layout presets, separate from themes | 2026-02-14 | Doc 12 — layout = information architecture, theme = visual identity. Mix and match. |
| 5 | Completeness scoring (9 dimensions, weighted) | 2026-02-13 | Coach needs quantified gaps to make suggestions |
| 6 | Auto-resolve layout preset from entity type | 2026-02-14 | `'auto'` → Professional (person) or Community (organization) |
| 7 | Shadow personas are community-scoped | 2026-02-15 | Created within a community context, carry community membership on claim |
| 8 | Embeddings from structured trait text | 2026-02-15 | `generatePersonaEmbedding()` concatenates traits into prose, then embeds |
| 9 | URI-based persona identification (not ID) | 2026-02-13 | URL-safe, human-readable, used in routes and public pages |
