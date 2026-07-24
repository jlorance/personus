---
type: guide
title: Docs bundle conventions (OKF profile)
description: How this docs/ bundle is structured, the frontmatter every file carries, and what status values mean.
status: current
tags: [foundation]
timestamp: 2026-07-24
---

# Docs bundle conventions (OKF profile)

This `docs/` directory is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (OKF) knowledge bundle: plain Markdown files, each carrying a YAML frontmatter block, cross-linked with ordinary Markdown links. It is designed to be read by humans and consumed by agents (e.g. `/graphify`).

## Frontmatter

Every concept file (every `.md` except the reserved `index.md` and `log.md`) begins with:

```yaml
---
type: foundation | spec | decision | guide | research | prd   # OKF-required
title: <human-readable title>
description: <one line>
status: current | planned | dormant | stub | superseded       # Personus extension
tags: [<area>, ...]
timestamp: <ISO date, YYYY-MM-DD>
supersedes: [/path/to/old.md]                                  # optional
---
```

- **`type`** is the only OKF-required field. `bun run docs:validate` fails if it is missing or unknown.
- **`title` / `description` / `tags` / `timestamp`** are OKF-recommended and present on essentially every file.

## `status` — implementation state vs. the shipped code

`status` is a Personus extension that records how a doc relates to `main`:

| status | meaning |
| --- | --- |
| `current` | Describes behavior that is shipped in `main`. |
| `planned` | Designed here but not yet built. |
| `dormant` | A named area intentionally parked until post-PMF (commerce, sparks). |
| `stub` | A placeholder awaiting authoring (e.g. `foundation/strategy.md`). |
| `superseded` | Historical; lives under `archive/`. |

> **Scope note.** This bundle was ported from the legacy repo and reconciled to the shipped code at the level of **naming, structure, and `status`** — not line-by-line prose. A `current` doc matches `main` in intent; some sections may still describe pre-reconciliation detail. Where a spec's body still leans on retired concepts, a **Reconciliation note** appears under its H1 pointing at the shipped source of truth. Deep spec-vs-code reconciliation is tracked per-domain in Linear (Personus MVP).

## Reconciliation applied during the port

- `ContactChannelAdapter` → **`ContactRelay`** (`packages/contact`).
- The old heavyweight `integrations` table → the lean **`platform_channel_bindings`** table (`packages/db/src/schema/platform-channels.ts`); Mastra's first-class Channels own routing/threading/memory.
- Residual `ABL` naming → `library` / `Solution Profile`.

## Layout

- `foundation/` — cross-cutting canon (vision, principles, architecture, data-model, agents, auth, metrics…).
- `domains/` — one directory per product area (`personas`, `communities`, `integrations`, `platform-ops`, `coaches`, `discovery`, `commerce`, `sparks`); PRDs, feature specs, schema specs.
- `decisions/` — ADRs. `guides/` — how-to / methodology. `research/` — external landscape studies. `patterns/` — UX/design pattern studies. `business-model/` — pricing/growth/positioning.
- `qa/` — QA convention stubs. `archive/` — quarantined stale / point-in-time material, preserved verbatim (`status: superseded`); links inside `archive/` are frozen and not link-checked.

## Links

Cross-references use ordinary Markdown links. Prefer **bundle-relative** targets (`/domains/personas/00-prd.md`) so they resolve regardless of the linking file's location. The validator warns (never fails) on broken intra-bundle doc links.

## Tooling

- `bun run docs:validate` — checks frontmatter (`type`/`status`) and reports broken links. Runs in CI.
- `bun scripts/docs/gen-index.mjs` — regenerates `index.md` from frontmatter.
- `bun scripts/docs/port.mjs` — the one-shot legacy import (kept for provenance/reproducibility).
