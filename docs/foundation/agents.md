---
type: foundation
title: Agents — System Overview
description: "All agents run in-process inside apps/web via @mastra/core/agent. There is no separate agent service, no message queue, no agent runtime process. Agent invocations are function calls from Next.js…"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# Agents — System Overview

> 2026-04-14 · Architectural overview of the Mastra agents that live in-process inside the Next.js app. The actual agent instructions, tools, and schemas are in `apps/web/lib/mastra/` — **the code is truth**.
>
> **Scope of this file:** the 3 live agents, the cost-cap enforcement pattern, progressive onboarding phase model, cross-agent handoff pattern, and dormant agent stubs. External-facing content that used to live here (MCP tool definitions, public web discovery, Slack/Discord bots) has been moved to its canonical homes — see the §Displacement note at the bottom.
>
> **Per-area agent specs** (when areas are authored): `docs/specs/coaches/` will own conversational flows, prompt design, and eval coverage. `docs/specs/discovery/` will own the discovery surface's agent consumption.

## Architectural decision — single codebase

All agents run **in-process inside `apps/web`** via `@mastra/core/agent`. There is no separate agent service, no message queue, no agent runtime process. Agent invocations are function calls from Next.js server actions (`app/actions/agents.ts`, `coach.ts`) that happen to call an LLM.

**Why single-codebase:**
- Zero deployment complexity (one Next.js app, one Vercel project)
- Direct database access via the shared service layer, no RPC
- Shared types, validations, and authorization — agents use the same CASL abilities humans do
- Fast iteration — agent instructions are TypeScript string literals that hot-reload

**Constraints this imposes:**
- Long-running agent loops cannot block request handlers — they must stream or defer
- Cost caps are enforced at the per-request level via the Mastra runtime (see §Cost caps below)
- All agent-accessible data has to go through the service layer's principal-parameter authorization

See `apps/web/lib/mastra/index.ts` for the Mastra instance configuration.

## The 3 live agents

All three use `model: 'openai/gpt-4o'`. When the project adds an eval framework (see `architecture.md` §Open Architectural Questions), these agents get eval coverage and model choice becomes configurable.

### PersonaCoachAgent

**File:** `apps/web/lib/mastra/agents/persona-coach.ts:286`
**Archetype:** `assistant`
**Purpose:** Guides users through creating a rich persona portrait through natural, warm conversation. Extracts structured trait data from free-form conversation.

**Tools provided:**
- `updatePersonaField` — write a trait value into `personas.traits`
- `checkPII` — run PII detection on a candidate trait value before writing (enforces `no-pii-in-personas` gate)
- `getCompleteness` — read the 9-dimension completeness score to drive next-prompt suggestions
- `lookupSuggestions` — read `trait_taxonomies` for suggested values

**Consumer surface:** `CoachChatView` (`/coach` route, `components/coach-chat.tsx`)

**Owned by:** Coaches area (PRD pending). Full conversational flow design, eval coverage, and prompt versioning will live in `docs/specs/coaches/` when that PRD is authored.

### RecommenderCoachAgent

**File:** `apps/web/lib/mastra/agents/recommender-and-discovery.ts:118`
**Archetype:** `specialist`
**Purpose:** Helps users endorse people they trust using "tell a friend" framing. Creates shadow personas for non-users and turns casual recommendations into structured endorsements.

**Tools provided:**
- `createShadowPersona` — create a shadow persona from an endorsement (community-scoped)
- `createEndorsement` — write an endorsement record targeting either a live or shadow persona

**Consumer surface:** Same coach chat view as Persona Coach, invoked in a different mode.

**Owned by:** Coaches area.

### DiscoveryAgent

**File:** `apps/web/lib/mastra/agents/recommender-and-discovery.ts:184`
**Archetype:** `specialist`
**Purpose:** Helps users find people in their trust networks through natural conversation. Powers semantic search via pgvector and returns trust-backed matches.

**Tools provided:**
- `personaSearch` — pgvector cosine similarity over `personas.embedding` with trust-path filtering
- `requestIntroduction` — create a `contact_request` row routed through the contact channel adapter
- `getPersona` — load a full persona for display
- `listCommunities` — list communities matching a query

**Consumer surfaces:** internal `ExploreView`/`RecommendView` (dashboard routes) AND external MCP clients via `apps/web/app/api/mcp/route.ts`.

**Owned by:** Discovery area (PRD pending). The MCP tool definitions exposed externally are documented in [`api-surface.md`](/foundation/api-surface.md) §MCP Tools — this file does not duplicate them.

## Cost caps — runtime enforcement pattern

Every agent invocation respects the caps defined in CLAUDE.md `ai.cost_caps`:

- `per_request_usd: 0.50` — single LLM-driven request
- `per_user_daily_usd: 10.00` — per user per day across all LLM use
- `per_agent_run_usd: 5.00` — per agent loop invocation
- `per_tenant_monthly_usd: 1000.00` — tenant ceiling (not applicable for single-tenant Personus today, but wired for future)

**Enforcement points:**
1. **Pre-flight check** — before a Mastra agent is invoked, the service layer checks the user's running daily total against `per_user_daily_usd`. If exceeded, the agent returns a graceful degradation response instead of making an LLM call.
2. **Per-request estimate** — Mastra's token accounting estimates the cost of a single turn; if it would exceed `per_request_usd`, the request is truncated or rejected.
3. **Per-agent-run cap** — an agent loop with tool calls is bounded by cumulative cost. The default `maxSteps` on each agent is set so that worst-case cost stays under `per_agent_run_usd`.
4. **Killswitch** — a server-level flag can halt all agent invocations globally. When tripped, every agent call returns a standard "agents are temporarily unavailable" message without reaching the LLM.

**What this file does not own:** the specific cost telemetry and dashboards. Those live in the Coaches area (when authored) and `metrics.md` §Counter-metrics.

**Gate reference:** `ai-cost-and-loop-caps` in [`principles.md`](/foundation/principles.md).

## Progressive onboarding — the phase model

Coaches tailor their suggestions based on the user's current onboarding phase. **Phase is derived, not stored** — it's a function of user state computed at session time:

```
phase = derive(
  hasPersonas:              boolean,
  endorsementCount:         number,
  communityMembershipCount: number,
  isCommunityAdmin:         boolean
)
```

The 4 phases and the coach behavior each triggers:

| Phase | Trigger | Coach goal |
|---|---|---|
| **1 — Be Found** | No personas yet | Persona Coach guides first persona creation; completeness meter drives enrichment |
| **2 — Build Trust** | Has persona, < 3 endorsements | Recommender Coach nudges "who would you recommend?"; celebrates received endorsements |
| **3 — Join & Discover** | Has endorsements | Explore page becomes prominent; coaches suggest relevant communities |
| **4 — Create & Lead** | Active in communities, strong endorsement network | "Create a community" becomes visible; Community Coach guides creation |

**Coaches never mention phase numbers to users.** They speak in specific next-action language — "you've been endorsing great designers, want to create a guild?" — not "you're in Phase 3."

Full narrative in [`vision.md`](/foundation/vision.md) §Progressive Onboarding. The activation funnel metric that measures movement through phases lives in [`metrics.md`](/foundation/metrics.md) §Activation funnel.

## Cross-agent patterns

### Handoff

When one agent recognizes a need that another agent is better suited for, it **suggests** the handoff in natural language rather than silently switching. Users always know which agent they're talking to.

Example (from the legacy design): while using the Persona Coach to build a persona, a user mentions "I should recommend my electrician." The Persona Coach does not silently switch to Recommender mode — it says "That sounds like something to capture with the Recommender Coach, want me to take you there?" and waits for confirmation.

### Cross-agent suggestions

Agents surface suggestions from other agents' tool outputs without leaving the current chat. Example: while in Recommender Coach creating an endorsement for a plumber, the agent may note that 3 other Personus users in the same neighborhood have also endorsed this plumber and suggest joining a local community where the plumber is a shadow persona.

### Community-aware tool scoping

When an agent is invoked inside a community context (e.g., a CX chat bar on a community page), its tools are scoped to that community. `personaSearch` limits to community members; `requestIntroduction` defaults to the community's mediated contact channel. The scoping is passed in as a Mastra context parameter, not hardcoded per-agent.

### Messaging-platform channels (Discord, Slack, Telegram)

Mastra 1.26 ships a `channels` primitive on the `Agent` constructor. We use it to expose existing Personus agents (likely `DiscoveryAgent` and a future `CommunityCoachAgent`) inside Discord, Slack, and Telegram. Webhooks are auto-generated at `/api/agents/{agentId}/channels/{platform}/webhook`. Channel message handlers resolve a Personus `Principal` (using the same `asAgent()` delegation contract as the MCP endpoint — see PER-6 / PER-17) before invoking tools, so visibility filtering and `networkDepth` apply identically to in-app, MCP, and channel-driven calls.

Design and sequencing live in [`../specs/integrations/03-bot-architecture.md`](/domains/platform-channels/03-bot-architecture.md). Tracked as PER-64 (Discord), PER-65 (Slack), PER-66 (Telegram stub).

## Dormant agents

### CommunityCoachAgent *(not built)*

Named in CLAUDE.md §Single-codebase AI and referenced extensively by the Communities PRD (WF-1, WF-3, WF-9). **Not implemented.** Open decision in the Communities PRD: is it a distinct Mastra agent or a mode of an existing agent? Until that decision lands, the Community CX chat surfaces fall back to the Discovery Agent with community-scoped tools.

**Intended purpose:** scoped to a single community. Powers the community CX chat (always-present chat bar on community pages). Answers "who knows X here?" queries, surfaces unmet needs from failed searches, prompts notice posting, suggests trait schema improvements to community organizers.

Design to be formalized in `docs/specs/coaches/` when the Coaches PRD is authored.

### CommerceCoachAgent *(dormant)*

Designed in the archived `agents.md` §Commerce Coach (see [`_archive/agents.2026-04-12.md`](/archive/legacy/foundation/_archive/agents.2026-04-12.md)) and referenced by the Commerce area's dormant PRD at [`../specs/commerce/00-prd.md`](/domains/commerce/00-prd.md). **Not implemented.** Waits for Commerce activation.

**Intended purpose:** helps users configure commerce personas and per-category disclosure rules. Mediates ACP checkout flows on behalf of the user's AI assistant, translating intent into scoped payment tokens with minimal PII disclosure.

## Displacement note

The pre-2026-04-14 version of this file (archived at [`_archive/agents.2026-04-12.md`](/archive/legacy/foundation/_archive/agents.2026-04-12.md)) contained ~1,630 lines covering public web discovery, MCP tool definitions, Slack/Discord bot architecture, admin dashboards, and cross-agent patterns. Most of that content was either **duplicated** with other canonical docs or **belonged in specs, not foundation**. The displacement was:

| Legacy section | Lines | New home |
|---|---|---|
| §Public Web Discovery (HTML, JSON-LD, SEO, sitemap, org pages) | ~378 | Already covered by [`../specs/personas/06-public-pages.md`](/domains/personas/06-public-pages.md) (1,255 lines) |
| §MCP Tools (access tiers, 5 tool definitions, response format, rate limiting) | ~545 | Already covered by [`api-surface.md`](/foundation/api-surface.md) §MCP Tools |
| §Workspace Integrations (Slack, Discord, admin dashboards) | ~433 | Already covered by [`../specs/integrations/08-slack.md`](/domains/platform-channels/08-slack.md), [`07-discord.md`](/domains/platform-channels/07-discord.md), [`01-shared-architecture.md`](/domains/platform-channels/01-shared-architecture.md) |
| §Community Coach (full conversational design) | ~82 | Compressed to the §Dormant agents section above. Full design moves to `docs/specs/coaches/` when authored. |
| §Commerce Coach | ~27 | Compressed to §Dormant agents. Full design moves to `docs/specs/commerce/` when activated. |
| §Cross-Agent Patterns | ~78 | Compressed to §Cross-agent patterns above |
| §Future: Ambient Discovery | ~49 | Deleted — speculative; the realized version is the Discovery agent's MCP surface |

**Nothing was lost.** The legacy file is preserved at [`_archive/agents.2026-04-12.md`](/archive/legacy/foundation/_archive/agents.2026-04-12.md) for reference.

## History

- **2026-02-24** — Original 1,633-line `04-agent-architecture.md` authored with full external-surface content
- **2026-04-12** — Renamed to `agents.md` during foundation reorganization
- **2026-04-14** — Trimmed to ~270 lines. Misnamed scope (external surfaces) moved to canonical homes; architectural agent content rewritten to describe the actual 3 live agents in `apps/web/lib/mastra/`.
