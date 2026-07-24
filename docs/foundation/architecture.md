---
type: foundation
title: Personus.ai — Architecture
description: "Inside the boundary: consumer web app (apps/web), admin control plane (apps/admin), shared packages (packages/), Mastra agent runtime, MCP server endpoint, Neon Postgres with pgvector."
status: current
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Architecture

> **This is the canonical library architecture index.** It's deliberately short — a topology overview, component list, and pointers to the detailed source documents. When downstream skills (`/plan-spec`, `/plan-schema`, `/arch-review`) need architectural detail, they follow the pointers into the numbered source files that remain authoritative.

## System Boundary

**Inside the boundary:** consumer web app (`apps/web`), admin control plane (`apps/admin`), shared packages (`packages/*`), Mastra agent runtime, MCP server endpoint, Neon Postgres with pgvector.

**Outside the boundary:** Clerk (auth), OpenAI (LLM + embeddings), AT Protocol PDSes, ACP-enabled vendors, external MCP clients querying our endpoint.

## Topology

```
                  ┌──────────────────────────────────────────────────────┐
                  │                  Outside callers                      │
                  │  Humans (browser)     AI agents (MCP)     Clerk UI    │
                  └──────┬───────────────────┬──────────────────┬──────────┘
                         │                   │                  │
                  HTTPS  │            HTTPS  │           OAuth  │
                         │                   │                  │
                  ┌──────▼──────┐     ┌──────▼──────┐    ┌──────▼──────┐
                  │  apps/web   │     │ MCP route   │    │   Clerk     │
                  │ (Next.js 16 │     │ apps/web/   │    │  (external) │
                  │  App Router)│     │ api/mcp     │    └─────────────┘
                  └──────┬──────┘     └──────┬──────┘
                         │                   │
                         │   Server actions  │  Tool handlers
                         │   (apps/web/app/  │  (apps/web/lib/
                         │    actions/*)     │   mcp/tools)
                         │                   │
                         └───────┬───────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │    Service layer            │
                  │  @personus/db/queries       │
                  │  + CASL ability checks      │
                  │  (authz-at-service-layer)   │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │   Mastra agents             │
                  │   (apps/web/lib/mastra/)    │
                  │   - PersonaCoachAgent       │
                  │   - RecommenderCoachAgent   │
                  │   - DiscoveryAgent          │
                  └──────┬───────────────┬──────┘
                         │               │
                  LLM    │               │   Embeddings
                         │               │
                  ┌──────▼──────┐ ┌──────▼──────┐
                  │   OpenAI    │ │  pgvector   │
                  │ (external)  │ │  (in Neon)  │
                  └─────────────┘ └──────┬──────┘
                                         │
                  ┌──────────────────────▼──────────────────────┐
                  │             Neon Postgres                    │
                  │  20 tables — personas, user_traits,          │
                  │  communities, community_members,             │
                  │  endorsements, shadow_personas,              │
                  │  contact_requests, activity_events,          │
                  │  coach_sessions, integrations, guilds*       │
                  └──────────────────────────────────────────────┘
```

## Components

| Component | Location | Purpose | Detail |
|---|---|---|---|
| **Consumer web app** | `apps/web/` | Human UI for users building traits, creating personas, chatting with the coach, joining communities | Next.js 16 App Router + React 19 + Turbopack. [`deployment.md`](/foundation/deployment.md) §Project Structure |
| **Admin control plane** | `apps/admin/` | Platform operator surface (trait taxonomy, system settings, user ops). Currently a scaffold. | Next.js 16 scaffold. See [`docs/specs/platform-ops/`](../specs/platform-ops/) for planned specs |
| **Server actions** | `apps/web/app/actions/` | Type-safe mutations from the UI (`personas.ts`, `agents.ts`, `coach.ts`) | All validate input via Zod schemas from `@personus/validations`. [`api-surface.md`](/foundation/api-surface.md) |
| **MCP endpoint** | `apps/web/app/api/mcp/route.ts` | Exposes tools to external AI agents (`search_personas`, `search_communities`, `request_introduction`, etc.) | [`api-surface.md`](/foundation/api-surface.md) §MCP Tools |
| **Mastra agents** | `apps/web/lib/mastra/agents/` | Three agents: `PersonaCoachAgent`, `RecommenderCoachAgent`, `DiscoveryAgent` | [`agents.md`](/foundation/agents.md) |
| **Service layer** | `@personus/db/queries` | Typed query helpers with principal-parameter authorization (CASL) | [`authorization.md`](/foundation/authorization.md) |
| **Schema** | `packages/db/src/schema/*.ts` | Drizzle schemas for 20 tables, including vector columns for personas, communities, shadow_personas | [`data-model.md`](/foundation/data-model.md) |
| **Validations** | `packages/validations/` | Zod schemas shared by server actions and forms | Single source of truth for input shape |
| **Embeddings pipeline** | `apps/web/lib/embeddings/` | Generate pgvector embeddings for personas/communities on write | [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §Persona (embedding field) |
| **Profile import** | `apps/web/lib/import/` | LinkedIn + URL scraping to bootstrap user traits | See [`docs/specs/personas/`](../specs/personas/) |
| **PII detection** | inline in validation layer | Enforces [`principles.md#no-pii-in-personas`](/foundation/principles.md#no-pii-in-personas) on all free-text input | |

## Data Model Summary

20 tables grouped into four domains. System-level invariants and the cross-area ER map live in [`data-model.md`](/foundation/data-model.md); field-level schema is in per-area schema specs (e.g., [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md), [`../specs/communities/schema-spec.md`](/domains/communities/schema-spec.md)); the physical Drizzle schema is truth. Core tables:

| Domain | Tables |
|---|---|
| **Identity** (master profile + personas) | `users`, `user_traits`, `trait_metadata`, `trait_taxonomies`, `personas` (+ vector), `shadow_personas` (+ vector) |
| **Community** (group-like entities) | `community_types` (seed), `communities` (+ vector + JSONB traits), `community_members` |
| **Trust** (endorsement + contact flywheel) | `endorsements`, `contact_requests` |
| **Guild** (skill-centric community subset) | `guild_skill_categories`, `guild_membership_tiers`, `guild_offerings`, `guild_offering_members`, `guild_requests` |
| **Operational** (activity, sessions, integrations) | `activity_events`, `coach_sessions`, `platform_channel_bindings`, `query_logs` |

**Key architectural decisions (ADRs — see [`docs/decisions/`](../decisions/)):**
- **Hybrid JSONB storage.** Structured columns for queryable fields (`displayName`, `visibility`); JSONB `traits` column for flexible attributes. Queryable filters hit columns; rich content lives in JSONB. [`data-model.md`](/foundation/data-model.md) §Architecture Decision.
- **Unified people + orgs.** Both stored as `personas` rows differentiated by `entityType`. Enforced by [`principles.md#unified-entity-model-for-people-and-orgs`](/foundation/principles.md#unified-entity-model-for-people-and-orgs).
- **Three-layer persona model.** Base (name, headline) → Attribute (JSONB traits) → Context (community-specific data in `community_members.memberTraits`).
- **Data-driven community types.** Nine types (club, organization, friends, guild, workplace, customer, neighborhood, event, educational) live in `community_types` seed data, not in code enums.

## API Surface

Three parallel surfaces against the same service layer. Detail in [`api-surface.md`](/foundation/api-surface.md).

| Surface | Protocol | Primary consumer | Auth |
|---|---|---|---|
| **Server actions** | Next.js actions (RPC-over-HTTP) | Human UI in `apps/web` | Clerk session cookie |
| **MCP tools** | Model Context Protocol over HTTP | External AI agents | API token (future — currently unauthenticated dev surface) |
| **GraphQL** | GraphQL (planned) | Enterprise + developer integrations | API key (future) |

All three route through the same service-layer functions, which enforce authorization via CASL abilities. This is the mechanism that makes [`principles.md#authz-at-service-layer`](/foundation/principles.md#authz-at-service-layer) work — any new surface gets authz for free by calling the service layer.

## Authentication & Authorization

- **Authentication** provided by Clerk via `@clerk/nextjs 6.37`. Proxy middleware in [`apps/web/proxy.ts`](../../apps/web/proxy.ts) (Next.js 16 pattern — not `middleware.ts`). Detail: [`authentication.md`](/foundation/authentication.md).
- **Authorization** via CASL (`@casl/ability`) with principal-parameter pattern. Every sensitive read/write takes a `principal` argument; the service function constructs a CASL ability from Clerk session claims and checks it before touching data. Detail: [`authorization.md`](/foundation/authorization.md).
- **Auth provider abstraction.** `packages/auth/src/provider.ts` defines the interface; Clerk is the current implementation. Switching is one env var (`AUTH_PROVIDER`) plus a new adapter.

## Deployment Topology

Target: **Vercel** (inferred — no `vercel.json` committed yet). See [`deployment.md`](/foundation/deployment.md) for the full deployment plan.

| Environment | Hosting | Database | Agents |
|---|---|---|---|
| **Development** | `bun run dev:web` (localhost:3000) | Neon dev branch | In-process Mastra |
| **Preview** | Vercel preview (branch deploys) | Neon preview branch per PR | In-process Mastra |
| **Production** | Vercel production | Neon prod | In-process Mastra |

**Key constraints:**
- **Bun is the package manager**, not npm or yarn. Turborepo orchestrates tasks across workspaces.
- **Turbopack** is the Next.js 16 default bundler. No webpack config.
- **PostgREST-style Neon Data API** is not in use — all queries go through Drizzle ORM + the service layer.
- **No separate agent service.** Mastra agents run in-process inside the Next.js app. See [`agents.md`](/foundation/agents.md) §Single-codebase AI.

## External Dependencies

| Service | Role | Criticality | Fallback |
|---|---|---|---|
| **Clerk** | Authentication | P0 — app is unusable without auth | None — core dependency; auth provider abstraction allows future swap |
| **Neon Postgres** | Primary data store + pgvector search | P0 | None — core dependency |
| **OpenAI** | LLM (coach chat, discovery agent) + embeddings (persona/community vectors) | P1 — embeddings can degrade gracefully; coach chat cannot | Swap to Anthropic / Mistral via `@ai-sdk/*` with code changes |
| **Mastra runtime** | Agent orchestration framework | P0 for AI features | No fallback — if Mastra breaks, coach/discovery features go offline |
| **Vercel** | Hosting | P0 | Any Next.js-compatible host — framework is stack-agnostic at this level |
| **AT Protocol PDSes** | Outbound sync of public personas (planned) | P2 — feature-level dependency | Feature degrades to "not synced" |
| **ACP-enabled vendors** | Commerce flow (planned) | P2 — feature-level | Feature unavailable if no ACP vendors |

## Observability

Currently minimal. Solution Profile declares `ai.observability: []` and `ai.eval_framework: none`. Upcoming surfaces ([`docs/specs/platform-ops/`](../specs/platform-ops/)):
- Agent trace viewer (once observability platform is chosen)
- Cost dashboard (per-user, per-agent, per-tenant attribution)
- Eval dashboard (once eval framework is chosen)

The [`principles.md#ai-cost-and-loop-caps`](/foundation/principles.md#ai-cost-and-loop-caps) gate already sets hard numeric caps from the Solution Profile; observability adds the ability to see what's happening inside the caps.

## Reliability Targets

- **Reads** — p95 < 500ms (enforced by [`principles.md#latency-p95-500-1000`](/foundation/principles.md#latency-p95-500-1000))
- **Writes** — p95 < 1s
- **Agent-mediated operations** (coach chat, discovery search) — separate declared budgets per feature; no blanket SLA
- **No explicit uptime SLO** yet — pre-product-market-fit

## Cost Drivers

1. **LLM calls** — coach chat (streaming responses), discovery agent reasoning, trait extraction from shadow persona creation. Capped by `ai.cost_caps` in the Solution Profile: $0.50/request, $10/user/day, $5/agent-run, $1000/tenant/month.
2. **Embedding generation** — one write per persona / community / shadow persona creation or update. Amortized across batch operations.
3. **Neon Postgres compute** — pgvector similarity search scales with persona count; cold start on branch databases for preview envs.
4. **Clerk MAU** — standard per-MAU pricing; no per-tenant multiplier since this is single-tenant B2C.

## Open Architectural Questions

Items that should become ADRs (or already have draft ADRs in [`docs/decisions/`](../decisions/)):

1. **MCP endpoint authentication.** Currently the MCP route at `apps/web/app/api/mcp/route.ts` is unauthenticated — OK for dev, not OK for production. Needs token scheme before any external agent can safely call it.
2. **Observability platform choice.** `langfuse`, `sentry`, custom, or multiple? Blocks the trace viewer spec.
3. **Eval framework choice.** `braintrust`, `promptfoo`, `evalite`, or none? Blocks the eval dashboard spec.
4. **AT Protocol sync trigger model.** Webhook on persona change, background worker on a schedule, or user-initiated? See [`at-protocol.md`](/foundation/at-protocol.md).
5. **Agent delegation model.** `ai.delegated_authority: false` today; the "on behalf of" pattern is not in use. When commerce personas ship, this may need to flip — and that's a cross-cutting change to service-layer principal construction.

## Cross-References

Foundation topic files (architecture siblings):
- Data model: [`data-model.md`](/foundation/data-model.md)
- API surface (GraphQL / MCP / REST): [`api-surface.md`](/foundation/api-surface.md)
- Agent architecture: [`agents.md`](/foundation/agents.md)
- Deployment: [`deployment.md`](/foundation/deployment.md)
- Authentication: [`authentication.md`](/foundation/authentication.md)
- Authorization: [`authorization.md`](/foundation/authorization.md)
- AT Protocol integration: [`at-protocol.md`](/foundation/at-protocol.md) (ecosystem survey now lives at [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md))

Foundation canonical files:
- Vision: [`vision.md`](/foundation/vision.md)
- Principles (gates): [`principles.md`](/foundation/principles.md)
- Strategy: [`strategy.md`](/foundation/strategy.md)
- Business model: [`business.md`](/foundation/business.md)
- Metrics framework: [`metrics.md`](/foundation/metrics.md)

_Last updated 2026-04-12 by `/plan-foundation` (authored as a topology overview; detailed topics live in sibling foundation files data-model / api-surface / agents / deployment / authentication / authorization)._
