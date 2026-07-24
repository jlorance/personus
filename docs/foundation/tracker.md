---
type: foundation
title: Tracker — realized configuration for Personus
description: "THIS PROJECT'S as-built tracker record — the labels, statuses, and conventions actually in place. It's a human-readable reference and the re-sync target for the onboard-solution recipe — NOT a…"
status: current
tags: [foundation]
---

# Tracker — realized configuration for Personus

<!--
THIS PROJECT'S as-built tracker record — the labels, statuses, and conventions actually in
place. It's a human-readable reference and the re-sync target for the onboard-solution recipe — NOT a file
these skills read on every run. At runtime, skills get config from CLAUDE.md and the *current*
label/status set from the live tracker they're already calling; this record just documents
what was set up (and any deviations from the bootstrap). For what each label/status
*means*, see the bootstrap files:
  - Issue tags + statuses:   ~/.claude/skills/abl/_shared/tracker/issue-lifecycle.md
  - Project tags + statuses:  ~/.claude/skills/abl/_shared/tracker/project-lifecycle.md

Re-run the onboard-solution recipe (or "Validate my skill stack setup") to re-sync after the tracker changes.
-->

tracker: linear
linear_workspace: personus
linear_team: Personus
linear_team_id: bd25bed1-1229-431e-8c8a-51590254fa0a
last_synced: 2026-06-22

## Issues

### Labels in use

Realized against the Personus Solution Profile (`shape: b2c`, `mcp_server: true`,
`features: search + external-apis`, `compliance: gdpr/ccpa`, `authz` set, AI-native →
`ai.centric`). Profile conditionals are folded into each axis below.

| Axis | Linear shape | Realized members |
|------|--------------|------------------|
| `type:` | group, one-of | story · fix · refactor · task · doc · spec · test · devEx · ccr · milestone · research · ai-shaping · compliance |
| `area:` | group, one-of | User · Platform · Personas · Communities · Guilds · Contact · Integrations · Search · Agents · Evals · Onboarding · Admin |
| `surface:` | group, one-of | web · api · mcp · cp |
| `risk:` | **group, one-of** ⚠️ | migration · a11y · secrets · cost-cap · injection · pii · authz · authn · webhook · ssrf |
| `needs:` | flat, stacks | needs:design · needs:spec · needs:pm · needs:legal · needs:backend · needs:infra · needs:content |
| `gate:` | flat, stacks | gate:security-auto · gate:security-hitl · gate:arch-auto · gate:arch-hitl · gate:qa-full · gate:qa-devonly |
| `merge:` | flat, on parent | merge:group · merge:stacked |
| `skill:` | group, one-of | new · quality · conformance · learn · handle · deliver · architect · design · gap *(partial — see deviations)* |

### Statuses

Realized workflow states (full FSD delivery pipeline):

**Backlog · Todo · In Progress · Plan Review · Plan Accepted · Plan Rejected · Blocked ·
In PR · PR Review · PR Accepted · PR Rejected · PO Review · PO Accepted · PO Rejected ·
QA Review · In QA · QA Accepted · QA Rejected · Delivered · Deploying · Deployed · Done ·
Canceled** *(+ Duplicate)*

- Tracker realization: Linear native workflow states.
- `In Progress` is the single active build state — `/develop` explores, plans, **and** builds
  here (there is no separate `Building` issue status; the team uses Linear's generic
  `In Progress`, the same status non-agentic work uses, through plan and build until the PR opens).
- Each HITL gate has an `* Accepted` (advance) and a `* Rejected` (remediate) exit; `* Rejected`
  resumes `/deliver` (code) or `/develop` (re-plan). See `delivery-control-plane.md`.
- `Plan Accepted` carries gate **G0** (plan-accepted signal); G1–G4 are the HITL review
  gates (`Plan Review` G1, `PO Review` G2, `PR Review` G3, `QA Review` G4).
- The four `* Accepted` states are short-lived signal states automation transitions out of
  immediately.

## Projects

### Tags in use

`build:supervised` *(default)* · `build:auto` · `build:manual` · `build:sequential` ·
`track:experiment` · `track:committed`

> ⚠️ **Not yet created in Linear** — project `build:*`/`track:*` tags are UI-only and pending.

### Statuses

Target project statuses: **Backlog · Planning · Build Ready · Building · In Review ·
Delivered · Blocked · Cancelled**
- `Build Ready` is the build trigger — see `project-lifecycle.md`.

> ⚠️ **Pending** — project statuses are workspace-UI-only (not MCP-writable) and not yet
> configured. The MCP server also does not expose project-status mutation.

### Structure

- **Teams:** Personus (`PER`)
- **Projects:** AI-SDLC · Admin · Foundations · Agents · Web
- **Initiatives:** managed in the Linear UI (MCP server does not expose initiative mutation).
- `linear_project` (AI-SDLC, /learn loop): `7f28fd3e-0b3f-498e-a77b-6a41a33d122a`
- `project_naming:` `{team}: {name}`

## Deviations from library bootstrap

1. **`risk:` is a Linear *group* (one-of), not flat.** The bootstrap specifies `risk:` as
   flat workspace labels so they **stack** (zero-to-many per issue). As a group, Linear
   permits only one `risk:` per issue — so `risk:migration` + `risk:secrets` together is
   currently impossible. Fix in UI (convert the `risk` group to flat labels) if stacking is
   wanted. `needs:`/`gate:`/`merge:` are correctly flat.

2. **`skill:` axis is partial (9 of 14).** Five members — `spec`, `fix`, `refactor`,
   `research`, `milestone` — **cannot** be created as `skill:` children: Linear enforces
   label-name uniqueness **across the whole workspace**, and those names are owned by the
   `type:` group. This is a hard Linear constraint, not a cleanup gap. Provenance for
   `/spec`, `/fix`, `/refactor`, `/research`, `/milestone`-filed issues falls back to the
   paired `type:` label (same name). To fully realize, disambiguate in UI
   (e.g. `skill:spec-authoring`).

3. **`type:` extras pending removal.** Legacy `type:` members from the prior taxonomy
   (`improvement`, `chore`, `system-change`, `bug`) were removed during reconciliation;
   canonical mapping is `improvement→story/refactor`, `chore→task`,
   `system-change→ccr`, `bug→fix`.

4. **`source:` → `skill:` migration done.** The old `source:` provenance axis was removed;
   `skill:` replaces it. `source:review`/`source:ship` were intentionally dropped
   (`/validate` runs inline).

### Known MCP write limits (why some items are UI-only)

The Linear MCP server is **create-only for labels** and **cannot touch workflow/project
states**. It has no `delete_issue_label`, no rename, and no workflow-state mutation. All
label deletes/renames and every status change must be done in the Linear UI
(Settings → Labels / Settings → Teams → Personus → Workflow). See
`recipes/linear/quirks.md`.
