---
type: foundation
title: Product Area Decomposition — The Discipline
description: "A growing product has dozens of features. Naive organizations (one doc per feature, or one folder per table) collapse by ~30 features. The right unit is the product area: a coherent bundle of user…"
status: current
tags: [domains]
timestamp: 2026-04-14
---

# Product Area Decomposition — The Discipline

> 2026-04-14 · The 5-rule rubric for deciding how many product areas a project has and where the boundaries go. Applied result for Personus: [`_areas.md`](/domains/_areas.md).

## The problem

A growing product has dozens of features. Naive organizations (one doc per feature, or one folder per table) collapse by ~30 features. The right unit is the **product area**: a coherent bundle of user value, owned by a single PRD, decomposed into feature specs. Target **6–8 areas** for a mid-complexity product.

## The 5 rules

Apply in order. Each rule confirms, collapses, or defers a candidate area.

**Rule 1 — Areas are shaped by user value delivered together.** An area is a coherent chunk of value a user receives as a bundle. Test: *"Can I describe what this area delivers in one sentence without mentioning another area?"* If the sentence requires naming another area, the candidate isn't standalone.

**Rule 2 — Areas are shaped by architectural boundaries that already exist.** If a concept has its own service layer, its own routes, its own dedicated UI surface, and its own independent release path, it's an area. Test: *"Does this have its own service-layer API, or is it invoked through some other area's?"* Rule 2 overrides Rule 1 when they conflict — real architectural separation means real cognitive overhead, and a dedicated PRD reduces it.

**Rule 3 — Cross-cutting concerns are not areas.** Things that touch every area (notifications, audit logs, authentication, PII scanning, accessibility, cost caps) belong in principles, architecture, or a platform-ops area — never in their own PRD. Test: *"Does every other area have to think about this when shipping?"* If yes, cross-cutting. Exception: an operator surface with its own UI and user (platform-ops) gets its own area even though its concerns are cross-cutting.

**Rule 4 — Future areas get named and deferred.** Candidates that exist in design but have zero code get a **stub PRD** and live in the inventory as `dormant`. Candidates that don't even have firm design are `deferred` — listed but no stub file. Do not author full PRDs for features 18 months out.

**Rule 5 — Target 6–8 areas.** If you hit 12, you're splitting too fine — collapse. If you hit 4, you're grouping too coarse — split. 6–8 is the sweet spot for a product with 10–30 features. The count is the feedback signal: if Rules 1–4 don't land you in the band, revisit.

## The procedure

1. **List every candidate area without filtering** — existing routes, schema files, foundation docs, vision use cases, business model material. 15–25 candidates is correct; messy is fine.
2. **Apply Rule 1** — write the one-sentence scope for each. Flag candidates whose sentence names another candidate.
3. **Apply Rule 2** — confirm each survivor has (or lacks) its own service layer, routes, surface.
4. **Apply Rule 3** — move cross-cutting concerns to principles / architecture / platform-ops.
5. **Apply Rule 4** — classify surviving candidates as `active` / `dormant` / `deferred`.
6. **Apply Rule 5** — count. Iterate to land in 6–8.
7. **Write `_areas.md`** — one row per final area with scope, status, seed material, feature list.
8. **Hand to `/plan-prd` one area at a time.**

## Anti-patterns to avoid

- **One area per database table** — reflects implementation, not user value
- **One area per team / org chart line** — team structure shifts; decomposition should survive re-orgs
- **One area per top-level route** — routes are UX decisions, not product decisions
- **One area per buzzword in the pitch** — "AI-native," "privacy-first" are marketing, not product areas
- **Future features get a PRD now** — violates Rule 4; requirements change; dilutes the cascade
- **One big PRD that covers everything** — violates Rule 5 low end; becomes a reference nobody reads

## The discipline in one paragraph

**A product area is a coherent bundle of user value (Rule 1) with its own architectural footprint (Rule 2), separate from cross-cutting concerns that every area must honor (Rule 3). Dormant areas get stub PRDs; deferred candidates wait (Rule 4). Count lands at 6–8 for a mid-complexity product (Rule 5). Output is [`_areas.md`](/domains/_areas.md), the input to the PRD cascade.**

## Worked example

Applying the 5 rules to Personus.ai produced **8 final areas**: Personas, Communities, Discovery, AI Coaches, Integrations, Commerce (dormant), Sparks (dormant), Platform Ops. See [`_areas.md`](/domains/_areas.md) for the full result with scope statements, feature lists, and rule applications for each collapsed candidate.

Entities that did NOT become areas and why:
- Endorsements, Shadow Personas, Contact Requests, Profile Import → absorbed into Personas (Rule 2 — no independent service layer)
- Onboarding → absorbed into AI Coaches (Rule 1 — the coach surfaces deliver onboarding)
- Notifications, Audit Logs, PII Detection, Accessibility, Cost Caps, Authentication → cross-cutting (Rule 3)
- Trust Graph → pattern name, not a service layer (Rule 1)
- Billing & Subscriptions → `deferred`, not a user-value bundle (Rule 4)

## History

- **2026-04-13** — Original 400-line `_decomposition.md` authored with full worked examples and extensive anti-pattern rationale
- **2026-04-14** — Trimmed to ~80 lines. Worked examples condensed to a reference pointer; the 5 rules stay as the load-bearing content. Pre-trim at [`_archive/_decomposition.2026-04-13.md`](/archive/legacy/specs/_archive/_decomposition.2026-04-13.md).
