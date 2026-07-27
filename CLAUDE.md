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
- Local run: `brew install postgresql@17 pgvector`, then

  ```sh
  export TEST_DATABASE_URL="$(bun run --silent test:db)"   # throwaway cluster, TCP :54317
  bun run test
  bun run test:db down                                      # when finished
  ```

  Verified on PostgreSQL 17.10 + pgvector 0.8.5 (real `vector(1536)` columns + `ivfflat` indexes): 26 integration cases.
- **A skip is not a pass.** Without `TEST_DATABASE_URL` the suite prints `⚠️ REDUCED COVERAGE` and the service layer goes untested — Turbo's summary line reports only "N successful", so the skip is invisible at the top level. Set **`REQUIRE_TEST_DB=1`** anywhere the database is expected (CI, build machines) and a missing database fails the run instead of silently narrowing it.
- `TEST_DATABASE_URL` and `REQUIRE_TEST_DB` are declared in `turbo.json` under the `test` task's `env`. They must stay there: without them in the cache key, Turbo replays a cached *skip* even when the variable is set, and `bun run test` cannot be fixed by exporting it.
- Coverage: pure logic ~100% (`gates.ts`); the service layer is ~93% under the integration suite. Agents and Next routes still need e2e coverage.

## Fabrik profile

What the Fabrik skills read instead of hardcoding this repo's specifics. Everything else they need is in the sections above.

```yaml
tracker:      linear                     # team Personus, prefix PER-
base_branch:  main
gates:                                   # in order; all must pass before a PR merges
  - bun run type-check
  - bun run lint                         # biome check .
  - bun run authz:check
  - REQUIRE_TEST_DB=1 bun run test
gates_conditional:
  # test:e2e lives in apps/web, not the root — CI runs it with
  # working-directory: apps/web. Plain `bun run test:e2e` fails at the root.
  web:  bun run --filter @personus/web test:e2e
test_db:
  provision: bun run test:db create <unit>   # one database per delivery unit
  release:   bun run test:db drop   <unit>
  env:       TEST_DATABASE_URL               # already set on a build machine; never overwrite
diff_globs:                              # what obliges which gate
  source: '^(packages|apps)/.*\.(ts|tsx)$'
  test:   '\.(test|spec)\.[tj]sx?$'
  web:    '^apps/(web|admin)/'
  ui:     '^apps/(web|admin)/(app|components)/.*\.tsx$'
```

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
- **Full rebuild:** `bun run graph:build` — reproducibly reassembles the graph from the committed doc extraction (`.graphify/docs-semantic.json`) + live code AST, dropping `docs/archive/**` + `status: superseded` so it reflects only the shipped system (regenerates graph.json, GRAPH_REPORT.md, graph.html, wiki/). Fresh clone with no committed extraction → run `/graphify docs` once first.
- The graph is **current-only by design** — retired/archived docs are excluded, so a query never returns stale claims as if live.
