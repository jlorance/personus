---
type: foundation
title: API Surface — System Overview
description: "Personus exposes three API surfaces against a single service layer. All three route through the same packages/db/src/queries.ts functions, which enforce authorization via CASL abilities. A new…"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# API Surface — System Overview

> 2026-04-14 · Architectural decisions about external interfaces. Tool/endpoint implementation lives in code — **the code is truth**.
>
> **Where to find what:**
> - **Live MCP tools** (implementation): `apps/web/lib/mastra/tools.ts` (4 agent-facing tools) + `apps/web/app/api/mcp/route.ts` (external MCP endpoint)
> - **Live server actions** (UI-facing): `apps/web/app/actions/*.ts` — the primary RPC surface
> - **Aspirational GraphQL schema design** (pre-trim): archived at [`_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md) §GraphQL Schema — not implemented
> - **MCP access tier authorization**: [`authorization.md`](/foundation/authorization.md) §Actors (MCP client row)

## Three parallel surfaces

Personus exposes three API surfaces against a single service layer. All three route through the same `packages/db/src/queries.ts` functions, which enforce authorization via CASL abilities. A new feature that adds a service-layer function gets authz for free on every surface.

| Surface | Protocol | Primary consumer | Auth | Status |
|---|---|---|---|---|
| **Server actions** | Next.js server actions (RPC-over-HTTP) | Human UI in `apps/web` | Clerk session cookie | ✅ live — the primary surface |
| **MCP tools** | Model Context Protocol over HTTP | External AI agents | API token (future — currently unauthenticated dev surface) | ⚠️ live but unauthenticated; blocks external launch |
| **GraphQL** | GraphQL | Enterprise + developer integrations | API key (future) | ❌ designed only, not implemented |

The design rule: **every new service-layer function is surface-agnostic.** A `listCommunities(principal, filter)` function should work identically whether called from a server action, an MCP tool, or a future GraphQL resolver. This is what makes the "three parallel surfaces" story true rather than marketing.

## Server actions — the primary surface

Server actions are the workhorse. Every human-UI interaction flows through one. They live in `apps/web/app/actions/` organized by area:

| File | Area | Notable actions |
|---|---|---|
| `personas.ts` | Personas | `listPersonas`, `getPersona`, `getViewablePersona`, `createPersona`, `updatePersona`, `updatePersonaTraits`, `deletePersona`, `getCompletenessScore` |
| `shadows.ts` | Personas | `createShadowAction`, `claimShadowAction`, `getUnclaimedShadowsAction`, `getShadowByTokenPublic`, `submitPublicClaim` |
| `endorsements.ts` | Personas | (see code) |
| `contacts.ts` | Personas | (see code) |
| `profile.ts` | Personas | Master trait pool editing |
| `import.ts` | Personas | LinkedIn / URL profile import |
| `communities.ts` | Communities | `createCommunity`, `listCommunityTypes`, membership operations |
| `explore.ts` | Discovery | `loadMorePersonas` (pagination) |
| `mcp.ts` | Discovery | Internal MCP tool dispatch |
| `agents.ts` / `coach.ts` | Coaches | Mastra agent invocations |

**Pattern:** every server action takes an implicit `principal` via `getPrincipal()` at the top, then calls a service-layer function. Never derive `userId` from the request body. See [`authorization.md`](/foundation/authorization.md) §Principal pattern.

## MCP tools — the AI-agent surface

Mastra provides two distinct MCP surfaces:

### Internal agent tools (`apps/web/lib/mastra/tools.ts`)

Consumed by the 3 live Mastra agents. Not exposed externally. Current tool list:

- `personaSearchTool` — pgvector cosine similarity over `personas.embedding` with trust-path filtering
- `requestIntroductionTool` — create a `contact_request` row
- `getPersonaTool` — load a persona for display
- `listCommunitiesTool` — list communities matching a query

**Owned by:** Discovery area. The Discovery PRD (pending) will formalize these as the canonical tool set and add any missing tools (trust-path traversal, cross-community search).

### External MCP endpoint (`apps/web/app/api/mcp/route.ts`)

HTTP endpoint that external AI agents (Claude Desktop, ChatGPT, custom agents) call. **Currently unauthenticated.** This blocks production launch — see the open architectural question in [`architecture.md`](/foundation/architecture.md) §Open Architectural Questions and the Discovery PRD §Open decisions.

**Access tier design** (when auth lands):

| Tier | Auth | Rate limit | Scope |
|---|---|---|---|
| **Anonymous** | None | 10 req/min | Public personas only |
| **Authenticated** | User API token | 100 req/min | Public + authenticated + user's network + user's communities |
| **Enterprise** | Enterprise API key | 1000 req/min | Full access per license; batch operations; analytics |

Full tool definitions (input schemas, return shapes, use case examples) live in the archived pre-trim file at [`_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md) §MCP Tools. Port into the Discovery PRD when it's authored.

## GraphQL — the aspirational enterprise surface

**Not implemented.** No GraphQL code in the repo. The archived pre-trim file contains a ~190-line schema design covering queries (`personaSearch`, `persona`, `community`, `communityMembers`, `endorsements`, `trustPath`, `affiliations`, `recommendations`), mutations (`createPersona`, `createEndorsement`, `requestIntroduction`, `joinCommunity`, `acceptCommunityInvite`), and subscriptions (`newEndorsement`, `contactRequestUpdated`) with full return types.

**Why it's archived rather than deleted:** the design represents real product thinking about what enterprise customers would want (cursor-based pagination, trust-path queries, batch operations). When GraphQL is prioritized, the archived design is the starting point.

**When GraphQL activates:** port the schema into a new `docs/specs/api/graphql-spec.md` in a dedicated API spec suite (or into the Discovery PRD if that's where it lands architecturally). Do not re-inflate this foundation doc.

## REST endpoints — the minimum surface

A handful of REST routes exist for cases where server actions and MCP don't fit:

- `app/api/mcp/route.ts` — external MCP endpoint
- `app/api/ai-actions/*` — AI action callbacks (see code)

Everything else is server actions. No general-purpose REST API. The archived file had a §REST Endpoints section with ~60 lines of proposed REST surfaces for personas, communities, search, contact, shadow, verification, and OG image generation — most of which are now server actions or don't exist.

**OG image generation** specifically is worth flagging: the archived spec calls for a `GET /og/:persona-uri` endpoint that generates Open Graph preview images dynamically. Current implementation status: unknown; check `apps/web/app/api/` for current routes. If it doesn't exist, it's a future feature spec, not a foundation-level concern.

## Cross-area invariants

Rules that apply to every surface.

### 1. Single service layer

Every surface calls the same service-layer functions. No surface-specific business logic. If an MCP tool needs behavior that a server action doesn't have, the behavior goes in the service layer and both surfaces call it.

### 2. Principal parameter everywhere

Every service-layer call takes a `principal`. Server actions resolve it from the Clerk session. MCP tools resolve it from the API token (future). GraphQL resolvers would resolve it from the API key (future). See [`authorization.md`](/foundation/authorization.md) §Principal pattern.

### 3. PII detection at the write boundary

Free-text inputs are PII-scanned before the service layer writes them. This happens at the **validation layer** (Zod schemas in `packages/validations/`), not at each surface separately. A new surface that bypasses the validation layer is a bug. See [`principles.md`](/foundation/principles.md) §no-pii-in-personas.

### 4. Cost caps apply to every LLM-touching call

Any surface that invokes an agent or an embedding generation respects the cost caps in CLAUDE.md `ai.cost_caps`. Cost accounting happens in the Mastra runtime, not per-surface. See [`agents.md`](/foundation/agents.md) §Cost caps — runtime enforcement pattern.

### 5. 404 not 403 for sensitive reads

All three surfaces return 404 for unauthorized reads of private resources, not 403. Enumeration resistance is a cross-surface concern. See [`authorization.md`](/foundation/authorization.md) §Layered evaluation §Layer 2.

### 6. Rate limiting is surface-specific

Each surface applies its own rate limits (server actions: per-user Clerk-backed; MCP: per-token tier-backed; GraphQL: per-key). The limits are coordinated at the principal level — a user who hits their daily cost cap via server actions cannot escape it by switching to MCP.

## Forward references

| Topic | Where it lives |
|---|---|
| MCP tool implementation | `apps/web/lib/mastra/tools.ts`, `apps/web/app/api/mcp/route.ts` |
| MCP tool design (full definitions, use case examples) | Pre-trim archive at [`_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md); port into Discovery PRD when authored |
| GraphQL schema design | Pre-trim archive §GraphQL Schema; port into a future GraphQL spec when prioritized |
| Server action authoring conventions | `apps/web/app/actions/` — read existing actions as the convention; no separate doc |
| MCP access tier authorization | [`authorization.md`](/foundation/authorization.md) §Actors + this file §MCP tools |
| Cost caps on LLM-touching calls | [`agents.md`](/foundation/agents.md) §Cost caps + CLAUDE.md `ai.cost_caps` |
| External platform integrations (Slack, Discord, etc.) | [`../specs/integrations/00-prd.md`](/domains/platform-channels/00-prd.md) |

## Displacement note

The pre-2026-04-14 version of this file (archived at [`_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md)) contained ~505 lines covering:

| Legacy section | Lines | Why it displaced |
|---|---|---|
| §GraphQL Schema (queries, mutations, subscriptions, input types, return types) | ~190 | Aspirational — no live GraphQL code. Preserved in archive for future GraphQL work. |
| §MCP Tools (6 tool definitions with full input/output schemas and use case examples) | ~237 | Duplication with `apps/web/lib/mastra/tools.ts`. When Discovery PRD is authored, port the access-tier design and the forward-looking tools (get affiliations, commerce persona tool). |
| §REST Endpoints (persona, community, search, contact, shadow, verification, OG image) | ~60 | Mostly reshaped into server actions or not implemented. Current REST surface is minimal — MCP endpoint + AI action callbacks. |

**Nothing was lost.** The archive is at [`_archive/api-surface.2026-04-12.md`](/archive/legacy/foundation/_archive/api-surface.2026-04-12.md).

## History

- **2026-02-18** — Original 505-line `03-api-surface.md` authored as the aspirational API design
- **2026-04-12** — Renamed to `api-surface.md` during foundation reorganization
- **2026-04-14** — Trimmed to ~160 lines. Aspirational GraphQL design and detailed MCP tool definitions moved to archive; trimmed file focuses on the three-surface architectural pattern and the cross-surface invariants.
