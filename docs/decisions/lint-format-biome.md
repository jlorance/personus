---
type: decision
title: "Lint and Format: Biome (with Prettier for Tailwind Sort Only)"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Lint and Format: Biome (with Prettier for Tailwind Sort Only)

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus needs consistent formatting and linting across a TypeScript monorepo with Next.js, React, and Tailwind code. The repo uses **Biome** (`biome.json`) as the primary linter and formatter — replacing ESLint and Prettier — with the `next` and `react` lint domains enabled. **Prettier is retained only for Tailwind CSS class sorting** via the `prettier-plugin-tailwindcss` plugin, which Biome does not yet cover.

The available commands reflect this split:
- `bun run lint` — Biome lint
- `bun run format` — Biome format
- `bun run format:tailwind` — Prettier (Tailwind sorting only)
- `bun run check` — Biome fix + Prettier Tailwind sort (full pipeline)

## Decision Drivers

1. **Single-tool velocity** — running one tool for lint + format is faster than chained ESLint + Prettier.
2. **CI speed** — Biome's Rust engine is an order of magnitude faster than ESLint for our codebase size.
3. **Zero-config defaults that match our preferences** — Biome's defaults are close to our preferred style; ESLint requires extensive config.
4. **Next.js + React lint coverage** — must catch React-specific pitfalls (hook rules, key props) and Next.js anti-patterns.
5. **Tailwind class sorting** — deterministic class order is a readability must; Biome does not yet support it.
6. **Migration path** — if Biome fails us, exit to ESLint + Prettier must be tractable.

## Decision

We use **Biome** (`biome.json`) as the primary linter and formatter for all TypeScript, JavaScript, JSON, and supported file types. The `next` and `react` lint domains are enabled. **Prettier is kept solely for Tailwind class sorting** via `prettier-plugin-tailwindcss` and invoked via `bun run format:tailwind`. The combined pipeline is `bun run check`.

Drivers 1–4 are satisfied by Biome. Driver 5 is handled by the Prettier exception. Driver 6 is satisfied by keeping Biome config minimal and orthogonal to ESLint — if we need to switch, we can add ESLint alongside without deleting anything.

## Alternatives Considered

### Comparison Matrix

| Driver | Biome (chosen) | ESLint + Prettier | Biome alone (no Tailwind sort) | Deno lint/fmt |
|---|---|---|---|---|
| One tool for lint + format | Yes (+ Prettier for Tailwind) | No | Yes | Yes |
| Speed | Very fast (Rust) | Slow (JS) | Very fast | Very fast |
| Next.js/React coverage | Good and improving | Best (huge plugin ecosystem) | Good | Weak |
| Tailwind class sorting | No (needs Prettier) | Yes (plugin) | No | No |
| Zero-config friendliness | High | Low | High | High |
| Migration path | Low commitment | Baseline | Low | High commitment |
| Plugin ecosystem | Growing | Vast | Growing | Tiny |

### Biome + Prettier (Tailwind only) (chosen)
Best combination of speed, ergonomics, and consistency. The Prettier exception is narrow and well-understood.

### ESLint + Prettier (rejected)
Most capable plugin ecosystem, but slow on our codebase and requires significant config upkeep. The speed difference materially affects pre-commit hook latency and CI runtime.

### Biome alone (rejected)
Gives up deterministic Tailwind class ordering, which hurts readability noticeably in a utility-class-heavy codebase. Not worth the single-tool purity.

### Deno lint/fmt (rejected)
Fast and minimal, but its React/Next.js coverage is too thin and the ecosystem too small for a production Next.js codebase.

## Consequences

### Positive
- Fast pre-commit and CI linting; contributors don't avoid running checks.
- Single config file (`biome.json`) for most rules — easy to review.
- Auto-format on edit is fast enough to be invisible.
- `bun run check` gives a single command for the full pipeline.

### Negative
- Tailwind class sorting requires a second tool (Prettier), which complicates the story a little.
- Biome's plugin ecosystem is smaller than ESLint's — a specialized rule may not exist.
- Contributors coming from ESLint need to learn new rule names.

### Risks
- **Rule gap.** A React or Next.js anti-pattern that ESLint would catch might slip through. Mitigation: Biome's `next` and `react` domains are actively developed; watch release notes. ESLint can be added alongside if a specific rule matters.
- **Biome API churn.** Biome is still evolving; config format may change. Mitigation: pin version, upgrade deliberately.
- **Prettier Tailwind plugin drift.** If the plugin diverges from Tailwind's internal order, classes shift. Mitigation: pin plugin version alongside Tailwind.

## Implementation

- Config: `biome.json` at repo root
- Commands:
  - `bun run lint` / `lint:fix`
  - `bun run format` / `format:check`
  - `bun run format:tailwind` (Prettier, Tailwind sort only)
  - `bun run check` (full pipeline)
- Hook integration: pre-commit hook (`.claude/skills/hooks/lint-before-commit.sh`) blocks `git commit` if `check` fails

## References

- `biome.json`
- Onboarding report `docs/onboarding-2026-04-10.md` — P3 retroactive ADR item
