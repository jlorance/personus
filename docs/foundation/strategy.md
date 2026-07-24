---
type: foundation
title: Personus.ai — Strategy
description: "Question: What is our winning aspiration? What does \"winning\" mean for Personus, distinct from generic goals like \"grow\" or \"succeed\"?"
status: stub
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Strategy

> **This is a stub.** Strategy docs cannot be authored without the product leader in the room — they are a statement of explicit tradeoffs, not a reflection of existing material. The Roger Martin *Playing to Win* 5-question cascade must be answered by a human with authority, not derived from code or vision statements.
>
> **How to fill this out:** run `/plan-foundation strategy`. The workflow walks through each of the five questions below in order, performs a coherence check, and writes the result to this file.
>
> Until then, each section below contains:
> 1. The canonical question
> 2. A **partial answer derived from existing docs** (vision, business model, principles) — high-confidence material that a strategy session would keep
> 3. **Open tradeoffs** that require an explicit human decision before this file can move from stub → canonical

---

## 1. Winning Aspiration

**Question:** What is our winning aspiration? What does "winning" mean for Personus, distinct from generic goals like "grow" or "succeed"?

**Derived from existing docs:**

From [`vision.md`](/foundation/vision.md) and [`business.md`](/foundation/business.md) §Public Benefit Corporation:

> To become the interoperable layer where AI agents discover people and organizations across the open web — the primary surface for trust-weighted, privacy-preserving, capability-based discovery in the agentic era, operated as a Public Benefit Corporation that advances personal agency and economic dignity.

**Open tradeoffs:**

- Is "winning" measured by **network scale** (users, endorsements, MCP queries) or by **network sovereignty** (percentage of users who exit Meta/LinkedIn because Personus exists)? These pull in different directions at decision time.
- Is "winning" against LinkedIn, or alongside LinkedIn serving a different job? The [`business.md`](/foundation/business.md) competitive-landscape section says "Personus does not need to 'beat' LinkedIn," but a Strategy doc needs an explicit stance.
- At what scale does PBC commitment become binding vs. aspirational? The governance structure is real; the practical test comes when a revenue opportunity directly conflicts with a public-benefit commitment.

---

## 2. Where to Play

**Question:** Where will we play? Which geographies, product categories, customer segments, channels, and vertical specializations — and which are we explicitly **not** playing in?

**Derived from existing docs:**

From [`business.md`](/foundation/business.md) §Customer Segments and [`vision.md`](/foundation/vision.md) §Time Horizons:

**Playing in:**
- **Geographies:** US English (Year 1); EU + global English (Year 2); localization TBD.
- **Product categories:** people discovery, community infrastructure (guilds + chapters), commerce persona primitives.
- **Customer segments:** Solo individuals, Community Organizers, Pathfinders (recruiters/BD), Enterprise.
- **Channels:** product-led growth (Solo Free), lighthouse communities (Community Organizer), direct outreach to priced-out LinkedIn Recruiter prospects (Pathfinder), founder-led Year 1 sales (Enterprise).
- **Vertical specializations (Year 1 wedge):** skilled trades + professional associations where word-of-mouth dominates and incumbent structured alternatives are failing.

**Explicitly NOT playing in:**
- Job postings, applications, ATS — [`vision.md`](/foundation/vision.md) §What Personus Is Not.
- CRM / pipeline management.
- Review platforms / ratings / star systems — [`principles.md#trust-through-endorsements-not-reviews`](/foundation/principles.md#trust-through-endorsements-not-reviews).
- Feed-based social networking.
- Advertising surfaces.
- Universal identity provision (DIDs + AT Protocol do that).

**Open tradeoffs:**

- **Which Year 1 vertical specifically?** "Skilled trades or a professional community" is too broad. Plumbers + electricians + HVAC in one metro? DEI consultants nationally? Doulas + midwives? The answer determines the first 20-50 lighthouse communities. This is the **single biggest open strategic question.**
- **EU launch timing.** GDPR is a regulatory tailwind, but early EU launch fragments product-market fit measurement. Year 2 vs. Year 1?
- **Commerce personas as a wedge, or as a Year 2+ expansion?** Commerce personas are architecturally ready but require ACP adoption to be useful. Do we launch commerce as a separate wedge or wait until people-discovery PMF is proven?
- **Enterprise in Year 1?** Founder-led sales to 10-15 enterprises is in the Year 1 projection, but enterprise requires significant dedicated engineering work (SSO, audit exports, tenant isolation). Does this trade against the consumer-PMF push?

---

## 3. How to Win

**Question:** How will we win in the chosen places? What is our unique value proposition and what capabilities make it durable?

**Derived from existing docs:**

From [`business.md`](/foundation/business.md) §Unfair Advantage:

1. **Trust network as moat.** Copying features is easy; copying the trust graph is not.
2. **MCP-native from day one.** Architecturally designed for AI-agent consumption.
3. **Community sovereignty.** Communities own their data and schema — incumbents cannot credibly match this.
4. **Regulatory tailwinds.** GDPR, CCPA, EU AI Act, data-portability consensus.
5. **Generosity flywheel + PBC governance.** Structural differentiation that P&L-bound incumbents cannot adopt.

**Open tradeoffs:**

- **Cost leadership or differentiation?** [`business.md`](/foundation/business.md) implies differentiation via trust + privacy + AI-native design. But Pathfinder's pricing ($49 vs. LinkedIn's $835+) is also a cost-leadership move. These can coexist if framed correctly, but the Strategy doc should name which is **primary** when they conflict.
- **Is the moat the trust graph, or the protocol stance (MCP + ACP + AT Proto integration)?** Different investments follow from each answer. Trust-graph-as-moat invests in endorsement quality, claim conversion, and community density. Protocol-stance-as-moat invests in standards participation, interop, and developer ecosystem.
- **Which feature is the single thing that, if we get it wrong, nothing else matters?** Candidates: shadow claim conversion rate, PII scan reliability, Coach onboarding completion, MCP query latency, endorsement anti-gaming. Pick the one.

---

## 4. Capabilities Required

**Question:** What capabilities must be in place to win? What's required to make the "Where to Play" and "How to Win" choices real?

**Derived from existing docs:**

From [`architecture.md`](/foundation/architecture.md) and existing code state:

**Capabilities already in place:**
- Hybrid JSONB data model with vector embeddings (`personas`, `communities`, `shadow_personas`)
- Three Mastra agents (Persona Coach, Recommender Coach, Discovery Agent) wired to the DB
- Clerk auth + CASL authorization at the service layer
- MCP endpoint scaffold at `apps/web/app/api/mcp/route.ts`
- PII detection on free-text input (per `principles.md#no-pii-in-personas`)
- Full dashboard surface (persona CRUD, coach chat, inbox, settings, explore, recommend)

**Capabilities that need to be built (capability gaps):**
1. **Shadow claim infrastructure** — the claim-token → shadow-persona → full-persona flow is scaffolded (`app/claim/`) but needs end-to-end testing at scale.
2. **MCP authentication.** Currently the MCP endpoint is unauthenticated — blocks any external-agent launch.
3. **Eval + observability infrastructure.** `ai.observability: []` and `ai.eval_framework: none`. Blocks AI-safety counter-metrics.
4. **Community Coach agent.** Named in [`CLAUDE.md`](../../CLAUDE.md) §Single-codebase AI but not implemented. Required for the Community Organizer tier.
5. **Sparks system.** Fully designed in [`03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md); not implemented.
6. **AT Protocol sync pipeline.** Spec exists in [`at-protocol.md`](/foundation/at-protocol.md); no implementation.
7. **Admin control plane.** `apps/admin/` is a scaffold; taxonomy admin, user ops, and system settings are needed for Year 2 scale.
8. **Metrics + dashboards.** [`metrics.md`](/foundation/metrics.md) identifies 6 measurement-infrastructure gaps.
9. **Commerce persona + ACP integration.** Architecturally ready, zero implementation.
10. **Billing + subscriptions.** No payment integration today. Blocks every paid tier.
11. **Internationalization.** No i18n infra. Blocks EU launch.
12. **SSO + audit exports.** Blocks Enterprise tier.

**Open tradeoffs:**

- **Which capability is P0 for the Year 1 PMF wedge?** Almost certainly: billing (can't charge), Coach refinement (conversion depends on it), claim flow end-to-end (shadow loop depends on it), wedge-specific taxonomy (search quality depends on it). The rest are Year 2.
- **Build or buy for eval infrastructure?** Braintrust, Langfuse, Sentry, or self-hosted? Each has tradeoffs between cost, vendor lock-in, and privacy posture. (PBC governance may constrain vendor choice — e.g., no observability platform that logs PII.)
- **Capability sequencing.** Does Community Coach come before Sparks, or the other way around? Sparks incentivizes the behaviors Community Coach triggers. But Community Coach alone produces value without Sparks.

---

## 5. Management Systems

**Question:** What management systems are required to sustain the choices above? What processes, metrics, cadences, and org structure make the strategy executable?

**Derived from existing docs and current state:**

**In place today:**
- library spec-driven development framework (PRDs, Feature Specs, Schema Specs, ADRs)
- Linear tracker with project separation (web / agents / foundations)
- Principles + architecture documentation (as of this session)
- Commit-level quality gates via Biome + Vitest + type-check
- Audit skills (`/audit-security`, `/audit-data-governance`, `/audit-maintainability`, etc.)

**Needed to execute the strategy:**

1. **Weekly North Star review cadence** — does not exist; see [`metrics.md`](/foundation/metrics.md) §Cadence.
2. **Monthly wedge-specific PMF check** — see [`metrics.md`](/foundation/metrics.md) §PMF Indicator. Requires in-product survey infra.
3. **Quarterly PBC accountability report** — legal requirement of PBC governance.
4. **Red-line incident response** — counter-metric alerts route to a defined responder.
5. **Waiver log** — when a principles-gate is waived, the waiver + expiry + accountable owner must be recorded. Currently ad-hoc.
6. **Lighthouse-community relationship management** — a non-product function that doesn't exist yet. Year 1 depends on 20-50 high-touch community relationships.
7. **Annual pricing review** — PBC commitment: "free tier only gets more generous over time" — requires a scheduled review.
8. **Roadmap aligned to this strategy doc** — currently roadmap lives in Linear without an explicit cascade back to the Strategy's "Where to Play" + "Capabilities Required."

**Open tradeoffs:**

- **Product-led vs. sales-led at Year 1 Enterprise.** Founder-led enterprise sales is a full-time job; it trades against consumer PMF push. Is a founder doing both, or is one being sacrificed?
- **Hiring sequence.** First hires after CEO/CTO: community manager (network density)? ML engineer (search quality)? Designer (Coach UX)? Each accelerates a different capability.
- **Governance of principles changes.** Today the `principles.md` file has a "retire via ADR" rule. But who approves? Is it the CEO alone, a 2-person executive pair, or the board?

---

## Coherence Check

A coherent strategy means the five answers reinforce each other. Open questions that require **coherence** — meaning an answer to one constrains the others:

1. **If we win on trust-graph moat, capabilities must prioritize endorsement quality + claim conversion + wedge density — not feature breadth.** Every capability choice that doesn't serve the moat is a distraction.
2. **If we play in a specific Year 1 vertical wedge, management systems must measure that wedge independently — weekly + monthly cadences must allow vertical-wise PMF diagnosis.**
3. **If we aspire to PBC-governed network sovereignty, capabilities that create lock-in (proprietary formats, un-exportable state, surveillance) are excluded regardless of growth impact.** This is the largest coherence constraint, because it rules out entire categories of growth hacks.
4. **If Enterprise is in Year 1, capability budget must include SSO + audit + tenant isolation — and the resulting engineering time is not available for consumer PMF work.** The coherence question: are these actually in scope, or should they wait?

---

## How to Turn This Stub Into a Canonical Document

Run `/plan-foundation strategy`. The workflow will:

1. Read this stub
2. Interview the product leader on each of the 5 questions using `AskUserQuestion`
3. For each question, ask "What does this rule out?" — the discipline of Playing to Win
4. Perform the coherence check explicitly
5. Overwrite this file with the canonical version
6. Flag any changes back to [`vision.md`](/foundation/vision.md), [`principles.md`](/foundation/principles.md), or [`metrics.md`](/foundation/metrics.md) that the strategy implies

**Blocker status:** This stub is listed in [`master-spec.md`](/foundation/master-spec.md) as `status: stub`. Downstream skills that read strategy (`/plan-prd`, `/plan-messaging`, `/arch-review`) will see the stub and degrade gracefully — they fall back on [`vision.md`](/foundation/vision.md) + [`business.md`](/foundation/business.md) for strategic context.

_Last updated 2026-04-12 by `/plan-foundation` (Phase 1g — stub with derived partial answers and named open tradeoffs; requires interactive authoring to complete)._
