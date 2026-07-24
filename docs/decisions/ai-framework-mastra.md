---
type: decision
title: "AI Agent Framework: Mastra in the Consumer Codebase"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# AI Agent Framework: Mastra in the Consumer Codebase

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus is AI-native: every persona and community is a machine-readable endpoint, and the product surfaces four agents — **PersonaCoach**, **RecommenderCoach**, **DiscoveryAgent**, and the planned **CommunityCoach** — inside the authenticated app. Agents need tool-calling (server actions + DB queries), memory, streaming responses, and the ability to be invoked both from the UI (Server Actions) and from an external MCP endpoint (`apps/web/app/api/mcp/route.ts`).

The SPAIDE profile declares `ai.centric: true`, `ai.agent_framework: mastra`, `ai.mcp_server: true`, `ai.agent_loops: true`, and a strict set of cost caps (`per_request_usd: 0.50`, `per_user_daily_usd: 10.00`, `per_agent_run_usd: 5.00`). The `ai-cost-and-loop-caps` baseline requires every agent loop to have a max-iteration cap, a max-cost cap, and a killswitch.

Mastra 1.2 (`@mastra/core`) is already integrated; agents live in `apps/web/lib/mastra/agents/` and are invoked via server actions in `apps/web/app/actions/agents.ts`. An earlier ADR (`single-codebase.md`) covered the *topology* decision (agents live inside the consumer app, not a separate service). This ADR covers the **framework choice** and the cost/loop-cap discipline that comes with it.

## Decision Drivers

1. **Tool-calling to Server Actions and DB** — agents must call into our existing service layer (where CASL enforces authz), not re-implement data access.
2. **Streaming + UI ergonomics** — the coach chat UX needs streaming tokens and tool-call visibility.
3. **MCP exposure** — the same agent/tool definitions should be reusable from the MCP server route.
4. **Cost/loop caps** — profile-declared caps must be enforceable at the framework layer, not hand-rolled per call site.
5. **Observability hooks** — traces for LLM calls, tool calls, and agent loops (observability itself is a gap — profile `ai.observability: []` — but the framework must not preclude it).
6. **Team ergonomics & documentation** — small team, prefers well-documented TS-native frameworks.

## Decision

We use **Mastra** (`@mastra/core` 1.2) as the agent framework. Agents are defined in `apps/web/lib/mastra/agents/` as `Agent` instances with `createTool`-wrapped tools that call through to our server actions and DB helpers. Models are specified as strings (`'openai/gpt-4o'`) via the Vercel AI SDK integration.

Mastra satisfies drivers 1, 2, 3, and 6 fully. Drivers 4 and 5 are partially satisfied — Mastra supports loop configuration and middleware hooks, but the **cost cap enforcement** required by the SPAIDE profile is a **project-level responsibility**: we must add a pre-call cost-estimator + post-call token accounting, gated against the profile's per-request, per-user-daily, and per-agent-run budgets. This is tracked as a follow-up.

## Alternatives Considered

### Comparison Matrix

| Driver | Mastra (chosen) | Vercel AI SDK (raw) | LangChain.js | Build on OpenAI SDK |
|---|---|---|---|---|
| Tool-calling abstraction | `createTool` — TS-first | Manual | Rich but heavy | Manual |
| Streaming + UI hooks | Yes (AI SDK under the hood) | Yes (primary) | Workable | Manual |
| Agent loop with memory | Built-in | DIY | Built-in, complex | DIY |
| MCP reuse | Good (tools are reusable defs) | Manual | Awkward | Manual |
| Cost/loop caps | Framework hooks; project still enforces | DIY | DIY | DIY |
| Observability hooks | Middleware layer | DIY | Callbacks (heavy) | DIY |
| TS-native ergonomics | High | High | Medium (ported) | High |
| Maturity (at decision time) | Young (1.2) | Stable | Stable | Stable |
| Documentation quality | Good, improving | Excellent | Dense | N/A |

### Mastra (chosen)
Best balance of agent-loop ergonomics, tool abstraction, and MCP reuse for a small TS team. Built on top of the Vercel AI SDK so streaming UX is first-class. Young framework risk is acceptable given single-codebase topology and that we can drop to raw AI SDK if needed.

### Vercel AI SDK alone (rejected)
Excellent primitives but no agent-loop abstraction, no memory, no cost-cap middleware — every agent would reinvent the same scaffolding. Good as an escape hatch; not a primary framework.

### LangChain.js (rejected)
Mature and feature-rich, but heavyweight and its abstractions feel ported from Python. Bundle size and complexity are unjustified for our four-agent surface.

### OpenAI SDK directly (rejected)
Ties us to a single provider and re-implements tool-calling, memory, and streaming plumbing per call site. Rejected on maintainability and provider lock-in.

## Consequences

### Positive
- Four agents share one framework and one tool-definition pattern.
- MCP endpoint and in-app chat can reuse the same tool definitions.
- Streaming UX and tool-call visibility work out of the box via AI SDK integration.
- Single-codebase topology (see `single-codebase.md`) means agents can call server actions directly.

### Negative
- Mastra is a young framework; API changes across minor versions are plausible.
- Cost-cap enforcement is **not** solved by the framework — we still have to build it.
- Observability integration is DIY until we pick a tracing vendor (profile gap).

### Risks
- **Cost caps not enforced.** The profile declares strict caps, but the code at time of writing does not yet gate against them. This is a **P1 follow-up** — any agent that reaches production without caps violates the `ai-cost-and-loop-caps` baseline.
- **Mastra API churn.** Mitigation: pin the version, upgrade deliberately, and keep tool definitions thin so migrations are easier.
- **Delegated authority gap.** Agents currently do not explicitly act on behalf of a `User` principal (`ai.delegated_authority: false` in the profile). Must be wired before agents touch sensitive entities unattended.

## Implementation

- Agents: `apps/web/lib/mastra/agents/persona-coach.ts`, `recommender-and-discovery.ts`
- Planned: `apps/web/lib/mastra/agents/community-coach.ts`
- Tools: `apps/web/lib/mastra/tools/`
- Server-action bridge: `apps/web/app/actions/agents.ts`
- MCP route: `apps/web/app/api/mcp/route.ts`
- **Follow-up: cost-cap middleware** — gate every LLM call against profile budgets before invocation; abort mid-loop if per-run cap is exceeded.

## References

- `docs/decisions/single-codebase.md` — topology decision (agents in consumer app)
- `docs/foundation/agents.md` — agent architecture spec
- CLAUDE.md `## SPAIDE Profile` `ai.*` and `ai-cost-and-loop-caps` baseline
- Onboarding report `docs/onboarding-2026-04-10.md` — P2 retroactive ADR item
