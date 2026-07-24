---
type: guide
title: Alignment Check — Personus.ai
description: Point-in-time alignment check against the 2026-04-10 codebase state.
status: superseded
tags: [archived]
timestamp: 2026-04-11
---

# Alignment Check — Personus.ai

Generated: 2026-04-11
Profile snapshot: 2026-04-10
Baseline snapshot: 2026-04-10
Scope: **Option C** (4 targeted patterns, not a full sweep)
Patterns analyzed: 4 of 25 applicable · Patterns gated out: 4 · Findings: 18 (P0: 8, P1: 8, P2: 2, P3: 0)

## About this report

This is a **scoped** alignment check, not a full sweep. Four patterns were chosen deliberately to surface *new* gaps not already covered by Linear issues PER-5 through PER-12:

- `data-classification-patterns` — to close out the PII-detection gap implied by the `no-pii-in-personas` baseline
- `retention-as-code` — to surface GDPR/CCPA retention gaps
- `service-layer-patterns` — to verify (not assume) that the `authz-at-service-layer` baseline holds across human routes, not just agents
- `rate-limiting-and-quotas` — to flesh out the rate-limit follow-up explicitly deferred from PER-5 (MCP OAuth)

A future run can expand the scope. Finding numbers below are stable — subsequent runs that add patterns must not renumber these.

## How to use this report

1. Browse the findings below. They are grouped by stage lens, then listed in full below the lenses.
2. When you want to create issues, pick finding numbers and run:
   `/alignment-check issues <numbers>`
   Examples: `issues 1,3,7` or `issues 2,5-8` or `issues 1-18`.
3. Issues are created using the project's `/improve` template. Titles are pre-written in the tables below.
4. Re-visit this report anytime — finding numbers are stable, and created issues are marked ✓ with their Linear ID in the **Issues created** section at the bottom.

## Gating decisions

**Analyzed:**
- `data-classification-patterns`: kept — `compliance: [gdpr, ccpa]` + `authz.sensitive_entities` declared + baseline `no-pii-in-personas`
- `retention-as-code`: kept — `compliance: [gdpr, ccpa]`
- `service-layer-patterns`: kept — `authz.enforcement_layers` contains `service`
- `rate-limiting-and-quotas`: kept — default + `ai.mcp_server: true`

**Deferred in this run (will be analyzed in a future run):**
- agent-evals-and-observability, agent-patterns, ai-llm-patterns, tool-design-patterns, mcp-server-patterns, cost-management, identity-and-auth-patterns, data-authorization-patterns, data-authorization-engines, non-prod-data-safety, api-design-patterns, caching-strategy, capacity-and-scaling, database-migration-playbook, feature-flags-and-config, field-lifecycle, frontend-performance-patterns, list-view-patterns, reliability-patterns, bug-fix-discipline, build/verification-patterns — 21 patterns not run

**Skipped by profile gating (would never be run):**
- `multi-tenancy-patterns`: `multi_tenant: false`
- `mcp-client-patterns`: `ai.mcp_client: false`
- `async-processing-patterns`: `features` does not contain `background-jobs` or `queues`

## Executive summary

The four patterns analyzed show **weak alignment across the board**. The strongest single signal is that the `authz-at-service-layer` baseline is declared but not mechanically enforced: server actions access the DB directly and check CASL at the action level rather than via a service function taking a `principal` parameter. The `no-pii-in-personas` baseline is similarly a policy without a mechanism — trait validation has no PII regex and no schema-level classification to drive redaction. Retention is entirely absent (no policy registry, no enforcement job, no account-deletion cascade). Rate limits are completely absent (no middleware, no quota store, no timeouts, no 429 responses). **Eight P0 findings and eight P1 findings** are actionable today at Personus's current stage. Three findings are merged or dropped because they overlap with PER-7 (cost caps) and PER-9 (observability). The two most consequential new findings are #1 (PII scan) and #2 (service-layer principal pattern for human routes) — these are baseline-declared and not yet mechanized.

## Findings by stage lens

Pick the lens that matches where you are today. Findings appear in every lens where they would matter — a finding in "Prototype / none" also shows up in "Beta / public." Finding numbers are stable across lenses.

### Lens: Prototype / exposure:none

The minimum bar. Everything here matters at the earliest stage — correctness, authz discipline, and PII handling that cannot be deferred.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 1 | User can trust that free-text trait fields are PII-scanned before persistence in Persona Edit View | P0 | data-classification-patterns | Add PII regex checks to trait Zod schemas in [packages/validations/src/traits.ts](packages/validations/src/traits.ts) for all free-text fields (skills.name, experience.description, qualities[]) — reject email/phone/address/SSN patterns per `no-pii-in-personas` baseline |
| 2 | User can trust that server actions enforce ownership at the service layer via a `principal` parameter in all authenticated views | P0 | service-layer-patterns | Extract mutation logic from [apps/web/app/actions/](apps/web/app/actions/) into `@personus/db/queries.ts` service functions taking `(principal: { userId, ability }, ...)` as first parameter; action becomes a thin bridge |
| 3 | User can trust that routes never query the DB directly without going through a service in all authenticated views | P0 | service-layer-patterns | Create `packages/db/src/services/` with per-entity service files (persona, community, endorsement); migrate every `db.select`/`insert`/`update` call in [apps/web/app/actions/](apps/web/app/actions/) into these services |
| 4 | System can classify every schema column so encryption, logging, and API projection are driven by declared sensitivity across all sensitive entities | P0 | data-classification-patterns | Add classification metadata to each table in [packages/db/src/schema/](packages/db/src/schema/) (public/internal/confidential/restricted tier per column) and a build-time validator that fails if a column has no classification |
| 5 | Logger can refuse to emit classified data automatically across server actions and agents | P0 | data-classification-patterns | Create `packages/db/src/lib/logger.ts` that reads classification metadata and redacts confidential/restricted fields before serializing — replace all `console.error` usages in [apps/web/lib/mcp/tools.ts](apps/web/lib/mcp/tools.ts) and agent files |
| 6 | DiscoveryAgent can avoid indexing PII fields in Semantic Search | P0 | data-classification-patterns | Gate embedding generation in [apps/web/lib/embeddings/](apps/web/lib/embeddings/) on classification metadata — skip fields marked `confidential` or `restricted` before sending content to OpenAI |

### Lens: Alpha / exposure:internal  (adds to the above)

What to address before inviting first external users.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 7 | Visitor and User can be rate-limited on public cost-bearing endpoints in the Landing Page, Public Persona Page, Explore View, Coach Chat View, and MCP Tools Surface | P0 | rate-limiting-and-quotas | Add `@upstash/ratelimit` middleware invoked from [apps/web/proxy.ts](apps/web/proxy.ts) and the MCP route handler; return 429 with `Retry-After` + `X-RateLimit-*` headers per pattern — covers `/api/ai-actions/search`, `/api/mcp`, coach chat server action, and public persona pages |
| 8 | System can enforce timeouts on every external dependency call (LLM, embeddings, DB) across agents and search | P0 | rate-limiting-and-quotas | Wrap `embed()` calls in [apps/web/lib/embeddings/](apps/web/lib/embeddings/) with 30s timeout, `agent.generate()` calls in [apps/web/lib/mastra/agents/](apps/web/lib/mastra/agents/) with 60s timeout, and DB queries via a 5s default — return 504 on breach |
| 9 | Admin can see a centralized retention policy registry for all sensitive tables in the Admin Dashboard | P1 | retention-as-code | Create `packages/db/src/retention-policy.ts` with a `RetentionPolicy` type (`retainFor`, `retentionFrom`, `action`, `reason`, `applicableFrameworks`) and a `retentionRegistry` array co-located with each table in [packages/db/src/schema/](packages/db/src/schema/) |
| 10 | Admin can verify that retention enforcement runs on a schedule with dry-run and row-cap safeguards in the Admin Dashboard | P1 | retention-as-code | Add a Vercel cron endpoint at `apps/web/app/api/cron/enforce-retention/route.ts` that reads the registry, runs daily, supports `dryRun` and `maxRowsPerRun` env gates, and logs each run to `activity_events` |
| 11 | User can request account deletion and trust that all personas, traits, contacts, shadows, and coach sessions are purged per retention policy in Settings View | P1 | retention-as-code | Create a `deleteUserAction` server action in [apps/web/app/actions/](apps/web/app/actions/) that cascades hard-delete across personas → shadow_personas → endorsements → contact_requests → coach_sessions → user_traits → users, with each step audited |
| 12 | System enforces request body size, JSON depth, and array length limits to prevent resource-exhaustion DoS on all API routes | P1 | rate-limiting-and-quotas | Extend `next.config.ts` body limits to cover `/api/*` routes (not just server actions), and add zod `.max()` refinements on array/string fields in [packages/validations/src/](packages/validations/src/) |
| 13 | System tracks short-term rate limit state in a distributed store that survives serverless cold starts across all public surfaces | P1 | rate-limiting-and-quotas | Provision an Upstash Redis instance and wire [apps/web/lib/rate-limit/store.ts](apps/web/lib/rate-limit/store.ts) to use it as the backing store for the middleware in #7 — prevents limit reset on deploy |
| 14 | System applies per-endpoint cost weighting so expensive operations consume more of a user's budget than cheap ones across the Coach Chat View and MCP Tools Surface | P1 | rate-limiting-and-quotas | Add `apps/web/lib/rate-limit/costs.ts` exporting `ENDPOINT_COSTS` (search=5, coach=100, get_persona=1, etc.) and multiply into the rate-limit check from #7 — complementary to PER-7 cost caps but distinct (dollars vs. request rate) |

### Lens: Beta / exposure:invite  (adds to the above)

Production-adjacent concerns. Don't let real users hit the system without these.

| # | Story title | Base | Pattern(s) | Minimum fix |
|---|-------------|------|------------|-------------|
| 15 | System can soft-delete sensitive entities and filter all reads by `deletedAt` across the query layer | P1 | service-layer-patterns | Add `deletedAt: timestamp` column to sensitive tables in [packages/db/src/schema/](packages/db/src/schema/), create a `softDelete()` helper, and add `isNull(deletedAt)` to every relevant `select`/`update` in the new service layer from #3 |
| 16 | Admin can anonymize tracking fields (IPs, timestamps, device fingerprints) while preserving aggregate analytics in coach_sessions and activity_events | P1 | retention-as-code | Extend the `RetentionPolicy` type from #9 with an `action: "anonymize"` variant and per-field support; implement field-level anonymization in the enforcement job from #10 |
| 17 | Developer can rely on structured JSON logging instead of `console.*` calls across server actions and agents | P2 | service-layer-patterns | Add `pino` (or similar) in a new `packages/logger/`, export a shared logger, and replace `console.*` calls repo-wide — integrate with the classification-aware redaction layer from #5 |
| 18 | System documents and enforces DB connection pool sizing assumptions for the Neon HTTP driver | P2 | rate-limiting-and-quotas | Verify `DATABASE_URL` uses the Neon pooler endpoint, add a comment in [packages/db/drizzle.config.ts](packages/db/drizzle.config.ts) naming the assumed pool size and monitoring path |

### Lens: GA / exposure:public  (adds to the above)

No new findings exclusive to GA in this scoped run. GA-stage concerns (capacity planning, feature flags, frontend perf, list-view patterns) will appear when their respective patterns are analyzed in a future run.

## Full finding list

Sorted by base priority → stage → title. Finding numbers are stable and match the lens tables above.

| # | Story title | Base | Stage | Pattern(s) | Labels |
|---|-------------|------|-------|------------|--------|
| 1 | User can trust that free-text trait fields are PII-scanned before persistence in Persona Edit View | P0 | prototype | data-classification-patterns | type:feature, area:personas, surface:web, risk:pii, risk:security-injection |
| 2 | User can trust that server actions enforce ownership at the service layer via a `principal` parameter in all authenticated views | P0 | prototype | service-layer-patterns | type:refactor, area:user, surface:web, risk:authz |
| 3 | User can trust that routes never query the DB directly without going through a service in all authenticated views | P0 | prototype | service-layer-patterns | type:refactor, area:user, surface:web, risk:authz |
| 4 | System can classify every schema column so encryption, logging, and API projection are driven by declared sensitivity across all sensitive entities | P0 | prototype | data-classification-patterns | type:infra, area:user, risk:pii, risk:migration |
| 5 | Logger can refuse to emit classified data automatically across server actions and agents | P0 | prototype | data-classification-patterns | type:infra, area:user, risk:pii, risk:security-secrets |
| 6 | DiscoveryAgent can avoid indexing PII fields in Semantic Search | P0 | prototype | data-classification-patterns | type:refactor, area:search, area:agents, surface:web, risk:pii |
| 7 | Visitor and User can be rate-limited on public cost-bearing endpoints in the Landing Page, Public Persona Page, Explore View, Coach Chat View, and MCP Tools Surface | P0 | alpha | rate-limiting-and-quotas | type:infra, area:user, surface:web, surface:mcp, risk:cost-cap |
| 8 | System can enforce timeouts on every external dependency call (LLM, embeddings, DB) across agents and search | P0 | alpha | rate-limiting-and-quotas | type:infra, area:agents, area:search, risk:cost-cap |
| 9 | Admin can see a centralized retention policy registry for all sensitive tables in the Admin Dashboard | P1 | alpha | retention-as-code | type:compliance, area:admin, surface:cp, risk:migration |
| 10 | Admin can verify that retention enforcement runs on a schedule with dry-run and row-cap safeguards in the Admin Dashboard | P1 | alpha | retention-as-code | type:infra, area:admin, surface:web, risk:migration, risk:pii |
| 11 | User can request account deletion and trust that all personas, traits, contacts, shadows, and coach sessions are purged per retention policy in Settings View | P1 | alpha | retention-as-code | type:feature, type:compliance, area:user, surface:web, risk:pii |
| 12 | System enforces request body size, JSON depth, and array length limits to prevent resource-exhaustion DoS on all API routes | P1 | alpha | rate-limiting-and-quotas | type:infra, area:user, surface:web, surface:mcp, risk:security-injection |
| 13 | System tracks short-term rate limit state in a distributed store that survives serverless cold starts across all public surfaces | P1 | alpha | rate-limiting-and-quotas | type:infra, area:user, surface:web, surface:mcp, risk:cost-cap |
| 14 | System applies per-endpoint cost weighting so expensive operations consume more of a user's budget than cheap ones across the Coach Chat View and MCP Tools Surface | P1 | alpha | rate-limiting-and-quotas | type:infra, area:agents, surface:web, surface:mcp, risk:cost-cap |
| 15 | System can soft-delete sensitive entities and filter all reads by `deletedAt` across the query layer | P1 | beta | service-layer-patterns | type:refactor, area:user, risk:migration, risk:authz |
| 16 | Admin can anonymize tracking fields (IPs, timestamps, device fingerprints) while preserving aggregate analytics in coach_sessions and activity_events | P1 | beta | retention-as-code | type:compliance, area:admin, risk:pii |
| 17 | Developer can rely on structured JSON logging instead of `console.*` calls across server actions and agents | P2 | beta | service-layer-patterns | type:refactor, type:chore, area:user |
| 18 | System documents and enforces DB connection pool sizing assumptions for the Neon HTTP driver | P2 | beta | rate-limiting-and-quotas | type:chore, type:infra, area:user |

## Merged or dropped findings

Findings the per-pattern agents raised that were deduplicated, merged into present issues, or dropped as out of scope:

| Raw finding | Outcome | Reason |
|---|---|---|
| `rate-limiting` #9 (quota tracking per-user) | **Dropped — covered by PER-7** | PER-7 (Mastra cost-cap middleware) already tracks per-user/per-agent-run dollar budgets. Rate limits in #7/#13/#14 are a distinct layer (request rate, not dollars). |
| `rate-limiting` #10 (observability signals) | **Dropped — covered by PER-9** | PER-9 (LLM observability) handles trace spans, dashboards, and alert rules. |
| `data-classification` #11 (admin dashboard for encryption view) | **Dropped — N/A at this stage** | Admin app is a scaffold; per-finding agent marked N/A. Re-surface when Admin PRD lands. |
| `data-classification` #12 (multi-dimensional classification) | **Dropped — P3/ga** | Low-signal at current stage; the level-based tier from #4 is sufficient until GA. |
| `data-classification` #14 (persona denormalization) | **Dropped — already satisfied** | Baseline `profile-is-master-personas-are-lenses` covers this and the schema already implements it. Agent marked present. |
| `service-layer` #6 (pagination on list endpoints) | **Dropped — already partial** | `getPublicPersonas()` in queries.ts has pagination; fix is localized and not a pattern-level gap worth an issue. |
| `service-layer` #8 (terminal state transitions) | **Dropped — N/A** | No workflow/state-machine entities in the current schema. |
| `service-layer` #9 (per-module fetch wrapper) | **Dropped — N/A** | External APIs go through SDKs (OpenAI via Vercel AI SDK), not raw fetch. |
| `retention` #4 (retention run logging) | **Merged into #10** | Part of the same enforcement-job story. |
| `retention` #5 (drift audit query) | **Merged into #9** | Registry + drift check are a single deliverable. |
| `retention` #6 (dry-run and row cap) | **Merged into #10** | Safety gates are inseparable from the enforcement job. |
| `retention` #7 (env-agnostic policy) | **Merged into #9** | Part of the registry design. |
| `retention` #8 (per-field retention) | **Merged into #16** | Anonymize action covers field-level. |
| `retention` #12 (anonymize action) | **Merged into #16** | Same finding. |
| `data-classification` #1 (PII-classified traits) | **Merged into #1** | Same gap as the validation-layer finding #7; kept as #1 with both evidence sources. |
| `data-classification` #7 (PII regex on trait validation) | **Merged into #1** | Same as above. |
| `rate-limiting` #1/#2/#3/#4 (per-endpoint rate limits) | **Merged into #7** | Single middleware fix covers search, coach, MCP route, and MCP tools. |
| `rate-limiting` #5 (proper 429 responses) | **Merged into #7** | Part of the same middleware. |
| `rate-limiting` #13/#14 (per-action cost weighting) | **Merged into #14** | Single cost-weighting concern. |
| `service-layer` #1/#2/#5/#12 (principal parameter) | **Merged into #2** | Same gap, multiple evidence citations. |
| `service-layer` #11 (cascading soft-delete) | **Merged into #15** | Soft-delete + cascade are a single deliverable. |

## Per-pattern analysis

The raw output of each per-pattern agent, preserved verbatim for evidence traceability. These are the source of truth for the merged findings above.

### Pattern: Data Classification Patterns
Source: [.claude/skills/handle/data-classification-patterns.md](.claude/skills/handle/data-classification-patterns.md)

Overall alignment: **weak**

Rationale: Personus declares compliance with GDPR/CCPA and has explicit baseline principle `no-pii-in-personas` (non-negotiable, no waiver). However, the codebase has **zero implementation** of the schema-level classification pattern that makes PII detection enforceable. Activity logs exist but do not redact; MCP tools filter by visibility preference, not by field sensitivity; API responses do not project fields; and trait validation lacks PII regex checks. The baseline principle is a **policy without mechanism**. Classification is a foundational pattern — absence means every PII decision becomes a point of human judgment, and every new field is a potential breach.

Raw claim count: 14 (6 mapped to findings #1, #4, #5, #6; 3 merged; 3 dropped as N/A or out of scope; 2 marked present/partial without an actionable delta).

### Pattern: Retention as Code
Source: [.claude/skills/handle/retention-as-code.md](.claude/skills/handle/retention-as-code.md)

Overall alignment: **weak**

Rationale: The SPAIDE profile declares `compliance: [gdpr, ccpa]` and lists 8 sensitive_entities. The codebase has foundations — `expiresAt` columns on `contact_requests` and `shadow_personas`, basic `activity_events` audit logging — but lacks the three critical components: (1) centralized `RetentionPolicy` registry, (2) scheduled enforcement job, (3) drift-detection audit. The compliance controls matrix is documented in audit-data-governance but not wired to the codebase. Hard-deletion exists for personas but not user accounts, and soft-deletes in endorsements lack scheduled purge jobs.

Raw claim count: 12 (3 mapped to findings #9, #10, #11, #16; 6 merged; 3 marked partial without an independent delta).

### Pattern: Service Layer Patterns
Source: [.claude/skills/handle/service-layer-patterns.md](.claude/skills/handle/service-layer-patterns.md)

Overall alignment: **weak**

Rationale: Service-layer discipline is established at the permission/authorization layer (CASL + abilities are defined) but not enforced at the data mutation layer. Human route handlers (server actions) perform direct DB access and derive `userId` from request rather than accepting a `principal` parameter as specified in CLAUDE.md baseline `authz-at-service-layer`. Soft-delete infrastructure is absent. Field selection, pagination, and structured logging are not systematic. The principal-parameter pattern — core to the baseline — is not implemented for human routes. (PER-6 tracks this gap for Mastra agents separately.)

Raw claim count: 12 (4 mapped to findings #2, #3, #15, #17; 4 merged; 2 N/A; 2 already partial).

### Pattern: Rate Limiting & Quotas
Source: [.claude/skills/handle/rate-limiting-and-quotas.md](.claude/skills/handle/rate-limiting-and-quotas.md)

Overall alignment: **weak**

Rationale: Rate limiting and quotas are completely absent from the codebase. No `@upstash/ratelimit`, `p-throttle`, or equivalent library is installed. Public cost-bearing endpoints (search, coach, MCP server, MCP tools) are completely unguarded, creating runaway-cost and abuse risks. CLAUDE.md states cost caps but no enforcement exists. This is the highest-priority missing infrastructure in the project after the PII and service-layer gaps.

Raw claim count: 15 (5 mapped to findings #7, #8, #12, #13, #14, #18; 5 merged; 2 dropped as covered by PER-7/PER-9; 3 marked partial or environment-specific).

## Issues created

> This section is appended to by `/alignment-check issues <numbers>`. Each row records which finding was turned into which Linear issue and when.

| # | Story title | Linear ID | Created | Status |
|---|-------------|-----------|---------|--------|
| 1 | User can trust that free-text trait fields are PII-scanned before persistence in Persona Edit View | [PER-13](https://linear.app/personus/issue/PER-13) | 2026-04-11 | Backlog |
| 2 | User can trust that server actions enforce ownership at the service layer via a `principal` parameter in all authenticated views | [PER-14](https://linear.app/personus/issue/PER-14) | 2026-04-11 | Backlog |
| 3 | User can trust that routes never query the DB directly without going through a service in all authenticated views | [PER-15](https://linear.app/personus/issue/PER-15) | 2026-04-11 | Backlog |
| 4 | System can classify every schema column so encryption, logging, and API projection are driven by declared sensitivity across all sensitive entities | [PER-16](https://linear.app/personus/issue/PER-16) | 2026-04-11 | Backlog |
| 5 | Logger can refuse to emit classified data automatically across server actions and agents | [PER-17](https://linear.app/personus/issue/PER-17) | 2026-04-11 | Backlog |
| 6 | DiscoveryAgent can avoid indexing PII fields in Semantic Search | [PER-18](https://linear.app/personus/issue/PER-18) | 2026-04-11 | Backlog |
| 7 | Visitor and User can be rate-limited on public cost-bearing endpoints in the Landing Page, Public Persona Page, Explore View, Coach Chat View, and MCP Tools Surface | [PER-19](https://linear.app/personus/issue/PER-19) | 2026-04-11 | Backlog |
| 8 | System can enforce timeouts on every external dependency call (LLM, embeddings, DB) across agents and search | [PER-20](https://linear.app/personus/issue/PER-20) | 2026-04-11 | Backlog |
| 9 | Admin can see a centralized retention policy registry for all sensitive tables | [PER-29](https://linear.app/personus/issue/PER-29) (sub of [PER-25](https://linear.app/personus/issue/PER-25)) | 2026-04-16 | Backlog |
| 10 | Admin can verify that retention enforcement runs on a schedule with dry-run and row-cap safeguards | [PER-30](https://linear.app/personus/issue/PER-30) (sub of [PER-25](https://linear.app/personus/issue/PER-25)) | 2026-04-16 | Backlog |
| 11 | User can request account deletion and trust that all personas, traits, contacts, shadows, and coach sessions are purged per retention policy in Settings View | [PER-31](https://linear.app/personus/issue/PER-31) (sub of [PER-25](https://linear.app/personus/issue/PER-25)) | 2026-04-16 | Backlog |
| 12 | System enforces request body size, JSON depth, and array length limits to prevent resource-exhaustion DoS on all API routes | [PER-32](https://linear.app/personus/issue/PER-32) | 2026-04-16 | Backlog |
| 13 | System tracks short-term rate limit state in a distributed store that survives serverless cold starts across all public surfaces | [PER-33](https://linear.app/personus/issue/PER-33) | 2026-04-16 | Backlog |
| 14 | System applies per-endpoint cost weighting so expensive operations consume more of a user's budget than cheap ones across the Coach Chat View and MCP Tools Surface | [PER-34](https://linear.app/personus/issue/PER-34) | 2026-04-16 | Backlog |
| 15 | System can soft-delete sensitive entities and filter all reads by `deletedAt` across the query layer | — | deferred 2026-04-16 | per user direction — defer (Beta-phase concern) |
| 16 | Admin can anonymize tracking fields (IPs, timestamps, device fingerprints) while preserving aggregate analytics in coach_sessions and activity_events | [PER-38](https://linear.app/personus/issue/PER-38) | 2026-04-16 | Backlog |
| 17 | Developer can rely on structured JSON logging instead of `console.*` calls across server actions and agents | — | merged into [PER-17](https://linear.app/personus/issue/PER-17) on 2026-04-16 | covered by classification-aware logger |
| 18 | System documents and enforces DB connection pool sizing assumptions for the Neon HTTP driver | [PER-39](https://linear.app/personus/issue/PER-39) | 2026-04-16 | Backlog |

Finding 15 (soft-delete) deferred per user direction 2026-04-16: Beta-stage concern, not needed before external-user invites. Finding 17 was absorbed by PER-17 (which delivers a structured, classification-aware logger that already replaces `console.*`).

## Re-run instructions

- Full analysis: `/alignment-check`
- Expand scope (run additional patterns): `/alignment-check <pattern-slug>`
- Create issues from this report: `/alignment-check issues <numbers> --report=docs/alignment-check-2026-04-11.md`

## Notes on scope

This was **Option C** — a targeted 4-pattern run to avoid duplicating the 8 issues already in Linear (PER-5..PER-12). A future `/alignment-check` run should expand to the other 21 gated patterns, particularly:

- `mcp-server-patterns`, `agent-patterns`, `cost-management`, `ai-llm-patterns` — will refine PER-5, PER-6, PER-7 with additional claims
- `identity-and-auth-patterns` — likely partial overlap with PER-10 Clerk webhook
- `tool-design-patterns` — tool interface conventions across agents and MCP
- `api-design-patterns`, `reliability-patterns`, `caching-strategy`, `capacity-and-scaling` — quality-of-service concerns
- `non-prod-data-safety` — GDPR/CCPA concern not covered here
- `feature-flags-and-config`, `frontend-performance-patterns`, `list-view-patterns`, `database-migration-playbook`, `bug-fix-discipline`, `field-lifecycle`, `build/verification-patterns` — general hygiene

Finding numbers `19+` are reserved for the next run.
