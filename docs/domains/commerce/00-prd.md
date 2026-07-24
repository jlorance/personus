---
type: prd
title: Commerce — PRD Stub
description: "Commerce delivers \"users can control what their AI agents disclose during transactions via commerce personas with per-category consent, aligned with the Agentic Commerce Protocol (ACP) and…"
status: dormant
tags: [commerce]
timestamp: 2026-04-13
---


# Commerce — Product Requirements Document (STUB)

> **This is a dormant-area stub PRD.** The Commerce area is fully designed in vision, data-model, and business-model documents but has zero code. It exists here so the PRD cascade knows the area is named and scoped. **Do not author feature specs against this stub.** When Commerce activates, run `/plan-prd commerce` to replace this stub with a canonical PRD.

## Scope

Commerce delivers **"users can control what their AI agents disclose during transactions via commerce personas with per-category consent, aligned with the Agentic Commerce Protocol (ACP) and privacy-preserving payment scoping."**

## Why dormant

- **Design is complete.** Vision use case 7 (Dana), data-model §Commerce Traits, business-model §Competitive Landscape §Agentic Commerce Protocols, and research/agentic_commerce_integration.md all cover the area.
- **Zero code exists.** No commerce persona type, no ACP handshake, no consent categories beyond the base persona consent model.
- **Activation is post-PMF.** The commerce wedge depends on ACP adoption by vendors, which is early. Authoring a full PRD now wastes effort — requirements will change as the ACP ecosystem matures.

## Seed material (when activating)

**Primary design material:**
- [../../foundation/vision.md](/foundation/vision.md) §Use Case 7 — Dana's commerce persona scenario
- `foundation/_archive/data-model.2026-04-12.md` §Commerce Traits — the designed data shape (archived pre-trim; port to `schema-spec.md` on activation)
- [../../foundation/principles.md](/foundation/principles.md) §consent-by-default — the gate commerce must satisfy
- Vision principle 18 (commerce personas control agent behavior) — in [../../foundation/principles.md](/foundation/principles.md) §Vision Principles (candidate for promotion to a gate when Commerce activates)

**Business context:**
- [../../business-model/01_executive_summary.md](/business-model/01_executive_summary.md) §Market Position — ACP positioning
- [../../business-model/05_competitive_landscape.md](/business-model/05_competitive_landscape.md) §Agentic Commerce Protocols — competitive landscape

**Research:**
- [../../research/agentic_commerce_integration.md](/research/agentic_commerce_integration.md) — full ACP integration research

## Planned features (scope preview — not authored)

1. Commerce persona creation + edit (specialized persona type or persona flag)
2. Per-category consent UI (discovery, contact, data sharing, communication × transaction categories)
3. ACP handshake implementation (scoped payment tokens, shipping address release gating)
4. Commerce trait storage + retrieval

## Open questions (deferred until activation)

1. First ACP vendor partner.
2. Payment processor integration (Stripe, Paddle, custom?).
3. Shipping address release trigger point.
4. Commerce persona discoverability default (opt-in? opt-out?).
5. Relationship to base Personas area — separate entity or persona flag?
6. Should vision principle 18 be promoted to a principles.md gate when the area activates?

## Activation criteria

Commerce should activate when **any one** of the following is true:
- A specific ACP vendor partner is identified and wants to integrate.
- Internal product decision prioritizes commerce personas as a wedge.
- A regulatory or business event changes the cost/benefit (e.g., ACP becomes the dominant standard).

When activation criteria are met, run `/plan-prd commerce` and replace this stub with a canonical PRD.

## Cross-references

- Product area inventory: [`../_areas.md`](/domains/_areas.md) §Area-6-Commerce
- Decomposition rubric: [`../_decomposition.md`](/domains/_decomposition.md) §Rule-4-Future-areas-get-named-scoped-and-deferred

_Stub authored 2026-04-13 by `/plan-foundation` during product area decomposition. Replace this file — don't edit it — when activating the area._
