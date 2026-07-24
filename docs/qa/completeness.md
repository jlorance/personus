---
type: guide
title: "QA: Persona Completeness Scoring"
description: "Source: apps/web/lib/personas/completeness.ts Test file: apps/web/lib/personas/completeness.test.ts Tickets: PER-85 (MINHEADLINELENGTHFORFULLSCORE constant extraction)"
status: stub
tags: [qa]
---

# QA: Persona Completeness Scoring

**Source:** `apps/web/lib/personas/completeness.ts`
**Test file:** `apps/web/lib/personas/completeness.test.ts`
**Tickets:** PER-85 (MIN_HEADLINE_LENGTH_FOR_FULL_SCORE constant extraction)

## Coverage Summary

The `calculateCompleteness` function is covered by co-located Vitest unit tests. All scoring
branches are exercised, including the headline-length threshold that PER-85 extracted into
`MIN_HEADLINE_LENGTH_FOR_FULL_SCORE = 20`.

## Test Stories

### Regression: headline threshold boundary (PER-85)

| # | Story | Test | Status |
|---|-------|------|--------|
| 1 | Short headline (< 20 chars) awards partial score (10 pts) | `awards points for a headline` — `shortResult.breakdown.headline === 10` | covered |
| 2 | Long headline (>= 20 chars) awards full score (15 pts) | `awards points for a headline` — `longResult.breakdown.headline === 15` | covered |
| 3 | Empty headline awards zero headline points | `returns a low score for an empty persona` — `breakdown.headline` implicitly 0 | covered |

### Regression: scoring mechanics (existing)

| # | Story | Test | Status |
|---|-------|------|--------|
| 4 | Skills capped at 20 pts (5 skills * 5 pts) | `awards points for skills up to the maximum` | covered |
| 5 | Location awards 10 pts | `awards points for location` | covered |
| 6 | Empty contact prefs get partial credit (8 pts) | `gives partial credit for empty contact preferences` | covered |
| 7 | Non-empty contact prefs get full credit (10 pts) | `gives full credit for non-empty contact preferences` | covered |
| 8 | Fully-populated persona scores >= 90 | `computes a high score for a complete persona` | covered |
| 9 | `nextSuggestions` lists only missing sections | `provides relevant suggestions for missing sections` | covered |

## Notes

- `MIN_HEADLINE_LENGTH_FOR_FULL_SCORE = 20` was extracted from a bare `20` literal in PER-85.
  The existing test at story #1/#2 directly validates the boundary value — no new tests were
  required by the refactor.
- The constant is module-private (`const`, not exported). If this threshold ever needs to be
  shared with other surfaces (e.g., a form validation hint), export it and add a consumer test.
- `PARSE_COMPLETE_DELAY_MS = 300` (PER-84, import-settings.tsx) is a pure UI timing substrate
  (setTimeout delay before step transition). No unit-testable behavioral surface — covered by
  the infrastructure substrate archetype; regression-only status applies.

## Run

```bash
bunx vitest run apps/web/lib/personas/completeness.test.ts
```
