---
type: foundation
title: Legacy Foundation Archive — 2026-02-24
description: "This directory holds the four pre-ABL foundation files that did not have a home in the ABL canonical foundation structure as of 2026-04-12. They are archived intact — no content was modified in…"
status: superseded
tags: [archived]
timestamp: 2026-02-24
---

# Legacy Foundation Archive — 2026-02-24

This directory holds the four pre-ABL foundation files that did not have a home in the ABL canonical foundation structure as of 2026-04-12. They are archived intact — **no content was modified in the move.**

## What's here

| File | Size | Reason for archiving |
|---|---|---|
| `01-vision-and-principles.md` | ~590 lines | Fully ported: vision into [`../../vision.md`](../../vision.md), principles into [`../../principles.md`](../../principles.md), use cases + progressive onboarding into `vision.md`. Kept as the historical source-of-truth snapshot. |
| `06-visual-interfaces.md` | ~2400 lines | UX / feature spec content, not foundation. Belongs in the spec suites under `docs/specs/` — a future session will migrate it into the appropriate spec files (likely a mix of `identity-and-personas/` and a new `ux/` or `patterns/` suite). |
| `08-guilds.md` | ~1100 lines | Feature spec content for the guild community type. Belongs under `docs/specs/communities/guilds.md` or similar — deferred to a future spec migration. |
| `12-persona-layout.md` | ~980 lines | Persona layout + theming spec content. Overlaps with `docs/specs/identity-and-personas/05-layout-and-theming.md` — future session should dedupe and migrate or delete. |

## What's NOT here (ported or renamed to topic files)

The other 8 legacy foundation files were renamed from `NN-topic.md` to `topic.md` during the ABL migration and live in the parent `docs/foundation/` directory:

- `02-data-model.md` → [`../../data-model.md`](../../data-model.md)
- `03-api-surface.md` → [`../../api-surface.md`](../../api-surface.md)
- `04-agent-architecture.md` → [`../../agents.md`](../../agents.md)
- `05-deployment.md` → [`../../deployment.md`](../../deployment.md)
- `07-at-protocol.md` → [`../../at-protocol.md`](../../at-protocol.md)
- `09-authorization.md` → [`../../authorization.md`](../../authorization.md)
- `10-atmosphere.md` → [`../../atmosphere.md`](../../atmosphere.md)
- `11-authentication.md` → [`../../authentication.md`](../../authentication.md)

## When to consult this archive

- **Researching decision rationale.** If you're trying to understand why the project is shaped the way it is, `01-vision-and-principles.md` has the original 20-principle list and the full 8-use-case narrative.
- **Migrating feature content into specs.** When you do the spec migration for UX flows, guilds, or persona layout, these files are your starting material.
- **Diffing against current state.** Comparing the archived files against the current `docs/foundation/` topic files will show you what has drifted since 2026-02-24.

**Do not edit files in this directory.** They are frozen snapshots. If the content matters, edit the canonical file in `docs/foundation/` (or migrate the content into a spec) and leave the archive alone.

_Archived 2026-04-12 by `/plan-foundation` during the legacy-to-ABL foundation migration._
