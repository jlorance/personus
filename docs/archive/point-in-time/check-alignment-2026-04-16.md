---
type: guide
title: Alignment Check — Personus.ai
description: Point-in-time alignment sweep against the 2026-04-13 snapshot.
status: superseded
tags: [archived]
timestamp: 2026-04-16
---

# Alignment Check — Personus.ai

Generated: 2026-04-16
Profile snapshot: 2026-04-12
Baseline snapshot: 2026-04-13
Patterns analyzed: 25  Patterns gated out: 3  Findings: 21  (P0: 5, P1: 8, P2: 6, P3: 2)

## How to use this report

1. Browse the findings grouped by stage lens below.
2. When you want to create issues, pick finding numbers and run:
   `/check-alignment issues <numbers>`
   Examples: `issues 1,3,7` or `issues 2,5-8` or `issues 1-12`.
3. Issues are created using the project's `/improve` template. Titles are
   pre-written in the tables below.
4. Re-visit this report anytime -- finding numbers are stable, and created
   issues are marked with their Linear ID in the "Issues created" section
   at the bottom.

## Gating decisions

| Pattern | Decision | Reason |
|---------|----------|--------|
| agent-evals-and-observability | keep | `ai.centric: true`, `ai.agent_loops: true` |
| agent-patterns | keep | `ai.centric: true`, `ai.agent_loops: true` |
| ai-llm-patterns | keep | `features` contains `ai-llm`, `ai.centric: true` |
| api-design-patterns | keep | universal default |
| async-processing-patterns | **skip** | `features` does not contain `background-jobs` or `queues` |
| bug-fix-discipline | keep | universal |
| caching-strategy | keep | universal default |
| capacity-and-scaling | keep | universal default |
| cost-management | keep | `ai.cost_caps` declared, `features` has `ai-llm` and `external-apis` |
| data-authorization-engines | keep | `authz.model: rbac-with-ownership`, `authz.engines: [casl]` |
| data-authorization-patterns | keep | `authz.model: rbac-with-ownership`, `authz.sensitive_entities` declared |
| data-classification-patterns | keep | `compliance: [gdpr, ccpa]`, `authz.sensitive_entities` declared |
| database-migration-playbook | keep | database present (Neon Postgres + Drizzle ORM) |
| feature-flags-and-config | keep | universal default |
| field-lifecycle | keep | universal default |
| frontend-performance-patterns | keep | has frontend (Next.js consumer app) |
| identity-and-auth-patterns | keep | `auth_provider: clerk` |
| list-view-patterns | keep | has frontend, `features` contains `search` |
| mcp-client-patterns | **skip** | `ai.mcp_client: false` |
| mcp-server-patterns | keep | `ai.mcp_server: true` |
| multi-tenancy-patterns | **skip** | `multi_tenant: false` |
| non-prod-data-safety | keep | `compliance: [gdpr, ccpa]`, `authz.sensitive_entities` declared |
| rate-limiting-and-quotas | keep | universal default, `ai.mcp_server: true` |
| reliability-patterns | keep | universal |
| retention-as-code | keep | `compliance: [gdpr, ccpa]`, `authz.sensitive_entities` declared |
| service-layer-patterns | keep | universal, `authz.enforcement_layers` contains `service` |
| tool-design-patterns | keep | `ai.mcp_server: true`, `ai.agent_loops: true` |
| verification-patterns (build) | keep | universal |

## Findings by stage lens

Pick the lens that matches where you are today. Findings appear in every
lens where they would matter -- a finding in "Prototype / none" also shows
up in "Beta / public." Finding numbers are stable across lenses.

### Lens: Prototype / exposure:none
The minimum bar. Everything here matters even at the earliest stage --
usually because it is a correctness, authz, or data-safety issue that a
prototype still cannot ship with.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 1 | McpServer can reject unauthenticated tool calls in McpEndpoint | P0 | mcp-server-patterns, identity-and-auth | Add OAuth 2.0 + PKCE or at minimum Clerk session validation to `apps/web/app/api/mcp/route.ts` -- currently zero auth |
| 2 | User can trust that agent tool calls enforce ownership in AgentLoopExecution | P0 | agent-patterns, data-authorization-patterns | Agent tools in `apps/web/lib/mastra/agents/persona-coach.ts` query DB directly without userId/principal check; wrap in ownership guard |
| 3 | User can trust that coach session ownership is verified in CoachChatView | P0 | data-authorization-patterns, service-layer-patterns | Three TODO comments in `apps/web/app/actions/agents.ts` say "Verify session belongs to user" -- implement the check |
| 4 | PersonaCoachAgent can operate within declared cost caps in AgentLoopExecution | P0 | agent-patterns, cost-management | No `maxSteps`, cost cap, or latency cap on any Mastra agent -- profile declares `per_agent_run_usd: 5.00` but nothing enforces it |
| 5 | User can trust that service functions receive a principal in Api | P0 | service-layer-patterns, data-authorization-patterns | Server actions in `apps/web/app/actions/` authenticate via `serverAuth.protect()` but do not construct or thread a `Principal` object; CASL abilities exist but are not invoked in CRUD paths |

### Lens: Alpha / exposure:internal  (adds to the above)
What to address before inviting first external users.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 6 | McpServer can enforce per-principal rate limits in McpEndpoint | P1 | rate-limiting-and-quotas, mcp-server-patterns | No rate limiting middleware anywhere in the codebase -- add Upstash/ratelimit or equivalent to MCP and server action surfaces |
| 7 | User can trust that LLM outputs are validated before persistence in AgentLoopExecution | P1 | ai-llm-patterns, tool-design-patterns | Agent tool `update_persona_field` accepts `z.any()` for `value` parameter -- no schema validation on LLM-supplied data before DB write |
| 8 | User can trust that tool outputs are sanitized before re-entering LLM context in AgentLoopExecution | P1 | tool-design-patterns, agent-patterns | Tool results (DB query output including user-generated content) are returned raw to the LLM without sanitization -- re-injection vector |
| 9 | Admin can classify data fields by sensitivity level in Api | P1 | data-classification-patterns | No data classification metadata exists on any schema table in `packages/db/src/schema/` -- GDPR/CCPA compliance requires knowing which fields are PII |
| 10 | User can trust that prompt injection defenses exist in CoachChatView | P1 | ai-llm-patterns | No prompt injection defense or output validation in agent flows; user messages flow directly into LLM without sanitization |

### Lens: Beta / exposure:invite  (adds to the above)
Production-adjacent concerns. Do not let real users hit the system without these.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 11 | User can trust that data retention policies are enforced in AuditLogWrite | P1 | retention-as-code | No retention policy declarations or enforcement jobs exist -- GDPR requires documented purpose-bound retention |
| 12 | User can trust that LLM calls have fallback behavior in CoachChatView | P1 | ai-llm-patterns, reliability-patterns | No fallback, circuit breaker, or graceful degradation for LLM/OpenAI calls -- provider outage = hard failure |
| 13 | User can trust that non-prod environments never contain real PII in Api | P1 | non-prod-data-safety | Seed data uses realistic-looking data but no formal synthetic data strategy or masking pipeline documented or enforced |
| 14 | PersonaCoachAgent can track token usage and cost per run in AgentLoopExecution | P2 | cost-management, agent-evals-and-observability | No token usage tracking, no per-user/per-run cost attribution -- profile declares cost caps but no measurement infrastructure |
| 15 | User can trust that structured logging captures request context in Api | P2 | service-layer-patterns, reliability-patterns | No structured logger (pino, winston) -- codebase uses console.log/console.error with no request IDs or structured fields |
| 16 | User can trust that database queries have timeouts in Api | P2 | rate-limiting-and-quotas, reliability-patterns | No statement timeout configured on the Neon connection in `packages/db/src/index.ts` |
| 17 | User can benefit from caching on hot read paths in Dashboard | P2 | caching-strategy | No caching layer (Next.js cache, Redis, in-memory) on any read path -- every request hits the DB directly |

### Lens: GA / exposure:public  (adds to the above)
Everything that would be an incident if it were not in place.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 18 | PersonaCoachAgent can be evaluated against regression datasets in AgentLoopExecution | P2 | agent-evals-and-observability | `ai.eval_framework: none` and no eval dataset, no LLM observability platform -- profile acknowledges this gap |
| 19 | User can benefit from LLM observability traces in AgentLoopExecution | P2 | agent-evals-and-observability | `ai.observability: []` -- no Langfuse/LangSmith/Helicone integration; no hierarchical trace structure for agent runs |
| 20 | User can benefit from feature flags for safe rollout in Api | P3 | feature-flags-and-config | No feature flag infrastructure -- flags referenced in seed data strings but no flag evaluation runtime |
| 21 | User can benefit from database migrations tracked in version control in Api | P3 | database-migration-playbook | No migration SQL files in `packages/db/drizzle/` -- using `db:push` (schema push) rather than versioned migrations |

## Full finding list

Sorted by base priority, then stage, then title. This is the master list --
finding numbers here match the lens tables above.

| # | Story title | Base | Stage | Pattern(s) | Labels |
|---|-------------|------|-------|------------|--------|
| 1 | McpServer can reject unauthenticated tool calls in McpEndpoint | P0 | prototype | mcp-server-patterns, identity-and-auth | type:infra, surface:mcp, risk:security-authn |
| 2 | User can trust that agent tool calls enforce ownership in AgentLoopExecution | P0 | prototype | agent-patterns, data-authorization-patterns | type:infra, area:agents, risk:authz |
| 3 | User can trust that coach session ownership is verified in CoachChatView | P0 | prototype | data-authorization-patterns, service-layer-patterns | type:infra, area:agents, surface:web, risk:authz |
| 4 | PersonaCoachAgent can operate within declared cost caps in AgentLoopExecution | P0 | prototype | agent-patterns, cost-management | type:infra, area:agents, risk:cost-cap |
| 5 | User can trust that service functions receive a principal in Api | P0 | prototype | service-layer-patterns, data-authorization-patterns | type:refactor, surface:api, risk:authz |
| 6 | McpServer can enforce per-principal rate limits in McpEndpoint | P1 | alpha | rate-limiting-and-quotas, mcp-server-patterns | type:infra, surface:mcp, risk:cost-cap |
| 7 | User can trust that LLM outputs are validated before persistence in AgentLoopExecution | P1 | alpha | ai-llm-patterns, tool-design-patterns | type:infra, area:agents, risk:security-injection |
| 8 | User can trust that tool outputs are sanitized before re-entering LLM context in AgentLoopExecution | P1 | alpha | tool-design-patterns, agent-patterns | type:infra, area:agents, risk:security-injection |
| 9 | Admin can classify data fields by sensitivity level in Api | P1 | alpha | data-classification-patterns | type:compliance, risk:pii |
| 10 | User can trust that prompt injection defenses exist in CoachChatView | P1 | alpha | ai-llm-patterns | type:infra, area:agents, surface:web, risk:security-injection |
| 11 | User can trust that data retention policies are enforced in AuditLogWrite | P1 | beta | retention-as-code | type:compliance, risk:pii |
| 12 | User can trust that LLM calls have fallback behavior in CoachChatView | P1 | beta | ai-llm-patterns, reliability-patterns | type:infra, area:agents, surface:web |
| 13 | User can trust that non-prod environments never contain real PII in Api | P1 | beta | non-prod-data-safety | type:compliance, risk:pii |
| 14 | PersonaCoachAgent can track token usage and cost per run in AgentLoopExecution | P2 | beta | cost-management, agent-evals-and-observability | type:infra, area:agents, risk:cost-cap |
| 15 | User can trust that structured logging captures request context in Api | P2 | beta | service-layer-patterns, reliability-patterns | type:infra, surface:api |
| 16 | User can trust that database queries have timeouts in Api | P2 | beta | rate-limiting-and-quotas, reliability-patterns | type:infra, surface:api |
| 17 | User can benefit from caching on hot read paths in Dashboard | P2 | beta | caching-strategy | type:infra, surface:web |
| 18 | PersonaCoachAgent can be evaluated against regression datasets in AgentLoopExecution | P2 | ga | agent-evals-and-observability | type:test, area:evals |
| 19 | User can benefit from LLM observability traces in AgentLoopExecution | P2 | ga | agent-evals-and-observability | type:infra, area:agents |
| 20 | User can benefit from feature flags for safe rollout in Api | P3 | ga | feature-flags-and-config | type:infra |
| 21 | User can benefit from database migrations tracked in version control in Api | P3 | ga | database-migration-playbook | type:infra, risk:migration |

## Per-pattern analysis

### Pattern: MCP Server Patterns
Source: `.claude/skills/handle/mcp-server-patterns.md`

Summary: The MCP server is functional but lacks authentication, rate limiting, and principal-based authorization.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 1 | McpServer can reject unauthenticated tool calls | absent | P0 | prototype | Searched: "OAuth", "oauth", "authenticate", "bearer", "authorization" in `apps/web/app/api/mcp/`; no auth code. `route.ts:159-170` creates server per request with zero auth. | Add OAuth 2.0 + PKCE or Clerk session validation |
| - | MCP tools validate inputs via Zod | present | - | - | `route.ts:55-58` uses `z.string()`, `z.array()`, `z.number()` on all tool inputs | - |
| - | MCP server uses official SDK | present | - | - | `route.ts:11-12` imports `@modelcontextprotocol/sdk` | - |
| - | MCP tools delegate to service layer | partial | P2 | alpha | Tools delegate to `lib/mcp/tools.ts` wrappers which call `semanticSearch` and `createContactRequest`, but wrappers do not receive or enforce a principal | Thread principal from auth into tool wrappers |
| 6 | Rate limits per token/principal | absent | P1 | alpha | Searched: "rateLimit", "throttle", "upstash", "@upstash" in codebase; only found unrelated admin placeholder text | Add rate limiting middleware |
| - | Audit logging on tool calls | absent | P2 | beta | Searched: "auditLog", "logActivity" in MCP route; not present. `logActivity` exists in DB queries but is not called from MCP handlers | Wire `logActivity` into MCP tool calls |

Overall alignment: weak
MCP endpoint is functional but missing all security controls (auth, rate limits, audit).

### Pattern: Agent Patterns
Source: `.claude/skills/handle/agent-patterns.md`

Summary: Agents are wired to real DB and tools work, but all three mandatory caps (iterations, cost, latency) are missing, and tools bypass authorization.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 4 | Iteration/cost/latency caps on agent loops | absent | P0 | prototype | Searched: "maxSteps", "maxIterations", "iteration_cap", "cost_cap", "latency_cap" across codebase; no matches. Mastra agents in `persona-coach.ts` and `recommender-and-discovery.ts` have no cap configuration. | Add `maxSteps`, cost tracking, and wall-clock timeout to all agent invocations |
| 2 | Agent tools enforce ownership via principal | absent | P0 | prototype | `persona-coach.ts:46-52` queries `personas` by `personaUri` without userId filter; `tools.ts:33-61` searches without principal. No `principal` parameter on any tool `execute` function. | Add principal parameter; filter by `userId` |
| - | Stop reason recording | absent | P2 | beta | No `stop_reason` field or run-level recording in any agent code | Add agent run tracking with stop reason |
| 8 | Tool output sanitization | absent | P1 | alpha | Tool results return raw DB data including user-generated `displayName`, `headline`, `bio` back into LLM context without any sanitization | Wrap tool outputs in structured format; sanitize user-generated fields |

Overall alignment: weak
Core agent infrastructure is present but safety envelope (caps, auth, sanitization) is entirely absent.

### Pattern: AI/LLM Patterns
Source: `.claude/skills/handle/ai-llm-patterns.md`

Summary: LLM calls exist via Mastra agents but lack defensive patterns.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 10 | Prompt injection defenses | absent | P1 | alpha | Searched: "sanitize", "injection", "prompt inject" in `apps/web`; only found unrelated CSS reference in `trait-editors.tsx`. No system prompt hardening or input sanitization. | Add structured system/user role separation; add injection-resistant system prompts |
| 7 | Output validation before persistence | absent | P1 | alpha | `persona-coach.ts:30` uses `z.any()` for the `value` parameter on `update_persona_field`; any LLM-generated value is written to DB without type checking | Replace `z.any()` with per-field schemas |
| 12 | LLM fallback/graceful degradation | absent | P1 | beta | Searched: "circuit breaker", "retry", "fallback", "graceful degrad" in `apps/web`; only found UI fallback strings, not LLM-level fallbacks. No timeout or retry on OpenAI calls. | Add timeout, retry with backoff, and user-facing degradation message |
| - | Model selection by task | partial | P3 | ga | Mastra agents are configured with model strings but all appear to use the same model class; no per-task routing | Consider routing vs synthesis model separation |

Overall alignment: weak
LLM integration works but has no defensive layers.

### Pattern: Data Authorization Patterns
Source: `.claude/skills/handle/data-authorization-patterns.md`

Summary: CASL is implemented with well-structured ability definitions, but the principal pattern is not threaded into service functions.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 5 | Service functions receive principal | absent | P0 | prototype | Server actions in `apps/web/app/actions/personas.ts` call `ensureUser()` which returns a userId string, not a `Principal` object. No `requirePermission()` calls in CRUD paths. CASL abilities exist in `packages/auth/src/abilities.ts` but `defineAbilitiesFor()` is never called from server actions. | Construct Principal at action boundary; call CASL abilities before DB operations |
| 3 | Session ownership verification | absent | P0 | prototype | `apps/web/app/actions/agents.ts:55` has `// TODO: Verify session belongs to user` on `sendCoachMessage`, `streamCoachMessage`, and `sendRecommenderMessage` | Implement the TODO: verify coach session belongs to authenticated user |
| - | Unauthorized case testing | absent | P2 | alpha | Searched for test files with "403", "Forbidden", "unauthorized"; no authZ tests exist in `*.test.ts` files | Add tests for unauthorized access to persona CRUD and agent actions |

Overall alignment: partial
The authZ model is designed (CASL abilities defined, permissions module exists) but not wired into the execution path.

### Pattern: Identity & Auth Patterns
Source: `.claude/skills/handle/identity-and-auth-patterns.md`

Summary: Clerk authentication is functional; session management is delegated to Clerk; MFA is Clerk-managed.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| - | Authentication on authenticated routes | present | - | - | `serverAuth.protect()` called in all server actions; Clerk proxy in `apps/web/proxy.ts` | - |
| - | Auth check outside try-catch | present | - | - | `ensureUser()` and `serverAuth.protect()` called before try-catch blocks in actions | - |
| 1 | MCP endpoint authentication | absent | P0 | prototype | (merged with finding 1 above) | - |
| - | Agent identity model | partial | P2 | beta | Agents run as the app process, not as named system actors. No `agent:persona-coach` identity for audit trail | Define named agent principals |

Overall alignment: partial
Clerk auth is solid for web surfaces; MCP surface is completely unprotected.

### Pattern: Data Classification Patterns
Source: `.claude/skills/handle/data-classification-patterns.md`

Summary: No data classification system exists in the codebase.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 9 | Data field classification | absent | P1 | alpha | Searched: "classification", "classify", "restricted", "confidential" in `packages/db`; only found taxonomy seed data strings (unrelated). No `classify()` helper, no per-field sensitivity metadata. | Add classification metadata co-located with Drizzle schema definitions |

Overall alignment: absent
No classification infrastructure. GDPR/CCPA compliance requires knowing which fields are PII.

### Pattern: Cost Management
Source: `.claude/skills/handle/cost-management.md`

Summary: Cost caps are declared in the Solution Profile but nothing enforces them.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 4 | Cost caps enforced | absent | P0 | prototype | (merged with finding 4) Profile declares `per_request_usd: 0.50`, `per_user_daily_usd: 10.00`, `per_agent_run_usd: 5.00` but no enforcement code exists | Implement per-call token budget and per-run cost accumulator |
| 14 | Token usage tracking | absent | P2 | beta | Searched: "usage", "token", "cost" tracking in `apps/web/lib/mastra/`; no usage recording | Add usage recording per LLM call with principal attribution |

Overall alignment: weak
Declared caps with zero enforcement is a baseline violation.

### Pattern: Rate Limiting & Quotas
Source: `.claude/skills/handle/rate-limiting-and-quotas.md`

Summary: No rate limiting exists anywhere in the codebase.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 6 | Rate limits on public surfaces | absent | P1 | alpha | Searched: "rateLimit", "rate_limit", "throttle", "upstash" across all `*.ts` and `*.json` files; only found unrelated admin page placeholder. No rate limiting middleware on MCP, server actions, or API routes. | Add Upstash ratelimit or equivalent; prioritize MCP and agent action endpoints |
| 16 | Database query timeouts | absent | P2 | beta | Searched: "statement_timeout", "timeout", "AbortController" in `packages/db`; the Neon connection in `packages/db/src/index.ts` has no timeout configuration | Add `statement_timeout` to Neon connection options |

Overall alignment: absent
No rate limiting or query timeouts at any layer.

### Pattern: Retention as Code
Source: `.claude/skills/handle/retention-as-code.md`

Summary: No retention policy declarations or enforcement exist.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 11 | Retention policies declared and enforced | absent | P1 | beta | Searched: "retention", "retainFor", "purge", "anonymize", "hardDelete" across codebase; zero matches. `activity_events`, `coach_sessions`, `query_logs` tables have no retention metadata. | Declare `RetentionPolicy` type; attach to sensitive tables; create enforcement cron |

Overall alignment: absent
GDPR/CCPA requires purpose-bound retention. Currently data accumulates indefinitely.

### Pattern: Service Layer Patterns
Source: `.claude/skills/handle/service-layer-patterns.md`

Summary: Server actions serve as a de facto service layer with Zod validation, but lack principal threading and structured error types.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 5 | Principal pattern | absent | P0 | prototype | (merged with finding 5) | - |
| - | Zod validation on mutations | present | - | - | `personas.ts:133` calls `createPersonaSchema.parse(raw)` before DB write | - |
| - | Soft-delete enforcement | not-applicable | - | - | Schema does not use soft-delete pattern (no `deletedAt` columns); hard deletes are used | - |
| 15 | Structured logging | absent | P2 | beta | No structured logger; `console.error` used in server actions without request IDs or structured fields | Add pino or equivalent with request ID propagation |

Overall alignment: partial
Validation is solid. Principal pattern and observability are missing.

### Pattern: Tool Design Patterns
Source: `.claude/skills/handle/tool-design-patterns.md`

Summary: Tool descriptions are well-written for the LLM, but parameter validation and output sanitization are lacking.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| - | Tool descriptions include "when to use" | present | - | - | `tools.ts:23-26` and `route.ts:50-53` have detailed "Use when" descriptions | - |
| 7 | Tool input validation | partial | P1 | alpha | Most parameters use typed Zod schemas, but `update_persona_field` uses `z.any()` for the value field -- the most dangerous parameter | Replace `z.any()` with discriminated union per field type |
| 8 | Tool output sanitization | absent | P1 | alpha | (merged with finding 8) Raw DB rows returned to LLM | Wrap in structured format; truncate long fields |
| - | Idempotency on write tools | absent | P2 | beta | `createContactRequest` and `update_persona_field` have no idempotency key | Add idempotency key to write tools |

Overall alignment: partial
Good descriptions; weak safety.

### Pattern: Non-Prod Data Safety
Source: `.claude/skills/handle/non-prod-data-safety.md`

Summary: Seed data exists and uses fabricated data, but no formal synthetic data strategy.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 13 | Non-prod data safety | partial | P1 | beta | Seed scripts in `packages/db/src/seed/` use handcrafted fake personas. However, no formal masking pipeline, no environment guards preventing prod data cloning, no documented policy. | Document non-prod data policy; add environment guard to seed scripts |

Overall alignment: partial
Seed data is synthetic by convention, not by enforcement.

### Pattern: Reliability Patterns
Source: `.claude/skills/handle/reliability-patterns.md`

Summary: No explicit reliability patterns (retries, circuit breakers, timeouts) on external calls.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 12 | LLM call fallback | absent | P1 | beta | (merged with finding 12) | - |
| 16 | External call timeouts | absent | P2 | beta | (merged with finding 16) | - |
| - | Error boundaries | present | - | - | `apps/web/app/error.tsx` and `apps/web/app/(dashboard)/error.tsx` exist; `loading.tsx` exists for dashboard | - |

Overall alignment: partial
Error boundaries present; external call resilience absent.

### Pattern: Caching Strategy
Source: `.claude/skills/handle/caching-strategy.md`

Summary: No caching layer exists.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 17 | Caching on hot read paths | absent | P2 | beta | Searched: "cache", "revalidate", "unstable_cache" in `apps/web`; no caching directives. Every read hits DB directly. | Add Next.js `unstable_cache` or in-memory cache on hot paths (dashboard, persona list, community list) |

Overall alignment: absent
No caching at any tier.

### Pattern: Agent Evals and Observability
Source: `.claude/skills/handle/agent-evals-and-observability.md`

Summary: Profile explicitly declares `eval_framework: none` and `observability: []`.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 18 | Eval regression suite | absent | P2 | ga | No eval framework, no golden dataset, no adversarial cases. Profile acknowledges `eval_framework: none`. | Choose eval framework (promptfoo/evalite); create initial golden dataset |
| 19 | LLM observability traces | absent | P2 | ga | `ai.observability: []` in profile. Searched: "langfuse", "langsmith", "helicone", "trace" in `apps/web`; only found unrelated `traceId` in mock data. | Integrate Langfuse or equivalent; wire hierarchical traces |

Overall alignment: not-applicable (explicitly deferred in profile)
Both gaps are acknowledged; findings exist as a ledger for when the project is ready.

### Pattern: Feature Flags & Configuration
Source: `.claude/skills/handle/feature-flags-and-config.md`

Summary: No feature flag infrastructure.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 20 | Feature flag infrastructure | absent | P3 | ga | Searched: "feature flag", "launchdarkly", "posthog", "openfeature" across codebase; no flag evaluation runtime. Community type seeds reference flag-like strings but these are data categories, not code flags. | Add PostHog, LaunchDarkly, or env-var-based flag system when approaching GA |

Overall alignment: absent (expected at this stage)

### Pattern: Database Migration Playbook
Source: `.claude/skills/handle/database-migration-playbook.md`

Summary: Drizzle config exists but versioned migration files are not tracked.

| # | Story title | Status | Base | Stage | Evidence | Minimum fix |
|---|-------------|--------|------|-------|----------|-------------|
| 21 | Versioned migration files | absent | P3 | ga | `packages/db/drizzle.config.ts` exists; `bun run db:generate` and `bun run db:migrate` commands are declared in CLAUDE.md. But `packages/db/drizzle/` directory is empty -- no SQL migration files are tracked in git. Current workflow uses `db:push` for direct schema application. | Run `bun run db:generate` to create initial migration; commit SQL files; switch from `db:push` to `db:migrate` workflow |

Overall alignment: partial
Schema is well-defined; migration discipline is deferred.

### Pattern: Bug Fix Discipline
Source: `.claude/skills/handle/bug-fix-discipline.md`

Summary: Pattern is process-oriented; no codebase artifacts to evaluate.

Overall alignment: not-applicable (process pattern, not infrastructure)

### Pattern: Capacity and Scaling
Source: `.claude/skills/handle/capacity-and-scaling.md`

Summary: Early-stage project on serverless (Vercel + Neon); capacity patterns are GA concerns.

Overall alignment: not-applicable at current stage

### Pattern: List View Patterns
Source: `.claude/skills/handle/list-view-patterns.md`

Summary: Dashboard surfaces exist with browse views for personas, communities, etc.

Overall alignment: partial (functional but no formal pattern documented)

### Pattern: Frontend Performance Patterns
Source: `.claude/skills/handle/frontend-performance-patterns.md`

Summary: Next.js App Router with server components by default; Turbopack for dev.

Overall alignment: partial (framework defaults are sound; no explicit performance budget or measurement)

### Pattern: Field Lifecycle
Source: `.claude/skills/handle/field-lifecycle.md`

Summary: Metadata-driven trait rendering follows the sibling trace pattern well.

Overall alignment: present

### Pattern: Data Authorization Engines
Source: `.claude/skills/handle/data-authorization-engines.md`

Summary: CASL is implemented correctly as an engine; the gap is in wiring (covered by finding 5).

Overall alignment: partial (engine present, wiring absent)

### Pattern: Verification Patterns (build)
Source: `.claude/skills/build/verification-patterns.md`

Summary: Vitest is configured; three test files exist for utility functions. No authZ or integration tests.

Overall alignment: partial

## Issues created

> This section is appended to by `/check-alignment issues <numbers>`. Each
> row records which finding was turned into which Linear issue and when.
> Re-running `issues` for a finding already listed here will warn and skip
> unless `--force` is passed.

| # | Story title | Linear ID | Created | Status |
|---|-------------|-----------|---------|--------|
| 1 | McpServer can reject unauthenticated tool calls in McpEndpoint | [PER-5](https://linear.app/personus/issue/PER-5) | pre-existing | Backlog |
| 2 | User can trust that agent tool calls enforce ownership in AgentLoopExecution | [PER-6](https://linear.app/personus/issue/PER-6) | pre-existing | Backlog |
| 3 | User can trust that coach session ownership is verified in CoachChatView | [PER-35](https://linear.app/personus/issue/PER-35) | 2026-04-16 | Backlog |
| 4 | PersonaCoachAgent can operate within declared cost caps in AgentLoopExecution | [PER-7](https://linear.app/personus/issue/PER-7) | pre-existing | Backlog |
| 5 | User can trust that service functions receive a principal in Api | [PER-14](https://linear.app/personus/issue/PER-14) | pre-existing | Backlog |
| 6 | McpServer can enforce per-principal rate limits in McpEndpoint | [PER-19](https://linear.app/personus/issue/PER-19) | pre-existing | Backlog |
| 7 | User can trust that LLM outputs are validated before persistence in AgentLoopExecution | [PER-26](https://linear.app/personus/issue/PER-26) | 2026-04-16 | Backlog |
| 8 | User can trust that tool outputs are sanitized before re-entering LLM context in AgentLoopExecution | [PER-27](https://linear.app/personus/issue/PER-27) | 2026-04-16 | Backlog |
| 9 | Admin can classify data fields by sensitivity level in Api | [PER-16](https://linear.app/personus/issue/PER-16) | pre-existing | Backlog |
| 10 | User can trust that prompt injection defenses exist in CoachChatView | [PER-28](https://linear.app/personus/issue/PER-28) | 2026-04-16 | Backlog |
| 11 | User can trust that data retention policies are enforced in AuditLogWrite | [PER-30](https://linear.app/personus/issue/PER-30) (sub of [PER-25](https://linear.app/personus/issue/PER-25)) | 2026-04-16 | Backlog |
| 12 | User can trust that LLM calls have fallback behavior in CoachChatView | [PER-37](https://linear.app/personus/issue/PER-37) | 2026-04-16 | Backlog |
| 13 | User can trust that non-prod environments never contain real PII in Api | [PER-36](https://linear.app/personus/issue/PER-36) | 2026-04-16 | Backlog |
| 14 | PersonaCoachAgent can track token usage and cost per run in AgentLoopExecution | — | merged into [PER-7](https://linear.app/personus/issue/PER-7) + [PER-9](https://linear.app/personus/issue/PER-9) on 2026-04-16 | already covered |
| 15 | User can trust that structured logging captures request context in Api | — | merged into [PER-17](https://linear.app/personus/issue/PER-17) on 2026-04-16 | already covered |
| 16 | User can trust that database queries have timeouts in Api | [PER-20](https://linear.app/personus/issue/PER-20) | pre-existing | Backlog |
| 17 | User can benefit from caching on hot read paths in Dashboard | — | deferred 2026-04-16 | per user direction — P2, wait for real hot paths to surface |
| 18 | PersonaCoachAgent can be evaluated against regression datasets in AgentLoopExecution | [PER-8](https://linear.app/personus/issue/PER-8) | pre-existing | Backlog |
| 19 | User can benefit from LLM observability traces in AgentLoopExecution | [PER-9](https://linear.app/personus/issue/PER-9) | pre-existing | Backlog |
| 20 | User can benefit from feature flags for safe rollout in Api | — | deferred 2026-04-16 | per user direction — P3, GA concern |
| 21 | User can benefit from database migrations tracked in version control in Api | — | dropped 2026-04-16 | Drizzle migrations already in packages/db/src/migrations/ — finding was incorrect |

Findings 14, 15, 17, 20, 21 handled on 2026-04-16: #14 and #15 are covered by existing issues; #17 and #20 deferred per user direction; #21 is dropped as already satisfied by Drizzle.

## Re-run instructions

- Full analysis: `/check-alignment`
- Single pattern: `/check-alignment <pattern-slug>`
- Create issues from this report: `/check-alignment issues <numbers> --report=docs/check-alignment-2026-04-16.md`
