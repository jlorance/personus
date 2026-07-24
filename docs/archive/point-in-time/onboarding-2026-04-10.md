---
type: guide
title: SPAIDE Onboarding Report — Personus.ai
description: SPAIDE onboarding snapshot of the codebase at 2026-04-10.
status: superseded
tags: [archived]
timestamp: 2026-04-10
---

# SPAIDE Onboarding Report — Personus.ai

Generated: 2026-04-10

## Project Snapshot

- **Framework:** Next.js 16.1.6 App Router + React 19.2 + TypeScript (strict)
- **Monorepo:** Turborepo 2.8 + Bun workspaces (`apps/*`, `packages/*`)
- **Apps:** `apps/web` (consumer), `apps/admin` (admin scaffold)
- **Database:** Neon Postgres + pgvector, Drizzle ORM 1.0 beta (20 tables)
- **Auth:** Clerk (with provider abstraction — `@personus/auth/provider` → `clerk.ts` / `workos.ts`)
- **Authorization:** CASL (`@casl/ability`) — model: rbac-with-ownership
- **AI:** Mastra 1.2 + Vercel AI SDK + OpenAI (4 agents: Persona Coach, Recommender, Discovery, Community Coach)
- **MCP:** `@modelcontextprotocol/sdk` 1.17 — exposed via `apps/web/app/api/mcp/route.ts` (server)
- **UI:** shadcn/ui + Radix + Tailwind v4 (CSS-based config, OKLCH), Framer Motion, Recharts, React Flow
- **Lint/format:** Biome (primary) + Prettier (Tailwind sorting only)
- **Tests:** Vitest + Testing Library (jsdom)
- **Git state:** single commit on `main` (`fb255e9 First commit`). This is a brownfield drop — no history signal.
- **Route page.tsx count:** 33 (consumer app)
- **Schema files:** 13

## Discovered Areas (PRD candidates)

Detected under `apps/web/app/`:

| Area | Path | Actor | Notes |
|------|------|-------|-------|
| Marketing / landing | `app/page.tsx` | Visitor | Public root |
| Public persona pages | `app/p/`, `app/s/` | Visitor | `/p/[uri]` persona, `/s/` shadow |
| Claim flow | `app/claim/` | Visitor → User | Shadow persona claim via token |
| Endorsement flow | `app/endorse/` | Visitor → User | Endorsement entry |
| Dev utilities | `app/dev/` | Developer | Dev-only routes |
| Dashboard home | `app/(dashboard)/dashboard/` | User | Authenticated home |
| Personas | `app/(dashboard)/personas/` (list, new, `[uri]`, edit) | User | Full CRUD — highest activity |
| Communities | `app/(dashboard)/communities/` | User | New + list |
| Coach | `app/(dashboard)/coach/` | User | Mastra agent chat UX |
| Inbox | `app/(dashboard)/inbox/` | User | Contact requests |
| Explore | `app/(dashboard)/explore/` | User | Semantic discovery |
| Recommend | `app/(dashboard)/recommend/` | User | Recommender agent UI |
| Profile | `app/(dashboard)/profile/` | User | Master traits management |
| Settings | `app/(dashboard)/settings/` | User | Account settings |
| MCP endpoint | `app/api/mcp/route.ts` | McpClient | External MCP consumers |
| AI actions API | `app/api/ai-actions/` | User / Agent | Server-action bridge for agents |
| Admin control plane | `apps/admin/` | Admin | Scaffold only |

Cross-persona server actions in `apps/web/app/actions/`: `personas`, `communities`, `coach`, `agents`, `contacts`, `endorsements`, `explore`, `import`, `mcp`, `profile`, `shadows`.

## Discovered Actors (three-source reflection)

Sources:
- **Specs** (`docs/specs/`): Stories use `[Actor] can [capability]` pattern. Extracted: `User`, `Admin`, `Developer`, `System`.
- **Codebase:** Clerk auth, CASL abilities (`packages/auth/src/abilities.ts`), shadow-persona claim flow, MCP server, Mastra agents in `apps/web/lib/mastra/agents/` (`persona-coach.ts`, `recommender-and-discovery.ts`, implied community coach).
- **Profile:** none yet (CLAUDE.md has no SPAIDE Profile section).

Curated proposal:

### A1. Anonymous
| Name | Source | Notes |
|------|--------|-------|
| `Visitor` | codebase (public routes `/p`, `/s`, `/claim`, `/endorse`) | Public persona viewing + claim/endorse entry points |

### A2. Authenticated humans
| Name | Source | Notes |
|------|--------|-------|
| `User` | specs + codebase | Default authenticated actor — owns traits + personas |
| `Admin` | specs + codebase | Admin control plane (`apps/admin`) + spec references |
| `ShadowClaimant` | codebase | Claiming a shadow persona via token; `Visitor` upgrading to `User` — may or may not warrant a distinct actor. Flag for user review. |

### A3. AI agents (project-specific)
| Name | Source | Notes |
|------|--------|-------|
| `PersonaCoach` | codebase (`lib/mastra/agents/persona-coach.ts`) | Coaches users to build personas; acts on behalf of `User` |
| `RecommenderAgent` | codebase (`recommender-and-discovery.ts`) | Recommender coach |
| `DiscoveryAgent` | codebase (`recommender-and-discovery.ts`) | Semantic search agent |
| `CommunityCoach` | CLAUDE.md mention — no file yet | Listed in CLAUDE.md but not found in `lib/mastra/agents/` — **gap** |

Delegated-authority pattern: agents should act on behalf of a `User` principal. Not yet verified in code — flag for audit.

### A4. System actors
| Name | Source | Notes |
|------|--------|-------|
| `McpServer` | codebase (`app/api/mcp/route.ts`) | Exposes Personus tools to external MCP clients |
| `WebhookReceiver:clerk` | CLAUDE.md (`CLERK_WEBHOOK_SECRET`) | No handler route detected under `app/api/webhooks/` — **gap** |

### A6. External services
| Name | Source | Notes |
|------|--------|-------|
| `Clerk` | dep `@clerk/nextjs` | Auth provider |
| `Neon` | dep `@neondatabase/serverless` | Database |
| `OpenAI` | dep `@ai-sdk/openai` | LLM + embeddings |
| `Mastra` | dep `@mastra/core` | Agent framework |

**Deliberately collapsed:** `Developer` from specs → folded into `Admin` unless dev routes (`/dev`) warrant a distinct actor.

## Discovered Contexts

Source A (codebase) + Source B (specs) produce:

**Public (C1):** `Landing Page`, `Public Persona Page`, `Public Shadow Page`, `Claim Flow`, `Endorsement Flow`, `Sign In Flow` (Clerk)

**Core app (C3):**
- `Dashboard Home`
- `Persona Browse View`, `Persona Detail View`, `Persona Create Wizard`, `Persona Edit View`
- `Community Browse View`, `Community Create Dialog`
- `Coach Chat View`
- `Inbox View` (contact requests)
- `Explore View` (semantic search)
- `Recommend View`
- `Profile / Traits View`

**Settings (C4):** `Settings View`

**Admin (C7):** `Admin Dashboard` (scaffold), future `Tenant/User/Taxonomy` views per `docs/specs/platform-ops/`

**AI surfaces (C8):** `Persona Coach Chat`, `Recommender Chat`, `Discovery Search`, `MCP Tools Surface`

**Webhook/background (C9):** `Clerk Webhook Handler` (missing)

## Existing Artifacts Inventory

| Artifact | Status | Notes |
|----------|--------|-------|
| `README.md` | ✅ present | Modified; not reviewed for staleness |
| `CONTRIBUTING.md` | ❌ missing | |
| `CLAUDE.md` | ✅ present | Rich project guide; **no SPAIDE Profile, no Baseline, no Tracker Configuration** |
| `docs/decisions/` | ✅ present (3 ADRs) | `database-choice.md`, `package-summary-v2.md`, `single-codebase.md` |
| `docs/specs/` | ✅ present (4 suites, 40+ specs) | personas (10), communities (13), integrations (11), platform-ops (6) |
| `docs/foundation/` | ✅ present | 12 foundation docs (vision, data model, auth, etc.) |
| `docs/business-model/` | ✅ present | |
| `docs/research/` | ✅ present | |
| `.github/ISSUE_TEMPLATE/` | ❌ missing | |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌ missing | |
| `.claude/actors-and-contexts.md` | ❌ missing | Would be created in Phase 1 |
| SPAIDE Profile in CLAUDE.md | ❌ missing | |
| SPAIDE Project Baseline in CLAUDE.md | ❌ missing | |

## Implicit Decisions (retroactive ADR candidates)

ADRs already present: database choice, single-codebase architecture, package summary v2.

Missing ADRs for visible decisions:

| Decision | Evidence | Priority |
|----------|----------|----------|
| Auth provider: Clerk (with provider abstraction layer) | `@clerk/nextjs`, `packages/auth/provider.ts` | P1 |
| Authorization engine: CASL + rbac-with-ownership | `@casl/ability`, `packages/auth/abilities.ts`, `foundation/authorization.md` exists but not an ADR | P1 |
| ORM: Drizzle 1.0 beta (pinned via `overrides`) | `package.json` overrides, pre-release dep | P1 (pre-release risk) |
| AI agent framework: Mastra 1.2 (single-codebase) | `@mastra/core`, `lib/mastra/` | P2 (partly covered by single-codebase.md) |
| Vector embeddings in-DB via pgvector | schema + `lib/embeddings/` | P2 |
| MCP server exposure | `@modelcontextprotocol/sdk`, `api/mcp/route.ts` | P2 |
| Form stack: react-hook-form + Zod (`@personus/validations`) | deps + CLAUDE.md validation pattern | P3 |
| Styling: Tailwind v4 CSS-based config | `globals.css` `@theme inline` | P3 |
| Lint/format: Biome (ESLint/Prettier replacement except Tailwind sort) | `biome.json` | P3 |
| Test framework: Vitest | `vitest` dep | P3 |
| Turborepo monorepo + Bun workspaces | `turbo.json`, `package.json` workspaces | P2 |
| i18n: `next-intl` installed but unused | dep present, no `messages/` dir visible | P3 (decide: commit or remove) |

## PRD Backlog (one per area, prioritized)

Heavily documented already in `docs/specs/` — PRDs should be authored as retroactive wrappers around existing spec suites, mapping them to the SPAIDE PRD format.

| PRD | Status signal | Priority |
|-----|---------------|----------|
| Identity & Personas | 10 specs exist — wrap as PRD | P1 |
| Communities | 13 specs exist — wrap as PRD | P1 |
| Coach / AI agents | `foundation/agents.md` — no PRD | P1 |
| Inbox / Contact Requests | Server actions + route exist, no dedicated spec | P2 |
| Explore / Semantic Discovery | Route + embeddings lib, spec in research notes | P2 |
| Recommend | Route + recommender agent, no spec | P2 |
| Shadows & Claim Flow | Spec `07-shadow-personas.md` — wrap as PRD | P2 |
| Endorsements | Route + actions, schema table, no dedicated spec | P2 |
| Platform Ops (admin app) | 6 specs exist — wrap as PRD | P2 |
| Integrations (Discord/Slack/etc.) | 11 specs exist — largely unbuilt | P3 |
| Guilds | `docs/specs/communities/guilds-prd.md` + 5 schema tables, no UI yet | P3 |

## Quality Baseline Snapshot

Not computed in detail. Signals to investigate in Phase 4:
- Single git commit — no churn/hotspot signal
- Vitest configured; test file count not yet measured
- Drizzle ORM is on a pre-release (`1.0.0-beta.15-859cf75`) pinned via root `overrides` — upgrade strategy ADR recommended
- `next-intl` installed but no apparent locale messages — dead dep or TBD
- MCP server exposed publicly without visible OAuth — **security gap** to verify in `/audit`
- CLAUDE.md mentions `CommunityCoach` agent but file not present in `lib/mastra/agents/` — doc/code drift

## Recommended Onboarding Plan

### Phase 1: Foundation (~30 min)

- [ ] `/profile` — declare app shape (b2c social network, multi-tenant: **false** at user level; communities are not tenants), features (ai.centric: true, ai.mcp_server: true, ai.agent_framework: mastra, authz.model: rbac-with-ownership, engines: [casl])
- [ ] `/plan-baseline` — establish product principles from `docs/foundation/principles.md`
- [ ] Create `.claude/actors-and-contexts.md` from the curated proposal above (merge with shared baseline)
- [ ] Configure `## Tracker Configuration` in CLAUDE.md — tracker appears to be **none yet** (no Linear/GitHub Issues wiring detected); default to `manual` or prompt to set up

### Phase 2: Retroactive Documentation (~8–12 hours total)

- [ ] `/adr new "Auth provider: Clerk with provider abstraction"`
- [ ] `/adr new "Authorization: CASL + rbac-with-ownership"`
- [ ] `/adr new "ORM: Drizzle 1.0 beta (pre-release pinning strategy)"`
- [ ] `/adr new "AI agent framework: Mastra in single codebase"`
- [ ] `/adr new "Vector embeddings: pgvector in-database"`
- [ ] `/adr new "MCP server exposure"`
- [ ] `/adr new "Monorepo: Turborepo + Bun workspaces"`
- [ ] `/adr new "Styling: Tailwind v4 CSS-based config"`
- [ ] `/adr new "Lint/format: Biome"` (P3)
- [ ] `/adr new "Test framework: Vitest"` (P3)

### Phase 3: PRD Backlog (ongoing, weeks)

Wrap existing spec suites as PRDs (ordered by priority):

- [ ] `/plan-prd "Identity & Personas"` — wrap `docs/specs/personas/`
- [ ] `/plan-prd "Communities"` — wrap `docs/specs/communities/`
- [ ] `/plan-prd "Coach and AI Agents"` — wrap `docs/foundation/agents.md`
- [ ] `/plan-prd "Shadows and Claim Flow"`
- [ ] `/plan-prd "Inbox and Contact Requests"`
- [ ] `/plan-prd "Explore / Semantic Discovery"`
- [ ] `/plan-prd "Recommender"`
- [ ] `/plan-prd "Endorsements"`
- [ ] `/plan-prd "Platform Ops (Admin)"`
- [ ] `/plan-prd "Integrations"` (P3)
- [ ] `/plan-prd "Guilds"` (P3)

### Phase 4: Quality Baseline (ongoing)

- [ ] `/audit pre-pr` — establish baseline, triage P0/P1
- [ ] Verify MCP server auth posture (OAuth + PKCE for remote endpoints)
- [ ] Verify delegated-authority pattern in Mastra agents (on-behalf-of principal)
- [ ] Resolve CommunityCoach doc/code drift (file missing or doc stale)
- [ ] Decide on `next-intl` (use or remove)
- [ ] Set up Clerk webhook handler route (currently mentioned in env but no handler)
- [ ] Establish eval framework for AI agents (none detected — gap)
- [ ] Set up observability for LLM calls (none detected — gap)

## Suggested Tracker Issues

No tracker detected — these would be created in whatever tracker is adopted in Phase 1. Tagged by status: **[done]** = audit trail, **[open]** = drives work.

### Foundation (immediately done after Phase 1)
1. **[done] P1** SPAIDE profile established
2. **[done] P1** SPAIDE project baseline established
3. **[done] P1** `.claude/actors-and-contexts.md` created
4. **[done] P1** Tracker configuration documented in CLAUDE.md

### Retroactive ADRs (open)
5. **[open] P1** ADR: Auth provider — Clerk with provider abstraction (retroactive)
6. **[open] P1** ADR: Authorization — CASL + rbac-with-ownership (retroactive)
7. **[open] P1** ADR: ORM — Drizzle 1.0 beta pre-release pinning (retroactive)
8. **[open] P2** ADR: AI agent framework — Mastra single codebase (retroactive)
9. **[open] P2** ADR: Vector embeddings — pgvector (retroactive)
10. **[open] P2** ADR: MCP server exposure (retroactive)
11. **[open] P2** ADR: Monorepo — Turborepo + Bun (retroactive)
12. **[open] P3** ADR: Tailwind v4 CSS-based config (retroactive)
13. **[open] P3** ADR: Lint/format — Biome (retroactive)
14. **[open] P3** ADR: Test framework — Vitest (retroactive)

### PRD backlog (open)
15. **[open] P1** PRD: Identity & Personas
16. **[open] P1** PRD: Communities
17. **[open] P1** PRD: Coach and AI Agents
18. **[open] P2** PRD: Shadows and Claim Flow
19. **[open] P2** PRD: Inbox and Contact Requests
20. **[open] P2** PRD: Explore / Semantic Discovery
21. **[open] P2** PRD: Recommender
22. **[open] P2** PRD: Endorsements
23. **[open] P2** PRD: Platform Ops (Admin)
24. **[open] P3** PRD: Integrations
25. **[open] P3** PRD: Guilds

### Quality baseline (open)
26. **[open] P1** Run `/audit pre-pr` and triage P0/P1 findings
27. **[open] P0] Verify MCP server OAuth posture (public endpoint, no auth visible)
28. **[open] P0** Verify delegated-authority pattern in Mastra agents (IDOR risk)
29. **[open] P1** Adopt AI eval framework (none detected — gap for AI-centric app)
30. **[open] P1** Wire LLM observability (Langfuse/LangSmith/Helicone)
31. **[open] P2** Add Clerk webhook handler route (env var set but route missing)
32. **[open] P2** Resolve `CommunityCoach` agent doc/code drift
33. **[open] P3** Decide on `next-intl` usage or remove dep

## Next Action

- Run `/onboard execute --phase=1` to chain through Phase 1 with HITL gates
- Or run `/onboard issues` to create tracker issues (requires tracker setup first)
- Or pick individual skills from the checklists above
