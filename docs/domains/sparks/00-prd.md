---
type: prd
title: Sparks (Generosity Engine) — PRD Stub
description: "Sparks delivers \"a credit system that rewards the generous behaviors that grow the trust network — endorsing, recommending non-users, responding to introductions, welcoming newcomers — making…"
status: dormant
tags: [sparks]
timestamp: 2026-04-13
---


# Sparks (Generosity Engine) — Product Requirements Document (STUB)

> **This is a dormant-area stub PRD.** The Sparks area is fully designed in the business model documentation but has zero code. It exists here so the PRD cascade knows the area is named and scoped. **Do not author feature specs against this stub.** When Sparks activates, run `/plan-prd sparks` to replace this stub with a canonical PRD.

## Scope

Sparks delivers **"a credit system that rewards the generous behaviors that grow the trust network — endorsing, recommending non-users, responding to introductions, welcoming newcomers — making generosity visible, recognized, and rewarded without ever being purchasable with money."**

## Why dormant

- **Design is complete.** [`../../business-model/03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md) is a full ~250-line design covering earn mechanics, spend mechanics, anti-gaming measures, UX integration, tier-scaled multipliers, and economy calibration.
- **Zero code exists.** No `sparks_ledger` table, no award hooks, no spend flow.
- **Activation depends on network density.** Sparks make generosity visible — but there has to be meaningful generosity activity first. Pre-PMF there isn't enough network to justify the engine.

## Seed material (when activating)

**Primary design material:**
- [../../business-model/03_sparks_generosity_engine.md](/business-model/03_sparks_generosity_engine.md) — **the complete design.** Earn mechanics, spend mechanics, multipliers, anti-gaming, UX integration, economy calibration.

**Supporting:**
- [../../business-model/02_packaging_and_pricing.md](/business-model/02_packaging_and_pricing.md) §Spark Multipliers by Tier — tier interactions
- [../../foundation/principles.md](/foundation/principles.md) §every-public-surface-has-a-claim-path — Sparks intersect with claim flows
- [../../foundation/metrics.md](/foundation/metrics.md) §Counter-Metrics — "endorsement spam / gaming rate" is the Sparks anti-gaming concern

## Planned features (scope preview — not authored)

1. Sparks ledger table + award trigger hooks
2. Spark multiplier calculation (tier-based)
3. Spark spend flow (temporary premium unlocks, visible badges, community boosts)
4. Anti-gaming system (cooldowns, quality checks, diminishing returns)
5. Sparks dashboard UI
6. Coach integration (coaches prompt generosity actions and surface rewards)

## Open questions (deferred until activation)

1. Activation timeline — pre-launch or post-launch of the core product?
2. Does Sparks launch with the free tier only, or touch all pricing tiers from day 1?
3. Anti-gaming calibration — how aggressive? Will be heavily domain-specific.
4. Persistence model — persistent balance, or time-decaying?
5. Scope model — single cross-community balance, or scoped per community?
6. Sparks admin — is anti-gaming calibration owned by Platform Ops or by Sparks itself?

## Activation criteria

Sparks should activate when **all** of the following are true:
- The core loop (persona → endorsement → shadow → claim → re-endorse) is working at a measurable rate.
- Endorsement volume is sufficient that a credit system creates visible behavioral pull.
- Team capacity exists for a new user-facing area (rather than sustaining work in Personas/Communities/Discovery/Coaches).

Until then, generosity behaviors are rewarded via the coach's verbal acknowledgment and the trust-graph ranking benefit — not via Sparks.

When activation criteria are met, run `/plan-prd sparks` and replace this stub with a canonical PRD.

## Cross-references

- Product area inventory: [`../_areas.md`](/domains/_areas.md) §Area-7-Sparks-Generosity-Engine
- Decomposition rubric: [`../_decomposition.md`](/domains/_decomposition.md) §Rule-4-Future-areas-get-named-scoped-and-deferred

_Stub authored 2026-04-13 by `/plan-foundation` during product area decomposition. Replace this file — don't edit it — when activating the area._
