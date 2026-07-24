---
type: spec
title: Personus.ai — Product Areas Inventory
description: "Total: 8 areas — 5 active, 2 dormant, 1 scaffold."
status: superseded
tags: [archived]
timestamp: 2026-04-13
---


# Personus.ai — Product Areas Inventory

> **This is the applied output of the [`_decomposition.md`](_decomposition.md) rubric for Personus.ai.** It lists every product area, classifies it, points at seed material, and identifies what needs to happen next. Each row is an input to a PRD authoring session via `/plan-prd <area>`.
>
> **How to read this file.** Each area section contains: the one-sentence scope (Rule 1), the architectural footprint (Rule 2), the status (Rule 4), the target suite path, the seed material (existing specs + foundation docs + archives + code + research), the known features grouped by build status, and the open questions that need to be resolved during PRD authoring.
>
> **How to use this file.** Pick an area. Read its row. Run `/plan-prd <area>`. The seed material tells the PRD authoring session what to read. The open questions tell the session what to decide. The feature list tells the session what to scope.

## Summary

| # | Area | Status | Suite path | Feature count (built + planned) |
|---|---|---|---|---|
| 1 | **Personas** | `partial` — PRD exists, 9 feature specs drafted, code largely built | `docs/specs/personas/` (renamed from `identity-and-personas/`) | 11 built + 6 planned |
| 2 | **Communities** | `partial` — PRD exists, 12 feature specs drafted, code largely built | `docs/specs/communities/` | 9 built + 8 planned (incl. Guilds sub-PRD) |
| 3 | **Discovery** | `candidate` — partial coverage in other suites, needs a dedicated PRD | `docs/specs/discovery/` (new) | 4 built + 6 planned |
| 4 | **AI Coaches** | `candidate` — partial coverage in Personas spec suite, needs a dedicated PRD | `docs/specs/coaches/` (new) | 3 built + 5 planned |
| 5 | **Integrations** | `partial` — overview exists (not named "prd"), 10 per-platform specs, 0 built | `docs/specs/integrations/` | 0 built + 10 planned |
| 6 | **Commerce** | `dormant` — fully designed in vision + data-model, zero code | `docs/specs/commerce/` (new, stub only) | 0 built + 4 planned |
| 7 | **Sparks (Generosity Engine)** | `dormant` — fully designed in business-model/03, zero code | `docs/specs/sparks/` (new, stub only) | 0 built + 6 planned |
| 8 | **Platform Ops** | `partial` — PRD exists, 5 feature specs drafted, scaffold code only | `docs/specs/platform-ops/` | 0 built + 5 planned |

**Total: 8 areas — 5 active, 2 dormant, 1 scaffold.**

**Not areas (resolved by the rubric):**
- Endorsements, Shadow Personas, Contact Requests, Profile Import → absorbed into Personas (Rule 2 — no independent service layer)
- Onboarding / Progressive Revelation → absorbed into AI Coaches (Rule 1 — the coach surfaces deliver onboarding)
- Notifications, Audit Logs, PII Detection, Accessibility, Cost Caps → cross-cutting, NOT areas (Rule 3 — enforced by principles)
- Authentication → cross-cutting, lives in [`../foundation/authentication.md`](../foundation/authentication.md) (Rule 3)
- Trust Graph → pattern name, not a service layer; implemented across Personas + Discovery (Rule 1 — not a standalone bundle)
- Billing & Subscriptions → `deferred`, not even a stub (Rule 4 — not a user-value bundle, commercial layer only)

---

## Area 1 — Personas

### Scope (Rule 1)

Personas delivers "one user can maintain a master trait pool and publish selective views of themselves to different audiences, each with its own visibility, layout, and claim path."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Tables | `packages/db/src/schema/users.ts`, `user_traits` (in same file), `traits.ts` (metadata), `personas.ts`, `shadow-personas.ts`, `endorsements.ts`, `contact-requests.ts`, `activity-events.ts` |
| Service layer | `apps/web/app/actions/personas.ts`, `shadows.ts`, `endorsements.ts`, `contacts.ts`, `profile.ts`, `import.ts` |
| Routes | `apps/web/app/(dashboard)/personas/`, `profile/`, `inbox/` + public routes `app/p/[uri]`, `app/claim/`, `app/endorse/` |
| UI components | `apps/web/components/persona-*`, `trait-*`, `completeness-meter.tsx`, `endorsement-*`, `shadow-*` |
| Utilities | `apps/web/lib/personas/` (completeness scoring, layout config), `apps/web/lib/embeddings/` (persona vectors), `apps/web/lib/import/` (LinkedIn/URL import) |

### Status

`partial` — PRD exists at [`personas/00-prd.md`](identity-and-personas/00-prd.md) (~180 lines, dated 2026-02-23). 9 feature specs drafted (01–09). Significant code built — persona CRUD, master trait editing, completeness scoring, public pages, shadow persona creation + claim flow, endorsements, contact requests.

### Target path

`docs/specs/personas/` — **renamed from `identity-and-personas/`**. The existing spec files stay intact.

### Seed material

**Existing specs (keep and refresh):**
- [`identity-and-personas/00-prd.md`](identity-and-personas/00-prd.md) — existing PRD
- [`identity-and-personas/01-persona-lifecycle.md`](identity-and-personas/01-persona-lifecycle.md)
- [`identity-and-personas/02-profile.md`](identity-and-personas/02-profile.md)
- [`identity-and-personas/03-trait-metadata.md`](identity-and-personas/03-trait-metadata.md)
- [`identity-and-personas/04-persona-visibility.md`](identity-and-personas/04-persona-visibility.md)
- [`identity-and-personas/05-layout-and-theming.md`](identity-and-personas/05-layout-and-theming.md)
- [`identity-and-personas/06-public-pages.md`](identity-and-personas/06-public-pages.md)
- [`identity-and-personas/07-shadow-personas.md`](identity-and-personas/07-shadow-personas.md)
- [`identity-and-personas/08-cross-persona-linking.md`](identity-and-personas/08-cross-persona-linking.md)
- [`identity-and-personas/09-editing-patterns.md`](identity-and-personas/09-editing-patterns.md)

**Foundation topic files:**
- [`../foundation/vision.md`](../foundation/vision.md) — Use cases 1, 2, 3, 4 are Personas-centric
- [`personas/schema-spec.md`](personas/schema-spec.md) — full field-level logical schema for Users, UserTraits, TraitMetadata, Personas, ShadowPersonas, Endorsements, ContactRequests
- [`../foundation/data-model.md`](../foundation/data-model.md) — cross-area invariants + hybrid JSONB decision (system-level only after 2026-04-14 trim)
- [`../foundation/api-surface.md`](../foundation/api-surface.md) — persona MCP tools, GraphQL types
- [`../foundation/principles.md`](../foundation/principles.md) — gates `no-pii-in-personas`, `masked-contact`, `profile-is-master-personas-are-lenses`, `unified-entity-model-for-people-and-orgs`, `trust-through-endorsements-not-reviews`, `every-public-surface-has-a-claim-path`

**Archive:**
- [`../foundation/_archive/legacy-2026-02-24/12-persona-layout.md`](../foundation/_archive/legacy-2026-02-24/12-persona-layout.md) — 980 lines on persona layout + theming. Likely overlaps with current `05-layout-and-theming.md`; PRD session needs to dedupe.
- Sections of [`../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md`](../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md) covering persona editing, profile editing, and public page layout.

**Other docs:**
- [`../patterns/profile-page-design.md`](../patterns/profile-page-design.md) — UX pattern doc for public profile page
- [`../patterns/apple-music-ux.md`](../patterns/apple-music-ux.md) — UX inspiration (Apple Music as a layout reference)
- [`../patterns/consumer-ux.md`](../patterns/consumer-ux.md) — general consumer UX patterns
- [`../research/attribute_naming_patterns.md`](../research/attribute_naming_patterns.md) — trait naming conventions
- [`../research/taxonomy_curation_guide.md`](../research/taxonomy_curation_guide.md) — trait taxonomy research

### Features — built (11)

1. User account creation via Clerk
2. Master trait pool editing (`user_traits` + `trait_metadata`)
3. Persona creation (new/edit/delete)
4. Persona visibility settings (public, authenticated, community, private)
5. Persona layout presets (Professional, Personal, Community, Service, Creative)
6. Persona embedding generation (pgvector)
7. Completeness scoring
8. Public persona page (`/p/[uri]`)
9. Shadow persona creation
10. Shadow persona claim flow (`/claim/[token]`)
11. Endorsement writing

### Features — planned (6)

1. Contact request mediation (partial — needs `ContactChannelAdapter` abstraction)
2. Cross-persona linking (opt-in, community-scoped)
3. Profile import from LinkedIn + URL scraping (infrastructure exists in `lib/import/`, needs UI + PRD alignment)
4. Per-trait visibility overrides
5. MCP exposure settings (per-persona control over what external agents see)
6. Endorsement transfer on shadow claim (existing in schema, needs end-to-end test)

### Open questions for PRD session

1. **Granularity of "Personas."** Is this one PRD or does it split into Personas (identity) + Trust (endorsements, shadow claim, contact) at the Feature Spec level? The rubric says one area, but the PRD may have 2-3 workflow clusters inside it.
2. **`PersonaCreateDialog` vs. page** — current code uses `/personas/new/page.tsx` (full page), not a dialog. Align naming across docs.
3. **Contact channels** — `ContactChannelAdapter` is in principles but no adapter is built. What's the first shipping adapter (in-app? email relay? both)?
4. **Profile import PRD inclusion** — is this in scope of the Personas PRD or a separate sub-PRD? (My recommendation: in scope, as a single feature spec.)
5. **Commerce traits** — the original `data-model.md` §Commerce Traits section is archived at `foundation/_archive/data-model.2026-04-12.md`. When Commerce activates, port its design into `docs/specs/commerce/schema-spec.md`. Does the Personas PRD explicitly exclude commerce traits, or include the storage side and defer the UX to Commerce?

---

## Area 2 — Communities

### Scope (Rule 1)

Communities delivers "users can belong to, discover, manage, and moderate group-scoped presences — clubs, guilds, workplaces, neighborhoods — with each community adding context-layer fields on top of member personas."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Tables | `communities.ts`, `community_types.ts` (seed), `community_members.ts` (in communities file), `guilds.ts` (5 sub-tables: `guild_skill_categories`, `guild_membership_tiers`, `guild_offerings`, `guild_offering_members`, `guild_requests`) |
| Service layer | `apps/web/app/actions/communities.ts` |
| Routes | `apps/web/app/(dashboard)/communities/` + public routes `app/s/[uri]` |
| UI components | Community browse, community detail, member directory, community settings |
| Utilities | Community-scoped discovery, member trait schema validation |

### Status

`partial` — PRD exists at [`communities/00-prd.md`](communities/00-prd.md) (~510 lines, substantially more detailed than the personas PRD). 12 feature specs drafted (01–12). Guild schema and some community CRUD is built.

### Target path

`docs/specs/communities/` — **stays as-is**. Guilds become a **sub-PRD** at `docs/specs/communities/guilds-prd.md`, decomposed into feature specs under the communities suite.

### Seed material

**Existing specs (keep and refresh):**
- [`communities/00-prd.md`](communities/00-prd.md)
- [`communities/01-community-lifecycle.md`](communities/01-community-lifecycle.md) through [`communities/12-community-relationships.md`](communities/12-community-relationships.md)

**Foundation topic files:**
- [`../foundation/vision.md`](../foundation/vision.md) — Use cases 4 (Bay Area Pet Hospital org + BAPH Team community), 5 (Rotary chapter structure)
- [`communities/schema-spec.md`](communities/schema-spec.md) — full field-level logical schema for Communities, CommunityTypes, CommunityMembers, and all 5 Guild sub-entities
- [`../foundation/principles.md`](../foundation/principles.md) — gates `communities-own-schema-individuals-own-data` (vision principle 12), `verification-is-explicit`

**Archive:**
- **[`../foundation/_archive/legacy-2026-02-24/08-guilds.md`](../foundation/_archive/legacy-2026-02-24/08-guilds.md)** — 1,100 lines of guild mechanics. **This is the primary seed for the guild sub-PRD.** Needs full PRD authoring session via `/plan-prd guilds`.
- Sections of [`../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md`](../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md) covering community creation flows, directory views, moderation surfaces.

**Other docs:**
- [`../business-model/02_packaging_and_pricing.md`](../business-model/02_packaging_and_pricing.md) §Community Organizer — the CO tier ($99/yr) targets this area

### Features — built (9)

1. Community table + community_types seed data
2. Nine community types (club, organization, friends, guild, workplace, customer, neighborhood, event, educational)
3. Community CRUD (create, edit, delete)
4. Community member join flow
5. Community member trait schema (per-community context fields)
6. Community public page (`/s/[uri]`)
7. Community browse view (user's communities)
8. Guild table structure (5 sub-tables)
9. Community relationships (parent/child org structure)

### Features — planned (8)

1. **Guilds sub-PRD** covering skill taxonomy, membership tiers, request routing, offerings, offering members (`guilds-prd.md` to be authored from the archived `08-guilds.md`)
2. Community member directory views
3. Community moderation tools
4. Community notifications
5. Community activity & analytics surfaces
6. Community notices (posts within a community)
7. Community invitations system
8. Community closure / archival flow

### Open questions for PRD session

1. **Guilds as sub-PRD vs. nested workflow.** The archived `08-guilds.md` is 1,100 lines with its own taxonomy, tiers, routing, offerings. Should it be a distinct `guilds-prd.md` in the communities suite, or should it be a §Guilds section of the main communities PRD with guild-specific feature specs? My recommendation: **separate `guilds-prd.md`** because of size and distinct mechanics.
2. **Community Coach agent** — referenced in CLAUDE.md but not implemented and not in `lib/mastra/agents/`. Is this a Coach-area concern or a Communities-area concern? Owner: the Coaches PRD session should decide whether Community Coach is a named agent in its area.
3. **Notifications** — cross-cutting by Rule 3, but communities generate a lot of them. The PRD must declare which notifications fire without owning the notification infrastructure.
4. **AT Protocol outbound sync for public communities** — do public communities sync to AT Protocol like public personas do? Not currently implemented. Integrations PRD should cover the mechanism; this PRD should just declare the requirement.

---

## Area 3 — Discovery

### Scope (Rule 1)

Discovery delivers "AI agents, humans in the app, and external MCP clients can find trust-backed matches to capability-based queries about people and organizations, via semantic search over personas, shadow personas, and communities."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Tables | `personas.embedding`, `communities.embedding`, `shadow_personas.embedding` (all pgvector columns) + `query_logs` (on `integrations.ts`) |
| Service layer | `apps/web/lib/mcp/tools.ts`, `apps/web/app/actions/explore.ts`, `apps/web/app/actions/mcp.ts`, `apps/web/lib/embeddings/` |
| Routes | `apps/web/app/(dashboard)/explore/`, `recommend/` + `app/api/mcp/route.ts` (external MCP endpoint) |
| UI components | Explore view, recommend view, query result cards, match detail drawer |
| Agent | `apps/web/lib/mastra/agents/recommender-and-discovery.ts` — `discoveryAgent` (specialist archetype) |

### Status

`candidate` — **no dedicated PRD exists**. Coverage is scattered across the Personas spec suite (public pages, MCP exposure), the MCP endpoint code in `apps/web/app/api/mcp/route.ts`, the Discovery Agent in `lib/mastra/agents/`, and the foundation doc `api-surface.md` §MCP Tools. This area needs full PRD authoring via `/plan-prd discovery`.

### Target path

`docs/specs/discovery/` — **new suite**.

### Seed material

**Existing specs:**
- None yet — this is the gap.

**Foundation topic files:**
- [`../foundation/vision.md`](../foundation/vision.md) — Use case 6 (Sam + Claude ambient discovery) is the canonical discovery scenario
- [`../foundation/api-surface.md`](../foundation/api-surface.md) — §MCP Tools, §GraphQL Schema, §REST Endpoints
- [`../foundation/agents.md`](../foundation/agents.md) — Discovery Agent design
- [`../foundation/architecture.md`](../foundation/architecture.md) §API Surface, §External Dependencies
- [`../foundation/principles.md`](../foundation/principles.md) — gates `ai-native-discoverability`, `sensitive-resource-returns-404`, `latency-p95-500-1000`
- [`../foundation/metrics.md`](../foundation/metrics.md) — North Star is "trust-backed matches delivered per week," which is owned by this area

**Archive:**
- Sections of [`../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md`](../foundation/_archive/legacy-2026-02-24/06-visual-interfaces.md) covering the explore/recommend surfaces

**Other docs:**
- [`../research/digital_identity_landscape.md`](../research/digital_identity_landscape.md) — research on identity discovery models
- [`../business-model/05_competitive_landscape.md`](../business-model/05_competitive_landscape.md) §Why This Position Is Defensible — "MCP-Native Advantage" is a Discovery-area claim

### Features — built (4)

1. pgvector embeddings on personas, communities, shadow personas
2. Discovery Agent (Mastra) — `discoveryAgent` in `recommender-and-discovery.ts:184`
3. MCP endpoint scaffold at `apps/web/app/api/mcp/route.ts`
4. Internal discovery surfaces (`/explore`, `/recommend`)

### Features — planned (6)

1. **MCP endpoint authentication** (blocks external agent production launch — flagged in `architecture.md` §Open Architectural Questions)
2. **Trust-backed match scoring** (the North Star metric) — endorsement-path weighting in search results
3. **Ambient discovery via MCP** — the full Sam+Claude use case from `vision.md`
4. **Query logs + analytics** (`query_logs` table exists, no surface)
5. **Contact-request-from-match flow** — the "mediated introduction" step of the core loop
6. **Cross-community match filtering** (user's endorsees' communities as a ranking signal)

### Open questions for PRD session

1. **Relationship to Trust Graph.** The North Star metric "trust-backed match" requires an endorsement path from querier to candidate. Is the endorsement graph query logic owned by Personas (because endorsements live there) or Discovery (because it's a discovery concern)? My recommendation: **owned by Discovery**, with the graph traversal logic in `lib/discovery/` consuming data from the Personas service layer.
2. **MCP auth scheme.** API token? OAuth? Per-user delegation? This is the biggest open architectural decision in the area.
3. **Internal vs. external discovery.** The app has `/explore` (internal UI) and `/api/mcp` (external). These are the same service-layer API with different surfaces, but the feature specs may need to scope them separately.
4. **Cost attribution.** Discovery queries hit LLMs. Per-user / per-query cost attribution infrastructure doesn't exist yet. Does Discovery own this, or is it a cross-cutting AI concern?
5. **Recommender vs. Discovery.** The `recommenderCoachAgent` and `discoveryAgent` are both in the same file. Are they one feature or two? My read: Recommender is a Coaches-area feature (conversational "who would you recommend?") that produces candidate data; Discovery is the ranking + serving layer. Same file, different areas.

---

## Area 4 — AI Coaches

### Scope (Rule 1)

AI Coaches delivers "conversational agents that guide users through progressive revelation — from first sign-up to active community leadership — by providing personalized suggestions, trait enrichment prompts, and generosity nudges in context."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Tables | `coach_sessions.ts` |
| Service layer | `apps/web/lib/mastra/` (agents + tools), `apps/web/app/actions/agents.ts`, `apps/web/app/actions/coach.ts` |
| Routes | `apps/web/app/(dashboard)/coach/` |
| UI components | `apps/web/components/coach-chat.tsx` |
| Agents | `persona-coach.ts`, `recommender-and-discovery.ts` (`recommenderCoachAgent`) |

### Status

`candidate` — **no dedicated PRD exists**. Coach-related content is scattered: "Progressive Onboarding" section in `vision.md`, agent architecture in `agents.md`, coach flow design in the archived `04-agent-architecture.md` (now renamed), coach session schema. This area needs full PRD authoring via `/plan-prd coaches`.

### Target path

`docs/specs/coaches/` — **new suite**.

### Seed material

**Existing specs:**
- None dedicated. Touches `identity-and-personas/01-persona-lifecycle.md` (coach-guided persona creation) and `identity-and-personas/02-profile.md` (coach trait enrichment).

**Foundation topic files:**
- [`../foundation/vision.md`](../foundation/vision.md) §Progressive Onboarding — 4-phase lifecycle is the core scope
- [`../foundation/agents.md`](../foundation/agents.md) — the complete agent architecture (~1,600 lines, this is the primary seed)
- [`../foundation/architecture.md`](../foundation/architecture.md) §Components (Mastra agents)
- [`../foundation/principles.md`](../foundation/principles.md) — gate `ai-cost-and-loop-caps` is critical for this area
- [`../foundation/metrics.md`](../foundation/metrics.md) §Counter-Metrics — LLM cost per active user, agent loop iterations, agent run cost all gate this area

**Archive:**
- Live `docs/foundation/agents.md` (trimmed to ~170 lines on 2026-04-14) — architectural overview of the 3 live agents, cost caps, phase model, cross-agent patterns
- `docs/foundation/_archive/agents.2026-04-12.md` (pre-trim, 1,633 lines) — the pre-ABL Coach conversational flow designs, Community Coach / Commerce Coach full designs. Primary seed for a future Coaches PRD.

**Other docs:**
- [`../business-model/04_growth_model_and_economics.md`](../business-model/04_growth_model_and_economics.md) §Cost Structure — coach LLM costs are the largest variable cost per user

### Features — built (3)

1. Persona Coach agent (`personaCoachAgent`, `lib/mastra/agents/persona-coach.ts:286`)
2. Recommender Coach agent (`recommenderCoachAgent`, `lib/mastra/agents/recommender-and-discovery.ts:118`)
3. Coach chat UI surface (`/coach`, `components/coach-chat.tsx`)

### Features — planned (5)

1. **Community Coach agent** — referenced in CLAUDE.md, not built. Needs design decision: is it a separate Mastra agent or a mode of an existing agent?
2. **Progressive onboarding phase awareness** — coach suggestions vary by derived phase (see `vision.md` Phase Awareness section). Not explicitly implemented.
3. **Cost attribution + killswitch UI** — per-user LLM cost visibility, hard caps per `ai.cost_caps`
4. **Eval surfaces** — coach response quality evaluation, blocked by "no eval framework chosen" decision in `architecture.md`
5. **Sparks-aware coaching** (when Sparks ships) — coaches prompt users toward generosity actions and reward them via Sparks

### Open questions for PRD session

1. **Agent count.** Is "Coaches" one bundle with 3-4 agents, or multiple areas (one per agent)? My recommendation: one area with multiple named agents. Coaches share the same service layer, the same LLM runtime, the same cost envelope, and the same progressive-revelation mission.
2. **Recommender boundary with Discovery.** The `recommenderCoachAgent` calls discovery tools and produces conversational output. Is it a Coaches feature (conversational UX) or a Discovery feature (producing matches)? My read: Coaches owns the *conversation*, Discovery owns the *matching*. The PRD must be explicit.
3. **Community Coach vs. Moderator** — the CLAUDE.md reference is ambiguous between "helps users navigate communities" (user-facing) and "helps community organizers run their community" (operator-facing). Pick one.
4. **Eval framework choice** — blocked by an open architectural decision. The PRD should state "when eval framework is selected, this PRD will be updated to include eval coverage."
5. **Cost caps enforcement UX** — when a user hits their daily cap, what does the coach chat say? Graceful degradation? Hard stop? Upgrade prompt? This is one of the first places product principles collide with commercial tiers.

---

## Area 5 — Integrations

### Scope (Rule 1)

Integrations delivers "Personus reaches users where they already are — via communication platforms (Slack, Discord, WhatsApp, Signal, Telegram, Matrix), social protocols (ActivityPub, AT Protocol), and web presence (custom domains, embed widgets) — surfacing personas, discovery, and endorsement flows on external surfaces."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Tables | `integrations.ts` (`integrations` + `query_logs`) |
| Service layer | None yet (no platform adapters implemented) |
| Routes | None yet |
| External services | Would need: Slack SDK, Discord SDK, Matrix client, WhatsApp Business API, Signal Messenger, Telegram Bot API, AT Protocol libraries |

### Status

`partial` — overview exists at [`integrations/00-overview.md`](integrations/00-overview.md) (~830 lines, substantially the most detailed spec overview in the suite). Per-platform specs drafted (WhatsApp, Signal, Telegram, Discord, Slack, ActivityPub, Matrix). **Zero integration code in the repo.** This is a well-designed future area.

### Target path

`docs/specs/integrations/` — **stays**. The `00-overview.md` should be renamed or re-marked as `00-prd.md` to conform to the suite convention.

### Seed material

**Existing specs (keep and refresh, rename overview → prd):**
- [`integrations/00-overview.md`](integrations/00-overview.md) → rename to `00-prd.md`
- [`integrations/01-shared-architecture.md`](integrations/01-shared-architecture.md) — shared bot infrastructure
- [`integrations/02-matrix.md`](integrations/02-matrix.md) through [`integrations/10-activity-tracking.md`](integrations/10-activity-tracking.md)

**Foundation topic files:**
- [`../foundation/at-protocol.md`](../foundation/at-protocol.md) — AT Protocol integration design (~130 lines after 2026-04-14 merge). Full pre-trim design at `foundation/_archive/at-protocol.2026-04-12.md`. Ecosystem survey content moved to `docs/research/at_protocol_integration.md`.
- [`../foundation/vision.md`](../foundation/vision.md) — Use case 8 (Kai's open-social-web integration)
- [`../foundation/principles.md`](../foundation/principles.md) — gate `personal-agency-not-platform-lockin` is critical here

**Research:**
- [`../research/at_protocol_integration.md`](../research/at_protocol_integration.md)
- [`../research/matrix_protocol_integration.md`](../research/matrix_protocol_integration.md)
- [`../research/telegram_integration.md`](../research/telegram_integration.md)
- [`../research/whatsapp_integration.md`](../research/whatsapp_integration.md)
- [`../research/whatsapp_integration_summary.md`](../research/whatsapp_integration_summary.md)

### Features — built (0)

None. The `integrations` table exists as a scaffold for future integration records.

### Features — planned (10+)

1. Shared bot architecture (one per platform)
2. Slack integration
3. Discord integration
4. Matrix integration
5. WhatsApp Business API integration
6. Signal Messenger integration
7. Telegram Bot integration
8. ActivityPub outbound sync
9. AT Protocol outbound sync (public personas + endorsements)
10. Activity tracking (query_logs from external platforms)

### Open questions for PRD session

1. **Scope and sequencing.** 10 platforms is a lot. The PRD must pick a launch wedge — probably ActivityPub + AT Protocol first (lowest-cost, highest-leverage for the open-social-web use case), then one chat platform (Discord or Slack, whichever has the strongest CO demand).
2. **Bot shared architecture** — is there really shared code across all platforms (intended: yes, per `01-shared-architecture.md`), or does each platform need a distinct adapter?
3. **External discovery (MCP queries from chat platforms)** — is this an Integrations feature or a Discovery feature? My read: Discovery owns the query semantics, Integrations owns the transport. PRD must draw this line.
4. **AT Protocol vs. ActivityPub** — overlapping but not identical. Both? One? PRD decides.
5. **Commerce (ACP) integration** — `docs/research/agentic_commerce_integration.md` exists. Is ACP an Integration or part of the Commerce area? My recommendation: **Commerce area** owns ACP because ACP is about the consent model, not the transport. Integrations area owns the transport layer.

---

## Area 6 — Commerce (dormant)

### Scope (Rule 1)

Commerce delivers "users can control what their AI agents disclose during transactions via commerce personas with per-category consent, aligned with the Agentic Commerce Protocol (ACP) and privacy-preserving payment scoping."

### Architectural footprint (Rule 2)

Currently minimal.

| Element | Location |
|---|---|
| Tables | Commerce traits design at `foundation/_archive/data-model.2026-04-12.md` §Commerce Traits — designed but not implemented; will migrate to `commerce/schema-spec.md` on activation |
| Service layer | None |
| Routes | None |
| External | ACP vendor integrations (future) |

### Status

**`dormant`** — fully designed in vision (use case 7, Dana), data-model (commerce traits), and business model (ACP market positioning). **Zero code.** Not on the active roadmap. Gets a **stub PRD** so the area is visible in the cascade; full PRD authoring waits until activation.

### Target path

`docs/specs/commerce/` — **new suite, stub only**. Create `00-prd.md` as a stub with scope, seed material, and "requires activation" note.

### Seed material

**Foundation topic files:**
- [`../foundation/vision.md`](../foundation/vision.md) — Use case 7 (Dana commerce persona)
- `foundation/_archive/data-model.2026-04-12.md` §Commerce Traits (archived; port to `commerce/schema-spec.md` on activation)
- [`../foundation/principles.md`](../foundation/principles.md) — gate `consent-by-default` (commerce-specific application)
- Vision principle 18 (commerce personas control agent behavior) — currently in the vision principles list, not yet a gate

**Business model:**
- [`../business-model/05_competitive_landscape.md`](../business-model/05_competitive_landscape.md) §Agentic Commerce Protocols — market context
- [`../business-model/01_executive_summary.md`](../business-model/01_executive_summary.md) — ACP market positioning

**Research:**
- [`../research/agentic_commerce_integration.md`](../research/agentic_commerce_integration.md) — full ACP integration research

### Features — planned (4)

1. Commerce persona creation + edit (specialized persona type)
2. Per-category consent UI (discovery, contact, data sharing, communication × transaction categories)
3. ACP handshake implementation (scoped payment tokens, shipping address release gating)
4. Commerce trait storage + retrieval

### Open questions for PRD session (deferred)

Will be resolved when Commerce activates:
1. First ACP vendor partner.
2. Payment processor integration (Stripe? Paddle? Custom?).
3. Shipping address release trigger (at purchase confirmation? post-authorization?).
4. Commerce persona discoverability (opt-in, opt-out, never?).
5. Integration with base Personas area — is a commerce persona a separate entity or a persona with a `personaType: commerce` flag?

---

## Area 7 — Sparks (Generosity Engine) (dormant)

### Scope (Rule 1)

Sparks delivers "a credit system that rewards the generous behaviors that grow the trust network — endorsing, recommending non-users, responding to introductions, welcoming newcomers — making generosity visible, recognized, and rewarded without ever being purchasable with money."

### Architectural footprint (Rule 2)

None yet.

| Element | Location |
|---|---|
| Tables | None — would need `sparks_ledger`, `spark_multipliers`, `spark_awards`, etc. |
| Service layer | None |
| Routes | None — would need a Sparks dashboard view |
| UI components | None — would need badges, earn/spend displays, leaderboards |

### Status

**`dormant`** — fully designed in [`../business-model/03_sparks_generosity_engine.md`](../business-model/03_sparks_generosity_engine.md) (~250 lines, complete design). Zero code. Not on the active roadmap. Gets a **stub PRD**.

### Target path

`docs/specs/sparks/` — **new suite, stub only**.

### Seed material

**Primary:**
- [`../business-model/03_sparks_generosity_engine.md`](../business-model/03_sparks_generosity_engine.md) — complete design (earn mechanics, spend mechanics, anti-gaming, UX integration, economy calibration)

**Supporting:**
- [`../business-model/02_packaging_and_pricing.md`](../business-model/02_packaging_and_pricing.md) §Spark Multipliers by Tier — Sparks interact with pricing tiers
- [`../foundation/principles.md`](../foundation/principles.md) — gate `every-public-surface-has-a-claim-path` intersects with Sparks (claiming triggers Spark awards for the claimer's endorsers)
- [`../foundation/metrics.md`](../foundation/metrics.md) §Counter-Metrics — "endorsement spam / gaming rate" counter-metric is the Sparks anti-gaming concern

### Features — planned (6)

1. Sparks ledger table + award trigger hooks (every endorsement, every shadow creation, every introduction response, every newcomer welcome)
2. Spark multiplier calculation (tier-based)
3. Spark spend flow (unlock temporary premium features, visible badges, community boosts)
4. Anti-gaming system (cooldowns, quality checks, diminishing returns)
5. Sparks dashboard UI
6. Coach integration (coaches prompt generosity actions and surface Spark rewards)

### Open questions for PRD session (deferred)

Will be resolved when Sparks activates:
1. Activation timeline — pre-launch or post-launch?
2. Does Sparks launch with the free tier only, or does it touch all pricing tiers from day 1?
3. Anti-gaming calibration — how aggressive?
4. Are Sparks a persistent balance or time-decaying?
5. Cross-community Sparks — same balance everywhere, or scoped per community?

---

## Area 8 — Platform Operations

### Scope (Rule 1)

Platform Ops delivers "internal operators (admins, support, platform engineering) can manage the taxonomy, trait metadata, system settings, user accounts, and community operations that the product depends on — an operator-facing surface that every user-facing area consumes via seed data or configuration."

### Architectural footprint (Rule 2)

| Element | Location |
|---|---|
| Routes | `apps/admin/app/` — scaffold only, single page |
| Tables | None dedicated — operates on user-facing tables (`trait_metadata`, `trait_taxonomies`, `community_types`, `users`, `communities`) |
| Service layer | None yet |
| Actor | Admin (not User — see `.claude/actors-and-contexts.md`) |

### Status

`partial` — PRD exists at [`platform-ops/00-prd.md`](platform-ops/00-prd.md) (~200 lines). 5 feature specs drafted (monorepo migration, taxonomy admin, trait metadata admin, system settings, user and community ops). **`apps/admin/` is a scaffold only** — no admin surfaces built.

### Target path

`docs/specs/platform-ops/` — **stays**.

### Seed material

**Existing specs:**
- [`platform-ops/00-prd.md`](platform-ops/00-prd.md)
- [`platform-ops/01-monorepo-migration.md`](platform-ops/01-monorepo-migration.md)
- [`platform-ops/02-taxonomy-admin.md`](platform-ops/02-taxonomy-admin.md)
- [`platform-ops/03-trait-metadata-admin.md`](platform-ops/03-trait-metadata-admin.md)
- [`platform-ops/04-system-settings.md`](platform-ops/04-system-settings.md)
- [`platform-ops/05-user-and-community-ops.md`](platform-ops/05-user-and-community-ops.md)

**Foundation topic files:**
- [`../foundation/architecture.md`](../foundation/architecture.md) §Admin control plane
- [`../foundation/authorization.md`](../foundation/authorization.md) — Admin actor's authz model

**Other:**
- None directly — Platform Ops is mostly self-contained.

### Features — built (0)

The `apps/admin/` scaffold exists. No admin UI is actually implemented beyond the scaffold.

### Features — planned (5)

1. Trait taxonomy admin (curation, deprecation, merging)
2. Trait metadata admin (display configs, edit configs, validation rules)
3. System settings (feature flags, toggles, cost caps, etc.)
4. User operations (ban, impersonate with audit, delete account, export data)
5. Community operations (verification, closure, reassignment)

### Open questions for PRD session

1. **Admin authz tier.** Is there one admin role or multiple (Admin, Superadmin, Support)? My recommendation: **one role for now** (Admin), split later if user ops require a distinct Support tier.
2. **GDPR/CCPA operator tools** — does Platform Ops own data subject request fulfillment (export, deletion) or does that live in Personas? My recommendation: **Platform Ops owns the operator surface**, Personas owns the user-facing export. Same underlying query, two UIs.
3. **Audit log search** — operator surface for searching `activity_events` across all users. Must be gated by the `sensitive-resource-returns-404` and authz principles. Explicit design required.
4. **Sparks admin** (when Sparks ships) — calibration, anti-gaming dashboards, balance adjustments. Does Platform Ops own this or does Sparks?
5. **Cost caps admin** — per-user / per-tenant cost visibility and override. Is this Platform Ops, or does each area own its own cost surface?

---

## Migration Plan

Concrete next steps to get from this inventory to a populated PRD cascade:

### Immediate (this session, after this file lands)

1. **Directory reshuffling** — rename `identity-and-personas/` → `personas/`, create empty `discovery/`, `coaches/`, `commerce/`, `sparks/` directories. Rename `integrations/00-overview.md` → `integrations/00-prd.md`.
2. **Stub PRDs for dormant areas** — `commerce/00-prd.md` and `sparks/00-prd.md` as stub files pointing at their seed material.
3. **Move the archived `08-guilds.md`** into `communities/guilds-prd.md` placeholder location, with a note that `/plan-prd guilds` needs to run against it.

### Near-term (next product-leader sessions, ~4-6 hours each)

4. **Phase B1 — `/plan-prd discovery`.** This is the highest-leverage PRD because Discovery owns the North Star metric and the area has zero existing PRD. Uses `vision.md` Use Case 6 + `api-surface.md` + `agents.md` as seed.
5. **Phase B2 — `/plan-prd coaches`.** Second-highest leverage because it governs the biggest variable cost driver (LLM spend). Uses `vision.md` §Progressive Onboarding + `agents.md` + `metrics.md` counter-metrics as seed.
6. **Phase B3 — Personas PRD refresh.** Existing PRD at `personas/00-prd.md` is ~180 lines and pre-dates the ABL cascade. Refresh against the ABL PRD template, add Trade-offs + Anti-scope + Outcomes with falsifiable metrics.
7. **Phase B4 — Communities PRD refresh + `/plan-prd guilds` sub-PRD.** Existing Communities PRD is substantial (~510 lines) and closer to ABL shape; lighter refresh. Guild sub-PRD is the main work.
8. **Phase B5 — Integrations PRD refresh.** Existing overview is ~830 lines with strong content; mostly renaming and reshaping into the canonical template.
9. **Phase B6 — Platform Ops PRD refresh.** Existing PRD is ~200 lines; refresh lightly.

### Long-term (when areas activate)

10. **Commerce PRD authoring** — when ACP vendor partnership is identified or commerce persona work is prioritized.
11. **Sparks PRD authoring** — when Sparks is prioritized (probably post-PMF).

### Ongoing

12. **Feature spec authoring** via `/plan-spec <feature>` as features are picked up. Each Feature Spec cites its parent PRD from this inventory.

---

## Cross-references

- Decomposition rubric: [`_decomposition.md`](_decomposition.md)
- Vision: [`../foundation/vision.md`](../foundation/vision.md)
- Principles (gates): [`../foundation/principles.md`](../foundation/principles.md)
- Architecture: [`../foundation/architecture.md`](../foundation/architecture.md)
- Metrics (feeds area outcomes): [`../foundation/metrics.md`](../foundation/metrics.md)
- ABL PRD template: [`../../.claude/skills/abl/plan-prd/prd-template.md`](../../.claude/skills/abl/plan-prd/prd-template.md)
- Actors & contexts registry: [`../../.claude/actors-and-contexts.md`](../../.claude/actors-and-contexts.md)

_Authored 2026-04-13 by `/plan-foundation` applying the 5-rule decomposition discipline to Personus.ai's current state. Target count 6-8; achieved 8. This file is input to the PRD cascade and should be refreshed when new areas emerge or dormant areas activate._
