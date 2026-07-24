---
type: decision
title: MCP Server Exposure
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# MCP Server Exposure

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

The `ai-native-discoverability` baseline demands that every persona and community be a machine-readable endpoint. Beyond JSON-LD on public pages, Personus exposes a **Model Context Protocol (MCP) server** so external AI agents — Claude, ChatGPT with MCP support, custom Mastra clients — can discover, search, and query structured data through tools rather than HTML scraping.

The endpoint lives at `apps/web/app/api/mcp/route.ts` and uses `@modelcontextprotocol/sdk 1.17`. Tools mirror internal capabilities (search personas, fetch a persona, discover by capability). The SPAIDE profile declares `ai.mcp_server: true` and `ai.mcp_client: false` — we expose an MCP server but do not consume external MCP servers.

The onboarding audit flagged the endpoint as **publicly reachable without visible OAuth** — this ADR must document the intended authentication model and record the gap.

## Decision Drivers

1. **AI-native discoverability baseline** — the core product thesis is that agents are first-class consumers. HTML-only surfaces regress this.
2. **Tool reuse across surfaces** — the same tool definitions that power in-app agents should power external clients.
3. **Authentication and authz** — external callers must be identified and subject to the same CASL rules as human requests. Unauthenticated callers should see only public data.
4. **Rate limiting and abuse control** — a public MCP endpoint is a new DoS and scraping surface.
5. **Cost attribution** — MCP callers that trigger LLM/embedding work must be accounted against cost caps.
6. **Versioning** — the protocol and our tool surface will evolve; breaking changes need a story.

## Decision

We expose an **MCP server** at `apps/web/app/api/mcp/route.ts` using `@modelcontextprotocol/sdk`. Tools are defined alongside Mastra tool definitions so agent logic is reusable across the in-app chat and the external endpoint.

**Authentication model (intended):** OAuth 2.1 with PKCE per MCP spec. Public tools (discovery of fully-public personas) may be callable unauthenticated; anything touching a sensitive entity requires an authenticated principal that resolves through the same CASL abilities as the web app. Unauthenticated callers see the 404 path for non-public resources per the `sensitive-resource-returns-404` baseline.

**Current state (flagged gap):** the endpoint at time of this ADR does not visibly enforce OAuth. This is a **P0 follow-up** tracked in the onboarding report; the ADR records both the intent and the gap so the remediation can be planned against a written decision.

Drivers 1 and 2 are satisfied today. Drivers 3, 4, 5 are partially satisfied (intent is clear, enforcement is incomplete). Driver 6 is satisfied by the MCP protocol's own version negotiation.

## Alternatives Considered

### Comparison Matrix

| Driver | MCP server (chosen) | GraphQL public API | REST public API | No public API |
|---|---|---|---|---|
| AI-agent ergonomics | Native (tool discovery, streaming) | Good with schema | Workable | Zero |
| Tool reuse with in-app agents | High (shared defs) | Medium (shared resolvers) | Low | — |
| Authentication story | OAuth 2.1 + PKCE (spec) | OAuth / API keys | OAuth / API keys | N/A |
| Rate limiting maturity | DIY | Mature | Mature | N/A |
| Discoverability by agents | Designed for it | Introspection | OpenAPI | None |
| Ecosystem momentum | Growing fast | Mature | Mature | — |
| Operational complexity | Low (single route) | Medium | Medium | Zero |

### MCP server (chosen)
Purpose-built for AI agent consumption, matches the product's ai-native thesis, and reuses tool definitions with the in-app agents. The ecosystem is young but moving fast with first-class support from Claude, Anthropic SDKs, and Mastra.

### GraphQL public API (rejected as primary)
Mature and discoverable, but AI agents need adapters to turn a schema into tools. Adds a second surface without the ergonomics win. Could be added later for human developer consumption without conflicting.

### REST public API (rejected as primary)
Workable, but the agent discoverability story is weaker than MCP and tool reuse with in-app agents is lower. Might still appear eventually for webhooks or specific integrations.

### No public API (rejected)
Violates the `ai-native-discoverability` baseline directly. Rejected on principle.

## Consequences

### Positive
- External agents can discover and query Personus through a protocol designed for their consumption.
- In-app agent tools and MCP tools share a single definition surface.
- Moves with the ecosystem — as MCP-capable clients proliferate, our surface area grows without extra work.

### Negative
- MCP is a young protocol; breaking changes in the spec may force endpoint updates.
- A public endpoint introduces attack surface we did not have before.
- Cost attribution for external callers is harder than for logged-in users.

### Risks
- **P0: OAuth not yet enforced.** The endpoint at time of this ADR is publicly reachable. Must be remediated before any tool that touches sensitive data is exposed. Tracked as onboarding issue #27.
- **Scraping / DoS.** A public tool surface is a scraping magnet. Mitigation: rate limit by IP pre-auth, by principal post-auth; log query patterns.
- **Cost runaway.** An external caller could drive embedding/LLM calls by spamming discovery queries. Mitigation: profile caps must account for the anonymous/external caller bucket; consider a separate `per_mcp_ip_daily_usd` cap.
- **Tool/service drift.** If MCP tools diverge from internal service functions, authz checks could skip CASL. Mitigation: MCP tools *must* go through the same service-layer functions, not call the DB directly.

## Implementation

- Route: `apps/web/app/api/mcp/route.ts`
- SDK: `@modelcontextprotocol/sdk 1.17`
- Tool definitions: colocated with Mastra tools so they are shared
- **Follow-ups (P0 / P1):**
  1. Wire OAuth 2.1 + PKCE authentication on the MCP route.
  2. Add rate limiting (pre-auth by IP, post-auth by principal).
  3. Add cost accounting bucket for MCP-triggered work.
  4. Ensure every MCP tool routes through CASL-enforced service functions (no direct DB).

## References

- `@modelcontextprotocol/sdk` docs
- CLAUDE.md `ai-native-discoverability` baseline
- Onboarding report `docs/onboarding-2026-04-10.md` — P0 security gap on MCP OAuth posture
