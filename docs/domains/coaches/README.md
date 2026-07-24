---
type: spec
title: AI Coaches — Spec Suite
description: "This suite covers the AI Coaches product area: conversational agents (Persona Coach, Recommender Coach, Community Coach) that guide users through progressive revelation — from first sign-up to…"
status: planned
tags: [coaches]
timestamp: 2026-04-13
---

# AI Coaches — Spec Suite

This suite covers the **AI Coaches** product area: conversational agents (Persona Coach, Recommender Coach, Community Coach) that guide users through progressive revelation — from first sign-up to active community leadership — via personalized suggestions, trait enrichment prompts, and generosity nudges in context.

## Status

**No PRD exists yet.** This suite was created on 2026-04-13 as part of the product area decomposition (see [`../_areas.md`](/domains/_areas.md) §Area-4-AI-Coaches).

**Next action:** run `/plan-prd coaches` to author `00-prd.md` using the seed material listed in [`../_areas.md`](/domains/_areas.md) §Area-4-AI-Coaches §Seed-material.

## Spec layout

Expected feature specs (from the area inventory):
- `00-prd.md` — Coaches PRD (to be authored)
- `01-persona-coach.md` — Persona Coach agent flows (already partially built in `lib/mastra/agents/persona-coach.ts`)
- `02-recommender-coach.md` — Recommender Coach agent flows
- `03-community-coach.md` — Community Coach agent (referenced in CLAUDE.md, not yet built)
- `04-progressive-onboarding.md` — 4-phase coach-driven onboarding (vision.md §Progressive Onboarding)
- `05-cost-caps-and-killswitch.md` — per-user/per-run cost enforcement and UX
- `06-eval-coverage.md` — coach response quality evaluation (blocked by eval framework choice)

## Key constraints

Coaches are subject to strict cost caps from [`../../foundation/principles.md`](/foundation/principles.md):
- `ai-cost-and-loop-caps` — per-request ≤ $0.50, per-user-daily ≤ $10, per-agent-run ≤ $5
- `ai-native-discoverability` — all coach outputs must be machine-readable on structured surfaces
- Counter-metrics in [`../../foundation/metrics.md`](/foundation/metrics.md): LLM cost per active user, agent loop iterations (p95 < 8), agent run cost (p95 < $0.50)

These are the biggest variable costs in the entire product (the business model projects Solo Free at $0.50-1.10/month in Coach LLM inference). Feature specs must demonstrate compliance.

## Cross-references

- Product area inventory: [`../_areas.md`](/domains/_areas.md) §Area-4-AI-Coaches
- Decomposition rubric: [`../_decomposition.md`](/domains/_decomposition.md)
- Vision §Progressive Onboarding: [`../../foundation/vision.md`](/foundation/vision.md)
- Agent architecture: [`../../foundation/agents.md`](/foundation/agents.md)
- Principles (cost caps): [`../../foundation/principles.md`](/foundation/principles.md)
- Metrics (counter-metrics): [`../../foundation/metrics.md`](/foundation/metrics.md)
