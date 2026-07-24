---
type: foundation
title: Personus.ai — Product Areas Inventory
description: "Not areas (resolved by the decomposition rubric):"
status: current
tags: [domains]
timestamp: 2026-04-14
---

# Personus.ai — Product Areas Inventory

> 2026-04-14 · Applied result of the [decomposition rubric](/domains/_decomposition.md). 8 areas: 5 active, 2 dormant, 1 operator. Pre-trim version at [`_archive/_areas.2026-04-13.md`](/archive/legacy/specs/_archive/_areas.2026-04-13.md).

## Summary

| # | Area | Status | Suite | PRD status |
|---|---|---|---|---|
| 1 | **Personas** | partial | [`personas/`](personas/) | ✅ v1 written (2026-04-14, frugal shape) |
| 2 | **Communities** | partial | [`communities/`](communities/) | ✅ v3 written (2026-04-14, frugal shape); guilds sub-PRD placeholder |
| 3 | **Discovery** | candidate | [`discovery/`](discovery/) | ⏳ pending — next highest-leverage PRD (owns North Star) |
| 4 | **AI Coaches** | candidate | [`coaches/`](coaches/) | ⏳ pending — governs biggest variable cost |
| 5 | **Integrations** | partial | [`integrations/`](integrations/) | ⏳ pre-library overview exists at `00-prd.md`; needs frugal rewrite |
| 6 | **Commerce** | dormant | [`commerce/`](commerce/) | ✅ stub PRD written; waits for activation |
| 7 | **Sparks (Generosity Engine)** | dormant | [`sparks/`](sparks/) | ✅ stub PRD written; waits for activation |
| 8 | **Platform Ops** | partial | [`platform-ops/`](platform-ops/) | ⏳ pre-library PRD exists; lightweight refresh pending |

**Not areas** (resolved by the decomposition rubric):
- Endorsements, Shadow Personas, Contact Requests, Profile Import → absorbed into Personas (Rule 2)
- Onboarding / Progressive Revelation → absorbed into AI Coaches (Rule 1)
- Notifications, Audit Logs, Authentication, PII Detection, Accessibility, Cost Caps → cross-cutting, NOT areas (Rule 3)
- Trust Graph → pattern name, not a service layer (Rule 1)
- Billing & Subscriptions → `deferred`, not a user-value bundle (Rule 4)

---

## Areas with PRDs written

### 1. Personas ✅

**One-line scope:** Users maintain one master trait pool and publish selective persona lenses over it; each persona is an addressable, AI-discoverable endpoint with its own visibility, layout, and claim path.

- **PRD:** [`personas/00-prd.md`](/domains/personas/00-prd.md)
- **Domain model:** [`personas/domain-model.md`](/domains/personas/domain-model.md)
- **Schema spec:** [`personas/schema-spec.md`](/domains/personas/schema-spec.md)
- **Design decisions ADR:** [`../decisions/personas-design-decisions.md`](/decisions/personas-design-decisions.md)
- **Archived pre-library PRD:** [`personas/_archive/00-prd.2026-02-23.md`](/archive/legacy/specs/personas/_archive/00-prd.2026-02-23.md)
- **Pre-existing feature specs:** 9 files (01–09) — lifecycle, profile, trait metadata, visibility, layout, public pages, shadows, cross-persona linking, editing patterns

### 2. Communities ✅

**One-line scope:** Structured, AI-queryable capability overlay for existing groups (clubs, guilds, workplaces, neighborhoods, chapters) that makes hidden member skills discoverable.

- **PRD:** [`communities/00-prd.md`](/domains/communities/00-prd.md)
- **Domain model:** [`communities/domain-model.md`](/domains/communities/domain-model.md)
- **Schema spec:** [`communities/schema-spec.md`](/domains/communities/schema-spec.md)
- **Design decisions ADR:** [`../decisions/communities-design-decisions.md`](/decisions/communities-design-decisions.md)
- **Guilds sub-PRD placeholder:** [`communities/guilds-prd.md`](/domains/communities/guilds-prd.md) — requires `/plan-prd guilds` run against the archived legacy design
- **Archived pre-library PRD:** [`communities/_archive/00-prd.2026-02-23.md`](/archive/legacy/specs/communities/_archive/00-prd.2026-02-23.md)
- **Pre-existing feature specs:** 12 files (01–12) — lifecycle, membership, directory, discovery, invitations, activity, moderation, notifications, integrations UI, notices, closure, relationships
- **Tracker-status content** (build status, wave-based priority): [`communities/to-reintegrate.md`](/archive/communities-to-reintegrate.md) — promote to Linear issues in next cycle-planning

---

## Areas with PRDs pending

### 3. Discovery ⏳

**One-line scope:** AI agents, humans in-app, and external MCP clients find trust-backed matches to capability-based queries about people, organizations, and communities. Owns the [North Star metric](/foundation/metrics.md#north-star-metric).

**Why highest-leverage:** owns the North Star metric; blocks external-agent production launch (MCP auth); no PRD exists yet.

**Seed material for `/plan-prd discovery`:**
- [`../foundation/vision.md`](/foundation/vision.md) §Use Case 6 (Sam + Claude ambient discovery)
- [`../foundation/api-surface.md`](/foundation/api-surface.md) §MCP tools
- [`../foundation/agents.md`](/foundation/agents.md) §DiscoveryAgent
- [`../foundation/metrics.md`](/foundation/metrics.md) §North Star Metric
- [`../foundation/_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md) — full pre-trim tool definitions (5 tools with complete schemas)
- Code: `apps/web/lib/mastra/tools.ts`, `apps/web/app/api/mcp/route.ts`

**Expected feature specs:** MCP endpoint auth, trust-backed match scoring, ambient discovery, query logs + analytics, contact-request-from-match, cross-community filtering (6 feature specs).

**Open decisions for PRD session:**
- Relationship to Trust Graph — who owns endorsement-path traversal?
- MCP auth scheme — API token? OAuth? Per-user delegation?
- Internal vs. external discovery separation
- Cost attribution at the query level

### 4. AI Coaches ⏳

**One-line scope:** Conversational agents that guide users through progressive revelation — from first sign-up to active community leadership — via personalized suggestions, trait enrichment prompts, and generosity nudges.

**Why high-leverage:** governs the biggest variable cost driver (LLM spend); three live agents exist without a PRD owning them.

**Seed material for `/plan-prd coaches`:**
- [`../foundation/vision.md`](/foundation/vision.md) §Progressive Onboarding (4-phase model)
- [`../foundation/agents.md`](/foundation/agents.md) (trimmed version — 3 live agents described from code)
- [`../foundation/_archive/agents.2026-04-12.md`](/archive/legacy/foundation/_archive/agents.2026-04-12.md) — pre-trim Coach conversational flow designs (1,633 lines; primary seed for conversation design)
- [`../foundation/principles.md`](/foundation/principles.md) §ai-cost-and-loop-caps
- [`../foundation/metrics.md`](/foundation/metrics.md) §Counter-metrics (cost attribution, loop iterations, run cost)
- Code: `apps/web/lib/mastra/agents/persona-coach.ts`, `apps/web/lib/mastra/agents/recommender-and-discovery.ts`

**Expected feature specs:** persona coach flows, recommender coach flows, community coach (not built), progressive onboarding phase awareness, cost caps + killswitch UX, eval coverage (blocked by framework choice).

**Open decisions for PRD session:**
- One area with multiple named agents, or multiple areas?
- Recommender/Discovery boundary — who owns the matching vs the conversation?
- Community Coach — separate agent or mode of existing?
- Eval framework choice (blocked by architectural decision)
- Graceful degradation UX when cost cap hits

### 5. Integrations ⏳

**One-line scope:** Personus reaches users where they already are — via communication platforms (Slack, Discord, WhatsApp, Signal, Telegram, Matrix), social protocols (ActivityPub, AT Protocol), and web presence.

**Status:** pre-library overview exists at [`integrations/00-prd.md`](/domains/platform-channels/00-prd.md) (~830 lines, substantively content-rich but not in frugal shape). 10 per-platform feature specs drafted; **zero integration code in the repo.**

**Seed material for frugal rewrite:**
- [`integrations/00-prd.md`](/domains/platform-channels/00-prd.md) — existing overview (content-rich, shape-wrong)
- [`../foundation/at-protocol.md`](/foundation/at-protocol.md) — AT Protocol integration design
- [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md), `matrix_protocol_integration.md`, `telegram_integration.md`, `whatsapp_integration.md`
- Per-platform existing specs: `integrations/02-matrix.md` through `10-activity-tracking.md`

**Recommendation:** defer the Integrations PRD refresh until one platform is actively being built. The existing overview + per-platform specs are usable as-is; a frugal rewrite before any code exists would be speculation.

### 8. Platform Ops ⏳

**One-line scope:** Internal operators (admins, support, platform engineering) manage the taxonomy, trait metadata, system settings, user accounts, and community operations that the product depends on.

**Status:** pre-library PRD exists at [`platform-ops/00-prd.md`](/domains/platform-ops/00-prd.md) (~200 lines). 5 feature specs drafted. `apps/admin/` is a scaffold only — no admin UI implemented.

**Seed material for frugal rewrite:**
- [`platform-ops/00-prd.md`](/domains/platform-ops/00-prd.md) — existing PRD (close to frugal shape already)
- 5 existing feature specs (01–05)
- [`../foundation/authorization.md`](/foundation/authorization.md) — Admin actor's authz

**Recommendation:** lightweight refresh. This is the smallest pending PRD rewrite.

---

## Dormant areas (stub PRDs)

### 6. Commerce 🛑

**Scope:** Users control what their AI agents disclose during transactions via commerce personas with per-category consent, aligned with the Agentic Commerce Protocol (ACP).

- **Stub PRD:** [`commerce/00-prd.md`](/domains/commerce/00-prd.md)
- **Primary design material:** [`../foundation/vision.md`](/foundation/vision.md) §Use Case 7 (Dana), [`../research/agentic_commerce_integration.md`](/research/agentic_commerce_integration.md), commerce traits section archived at `../foundation/_archive/data-model.2026-04-12.md` §Commerce Traits
- **Zero code.** Activates when an ACP vendor partner is identified or commerce personas are prioritized as a wedge.

### 7. Sparks 🛑

**Scope:** Credit system that rewards the generous behaviors that grow the trust network — endorsing, recommending, welcoming newcomers. Earned through generosity, never purchased.

- **Stub PRD:** [`sparks/00-prd.md`](/domains/sparks/00-prd.md)
- **Primary design material:** [`../business-model/03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md) — complete ~250-line design
- **Zero code.** Activates when the core loop is running at a measurable rate (post-PMF).

---

## Migration plan

Remaining work, in leverage order:

1. **`/plan-prd discovery`** — highest leverage. Owns the North Star; blocks external-agent production.
2. **`/plan-prd coaches`** — second highest. Governs biggest variable cost; three agents already live without PRD ownership.
3. **`platform-ops/00-prd.md` refresh** — lightweight; existing PRD is close to frugal shape.
4. **`integrations/00-prd.md` refresh** — deferred until a platform is actively being built. Current overview is usable.
5. **Commerce, Sparks** — wait for activation. Stub PRDs are in place.

## Cross-references

- Decomposition rubric: [`_decomposition.md`](/domains/_decomposition.md)
- Frugal PRD shape: [`_prd-shape.md`](/domains/_prd-shape.md)
- Schema spec vocabulary: [`_schema-vocabulary.md`](/domains/_schema-vocabulary.md)
- Foundation docs: [`../foundation/`](../foundation/)
- library PRD template (canonical, not used here): [`../../.claude/skills/abl/plan-prd/prd-template.md`](../../.claude/skills/abl/plan-prd/prd-template.md)
- Actors & contexts registry: [`../../.claude/actors-and-contexts.md`](../../.claude/actors-and-contexts.md)

## History

- **2026-04-13** — Original 628-line `_areas.md` authored with full per-area seed material, feature lists, and open-question details (appropriate before any PRDs existed)
- **2026-04-14** — Trimmed to ~180 lines. For areas with PRDs written (Personas, Communities), per-area detail compressed to pointers since the PRD is now authoritative. For pending areas (Discovery, Coaches, Integrations, Platform Ops), seed material + open questions preserved since they're still the input to `/plan-prd`. Pre-trim at [`_archive/_areas.2026-04-13.md`](/archive/legacy/specs/_archive/_areas.2026-04-13.md).
