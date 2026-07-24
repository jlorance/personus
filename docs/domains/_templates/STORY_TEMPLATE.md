---
type: guide
title: Linear Issue — Story Template
description: "This template defines the structure for Linear issues created from spec workflows. Each story is a testable, deployable unit of work that an AI coding agent (or human developer) can pick up and…"
status: current
tags: [_templates]
---

# Linear Issue — Story Template

This template defines the structure for Linear issues created from spec workflows. Each story is a testable, deployable unit of work that an AI coding agent (or human developer) can pick up and complete independently.

---

## Template

```
## [Story ID] [Actor] can [outcome] [context]

**Spec Reference:** `docs/specs/[suite]/[file].md` §[section] — Workflow [N], Story [N]
**Blocked By:** [Story IDs or "None"]
**Labels:** `[suite]`, `[feature-area]`

### Story Context

[OPTIONAL — Only when the "where" or "why" isn't self-evident from the title.
Examples: "This is step 2 of the persona creation wizard," or "This surfaces on the community dashboard Overview tab," or "This fires after the user completes onboarding."]

### Acceptance Criteria

#### Actor Requirements (AR)
What the user does — each item is a step in the user's journey:
- [ ] [User does X]
- [ ] [User sees Y]
- [ ] [User selects Z]

#### Functional Requirements (FR)
What the system does in response — visible behavior, data changes, side effects:
- [ ] [System creates/updates/deletes record in table X]
- [ ] [System generates embedding / sends notification / triggers webhook]
- [ ] [List of values / options / states: A, B, C]

#### User Feedback Requirements (UFR)
What the user sees/hears as confirmation — toasts, redirects, state changes:
- [ ] [On success: toast "Your persona has been created" + redirect to /personas/[uri]]
- [ ] [On error: inline validation message under field X]
- [ ] [During save: button shows spinner, form fields disabled]
- [ ] [Empty state: "You haven't created any personas yet" with CTA]

#### Data & Validation Requirements (DR)
Schema and validation rules — what's enforced and where:
- [ ] [Validates with `schemaName` from `lib/validations/[file].ts`]
- [ ] [Field X: required, max 120 chars]
- [ ] [Field Y: unique per user (DB-level check)]
- [ ] [Field Z: must reference existing record in table W]

#### Authorization & Auditing (AA)
Who can do this and what gets logged:
- [ ] [Requires: authenticated user (any role) / Steward+ / Admin / Owner]
- [ ] [CASL check: `ability.can('update', subject('Persona', { userId }))` ]
- [ ] [Activity event: `persona_created` logged to `activity_events`]
- [ ] [Or: No special permissions — available to all authenticated users]

### Files to Touch

**Modify existing:**
- `path/to/file.ts` — [what changes: add column, add action, modify component]

**Create new:**
- `path/to/new-file.ts` — [what this file does]

### Failure Paths
- If [condition]: [user sees X, system does Y]
- If [condition]: [user sees X, system does Y]
```

---

## Usage Notes

**Story ID format:** `[Suite abbreviation]-[Spec#].[Workflow#].[Story#]`
- Example: `PER-01.1.3` = Personas suite, spec 01, workflow 1, story 3
- Example: `COM-05.2.1` = Communities suite, spec 05, workflow 2, story 1

**Story title format:** `[Actor] can [verb] [object] [context]`
- Good: "User can select traits from their profile during persona creation"
- Good: "CO can cancel a pending invite from the invite management table"
- Bad: "Implement trait selection" (no actor, no context)
- Bad: "Persona creation wizard step 2" (what does the user accomplish?)

**When to split a story:**
- If it has more than 8-10 acceptance criteria total across all sections, it's too big — split it.
- If it touches more than 4-5 files, consider splitting by layer (schema + action vs. UI + wiring).
- If two developers (or two AI sessions) could work on parts simultaneously, it should be two stories.

**Relationship to specs:**
- The spec is the source of truth for architecture, schema, wireframes, and full workflow context.
- The story is a self-contained work order. It should have enough detail to build from, with the spec reference for deeper context.
- Don't duplicate the spec's wireframes or schema in the story — reference them. But DO duplicate acceptance criteria (they're the contract).

**Relationship to tests:**
- AR items → E2E test steps (Playwright: "click X, expect Y")
- FR items → Integration test assertions (DB state after action)
- UFR items → E2E test assertions (toast visible, redirect happened)
- DR items → Unit test assertions (Zod schema rejects invalid input)
- AA items → Unit test assertions (action throws for unauthorized user)

**Labels (suggested):**
- Suite: `personas`, `communities`, `social-graph`, `endorsements`, `discovery`, `onboarding`, `coach`, `contacts`, `commerce`
- Feature: `crud`, `visibility`, `search`, `ui`, `schema`, `auth`, `notifications`, `seo`, `aio`
- Type: `story`, `bug`, `tech-debt`, `spike`
