---
type: decision
title: "ORM: Drizzle 1.0 beta with Pre-Release Pinning"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# ORM: Drizzle 1.0 beta with Pre-Release Pinning

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus runs on Neon Postgres with pgvector for semantic search. The schema spans 20 tables with a hybrid structured + JSONB design (`traits` columns on `users`, `personas`, `community_members`) and 1536-dim vector columns on `personas`, `communities`, and `shadow_personas`. The ORM must support Postgres-specific types (JSONB, vector, enum), work under Next.js 16 serverless/edge runtimes via `@neondatabase/serverless`, and produce type-safe queries that survive the JSONB-heavy schema.

The repo ships `drizzle-orm 1.0.0-beta.15-859cf75` (a pre-release) pinned via root `package.json` `overrides`, with schema files under `packages/db/src/schema/`. The `overrides` entry exists because transitive dependencies resolved multiple copies of `drizzle-orm`, which caused duplicate TypeScript types and build errors.

This ADR is retroactive and also needs to document the **pre-release risk posture** — running a 1.0 beta in production is a deliberate bet that must be owned.

## Decision Drivers

1. **Postgres-native type fidelity** — JSONB, pgvector, enum, arrays, and generated columns must all be expressible in schema.
2. **Edge/serverless runtime compatibility** — must work with `@neondatabase/serverless` (HTTP + WebSocket drivers).
3. **Type safety over JSONB** — the `traits` column holds heterogeneous structured data; queries should retain type information.
4. **Migration workflow** — schema-first with generated SQL migrations that reviewers can inspect.
5. **Query ergonomics** — SQL-like builder preferred over an active-record/entity model for a team comfortable with Postgres.
6. **Pre-release risk tolerance** — if we pick a beta, we must have a pinning strategy and an upgrade path.

## Decision

We use **Drizzle ORM** at the pinned pre-release version `1.0.0-beta.15-859cf75`. The pin lives in root `package.json` `overrides` to deduplicate transitive copies. Schema is defined in `packages/db/src/schema/` and exported via subpath exports from `@personus/db`. Migrations are generated via `drizzle-kit` (`bun run db:generate`) and reviewed as SQL in PRs.

Drizzle satisfies drivers 1–5 fully. Driver 6 (pre-release risk) is accepted with the following mitigations:
1. **Pin the exact build hash** (`-859cf75`) — no floating minor versions.
2. **Dedupe via `overrides`** — prevent transitive resolution from introducing a second incompatible copy.
3. **Upgrade only on deliberate ADR** — bumps require a review of changelog + migration test.

## Alternatives Considered

### Comparison Matrix

| Driver | Drizzle (chosen) | Prisma | Kysely | TypeORM |
|---|---|---|---|---|
| pgvector support | Yes, first-class in schema | Workable via `Unsupported("vector")` | Raw SQL or plugins | Limited |
| JSONB type safety | Strong (inferred shape) | Strong | Strong (with generated types) | Weak |
| `@neondatabase/serverless` | First-class | Works (with edge adapter) | Works | Works |
| Migration workflow | Generated SQL, reviewable | Prisma Migrate (abstracted) | None built-in | Entity-driven |
| Query ergonomics | SQL-like builder | Client abstraction | SQL-like builder | Repository / active record |
| Bundle size (edge) | Small | Large (engine binary historically; now improved) | Smallest | Large |
| Maturity (at decision time) | 1.0 beta | 5.x stable | Stable | Stable |
| JSONB query ergonomics | Good | Good | Raw | Awkward |

### Drizzle (chosen)
Best pgvector story, smallest edge footprint, SQL-like builder matches the team's mental model, and migrations are inspectable SQL. The 1.0 beta risk is real but bounded by the pinning strategy.

### Prisma (rejected)
Strong ergonomics and great tooling, but historical edge-runtime compatibility issues with Neon serverless, and pgvector support requires `Unsupported` escape hatches that defeat the type-safety benefit. Migration SQL is also less reviewable.

### Kysely (rejected)
Excellent query builder with minimal overhead, but lacks a built-in migration workflow — we'd have to assemble schema + migrations out of multiple tools. Drizzle's integrated migration generator is worth the trade.

### TypeORM (rejected)
Mature but active-record / repository model is a poor fit for a JSONB-heavy schema, and the decorator-based schema diverges from the "schema is data" philosophy. Rejected on fit.

## Consequences

### Positive
- First-class pgvector, JSONB, and Postgres enum support — the schema is expressible without escape hatches.
- Small bundle footprint works cleanly on Vercel edge / Neon HTTP driver.
- Generated SQL migrations are reviewable in PRs — no opaque migration DSL.
- The `@personus/db` package ships raw TS and is JIT-compiled by consumers, keeping the dev loop fast.

### Negative
- Running a 1.0 beta in production carries non-zero breakage risk on every upgrade.
- API surface has been unstable across beta releases — upgrades may require code changes.
- Smaller community than Prisma means fewer Stack Overflow answers and examples.

### Risks
- **Beta regression.** A new beta could break query behavior silently. Mitigation: integration tests against a real Neon dev branch before merging upgrades.
- **Transitive dedup fragility.** If a new dependency pulls in a different Drizzle version, the `overrides` pin must be updated. Mitigation: `bun install` output should be scanned during dependency upgrades.
- **1.0 final release.** When Drizzle ships 1.0 GA, we should upgrade promptly and remove the hash-pinned override.

## Implementation

- Schema files: `packages/db/src/schema/`
- Connection + lazy Proxy: `packages/db/src/index.ts`
- Drizzle config: `packages/db/drizzle.config.ts`
- Pin: root `package.json` `overrides: { "drizzle-orm": "1.0.0-beta.15-859cf75" }`
- Migration commands: `bun run db:generate`, `db:push`, `db:migrate`

## References

- `docs/decisions/database-choice.md` — Neon vs Supabase vs others (prior ADR)
- `packages/db/` — schema + queries
- Onboarding report `docs/onboarding-2026-04-10.md` — P1 retroactive ADR item
