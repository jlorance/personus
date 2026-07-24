---
type: foundation
title: Personus.ai — Metrics Framework
description: Trust-backed matches delivered per week.
status: current
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Metrics Framework

> **This is the canonical library metrics document.** It defines the feedback loop by which Personus measures whether the product is working. Every PRD and Feature Spec should identify which input metric it moves. Every hypothesis should be falsifiable against these numbers. `/plan-prd` and `/plan-messaging` read this file when framing impact claims.
>
> **Feedback-loop shape:** North Star → Input metrics → Counter-metrics (red lines) → Activation funnel → PMF indicator → Unit economics. No single metric is sufficient — this is a system, not a scoreboard.

## North Star Metric

**Trust-backed matches delivered per week.**

A "trust-backed match" is an AI-agent or human-initiated query that returns at least one persona with an endorsement path to the requester and results in a contact request or claim action within 7 days.

**Why this is the North Star:**
- It captures **discovery** (the query happened), **trust** (the match was endorsement-backed), and **outcome** (the requester acted). All three must be present.
- It degrades gracefully when any component is weak: if discovery is bad, the number falls. If trust density is low, the number falls. If UX is bad, the number falls.
- It is **unfakeable**: you cannot juice it with vanity activity or bot traffic — an endorsement path and a 7-day contact action are both falsifiable.
- It aligns with the [`vision.md`](/foundation/vision.md) core loop: persona → endorsement → shadow → query → match → contact → new user → re-endorse.

**Year-over-year targets:**

| Year | Trust-backed matches / week | Implied MCP query volume / month | Implied network density |
|---|---|---|---|
| Year 1 | 200 | 500K | 100K users, 300K endorsements |
| Year 2 | 2,000 | 10M | 500K users, 2M endorsements |
| Year 3 | 20,000 | 200M | 2M users, 10M endorsements |

Year 1 target translates to "one trust-backed match every 50 minutes" — a reasonable first-PMF threshold for a wedge vertical. Year 3 target translates to ~60 per minute across a dense network.

---

## Input Metrics (Breadth × Depth × Frequency × Efficiency)

Four categories of inputs that compose to the North Star. When the North Star stalls, the diagnosis lives in which input category is underperforming.

### Breadth — How many people participate

| Metric | Year 1 | Year 2 | Year 3 | Owner | Notes |
|---|---|---|---|---|---|
| **Total users** (registered) | 100K | 500K | 2M | Growth | Vanity-adjacent; use MAU as the real gate |
| **Monthly active users (MAU)** | 40K | 200K | 800K | Growth | 40% of total at scale — typical for utility-mode products |
| **Communities (all tiers)** | 600 | 2.5K | 12K | Community | Heavy concentration in vertical wedges (Year 1) |

### Depth — How well each node is filled out

| Metric | Year 1 | Year 2 | Year 3 | Owner | Notes |
|---|---|---|---|---|---|
| **Personas created** | 150K | 750K | 3M | Product | ~1.5 personas per user (profile-is-master works) |
| **Endorsements** | 300K | 2M | 10M | Product | 2-5 per persona — the trust graph density |
| **Shadow personas created** | 200K | 1M | 5M | Product | Pre-acquisition demand signal |
| **Profile completeness (median)** | 50% | 65% | 75% | Product | Derived from `trait_metadata` completeness scoring |

### Frequency — How often the network is used

| Metric | Year 1 | Year 2 | Year 3 | Owner | Notes |
|---|---|---|---|---|---|
| **MCP queries / month** | 500K | 10M | 200M | Platform | Queries from external AI agents (Claude, ChatGPT, Gemini) |
| **Internal discovery queries / month** | — | — | — | Product | Queries from the in-app explore/recommend surfaces |
| **Contact requests / month** | — | — | — | Product | The signal that discovery is working |
| **Shadow claim rate** | 15% | 20% | 25% | Growth | Of shadow personas invited, how many claim? |

### Efficiency — How much it costs per unit of value

| Metric | Year 1 | Year 2 | Year 3 | Owner | Notes |
|---|---|---|---|---|---|
| **CAC (blended)** | $5 | $3 | $2 | Growth | Falls with network effects |
| **LTV:CAC ratio** | 8:1 | 15:1 | 25:1 | Finance | Strong network effects compound |
| **Free-to-paid conversion (12mo)** | 5% | 6% | 7% | Product + Growth | Industry benchmark 2-5% for freemium |
| **Net revenue retention** | 110% | 120% | 130% | Revenue | Enterprise tier drives |
| **Gross margin (blended)** | 68% | 78% | 81% | Finance | Improves with mix + LLM cost decline |

---

## Counter-Metrics (Red Lines)

Metrics that **must not cross the red line** regardless of how good the North Star looks. These are the PBC commitments made measurable — the checks that prevent North Star growth at the cost of network health.

| Counter-metric | Red line | Why | Triggered action |
|---|---|---|---|
| **PII detections in personas (per week)** | Must trend to **0** | [`principles.md#no-pii-in-personas`](/foundation/principles.md#no-pii-in-personas) is architectural. Any non-zero value means the PII scan is failing. | Incident review — treat as P1 security issue |
| **Endorsement spam / gaming rate** | < 1% of endorsements flagged | Sparks + endorsement model depend on trust integrity | Audit + Spark multiplier adjustment |
| **Free-tier degradation complaints** | 0 per quarter | PBC commitment: never degrade free to force upgrades | Feature review; rollback if degradation is real |
| **User-reported data sale / leak suspicion** | 0 per quarter | PBC non-negotiable: user data is never sold | Full incident response; public disclosure |
| **Shadow-claim conversion rate on invite** | ≥ 10% | Below this, shadows are noise, not signal | Redesign claim flow; review endorsement quality gates |
| **Discovery query latency p95** | < 1.5s (agent-mediated budget) | [`principles.md#latency-p95-500-1000`](/foundation/principles.md#latency-p95-500-1000) sets agent-mediated budget separately | Performance audit |
| **LLM cost per active user / month** | < $3 at Year 1, < $1 at Year 3 | [`principles.md#ai-cost-and-loop-caps`](/foundation/principles.md#ai-cost-and-loop-caps) enforces hard per-request caps; this is the blended check | Cost cap re-tuning; model swap |
| **Agent loop cost per run (p95)** | < $0.50 / run | `ai.cost_caps.per_agent_run_usd` | Agent iteration cap tightening |
| **Agent loop iterations (p95)** | < 8 per run | Runaway loops are the most common AI production incident | Killswitch review + agent redesign |
| **Accessibility violations per surface** | 0 WCAG 2.1 AA | [`principles.md#accessibility-wcag-2-1-aa`](/foundation/principles.md#accessibility-wcag-2-1-aa) | Block merge until fixed |
| **Authz bypass incidents** | 0 per quarter | [`principles.md#authz-at-service-layer`](/foundation/principles.md#authz-at-service-layer) | Full incident response; retroactive audit of service-layer principal checks |
| **Net promoter score — community organizers** | > 40 | Communities are the growth engine; organizer churn kills network density | Interview drive; reprioritize CO roadmap |
| **Days to first endorsement (median)** | < 7 | The trust flywheel needs to start fast; long delay means onboarding is broken | Coach prompt redesign |

---

## Activation Funnel

The sequence a new user must traverse to become a "trust-backed node" in the network. Each step has an explicit conversion target; dropouts map to specific remediation work.

| Step | Event | Year 1 target | Failure mode |
|---|---|---|---|
| **1. Signup** | User creates account (Clerk) | 100% | — |
| **2. First persona** | User creates ≥1 persona via Persona Coach | 80% within 24h | Coach flow too long; empty-state confusing |
| **3. Profile completeness ≥ 50%** | Median `trait_metadata` completeness | 70% within 7d | Coach prompts not surfacing the right traits |
| **4. First endorsement given** | User endorses ≥1 person (may create shadow) | 40% within 14d | Recommender Coach not surfacing strong prompts |
| **5. First endorsement received** | User has ≥1 endorsement | 30% within 30d | Network density too low (wedge problem) |
| **6. First trust-backed match** | User appears in or receives a trust-backed match | 15% within 60d | Wedge density insufficient; Coach not suggesting community join |
| **7. Trust-backed node** | User has given + received ≥1 endorsement AND appears in ≥1 match | 10% within 90d | PMF threshold — below 10%, wedge has not reached density |

**Interpretation:** a wedge vertical reaches local PMF when step 7 hits **>25%** within 90 days. This is the practical signal that the endorsement flywheel is self-sustaining in that vertical.

---

## Product-Market Fit Indicator

**Primary: Sean Ellis "Very Disappointed" Test.**

Ask users: *"How would you feel if you could no longer use Personus?"*

Options: Very disappointed / Somewhat disappointed / Not disappointed / N/A.

**PMF threshold: > 40% "very disappointed"** among users who have used the product in the last 2 weeks and have at least one endorsement given or received.

**Secondary indicators** (all must trend up together for PMF to be credible):

1. **Organic signup rate** — signups attributable to existing user referrals / shadow claims / Sparks-driven growth, not paid channels. Target: >50% of signups by end of Year 1.
2. **Endorsement flywheel velocity** — rolling 30-day rate of (new endorsements / new users). Target: ≥3 per new user by end of Year 1.
3. **Retention curve flatness** — Month-2 retention > 50%, Month-6 retention > 35%, indicating the product has lasting utility, not just novelty.
4. **Word-of-mouth referral strength** — NPS ≥ 40 overall; ≥ 50 among Community Organizers.
5. **Trust-backed match growth rate** — North Star Metric growing ≥ 15% month-over-month during PMF discovery.

**PMF is wedge-local, not global.** Personus will reach PMF in one vertical (likely trades or a specific professional community) before it reaches PMF across all verticals. The framework explicitly allows for vertical-wise measurement — each lighthouse community is measured independently.

---

## Unit Economics

Detail: [`business.md#unit-economics`](/foundation/business.md#unit-economics). Summary:

| Tier | Monthly price | Our cost/mo | Gross margin |
|---|---|---|---|
| Solo Free | $0 | $0.50-1.10 | -100% (investment) |
| Solo Pro | $12 | $2.50-5.50 | 54-79% |
| Community Organizer Base | $8.25 ($99/yr) | $5-15 | Breakeven |
| Community Organizer Pro | $199 | $20-40 | 80-90% |
| Pathfinder | $49 | $2-5 | 90-96% |
| Pathfinder Team | $149 | $5-15 | 90-97% |
| Enterprise Base | $499 | $50-100 | 80-90% |
| Enterprise Pro | $2,000+ | $200-400 | 80-90% |

**Blended gross margin:** 68% (Year 1) → 78% (Year 2) → 81% (Year 3).

**LTV:CAC ratio:** 8:1 (Year 1) → 15:1 (Year 2) → 25:1 (Year 3) — driven by network effects compounding conversion rates, and by LLM inference costs continuing to decline (~80% drop since GPT-4 launch).

---

## Measurement Infrastructure

**What exists today:**
- `activity_events` table in Neon (see [`data-model.md`](/foundation/data-model.md) §Operational tables) — every state-changing mutation emits an event with actor, action, target, timestamp, source. This is the source-of-truth audit log and the foundation for most metrics.
- Persona / community / shadow_persona vector embeddings — enable semantic search metrics (match quality, retrieval precision).
- Coach session logging in `coach_sessions` — tracks LLM invocations and completeness deltas.

**What's missing and needs a spec:**

1. **North Star dashboard.** No surface today that counts trust-backed matches per week. Needs a query + a reporting surface. Likely first spec in [`docs/specs/platform-ops/`](../specs/platform-ops/).
2. **Counter-metric monitoring + alerting.** No alert rules today. Needs integration with an observability platform (choice is open — see [`architecture.md`](/foundation/architecture.md) §Open Questions).
3. **Activation funnel tracking.** The `activity_events` table has the raw data; no query or dashboard surfaces it as a funnel today.
4. **PMF survey infrastructure.** No in-product survey surface yet. Sean Ellis test needs a UI and a response store.
5. **Cost attribution.** `ai.cost_caps` are enforced at the request level (per [`principles.md#ai-cost-and-loop-caps`](/foundation/principles.md#ai-cost-and-loop-caps)), but per-user / per-tenant / per-agent cost attribution requires a reporting layer that doesn't exist yet. See the `CostDashboard` context in [`.claude/actors-and-contexts.md`](../../.claude/actors-and-contexts.md) §C8.
6. **Observability platform choice.** Currently `ai.observability: []` in the Solution Profile. Langfuse, Sentry, or another vendor — choice blocks most of the AI-safety counter-metrics.

**Tracked in Linear project:** `foundations` (`cd5846aa-c3aa-4c42-ae1e-3898859a0fbc`) — all metrics-infrastructure work should carry the `area:metrics` label (create if missing).

---

## Cadence

| Cadence | What happens | Who | Artifact |
|---|---|---|---|
| **Weekly** | North Star, input metrics, counter-metric check | Product + Growth | Slack digest (when infra exists) |
| **Monthly** | Full dashboard review; activation funnel diagnosis; wedge-specific PMF check | Full team | `docs/metrics/YYYY-MM.md` (when infra exists) |
| **Quarterly** | Unit economics review; cost trajectory check; red-line incidents retro | Finance + Product | `docs/retros/YYYY-Qn.md` (when infra exists) |
| **Annually** | PBC public benefit report (required by PBC governance) | Board + CEO | Public `docs/pbc-report-YYYY.md` (when infra exists) |

**Today (2026-04-12):** none of the above cadences are running. The first spec in the metrics-infrastructure work should be the weekly North Star + counter-metrics digest.

---

## Cross-References

- Business model + pricing: [`business.md`](/foundation/business.md)
- Vision + core loop: [`vision.md`](/foundation/vision.md)
- Principles (gates): [`principles.md`](/foundation/principles.md)
- Data model (source of truth for most metrics): [`data-model.md`](/foundation/data-model.md)
- Agent architecture (cost caps enforced here): [`agents.md`](/foundation/agents.md)
- Detailed growth model: [`04_growth_model_and_economics.md`](/business-model/04_growth_model_and_economics.md)

_Last updated 2026-04-12 by `/plan-foundation` (Phase 1f — authored from `business-model/04_growth_model_and_economics.md` KPI table + vision core loop + PBC counter-metric commitments)._
