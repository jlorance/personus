---
type: decision
title: "Test Framework: Vitest"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Test Framework: Vitest

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus needs a test framework that handles TypeScript without a separate transpile step, supports React component testing via `@testing-library/react`, runs fast enough for a tight dev loop, and plays well with Next.js 16, Vite-style tooling, and the monorepo topology. The repo ships **Vitest** with jsdom as the default environment for component tests, and co-locates test files next to the code they test (`foo.ts` + `foo.test.ts`).

Tests are expected to cover:
- Pure-logic modules (e.g., persona completeness scoring in `apps/web/lib/personas/`)
- React components and hooks
- Server actions (eventually, with DB integration tests against a Neon dev branch)
- Shared packages (`packages/*`)

## Decision Drivers

1. **TypeScript-native, no transpile step** — test authors should not have to maintain a separate Babel / ts-jest config.
2. **React + DOM support** — component and hook testing must work out of the box with `@testing-library/react`.
3. **Speed** — test runtime directly affects TDD loop quality.
4. **Monorepo ergonomics** — one config per package is fine; Turbo-friendly caching matters.
5. **Integration with Vite-style tooling** — Next.js 16's Turbopack story overlaps conceptually; a Vite-based runner is a natural fit.
6. **Jest compatibility for eased migration** — most example code and Stack Overflow answers are in Jest dialect.

## Decision

We use **Vitest** as the test framework with `@testing-library/react` for component tests and `jsdom` as the DOM environment. Test files are co-located with the code they test (`*.test.ts` / `*.test.tsx`). Each package and app runs its own Vitest config; `bun run test` at the root delegates to Turbo which runs tests across workspaces in parallel.

Vitest satisfies all six drivers fully.

## Alternatives Considered

### Comparison Matrix

| Driver | Vitest (chosen) | Jest | Node `--test` | Playwright component testing |
|---|---|---|---|---|
| TS-native without transpile | Yes | No (ts-jest or Babel) | Partial (experimental) | Yes |
| React + DOM support | Yes (jsdom/happy-dom) | Yes | Manual | Yes (real browser) |
| Speed | Very fast (esbuild) | Slow (ts-jest) | Fast | Slower (browser) |
| Monorepo ergonomics | Excellent | Good | Good | Medium |
| Vite-style tooling | Native | Foreign | N/A | Different |
| Jest-compatible API | Yes | Baseline | No | No |
| Watch mode quality | Excellent | Good | Basic | Good |
| Snapshot testing | Yes | Yes | Manual | Yes |

### Vitest (chosen)
Best balance of speed, ergonomics, and ecosystem compatibility. The Jest-compatible API means almost every community example works without translation.

### Jest (rejected)
Dominant and mature, but ts-jest is slow and requires config the team would rather not maintain. The speed difference compounds across a large test suite.

### Node `--test` (rejected)
Zero dependencies is appealing, but the React/DOM story is DIY and the ecosystem is thin. Rejected on component-testing friction.

### Playwright component testing (rejected)
Real-browser testing is higher-fidelity but meaningfully slower — unsuitable as the default unit test framework. Kept in reserve for end-to-end tests where real browser behavior matters.

## Consequences

### Positive
- Fast test runs keep TDD loops tight.
- `@testing-library/react` works without ceremony.
- Jest-compatible API means contributors don't hit surprises.
- Co-located tests improve discoverability.

### Negative
- jsdom is not a real browser — certain CSS and layout behaviors are simulated and may differ from production.
- Vitest is younger than Jest; some niche plugins/ecosystem tools are Jest-only.
- Each package having its own config is a mild duplication cost.

### Risks
- **jsdom gaps.** A component that depends on real browser behavior (intersection observer, resize observer) may need shims or a real-browser test in Playwright. Mitigation: document the split in test strategy.
- **Async/timer bugs.** Fake timers in Vitest behave slightly differently from Jest in edge cases. Mitigation: prefer real timers where practical.
- **Coverage accuracy.** V8 coverage (Vitest default) is fast but slightly less accurate than Istanbul. Mitigation: swap to Istanbul for release gates if needed.

## Implementation

- Runner: `vitest` + `@testing-library/react` + `jsdom`
- Test file convention: co-located `*.test.ts` / `*.test.tsx`
- Commands: `bun run test` (root delegates to Turbo)
- Per-package Vitest config where needed; otherwise inherit defaults

## References

- Example tests: `apps/web/lib/personas/*.test.ts`
- `package.json` scripts
- Onboarding report `docs/onboarding-2026-04-10.md` — P3 retroactive ADR item
