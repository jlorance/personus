---
type: prd
title: "Platform & Operations — Product Requirements Document"
description: "Personus has two products: the consumer app where users build personas, join communities, and get discovered — and the control plane where operators manage the system that powers it all."
status: current
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations — Product Requirements Document

> Date: 2026-02-24
> Status: Current
> Suite: `docs/domains/platform-ops/`

## 1. Core Thesis

Personus has two products: the **consumer app** where users build personas, join communities, and get discovered — and the **control plane** where operators manage the system that powers it all.

Today, every configurable element in Personus — trait types, taxonomy values, community type definitions, completeness weights, rate limits — is seed data deployed through code. This works at founding-team scale. It does not work when:

- A taxonomy needs a new skill category and the person who knows that isn't a developer
- A community type's feature flags need adjusting based on real usage
- Rate limits need to change in response to abuse without a deploy cycle
- Completeness scoring weights need tuning based on user behavior data

The control plane is a separate application that shares the same database but has its own deployment, domain, and authorization model. It is the operational backbone of Personus — the place where bootstrap data graduates into managed configuration.

## 2. Architectural Decision: Monorepo with Turborepo

The consumer app and admin app live in a single **Turborepo monorepo** with shared packages:

```
personus/
  apps/
    web/                    → Consumer app (app.personus.ai)
    admin/                  → Control plane (admin.personus.ai)
  packages/
    db/                     → @personus/db — schema, connection, seed, queries
    types/                  → @personus/types — shared TypeScript interfaces
    validations/            → @personus/validations — Zod schemas
    constants/              → @personus/constants — enums, string literals
    auth/                   → @personus/auth — Clerk + CASL
```

**Why separate apps, not admin routes in the consumer app:**
- Clean bundle separation — admin UI doesn't bloat the consumer bundle
- Independent deployment cadence — ship admin fixes without touching consumer
- Network isolation — admin can be restricted to VPN/internal network
- Different auth model — admin roles are distinct from consumer roles
- Cleaner codebase — no `if (isAdmin)` branching in consumer components

**Why a monorepo, not separate repos:**
- Shared database schema — one source of truth for Drizzle types
- Shared validation — same Zod schemas validate data in both apps
- Shared constants — enums and types stay in sync automatically
- Atomic changes — a schema change + both apps update in one PR
- Single CI pipeline — one place to run tests, lint, type-check

**Deployment model (Vercel):**
- Two Vercel projects, same Git repository
- Each project has its own root directory (`apps/web`, `apps/admin`)
- Separate domains: `app.personus.ai`, `admin.personus.ai`
- Same `DATABASE_URL`, separate Clerk keys (admin uses separate Clerk app with admin roles)
- Vercel auto-skips unchanged apps via Turborepo dependency graph

## 3. Key Concepts

| Concept | What It Is | Where It Lives |
|---------|-----------|---------------|
| **Bootstrap Data** | Seed data that initializes the system (trait metadata, taxonomies, community types, contact preference defaults). Deployed via code, but admin-editable at runtime. | `packages/db/src/seed/` (initial), DB tables (runtime) |
| **System Settings** | Key-value configuration that controls runtime behavior (rate limits, feature flags, scoring weights, AI model config). Not seed data — pure configuration. | `system_settings` table (new) |
| **Admin** | An authenticated user with admin privileges in the admin Clerk app. Can view/edit bootstrap data, system settings, users, and communities. | Clerk admin app + admin CASL abilities |
| **Audit Log** | Immutable record of every admin action — who changed what, when, with before/after values. | `admin_audit_log` table (new) |
| **Shared Package** | A TypeScript package in `packages/` that both apps import. Exports raw TypeScript (Just-in-Time compilation by each app's bundler). | `packages/*/` |

## 4. Two-Role Model

| Role | Who | What They Do |
|------|-----|-------------|
| **Admin** | Personus team member with admin Clerk account | Manage taxonomies, trait metadata, system settings, users, communities. View audit logs. |
| **Developer** | Engineer with repo access | Deploy schema changes, add new display/edit component types, modify seed data structure, create new trait categories |

**The boundary:** Admins can change *values* (taxonomy entries, display names, weights, flags). Developers own *structure* (display/edit configs that map to React components, schema definitions, new package code).

## 5. What's Admin-Manageable vs. Developer-Owned

| Data | Admin Can Change | Developer Owns |
|------|-----------------|---------------|
| **Trait metadata** | `displayName`, `displayOrder`, `category`, `isSearchable`, `isEndorsable`, `groupKey` | `displayConfig` (maps to components), `editConfig` (maps to components), `dataType`, `key` |
| **Taxonomies** | Full CRUD — add/edit/remove categories and values, reorder, bulk import/export | Taxonomy table schema, the combobox component that renders them |
| **Community types** | `displayName`, `description`, `icon`, `defaultVisibility`, `defaultJoinPolicy`, `maxMembers`, `featureFlags` | `communityTraitSchema`, `memberTraitSchema` (affect code behavior), `slug` |
| **Completeness weights** | Weight per trait key (move from hardcoded to `trait_metadata.completenessWeight`) | Scoring algorithm, dimension definitions |
| **System settings** | Rate limits, feature flags, AI model selection, default visibility | Settings table schema, how settings are read/cached in code |
| **Users** | View profiles, disable/enable accounts, view activity, impersonate for support | User schema, auth flow, Clerk configuration |
| **Communities** | View, moderate (flag/unflag), transfer ownership, adjust settings | Community schema, type system, membership logic |

## 6. Existing Code (Pre-Migration)

The current single-app codebase has significant implementation. The monorepo migration moves shared code to packages without rewriting it.

### Shared Code (→ packages/)

| Current Path | Package | Size | Notes |
|-------------|---------|------|-------|
| `lib/db/schema/` (13 files) | `@personus/db` | 27.5 KB | 20 tables, all indexes, all relations |
| `lib/db/seed/` (46 files) | `@personus/db` | 271 KB | Trait metadata, taxonomies, community types, persona fixtures |
| `lib/db/queries.ts` | `@personus/db` | 8.2 KB | 19 reusable query helpers |
| `lib/db/index.ts` | `@personus/db` | 0.6 KB | Lazy Proxy connection |
| `lib/auth/` (6 files) | `@personus/auth` | 33.5 KB | Clerk provider, CASL abilities, permissions orchestration |
| `lib/constants.ts` | `@personus/constants` | 14.9 KB | 30+ enum/literal exports |
| `lib/validations/` (9 files) | `@personus/validations` | 20.8 KB | Zod schemas for all entities |
| `types/index.ts` | `@personus/types` | 11.7 KB | 50+ interfaces |

### App-Specific Code (→ apps/web/)

| Current Path | Why It Stays | Size |
|-------------|-------------|------|
| `lib/mastra/` | AI agents are consumer-only | 30.4 KB |
| `lib/personas/` | Persona utilities (completeness, layout, profile summary) | 18.5 KB |
| `lib/embeddings/` | Vector search is consumer-only | 7.9 KB |
| `lib/mcp/` | MCP exposure is consumer-only | 12 KB |
| `lib/import/` | Data import is consumer-only | 40.7 KB |
| `app/`, `components/`, `hooks/` | Consumer UI | — |

### Cross-Package Dependency Graph

```
@personus/constants  →  (no deps — pure data)
@personus/types      →  (no deps — pure interfaces)
@personus/db         →  @personus/constants
@personus/validations → @personus/constants
@personus/auth       →  @personus/db (lazy import in permissions.ts only)
```

No circular dependencies. The `auth` → `db` dependency uses dynamic `await import()` to avoid module-load-time cycles.

## 7. Spec Breakdown

| File | What It Covers | Primary Actor |
|------|---------------|---------------|
| **`00-prd.md`** (this file) | Vision, architecture, inventory, admin boundary | — |
| **`01-monorepo-migration.md`** | Turborepo setup, package boundaries, Vercel deployment, import rewiring, migration steps | Developer |
| **`02-taxonomy-admin.md`** | CRUD for taxonomy categories and values, bulk import/export, search/filter, cache invalidation, audit trail | Admin |
| **`03-trait-metadata-admin.md`** | Edit admin-safe properties, reorder traits, toggle flags, add simple trait types, admin vs. developer boundary | Admin, Developer |
| **`04-system-settings.md`** | Settings table, configurable values (rate limits, feature flags, weights, AI config), admin settings page, defaults | Admin |
| **`05-user-and-community-ops.md`** | User lookup, account actions, community moderation, audit log viewer, impersonation for support | Admin |

## 8. Spec Index

| # | File | Status | Summary |
|---|------|--------|---------|
| 00 | **`00-prd.md`** (this file) | Current | Vision, monorepo architecture, admin boundary, code inventory |
| 01 | **`01-monorepo-migration.md`** | Current | Turborepo setup, package structure, Vercel config, migration plan |
| 02 | **`02-taxonomy-admin.md`** | Planned | Taxonomy CRUD, bulk ops, cache invalidation, audit |
| 03 | **`03-trait-metadata-admin.md`** | Planned | Metadata editing (safe properties), reordering, flag toggles |
| 04 | **`04-system-settings.md`** | Current | Settings table, rate limits, feature flags, weights, AI config |
| 05 | **`05-user-and-community-ops.md`** | Planned | User management, community moderation, audit log, impersonation |

## 9. Implementation Priority

### Wave 1: Infrastructure (Must Have)

The monorepo structure is the foundation — nothing else can ship without it.

1. **`01-monorepo-migration.md`** — Turborepo setup, package extraction, Vercel deployment

### Wave 2: Data Management (Should Have)

The highest-value admin features — managing the data that changes most frequently.

2. **`02-taxonomy-admin.md`** — Taxonomy CRUD (highest churn rate)
3. **`03-trait-metadata-admin.md`** — Trait metadata editing (medium churn)
4. **`04-system-settings.md`** — Runtime configuration (needed for rate limits, feature flags)

### Wave 3: Operations (Nice to Have for Launch)

Operational tooling for running the product.

5. **`05-user-and-community-ops.md`** — User/community management, audit log

## 10. Dependency Order

```
01-monorepo-migration (standalone — infrastructure)
  ↓
04-system-settings (needs admin app to exist)
  ↓
02-taxonomy-admin (needs settings for cache TTL config)
  ↓
03-trait-metadata-admin (needs taxonomy admin patterns to reuse)
  ↓
05-user-and-community-ops (needs all admin patterns established)
```

## 11. Decisions Log

| # | Decision | Date | Context |
|---|----------|------|---------|
| 1 | Separate admin app, not admin routes in consumer app | 2026-02-24 | Clean separation, independent deployment, no bundle bloat |
| 2 | Turborepo monorepo with shared packages | 2026-02-24 | Shared schema/types/validations, atomic changes, single CI |
| 3 | Bun as package manager (existing) | 2026-02-18 | Already in use, Turborepo 2.6+ has stable Bun support |
| 4 | Just-in-Time package compilation | 2026-02-24 | Packages export raw TypeScript, bundled by each app's Turbopack — no build step for packages |
| 5 | Separate Clerk app for admin auth | 2026-02-24 | Admin roles are distinct from consumer roles, separate session management |
| 6 | Seed data = bootstrap data with admin management | 2026-02-24 | All current seed data becomes admin-editable at runtime, seed scripts become initialization-only |
| 7 | Admin boundary: values (admin) vs. structure (developer) | 2026-02-24 | Admins change displayName/order/flags; developers own displayConfig/editConfig/schema |
| 8 | Vercel dual-project deployment | 2026-02-24 | Two Vercel projects, same repo, separate subdomains, auto-skip unchanged apps |
