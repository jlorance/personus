---
type: decision
title: ADR — Personas Design Decisions
description: "Status: Accepted (retroactive) · Date captured: 2026-04-14 · Source: pre-library docs/specs/personas/00-prd.md Decisions Log (dates 2026-02-09 through 2026-02-15)"
status: current
tags: [decisions]
timestamp: 2026-04-14
---

# ADR — Personas Design Decisions

**Status:** Accepted (retroactive) · **Date captured:** 2026-04-14 · **Source:** pre-library `docs/specs/personas/00-prd.md` Decisions Log (dates 2026-02-09 through 2026-02-15)

Eight design decisions that shaped the Personas area during the initial implementation phase. Captured as a composite ADR. When any decision is revisited, promote the revision to its own dated ADR and supersede the entry here.

---

## 1. Hybrid JSONB for traits (not normalized tables) — 2026-02-09

Flexibility for AI-extracted data, privacy via denormalization. Normalized trait tables would require a join for every persona read and would make adding new trait types a schema migration. JSONB trades query-time type safety for flexibility; the `trait_metadata` system provides runtime type safety.

## 2. Traits are copied to personas, not referenced — 2026-02-09

Privacy isolation. Deleting a persona does not affect the user's master traits or other personas. A persona's `traits` JSONB is a snapshot of what the user chose to publish in that persona at a point in time. Referenced traits would create implicit links between personas, which would violate the unlinkability invariant.

## 3. Metadata-driven trait rendering — 2026-02-10

The `trait_metadata` table controls how each trait type is displayed and edited. No hardcoded components per trait type. Adding a new trait type is a seed-data change, not a code change.

## 4. Five layout presets, separated from themes — 2026-02-14

Layout (Professional, Personal, Community, Service, Creative) controls information architecture. Themes (color palette, header treatment, density) control visual identity. Keeping them separate lets users mix and match — any preset with any theme.

## 5. Completeness scoring uses 9 weighted dimensions — 2026-02-13

The Coach needs quantified gaps to make specific suggestions. A single percentage doesn't tell the Coach what to prompt for. Nine dimensions × weights lets the Coach say "you're at 65% — adding your experience would bring you to 80%."

## 6. Auto-resolve layout preset from entity type — 2026-02-14

When a persona is created with `layoutPreset: 'auto'`, the system resolves it to Professional (if `entityType='person'`) or Community (if `entityType='organization'`). Gives sensible defaults without forcing the user to pick during creation.

## 7. Shadow personas are community-scoped — 2026-02-15

Shadows are created within a community context and carry their community membership through the claim flow. On claim, the claiming user inherits both the persona traits AND the community membership that triggered the shadow's creation.

## 8. Persona embeddings are generated from structured trait text — 2026-02-15

`generatePersonaEmbedding()` concatenates the persona's structured traits into prose, then runs `text-embedding-3-small` on the result. This gives semantic search meaningful signal from trait fields that would otherwise be invisible to a vector model (e.g., `skills: ["distributed systems"]` becomes "Distributed systems engineer with experience in..." before embedding).
