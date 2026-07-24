---
type: spec
title: "Platform & Operations — Monorepo Migration"
description: "Migrating the Personus codebase from a single Next.js app to a Turborepo monorepo with two apps (consumer + admin) and five shared packages. This spec covers the exact package boundaries,…"
status: current
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations — Monorepo Migration

> Date: 2026-02-24
> Status: Draft
> Depends on: `00-prd.md`
> Primary actors: Developer

Migrating the Personus codebase from a single Next.js app to a Turborepo monorepo with two apps (consumer + admin) and five shared packages. This spec covers the exact package boundaries, Turborepo configuration, Vercel deployment setup, import rewiring plan, and step-by-step migration order. The migration is mechanical — no behavior changes, no new features, no schema modifications.

---

## 1. Package Boundaries

### Overview

Five directories become shared packages. Everything else stays in the consumer app. The decision principle: code that both apps need is a package; code only the consumer app needs stays in `apps/web/`.

### Package Map

```
CURRENT LOCATION              →  PACKAGE                 SIZE      DEPS
─────────────────────────     ─  ──────────────────────  ────────  ─────────────────────
lib/constants.ts              →  @personus/constants     14.9 KB   (none)
types/index.ts                →  @personus/types         11.7 KB   (none)
lib/db/ (schema, seed, queries, index)
                              →  @personus/db            ~300 KB   @personus/constants
lib/validations/ (9 files)    →  @personus/validations   20.8 KB   @personus/constants
lib/auth/ (6 files)           →  @personus/auth          33.5 KB   @personus/db (lazy)

STAYS IN apps/web/lib/        WHY
─────────────────────────     ──────────────────────────
lib/mastra/                   AI agents — consumer-only
lib/personas/                 Completeness, layout, profile summary — consumer display
lib/embeddings/               Vector search — consumer-only
lib/mcp/                      MCP exposure — consumer-only
lib/import/                   Data import — consumer-only
lib/mock-data.ts              Dev fixture
lib/utils.ts                  cn() helper — app-specific (admin gets its own copy)
```

### Dependency Graph

```
@personus/constants  ──→ (no deps — pure const arrays and types)
@personus/types      ──→ (no deps — pure interfaces)
@personus/db         ──→ @personus/constants
@personus/validations ─→ @personus/constants
@personus/auth       ──→ @personus/db (lazy dynamic import in permissions.ts only)
```

No circular dependencies. The `auth → db` link uses `await import('@personus/db')` inside functions to avoid module-load-time cycles.

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | Developer can extract `@personus/constants` as a standalone package | Zero deps, leaf node |
| 1.2 | Developer can extract `@personus/types` as a standalone package | Zero deps, leaf node |
| 1.3 | Developer can extract `@personus/db` with schema, seed, queries, and connection | Depends on `@personus/constants` |
| 1.4 | Developer can extract `@personus/validations` from lib/validations/ | Depends on `@personus/constants` |
| 1.5 | Developer can extract `@personus/auth` from lib/auth/ | Depends on `@personus/db` (lazy) |
| 1.6 | Developer can move remaining app code to `apps/web/` | After all packages extracted |

---

## 2. Target Directory Structure

### Overview

The monorepo uses Turborepo workspaces with Bun as package manager. Each package exports raw TypeScript (Just-in-Time compilation) — no build step needed for packages.

### Structure

```
personus/
├── apps/
│   ├── web/                              ← Consumer app (app.personus.ai)
│   │   ├── app/                          ← Next.js App Router (pages, actions, api)
│   │   │   ├── (dashboard)/              ← Authenticated routes
│   │   │   ├── actions/                  ← Server actions
│   │   │   ├── api/                      ← API routes (MCP)
│   │   │   ├── p/                        ← Public persona pages
│   │   │   ├── s/                        ← Shadow persona pages
│   │   │   ├── claim/                    ← Claim flow
│   │   │   ├── endorse/                  ← Endorsement pages
│   │   │   ├── dev/                      ← Dev tools
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/                   ← Consumer UI components
│   │   │   ├── ui/                       ← shadcn/ui (consumer-specific)
│   │   │   ├── coach-chat.tsx
│   │   │   ├── dashboard-nav.tsx
│   │   │   ├── trait-displays.tsx
│   │   │   ├── trait-editors.tsx
│   │   │   └── ...
│   │   ├── hooks/                        ← React hooks
│   │   ├── lib/                          ← App-specific utilities
│   │   │   ├── mastra/                   ← AI agents
│   │   │   ├── personas/                 ← Completeness, layout, profile summary
│   │   │   ├── embeddings/               ← Vector search
│   │   │   ├── mcp/                      ← MCP tools
│   │   │   ├── import/                   ← Data import system
│   │   │   ├── mock-data.ts
│   │   │   └── utils.ts                  ← cn() helper
│   │   ├── public/                       ← Static assets
│   │   ├── proxy.ts                      ← Clerk middleware (Next.js 16)
│   │   ├── next.config.ts
│   │   ├── postcss.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/                            ← Control plane (admin.personus.ai)
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                  ← Admin dashboard home
│       │   ├── globals.css
│       │   ├── taxonomies/               ← Taxonomy management
│       │   ├── traits/                   ← Trait metadata management
│       │   ├── settings/                 ← System settings
│       │   ├── users/                    ← User management
│       │   ├── communities/              ← Community moderation
│       │   └── audit/                    ← Audit log viewer
│       ├── components/
│       │   ├── ui/                       ← shadcn/ui (admin-specific)
│       │   └── ...
│       ├── lib/
│       │   └── utils.ts                  ← cn() helper (admin copy)
│       ├── proxy.ts                      ← Clerk middleware (admin Clerk app)
│       ├── next.config.ts
│       ├── postcss.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── constants/                        ← @personus/constants
│   │   ├── src/
│   │   │   └── index.ts                  ← From lib/constants.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                            ← @personus/types
│   │   ├── src/
│   │   │   └── index.ts                  ← From types/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                               ← @personus/db
│   │   ├── src/
│   │   │   ├── index.ts                  ← From lib/db/index.ts (lazy Proxy)
│   │   │   ├── queries.ts               ← From lib/db/queries.ts
│   │   │   ├── trait-metadata-loader.ts  ← From lib/db/trait-metadata-loader.ts
│   │   │   ├── schema/                   ← From lib/db/schema/ (13 files)
│   │   │   │   ├── index.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── personas.ts
│   │   │   │   ├── traits.ts
│   │   │   │   ├── shadow-personas.ts
│   │   │   │   ├── communities.ts
│   │   │   │   ├── community-types.ts
│   │   │   │   ├── endorsements.ts
│   │   │   │   ├── contact-requests.ts
│   │   │   │   ├── activity-events.ts
│   │   │   │   ├── coach-sessions.ts
│   │   │   │   ├── integrations.ts
│   │   │   │   └── guilds.ts
│   │   │   └── seed/                     ← From lib/db/seed/ (all files)
│   │   │       ├── index.ts
│   │   │       ├── trait-metadata.ts
│   │   │       ├── community-types.ts
│   │   │       ├── contact-preferences-defaults.ts
│   │   │       ├── taxonomies/           ← 14 taxonomy files
│   │   │       └── personas/             ← Persona fixture data
│   │   ├── drizzle.config.ts             ← From root drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── validations/                      ← @personus/validations
│   │   ├── src/
│   │   │   ├── index.ts                  ← From lib/validations/index.ts
│   │   │   ├── traits.ts
│   │   │   ├── personas.ts
│   │   │   ├── commerce.ts
│   │   │   ├── communities.ts
│   │   │   ├── contacts.ts
│   │   │   ├── endorsements.ts
│   │   │   ├── import.ts
│   │   │   └── mcp.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth/                             ← @personus/auth
│   │   ├── src/
│   │   │   ├── index.ts                  ← From lib/auth/index.ts
│   │   │   ├── provider.ts
│   │   │   ├── clerk.ts
│   │   │   ├── workos.ts
│   │   │   ├── abilities.ts
│   │   │   └── permissions.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── typescript-config/                ← Shared tsconfig presets
│       ├── base.json
│       ├── nextjs.json
│       └── package.json
│
├── turbo.json                            ← Turborepo task config
├── package.json                          ← Root workspace definition
├── biome.json                            ← Root linter config (applies to all)
├── .prettierrc                           ← Tailwind class sorting (applies to all)
├── vitest.config.ts                      ← Root test config (optional)
├── .gitignore
├── .env.example
├── CLAUDE.md
├── README.md
└── docs/                                 ← Specs stay at root (not in any app)
    ├── specs/
    ├── research/
    └── business-model/
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | Developer can create the Turborepo directory structure | Empty scaffold |
| 2.2 | Developer can scaffold the admin app with Next.js + shadcn/ui | Minimal: layout, home page, Clerk auth |
| 2.3 | Developer can create shared tsconfig presets | Base + Next.js configs |

---

## 3. Package Configuration

### Overview

Each package has a `package.json` and `tsconfig.json`. Packages use Just-in-Time compilation — they export raw TypeScript via the `exports` field, and each app's bundler (Turbopack) compiles them at build time. No `build` script needed in packages.

### Package Definitions

```jsonc
// packages/constants/package.json
{
  "name": "@personus/constants",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```jsonc
// packages/types/package.json
{
  "name": "@personus/types",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```jsonc
// packages/db/package.json
{
  "name": "@personus/db",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./queries": "./src/queries.ts",
    "./seed": "./src/seed/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/seed/index.ts",
    "db:seed:fresh": "bun run src/seed/index.ts --fresh"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "@personus/constants": "workspace:*",
    "drizzle-orm": "1.0.0-beta.15-859cf75"
  },
  "devDependencies": {
    "drizzle-kit": "1.0.0-beta.15-859cf75"
  }
}
```

```jsonc
// packages/validations/package.json
{
  "name": "@personus/validations",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./traits": "./src/traits.ts",
    "./personas": "./src/personas.ts",
    "./commerce": "./src/commerce.ts",
    "./communities": "./src/communities.ts",
    "./contacts": "./src/contacts.ts",
    "./endorsements": "./src/endorsements.ts"
  },
  "dependencies": {
    "@personus/constants": "workspace:*",
    "zod": "^4.3.6"
  }
}
```

```jsonc
// packages/auth/package.json
{
  "name": "@personus/auth",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./abilities": "./src/abilities.ts",
    "./permissions": "./src/permissions.ts",
    "./provider": "./src/provider.ts"
  },
  "dependencies": {
    "@casl/ability": "^6.8.0",
    "@clerk/nextjs": "^6.37.3",
    "@personus/db": "workspace:*",
    "svix": "^1.40.0"
  }
}
```

```jsonc
// packages/typescript-config/package.json
{
  "name": "@personus/typescript-config",
  "version": "0.0.0",
  "private": true
}
```

### Shared TypeScript Config

```jsonc
// packages/typescript-config/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "exclude": ["node_modules"]
}
```

```jsonc
// packages/typescript-config/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }]
  }
}
```

```jsonc
// apps/web/tsconfig.json
{
  "extends": "@personus/typescript-config/nextjs",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

```jsonc
// Package tsconfig (same for all packages)
// packages/constants/tsconfig.json, packages/types/tsconfig.json, etc.
{
  "extends": "@personus/typescript-config/base",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts"]
}
```

### Root Configuration

```jsonc
// package.json (root)
{
  "name": "personus",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "bun@1.1.42",
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=@personus/web",
    "dev:admin": "turbo dev --filter=@personus/admin",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "format:tailwind": "prettier --write \"**/*.{tsx,jsx}\" --ignore-path .gitignore",
    "check": "biome check --write . && prettier --write \"**/*.{tsx,jsx}\" --ignore-path .gitignore",
    "db:generate": "bun run --cwd packages/db db:generate",
    "db:push": "bun run --cwd packages/db db:push",
    "db:seed": "bun run --cwd packages/db db:seed",
    "db:seed:fresh": "bun run --cwd packages/db db:seed:fresh"
  },
  "devDependencies": {
    "turbo": "^2.6.0"
  },
  "engines": {
    "node": ">=20.9.0",
    "bun": ">=1.0.0"
  }
}
```

```jsonc
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
        "NEXT_PUBLIC_CLERK_SIGN_UP_URL"
      ]
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": { "cache": false },
    "db:push": { "cache": false },
    "db:seed": { "cache": false }
  },
  "globalEnv": [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "OPENAI_API_KEY",
    "MASTRA_LOG_LEVEL",
    "NODE_ENV"
  ],
  "globalDependencies": ["tsconfig.json"]
}
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | Developer can configure package.json for each shared package | workspace:* protocol |
| 3.2 | Developer can configure turbo.json with correct task graph | Build, dev, lint, test, db tasks |
| 3.3 | Developer can configure root package.json with workspace scripts | Proxy scripts to turbo/packages |
| 3.4 | Developer can configure shared tsconfig presets | base.json + nextjs.json |

---

## 4. Import Rewiring

### Overview

The migration rewrites imports from `@/lib/{package}` and `@/types` to `@personus/{package}`. This is the largest mechanical change — 182 import statements across ~100 files. Within packages, imports change from `@/lib/db/schema` to relative paths (`./schema`).

### Import Mapping

| Old Import | New Import | Files Affected |
|-----------|-----------|---------------|
| `from '@/lib/db'` | `from '@personus/db'` | 49 files (85 occurrences) |
| `from '@/lib/db/schema'` | `from '@personus/db/schema'` | (included above) |
| `from '@/lib/db/queries'` | `from '@personus/db/queries'` | (included above) |
| `from '@/lib/auth'` | `from '@personus/auth'` | 23 files (33 occurrences) |
| `from '@/lib/auth/abilities'` | `from '@personus/auth/abilities'` | (included above) |
| `from '@/lib/auth/permissions'` | `from '@personus/auth/permissions'` | (included above) |
| `from '@/lib/constants'` | `from '@personus/constants'` | 19 files (21 occurrences) |
| `from '@/lib/validations'` | `from '@personus/validations'` | 9 files (10 occurrences) |
| `from '@/types'` | `from '@personus/types'` | 33 files (33 occurrences) |

**Total:** ~182 import rewrites across ~100 files.

**Within packages** (internal imports become relative):

| Package | Old | New |
|---------|-----|-----|
| `@personus/db` schema files | `from '@/lib/db/schema/users'` | `from './users'` (already relative) |
| `@personus/db` schema files | `from '@/lib/constants'` | `from '@personus/constants'` |
| `@personus/db` seed files | `from '@/lib/db/schema'` | `from '../schema'` |
| `@personus/db` seed files | `from '@/lib/db'` | `from '..'` |
| `@personus/validations` | `from '@/lib/constants'` | `from '@personus/constants'` |
| `@personus/auth` permissions | `await import('@/lib/db')` | `await import('@personus/db')` |

**Doc files with references** (update but non-breaking):
- `CLAUDE.md`, `README.md`, `SETUP_GUIDE.md`, `UPDATES.md`
- `docs/foundation/authorization.md`
- `docs/decisions/single-codebase.md` (retire or update)
- `docs/decisions/package-summary-v2.md`
- Spec files in `docs/specs/` (update code examples)

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | Developer can rewrite all `@/lib/db` imports to `@personus/db` | 49 files, find-and-replace |
| 4.2 | Developer can rewrite all `@/lib/auth` imports to `@personus/auth` | 23 files |
| 4.3 | Developer can rewrite all `@/lib/constants` imports to `@personus/constants` | 19 files |
| 4.4 | Developer can rewrite all `@/lib/validations` imports to `@personus/validations` | 9 files |
| 4.5 | Developer can rewrite all `@/types` imports to `@personus/types` | 33 files |
| 4.6 | Developer can update intra-package imports to relative paths | Within packages |
| 4.7 | Developer can update documentation references | CLAUDE.md, README, specs |

---

## 5. Vercel Deployment

### Overview

Two Vercel projects connect to the same Git repository. Each has its own root directory, domain, and environment variables. Vercel auto-skips unchanged apps via Turborepo's `turbo-ignore`.

### Configuration

| Setting | Web Project | Admin Project |
|---------|-------------|---------------|
| Root Directory | `apps/web` | `apps/admin` |
| Framework Preset | Next.js (auto-detected) | Next.js (auto-detected) |
| Build Command | `turbo run build` | `turbo run build` |
| Output Directory | `.next` (default) | `.next` (default) |
| Install Command | `bun install` (auto) | `bun install` (auto) |
| Domain | `app.personus.ai` | `admin.personus.ai` |
| Ignored Build Step | `npx turbo-ignore` | `npx turbo-ignore` |

### Shared Environment Variables (both projects)

```
DATABASE_URL=...
OPENAI_API_KEY=...
```

### Per-Project Environment Variables

```
# Web project
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_web_...
CLERK_SECRET_KEY=sk_live_web_...
NEXT_PUBLIC_APP_URL=https://app.personus.ai

# Admin project
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_admin_...
CLERK_SECRET_KEY=sk_live_admin_...
NEXT_PUBLIC_APP_URL=https://admin.personus.ai
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | Developer can create Vercel project for consumer app with correct root directory | apps/web |
| 5.2 | Developer can create Vercel project for admin app with correct root directory | apps/admin |
| 5.3 | Developer can configure separate domains for each project | Subdomains |
| 5.4 | Developer can verify turbo-ignore skips unchanged apps | Push change to only one app |

---

## 6. App-Specific Configuration

### Overview

Each app retains its own Next.js config, PostCSS config, Clerk proxy, and globals.css. The consumer app's `package.json` includes all current app-level dependencies (Mastra, Radix, Framer Motion, etc.). The admin app starts lean.

### Consumer App Dependencies (apps/web/package.json)

Moves all current dependencies from root `package.json` except those claimed by packages:

```jsonc
{
  "name": "@personus/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ai-sdk/openai": "^1.0.9",
    "@casl/react": "^5.0.1",
    "@hookform/resolvers": "^5.2.2",
    "@mastra/core": "^1.2.0",
    "@personus/auth": "workspace:*",
    "@personus/constants": "workspace:*",
    "@personus/db": "workspace:*",
    "@personus/types": "workspace:*",
    "@personus/validations": "workspace:*",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.3",
    "@radix-ui/react-dialog": "^1.1.3",
    "@radix-ui/react-dropdown-menu": "^2.1.3",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.3",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-select": "^2.1.3",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "ai": "^4.1.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "fflate": "^0.8.2",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "next": "16.1.6",
    "next-intl": "^3.26.2",
    "next-themes": "^0.4.6",
    "papaparse": "^5.5.3",
    "radix-ui": "^1.4.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.71.1",
    "reactflow": "^11.11.4",
    "recharts": "^2.15.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "tw-animate-css": "^1.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@personus/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@tailwindcss/typography": "^0.5.15",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^22.10.5",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19.0.6",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^5.1.4",
    "jsdom": "^28.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3",
    "vitest": "^4.0.18",
    "ws": "^8.19.0"
  }
}
```

### Admin App Dependencies (apps/admin/package.json)

Starts lean — same shared packages, minimal UI dependencies:

```jsonc
{
  "name": "@personus/admin",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.37.3",
    "@personus/auth": "workspace:*",
    "@personus/constants": "workspace:*",
    "@personus/db": "workspace:*",
    "@personus/types": "workspace:*",
    "@personus/validations": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.469.0",
    "next": "16.1.6",
    "next-themes": "^0.4.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "tw-animate-css": "^1.0.0"
  },
  "devDependencies": {
    "@personus/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.6",
    "@types/react-dom": "^19.0.2",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3"
  }
}
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 6.1 | Developer can configure apps/web/package.json with correct dependencies | Move from root, add workspace refs |
| 6.2 | Developer can configure apps/admin/package.json with minimal dependencies | Lean start |
| 6.3 | Developer can configure per-app next.config.ts | Consumer keeps existing, admin starts minimal |
| 6.4 | Developer can configure per-app globals.css and PostCSS | Each app owns its styles |
| 6.5 | Developer can configure per-app Clerk proxy.ts | Separate Clerk apps |

---

## 7. Drizzle Config Migration

### Overview

The Drizzle config moves from root to `packages/db/`. The schema path changes from `./lib/db/schema/index.ts` to `./src/schema/index.ts`. Seed scripts run from within the db package.

### Updated Drizzle Config

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

// Strip pooler endpoint for schema operations
const rawUrl = process.env.DATABASE_URL ?? '';
const schemaUrl = rawUrl.replace('-pooler.', '.').replace(/[?&]channel_binding=[^&]*/g, '');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: schemaUrl },
});
```

### Seed Script Changes

Seed scripts move from `lib/db/seed/` to `packages/db/src/seed/`. Internal imports become relative:

```typescript
// Before (in lib/db/seed/index.ts):
import { db } from '@/lib/db';
import { traitMetadata } from '@/lib/db/schema';

// After (in packages/db/src/seed/index.ts):
import { db } from '..';
import { traitMetadata } from '../schema';
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 7.1 | Developer can move drizzle.config.ts to packages/db/ with updated paths | Schema path changes |
| 7.2 | Developer can update seed scripts to use relative imports | No more @/ paths |
| 7.3 | Developer can run db:push and db:seed from root via turbo proxy scripts | Same DX as before |

---

## Edge Cases

- [ ] **Bun `--filter` flag doesn't work.** Use `--cwd` instead: `bun add express --cwd apps/web`
- [ ] **Package imports within packages cannot use `@/*` alias.** Must use relative paths or `@personus/*` for cross-package imports. No path aliases inside packages.
- [ ] **`next-env.d.ts` in each app.** Each Next.js app generates its own — both go in `.gitignore` (Next.js regenerates them).
- [ ] **Drizzle `db:push` needs env vars.** Same workaround: `export $(grep -v '^#' .env.local | xargs) && bun run db:push`. Now runs from packages/db/.
- [ ] **Seed scripts with persona fixtures.** The persona seed (`lib/db/seed/personas/`) imports from `@/types` — these become `@personus/types` since they're in a package.
- [ ] **Clerk `@clerk/nextjs` in auth package.** The auth package imports from `@clerk/nextjs/server`. Both apps depend on `@clerk/nextjs`, but the auth package also needs it as a dependency. This is fine — Bun hoists shared deps.
- [ ] **Tailwind CSS v4 per-app.** Each app has its own `globals.css` with `@theme` configuration. The admin app can start with the same design tokens or define its own.
- [ ] **shadcn/ui per-app.** Each app runs `npx shadcn init` independently. Components are not shared (different apps may diverge in UI).
- [ ] **Vitest per-workspace.** Each app/package that has tests needs its own `vitest.config.ts`. Root `turbo test` runs all of them.
- [ ] **`.env.local` location.** Each app can have its own `.env.local`, OR use a root `.env.local` with Turbo's `globalEnv` to pass vars. Recommend root `.env.local` for dev (simpler) with per-project env vars in Vercel for production.
- [ ] **Doc files with code examples.** Update import paths in docs to reflect the new package imports. Non-blocking but prevents confusion.

---

## Test Criteria

**Smoke tests** (must pass before migration is considered complete):

- `bun install` from root succeeds (all workspaces linked)
- `turbo build` succeeds for both apps (consumer + admin)
- `turbo dev` starts both apps on different ports (3000, 3001)
- `turbo type-check` passes for all workspaces
- `turbo lint` passes for all workspaces
- `turbo test` runs all existing tests (44 tests pass)
- `bun run db:push` works from root
- `bun run db:seed` works from root
- Consumer app renders the same pages as before (visual regression check)
- Admin app renders the scaffold home page
- No `@/lib/db`, `@/lib/auth`, `@/lib/constants`, `@/lib/validations`, or `@/types` imports remain in code files

**Build verification:**

- `turbo build --filter=@personus/web` builds only the consumer app
- `turbo build --filter=@personus/admin` builds only the admin app
- Changing a file in `packages/db/` triggers rebuild of both apps
- Changing a file in `apps/web/` does NOT trigger rebuild of `apps/admin/`

---

## Implementation Order

1. **Install Turborepo** — `bun add -D turbo` at root. Story 2.1.
2. **Create directory scaffold** — `apps/web/`, `apps/admin/`, `packages/*/src/`. Story 2.1.
3. **Create shared tsconfig presets** — `packages/typescript-config/`. Story 2.3, 3.4.
4. **Extract @personus/constants** — Move `lib/constants.ts` → `packages/constants/src/index.ts`, create package.json. Story 1.1, 3.1.
5. **Extract @personus/types** — Move `types/index.ts` → `packages/types/src/index.ts`, create package.json. Story 1.2, 3.1.
6. **Extract @personus/db** — Move `lib/db/` → `packages/db/src/`, move `drizzle.config.ts`, create package.json. Story 1.3, 3.1, 7.1.
7. **Extract @personus/validations** — Move `lib/validations/` → `packages/validations/src/`, create package.json. Story 1.4, 3.1.
8. **Extract @personus/auth** — Move `lib/auth/` → `packages/auth/src/`, create package.json. Story 1.5, 3.1.
9. **Move consumer app to apps/web/** — Move `app/`, `components/`, `hooks/`, remaining `lib/`, `public/`, `proxy.ts`, `next.config.ts`, `postcss.config.js`. Story 1.6, 6.1.
10. **Create root package.json** — Workspace definition, turbo scripts. Story 3.3.
11. **Create turbo.json** — Task graph, env vars, global deps. Story 3.2.
12. **Rewrite imports in apps/web/** — All 182 import statements. Stories 4.1–4.5.
13. **Rewrite imports within packages** — Intra-package to relative, cross-package to @personus/*. Story 4.6.
14. **Update seed script imports** — Relative paths within packages/db/. Story 7.2.
15. **Run `bun install`** — Link all workspaces. Verify resolution.
16. **Run `turbo type-check`** — Fix any remaining type errors from import rewiring.
17. **Run `turbo build --filter=@personus/web`** — Verify consumer app builds.
18. **Run `turbo test`** — Verify all 44 tests pass.
19. **Scaffold admin app** — Minimal Next.js app with Clerk auth, home page, layout. Story 2.2, 6.2–6.5.
20. **Run `turbo build`** — Verify both apps build.
21. **Update documentation** — CLAUDE.md, README, import examples in specs. Story 4.7.
22. **Verify db:push and db:seed** — From root via turbo proxy scripts. Story 7.3.
23. **Configure Vercel projects** — Two projects, same repo, separate root directories. Stories 5.1–5.4.

Steps 1–18 are the migration. Steps 19–20 add the admin scaffold. Steps 21–23 are cleanup and deployment.

---

## Appendix: Linear Issue Mapping

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Extract @personus/constants package | `platform`, `monorepo` | — | — |
| 1.2 | Extract @personus/types package | `platform`, `monorepo` | — | — |
| 1.3 | Extract @personus/db package | `platform`, `monorepo` | 1.1 | — |
| 1.4 | Extract @personus/validations package | `platform`, `monorepo` | 1.1 | — |
| 1.5 | Extract @personus/auth package | `platform`, `monorepo` | 1.3 | — |
| 1.6 | Move consumer app to apps/web/ | `platform`, `monorepo` | 1.1–1.5 | — |
| 2.1 | Create Turborepo directory scaffold | `platform`, `monorepo` | — | — |
| 2.2 | Scaffold admin app with Next.js + Clerk | `platform`, `admin` | 1.6 | — |
| 2.3 | Create shared tsconfig presets | `platform`, `monorepo` | 2.1 | — |
| 3.1 | Configure package.json for all shared packages | `platform`, `monorepo` | 2.1 | — |
| 3.2 | Configure turbo.json with task graph | `platform`, `monorepo` | 2.1 | — |
| 3.3 | Configure root workspace scripts | `platform`, `monorepo` | 3.2 | — |
| 3.4 | Configure shared TypeScript config presets | `platform`, `monorepo` | 2.1 | — |
| 4.1 | Rewrite @/lib/db imports to @personus/db | `platform`, `monorepo` | 1.3, 1.6 | — |
| 4.2 | Rewrite @/lib/auth imports to @personus/auth | `platform`, `monorepo` | 1.5, 1.6 | — |
| 4.3 | Rewrite @/lib/constants imports to @personus/constants | `platform`, `monorepo` | 1.1, 1.6 | — |
| 4.4 | Rewrite @/lib/validations imports to @personus/validations | `platform`, `monorepo` | 1.4, 1.6 | — |
| 4.5 | Rewrite @/types imports to @personus/types | `platform`, `monorepo` | 1.2, 1.6 | — |
| 4.6 | Update intra-package imports to relative paths | `platform`, `monorepo` | 1.1–1.5 | — |
| 4.7 | Update documentation with new import paths | `platform`, `docs` | 4.1–4.6 | — |
| 5.1 | Create Vercel project for consumer app | `platform`, `deploy` | 4.1–4.6 | — |
| 5.2 | Create Vercel project for admin app | `platform`, `deploy` | 2.2 | — |
| 5.3 | Configure separate domains for each Vercel project | `platform`, `deploy` | 5.1, 5.2 | — |
| 5.4 | Verify turbo-ignore skips unchanged apps | `platform`, `deploy` | 5.3 | — |
| 6.1 | Configure apps/web/package.json | `platform`, `monorepo` | 1.6 | — |
| 6.2 | Configure apps/admin/package.json | `platform`, `admin` | 2.2 | — |
| 6.3 | Configure per-app next.config.ts | `platform`, `monorepo` | 1.6, 2.2 | — |
| 6.4 | Configure per-app globals.css and PostCSS | `platform`, `monorepo` | 1.6, 2.2 | — |
| 6.5 | Configure per-app Clerk proxy.ts | `platform`, `monorepo` | 1.6, 2.2 | — |
| 7.1 | Move drizzle.config.ts to packages/db/ | `platform`, `monorepo` | 1.3 | — |
| 7.2 | Update seed scripts to relative imports | `platform`, `monorepo` | 1.3 | — |
| 7.3 | Verify db:push and db:seed from root | `platform`, `monorepo` | 7.1, 7.2 | — |

**Conventions:**
- Story IDs use `[Section#].[Story#]` format
- Labels include `platform` (suite) and `monorepo`, `admin`, `deploy`, or `docs` (feature area)
- Blocked By reflects dependency chain — matches implementation order
- Estimates filled during planning, not spec writing
