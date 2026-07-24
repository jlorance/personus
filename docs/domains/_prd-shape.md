---
type: guide
title: PRD Shape — Project Convention
description: "This project uses a frugal PRD shape, not the library's canonical 18-section template. The canonical template is at ../../.claude/skills/abl/plan-prd/prd-template.md for reference."
status: current
tags: [domains]
---

# PRD Shape — Project Convention

**This project uses a frugal PRD shape, not the library's canonical 18-section template.** The canonical template is at [`../../.claude/skills/abl/plan-prd/prd-template.md`](../../.claude/skills/abl/plan-prd/prd-template.md) for reference.

## Why

Documentation is a tax on both humans and Claude. Every line in a PRD is re-read on every session that touches that area. Dense PRDs ship faster and stay maintained; long PRDs get skimmed, drift out of sync, and become background noise. The canonical library PRD template has 17 sections, most of which end up being prose that reshapes content from other docs. This project targets **6 sections, ~150 lines per PRD**.

## The 6 sections

Every PRD has exactly these sections in this order. Nothing else. No frontmatter beyond a one-line date/status marker. No cross-reference blocks at the bottom — tools can do that.

### 1. TL;DR

Three lines:
1. **What** — one sentence, the capability this area provides
2. **Why** — one sentence, the user/business problem this area solves
3. **How** — one sentence, the approach at a high level

### 2. Scope

Two bullet lists, one for "covers," one for "does not cover." 5-10 bullets each. Each bullet points at a feature spec or another PRD.

The "does not cover" list is load-bearing — it's how you prevent drift when a new feature proposal straddles two areas.

### 3. Workflows

5-10 one-line user-facing behaviors in the canonical `[Actor] can [capability] in [Context]` form. Claude parses these; humans skim them.

No sub-sections, no preconditions, no acceptance criteria, no flows, no wireframes. Those belong in feature specs. A workflow line in the PRD is a pointer: "this behavior exists, see `NN-feature.md` for the mechanics."

Group workflows by rough sequence or actor if there are more than 5. Otherwise a flat list.

### 4. Feature specs

A list of child feature specs, each with a one-line description. That's it. No status columns (tracker owns status), no wave tables (tracker owns sequencing), no dependency diagrams (file order implies dependency when meaningful).

```
- `01-feature-name.md` — what this feature delivers, one line
- `02-other-feature.md` — what this one does, one line
```

### 5. Pins

1-3 must-not-compromise items. Each is one line. The test for a pin: does it prevent a specific drift that Claude or an engineer might otherwise make? If no, delete it.

Good pin: "Traits are copied from `user_traits` to `personas.traits` on persona creation, never referenced — deleting a persona must never affect the master profile."

Bad pin: "Communities must be high quality." (Prevents no specific drift.)

### 6. Open decisions

3-5 bullets naming genuinely unresolved questions that block progress in this area. Each has a one-line description and a `@owner` tag.

When a decision is resolved, **delete the bullet** and capture the outcome in the appropriate place (principle, ADR, feature spec, or code). The PRD is not a decisions log.

## What moves out of the PRD

Content that belonged in the canonical library template but doesn't earn its place here:

| Content | Lives in |
|---|---|
| Problem statement narrative | [`vision.md`](/foundation/vision.md) |
| Glossary / key concepts | [`data-model.md`](/foundation/data-model.md) or the code |
| Outcomes / metrics | [`metrics.md`](/foundation/metrics.md) |
| Baseline compliance matrix | Nowhere — the audit skills enforce principles by reading [`principles.md`](/foundation/principles.md) directly |
| Authorization rules (per-resource) | Each feature spec's own §Authorization section |
| AI architecture (agents, MCP tools, cost caps) | The Coaches PRD + Discovery PRD + [`principles.md`](/foundation/principles.md) §ai-cost-and-loop-caps |
| Anti-scope / trade-offs / reference | Collapsed into Pins or Scope §does-not-cover |
| Decisions log | ADRs in [`../decisions/`](../decisions/) |
| Implementation priority / waves / dependency order | The tracker (Linear) |
| Existing code inventory | The tracker + Feature Spec status fields |
| Last-updated / frontmatter metadata | One-line header at the top, no YAML frontmatter |

## When to use the canonical library PRD template instead

If a future requirement genuinely needs the canonical 17-section shape — e.g., a compliance audit that parses specific field names, or a downstream skill that expects specific section headings — document the exception in that PRD and use the canonical template for that one file. Don't silently expand the frugal shape.

## Feature specs are different

Feature specs retain their existing shape (see [`_templates/SPEC_TEMPLATE.md`](/domains/_templates/SPEC_TEMPLATE.md)). They're written at the moment a feature is about to be built, carry wireframes and acceptance criteria, and are the implementation handoff. The PRD points at them; they don't point at the PRD.

---

_Authored 2026-04-14 as part of the Path B (frugal) pivot. This shape applies to every PRD in this project going forward. The first PRD using this shape is `communities/00-prd.md` v3._
