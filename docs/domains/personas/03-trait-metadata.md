---
type: spec
title: "Identity & Personas — Trait Metadata and Rendering System"
description: "The trait metadata system is the engine that turns raw JSONB data into rendered UI and editable forms. Every trait type in Personus -- skills, experience, values, offerings, commerce preferences,…"
status: current
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas — Trait Metadata and Rendering System

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-trait-pool.md`
> Primary actors: User, Community Organizer (CO), AI Agent

The trait metadata system is the engine that turns raw JSONB data into rendered UI and editable forms. Every trait type in Personus -- skills, experience, values, offerings, commerce preferences, and any future addition -- is described by a single row in the `trait_metadata` table. That row's `displayConfig` drives how the trait renders on a persona page, and its `editConfig` drives how the user edits it. No component code needs to change when a new trait type is added. This spec covers the complete metadata-driven rendering pipeline, taxonomy management, display configurations, edit configurations, privacy tiers, and the extension model.

---

## 1. The Metadata-Driven Rendering System

### Overview

Personus renders traits without hardcoded per-trait components. Instead, a small set of generic display components and edit components read configuration from the `trait_metadata` table and adapt their behavior accordingly. This architecture means new trait types can be added by inserting a database row and (optionally) a taxonomy -- no component code changes, no deployments beyond the seed runner.

### Wireframe

```
DISPLAY PIPELINE
================

trait_metadata row (DB)           persona.traits JSONB (DB)
       |                                    |
       v                                    v
┌──────────────────┐           ┌──────────────────────┐
│  displayConfig:  │           │  { skills: [...],    │
│    type: tag_list│           │    values: [...],    │
│    showField: name           │    experience: [...] │
│    badgeColor: blue          │  }                   │
└────────┬─────────┘           └──────────┬───────────┘
         │                                │
         └────────────┬───────────────────┘
                      v
              ┌───────────────┐
              │ TraitDisplay  │  ← dispatcher component
              │  (switch on   │
              │  config.type) │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┬──────────────┬────────────┐
        v             v             v              v            v
  TagListDisplay PillListDisplay TimelineDisplay CardListDisplay ProseDisplay
  (skills,       (values,       (experience,   (certifications,(headline,
   interests)    qualities,      education)     offerings,      location)
                 languages)                     focusAreas)


EDIT PIPELINE
=============

trait_metadata row (DB)           trait_taxonomies rows (DB)
       |                                    |
       v                                    v
┌──────────────────┐           ┌──────────────────────┐
│  editConfig:     │           │  taxonomySlug: skills │
│    type:         │           │  suggestedValues: []  │
│      multi_item  │           │  (grouped by slug)    │
│    fields: [...]│           └──────────┬───────────┘
└────────┬─────────┘                     │
         └────────────┬──────────────────┘
                      v
              ┌───────────────┐
              │ TraitEditor   │  ← dispatcher component
              │  (switch on   │
              │  config.type) │
              └───────┬───────┘
                      │
        ┌─────────────┼────────────────┬─────────────────┐
        v             v                v                  v
  MultiItemForm   TagInputEditor   TextEditor       StructuredForm
  (skills,        (values,         (headline,       (contactPrefs,
   experience,    qualities,        location)        commerceLocale,
   education)     languages)                         shippingPrefs)
        │
        v
  ┌───────────┐
  │ ItemForm  │ ← inline form per item
  │  renders  │
  │ FieldRenderer per field
  └───────────┘
        │
        v
  ┌─────────────────────────────────────────────┐
  │ FieldRenderer: text | select | number |     │
  │   month_year | checkbox | textarea |        │
  │   text_with_suggestions (with taxonomy)     │
  └─────────────────────────────────────────────┘
```

### Component Hierarchy

```
DISPLAY PATH
─────────────
app/(dashboard)/personas/[uri]/page.tsx        ← Server Component (data fetching)
  └─ components/trait-displays.tsx              ← Client Component ("use client")
       ├─ TraitDisplay (dispatcher)            ← EXISTING: L109
       │    ├─ TagListDisplay                  ← EXISTING: L182
       │    ├─ PillListDisplay                 ← EXISTING: L244
       │    ├─ TimelineDisplay                 ← EXISTING: L285
       │    ├─ CardListDisplay                 ← EXISTING: L413
       │    ├─ TableDisplay                    ← NEW (story 1.4)
       │    └─ ProseDisplay                    ← EXISTING: L520
       └─ reads: persona.traits JSONB + trait_metadata rows

EDIT PATH
──────────
app/(dashboard)/personas/[uri]/edit/page.tsx   ← Client Component (form state)
  └─ components/trait-editors.tsx               ← Client Component ("use client")
       ├─ TraitEditor (dispatcher)             ← EXISTING: L33
       │    ├─ MultiItemFormEditor             ← EXISTING: L185
       │    │    ├─ ItemForm                   ← EXISTING: L315
       │    │    └─ FieldRenderer              ← EXISTING: L392
       │    ├─ TagInputEditor                  ← EXISTING: L88
       │    ├─ TextEditor                      ← EXISTING: L504
       │    └─ StructuredFormEditor            ← NEW (story 2.4)
       └─ calls: app/actions/personas.ts       ← Server Actions
            └─ writes: personas.traits + user_traits.traits

METADATA LOADING
─────────────────
lib/db/schema/traits.ts                        ← Schema: EXISTING
lib/db/seed/trait-metadata.ts                  ← Seed: EXISTING (41 rows)
lib/db/seed/taxonomies/index.ts                ← Seed: EXISTING (14 taxonomy files)
app/actions/traits.ts                          ← Server Actions: NEW (metadata + taxonomy queries)
```

### Workflows & Stories

---

#### Workflow: System loads metadata and renders traits on a persona page

**Preconditions:**
- User is viewing a persona page (owner or visitor)
- The `trait_metadata` and `trait_taxonomies` tables are seeded
- The persona has at least one populated trait in its `traits` JSONB

**Stories:**

**[1.1] Fetch trait metadata for rendering**
> System fetches all trait_metadata rows so the persona page knows how to render each trait key

- **User:** Authenticated or anonymous user navigating to `/personas/[uri]` or `/p/[uri]`
- **Functional:** Server component fetches all trait_metadata rows (cached), then for each key present in `persona.traits`, looks up the corresponding displayConfig and passes it to TraitDisplay
- **Technical:**
  - New server action `getTraitMetadata()` in `app/actions/traits.ts` that queries `trait_metadata` ordered by `category` then `displayOrder`
  - Results cached via Next.js `unstable_cache` (revalidate on seed changes)
  - Page iterates over metadata rows grouped by `category`, checks if `persona.traits[row.key]` exists, and renders `<TraitDisplay>` for each populated key
- **Acceptance criteria:**
  - [ ] All trait_metadata rows are fetched in a single query
  - [ ] Metadata is cached (does not re-query on every page load)
  - [ ] Only traits present in `persona.traits` are rendered (empty keys produce no output)
  - [ ] Traits render in the order defined by `category` grouping and `displayOrder`
- **Failure paths:**
  - If trait_metadata table is empty: persona page shows the fallback empty state (already implemented)
  - If a trait key exists in persona.traits but has no metadata row: trait is silently skipped (no crash)

**[1.2] Dispatch to correct display component based on displayConfig.type**
> TraitDisplay reads displayConfig.type and delegates to the correct sub-component

- **User:** Viewing any persona page with populated traits
- **Functional:** TraitDisplay switch statement routes to TagListDisplay, PillListDisplay, TimelineDisplay, CardListDisplay, ProseDisplay, or TableDisplay based on `displayConfig.type`
- **Technical:**
  - `components/trait-displays.tsx` TraitDisplay (existing, L109-L168)
  - Add `table` case to the switch (currently falls through to `default: null`)
  - Each sub-component receives `traitKey`, `displayName`, `displayConfig`, `value`, and `className`
- **Acceptance criteria:**
  - [ ] `tag_list` routes to TagListDisplay
  - [ ] `pill_list` routes to PillListDisplay
  - [ ] `timeline` routes to TimelineDisplay
  - [ ] `card_list` routes to CardListDisplay
  - [ ] `prose` routes to ProseDisplay
  - [ ] `table` routes to TableDisplay (new)
  - [ ] Unknown type returns null (no crash)
- **Failure paths:**
  - If displayConfig is malformed JSON: component catches and renders nothing

**[1.3] Render traits grouped by category with section headers**
> Persona page groups traits into visible sections (Foundations, Capabilities, Direction, Offerings, Commerce) with headers

- **User:** Viewing a persona with traits across multiple categories
- **Functional:** Page renders section headers ("Capabilities", "Direction", etc.) when at least one trait in that category has data. Empty categories are omitted entirely.
- **Technical:**
  - Group metadata rows by `category` field
  - For each category with at least one populated trait, render a section header followed by TraitDisplay components
  - Section ordering follows the layout preset's `sectionOrder` (from `lib/personas/layout-config.ts`)
  - Category display names: `foundations` -> "About", `capabilities` -> "Capabilities", `direction` -> "Direction", `offerings` -> "Offerings", `commerce` -> "Preferences"
- **Acceptance criteria:**
  - [ ] Categories with no populated traits are not rendered at all
  - [ ] Section order respects layout preset configuration
  - [ ] Each section has a visible header with the category display name
  - [ ] Traits within a section are ordered by `displayOrder`
- **Failure paths:**
  - If all traits are empty: the existing empty-state card is shown (already implemented)

**[1.4] Implement TableDisplay for tabular traits**
> New display component renders traits with `displayConfig.type: 'table'` as a responsive table

- **User:** Viewing a persona with commerce traits like delivery windows or clothing sizes
- **Functional:** Renders a responsive table with columns defined in `displayConfig.columns`. On mobile, collapses to a stacked card layout.
- **Technical:**
  - New `TableDisplay` component in `components/trait-displays.tsx`
  - Reads `displayConfig.columns` array for header names
  - For `array_of_objects` data: each object becomes a row, columns map to object keys
  - For `object` data: each column becomes a key-value row
  - Mobile breakpoint (< sm): render as stacked cards instead of table
- **Acceptance criteria:**
  - [ ] Renders a table with proper headers from `displayConfig.columns`
  - [ ] Each data item maps to a table row
  - [ ] Responsive: table on desktop, stacked cards on mobile
  - [ ] Empty columns are omitted
  - [ ] Works for `deliveryWindows` (array_of_objects) and `clothingSizes` (object)
- **Failure paths:**
  - If columns config is missing: fall back to rendering all object keys as columns

**Workflow success:** Every populated trait on a persona page renders using the correct display component, driven entirely by its trait_metadata row. No trait-specific rendering logic exists in the page component.

---

#### Workflow: User edits traits using metadata-driven forms

**Preconditions:**
- User is the owner of the persona
- User is on the edit page (`/personas/[uri]/edit`)
- trait_metadata and trait_taxonomies tables are seeded

**Stories:**

**[2.1] Load metadata and render edit sections**
> Edit page fetches trait_metadata and renders an editor for each trait type, grouped by category

- **User:** Persona owner navigating to the edit page
- **Functional:** Page renders collapsible sections per category. Each trait shows its current value (or empty state) with an "Edit" button. Clicking "Edit" opens the TraitEditor inline.
- **Technical:**
  - Refactor `app/(dashboard)/personas/[uri]/edit/page.tsx` (currently 420 lines of hardcoded forms) to use metadata-driven approach
  - Fetch all trait_metadata rows via `getTraitMetadata()` server action
  - For each metadata row, pass `editConfig` + current value to `<TraitEditor>`
  - Replace the current hardcoded `TagEditor`, `addSkill`, etc. with the generic editors in `components/trait-editors.tsx`
- **Acceptance criteria:**
  - [ ] Edit page renders all 13 non-commerce trait types (foundations + capabilities + direction + offerings)
  - [ ] Each trait shows its current value in display mode with an "Edit" pencil button
  - [ ] Clicking "Edit" switches that trait to edit mode (TraitEditor)
  - [ ] Saving calls `updatePersonaTraits()` with the updated traits JSONB
  - [ ] Categories are collapsible accordion sections
- **Failure paths:**
  - If metadata fetch fails: show error boundary with retry button
  - If save fails: show toast error, preserve form state

**[2.2] Load taxonomy suggestions into edit forms**
> Fields with `taxonomySlug` in their editConfig fetch suggested values from trait_taxonomies

- **User:** Editing skills, interests, education field, or other taxonomy-backed traits
- **Functional:** When a field has `taxonomySlug` set (e.g., `skills`), the editor fetches matching taxonomy rows and presents their `suggestedValues` as a searchable dropdown/combobox. Users can still type custom values not in the taxonomy.
- **Technical:**
  - New server action `getTaxonomyValues(traitKey: string, taxonomySlug?: string)` in `app/actions/traits.ts`
  - Returns `{ categories: [{ slug, displayName, icon, values: string[] }] }`
  - FieldRenderer for `text_with_suggestions` type renders a Combobox (shadcn/ui Command) with:
    - Category groups (e.g., "Technology & Software", "Business & Management")
    - Filtered values as user types
    - "Add custom: [typed value]" option at bottom if no match
  - Taxonomy data is fetched once per edit session and cached in React state
- **Acceptance criteria:**
  - [ ] Skills field shows taxonomy categories with grouped suggestions
  - [ ] Typing filters suggestions in real-time
  - [ ] User can select a suggested value or type a custom one
  - [ ] Custom values not in taxonomy are accepted and saved
  - [ ] Education "Field of Study" field shows education taxonomy
  - [ ] Interests field shows interest taxonomy with categories
  - [ ] Offerings "Audience" field shows offerings taxonomy
- **Failure paths:**
  - If taxonomy fetch fails: field degrades to plain text input (no crash)
  - If taxonomy is empty for a slug: field renders as plain text input

**[2.3] Save individual trait changes with optimistic UI**
> Each trait editor saves independently without requiring a full-page save

- **User:** Editing one trait at a time on the edit page
- **Functional:** When user clicks "Save" on a trait editor, only that trait key is updated in the persona's traits JSONB. The rest of the traits are preserved. The UI shows optimistic update immediately, then confirms from server.
- **Technical:**
  - New server action `updateSingleTrait(uri: string, key: string, value: unknown)` in `app/actions/personas.ts`
  - Reads current persona traits, merges the single key, writes back
  - Also syncs to user_traits (existing pattern in `updatePersonaTraits`)
  - Recalculates completeness score
  - Client shows immediate value change, reverts on error
- **Acceptance criteria:**
  - [ ] Saving one trait does not reset other traits
  - [ ] User traits are updated to include the new value
  - [ ] Completeness score recalculates after save
  - [ ] Optimistic update shows immediately in display mode
  - [ ] On save error, value reverts and toast shows error message
  - [ ] Activity event logged: `traits_updated` with trait key in detail
- **Failure paths:**
  - If persona not found: throw Error (caught by edit page error handler)
  - If Zod validation fails on the trait value: show validation errors inline

**[2.4] Implement StructuredFormEditor for single-object traits**
> New editor component renders a fixed-field form for object-type traits (commerce preferences, contact preferences)

- **User:** Editing commerce traits like Locale & Currency, Shipping Preferences, Budget Preferences
- **Functional:** Renders a form with all fields from `editConfig.fields` at once (not a dynamic list like multi_item_form). Saves the entire object on submit.
- **Technical:**
  - New `StructuredFormEditor` component in `components/trait-editors.tsx`
  - Similar to `ItemForm` but:
    - Pre-populates with existing values (not blank)
    - Has its own Save/Cancel buttons
    - Does not add to a list -- saves a single object
  - Reuses `FieldRenderer` for individual field types
  - Add `structured_form` case to TraitEditor switch (currently falls through to "No editor available")
- **Acceptance criteria:**
  - [ ] All fields from editConfig.fields render with correct types
  - [ ] Pre-populated with current trait values
  - [ ] Save writes the full object as the trait value
  - [ ] Optional fields can be left blank
  - [ ] `commerceLocale`, `shippingPreferences`, `budgetPreferences` all render correctly
  - [ ] `agentAuthorization`, `returnPreferences` render correctly
- **Failure paths:**
  - If editConfig.fields is empty or missing: show "No fields configured" message

**Workflow success:** Users can edit every trait type through a consistent, metadata-driven interface. The edit page contains no trait-specific form code -- all form behavior is determined by editConfig.

---

## 2. Display Configurations

### Overview

Six display types cover all current and anticipated trait rendering needs. Each type maps to exactly one React component. The display config is stored as JSONB in the `trait_metadata` table and read at render time.

### Wireframe

```
TAG_LIST (skills, interests)
┌──────────────────────────────────────────────────────────────┐
│  SKILLS                                                       │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ ● Python │ │ ● React    │ │ ● Node.js│ │ ● TypeScript  │ │
│  └──────────┘ └────────────┘ └──────────┘ └───────────────┘ │
│  (● = proficiency dot: gray/blue/green/amber)                 │
└──────────────────────────────────────────────────────────────┘

PILL_LIST (values, qualities, languages, seekingOpportunities)
┌──────────────────────────────────────────────────────────────┐
│  VALUES                                                       │
│  ┌───────────┐ ┌────────────┐ ┌──────────────┐              │
│  │ Integrity │ │ Innovation │ │ Sustainability│              │
│  └───────────┘ └────────────┘ └──────────────┘              │
│  (color from displayConfig.badgeColor)                        │
└──────────────────────────────────────────────────────────────┘

TIMELINE (experience, education)
┌──────────────────────────────────────────────────────────────┐
│  EXPERIENCE                                                   │
│  ● Senior Engineer                                            │
│  │ Acme Corp                                                  │
│  │ Austin, TX                                                 │
│  │ Jan 2022 - Present  [Current]                             │
│  │ Leading the platform team...                               │
│  │                                                            │
│  ○ Software Engineer                                          │
│  │ StartupCo                                                  │
│  │ Mar 2019 - Dec 2021                                        │
│  │                                                            │
│  ○ Junior Developer                                           │
│    BigCorp                                                    │
│    Jun 2017 - Feb 2019                                        │
└──────────────────────────────────────────────────────────────┘

CARD_LIST (certifications, offerings, focusAreas)
┌──────────────────────────────────────────────────────────────┐
│  OFFERINGS                                                    │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │ Mentorship              │ │ Service                  │    │
│  │ 1-on-1 career coaching  │ │ React consulting for     │    │
│  │ for junior engineers    │ │ small businesses         │    │
│  │ Availability: Weekends  │ │ Availability: 5hr/week   │    │
│  │ Audience: Junior devs   │ │ Audience: Startups       │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

TABLE (deliveryWindows, clothingSizes)
┌──────────────────────────────────────────────────────────────┐
│  DELIVERY WINDOWS                                             │
│  ┌─────────────┬──────────────┬───────────┬───────────┐     │
│  │ Label       │ Days         │ Start     │ End       │     │
│  ├─────────────┼──────────────┼───────────┼───────────┤     │
│  │ Mornings    │ Mon-Fri      │ 09:00     │ 12:00     │     │
│  │ Weekends    │ Sat, Sun     │ 10:00     │ 18:00     │     │
│  └─────────────┴──────────────┴───────────┴───────────┘     │
└──────────────────────────────────────────────────────────────┘

PROSE (headline, location, commerceTimezone)
┌──────────────────────────────────────────────────────────────┐
│  HEADLINE                                                     │
│  Full-stack developer who loves building tools for small      │
│  businesses                                                   │
└──────────────────────────────────────────────────────────────┘
```

### Display Type Reference

| Type | Component | Data Shape | Config Options | Used By |
|------|-----------|-----------|----------------|---------|
| `tag_list` | `TagListDisplay` | `Record<string, unknown>[]` | `showField`, `badgeColor` | skills, interests |
| `pill_list` | `PillListDisplay` | `string[]` | `badgeColor` | qualities, values, languages, seekingOpportunities, dietaryRestrictions, allergens, favoriteBrands, styleTags, materialPreferences, blockedBrands, requiredCertifications, paymentMethodTokens, dietaryPreferences |
| `timeline` | `TimelineDisplay` | `Record<string, unknown>[]` | (none -- uses traitKey to determine labels) | experience, education |
| `card_list` | `CardListDisplay` | `Record<string, unknown>[]` or `object` | Uses `cardFieldConfigs` map for known trait keys; falls back to generic rendering | certifications, offerings, focusAreas, commerceLocale, shippingPreferences, budgetPreferences, agentAuthorization, returnPreferences, loyaltyPrograms, brandSizeNotes, householdDietary |
| `table` | `TableDisplay` (new) | `Record<string, unknown>[]` or `object` | `columns` | deliveryWindows, clothingSizes |
| `prose` | `ProseDisplay` | `string` | (none) | headline, location, commerceTimezone, shoeSize, fitPreference, techEcosystem, sustainabilityPriority, packagingPreference, secondhandOk, verifiedAgeBracket, verifiedLocationZone |

### Badge Color Mapping

Defined in `components/trait-displays.tsx` L22-28:

| Color Key | Light Mode | Dark Mode | Used By |
|-----------|-----------|-----------|---------|
| `blue` | `bg-blue-50 text-blue-700` | `bg-blue-950 text-blue-300` | skills |
| `green` | `bg-green-50 text-green-700` | `bg-green-950 text-green-300` | qualities |
| `orange` | `bg-orange-50 text-orange-700` | `bg-orange-950 text-orange-300` | interests |
| `purple` | `bg-purple-50 text-purple-700` | `bg-purple-950 text-purple-300` | values |
| `teal` | `bg-teal-50 text-teal-700` | `bg-teal-950 text-teal-300` | seekingOpportunities |
| (default) | `bg-muted text-muted-foreground` | (same) | any without badgeColor |

### Visibility Per-Trait Overrides

Individual trait items can carry a `visibilityOverride` field (currently defined on `Skill` in `types/index.ts` L14). When rendering:

1. If `visibilityOverride` is set on an item, it overrides the persona-level visibility for that specific item
2. If the viewer's access level is lower than the override, the item is excluded from rendering
3. This is enforced server-side before traits reach the display component

Implementation deferred to the visibility spec but the display components must handle receiving a filtered subset of items.

---

## 3. Edit Configurations

### Overview

Four edit types cover all current and anticipated trait editing needs. Each type maps to one React component in `components/trait-editors.tsx`. The edit config is stored as JSONB in the `trait_metadata` table alongside the display config.

### Wireframe

```
MULTI_ITEM_FORM (skills, experience, education, certifications, interests, offerings, focusAreas)
┌──────────────────────────────────────────────────────────────┐
│  SKILLS                                                [Edit] │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Python              │ advanced   │               [Del] │  │
│  │ React               │ expert     │               [Del] │  │
│  │ Node.js             │ advanced   │               [Del] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐  │
│  │ Add Skill form (ItemForm):                             │  │
│  │  Skill: [_________ ▼ taxonomy suggestions]             │  │
│  │  Proficiency: [beginner ▼]                             │  │
│  │        [Add]  [Cancel]                                 │  │
│  └ - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘  │
│                                                               │
│  [+ Add Skill]                                                │
│                                                               │
│  [Save]  [Cancel]                                             │
└──────────────────────────────────────────────────────────────┘

TAG_INPUT (qualities, values, seekingOpportunities, languages, dietaryRestrictions)
┌──────────────────────────────────────────────────────────────┐
│  VALUES                                                [Edit] │
│                                                               │
│  ┌───────────┐ ┌────────────┐ ┌──────────────┐              │
│  │ Integrity ×│ │ Innovation ×│ │ Creativity × │              │
│  └───────────┘ └────────────┘ └──────────────┘              │
│                                                               │
│  [Type a value... ________________________________]           │
│  Press Enter or comma to add a tag                            │
│                                                               │
│  [Save]  [Cancel]                                             │
└──────────────────────────────────────────────────────────────┘

TEXT_WITH_SUGGESTIONS (headline, location, commerceTimezone, shoeSize)
┌──────────────────────────────────────────────────────────────┐
│  HEADLINE                                              [Edit] │
│                                                               │
│  [Full-stack developer who loves building tools for___]       │
│                                                               │
│  [Save]  [Cancel]                                             │
└──────────────────────────────────────────────────────────────┘

STRUCTURED_FORM (commerceLocale, shippingPreferences, budgetPreferences, agentAuthorization)
┌──────────────────────────────────────────────────────────────┐
│  LOCALE & CURRENCY                                     [Edit] │
│                                                               │
│  Language:  [en-US_______]                                    │
│  Country:   [US__________]                                    │
│  Currency:  [USD_________]                                    │
│                                                               │
│  [Save]  [Cancel]                                             │
└──────────────────────────────────────────────────────────────┘

SELECT (verifiedAgeBracket, fitPreference, techEcosystem, etc.)
┌──────────────────────────────────────────────────────────────┐
│  AGE VERIFICATION                                      [Edit] │
│                                                               │
│  [18+ ▼]                                                      │
│                                                               │
│  [Save]  [Cancel]                                             │
└──────────────────────────────────────────────────────────────┘
```

### Edit Type Reference

| Type | Component | Data Shape In | Data Shape Out | Config Options | Used By |
|------|-----------|--------------|----------------|----------------|---------|
| `multi_item_form` | `MultiItemFormEditor` | `Record<string, unknown>[]` | `Record<string, unknown>[]` | `addButtonText`, `fields[]` | skills, experience, education, certifications, interests, offerings, focusAreas, deliveryWindows, loyaltyPrograms, brandSizeNotes, householdDietary |
| `tag_input` | `TagInputEditor` | `string[]` | `string[]` | `placeholder` | qualities, values, seekingOpportunities, languages, dietaryRestrictions, allergens, dietaryPreferences, favoriteBrands, blockedBrands, styleTags, materialPreferences, requiredCertifications, paymentMethodTokens |
| `text_with_suggestions` | `TextEditor` | `string` | `string` | `placeholder` | headline, location, commerceTimezone, shoeSize |
| `structured_form` | `StructuredFormEditor` (new) | `object` | `object` | `fields[]` | commerceLocale, shippingPreferences, budgetPreferences, agentAuthorization, returnPreferences, clothingSizes |
| `select` | `SelectEditor` (new) | `string` | `string` | `options[]` | verifiedAgeBracket, verifiedLocationZone, fitPreference, techEcosystem, sustainabilityPriority, packagingPreference, secondhandOk |

### Field Types Within Forms

The `FieldRenderer` component (existing, `components/trait-editors.tsx` L392) handles individual form fields:

| Field Type | Renders As | Used For |
|-----------|-----------|---------|
| `text` | `<Input>` | company, title, name, issuer, etc. |
| `textarea` | `<Textarea>` | description, deliveryInstructions |
| `select` | `<Select>` (Radix) | proficiency, type, domain, speedPreference, etc. |
| `number` | `<Input type="number">` | perItemMax, autoPurchaseThreshold |
| `month_year` | `<Input type="month">` | startDate, endDate, issueDate, expiryDate |
| `checkbox` | `<Checkbox>` (Radix) | current, active |
| `text_with_suggestions` | `<Input>` + Combobox (future) | skill name, field of study, audience |

### Taxonomy Slug Connection

When a field's `FieldConfig` includes `taxonomySlug`, the editing flow is:

```
FieldConfig { key: 'name', type: 'text_with_suggestions', taxonomySlug: 'skills' }
                                                              │
                                                              v
                                            trait_taxonomies table
                                            WHERE traitKey = 'skills'
                                                              │
                                                              v
                                            ┌─ skills-technology (76 values)
                                            ├─ skills-business (36 values)
                                            ├─ skills-finance (24 values)
                                            ├─ skills-marketing (27 values)
                                            ├─ skills-design (36 values)
                                            ... (17 categories total, ~650 values)
```

The taxonomy slug on the field config is used to query the taxonomies table. Multiple taxonomy rows can share the same `traitKey` but have different `taxonomySlug` values, creating categorized suggestion groups. The `suggestedValues` arrays within each taxonomy row provide the actual suggestion strings.

---

## 4. Taxonomy Management

### Overview

Taxonomies provide curated suggestion lists for trait fields. They improve data quality (consistent naming), speed up data entry (select vs. type), and enable semantic matching (normalized values). Taxonomies are suggestions, not constraints -- users can always enter custom values.

### Wireframe

```
TAXONOMY SUGGESTION FLOW (Combobox)
┌──────────────────────────────────────────────────────────────┐
│  Skill: [Py_________________________]                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  💻 Technology & Software                               │ │
│  │    Python                                   ← match     │ │
│  │  ─────────────────────────────────────────────          │ │
│  │  📊 Finance & Accounting                                │ │
│  │    (no matches)                                          │ │
│  │  ─────────────────────────────────────────────          │ │
│  │  + Add custom: "Py"                         ← custom    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

TAXONOMY STRUCTURE IN DB
┌──────────────────────────────────────────────────────────────┐
│  trait_taxonomies                                             │
│  ┌─────────────┬────────────────────┬────────────────────┐  │
│  │ traitKey    │ taxonomySlug       │ suggestedValues    │  │
│  ├─────────────┼────────────────────┼────────────────────┤  │
│  │ skills      │ skills-technology  │ [JavaScript, ...]  │  │
│  │ skills      │ skills-business    │ [Strategic P..]    │  │
│  │ skills      │ skills-finance     │ [Accounting, ..]   │  │
│  │ qualities   │ qualities-wisdom   │ [Creative, ...]    │  │
│  │ qualities   │ qualities-courage  │ [Brave, ...]       │  │
│  │ values      │ values-openness    │ [Curiosity, ...]   │  │
│  │ interests   │ interests-outdoor  │ [Hiking, ...]      │  │
│  │ education   │ education-fields   │ [Computer Sci..]   │  │
│  │ offerings   │ offerings-audience │ [Beginners, ...]   │  │
│  │ languages   │ languages-common   │ [English, ...]     │  │
│  │ seeking     │ seeking-*          │ [Mentorship, ..]   │  │
│  │ focusAreas  │ focus-areas-*      │ [AI/ML, ...]       │  │
│  └─────────────┴────────────────────┴────────────────────┘  │
│  Unique constraint: (traitKey, taxonomySlug)                 │
└──────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
components/trait-editors.tsx
  └─ FieldRenderer (text_with_suggestions type)
       └─ TaxonomySuggestionCombobox           ← NEW component
            ├─ components/ui/command.tsx        ← EXISTING (shadcn/ui)
            ├─ components/ui/popover.tsx        ← EXISTING (shadcn/ui)
            └─ fetches: app/actions/traits.ts → getTaxonomyValues()
                 └─ reads: lib/db/schema/traits.ts → traitTaxonomies table
```

### Workflows & Stories

---

#### Workflow: System seeds and manages taxonomies

**Preconditions:**
- Database is provisioned
- Seed runner has access to taxonomy source files

**Stories:**

**[3.1] Seed taxonomies from source files**
> Seed runner inserts/updates all taxonomy rows from the 14 taxonomy files

- **User:** Developer or CI system running `bun run db:seed`
- **Functional:** All taxonomy files in `lib/db/seed/taxonomies/` are collected via `allTaxonomies` array and upserted into `trait_taxonomies`. The unique constraint on `(traitKey, taxonomySlug)` prevents duplicates.
- **Technical:**
  - `lib/db/seed/index.ts` (existing, L76-L112) iterates `allTaxonomies` and upserts each row
  - 14 taxonomy files export arrays of `Omit<NewTraitTaxonomy, 'id'>[]`
  - `lib/db/seed/taxonomies/index.ts` (existing) collects and re-exports all arrays
  - Total: ~62 taxonomy categories with ~1054 suggested values
- **Acceptance criteria:**
  - [ ] `bun run db:seed` upserts all taxonomy rows without error
  - [ ] `bun run db:seed` is idempotent (running twice produces same state)
  - [ ] `bun run db:seed:fresh` wipes and re-inserts all rows
  - [ ] Each taxonomy row has valid `traitKey` matching a `trait_metadata.key`
  - [ ] No duplicate `(traitKey, taxonomySlug)` pairs
- **Failure paths:**
  - If a taxonomy row references a non-existent traitKey: seed succeeds (no FK constraint) but the taxonomy is orphaned -- logged as warning

**[3.2] Fetch taxonomy values for edit forms**
> Server action returns grouped taxonomy values for a given trait key

- **User:** System (called by edit form components)
- **Functional:** Given a `traitKey`, returns all taxonomy categories for that trait with their suggested values, ordered by `displayOrder`.
- **Technical:**
  - New server action in `app/actions/traits.ts`:
    ```typescript
    getTaxonomyValues(traitKey: string): Promise<TaxonomyGroup[]>
    ```
  - Queries `trait_taxonomies WHERE traitKey = $1 ORDER BY displayOrder`
  - Returns: `[{ slug, displayName, icon, values: string[] }]`
  - Cached via `unstable_cache` with tag `taxonomy-${traitKey}`
- **Acceptance criteria:**
  - [ ] Returns grouped values for `skills` (17 categories)
  - [ ] Returns grouped values for `qualities` (7 categories)
  - [ ] Returns empty array for trait keys with no taxonomy
  - [ ] Results are cached (same query does not re-hit DB)
  - [ ] Values within each group are in their original array order
- **Failure paths:**
  - If database unreachable: throw error (caught by calling component)

**[3.3] Render taxonomy suggestions in Combobox**
> TaxonomySuggestionCombobox component presents categorized suggestions from taxonomy data

- **User:** Editing a trait field that has `taxonomySlug` configured
- **Functional:** A searchable combobox appears when the field is focused. Suggestions are grouped by taxonomy category with icons. Typing filters suggestions across all categories. An "Add custom" option appears at the bottom for values not in the taxonomy.
- **Technical:**
  - New `TaxonomySuggestionCombobox` component:
    - Uses shadcn/ui `Command` + `Popover` (both already installed)
    - Receives `taxonomySlug` prop, calls `getTaxonomyValues()` on mount
    - Groups suggestions by `displayName` with `CommandGroup`
    - Filters with `CommandInput`
    - "Add custom: {value}" as final `CommandItem`
  - Wire into `FieldRenderer` for `text_with_suggestions` type (replaces plain `<Input>`)
- **Acceptance criteria:**
  - [ ] Combobox opens on field focus
  - [ ] Suggestions are grouped by category with headers and icons
  - [ ] Typing "Py" in skills field shows "Python" under "Technology & Software"
  - [ ] Selecting a suggestion fills the field value
  - [ ] "Add custom: Py" option appears when no exact match
  - [ ] Selecting custom option fills the typed value
  - [ ] Combobox closes on selection
  - [ ] Tab/Escape closes the combobox
  - [ ] Works in both standalone fields and within ItemForm (multi_item_form)
- **Failure paths:**
  - If taxonomy data is loading: show a spinner in the combobox
  - If taxonomy fetch fails: fall back to plain text input
  - If no `taxonomySlug` on the field: render plain text input (no combobox)

**[3.4] Accept and store custom values not in taxonomy**
> Users can enter any value, not just taxonomy suggestions

- **User:** Typing a skill, quality, or interest that is not in the taxonomy
- **Functional:** Custom values are treated identically to taxonomy values. They are stored in the trait JSONB as-is. No normalization is applied (the value entered is the value saved).
- **Technical:**
  - No special handling needed -- the combobox's "Add custom" option passes the raw string
  - Validation happens at the Zod schema level (`lib/validations/traits.ts`) which only validates structure, not taxonomy membership
  - Future: custom values that appear frequently across users could be auto-promoted to taxonomy suggestions (admin workflow)
- **Acceptance criteria:**
  - [ ] User can type "MyCustomFramework" in skills and save it
  - [ ] Custom value appears in display mode identically to taxonomy values
  - [ ] Custom value is included in search embeddings
  - [ ] No error or warning shown for custom values
- **Failure paths:**
  - If custom value is empty string: Zod validation rejects (`min(1)`)
  - If custom value is extremely long (>500 chars): add max length to Zod schemas

**Workflow success:** Taxonomy suggestions improve data quality and speed while never restricting user input. The suggestion UI is consistent across all taxonomy-backed fields.

---

#### Workflow: Future -- Community-managed custom taxonomies

**Preconditions:**
- Community Organizer tier or above
- Community exists with custom trait requirements

**Stories:**

**[3.5] CO adds custom taxonomy values for their community** (FUTURE)
> Community Organizer extends a taxonomy with community-specific values

- **User:** Community Organizer managing a guild or professional community
- **Functional:** CO can add suggested values scoped to their community. These values appear alongside global taxonomy values when editing traits within that community context. They do not affect the global taxonomy.
- **Technical:**
  - Future schema addition: `community_trait_taxonomies` table with `communityId` FK
  - Same structure as `trait_taxonomies` but scoped
  - Edit forms within community context merge global + community taxonomies
  - Admin UI for COs to add/remove community-specific values
- **Acceptance criteria:**
  - [ ] CO can add community-specific skill suggestions (e.g., a guild adds trade-specific skills)
  - [ ] Community values appear grouped under a "Community: [name]" header in the combobox
  - [ ] Community values do not leak to other communities or global taxonomy
  - [ ] CO can remove community values without affecting member data
- **Failure paths:**
  - If community has no custom taxonomies: global taxonomies are used as-is

**Workflow success:** Communities can extend the taxonomy system without code changes. Community-specific vocabulary improves data quality within specialized groups.

---

## 5. Extending the System

### Overview

The metadata-driven architecture is designed so that new trait types can be added without code changes. This section documents the exact process for adding a trait, the commerce privacy tier system that governs display and sharing behavior, and how the completeness scoring system incorporates new traits.

### How to Add a New Trait Type

Adding a new trait requires exactly these steps:

```
STEP 1: Add trait_metadata row
───────────────────────────────
Insert a new row in lib/db/seed/trait-metadata.ts:

{
  key: 'newTraitKey',                    // unique key, camelCase
  displayName: 'My New Trait',           // user-facing name
  category: 'capabilities',             // one of: foundations, capabilities,
                                         //   direction, offerings, commerce
  groupKey: 'capabilities',              // visual grouping key
  dataType: 'string_array',             // string | string_array |
                                         //   array_of_objects | object
  displayConfig: {
    type: 'pill_list',                   // tag_list | pill_list | timeline |
                                         //   card_list | table | prose
    badgeColor: 'blue',                  // optional color key
  },
  editConfig: {
    type: 'tag_input',                   // multi_item_form | tag_input |
                                         //   text_with_suggestions |
                                         //   structured_form | select
    placeholder: 'Type a value...',
  },
  displayOrder: 6,                       // position within category
  isSearchable: true,                    // include in search embeddings
  isEndorsable: false,                   // can this trait be endorsed
}


STEP 2 (optional): Add taxonomy rows
─────────────────────────────────────
Create lib/db/seed/taxonomies/new-trait.ts:

export const newTraitTaxonomy: Omit<NewTraitTaxonomy, 'id'>[] = [
  {
    traitKey: 'newTraitKey',
    taxonomySlug: 'new-trait-category-1',
    displayName: 'Category Name',
    suggestedValues: ['Value 1', 'Value 2', ...],
    displayOrder: 0,
  },
];

Add to lib/db/seed/taxonomies/index.ts in the allTaxonomies array.


STEP 3 (optional): Add TypeScript interface
────────────────────────────────────────────
Add to types/index.ts:

export interface NewTrait {
  field1: string;
  field2?: string;
}

Add to Traits interface:
  newTraitKey?: NewTrait[];


STEP 4 (optional): Add Zod validation
──────────────────────────────────────
Add to lib/validations/traits.ts:

export const newTraitSchema = z.object({
  field1: z.string().min(1),
  field2: z.string().optional(),
});

Add to traitsSchema:
  newTraitKey: z.array(newTraitSchema).optional(),


STEP 5: Run seed
─────────────────
bun run db:seed

Done. The new trait will automatically:
  - Render on persona pages using the specified display component
  - Show in the edit page with the specified editor
  - Include taxonomy suggestions if a taxonomy was added
  - Be included in search embeddings if isSearchable: true
  - Be available for endorsements if isEndorsable: true
```

### Commerce Privacy Tiers

Commerce traits include a `privacyTier` field in their `displayConfig` that controls how the trait is shared and displayed. This is specific to commerce traits and does not apply to the core 13 trait types.

```
PRIVACY TIER HIERARCHY
──────────────────────

  public          Shared in MCP discovery and search results.
    │              Example: commerceLocale
    v
  selective       Per-persona opt-in. Only shared when the user
    │              explicitly includes it on a persona.
    v              Example: clothingSizes, favoriteBrands
  gated           Shared only via ZK-provable attestation.
    │              Never exposed as raw data -- only as boolean proof.
    v              Example: verifiedAgeBracket, verifiedLocationZone
  sensitive       Requires explicit per-request GDPR Art. 9 consent.
    │              Stored encrypted at rest. Audit-logged on access.
    v              Example: dietaryRestrictions, allergens
  agent_local     Never leaves the user's agent boundary. Not in MCP.
                   Only used for local agent decision-making.
                   Example: budgetPreferences, blockedBrands, agentAuthorization
```

**Impact on display:**
- `public` and `selective`: rendered normally using the specified display component
- `gated`: display component shows a "Verified" badge instead of the actual value
- `sensitive`: display component shows "[Protected]" to non-authorized viewers
- `agent_local`: never rendered on any persona page; only visible in the user's own trait management UI

**Impact on editing:**
- All tiers use the standard edit components (no difference in editing)
- `sensitive` traits show a consent notice before the first edit
- `agent_local` traits show an explanatory note: "This data never leaves your device"

**Impact on MCP exposure:**
- `public` traits are always included in MCP responses
- `selective` traits are included based on `personas.mcpTraitVisibility` settings
- `gated`, `sensitive`, and `agent_local` traits are excluded from MCP responses

### Completeness Scoring Integration

The completeness scoring system (`lib/personas/completeness.ts`) currently uses hardcoded trait keys and weights. To support new traits:

**Current state:** 9 hardcoded trait keys with fixed point values (max 100):
- headline (15), skills (20), qualities (10), values (8), seekingOpportunities (8), offerings (12), focusAreas (7), location (10), contactPreferences (10)

**Future state:** Completeness calculation should be metadata-driven. Each `trait_metadata` row could include a `completenessWeight` field, and the scoring function would iterate over all metadata rows dynamically. This is a separate story tracked in the completeness spec but is noted here because it affects how new trait additions score.

---

### Schema

```typescript
// EXISTING: lib/db/schema/traits.ts (no changes needed)
// The trait_metadata and trait_taxonomies tables are already defined.

// EXISTING: trait_metadata table
// Key columns for the rendering system:
//   key: text — unique identifier, camelCase (e.g., 'skills', 'commerceLocale')
//   displayConfig: jsonb — { type, showField?, badgeColor?, columns?, privacyTier? }
//   editConfig: jsonb — { type, addButtonText?, fields?, placeholder?, options?, suggestions? }
//   category: text — grouping key (foundations, capabilities, direction, offerings, commerce)
//   displayOrder: integer — sort order within category
//   isSearchable: boolean — include in embedding generation
//   isEndorsable: boolean — can be endorsed by others

// EXISTING: trait_taxonomies table
// Key columns:
//   traitKey: text — FK-like reference to trait_metadata.key
//   taxonomySlug: text — unique within traitKey (e.g., 'skills-technology')
//   suggestedValues: text[] — array of suggestion strings
//   displayOrder: integer — sort order within traitKey
// Unique constraint: (traitKey, taxonomySlug)
```

### Server Actions

```typescript
// NEW: app/actions/traits.ts

// Public. Fetches all trait metadata rows, cached.
getTraitMetadata(): Promise<TraitMetadataRow[]>

// Public. Fetches taxonomy groups for a given trait key, cached.
getTaxonomyValues(traitKey: string): Promise<TaxonomyGroup[]>
// where TaxonomyGroup = { slug: string, displayName: string, icon?: string, values: string[] }

// MODIFIES: app/actions/personas.ts

// Authenticated (owner). Updates a single trait key within the persona's traits JSONB.
updateSingleTrait(uri: string, key: string, value: unknown): Promise<Persona>
// Merges into existing traits, syncs to user traits, recalculates completeness.
```

### Validation

```typescript
// EXISTING: lib/validations/traits.ts (no changes needed for metadata system)
// The traitsSchema validates the full JSONB document.
// Individual schemas (skillSchema, experienceSchema, etc.) validate items.

// NEW validation for updateSingleTrait:
// In app/actions/personas.ts or lib/validations/traits.ts

import { z } from 'zod';

export const updateSingleTraitSchema = z.object({
  key: z.string().min(1, 'Trait key is required'),
  value: z.unknown(), // Validated dynamically against the trait's specific schema
});

// Dynamic validation: after parsing the key, look up the corresponding
// Zod schema (skillSchema for 'skills', etc.) and validate the value.
```

### Edge Cases

- [ ] **Missing metadata row for a trait key:** If `persona.traits` contains a key with no corresponding `trait_metadata` row, the trait is silently skipped in both display and edit. No crash.
- [ ] **Malformed displayConfig/editConfig JSONB:** If the JSONB is not valid for the expected shape, the component catches and renders nothing (display) or shows "No editor available" (edit).
- [ ] **Empty trait value:** `TraitDisplay` returns null for empty/null/undefined values (existing behavior in `isEmpty()` helper, L59-64).
- [ ] **Concurrent trait edits:** Two browser tabs editing different traits on the same persona. `updateSingleTrait` reads current traits and merges one key, so concurrent edits to different keys are safe. Same-key concurrent edits use last-write-wins.
- [ ] **Very large taxonomy (1000+ values):** The combobox virtualizes the list or limits to top 50 matching results with "scroll for more" indicator.
- [ ] **Trait data migration:** If a trait's `dataType` changes (e.g., `string` to `string_array`), existing data must be migrated. The display component should handle both shapes during the migration window.
- [ ] **Commerce traits without privacyTier:** If a commerce trait's displayConfig lacks `privacyTier`, it defaults to `selective`.
- [ ] **Custom values that match taxonomy values:** Treated identically. No deduplication needed since the stored value is a simple string.
- [ ] **Trait metadata update after seed:** If a metadata row's editConfig changes (e.g., adding a new field), existing trait data that lacks the new field is still valid (fields are optional by convention).
- [ ] **Trait deleted from metadata but data remains in personas:** Orphaned trait data is silently ignored in rendering. A cleanup job could be run periodically.

### Migration Notes

No schema migrations needed for this spec. All tables (`trait_metadata`, `trait_taxonomies`) already exist. Changes are:

1. **New server actions** in `app/actions/traits.ts` (additive)
2. **New components** (`TableDisplay`, `StructuredFormEditor`, `SelectEditor`, `TaxonomySuggestionCombobox`) (additive)
3. **Refactored edit page** to use metadata-driven rendering instead of hardcoded forms (modifies existing page)
4. **Extended TraitEditor switch** to handle `structured_form` and `select` types (modifies existing component)
5. **Extended TraitDisplay switch** to handle `table` type (modifies existing component)

All changes are additive or backwards-compatible. The existing hardcoded edit page continues to work during the transition.

### Test Criteria

**Unit tests** (from story acceptance criteria):

- `getTraitMetadata()` returns all 41 rows ordered by category + displayOrder
- `getTaxonomyValues('skills')` returns 17 categories with ~650 total values
- `getTaxonomyValues('nonexistent')` returns empty array
- `updateSingleTrait()` merges one key without affecting others
- `updateSingleTrait()` rejects invalid trait values via Zod
- `updateSingleTrait()` syncs updated key to user_traits
- `updateSingleTrait()` recalculates completeness score
- `TraitDisplay` returns null for empty values
- `TraitDisplay` returns null for unknown displayConfig.type
- `TraitEditor` renders "No editor available" for unknown editConfig.type
- `StructuredFormEditor` pre-populates with existing values
- `TableDisplay` renders correct columns from displayConfig.columns
- `TaxonomySuggestionCombobox` filters values by typed text
- `TaxonomySuggestionCombobox` shows "Add custom" option for non-matching text
- Badge color mapping returns default for unknown color keys

**Integration tests** (from workflow sequences):

- Full render pipeline: metadata fetch -> trait value extraction -> display dispatch -> correct component renders
- Full edit pipeline: metadata fetch -> taxonomy fetch -> editor renders -> save -> display updates
- Edit page renders all 13 core trait types with correct editors
- Saving a tag_input trait updates both persona.traits and user_traits.traits
- Saving a multi_item_form trait with taxonomy-backed fields preserves custom values alongside taxonomy values
- Commerce traits with privacy tiers render appropriate placeholders for unauthorized viewers

**E2E tests** (Playwright scenarios):

- User navigates to persona page -> sees traits rendered with correct display types
- User edits skills via multi_item_form -> adds item from taxonomy -> saves -> sees updated display
- User edits values via tag_input -> types custom value -> saves -> sees new pill
- User edits headline via text_with_suggestions -> saves -> sees updated prose
- User edits commerce locale via structured_form -> fills all fields -> saves -> sees card
- Taxonomy combobox shows grouped suggestions when typing in skill name field
- Empty trait shows no section header (entire section hidden)

### Implementation Order

1. **Server actions for metadata and taxonomy queries** (new `app/actions/traits.ts`) -- stories 1.1, 3.2
2. **TableDisplay component** (add to `components/trait-displays.tsx`) -- story 1.4. Requires step 1.
3. **StructuredFormEditor component** (add to `components/trait-editors.tsx`) -- story 2.4. Independent of step 2.
4. **SelectEditor component** (add to `components/trait-editors.tsx`) -- extends step 3. Covers `select` editConfig type used by commerce traits.
5. **TaxonomySuggestionCombobox component** (new, uses shadcn/ui Command + Popover) -- story 3.3. Requires step 1.
6. **Wire taxonomy combobox into FieldRenderer** (modify `components/trait-editors.tsx` FieldRenderer) -- story 2.2. Requires step 5.
7. **updateSingleTrait server action** (add to `app/actions/personas.ts`) -- story 2.3. Independent.
8. **Metadata-driven persona detail page** (refactor `app/(dashboard)/personas/[uri]/page.tsx`) -- stories 1.2, 1.3. Requires steps 1, 2.
9. **Metadata-driven edit page** (refactor `app/(dashboard)/personas/[uri]/edit/page.tsx`) -- story 2.1. Requires steps 1, 3, 4, 5, 6, 7.
10. **Custom value acceptance and storage** -- story 3.4. Requires steps 5, 6.
11. **Unit tests** for server actions and components -- requires steps 1-10.
12. **E2E tests** with Playwright -- requires steps 8, 9.
13. **Community-managed taxonomies** (FUTURE, story 3.5) -- deferred.

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Implement trait metadata server action with caching | `personas`, `metadata` | -- | -- |
| 1.2 | Wire TraitDisplay dispatcher to metadata-driven rendering | `personas`, `metadata` | 1.1 | -- |
| 1.3 | Render traits grouped by category with section headers | `personas`, `metadata` | 1.1 | -- |
| 1.4 | Implement TableDisplay component for tabular traits | `personas`, `metadata` | 1.1 | -- |
| 2.1 | Refactor edit page to metadata-driven trait editors | `personas`, `metadata`, `editing` | 1.1, 2.4, 3.3 | -- |
| 2.2 | Wire taxonomy suggestions into edit form fields | `personas`, `taxonomy` | 3.2, 3.3 | -- |
| 2.3 | Implement updateSingleTrait server action with optimistic UI | `personas`, `editing` | -- | -- |
| 2.4 | Implement StructuredFormEditor for single-object traits | `personas`, `editing` | -- | -- |
| 3.1 | Verify taxonomy seeding is idempotent and complete | `personas`, `taxonomy` | -- | -- |
| 3.2 | Implement getTaxonomyValues server action with caching | `personas`, `taxonomy` | -- | -- |
| 3.3 | Build TaxonomySuggestionCombobox component | `personas`, `taxonomy` | 3.2 | -- |
| 3.4 | Accept and store custom values not in taxonomy | `personas`, `taxonomy` | 3.3 | -- |
| 3.5 | Design community-managed custom taxonomies (FUTURE) | `personas`, `taxonomy`, `communities` | -- | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `1.3` = feature 1, story 3)
- Issue titles are imperative
- Labels include the spec suite (`personas`) and feature area (`metadata`, `taxonomy`, `editing`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
