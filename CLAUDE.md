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
- `packages/compression` — token-compression seam (noop default; Headroom provider off by default, gated on vetting)
- `packages/env` — zod-validated env declaration + `validateEnv()` fail-fast seam (ENV tier of the config split)
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
- Unit tests run everywhere: `bun run test` (Turbo) or `bun run test:coverage` (root Vitest, coverage).
- **Integration tests** (`packages/db/src/services/services.integration.test.ts`) exercise the service layer against a **real Postgres 17 + pgvector**. They run only when `TEST_DATABASE_URL` is set (CI uses the `pgvector/pgvector:pg17` service); otherwise they skip. The harness (`packages/db/src/test/harness.ts`) applies the committed migration; if pgvector is unavailable it falls back to a vector-free DDL so the suite still runs on plain Postgres.
- Local run: `brew install postgresql@17 pgvector`, `initdb` a throwaway cluster, `createdb`, then `TEST_DATABASE_URL=… bun run test:coverage`. Verified locally on PostgreSQL 17 + pgvector 0.8.5 (real `vector(1536)` columns + `ivfflat` indexes).
- Coverage: pure logic ~100% (`gates.ts`); the service layer is ~93% under the integration suite. Agents and Next routes still need e2e coverage.
