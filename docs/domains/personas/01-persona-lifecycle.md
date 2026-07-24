---
type: spec
title: "Identity & Personas -- Persona Lifecycle"
description: "This spec covers the complete persona lifecycle: listing, creating, editing (foundations + trait selection from user traits), and deleting personas. It documents the existing implementation and…"
status: current
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Persona Lifecycle

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `docs/foundation/data-model.md`, `docs/foundation/vision.md`, `docs/foundation/authorization.md`
> Primary actors: User (authenticated persona owner), Visitor (unauthenticated or non-owner viewer), AI Agent (Persona Coach)

This spec covers the complete persona lifecycle: listing, creating, editing (foundations + trait selection from user traits), and deleting personas. It documents the existing implementation and defines enhancements to the creation wizard, traits-to-persona interaction, and deletion cascade behavior. All personas are owned by a single user and represent a published view of traits selected from the user's master traits collection.

---

## 1. Persona List & Placeholder Cards

### 1.1 Overview

The persona list is the user's home base for managing all their personas. It shows each persona as a card with avatar, headline, completeness bar, and entity type badge. Users typically have 3-6 personas, so sort/filter controls are unnecessary complexity — the list is always scannable at a glance.

**Placeholder persona cards** guide new users toward creating their first few personas. Instead of a generic empty state, users see pre-shaped "bait" cards that communicate *why* they'd want multiple personas. New users start with two placeholders: **Professional** ("How colleagues and clients find you") and **Personal** ("The real you, for the people who matter"). Clicking a placeholder pre-fills the creation wizard with sensible defaults. Placeholders disappear when the user creates a matching persona (matched by `layoutPreset`). After the first persona is created, the coach suggests the next type contextually.

### 1.2 Wireframe

```
New user (0 personas):
┌─────────────────────────────────────────────────────────────────────┐
│ Your Personas                                     [+ Create Persona]│
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ┌────┐                                                         │ │
│ │  │ 💼 │  Professional                                           │ │
│ │  └────┘  How colleagues and clients find you                    │ │
│ │                                                                 │ │
│ │  Skills, experience, and what you offer — your career identity. │ │
│ │                                                                 │ │
│ │                                       [Create Professional →]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ┌────┐                                                         │ │
│ │  │ 🌱 │  Personal                                               │ │
│ │  └────┘  The real you, for the people who matter                │ │
│ │                                                                 │ │
│ │  Interests, values, and qualities — who you are beyond work.    │ │
│ │                                                                 │ │
│ │                                           [Create Personal →]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Or [Build with Coach] — create any persona through conversation     │
└─────────────────────────────────────────────────────────────────────┘

After 1 persona created (Professional exists, Personal placeholder remains):
┌─────────────────────────────────────────────────────────────────────┐
│ Your Personas                                     [+ Create Persona]│
│ 1 persona                                                           │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ▓ gradient accent bar (green = person)                          │ │
│ │ [JS] Jamie Smith                                                │ │
│ │      Full-stack engineer & open-source contributor              │ │
│ │                          ████████░░░░  72%    [person]          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ┌────┐                                                         │ │
│ │  │ 🌱 │  Personal                                 (placeholder) │ │
│ │  └────┘  The real you, for the people who matter                │ │
│ │                                           [Create Personal →]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

All placeholders dismissed (user has 2+ personas with matching presets):
┌─────────────────────────────────────────────────────────────────────┐
│ Your Personas                                     [+ Create Persona]│
│ 2 personas                                                          │
│                                                                     │
│ ┌─── persona cards ─────────────────────────────────────────────┐   │
│ │ ... real persona cards ...                                     │   │
│ └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Hierarchy

```
app/(dashboard)/personas/page.tsx                    ← EXISTS: Server Component (data fetching)
  ├─ components/persona-card.tsx                      ← NEW: Client Component (extracted from page)
  │    ├─ components/ui/card.tsx                      ← EXISTS
  │    ├─ components/ui/badge.tsx                     ← EXISTS
  │    └─ components/ui/progress.tsx                  ← EXISTS
  ├─ components/persona-placeholder-card.tsx          ← NEW: Client Component (placeholder bait)
  │    ├─ components/ui/card.tsx                      ← EXISTS
  │    └─ components/ui/button.tsx                    ← EXISTS
  ├─ lib/personas/placeholder-config.ts               ← NEW: data-driven placeholder definitions
  └─ calls: app/actions/personas.ts → listPersonas() ← EXISTS
```

Currently the entire list UI is inline in `app/(dashboard)/personas/page.tsx` (lines 1-87). The card rendering, empty state, and avatar logic are all in one file. The enhancement extracts cards into a reusable component and replaces the empty state with placeholder cards.

### 1.4 Placeholder Configuration

The placeholder system is data-driven. New `lib/personas/placeholder-config.ts`:

```typescript
export const PERSONA_PLACEHOLDERS = [
  {
    id: 'professional',
    title: 'Professional',
    subtitle: 'How colleagues and clients find you',
    description: 'Skills, experience, and what you offer — your career identity.',
    icon: '💼',
    matchLayoutPreset: 'professional' as const,
    suggestedEntityType: 'person' as const,
    suggestedHeadline: '',
    suggestedTraitCategories: ['skills', 'experience', 'offerings', 'certifications'],
  },
  {
    id: 'personal',
    title: 'Personal',
    subtitle: 'The real you, for the people who matter',
    description: 'Interests, values, and qualities — who you are beyond work.',
    icon: '🌱',
    matchLayoutPreset: 'personal' as const,
    suggestedEntityType: 'person' as const,
    suggestedHeadline: '',
    suggestedTraitCategories: ['interests', 'values', 'qualities', 'focusAreas'],
  },
] as const;
```

**Placeholder matching:** A placeholder is hidden when a persona with a matching `layoutPreset` column value exists. Matching is on the stored value, not the resolved value — `layoutPreset: 'auto'` does **not** dismiss any placeholder (the user hasn't made a deliberate choice). If the user deletes their only Professional persona, the placeholder reappears.

**Extensibility:** Adding a new entry to the array creates a new placeholder card — no component changes needed. Future types to consider: Community ("What you bring to your communities"), Creative ("Your passion work"), Service ("What you offer and how to reach you").

**Wizard pre-fill:** Clicking a placeholder CTA navigates to `/personas/new?type={placeholder.id}`. The wizard reads the `type` query param and pre-fills: entity type, layout preset, and pre-checks trait categories matching `suggestedTraitCategories` in the traits picker. The wizard starts at step 2 (entity type selection skipped since it's implied). The user can override any pre-filled value. Invalid/unknown `type` params are ignored.

### 1.5 Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | User can view all their personas as cards on the persona list page | Extract inline card markup to `components/persona-card.tsx`. Cards show avatar initial, display name, headline, completeness bar, entity badge. Links to `/personas/{uri}`. |
| 1.2 | User can see placeholder cards that suggest useful persona types on an empty or sparse persona list | Professional + Personal placeholders shown when no matching `layoutPreset` exists. Visually distinct (dashed border/muted). "Build with Coach" alternative link below. |
| 1.3 | User can click a placeholder card to start the creation wizard with pre-filled defaults | `/personas/new?type=professional` skips step 1, pre-fills entity type + layout preset + trait categories. User can override. |
| 1.4 | System supports adding new placeholder types without code changes | `PERSONA_PLACEHOLDERS` array is single source of truth. `PersonaPlaceholder` type enforces required fields. |

### 1.6 Schema

No schema changes. Uses existing `personas` table from `lib/db/schema/personas.ts`. Placeholder matching uses the existing `layoutPreset` column.

### 1.7 Server Actions

No new server actions. Uses existing `listPersonas()` from `app/actions/personas.ts`. Placeholder filtering is computed server-side by comparing personas' `layoutPreset` values against `PERSONA_PLACEHOLDERS[].matchLayoutPreset`.

### 1.8 Edge Cases

- [ ] User has 0 personas: both placeholder cards shown (Professional + Personal)
- [ ] User has a persona with `layoutPreset: 'auto'` that resolved to 'professional': does **not** dismiss the Professional placeholder (matching is by stored value, not resolved value)
- [ ] User manually creates a persona with `layoutPreset: 'professional'` via freeform wizard (not via placeholder): Professional placeholder still dismissed correctly
- [ ] User deletes their only Professional persona: Professional placeholder reappears on next page load
- [ ] User has 10 personas but none with 'professional' or 'personal' preset: both placeholders still shown
- [ ] User creates a persona with `layoutPreset: 'personal'` via the coach: placeholder dismissed correctly

### 1.9 Test Criteria

**Unit tests:**
- Placeholder filter correctly hides Professional when a persona with `layoutPreset: 'professional'` exists
- Placeholder filter shows both when no personas exist
- Placeholder filter shows neither when both types exist
- `layoutPreset: 'auto'` does NOT dismiss any placeholder

**E2E tests:**
- New user: verify both placeholder cards render with correct content
- Click "Create Professional →": verify wizard opens at step 2 with pre-filled values
- After creating Professional persona: verify only Personal placeholder remains

### 1.10 Implementation Order

1. Create `lib/personas/placeholder-config.ts` with `PERSONA_PLACEHOLDERS` array and `PersonaPlaceholder` type
2. Extract `components/persona-card.tsx` from inline card markup in `app/(dashboard)/personas/page.tsx` — pure refactor, no behavior change
3. Create `components/persona-placeholder-card.tsx` with distinct visual style (dashed border, muted bg)
4. Update `app/(dashboard)/personas/page.tsx` to compute visible placeholders and render them below real cards (requires steps 1, 2, 3)
5. Update `app/(dashboard)/personas/new/page.tsx` to read `type` query param and pre-fill wizard state from placeholder config (requires step 1)
6. Write unit tests for placeholder filtering logic
7. Write E2E test for placeholder → wizard → creation flow

---

## 2. Persona Creation Wizard

### 2.1 Overview

The creation wizard guides users through building a new persona in 3 steps: (1) choose entity type, (2) enter basic info + optionally select traits from the user's traits, (3) success screen with coach redirect. The wizard currently exists as a 3-step client component. Enhancements add trait selection from the user's existing traits in step 2, layout preset suggestion based on entity type, and a direct "Build with Coach" alternative entry point.

### 2.2 Wireframe

```
Step 1: Choose Type (EXISTS)
┌─────────────────────────────────────────────────────────────────────┐
│                        (1)───(2)───(3)                              │
│                                                                     │
│                  What are you creating?                              │
│            Choose the type that best represents this persona.       │
│                                                                     │
│    ┌──────────────────────┐    ┌──────────────────────┐             │
│    │                      │    │                      │             │
│    │    [Person Icon]     │    │    [Building Icon]   │             │
│    │     Individual       │    │    Organization      │             │
│    │  skills, experience  │    │  teams, companies    │             │
│    │                      │    │                      │             │
│    └──────────────────────┘    └──────────────────────┘             │
│                                                                     │
│                        [Continue]                                    │
│                         Cancel                                      │
└─────────────────────────────────────────────────────────────────────┘

Step 2: Quick Setup (ENHANCED)
┌─────────────────────────────────────────────────────────────────────┐
│                        (1)──(2)───(3)                               │
│                                                                     │
│              Set up your persona                                    │
│          Start with the basics. Add more later.                     │
│                                                                     │
│    ┌────────────────────────────────────────────┐                   │
│    │ Display Name *        [Jamie Smith        ]│                   │
│    │ Headline              [Full-stack eng...  ]│                   │
│    │ Location              [Austin, TX         ]│                   │
│    │ Visibility            [Community Only   v ]│                   │
│    │                                            │                   │
│    │ ─── Layout Preset (NEW) ──────────────── │                    │
│    │ Suggested: Professional                    │                   │
│    │ [Professional] [Personal] [Service]        │                   │
│    │ [Community] [Creative]                     │                   │
│    │                                            │                   │
│    │ ─── Quick Add from Traits (NEW) ────────── │  (only if user    │
│    │ Your traits have 12 skills, 5 values...    │   has traits)     │
│    │                                            │                   │
│    │ Skills:                                    │                   │
│    │ [x] TypeScript  [x] React  [ ] Python     │                   │
│    │ [ ] PostgreSQL  [ ] Docker  [x] GraphQL   │                   │
│    │                                            │                   │
│    │ Values:                                    │                   │
│    │ [x] Open Source  [ ] Mentorship  [x] UX   │                   │
│    │                                            │                   │
│    │      [Back]              [Create & Continue]│                   │
│    └────────────────────────────────────────────┘                   │
│                         Cancel                                      │
└─────────────────────────────────────────────────────────────────────┘

Step 3: Coach Quick Start (EXISTS)
┌─────────────────────────────────────────────────────────────────────┐
│                        (1)──(2)──(3)                                │
│                                                                     │
│           Let's make Jamie Smith shine!                              │
│    Tell me about your top skills and I'll get them added.           │
│                                                                     │
│    ┌────────────────────────────────────────────┐                   │
│    │  [JS] Jamie Smith                          │                   │
│    │       Individual                           │                   │
│    │                                            │                   │
│    │  The Persona Coach uses AI to help you...  │                   │
│    │                                            │                   │
│    │       [Continue with the Coach  >]         │                   │
│    │       [Done for now             ]          │                   │
│    └────────────────────────────────────────────┘                   │
│                                                                     │
│     You can always come back to the Coach later.                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Hierarchy

```
app/(dashboard)/personas/new/page.tsx                ← EXISTS: Client Component ("use client")
  ├─ StepIndicator                                   ← EXISTS: inline component
  ├─ StepChooseType                                  ← EXISTS: inline component
  ├─ StepQuickSetup                                  ← EXISTS: inline component (ENHANCED)
  │    ├─ components/layout-preset-picker.tsx         ← NEW: layout preset selection
  │    └─ components/available-traits-picker.tsx      ← NEW: trait selection from user traits
  │         └─ components/ui/checkbox.tsx             ← EXISTS
  ├─ StepCoachQuickStart                             ← EXISTS: inline component
  └─ calls:
       ├─ app/actions/personas.ts → createPersona()  ← EXISTS
       └─ app/actions/personas.ts → getUserTraits()   ← NEW server action
```

The entire wizard lives in `app/(dashboard)/personas/new/page.tsx` (499 lines). `StepChooseType`, `StepQuickSetup`, and `StepCoachQuickStart` are inline components in this file. The enhancements add sub-components to `StepQuickSetup` and a new server action to fetch the user's traits.

### 2.4 Wizard Behavior

**Step 1 — Entity type selection (exists).** Two large tiles: Individual (person) and Organization. Selecting a tile + clicking Continue advances to step 2. State: `entityType: EntityType | null`.

**Step 2 — Quick setup (enhanced).** Form with: Display Name (required, max 100), Headline (optional, max 300), Location (optional, max 100), Visibility (select, default community). Entity-type-specific labels ("Organization Name" vs "Display Name").

New additions to step 2:
- **Layout Preset Picker:** 5 clickable chips below visibility. Default suggestion based on entity type: `person` → Professional, `organization` → Community (matches `resolveLayoutPreset()` in `lib/personas/layout-config.ts`). User can override. Stored in `personas.layoutPreset`.
- **Traits Picker:** If the user has traits, a collapsible "Quick Add from Your Traits" section shows checkboxes per category (Skills with names, Values, Qualities, etc.). Checked traits are attached to the persona on creation. Hidden when the user has no traits.

"Create & Continue" submits the form, calls `createPersona()`, and advances to step 3.

**Step 3 — Coach quick start (exists).** Shows persona avatar + name. Two CTAs: "Continue with the Coach" → `/coach`, "Done for now" → `/personas/{uri}`.

**Coach-first alternative path.** User navigates directly to `/coach`. If they have no personas, the coach offers to create one through conversation using the `update_persona_field` and `check_pii` Mastra tools. Existing flow, no new code needed.

### 2.5 Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | User can select an entity type on wizard step 1 | Exists. Two tiles (person/org), Continue button disabled until selected. |
| 2.2 | User can enter basic info and create a persona on wizard step 2 | Exists. Display Name required. URI generated with random suffix. Completeness calculated. Activity logged. |
| 2.3 | User can select a layout preset during persona creation | New `components/layout-preset-picker.tsx`. 5 chips. Default from entity type. Saved to `personas.layoutPreset`. |
| 2.4 | User can quick-add traits from their traits during persona creation | New `components/available-traits-picker.tsx`. Checkboxes per category. Only shown if user has traits. New `getUserTraits()` server action. |
| 2.5 | User can choose to continue with the coach or finish after creation | Exists. Step 3 success screen with two CTAs. |
| 2.6 | User can create a persona through conversation with the Persona Coach | Exists. Coach agent extracts fields from conversation. Same server actions under the hood. |

### 2.6 Schema

No new tables. Enhancement to `createPersonaSchema`:

```typescript
// Modifies lib/validations/personas.ts — adds layoutPreset to createPersonaSchema

import { LAYOUT_PRESETS } from '@/lib/constants';

export const createPersonaSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer'),
  headline: z.string().max(300, 'Headline must be 300 characters or fewer').optional(),
  location: z.string().max(100).optional(),
  entityType: z.enum(ENTITY_TYPES).default('person'),
  visibility: z.enum(VISIBILITY_LEVELS).default('community'),
  layoutPreset: z.enum([...LAYOUT_PRESETS, 'auto'] as [string, ...string[]]).default('auto'),
});
```

Note: `LAYOUT_PRESETS` already exists in `lib/constants.ts` (line 167): `['professional', 'personal', 'community', 'service', 'creative']`. The schema adds `'auto'` as a valid option.

### 2.7 Server Actions

```typescript
// NEW action — add to app/actions/personas.ts

export async function getUserTraits(): Promise<Traits>
// Authenticated user required. Returns the user's traits JSONB.
// Used by the creation wizard to populate the available-traits-picker.
// Returns {} if no traits row exists (ensureUser creates it).

// MODIFIED action — app/actions/personas.ts createPersona()
// Add layoutPreset to the NewPersona object:
//   layoutPreset: data.layoutPreset ?? 'auto',
```

### 2.8 Edge Cases

- [ ] User has no traits: available-traits-picker section not rendered, form works normally
- [ ] User's traits have only one category (e.g., skills but no values): only that category shown in picker
- [ ] User creates persona then navigates back (browser back): step state lost, returns to step 1
- [ ] Two personas created with same display name: URI collision prevented by random 6-char suffix
- [ ] User clicks "Create & Continue" twice: `pending` state disables button on first click
- [ ] Layout preset changed after initial suggestion: override value saved, not the suggestion
- [ ] Browser refresh mid-wizard: form state lost, user starts over (acceptable for MVP)

### 2.9 Test Criteria

**Unit tests:**
- `createPersonaSchema` accepts all valid layout presets plus 'auto'
- `createPersonaSchema` rejects invalid layout preset strings
- `resolveLayoutPreset('auto', 'person')` returns 'professional'
- `resolveLayoutPreset('auto', 'organization')` returns 'community'

**Integration tests:**
- `createPersona()` with `layoutPreset: 'service'` stores it in the DB
- `getUserTraits()` returns the correct traits for the authenticated user
- `createPersona()` followed by `updatePersonaTraits()` produces correct completeness score

**E2E tests:**
- Wizard: select Person type, enter name, verify step 2 form
- Wizard: fill form, click Create, verify step 3 success screen
- Wizard: verify layout preset defaults to Professional for person
- Wizard: select traits from user traits (if traits non-empty), verify they appear on persona detail page

### 2.10 Implementation Order

1. Add `getUserTraits()` server action to `app/actions/personas.ts`
2. Add `layoutPreset` to `createPersonaSchema` in `lib/validations/personas.ts`
3. Update `createPersona()` to pass `layoutPreset` to the `NewPersona` insert
4. Create `components/layout-preset-picker.tsx` — renders 5 preset chips with entity-type suggestion
5. Create `components/available-traits-picker.tsx` — renders checkbox groups per trait category
6. Enhance `StepQuickSetup` in `app/(dashboard)/personas/new/page.tsx` to include layout picker and traits picker (requires steps 1, 4, 5)
7. Write unit tests for new Zod schema and `getUserTraits()` action
8. Write E2E test for full wizard flow including layout and trait selection

---

## 3. Persona Editing — Foundations

### 3.1 Overview

Once a persona has been created (via the wizard in §2 or the coach), the user manages it from the **persona detail page** (`/personas/{uri}`). That page shows the persona's current state: avatar, name, headline, traits, endorsements, and completeness score. In the top-right corner, the owner sees three action buttons: **Share**, **Edit**, and **Delete**.

Clicking **Edit** navigates to the **edit page** (`/personas/{uri}/edit`). This is a single long-form page divided into two zones:

1. **Foundations** (top) — the persona's identity fields: display name, headline, location, entity type, visibility, avatar initial, and layout preset. These are the "who is this persona?" fields. Saved independently via a "Save Foundations" button.
2. **Traits** (below, see §4) — the persona's attribute data: skills, qualities, values, focus areas, offerings, etc. Saved independently via a "Save All Changes" button.

The user can edit either zone without affecting the other. A "Back to Persona" link returns to the detail page at any time.

This section covers the **Foundations** zone. The Traits zone is covered in §4.

### 3.2 How Users Get Here

| Entry Point | Route | Context |
|-------------|-------|---------|
| "Edit" button on persona detail page | `/personas/{uri}/edit` | Owner viewing their persona at `/personas/{uri}` |
| Direct URL | `/personas/{uri}/edit` | Bookmarked or shared link (auth required, ownership checked) |
| Coach suggestion | `/personas/{uri}/edit` | Coach says "you should update your headline" with a link |

If the persona doesn't exist or the user doesn't own it, the page redirects to `/personas`.

### 3.3 Wireframe

The wireframe below shows the full edit page. The **Foundations** card is the top zone. The trait editors (§4) appear below the separator.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Edit Persona                                    [Back to Persona]   │
│ Jamie Smith                                                         │
│                                                                     │
│ ● Unsaved changes                                             (NEW) │
│                                                                     │
│ ┌─── Foundations ──────────────────────────────────────────────────┐ │
│ │                                                                  │ │
│ │  Avatar Initial (NEW)                                            │ │
│ │  ┌──────┐                                                        │ │
│ │  │  JS  │  [Change]     Derived from display name or custom      │ │
│ │  └──────┘                                                        │ │
│ │                                                                  │ │
│ │  Display Name        [Jamie Smith                      ]         │ │
│ │  Headline            [Full-stack engineer & open-source]         │ │
│ │                      [contributor                      ]         │ │
│ │  Location            [Austin, TX                       ]         │ │
│ │                                                                  │ │
│ │  Type                Visibility                                  │ │
│ │  [Person       v]   [Community Only v]                           │ │
│ │                                                                  │ │
│ │  Layout Preset (NEW)                                             │ │
│ │  [Professional *] [Personal] [Service] [Community] [Creative]    │ │
│ │                                                                  │ │
│ │  [Save Foundations]                                               │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ──────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Capabilities                                                        │
│ ┌─── Skills ──────────────────────────────────────────────────────┐ │
│ │ ... (see §4 wireframe) ...                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Direction                                                           │
│ ┌─── Values ──────────────────────────────────────────────────────┐ │
│ │ ... (see §4 wireframe) ...                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Offerings                                                           │
│ ┌─── Offerings ───────────────────────────────────────────────────┐ │
│ │ ... (see §4 wireframe) ...                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Save All Changes]  [Done]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx         ← EXISTS: Client Component ("use client")
  ├─ components/unsaved-changes-indicator.tsx         ← NEW: visual indicator
  ├─ components/avatar-initial-editor.tsx             ← NEW: initial/avatar character picker
  ├─ components/layout-preset-picker.tsx              ← NEW (shared with creation wizard)
  ├─ components/ui/input.tsx                          ← EXISTS
  ├─ components/ui/textarea.tsx                       ← EXISTS
  ├─ components/ui/select.tsx                         ← EXISTS
  ├─ components/ui/card.tsx                           ← EXISTS
  └─ calls:
       ├─ app/actions/personas.ts → getPersona()     ← EXISTS
       ├─ app/actions/personas.ts → updatePersona()  ← EXISTS
       └─ app/actions/personas.ts → updatePersonaTraits()  ← EXISTS
```

The entire edit page is in `app/(dashboard)/personas/[uri]/edit/page.tsx` (421 lines). Foundations form spans lines 141-197.

### 3.4 Foundations Editing Behavior

> Editing UX (save behavior, unsaved changes, mobile patterns) follows `09-editing-patterns.md`. This section covers foundations-specific behavior only.

**Load state:** Page loads the persona via `getPersona(uri)`. All form fields pre-populated with current values. If persona not found or not owned, redirect to `/personas`.

**Save:** User modifies fields and taps "Save". Calls `updatePersona(uri, data)`. On success, toast: "Foundations saved". Completeness recalculated. Activity event logged (`persona_updated`).

**Avatar initial editor:** Above the display name, an avatar circle shows the current initial (from `persona.initial` or first char of display name). "Change" button reveals a text input (max 2 chars). New `components/avatar-initial-editor.tsx`.

**Layout preset picker:** Same `components/layout-preset-picker.tsx` from the creation wizard. Current preset pre-selected.

### 3.5 Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | User can view their persona's current values in the edit form | Exists. Pre-populates all fields on load. Redirects to `/personas` if not found/owned. |
| 3.2 | User can edit and save foundation fields on the edit page | Exists (enhance with toast). Display name, headline, location, type, visibility. Completeness recalculated. |
| 3.3 | User can customize their persona's avatar initial on the edit page | New. 1-2 character input. Falls back to first char of display name if cleared. |
| 3.4 | User can change the layout preset on the edit page | Reuses `layout-preset-picker.tsx`. Saved with foundations. |
| 3.5 | User can see an unsaved changes indicator on the edit page | New. Compares current form values against last-saved state. |

### 3.6 Validation

```typescript
// MODIFIED — lib/validations/personas.ts updatePersonaSchema
// Adds initial and layoutPreset fields

import { LAYOUT_PRESETS } from '@/lib/constants';

export const updatePersonaSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer')
    .optional(),
  headline: z.string().max(300, 'Headline must be 300 characters or fewer').optional(),
  location: z.string().max(100).optional(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  visibility: z.enum(VISIBILITY_LEVELS).optional(),
  initial: z.string().max(2, 'Initial must be 2 characters or fewer').optional(),
  layoutPreset: z.enum([...LAYOUT_PRESETS, 'auto'] as [string, ...string[]]).optional(),
});
```

### 3.7 Edge Cases

- [ ] User clears display name and tries to save: Zod rejects with "Display name is required"
- [ ] User types a 301-character headline: Zod rejects with max length error
- [ ] User changes entity type from person to org: saved, layout preset suggestion updates but does not auto-change
- [ ] Two browser tabs editing same persona: last save wins (no optimistic locking for MVP)
- [ ] User navigates away with unsaved changes via client-side routing: `beforeunload` only fires on full page unloads; Next.js client navigation not intercepted (acceptable for MVP)

### 3.8 Test Criteria

**Unit tests:**
- `updatePersonaSchema` accepts valid `initial` values ("JS", "A", "")
- `updatePersonaSchema` rejects `initial` with 3+ characters
- `updatePersonaSchema` accepts valid layout preset values

**Integration tests:**
- `updatePersona()` saves `initial` and `layoutPreset` to the DB
- `updatePersona()` recalculates completeness after headline change

**E2E tests:**
- Edit page: change display name, save, verify name updated on detail page
- Edit page: change avatar initial to "JS", save, verify initial shown on card
- Edit page: modify field, verify unsaved indicator appears, save, verify it disappears

### 3.9 Implementation Order

1. Add `initial` and `layoutPreset` to `updatePersonaSchema` in `lib/validations/personas.ts` (also add `layoutPreset` to `createPersonaSchema`)
2. Create `components/avatar-initial-editor.tsx`
3. Create (or reuse from feature 2) `components/layout-preset-picker.tsx`
4. Create `components/unsaved-changes-indicator.tsx`
5. Integrate avatar editor, layout picker, and unsaved indicator into `app/(dashboard)/personas/[uri]/edit/page.tsx` foundations form (requires steps 2, 3, 4)
6. Add `toast.success` calls to `handleBaseSubmit` and `saveTraits` in edit page
7. Write unit tests for updated Zod schemas
8. Write E2E test for foundations editing flow

---

## 4. Persona Editing — Trait Selection

### 4.1 Overview

The trait editor is the core interaction for building a persona. Users select traits from their master traits collection to include in a specific persona, and can add new traits that flow into both the user's traits and the persona. Currently, the edit page has inline editors for skills, qualities, values, seeking opportunities, and focus areas. Enhancements add traits-awareness (showing what user traits are available but not yet included), the ability to add traits directly during editing, and coverage of all trait categories including offerings.

### 4.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ ══ Capabilities ═══════════════════════════════════════════════════  │
│                                                                     │
│ ┌─── Skills ─────────────────────────────────────────────────────┐  │
│ │                                                    [Add Skill] │  │
│ │ Included in this persona:                                      │  │
│ │ ┌────────────────────────────────────────────────────────────┐  │  │
│ │ │ [TypeScript    ] [Advanced v] [Remove]                     │  │  │
│ │ │ [React         ] [Expert   v] [Remove]                     │  │  │
│ │ │ [GraphQL       ] [Intermed.v] [Remove]                     │  │  │
│ │ └────────────────────────────────────────────────────────────┘  │  │
│ │                                                                │  │
│ │ Available from your traits: (NEW)                                │  │
│ │ ┌──────────────────────────────────────────────────────────┐   │  │
│ │ │ Python (Advanced)    [+ Add]                             │   │  │
│ │ │ PostgreSQL (Expert)  [+ Add]                             │   │  │
│ │ │ Docker (Intermediate)[+ Add]                             │   │  │
│ │ └──────────────────────────────────────────────────────────┘   │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌─── Qualities ──────────────────────────────────────────────────┐  │
│ │ [Patient teacher x] [Bridge-builder x] [Detail-oriented x]    │  │
│ │ [Add quality...                              ] [Add]           │  │
│ │                                                                │  │
│ │ Available from your traits: (NEW)                                │  │
│ │ [+ Empathetic listener] [+ Systems thinker]                    │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ══ Direction ══════════════════════════════════════════════════════  │
│                                                                     │
│ ┌─── Values ─────────────────────────────────────────────────────┐  │
│ │ [Open Source x] [Mentorship x]                                 │  │
│ │ [Add value...                                    ] [Add]       │  │
│ │                                                                │  │
│ │ Available from your traits:                                      │  │
│ │ [+ Sustainability] [+ Transparency]                            │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌─── Looking For ────────────────────────────────────────────────┐  │
│ │ [Consulting x] [Co-founder x]                                  │  │
│ │ [Add...                                          ] [Add]       │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌─── Focus Areas ────────────────────────────────────────────────┐  │
│ │ [Professional ] [Building open-source tools  ] [Remove]        │  │
│ │ [Learning     ] [Distributed systems         ] [Remove]        │  │
│ │                                            [Add Focus Area]    │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ══ Offerings ═════════════════════════════════════════════════════  │
│                                                                     │
│ ┌─── Offerings ──────────────────────────────────────────────────┐  │
│ │ [mentorship] Code review & architecture guidance     [Remove]  │  │
│ │                                               [Add Offering]   │  │
│ │                                                                │  │
│ │ Available from your traits:                                      │  │
│ │ [+ service: Technical consulting]                              │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ [Save All Changes]  [Done]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx          ← EXISTS: Client Component
  ├─ Foundations form                                  ← EXISTS (see section 3)
  │
  ├─ ── Capabilities section ──
  │  ├─ components/trait-editors.tsx → SkillEditor     ← EXISTS (ENHANCED with traits awareness)
  │  └─ components/trait-editors.tsx → TagEditor        ← EXISTS (ENHANCED with traits awareness)
  │       └─ components/pool-available-traits.tsx       ← NEW: "Available from your traits" UI
  │
  ├─ ── Direction section ──
  │  ├─ TagEditor (values)                             ← EXISTS
  │  ├─ TagEditor (seekingOpportunities)               ← EXISTS
  │  └─ FocusAreaEditor                                ← EXISTS
  │
  ├─ ── Offerings section ──                           ← NEW section
  │  └─ components/trait-editors.tsx → OfferingEditor   ← NEW
  │
  └─ calls:
       ├─ app/actions/personas.ts → getPersona()       ← EXISTS
       ├─ app/actions/personas.ts → getUserTraits()     ← NEW (from section 2)
       └─ app/actions/personas.ts → updatePersonaTraits()  ← EXISTS
```

Currently the edit page has inline trait editors: skills (lines 204-248), qualities TagEditor (lines 250-257), values TagEditor (lines 264-271), seekingOpportunities TagEditor (lines 273-280), and focusAreas (lines 282-342). The enhancements factor these into importable components, add traits awareness, and add an offerings editor.

### 4.4 Trait Editing Behavior

**Traits awareness:** Below each trait editor, an "Available from your traits" area lists traits that exist in the user's traits but not in this persona. Skills compared by `name` (case-insensitive). String arrays compared by exact string match. Offerings compared by `description`. Each available trait has an "[+ Add]" button. Section hidden when all user traits are already included or the user has no traits for that category.

**One-click add from traits:** Clicking "[+ Add]" moves the trait from "Available" to "Included" in local state. Not persisted until "Save All Changes".

**Inline trait addition:** Existing "Add Skill" / "Add" buttons let users type new values. When saved via `updatePersonaTraits()`, the action merges persona traits back into the user's traits (spread semantics: `{ ...existingUserTraits, ...personaTraits }`). New traits flow into both persona and user traits automatically.

**Existing trait editing:** Skills have inline editable name + proficiency dropdown + Remove. String-array traits (values, qualities, seekingOpps) have badge display with "x" remove buttons + input + "Add". Focus Areas have domain + description inputs + Remove + "Add Focus Area". All modify local `traits` state.

**Offerings editor (new):** Each offering shows: type dropdown (6 types from `OFFERING_TYPES`), description text input, optional availability and audience fields. Add/Remove buttons. Traits-aware.

**Category headings:** Trait editors organized under: "Capabilities" (skills, qualities), "Direction" (values, seekingOpportunities, focusAreas), "Offerings" (offerings). Existing headings for Capabilities and Direction. New: Offerings heading.

**Atomic save:** "Save All Changes" sends the complete `traits` object to `updatePersonaTraits()`. All categories saved atomically. Completeness recalculated. User traits merge includes new traits. Toast: "Traits saved". "Done" navigates to `/personas/{uri}`.

### 4.5 Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | User can see available user traits not yet included in this persona on the edit page | New `components/pool-available-traits.tsx`. Computes user-traits-minus-persona difference per category. "[+ Add]" buttons. |
| 4.2 | User can add a user trait to the persona with one click on the edit page | Client-side state change. Trait moves from "Available" to "Included". Not persisted until save. |
| 4.3 | User can add a new trait inline that syncs to both persona and user traits | Exists. `updatePersonaTraits()` merges to user traits via spread semantics. |
| 4.4 | User can edit and remove existing traits in the persona on the edit page | Exists (enhance). Skills: name + proficiency + remove. Tags: badge + "x" remove. Focus areas: domain + description + remove. |
| 4.5 | User can add, edit, and remove offerings on the edit page | New `OfferingEditor`. Type dropdown (6 types), description, availability, audience. Traits-aware. |
| 4.6 | User can navigate trait categories with section headers on the edit page | Exists (enhance). Add "Offerings" heading. Three sections: Capabilities, Direction, Offerings. |
| 4.7 | User can save all trait changes atomically on the edit page | Exists (enhance with toast). Single `updatePersonaTraits()` call. Completeness recalculated. User traits merged. |

### 4.6 Server Actions

```typescript
// NEW — add to app/actions/personas.ts (also used by section 2)

export async function getUserTraits(): Promise<Traits>
// Authenticated user required. Returns the user's traits JSONB.
// Returns {} if no traits row exists.
```

Existing `updatePersonaTraits(uri, rawTraits)` unchanged.

### 4.7 Edge Cases

- [ ] User removes all skills from persona: skills array becomes `[]`, completeness drops
- [ ] User adds a skill that already exists in persona: deduplicated before save
- [ ] User trait and persona trait have same name but different proficiency: persona version takes precedence on traits merge
- [ ] Traits merge with multiple personas: persona A's save overwrites user trait keys present in A's traits. Keys from persona B not in A's traits are preserved (spread semantics).
- [ ] No user traits (new user with first persona): "Available from traits" sections hidden
- [ ] Offerings with empty description: Zod rejects, "Description is required"
- [ ] Very long trait lists (50+ skills): renders with scroll, no pagination for MVP

### 4.8 Test Criteria

**Unit tests:**
- Available-traits component correctly computes difference between user traits and persona skills
- Available-traits component correctly computes difference for string arrays
- Deduplication logic for skills (by name, case-insensitive)

**Integration tests:**
- `getUserTraits()` returns correct data for authenticated user
- `updatePersonaTraits()` merges new skills into the user's traits
- `updatePersonaTraits()` recalculates completeness after adding skills
- Adding an offering via `updatePersonaTraits()` increases completeness

**E2E tests:**
- Edit page: add a skill inline, save, verify it appears on persona detail page
- Edit page: verify "Available from traits" shows user traits not in persona
- Edit page: click "[+ Add]" on a user trait, verify it moves to included list
- Edit page: remove a skill, save, verify removed from persona but still in user traits

### 4.9 Implementation Order

1. Implement `getUserTraits()` server action (same as section 2, step 1)
2. Create `components/pool-available-traits.tsx` with difference computation and "[+ Add]" buttons
3. Enhance skill editor to include available-traits below current skills (requires step 2)
4. Enhance each `TagEditor` instance to include available-traits (requires step 2)
5. Add `OfferingEditor` section to edit page under "Offerings" heading
6. Fetch user traits on mount in edit page and pass to all traits-aware components (requires steps 2-5)
7. Add toast notifications to `saveTraits()` and `handleBaseSubmit()`
8. Write unit tests for traits difference computation
9. Write E2E test for traits-aware trait editing

---

## 5. Persona Deletion

### 5.1 Overview

Persona deletion permanently removes a persona and handles cascade effects on related data: endorsements, community memberships, shadow personas, contact requests, and activity events. The current implementation deletes the persona row but does not handle related data. This spec defines the complete deletion cascade.

### 5.2 Wireframe

```
Delete trigger (persona detail page):
┌──────────────────────────────────────────┐
│ [Share]  [Edit]  [Delete]                │ (red text on Delete)
└──────────────────────────────────────────┘

Confirmation dialog (EXISTS — ENHANCED):
┌──────────────────────────────────────────────────┐
│ Delete Persona                                    │
│                                                   │
│ This action cannot be undone. This persona and    │
│ all associated data will be permanently removed.  │
│                                                   │
│ The following data will be affected: (NEW)        │
│ - 5 endorsements received                         │
│ - 3 endorsements given                            │
│ - 2 community memberships                         │
│ - 1 pending contact request                       │
│                                                   │
│                    [Cancel]  [Delete]              │
└──────────────────────────────────────────────────┘

Post-delete:
→ Redirect to /personas
→ Toast: "Persona deleted"
→ Persona list refreshes
```

### 5.3 Component Hierarchy

```
components/delete-persona-button.tsx                  ← EXISTS: Client Component (ENHANCED)
  ├─ components/ui/dialog.tsx                         ← EXISTS
  ├─ components/ui/button.tsx                         ← EXISTS
  └─ calls:
       ├─ app/actions/personas.ts → getPersonaDeletionImpact()  ← NEW
       └─ app/actions/personas.ts → deletePersona()             ← EXISTS (ENHANCED)
```

The current `components/delete-persona-button.tsx` (59 lines) has a Dialog with confirmation text and calls `deletePersona(uri)`. Enhancement: fetch and display impact summary, expand server action for cascade.

### 5.4 Deletion Behavior

**Impact preview:** When the delete dialog opens, it calls `getPersonaDeletionImpact(uri)` to fetch counts of affected data: endorsements received, endorsements given, community memberships, pending contact requests, shadow personas created. Zero counts omitted. If all zero: "This persona has no associated data."

**Last persona warning:** If `isLastPersona: true`, extra warning: "This is your only persona. Deleting it will remove your public presence. Your traits will be preserved." Deletion still allowed.

**Cascade (in a single DB transaction):**
1. Endorsements received (`toPersonaUri`): set `active = false`, null `toPersonaUri`
2. Endorsements given (`fromPersonaUri`): set `active = false`
3. Community memberships (`personaId`): delete rows
4. Contact requests to (`toPersonaUri`): set `status = 'declined'`, `responseNote = 'Persona deleted'`
5. Contact requests from (`fromPersonaUri`): null `fromPersonaUri`
6. Shadow personas created by (`createdByPersonaUri`): null `createdByPersonaUri`
7. Shadow personas claimed by (`claimedByPersonaUri`): null, reset `claimStatus = 'unclaimed'`
8. Communities backed by (`backingPersonaUri`): null
9. Delete persona row
10. Log activity event `persona_deleted`

After deletion: redirect to `/personas`, toast: "Persona deleted".

**List page deletion:** `DeletePersonaButton` accepts optional `onDeleted` callback. List page passes a callback that calls `router.refresh()`. Card removed without full page navigation.

### 5.5 Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | User can preview the impact of deleting a persona in the confirmation dialog | New `getPersonaDeletionImpact()` action. Counts fetched on dialog open. Zero counts omitted. |
| 5.2 | User can delete a persona with full cascade on the persona detail page | Enhanced `deletePersona()` with transaction. 10-step cascade. Redirect + toast. |
| 5.3 | User can delete a persona from the list page card actions | `onDeleted` callback on `DeletePersonaButton`. `router.refresh()` removes card. |
| 5.4 | User can see a warning when deleting their only persona | Advisory only, not blocking. "Your traits will be preserved." |

### 5.6 Server Actions

```typescript
// NEW action — app/actions/personas.ts

export async function getPersonaDeletionImpact(uri: string): Promise<{
  endorsementsReceived: number;
  endorsementsGiven: number;
  communityMemberships: number;
  contactRequests: number;
  shadowPersonasCreated: number;
  isLastPersona: boolean;
}>
// Authenticated user required. Returns counts of data affected by deletion.

// MODIFIED action — app/actions/personas.ts deletePersona()
// Enhanced to handle cascade in a transaction (see §5.4).
export async function deletePersona(uri: string): Promise<{ success: boolean }>
```

### 5.7 Migration Notes

The endorsements CHECK constraint needs updating. Currently: `toPersonaUri IS NOT NULL OR toShadowPersonaId IS NOT NULL`. After cascade sets both to NULL on soft-delete, this fails. Fix:

```sql
ALTER TABLE endorsements DROP CONSTRAINT endorsement_target_check;
ALTER TABLE endorsements ADD CONSTRAINT endorsement_target_check
  CHECK (active = false OR (to_persona_uri IS NOT NULL OR to_shadow_persona_id IS NOT NULL));
```

This allows deactivated endorsements to have both target fields NULL while still requiring active endorsements to have at least one target.

### 5.8 Edge Cases

- [ ] Persona has 0 related data: delete proceeds normally, no cascade needed
- [ ] Persona is the `backingPersonaUri` for a community: set to NULL (community continues)
- [ ] Persona has endorsements that are already inactive: no-op for those rows
- [ ] Concurrent deletion (user clicks Delete twice): second call fails gracefully ("Persona not found")
- [ ] Persona delete while someone is viewing it: viewer sees 404 on next navigation
- [ ] User traits are NOT affected by deletion: user traits retained

### 5.9 Test Criteria

**Unit tests:**
- `getPersonaDeletionImpact()` returns correct counts for persona with known related data
- `getPersonaDeletionImpact()` returns all zeros and `isLastPersona: true` when user has exactly 1 persona

**Integration tests:**
- `deletePersona()` removes persona row from DB
- `deletePersona()` sets endorsements to inactive
- `deletePersona()` deletes community memberships
- `deletePersona()` declines pending contact requests
- `deletePersona()` resets shadow persona claim status
- `deletePersona()` preserves the user's traits
- Transaction rolls back on failure (no partial cascade)

**E2E tests:**
- Delete persona from detail page: confirm dialog, verify redirect, verify removed from list
- Delete persona with endorsements: verify endorsements deactivated
- Delete last persona: verify warning shown, deletion allowed

### 5.10 Implementation Order

1. Verify and update endorsement CHECK constraint (migration if needed)
2. Implement `getPersonaDeletionImpact()` server action with count queries
3. Enhance `deletePersona()` with transaction and cascade logic (requires step 1)
4. Update `components/delete-persona-button.tsx` to fetch and display impact on dialog open (requires step 2)
5. Add `onDeleted` callback support to `DeletePersonaButton` for list page usage
6. Add `toast.success('Persona deleted')` after successful deletion
7. Write integration tests for cascade behavior (requires step 3)
8. Write E2E test for full deletion flow

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | User can view all their personas as cards on the persona list page | `personas`, `crud` | -- | -- |
| 1.2 | User can see placeholder cards for uncreated persona types | `personas`, `crud`, `onboarding` | 1.1 | -- |
| 1.3 | User can click a placeholder to start the wizard with pre-filled defaults | `personas`, `creation`, `onboarding` | 1.2, 2.1 | -- |
| 1.4 | System supports adding new placeholder types without code changes | `personas`, `config` | 1.2 | -- |
| 2.1 | User can select an entity type on wizard step 1 | `personas`, `creation` | -- | -- |
| 2.2 | User can enter basic info and create a persona on wizard step 2 | `personas`, `creation` | 2.1 | -- |
| 2.3 | User can select a layout preset during persona creation | `personas`, `creation` | 2.2 | -- |
| 2.4 | User can quick-add traits from their user traits during persona creation | `personas`, `creation`, `traits` | 2.2 | -- |
| 2.5 | User can choose to continue with the coach or finish after creation | `personas`, `creation` | 2.2 | -- |
| 2.6 | User can create a persona through conversation with the Coach | `personas`, `creation`, `coach` | -- | -- |
| 3.1 | User can view their persona's current values in the edit form | `personas`, `editing` | -- | -- |
| 3.2 | User can edit and save foundation fields on the edit page | `personas`, `editing` | 3.1 | -- |
| 3.3 | User can customize their persona's avatar initial on the edit page | `personas`, `editing` | 3.1 | -- |
| 3.4 | User can change the layout preset on the edit page | `personas`, `editing` | 3.1, 2.3 | -- |
| 3.5 | User can see an unsaved changes indicator on the edit page | `personas`, `editing` | 3.1 | -- |
| 4.1 | User can see available user traits not yet in this persona on the edit page | `personas`, `traits` | 3.1 | -- |
| 4.2 | User can add a user trait to the persona with one click on the edit page | `personas`, `traits` | 4.1 | -- |
| 4.3 | User can add a new trait inline that syncs to both persona and user traits | `personas`, `traits` | -- | -- |
| 4.4 | User can edit and remove existing traits in the persona on the edit page | `personas`, `traits` | -- | -- |
| 4.5 | User can add, edit, and remove offerings on the edit page | `personas`, `traits`, `offerings` | 4.4 | -- |
| 4.6 | User can navigate trait categories with section headers on the edit page | `personas`, `traits` | -- | -- |
| 4.7 | User can save all trait changes atomically on the edit page | `personas`, `traits` | 4.4 | -- |
| 5.1 | User can preview the impact of deleting a persona in the confirmation dialog | `personas`, `deletion` | -- | -- |
| 5.2 | User can delete a persona with full cascade on the persona detail page | `personas`, `deletion` | 5.1 | -- |
| 5.3 | User can delete a persona from the list page card actions | `personas`, `deletion` | 5.2, 1.1 | -- |
| 5.4 | User can see a warning when deleting their only persona | `personas`, `deletion` | 5.1 | -- |

**Conventions:**
- Story titles follow "Actor can DO THING in CONTEXT" format
- Labels include the spec suite (`personas`) and feature area
- Blocked By reflects story dependencies — matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
