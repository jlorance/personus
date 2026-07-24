---
type: decision
title: "Monorepo: Turborepo with Bun Workspaces"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Monorepo: Turborepo with Bun Workspaces

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus ships two deployable apps (`apps/web` consumer, `apps/admin` control plane) plus six shared packages (`constants`, `types`, `db`, `validations`, `auth`, `typescript-config`). The consumer and admin apps share the database schema, auth primitives, validation schemas, and type definitions — duplicating them would guarantee drift. A monorepo was the natural topology from day one.

The repo uses **Turborepo 2.8** for task orchestration and **Bun workspaces** for dependency management. Shared packages export raw TypeScript (no build step); each app's Turbopack/Next.js bundler JIT-compiles them. A root `package.json` `overrides` entry deduplicates `drizzle-orm` to prevent type conflicts across workspaces.

This ADR documents the monorepo topology and its conventions.

## Decision Drivers

1. **Shared schema + types across apps** — both apps consume `@personus/db`, `@personus/auth`, `@personus/validations`, etc. Duplication is not acceptable.
2. **Fast dev loop** — iterating on a shared package should hot-reload in both apps without a build step.
3. **Install speed** — `bun install` is significantly faster than npm/yarn/pnpm for large dependency trees.
4. **Task orchestration with caching** — `lint`, `type-check`, `test`, `build` should run in parallel across workspaces with content-hash caching.
5. **Low tooling friction** — we don't want to maintain custom build pipelines in each package.
6. **Vercel deploy compatibility** — both apps deploy to Vercel; the monorepo layout must not break their build detection.

## Decision

We use **Turborepo 2.8** + **Bun workspaces** in a single repo with `apps/*` and `packages/*` directories. Shared packages export raw TypeScript via subpath exports (`@personus/auth`, `@personus/auth/abilities`, etc.); apps JIT-compile them through Turbopack. Transitive deps must be declared in the consuming app's `package.json`, and shared deps are pinned via root `overrides` to prevent type conflicts from duplicate copies.

Bun is the package manager; npm and yarn are not supported. Turbo config lives in `turbo.json` and orchestrates `dev`, `build`, `lint`, `type-check`, `test`, and `format` across workspaces.

This satisfies all six drivers.

## Alternatives Considered

### Comparison Matrix

| Driver | Turbo + Bun (chosen) | Nx + pnpm | pnpm workspaces alone | Multi-repo |
|---|---|---|---|---|
| Shared packages | Yes | Yes | Yes | No (publish or git submodule) |
| JIT TS packages (no build) | Yes | Possible but not idiomatic | Yes | N/A |
| Install speed | Fastest (Bun) | Fast (pnpm) | Fast (pnpm) | N/A |
| Task orchestration + caching | Built-in (Turbo) | Built-in (Nx) | DIY or external | N/A |
| Learning curve | Low | Medium-high (Nx opinions) | Low | N/A |
| Vercel deploy compat | First-class | First-class | Workable | Per-repo |
| Tooling overhead | Minimal | Heavier (Nx plugins) | Minimal | High (duplication) |

### Turbo + Bun (chosen)
Fastest install, lowest ceremony, first-class Vercel support, and the task caching story is strong without the opinion tax of Nx. JIT TypeScript packages remove the build step entirely for shared code.

### Nx + pnpm (rejected)
Powerful and feature-rich — especially for very large monorepos — but its opinions about generators, executors, and project graphs are heavier than we need for two apps. The Nx advantage scales with codebase size; at our scale it is overhead.

### pnpm workspaces alone (rejected)
Works, but we'd still need a task orchestrator for parallel `lint`/`type-check`/`build`. Ending up at Turbo anyway without the install-speed benefit of Bun.

### Multi-repo (rejected)
Would force us to publish `@personus/*` packages (private registry overhead) or use git submodules (friction). Drift between apps becomes a constant maintenance tax. Rejected on principle for shared-schema systems.

## Consequences

### Positive
- Two apps share one schema, one auth layer, one validation layer. Zero drift.
- Fast install and hot-reload across package boundaries.
- Turbo's content-hash caching makes CI and local builds fast.
- Adding a new app or package is a directory + `package.json`, not a new repo + deployment pipeline.

### Negative
- **JIT compilation means transitive deps must be declared in the consuming app** — a subtle footgun. Contributors need to know that importing from a shared package can require adding that package's deps to their app.
- Bun has fewer eyeballs than npm/yarn/pnpm; occasional sharp edges with ecosystem tooling.
- `overrides` management is manual; a new transitive copy can break types silently.

### Risks
- **Bun ecosystem gaps.** A dep with native post-install scripts or lockfile-specific behavior could misbehave. Mitigation: report upstream, pin versions, consider pnpm escape hatch.
- **Overrides drift.** When bumping deps, the `overrides` pin must be audited. Mitigation: document in dep-upgrade checklist.
- **Turbo cache poisoning.** Stale cache keys on shared inputs could cause false-green builds. Mitigation: `turbo run --force` on suspicion; investigate cache keys in `turbo.json`.

## Implementation

- Root: `turbo.json`, `package.json` (with `workspaces` and `overrides`)
- Apps: `apps/web`, `apps/admin`
- Packages: `packages/constants`, `types`, `db`, `validations`, `auth`, `typescript-config`
- Import patterns: `@personus/*` for shared, `@/*` app-local
- Subpath exports: each package defines explicit subpath exports (not wildcard)

## References

- `docs/decisions/single-codebase.md` — topology decision that pairs with this one
- `docs/decisions/package-summary-v2.md` — package-layout background
- `turbo.json`, root `package.json`
- Onboarding report `docs/onboarding-2026-04-10.md` — P2 retroactive ADR item
