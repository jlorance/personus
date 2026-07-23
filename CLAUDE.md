# Personus — repo guide

AI-native capability-discovery network. Monorepo (Turborepo + Bun workspaces).

## Commands
- `bun install` — install
- `bun run dev` — run the web app (http://localhost:3000)
- `bun run type-check` / `bun run lint` / `bun run test` — gates
- `bun run test:coverage` — Vitest coverage across packages
- `bun run test:load` — Artillery smoke (dev server must be running)
- DB: `bun run db:generate` → `db:migrate` → `db:seed` (needs `DATABASE_URL`)

## Layout
- `apps/web` — Next.js 16 app (CopilotKit agentic UI, server actions, MCP endpoint)
- `packages/db` — Drizzle V1 schema + services + seed (Neon Postgres, pgvector)
- `packages/authz` — CASL abilities (AuthZ) + DB-backed permission checks
- `packages/auth` — pluggable AuthN provider seam (Clerk default) + Principal
- `packages/flags` — OpenFeature feature-flag seam (DB provider default)
- `packages/ai` — Mastra instance + agents (Persona Coach / Discovery / Recommender)
- `packages/contact` — ContactRelay (private mediated contact)
- `packages/notifications` — NotificationTransport (in-app/email/digest)
- `packages/{constants,types,validations,logger,timeout}` — shared libs

## Conventions
- **ORM imports** come from `@personus/db/orm`, never `drizzle-orm` directly (single-instance rule — see `packages/db/src/orm.ts`).
- **Services** take a structural `ServicePrincipal` and must enforce BOTH a CASL `can()` gate AND ownership/visibility. Pure decision logic lives in `packages/db/src/services/gates.ts` (fully unit-tested).
- **Soft-delete** is the default; reads filter `isNull(deletedAt)`. Hard-delete is the CASL `purge` escape hatch.
- **Identity never reaches the LLM** — it rides in the Mastra `RequestContext` (`packages/ai/src/principal-context.ts`), and every agent tool is audited (`agent-audit.ts`, free text redacted).
- **Three "channel" concepts are distinct**: PlatformChannels (Mastra bots), ContactRelay (private contact), NotificationTransport (notices). Never reuse the word.
- **Logging** goes through `@personus/logger` only (Biome forbids `console.*` elsewhere).
- Package manager **bun**; the Neon **HTTP** driver has no interactive transactions (use compensating writes).

## Testing
Pure/domain logic is unit-tested to ~100% (`gates.ts`). DB-glue services, agents, and Next routes need a Postgres-backed integration harness (a provisioned DB + API keys) — see the coverage report; that suite is a follow-up.
