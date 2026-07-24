---
type: foundation
title: Deployment — System Overview
description: "Deployment has three decisions that cross every other area and need to be stable:"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# Deployment — System Overview

> 2026-04-14 · Architectural decisions about how the system runs in production. The tech stack, dependencies, and setup instructions are truth in code — **`package.json`, `turbo.json`, `drizzle.config.ts`, and `.env.example` are authoritative**.
>
> **Where to find what:**
> - **Tech stack** (Node version, package manager, framework versions): `package.json`, `apps/*/package.json`, `packages/*/package.json`
> - **Workspace orchestration**: `turbo.json`, `package.json` `workspaces` field
> - **Environment variables**: `.env.example` — the canonical list
> - **Database schema**: `packages/db/src/schema/*.ts` (Drizzle) — see also [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md), [`../specs/communities/schema-spec.md`](/domains/communities/schema-spec.md)
> - **Commands**: `CLAUDE.md` §Commands — the canonical command reference
> - **Pre-trim implementation detail** (dashboard steps, MVP phase planning, testing strategy): archived at [`_archive/deployment.2026-04-12.md`](/archive/legacy/foundation/_archive/deployment.2026-04-12.md)
> - **ADRs**: [`../decisions/monorepo-turborepo-bun.md`](/decisions/monorepo-turborepo-bun.md), [`../decisions/database-choice.md`](/decisions/database-choice.md)

## The three architectural decisions

Deployment has three decisions that cross every other area and need to be stable:

### 1. Single-codebase monorepo on Turborepo + Bun

- **Monorepo**: Turborepo orchestration across `apps/web`, `apps/admin`, `packages/*`
- **Package manager**: Bun (not npm, not yarn, not pnpm)
- **Workspace layout**: one consumer app (`apps/web`) + one admin app (`apps/admin`) + five shared packages (`constants`, `types`, `db`, `validations`, `auth`, plus `typescript-config`)
- **Rationale**: shared types, Zod validations, and CASL abilities are used by every app. A split-repo design would require a private package registry or git submodules — more friction than the monorepo's costs.
- **Constraint this imposes**: packages export raw TypeScript (no build step per package). The consuming app's Turbopack bundler compiles them at build time. Transitive dependencies must be declared in the consuming app's `package.json`.

ADR: [`../decisions/monorepo-turborepo-bun.md`](/decisions/monorepo-turborepo-bun.md)

### 2. Vercel + Neon serverless

- **Hosting**: Vercel (Next.js 16 with Turbopack, edge-capable, preview deploys per branch)
- **Database**: Neon serverless Postgres with pgvector
- **Auth**: Clerk (hosted; no self-hosting overhead)
- **LLM**: OpenAI via `@ai-sdk/openai` (provider-abstracted — swap is a code change, not infrastructure)
- **Rationale**: zero infra ops at the current scale. Every piece is swappable via abstraction layers when cost or requirements change.
- **Constraint**: Vercel's serverless function limits shape some service-layer decisions. Long-running agent loops must stream or defer; bulk operations run as background jobs (not yet needed; when they arrive, expect Inngest or similar).

ADR: [`../decisions/database-choice.md`](/decisions/database-choice.md)

### 3. Three environments

| Environment | Hosting | Database | Agents | Clerk |
|---|---|---|---|---|
| **Development** | `bun run dev:web` (localhost:3000) | Neon dev branch | In-process Mastra | Clerk dev instance |
| **Preview** | Vercel preview per branch | Neon preview branch per PR | In-process Mastra | Clerk dev instance |
| **Production** | Vercel production | Neon prod | In-process Mastra | Clerk prod instance |

**Key properties:**
- **Neon branches are per-PR.** Preview deploys get their own database branch so schema changes can be tested in isolation. Branches auto-delete when the PR closes.
- **No staging environment** as a distinct tier. Preview deploys serve the staging role.
- **Mastra agents run in-process inside the Next.js app** in every environment — no separate agent service. See [`agents.md`](/foundation/agents.md) §Architectural decision — single codebase.

## Tech stack — read the code, not this file

The authoritative tech stack is in `package.json`. Key pinned versions at the time of this trim (2026-04-14):

- **Runtime**: Node.js ≥ 20.9, Bun as package manager
- **Framework**: Next.js 16 (App Router, Turbopack default bundler)
- **Language**: TypeScript (strict mode), React 19
- **Database**: Neon Postgres via `@neondatabase/serverless`, Drizzle ORM (`drizzle-orm`) with `pgvector` extension
- **Auth**: Clerk (`@clerk/nextjs`)
- **Authorization**: CASL (`@casl/ability`)
- **AI**: Mastra (`@mastra/core`) + Vercel AI SDK + OpenAI
- **UI**: shadcn/ui (Radix + Tailwind CSS v4)
- **Tooling**: Biome (lint + format), Prettier (Tailwind class sorting only), Vitest (tests)

Do not maintain a hand-written tech stack list in this file. When a dependency is added, removed, or upgraded, the change lands in `package.json` and the code is truth.

## Environment variables

Canonical list: `.env.example`. Required for runtime:

- `DATABASE_URL` — Neon connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- `CLERK_SECRET_KEY` — Clerk backend key
- `OPENAI_API_KEY` — OpenAI API key

Optional: `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `AUTH_PROVIDER`, `MASTRA_LOG_LEVEL`.

Setting these in Vercel: use `vercel env add`. Setting them locally: copy `.env.example` to `.env.local`. Both apps (`apps/web`, `apps/admin`) read from the root `.env.local`.

## What this file does NOT cover

- **MVP implementation phases** — tracker concern (Linear cycles/milestones). Original 4-phase plan is in [`_archive/deployment.2026-04-12.md`](/archive/legacy/foundation/_archive/deployment.2026-04-12.md) §MVP Implementation Phases if you want to see the historical phasing.
- **Testing strategy** — per-project concern. The vitest config + the `@testing-library/*` packages in `apps/web/package.json` are truth. A project-level testing philosophy belongs in a testing ADR, not a deployment doc.
- **Database setup walkthrough** — one-time onboarding step. Belongs in `README.md` or an onboarding guide, not foundation.
- **Design tokens** — UI concern, lives in `apps/web/app/globals.css` (Tailwind v4 `@theme inline`) and in [`../patterns/`](../patterns/). Not a deployment concern.
- **Drizzle schema code examples** — the code is truth. Schema reference lives in per-area schema specs.
- **Command reference** — lives in [`../../CLAUDE.md`](../../CLAUDE.md) §Commands.

## Open architectural questions

1. **Background jobs** — no framework yet. When bulk operations or scheduled tasks arrive, expect Inngest, QStash, or Vercel Cron. Decision blocks the Activity & Analytics feature spec in Communities.
2. **Observability platform** — `ai.observability: []` in the Solution Profile. Blocks the eval dashboard, cost dashboard, and trace viewer specs across Coaches + Discovery. Candidates: Langfuse, Sentry, Honeycomb.
3. **MCP endpoint authentication** — currently unauthenticated. Blocks external agent production launch. See [`api-surface.md`](/foundation/api-surface.md) §MCP tools and the Discovery PRD §Open decisions.

## Forward references

| Topic | Where it lives |
|---|---|
| Commands (install, dev, build, test, migrate) | [`../../CLAUDE.md`](../../CLAUDE.md) §Commands |
| Schema definitions | `packages/db/src/schema/*.ts` + per-area schema specs |
| Agent runtime | [`agents.md`](/foundation/agents.md) |
| Auth integration | [`authentication.md`](/foundation/authentication.md) |
| API surfaces (server actions, MCP, GraphQL) | [`api-surface.md`](/foundation/api-surface.md) |
| Cost caps | [`agents.md`](/foundation/agents.md) §Cost caps + CLAUDE.md `ai.cost_caps` |
| UI patterns / design tokens | [`../patterns/`](../patterns/) (if populated) + `apps/web/app/globals.css` |

## Displacement note

The pre-2026-04-14 version of this file (archived at [`_archive/deployment.2026-04-12.md`](/archive/legacy/foundation/_archive/deployment.2026-04-12.md)) contained ~615 lines:

| Legacy section | Lines | Why it displaced |
|---|---|---|
| §Tech Stack (detailed version list) | ~40 | Duplicates `package.json` |
| §Project Structure (directory tree) | ~60 | Duplicates the actual directory; also stale — referred to `lib/db/schema` before the monorepo migration to `packages/db/src/schema` |
| §Key Dependencies (list with rationales) | ~43 | Duplicates `package.json`; dependency rationales belong in ADRs |
| §Environment Setup (walkthrough) | ~25 | Belongs in README / onboarding guide |
| §Database Setup (Neon creation walkthrough, Drizzle schema examples, migration commands) | ~100 | Mix of README content and schema content; neither is foundation |
| §MVP Implementation Phases (4 phases, 30+ weeks of planning) | ~75 | Tracker content. Belongs in Linear cycles/milestones. |
| §Testing Strategy (unit, integration, E2E, seed data) | ~140 | Per-project concern. Truth is in vitest config + test files. |
| §Deployment (Vercel CLI walkthrough) | ~20 | Setup walkthrough; belongs in README |
| §Design Tokens (TypeScript const block) | ~60 | UI concern; lives in `globals.css` and Tailwind v4 |

**Nothing was lost.** Full archive at [`_archive/deployment.2026-04-12.md`](/archive/legacy/foundation/_archive/deployment.2026-04-12.md).

## History

- **2026-02-08** — Original 615-line `05-deployment.md` authored as a combined deployment plan + implementation phase document
- **2026-04-12** — Renamed to `deployment.md` during foundation reorganization
- **2026-04-14** — Trimmed to ~130 lines. Walkthroughs, phase planning, and tech-stack enumeration moved to archive or deleted in favor of pointers to code.
