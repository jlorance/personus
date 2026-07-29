---
type: spec
title: "Identity & Personas — Profile Management"
description: "Your profile is the complete picture of who you are — skills, experience, values, offerings, and everything else that makes you you. It's the single source of truth. Personas are curated views…"
status: current
tags: [personas]
timestamp: 2026-02-24
---

# Identity & Personas — Profile Management

> Date: 2026-02-24
> Status: Current
> Depends on: `00-prd.md`, `03-trait-metadata.md`, `09-editing-patterns.md`
> Primary actors: User (Owner), AI Agent (Persona Coach)

Your profile is the complete picture of who you are — skills, experience, values, offerings, and everything else that makes you *you*. It's the single source of truth. Personas are curated views that share different slices of your profile with different audiences. This spec covers viewing your profile, adding and editing items, importing from external sources, and the relationship between your profile and your personas.

---

## 1. Your Profile

### 1.1 Overview

Your Profile is the home for everything about you. It shows all your traits organized by category, with annotations indicating which personas share each one. Items not in any persona are marked "Private" — they exist in your profile but aren't published anywhere. This view must be created as a new route at `/profile`.

### 1.2 Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│  Your Profile                                               [Import] │
│  Everything about you, in one place.                                 │
│  52 items across 4 categories  ·  Shared with 3 personas            │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──── Category Tabs ────────────────────────────────────────┐      │
│  │ [Foundations (6)] [Capabilities (18)] [Direction (12)]     │      │
│  │ [Offerings (4)]  [Commerce (12)]                          │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ── Capabilities ──────────────────────────────────────────────────  │
│                                                                      │
│  Skills                                                   [+ Add]   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ● TypeScript · Expert · 8yr                                  │   │
│  │   Shared with: [Professional ✓] [Photography ✗]              │   │
│  │                                           [Edit] [Remove]    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ ● React · Advanced · 6yr                                     │   │
│  │   Shared with: [Professional ✓]                              │   │
│  │                                           [Edit] [Remove]    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ ● Lightroom · Intermediate                                   │   │
│  │   Private (not in any persona)                                │   │
│  │                                           [Edit] [Remove]    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Experience                                               [+ Add]   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ● Senior Engineer at Acme Corp · 2020-01 → Present          │   │
│  │   Shared with: [Professional ✓]                              │   │
│  │                                           [Edit] [Remove]    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── Empty State ───────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ┌─────┐                                                     │   │
│  │  │  ◎  │  Your profile is empty                              │   │
│  │  └─────┘  Start by importing from LinkedIn, or add items     │   │
│  │           manually. The coach can also help you get started. │   │
│  │           [Import Data]  [Add Manually]  [Talk to Coach]     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Hierarchy

```
app/(dashboard)/profile/page.tsx                   ← Server Component (data fetching)
  └─ components/profile-view.tsx                    ← Client Component ("use client")
       ├─ components/ui/tabs.tsx                    ← Category tabs (existing)
       ├─ components/profile-category.tsx            ← NEW: renders all items in one category
       │    └─ components/profile-item.tsx            ← NEW: single item with persona badges
       │         ├─ components/ui/badge.tsx           ← Persona sharing badges (existing)
       │         ├─ components/trait-edit-dialog.tsx   ← NEW: edit dialog (metadata-driven)
       │         └─ components/ui/dialog.tsx          ← (existing)
       ├─ components/trait-add-dialog.tsx              ← NEW: add item dialog (metadata-driven)
       └─ calls: app/actions/profile.ts                ← Server Actions for profile CRUD
            └─ reads/writes: lib/db/schema/users.ts   ← userTraits table (existing)
```

**Existing files:**
- `lib/db/schema/users.ts` — `userTraits` table (line 18-31)
- `types/index.ts` — `Traits` interface (line 156-198)
- `lib/validations/traits.ts` — Zod schemas for all trait types (line 1-135)
- `lib/db/seed/trait-metadata.ts` — 41 trait metadata rows (line 1-1096)
- `components/ui/tabs.tsx`, `components/ui/badge.tsx`, `components/ui/dialog.tsx` — existing shadcn components

**New files:**
- `app/(dashboard)/profile/page.tsx` — route page
- `components/profile-view.tsx` — main profile view client component
- `components/profile-category.tsx` — category section renderer
- `components/profile-item.tsx` — individual item row with persona badges and actions
- `components/trait-edit-dialog.tsx` — metadata-driven edit dialog
- `components/trait-add-dialog.tsx` — metadata-driven add dialog
- `app/actions/profile.ts` — server actions for profile CRUD (partially exists)

### 1.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | User can view all their profile items organized by category on the profile page | Server component fetches `userTraits`, `traitMetadata`, and `personas`. Client renders `<Tabs>` with one tab per category from `TRAIT_CATEGORIES`. Each metadata row checks if `traits[metadata.key]` has data. Route: `/profile`. |
| 1.2 | User can see which personas share each item on the profile page | `components/profile-item.tsx` compares each trait against each persona's `traits` JSONB. Shows "Shared with: [Persona Name]" badges. Items not in any persona show "Private" in muted text. Skills match by name (case-insensitive), experience by company+title, string arrays by value. |
| 1.3 | New user with an empty profile can see helpful getting-started guidance | Empty state with three CTAs: Import Data (→ `/settings?tab=import`), Add Manually (opens add dialog), Talk to Coach (→ `/coach`). No category tabs when profile is empty. |
| 1.4 | User can filter profile items by category via tabs | Clicking a category tab shows only that category. URL updates with `?cat=capabilities` for deep-linking. "All" pseudo-tab shows all categories in sequence. Invalid `?cat=` falls back to "All". |
| 1.5 | User can search their profile by keyword | Search input above tabs. Client-side filter (debounced 200ms) across all categories. For objects, searches all string fields. For string arrays, searches strings directly. Empty results: "No items matching [query]". |

### 1.6 Schema

No schema changes. Uses existing `user_traits` table:

```typescript
// Existing: lib/db/schema/users.ts line 18-31
export const userTraits = pgTable(
  'user_traits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull().unique(),
    traits: jsonb('traits').notNull().default('{}'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_user_traits_traits').using('gin', table.traits)],
);
```

### 1.7 Server Actions

```typescript
// Existing + enhanced: app/actions/profile.ts

/** Fetch the user's full profile: traits + metadata + personas. */
getUserTraits(): Promise<{
  traits: Traits;
  metadata: TraitMetadataRow[];
  personas: { uri: string; displayName: string; traits: Traits }[];
}>
// [Authenticated user] required. Returns traits, metadata for rendering,
// and persona data for sharing badges.

/** Fetch just the traits JSONB (lighter weight, for use in other pages). */
getUserTraitsRaw(): Promise<Traits>
// [Authenticated user] required. Returns the raw traits JSONB.
```

### 1.8 Edge Cases

- [ ] User with traits row but `traits: {}` (freshly created) — show empty state
- [ ] User with `traits: null` (shouldn't happen, but defensive) — treat as empty
- [ ] Trait metadata has a key not in the user's traits — skip rendering (normal)
- [ ] User traits contain a key not in trait metadata (extensible `[key: string]: any`) — render as generic key-value pair with no metadata-driven formatting
- [ ] User traits contain commerce traits (28 fields) — shown under Commerce tab, with privacy tier badges
- [ ] User with 500+ items — pagination/virtualization not needed in v1 (JSONB column is a single document; tab filtering reduces visible count)

### 1.9 Test Criteria

**Unit tests:**
- `findPersonasContainingTrait` returns correct personas for skill match (name, case-insensitive)
- `findPersonasContainingTrait` returns correct personas for experience match (company + title)
- `findPersonasContainingTrait` returns empty array for items not in any persona
- String array traits use case-insensitive matching for persona comparison

**Integration tests:**
- `getUserTraits` returns traits, metadata, and persona data for authenticated user
- `getUserTraits` returns empty traits for new user

**E2E tests:**
- Navigate to `/profile` → see all items organized by category
- Click category tab → only that category's items visible
- Item badges show correct persona names
- Empty profile shows empty state with three CTAs

### 1.10 Implementation Order

1. Server action `getUserTraits` in `app/actions/profile.ts` (data layer)
2. Page route `app/(dashboard)/profile/page.tsx` (server component shell)
3. `components/profile-view.tsx` — main client component with tabs, search
4. `components/profile-category.tsx` — category section renderer
5. `components/profile-item.tsx` — individual item row with persona badges (requires step 4)
6. Add "Your Profile" link to `components/dashboard-nav.tsx`
7. Unit tests for persona-matching helper
8. E2E test for profile view navigation

---

## 2. Adding to Your Profile

### 2.1 Overview

Adding to your profile should feel like describing yourself to a friend — not filling out a form. The primary entry point is a **quick-add bar** that accepts natural language. Type "I know Python" and the system classifies it as a skill, structures it, and adds it to your profile in one step. No type picker, no multi-field form, no dialog. Just describe yourself and go.

This "describe and classify" capability is a **shared service** — not a UI-specific feature. The same classification engine powers every entry point: the profile page quick-add bar, the Persona Coach chat, MCP tool calls from ChatGPT or Claude, Slack integrations, and any future CX surface. The server action accepts natural language, classifies it, and writes structured data. What changes per surface is the interaction chrome, not the underlying capability.

Adding an item to your profile does NOT automatically share it in any persona — it stays private until you explicitly include it in one (section 4).

**Three ways to add:**

| Path | Speed | Best for |
|------|-------|----------|
| **Quick-add bar** (this section) | ~2 seconds | Most additions. Type, confirm, done. |
| **Coach conversation** (CX/Coach spec) | ~30 seconds | Guided exploration. "What should I add?" |
| **Import** (section 5) | ~2 minutes | Bootstrapping from LinkedIn, CSV, etc. |

All three paths produce the same output: a structured trait item in the profile's JSONB column. All three use the same `addTrait` server action and deduplication logic.

### 2.2 Wireframe

```
Quick-add bar (resting state):
┌──────────────────────────────────────────────────────────────────────┐
│  Your Profile                                               [Import] │
│  Everything about you, in one place.                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + Describe yourself... "I know Python", "I value honesty"    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │

User types: "Python expert 8 years"
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + Python expert 8 years                              [clear] │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ✦ Skill: Python · Expert · 8yr                      [Add ↵]│   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │

User types: "I offer cooking classes"
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + I offer cooking classes                            [clear] │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ✦ Offering: Cooking classes · education             [Add ↵]│   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │

User types: "French"
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + French                                             [clear] │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ✦ Language: French                                  [Add ↵]│   │
│  │    Skill: French                                     [Add]  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │

After adding — item appears inline, input clears for next entry:
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + Describe yourself...                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── Just Added ──────────────────────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✓ Python · Expert · 8yr                      [Add details →] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │

"Add details" opens the full metadata-driven form (elaboration, not creation):
┌──────────────────────────────────────────────────────────────────────┐
│  Edit Skill Details                                           [X]    │
├──────────────────────────────────────────────────────────────────────┤
│  Skill Name    [Python_________________________]  (pre-filled)       │
│  Proficiency   [Expert ▼]                         (pre-filled)       │
│  Years         [8___]                             (pre-filled)       │
│  Category      [________________________]         (optional)         │
│                                                                      │
│  [Cancel]                                       [Save Details]       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Classification Engine

The classification engine converts free text into a structured `{ traitKey, value }` pair. It runs server-side (shared by all CX surfaces) and uses three tiers, cheapest first:

**Tier 1 — Taxonomy match (~60% of inputs, <50ms).** Compare input against all `trait_taxonomies` values (case-insensitive, trimmed). "Python" matches the skills taxonomy. "French" matches languages. Returns the matched trait key and a minimal value object (name only for skills, string for string-arrays).

**Tier 2 — Pattern match (~20% of inputs, <50ms).** Keyword and structure patterns:
- "I speak X" / "fluent in X" → language
- "I offer X" / "I teach X" / "I provide X" → offering
- "I value X" / "X is important to me" → value
- "X years in Y" / "worked at Y" → experience
- "interested in X" / "I love X" → interest
- "looking for X" / "seeking X" / "open to X" → seekingOpportunities

Returns the trait key and extracted value. Patterns are defined in a data structure, not hardcoded regexes — new patterns can be added without code changes.

**Tier 3 — LLM classification (~20% of inputs, ~500ms).** For ambiguous input, a structured-output call to `openai/gpt-4o-mini` classifies the text. The prompt provides the full list of trait keys with descriptions and asks the model to return `{ traitKey, value, confidence }`. Low-confidence results (<0.7) return multiple suggestions for the user to choose from.

```typescript
// lib/profile/classify.ts — the shared classification engine

interface ClassifyResult {
  suggestions: ClassifySuggestion[];  // 1-3 ranked suggestions, empty on failure
  tier: 'taxonomy' | 'pattern' | 'llm' | 'failed';
}

interface ClassifySuggestion {
  traitKey: string;       // e.g., 'skills', 'languages', 'offerings'
  value: unknown;         // Structured value (e.g., { name: 'Python', proficiency: 'expert', yearsExperience: 8 })
  displayLabel: string;   // Human-readable: "Skill: Python · Expert · 8yr"
  confidence: number;     // 0-1, used for ranking
}

export async function classifyTraitInput(text: string): Promise<ClassifyResult>
```

**Multi-suggestion behavior:** When the engine isn't confident (ambiguous input like "French" which could be a language or a skill), it returns multiple suggestions ranked by confidence. The top suggestion is pre-selected. On the profile page, the user sees all suggestions and picks one. On non-UI surfaces (MCP, Slack), the highest-confidence suggestion is used automatically unless confidence is below a threshold.

### 2.4 Minimum Viable Item

Every trait type has required fields and optional fields. The quick-add flow only populates what the classification engine can extract — everything else is left empty. This means most items land in the profile with just a name or label:

| Trait Type | Minimum Viable | Full Detail (elaborate later) |
|------------|---------------|-------------------------------|
| Skill | `{ name: "Python" }` | + proficiency, yearsExperience, category |
| Experience | `{ company: "Acme" }` or `{ title: "Engineer" }` | + company, title, startDate, endDate, description |
| Education | `{ institution: "MIT" }` or `{ degree: "CS" }` | + institution, degree, field, startDate, endDate |
| Value | `"transparency"` | (string array — already complete) |
| Language | `"French"` | (string array — already complete) |
| Quality | `"patient teacher"` | (string array — already complete) |
| Interest | `"photography"` | (string array — already complete) |
| Offering | `{ description: "Cooking classes" }` | + offeringType, availability, audience |
| Focus Area | `{ domain: "AI safety" }` | + description, active |

String-array traits (values, languages, qualities, interests, seekingOpportunities) are inherently "complete" — one string is the whole item. Object traits (skills, experience, education, offerings, focusAreas) have a name/label that's sufficient for a minimum viable entry.

**Validation relaxation:** The existing Zod schemas in `lib/validations/traits.ts` require certain fields. For quick-add, we need a parallel set of "minimum" schemas that only require the identity field (the field used for dedup). The full schemas are used during elaboration (section 2 "Add details" flow and section 3 editing).

```typescript
// New: lib/validations/profile.ts

// Minimum schemas — used by quick-add and classification engine
export const minSkillSchema = z.object({
  name: z.string().min(1),
  proficiency: z.string().optional(),
  yearsExperience: z.number().optional(),
  category: z.string().optional(),
});

export const minExperienceSchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
}).refine(d => d.company || d.title, { message: 'Company or title required' });

// ... etc. for each object trait type
```

### 2.5 Component Hierarchy

```
Profile page quick-add (UI-specific):
components/quick-add-bar.tsx                        ← NEW: Client Component ("use client")
  ├─ components/ui/input.tsx                        ← existing
  ├─ components/quick-add-suggestions.tsx            ← NEW: suggestion dropdown below input
  │    └─ components/ui/command.tsx                  ← existing (shadcn Command for keyboard nav)
  ├─ components/type-picker-fallback.tsx             ← NEW: shown when classification returns no suggestions
  │    └─ reads: lib/db/schema/traits.ts            ← traitMetadata for type list
  └─ calls: app/actions/profile.ts → classifyAndAdd() ← NEW: combined classify + add action

Elaboration dialog (shared with section 3 editing):
components/metadata-driven-form.tsx                 ← NEW: renders form from editConfig
  ├─ components/ui/input.tsx                        ← existing
  ├─ components/ui/select.tsx                       ← existing
  ├─ components/ui/textarea.tsx                     ← existing
  └─ components/taxonomy-suggestions.tsx            ← NEW: taxonomy-driven autocomplete
       └─ reads: lib/db/schema/traits.ts            ← traitTaxonomies table

Classification engine (shared by all CX surfaces):
lib/profile/classify.ts                             ← NEW: classifyTraitInput()
  ├─ reads: lib/db/schema/traits.ts                 ← traitTaxonomies for tier 1
  ├─ lib/profile/patterns.ts                        ← NEW: tier 2 pattern definitions
  └─ calls: openai gpt-4o-mini                      ← tier 3 LLM fallback
```

**New files:**
- `lib/profile/classify.ts` — classification engine (shared by all surfaces)
- `lib/profile/patterns.ts` — tier 2 pattern definitions (data-driven)
- `components/quick-add-bar.tsx` — profile page quick-add input with suggestion dropdown
- `components/quick-add-suggestions.tsx` — suggestion list with keyboard navigation
- `components/type-picker-fallback.tsx` — manual type picker grid, shown when classification fails
- `components/metadata-driven-form.tsx` — full form for elaboration (shared with editing in section 3)
- `components/taxonomy-suggestions.tsx` — autocomplete for taxonomy fields in the form

### 2.6 Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | User can type a natural-language description in the quick-add bar and see classified suggestions | `components/quick-add-bar.tsx` with always-visible input on profile page. On submit (Enter or debounce), calls `classifyTraitInput()`. Suggestions appear below input via `<QuickAddSuggestions>`. Top suggestion pre-selected. Keyboard nav: arrow keys to switch suggestions, Enter to add. |
| 2.2 | User can confirm a suggestion to instantly add an item to their profile | Clicking a suggestion or pressing Enter calls `addTrait({ traitKey, value })`. Item added to profile JSONB as a minimum viable item. Input clears. Toast: "Added Python to your profile". "Just Added" section appears briefly showing the new item with "Add details →" link. No personas modified. |
| 2.3 | System can classify free text into structured trait data using taxonomy, patterns, and LLM | `lib/profile/classify.ts` — three-tier engine. Tier 1: taxonomy match (<50ms). Tier 2: pattern match (<50ms). Tier 3: LLM structured output (~500ms). Returns 1-3 ranked suggestions. Ambiguous input (e.g., "French") returns multiple suggestions. All tiers produce the same `ClassifySuggestion` shape. |
| 2.4 | User can elaborate on a quick-added item by opening the full detail form | "Add details →" link on recently-added items (and on any item in the profile view) opens `components/metadata-driven-form.tsx` in a dialog. Form pre-filled with whatever the classification extracted. User fills remaining optional fields. Uses the full Zod schema from `lib/validations/traits.ts`. Saves via `updateTrait()` from section 3. |
| 2.5 | System can render the correct form fields based on a trait's `editConfig` | `components/metadata-driven-form.tsx` maps field types to components: `text` → `<Input>`, `select` → `<Select>`, `number` → `<Input type="number">`, `month_year` → month/year picker, `checkbox` → `<Checkbox>`, `textarea` → `<Textarea>`, `text_with_suggestions` → `<Input>` with taxonomy autocomplete. Dynamically builds Zod schema from `editConfig.fields`. Unknown field types degrade to plain `<Input>`. |
| 2.6 | User can add items directly within a category section on the profile page | Each category section has a secondary "[+ Add skill]" / "[+ Add value]" button. For string-array types (values, languages, qualities, interests), this opens a simple inline input — type and press Enter. For object types (skills, experience), it opens the metadata-driven form dialog pre-set to that type. This is the "I know exactly what type" shortcut. |
| 2.7 | User can manually pick a trait type when classification fails or is uncertain | When `classifyText()` returns empty suggestions (LLM error, timeout, or all tiers below confidence threshold), the quick-add bar switches to a type picker fallback. `components/type-picker-fallback.tsx` shows a grid of trait type buttons (Skills, Experience, Education, etc. from `traitMetadata`). User picks type → metadata-driven form opens pre-set to that type with the original text as initial value. Ensures classification failures never block the add flow. |

### 2.7 Server Actions

```typescript
// New/enhanced in app/actions/profile.ts

/** Classify free text and add the confirmed suggestion to the user's profile. */
classifyAndAdd(input: {
  text: string;
  selectedSuggestionIndex?: number;  // Which suggestion to use (default: 0, the top one)
}): Promise<{
  success: boolean;
  message: string;
  item: { traitKey: string; displayLabel: string };
}>
// [Authenticated user] required. Calls classifyTraitInput(), picks the selected
// suggestion, validates against minimum schema, dedup checks, adds to profile.
// Used by the quick-add bar UI.

/** Classify free text into suggestions (without adding). */
classifyText(input: { text: string }): Promise<ClassifyResult>
// [Authenticated user] required. Returns suggestions for the UI to display.
// Used by the quick-add bar to show suggestions before the user confirms.
// Also callable from MCP, Slack, etc. for preview before commit.
// MUST NOT throw on LLM failure — catches errors and returns
// { suggestions: [], tier: 'failed' } so the UI can show the type picker fallback.

/** Add a pre-structured trait to the profile. */
addTrait(input: { traitKey: string; value: unknown }): Promise<{ success: boolean; message: string }>
// [Authenticated user] required. Validates value against the minimum Zod schema,
// checks for duplicates, appends to traits JSONB. Used by classifyAndAdd internally,
// and directly by MCP/Slack/coach when they've already classified.

/** Fetch taxonomy suggestions for autocomplete in forms. */
getTaxonomySuggestions(traitKey: string, taxonomySlug: string): Promise<string[]>
// [Authenticated user] required. Returns suggested values from trait_taxonomies.
// Cached with React cache().
```

### 2.8 Validation

```typescript
// New: lib/validations/profile.ts

import { z } from 'zod';

// ─── Quick-add input ────────────────────────────────────────────────

export const classifyTextSchema = z.object({
  text: z.string().min(1, 'Text is required').max(500, 'Text too long'),
});

export const classifyAndAddSchema = z.object({
  text: z.string().min(1).max(500),
  selectedSuggestionIndex: z.number().int().min(0).max(4).default(0),
});

// ─── Structured add (used by all surfaces) ──────────────────────────

export const addTraitSchema = z.object({
  traitKey: z.string().min(1, 'Trait key is required'),
  value: z.unknown(), // Validated dynamically based on traitKey
});

export type AddTraitInput = z.infer<typeof addTraitSchema>;

// ─── Minimum viable schemas (quick-add) ─────────────────────────────
// These require only the identity field. Full schemas in lib/validations/traits.ts
// are used during elaboration and editing.

export const minSkillSchema = z.object({
  name: z.string().min(1),
  proficiency: z.string().optional(),
  yearsExperience: z.number().optional(),
  category: z.string().optional(),
});

export const minExperienceSchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
}).refine(d => d.company || d.title, { message: 'Company or title is required' });

export const minOfferingSchema = z.object({
  description: z.string().min(1),
  offeringType: z.string().optional(),
  availability: z.string().optional(),
  audience: z.string().optional(),
});

export const minFocusAreaSchema = z.object({
  domain: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
});
```

Dynamic validation inside `addTrait` switches on `traitKey` to pick the correct minimum schema for object types and `z.string().min(1)` for string-array types.

### 2.9 Edge Cases

- [ ] Ambiguous input ("French") — classification returns multiple suggestions (language + skill), user picks one
- [ ] Input that matches nothing in any tier — tier 3 LLM classifies; if still low confidence, ask user: "I'm not sure what type this is. Can you pick?" with a type picker fallback
- [ ] Duplicate detection — "Python" when user already has Python as a skill → toast: "Python is already in your profile" (reuses `isDuplicate` from `lib/import/dedup.ts`)
- [ ] Classification returns a trait type the user already has a scalar value for (e.g., input classified as `commerceLocale` but one already exists) — suggest editing the existing value instead of adding
- [ ] LLM classification fails (API error, timeout) — fall back to showing a type picker with the raw text as the initial value, so the user can manually classify. Never block the add flow.
- [ ] Very short input ("a") — require minimum 2 characters before classifying
- [ ] Adding a trait when user traits row doesn't exist — create traits row first
- [ ] Commerce traits with `privacyTier: 'agent_local'` — show warning that this trait never leaves the user's device/agent
- [ ] Adding an offering when user has no personas — still allowed; remind user to create a persona to share it
- [ ] Rate limiting LLM calls — debounce classification to fire only on Enter or after 600ms pause, not on every keystroke
- [ ] MCP/Slack entry: `addTrait` called directly with pre-structured data — bypasses classification, still validates and deduplicates

### 2.10 Test Criteria

**Unit tests (classification engine):**
- Tier 1: "Python" matches skills taxonomy, returns `{ traitKey: 'skills', value: { name: 'Python' } }`
- Tier 1: "French" matches languages taxonomy, returns language suggestion
- Tier 1: "transparency" matches values taxonomy, returns value suggestion
- Tier 2: "I speak French" pattern matches → language
- Tier 2: "I offer cooking classes" pattern matches → offering
- Tier 2: "10 years in healthcare" pattern matches → experience
- Tier 2: "interested in photography" pattern matches → interest
- Classification falls through tiers correctly (no taxonomy match → tries patterns → tries LLM)
- Ambiguous input returns multiple ranked suggestions
- `classifyText` returns `{ suggestions: [], tier: 'failed' }` when LLM errors (does not throw)
- `classifyText` returns `{ suggestions: [], tier: 'failed' }` when LLM times out
- `classifyText` returns empty suggestions when all tiers produce confidence < 0.3

**Unit tests (addTrait):**
- `addTrait` appends skill to traits skills array
- `addTrait` accepts minimum viable skill `{ name: "Python" }` (no proficiency required)
- `addTrait` rejects duplicate skill (case-insensitive name match)
- `addTrait` creates traits row if it doesn't exist
- `addTrait` handles string array traits (values, languages)

**Integration tests:**
- `classifyAndAdd("Python")` → skill added to profile with name only
- `classifyAndAdd("I value transparency")` → "transparency" added to values array
- Add skill → profile updated → profile view shows new skill with "Private" badge
- Add skill → verify persona traits are NOT modified

**E2E tests:**
- Type "Python" in quick-add bar → see "Skill: Python" suggestion → press Enter → see skill in profile
- Type "I speak French" → see "Language: French" suggestion → add → see in Languages section
- Type "French" → see multiple suggestions (Language + Skill) → pick Language → added correctly
- Add "Python" → see "Add details →" → click → see full form with name pre-filled → add proficiency → save
- Try to add duplicate → see "already in your profile" toast
- Type unclassifiable gibberish → see type picker fallback → pick "Skill" → fill name → add to profile
- Classification fails (mock LLM timeout) → type picker shown instead of empty suggestions

### 2.11 Implementation Order

1. `lib/profile/patterns.ts` — tier 2 pattern definitions (requires nothing)
2. `lib/profile/classify.ts` — classification engine, tiers 1+2 (requires step 1, reads `traitTaxonomies`)
3. `lib/profile/classify.ts` — add tier 3 LLM classification (requires step 2, OpenAI structured output)
4. `lib/validations/profile.ts` — minimum viable schemas + action input schemas (requires nothing)
5. `app/actions/profile.ts` — `addTrait`, `classifyText`, `classifyAndAdd` server actions (requires steps 2, 4)
6. `components/quick-add-suggestions.tsx` — suggestion dropdown with keyboard nav (requires nothing)
7. `components/type-picker-fallback.tsx` — manual type picker grid, shown when classification returns no suggestions (requires nothing)
8. `components/quick-add-bar.tsx` — input + suggestion integration + fallback to type picker when `tier === 'failed'` (requires steps 5, 6, 7)
9. `components/metadata-driven-form.tsx` — form renderer from editConfig for elaboration (requires nothing)
10. `components/taxonomy-suggestions.tsx` — autocomplete for form fields (requires step 5)
11. Wire quick-add bar into `components/profile-view.tsx` and per-category "[+ Add]" buttons (requires steps 8, 9)
12. Unit tests for classification engine, including failure → empty suggestions (requires step 2)
13. Unit tests for `addTrait` (requires step 5)
14. E2E test for quick-add flow, including type picker fallback (requires step 11)

---

## 3. Editing Your Profile

### 3.1 Overview

Users edit existing items and remove items they no longer want. Editing an item may diverge it from the version currently in personas, so the system offers to propagate changes. Removing an item warns if personas include it and offers to remove from those personas as well. Critically, removing an item from a *persona* does NOT remove it from your profile — it just makes it private again.

### 3.2 Wireframe

```
Edit dialog:
┌──────────────────────────────────────────────────────────────────────┐
│  Edit Skill                                                   [X]    │
├──────────────────────────────────────────────────────────────────────┤
│  Skill Name    [TypeScript______________________]                    │
│  Proficiency   [Expert ▼]                                            │
│  Years Exp.    [8___]                                                │
│  Category      [Frontend________________________]                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ This item is shared with 2 personas:                          │   │
│  │ ☑ Professional — update to match                             │   │
│  │ ☑ Photography — update to match                              │   │
│  │                                                              │   │
│  │ Unchecked personas will keep their current version.          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [Cancel]                                    [Save Changes]          │
└──────────────────────────────────────────────────────────────────────┘

Remove dialog:
┌──────────────────────────────────────────────────────────────────────┐
│  Remove "TypeScript" from your profile?                       [X]    │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ This item is shared with 2 personas:                              │
│                                                                      │
│  ☑ Professional — also remove from this persona                     │
│  ☑ Photography — also remove from this persona                      │
│                                                                      │
│  Unchecked personas will keep their copy of this item.               │
│                                                                      │
│  [Cancel]                                    [Remove]                │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Hierarchy

```
components/trait-edit-dialog.tsx                    ← NEW: Client Component ("use client")
  ├─ components/metadata-driven-form.tsx            ← Shared with Add (from section 2)
  ├─ components/persona-sync-checklist.tsx          ← NEW: checkboxes for propagation
  └─ calls: app/actions/profile.ts                   ← updateTrait server action

components/trait-remove-dialog.tsx                  ← NEW: Client Component ("use client")
  ├─ components/persona-sync-checklist.tsx          ← Shared
  └─ calls: app/actions/profile.ts                   ← removeTrait server action
```

**New:**
- `components/trait-edit-dialog.tsx` — edit dialog with form + propagation checklist
- `components/trait-remove-dialog.tsx` — remove confirmation with persona impact
- `components/persona-sync-checklist.tsx` — reusable checklist of affected personas with checkboxes

### 3.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | User can open an edit dialog for any profile item with current values pre-filled | `components/trait-edit-dialog.tsx` renders `<MetadataDrivenForm>` in edit mode. If the item is shared with personas, `<PersonaSyncChecklist>` appears below (checkboxes default: checked). |
| 3.2 | User can save an edited item and propagate changes to selected personas | `updateTrait({ traitKey, traitIndex, newValue, propagateToPersonas })`: validates, replaces in profile, for each checked persona finds matching item (dedup identity logic) and replaces it, recalculates completeness. Toast: "Updated [name] in your profile and N personas". Unchecked personas keep their version. |
| 3.3 | User can edit scalar traits (string/object types like locale) | `updateTrait` detects scalar types (`traitIndex === undefined`) and replaces `traits[traitKey]` directly. Propagation works the same way. |
| 3.4 | User can remove a profile item with awareness of persona impact | If item is NOT in any persona: simple confirmation. If in personas: lists them with checkboxes (default: checked). |
| 3.5 | System removes a profile item and optionally cascades to personas | `removeTrait({ traitKey, traitIndex, removeFromPersonas })`: removes from profile JSONB, cleans up empty arrays (deletes key), for each checked persona finds and removes matching item, recalculates completeness. Toast: "Removed [name] from your profile and N personas". |
| 3.6 | User can remove a single value from a string-array trait (e.g., one language) | `removeTrait` for string arrays uses string value (not index) for persona matching, since persona arrays may be ordered differently. |

### 3.5 Server Actions

```typescript
// New actions in app/actions/profile.ts

updateTrait(input: {
  traitKey: string;
  traitIndex?: number;          // Omit for scalar types
  newValue: unknown;
  propagateToPersonas?: string[];  // Persona URIs to sync
}): Promise<{ success: boolean; personasUpdated: number }>
// [Authenticated user] required. Validates newValue, replaces in profile,
// optionally propagates to listed personas. Recalculates completeness.

removeTrait(input: {
  traitKey: string;
  traitIndex?: number;          // Omit for scalar types
  traitValue?: unknown;          // For string arrays (match by value)
  removeFromPersonas?: string[];  // Persona URIs to also remove from
}): Promise<{ success: boolean; personasUpdated: number }>
// [Authenticated user] required. Removes item from profile,
// optionally removes from listed personas. Recalculates completeness.
```

### 3.6 Validation

```typescript
// New: add to lib/validations/profile.ts

export const updateTraitSchema = z.object({
  traitKey: z.string().min(1),
  traitIndex: z.number().int().min(0).optional(),
  newValue: z.unknown(),
  propagateToPersonas: z.array(z.string()).optional(),
});

export const removeTraitSchema = z.object({
  traitKey: z.string().min(1),
  traitIndex: z.number().int().min(0).optional(),
  traitValue: z.unknown().optional(),
  removeFromPersonas: z.array(z.string()).optional(),
});

export type UpdateTraitInput = z.infer<typeof updateTraitSchema>;
export type RemoveTraitInput = z.infer<typeof removeTraitSchema>;
```

### 3.7 Edge Cases

- [ ] User edits a profile item that was independently edited in a persona (diverged) — propagation replaces the persona's diverged version; unchecking keeps the diverged version
- [ ] User removes the last item in an array trait — key is deleted from profile JSONB to keep it clean
- [ ] Concurrent edit: two tabs open, edit same item — last write wins (JSONB replace), no conflict resolution in v1
- [ ] Removing an item that is endorsed in a persona — removal does NOT delete endorsements (endorsements reference the persona, not the profile)
- [ ] User removes all items from profile — traits revert to `{}`, shows empty state
- [ ] Edit dialog opened for an item that was removed in another tab — show error on save, close dialog

### 3.8 Test Criteria

**Unit tests:**
- `updateTrait` replaces skill at correct index
- `updateTrait` with propagation updates persona trait
- `updateTrait` without propagation leaves personas untouched
- `removeTrait` removes skill from traits array
- `removeTrait` cleans up empty arrays (deletes key)
- `removeTrait` with persona sync removes from persona too
- `removeTrait` for string arrays matches by value
- `removeTrait` does not cascade-delete endorsements on the persona (endorsements reference the persona row, not individual trait values)

**Integration tests:**
- Edit item → profile updated → check persona was updated (propagation)
- Edit item → profile updated → check persona was NOT updated (no propagation)
- Remove item → profile updated → check persona was updated (removal propagation)
- Remove last item → traits is `{}`

**E2E tests:**
- Click Edit on skill → modify proficiency → check "Professional" persona → save → verify both updated
- Click Remove on skill → see persona warning → confirm → verify removed from both
- Click Remove on skill → uncheck persona → confirm → verify removed from profile but present in persona

### 3.9 Implementation Order

1. `lib/validations/profile.ts` — add `updateTraitSchema`, `removeTraitSchema` (requires step 1 from section 2)
2. `app/actions/profile.ts` — `updateTrait` action (requires step 1)
3. `app/actions/profile.ts` — `removeTrait` action (requires step 1)
4. `components/persona-sync-checklist.tsx` — reusable checklist component (requires nothing)
5. `components/trait-edit-dialog.tsx` — edit dialog with form + checklist (requires steps 2, 4, and metadata-driven-form from section 2)
6. `components/trait-remove-dialog.tsx` — remove confirmation dialog (requires steps 3, 4)
7. Wire edit/remove buttons into `components/profile-item.tsx` (requires steps 5, 6)
8. Unit tests for `updateTrait` and `removeTrait`
9. E2E tests for edit and remove flows

---

## 4. Persona Curation

### 4.1 Overview

The core interaction between your profile and a persona is the selection flow: when editing a persona, you see which profile items are available but not yet included, and can select them for inclusion. Selecting a profile item COPIES it into the persona (denormalized). If you then edit the item on the persona directly, it diverges from the profile version. The system tracks this divergence and offers a "Reset to profile version" option. This section covers the persona-side of the profile-persona relationship.

### 4.2 Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│  Edit Persona: Professional                                          │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Skills                                                              │
│  ── Included ──────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ● TypeScript · Expert · 8yr                    [Edit] [✕]   │   │
│  │   ✓ Matches your profile                                     │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ ● React · Advanced · 6yr                       [Edit] [✕]   │   │
│  │   ⚠ Edited on this persona (profile: Intermediate)           │   │
│  │   [Reset to profile version]                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── Available from your profile ───────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ □ Python · Expert · 10yr                          [+ Add]    │   │
│  │ □ Go · Intermediate · 2yr                         [+ Add]    │   │
│  │ □ Lightroom · Intermediate                        [+ Add]    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [+ Add new skill]   ← opens add dialog, adds to BOTH profile & persona│
│                                                                      │
│  Values                                                              │
│  ── Included ──────────────────────────────────────────────────────  │
│  [Integrity] [Creativity] [✕] [✕]                                    │
│                                                                      │
│  ── Available from your profile ───────────────────────────────────  │
│  [Innovation (+)] [Sustainability (+)]                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx       ← MODIFY existing Client Component
  ├─ components/persona-trait-section.tsx           ← NEW: section for one trait type
  │    ├─ components/profile-item.tsx               ← Shared from section 1 (view mode)
  │    ├─ components/available-from-profile.tsx     ← NEW: available-from-profile list
  │    │    └─ calls: app/actions/profile.ts        ← getUserTraitsRaw
  │    ├─ components/trait-divergence-badge.tsx     ← NEW: shows sync status
  │    └─ components/trait-edit-dialog.tsx          ← Shared from section 3
  └─ calls: app/actions/personas.ts                ← updatePersonaTraits (existing)
       └─ writes: lib/db/schema/personas.ts        ← personas.traits JSONB
```

**Existing:**
- `app/(dashboard)/personas/[uri]/edit/page.tsx` (line 1-420) — currently has hardcoded trait editing. Will be refactored.
- `app/actions/personas.ts` — `updatePersonaTraits()` (line 199-240)

**New:**
- `components/persona-trait-section.tsx` — renders included + available items for one type
- `components/available-from-profile.tsx` — shows available profile items not yet in persona
- `components/trait-divergence-badge.tsx` — shows whether persona item matches profile

### 4.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | User can see both included traits and available profile items when editing a persona | Edit page loads persona traits AND user's full profile. For each trait type: "Included" (in persona) and "Available from your profile" (profile items not in persona). Available section collapsed by default when 3+ items already included. Hidden when all profile items are already included or user has none. |
| 4.2 | User can add a profile item to a persona with one click | Clicking "+ Add" copies the item from profile into persona's local state. Not persisted until "Save All Changes" via existing `updatePersonaTraits()`. Multiple items can be added before saving. |
| 4.3 | User can remove an item from a persona without affecting their profile | Clicking "✕" removes from persona's local state. On save, persona's JSONB updated. Profile retains the item — it becomes "Private" (not shared with this persona anymore). |
| 4.4 | User can see when a persona's copy of an item differs from their profile | `components/trait-divergence-badge.tsx` uses deep equality comparison. "Matches your profile" (green) or "Edited on this persona" (amber) with tooltip showing profile version. "Not in your profile" badge if item was removed from profile. |
| 4.5 | User can reset a diverged persona item to match their profile | "Reset to profile version" button replaces persona's copy with profile's current version. Badge changes to "Matches your profile". |
| 4.6 | User can add a brand new item while editing a persona that flows to both profile and persona | "+ Add new skill" opens the same add dialog as the profile page. On save, item added to BOTH profile and persona. `addTraitAndSync({ traitKey, value, personaUri })` handles both in one action. Deduplication prevents adding if already in profile. |

### 4.5 Server Actions

```typescript
// Existing: app/actions/personas.ts — no changes needed to updatePersonaTraits

// New in app/actions/profile.ts:

addTraitAndSync(input: {
  traitKey: string;
  value: unknown;
  personaUri: string;
}): Promise<{ success: boolean; message: string }>
// [Authenticated user] required. Adds item to profile AND appends to specified persona.
// Validates, deduplicates, recalculates completeness. Single transaction.
```

### 4.6 Trait Comparison Helper

```typescript
// New: lib/personas/trait-compare.ts

export function traitsMatch(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
```

For string array items, comparison is direct string equality (case-sensitive, since we normalize on write).

### 4.7 Edge Cases

- [ ] User has 50 skills, persona has 5 — "Available" list shows 45 items. Consider pagination or virtualization for very large collections.
- [ ] User adds a skill to persona that is a case-variant of a profile skill (e.g., "typescript" vs "TypeScript") — dedup should catch this and match
- [ ] User edits a skill name on the persona (e.g., "TypeScript" → "TS") — this creates a new identity, breaking the profile link. The old "TypeScript" reappears in "Available from your profile". The "TS" shows as "Not in your profile".
- [ ] User trait type not visible in metadata (e.g., a custom key added via API) — show in a "Custom" section with generic rendering
- [ ] Persona has items not in profile (legacy data or import edge case) — show in Included with "Not in your profile" badge
- [ ] Two personas include the same profile item but one has diverged — profile view shows "Shared with: Professional (edited), Photography (matches)"

### 4.8 Test Criteria

**Unit tests:**
- `traitsMatch` returns true for identical objects
- `traitsMatch` returns false for objects differing in one field
- `traitsMatch` returns true for identical strings
- `addTraitAndSync` adds to both profile and persona
- Available items filter correctly excludes included items

**Integration tests:**
- Add profile skill to persona → save → verify persona has skill, profile unchanged
- Remove skill from persona → save → verify profile still has skill
- Edit skill on persona (diverge) → verify divergence badge shows
- Reset to profile version → verify persona matches profile again

**E2E tests:**
- Open persona edit → see "Available from your profile" skills → add one → save → verify on detail page
- Remove skill from persona → verify it appears back in "Available from your profile"
- Edit skill proficiency on persona → see "Edited on this persona" badge → click reset → see "Matches your profile"

### 4.9 Implementation Order

1. `lib/personas/trait-compare.ts` — `traitsMatch()` helper function (requires nothing)
2. `components/trait-divergence-badge.tsx` — sync status badge (requires step 1)
3. `components/available-from-profile.tsx` — available items list with add buttons (requires nothing)
4. `components/persona-trait-section.tsx` — combined included + available section (requires steps 2, 3)
5. Refactor `app/(dashboard)/personas/[uri]/edit/page.tsx` to RSC wrapper + load profile data (requires steps 3, 4)
6. `app/actions/profile.ts` — `addTraitAndSync` action (requires step 2 from section 2)
7. Wire "+ Add new" button in persona edit to use add dialog + combined action (requires step 6)
8. Unit tests for `traitsMatch` and available-items filter logic
9. E2E tests for full profile-persona sync flow

---

## 5. Import & Merge

### 5.1 Overview

Users can bootstrap their profile by importing data from external sources. The system supports LinkedIn ZIP export, AI-powered URL scraping, and has architecture for CSV and future providers. File-based imports parse client-side (privacy-first: raw data never leaves the browser). URL imports scrape and extract server-side via AI. In both cases, only confirmed/selected items are merged into the profile. This section documents the import flow, deduplication logic, and merge strategy.

### 5.2 Wireframe

The import UI exists at `app/(dashboard)/settings/import-settings.tsx` (line 1-588). The wireframe documents the complete wizard:

```
Step 1: Provider Selection
┌──────────────────────────────────────────────────────────────────────┐
│  Import Your Data                                                    │
│  Bootstrap your profile from platforms you already use.               │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │ ⓛ LinkedIn │  │ ⓖ GitHub  │  │ ⓦ Website  │                    │
│  │ ZIP export │  │ (Coming    │  │ Paste a    │                    │
│  │            │  │  Soon)     │  │ URL        │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
└──────────────────────────────────────────────────────────────────────┘

Step 2: Upload
┌──────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                            │
│  ┌─── Instructions ──────┐  ┌─── Drop Zone ─────────────────┐      │
│  │ How to export from    │  │                                │      │
│  │ LinkedIn:             │  │    ⬆ Drop your ZIP here       │      │
│  │ 1. Go to Settings...  │  │    or click to browse          │      │
│  │ 2. Select data...     │  │                                │      │
│  │ 3. Download ZIP...    │  │    [Browse Files]              │      │
│  └───────────────────────┘  └────────────────────────────────┘      │
│  🔒 Privacy: parsed in browser. Raw data never leaves your device.  │
└──────────────────────────────────────────────────────────────────────┘

Step 3: Preview
┌──────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                            │
│  Found 12 new and 3 existing items.                                  │
│                                                                      │
│  ▼ Work Experience (4 found: 3 new, 1 existing)                     │
│    ☑ Senior Engineer at Acme · 2020→Present          [New]          │
│    ☑ Junior Dev at Beta Inc · 2018→2020              [New]          │
│    ☐ Intern at Gamma LLC · 2017→2018                 [Already exists]│
│    ☑ Freelance at Self · 2016→2017                   [New]          │
│                                                                      │
│  ▼ Skills (6 found: 5 new, 1 existing)                              │
│    ☑ Python                                          [New]          │
│    ☐ TypeScript                                      [Already exists]│
│    ☑ Go, Rust, Docker, Kubernetes                    [New]          │
│                                                                      │
│  ▼ Languages (2 found: 1 new, 1 existing)                          │
│    ☑ French                                          [New]          │
│    ☐ English                                         [Already exists]│
│                                                                      │
│  Also share in persona: [Professional ▼] or [Profile only]          │
│                                                                      │
│  [Import 10 items]                                    [Cancel]       │
└──────────────────────────────────────────────────────────────────────┘

Step 4: Done
┌──────────────────────────────────────────────────────────────────────┐
│  ✓ Import Complete                                                   │
│  Added 10 items to your profile                                      │
│  [experience: +3] [skills: +5] [languages: +1] [certs: +1]         │
│                                                                      │
│  [Import More]                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Component Hierarchy

```
app/(dashboard)/settings/page.tsx                   ← EXISTING: Server Component
  └─ app/(dashboard)/settings/settings-tabs.tsx     ← EXISTING: Tab container
       └─ app/(dashboard)/settings/import-settings.tsx  ← EXISTING: Import wizard (588 lines)
            ├─ components/ui/ (Card, Badge, etc.)   ← EXISTING: shadcn components
            ├─ lib/import/providers/index.ts        ← EXISTING: provider registry
            │    ├─ lib/import/providers/linkedin.ts ← EXISTING: LinkedIn parser
            │    └─ lib/import/providers/url/        ← NEW: URL scrape + AI extract (see §5.7)
            ├─ lib/import/merge.ts                  ← EXISTING: merge strategy
            ├─ lib/import/dedup.ts                  ← EXISTING: duplicate detection
            └─ calls: app/actions/import.ts         ← EXISTING: importTraits
                 └─ writes: lib/db/schema/users.ts  ← userTraits.traits
```

LinkedIn import is fully implemented. This section documents the architecture, identifies gaps, and specifies new work (URL scraping provider, CSV provider, conflict resolution UX).

### 5.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | User can select LinkedIn and upload their data export ZIP to populate their profile | **Exists.** LinkedIn card → export instructions → drop zone. ZIP parsed client-side (`fflate` + `papaparse`). PII files silently skipped. Known CSVs (Positions, Education, Skills, Certifications, Languages, Profile) parsed into trait structures. |
| 5.2 | User can review a preview of parsed data with duplicates auto-detected | **Exists.** Preview groups (Experience, Skills, Education, etc.) with checkboxes. Items already in profile marked "Already exists" and unchecked. New items checked by default. Counts per group and total. `isDuplicate()` matches: skills by name, experience by company+title, education by institution+degree, all case-insensitive. |
| 5.3 | User can confirm import and optionally share into a persona | **Exists.** "Import N items" sends only selected, non-duplicate traits to server. `importTraits()` merges into profile JSONB. Optional persona sync copies to persona too. Activity event logged. Success screen shows per-key breakdown. |
| 5.4 | User can import from a generic CSV file by mapping columns to profile fields | **New.** `lib/import/providers/csv.ts` provider. Upload CSV → detect columns → user maps columns to trait fields (trait type selected first, then field mapping). Auto-suggest mappings via fuzzy header match. Feeds into standard preview/confirm/dedup flow. Add `'csv'` to `IMPORT_PROVIDER_IDS`. |
| 5.5 | User can map CSV columns to profile fields with auto-suggestions | **New.** `components/csv-column-mapper.tsx`. Step 1: select trait type. Step 2: dropdown per field showing CSV columns. Preview first 3 rows per mapping. Required unmapped fields block proceeding. |
| 5.6 | System detects partial duplicates (same identity, different details) and lets the user choose how to resolve | **Enhancement.** Currently `isDuplicate` returns boolean. Enhance to return `'conflict'` when identity matches but other fields differ. UI shows radio: Keep existing / Replace with imported / Keep both. Default: Replace (import data presumably newer). |
| 5.7 | User can paste a URL and scan it to extract profile data | **New.** URL input step added to import wizard. User pastes a public URL (LinkedIn, Thumbtack, personal site, etc.) → system scrapes and extracts → feeds into existing preview/confirm/dedup flow. First `url`-method provider. See §5.7 URL Import Workflow for full details. |
| 5.8 | System can scrape a public URL and extract structured traits via AI | **New.** `lib/import/providers/url/scrape.ts` fetches via Jina Reader API (`r.jina.ai`). `lib/import/providers/url/extract.ts` uses Vercel AI SDK `generateObject()` with `gpt-4o-mini` and a Zod schema matching the `Traits` interface. Cost: ~$0.001–$0.005 per scrape. |
| 5.9 | System detects URL source type and adapts extraction accordingly | **New.** URL type detection in `scrape.ts`: LinkedIn profile, business listing (Thumbtack/Angie's List/Yelp/Google Maps), portfolio/personal site, generic page. System prompt adapts extraction strategy per type (e.g., LinkedIn → emphasize experience/skills; business listing → emphasize offerings/skills/qualities). |
| 5.10 | System rate-limits URL scraping to prevent abuse | **New.** Server-side rate limit: 10 scrapes per user per hour, 50 per user per day. In-memory Map with TTL for v1, Redis for production. Returns 429 with retry-after. UI shows "You've reached the scan limit. Try again in X minutes." |

### 5.5 Server Actions

```typescript
// Existing: app/actions/import.ts — no changes needed

importTraits(raw: ImportTraitsInput): Promise<{
  success: boolean;
  imported: number;
  provider: string;
  perKey: Record<string, number>;
}>
// [Authenticated user] required. Merges confirmed traits into profile,
// optionally syncs to a target persona. Logs activity.
```

### 5.6 Validation

```typescript
// Existing: lib/validations/import.ts
export const importTraitsSchema = z.object({
  providerId: z.enum(IMPORT_PROVIDER_IDS),  // Will need 'csv' added
  traits: traitsSchema,
  targetPersonaUri: z.string().optional(),
});
```

To support CSV: add `'csv'` to `IMPORT_PROVIDER_IDS` in `lib/constants.ts`. Also add `'url'` to support the URL import provider.

### 5.7 URL Import Workflow

#### Overview

Users can paste any public URL — LinkedIn profile, Thumbtack listing, Google Maps business page, personal website, portfolio — and have the system automatically extract structured profile data via AI. This is the first provider to use the `UrlIntake` method already defined in `lib/import/types.ts`. The full pipeline:

```
User pastes URL → Server action scrapes via Jina Reader API → AI extracts traits via generateObject →
Builds ImportPreview (reusing existing dedup/merge) → User reviews in existing preview UI → Confirms → Done
```

**Why Jina Reader for v1:** Zero npm dependency — a single `fetch('https://r.jina.ai/' + url)` call returns clean markdown. Free tier, no API key required (optional key for higher rate limits). The scraping layer is swappable — upgrading to Firecrawl later means changing one function.

**AI extraction:** Vercel AI SDK `generateObject()` with `openai/gpt-4o-mini` and a Zod output schema matching the `Traits` interface. Cost: ~$0.001–$0.005 per scrape. The system prompt adapts extraction strategy based on detected URL type.

**Reused infrastructure (no changes needed):**
- `lib/import/dedup.ts` — `isDuplicate()` for all trait types
- `lib/import/merge.ts` — `mergeTraits()` for combining with existing profile
- `lib/import/types.ts` — `ImportPreview`, `TraitImportGroup`, `MappedTraitItem`
- `app/actions/import.ts` — `importTraits()` server action
- `app/(dashboard)/settings/import-settings.tsx` — preview/confirm/done wizard steps

#### Wireframe

```
Step 2a: URL Input (shown when user selects "Website" provider)
┌──────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                            │
│                                                                      │
│  Import from a URL                                                   │
│  Paste a link to any public profile or business listing.             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ https://linkedin.com/in/janedoe                       [Scan] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Works with:  LinkedIn · Thumbtack · Google Maps · Angie's List     │
│               Personal websites · Portfolio pages · Any public URL  │
│                                                                      │
│  🔒 We fetch the public page only. We never log in as you.          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Step 2b: Scanning
┌──────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                            │
│                                                                      │
│  Scanning linkedin.com/in/janedoe...                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░  70%                      │
│                                                                      │
│  ✓ Page fetched                                                      │
│  ● Extracting profile data...                                        │
│  ○ Building preview                                                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

→ On success, proceeds to existing Step 3: Preview (same UI as LinkedIn ZIP import)
→ On failure, shows error with retry option
```

#### Component Hierarchy

```
app/(dashboard)/settings/import-settings.tsx       ← EXISTING: Import wizard (add URL step)
  ├─ components/url-import-input.tsx                ← NEW: URL input + scan button + progress
  │    └─ calls: app/actions/import.ts              ← scrapeUrlForImport() server action
  │         ├─ lib/import/providers/url/scrape.ts   ← NEW: Jina Reader client + URL type detection
  │         ├─ lib/import/providers/url/extract.ts  ← NEW: AI extraction via generateObject
  │         ├─ lib/import/dedup.ts                  ← EXISTING: isDuplicate()
  │         └─ returns: ImportPreview               ← Feeds into existing preview step
  └─ (existing preview/confirm/done steps unchanged)
```

**Existing files (no changes needed):**
- `lib/import/dedup.ts` — `isDuplicate()` for all trait types
- `lib/import/merge.ts` — `mergeTraits()` for combining with existing profile
- `lib/import/types.ts` — `ImportPreview`, `TraitImportGroup`, `MappedTraitItem`
- `app/actions/import.ts` — `importTraits()` server action
- `app/(dashboard)/settings/import-settings.tsx` — preview/confirm/done wizard steps

**New files:**
- `lib/import/providers/url/index.ts` — provider definition (registers as `url` method)
- `lib/import/providers/url/scrape.ts` — Jina Reader client + URL type detection
- `lib/import/providers/url/extract.ts` — AI extraction via `generateObject()` with Zod schema
- `lib/validations/url-import.ts` — Zod schemas for URL input and extraction output
- `components/url-import-input.tsx` — URL input field with scan button and progress states

#### Server Actions

```typescript
// New in app/actions/import.ts

/** Scrape a URL and extract structured traits via AI. */
scrapeUrlForImport(raw: ScrapeUrlInput): Promise<ImportPreview>
// [Authenticated user] required. Rate-limited: 10/hour, 50/day per user.
// 1. Validates URL format via scrapeUrlSchema
// 2. Checks rate limit (in-memory Map with TTL for v1)
// 3. Detects URL source type (linkedin, business_listing, portfolio, generic)
// 4. Fetches page content via Jina Reader API (r.jina.ai)
// 5. Truncates markdown to 30KB if needed (cost control)
// 6. Extracts structured traits via generateObject (gpt-4o-mini + extractionSchema)
// 7. Fetches user's existing traits for dedup comparison
// 8. Builds ImportPreview using isDuplicate() + buildGroup() from existing infra
// 9. If totalNew < 3, attaches a warning suggestion:
//    "We found very little profile data on this page. Is this the right URL?"
// 10. Returns preview for the existing confirm/merge flow
```

#### AI Extraction Schema

The extraction step uses Vercel AI SDK `generateObject()` with a Zod schema that mirrors the `Traits` interface. The model extracts whatever it can find — empty arrays for missing categories.

```typescript
// lib/import/providers/url/extract.ts

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

/** Zod schema for AI extraction output — matches Traits interface */
const extractionSchema = z.object({
  skills: z.array(z.object({
    name: z.string(),
    proficiency: z.string().optional(),
    yearsExperience: z.number().optional(),
    category: z.string().optional(),
  })).default([]),
  experience: z.array(z.object({
    company: z.string().optional(),
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
  education: z.array(z.object({
    institution: z.string().optional(),
    degree: z.string().optional(),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    dateObtained: z.string().optional(),
  })).default([]),
  languages: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  qualities: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  seekingOpportunities: z.array(z.string()).default([]),
  offerings: z.array(z.object({
    description: z.string(),
    offeringType: z.string().optional(),
    availability: z.string().optional(),
    audience: z.string().optional(),
  })).default([]),
  focusAreas: z.array(z.object({
    domain: z.string(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })).default([]),
});

type ExtractedTraits = z.infer<typeof extractionSchema>;
```

#### URL Type Detection

The system detects URL source type to adapt the AI extraction strategy:

```typescript
// lib/import/providers/url/scrape.ts

type UrlSourceType = 'linkedin' | 'business_listing' | 'portfolio' | 'generic';

function detectUrlType(url: string): UrlSourceType {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('thumbtack.com') || hostname.includes('angieslist.com')
    || hostname.includes('google.com/maps') || hostname.includes('yelp.com'))
    return 'business_listing';
  if (hostname.includes('github.io') || hostname.includes('portfolio')
    || hostname.includes('about.me') || hostname.includes('carrd.co'))
    return 'portfolio';
  return 'generic';
}

function buildSystemPrompt(sourceType: UrlSourceType): string {
  const base = 'Extract structured profile data from this page. '
    + 'Return only what you can confidently extract. Leave arrays empty if no data found.';
  const hints: Record<UrlSourceType, string> = {
    linkedin: 'Focus on work experience, education, skills, and certifications.',
    business_listing: 'Focus on offerings, skills, qualities, and service areas.',
    portfolio: 'Focus on skills, projects (as experience), and interests.',
    generic: 'Extract whatever profile-relevant data you can find.',
  };
  return `${base}\n\n${hints[sourceType]}`;
}
```

#### Scraping Client

```typescript
// lib/import/providers/url/scrape.ts

const JINA_READER_BASE = 'https://r.jina.ai/';
const SCRAPE_TIMEOUT_MS = 15_000;
const MAX_MARKDOWN_LENGTH = 30_000; // ~30KB, keeps LLM cost predictable

export async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(`${JINA_READER_BASE}${url}`, {
    headers: {
      Accept: 'text/markdown',
      // Optional: 'Authorization': `Bearer ${process.env.JINA_API_KEY}`
    },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Scrape failed: ${response.status} ${response.statusText}`);
  }

  let markdown = await response.text();

  // Login wall detection — check for common indicators before length check
  if (detectLoginWall(markdown)) {
    throw new Error(
      'This page appears to require login. Try a public URL, '
      + 'or use the LinkedIn ZIP export for LinkedIn profiles.',
    );
  }

  if (!markdown || markdown.length < 50) {
    throw new Error('Page returned insufficient content — it may require login');
  }

  // Truncate to control LLM cost (gpt-4o-mini charges per input token)
  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    markdown = markdown.slice(0, MAX_MARKDOWN_LENGTH);
  }

  return markdown;
}

/** Detect login/paywall pages that Jina Reader returns instead of real content. */
function detectLoginWall(html: string): boolean {
  const sample = html.slice(0, 2000).toLowerCase();
  const indicators = [
    'sign in', 'log in', 'login', 'auth wall',
    'create an account', 'join now',
    'form action="/login', 'form action="/signin',
    'id="login-form"', 'class="login',
  ];
  const matchCount = indicators.filter((i) => sample.includes(i)).length;
  // 2+ indicators = high confidence it's a login page, not real content
  return matchCount >= 2;
}
```

#### Validation

```typescript
// New: lib/validations/url-import.ts

import { z } from 'zod';

/** Check if a hostname resolves to a private/reserved IP range (SSRF prevention). */
function isPrivateHostname(hostname: string): boolean {
  // Block: localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x (link-local/AWS metadata),
  // [::1], fc00::/7, fe80::/10, and raw IP addresses in private ranges.
  const blocked = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^\[?::1\]?$/,
    /^\[?f[cd]/i,    // fc00::/7 (unique local)
    /^\[?fe80/i,     // fe80::/10 (link-local)
  ];
  return blocked.some((re) => re.test(hostname));
}

export const scrapeUrlSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://',
    )
    .refine(
      (url) => {
        try { return !isPrivateHostname(new URL(url).hostname); }
        catch { return false; }
      },
      'Cannot fetch private or internal URLs',
    ),
});

export type ScrapeUrlInput = z.infer<typeof scrapeUrlSchema>;
```

### 5.8 Edge Cases

- [ ] LinkedIn ZIP with only PII files (no Positions/Skills/etc.) — "No importable data found"
- [ ] LinkedIn CSV with non-UTF-8 encoding — `fflate` handles common encodings; edge cases may produce garbled text
- [ ] Very large LinkedIn export (500+ connections) — only trait-relevant CSVs are parsed; Connections.csv skipped
- [ ] Re-importing the same LinkedIn export — all items flagged as duplicates, import count is 0
- [ ] CSV with 1000+ rows — client-side parsing may be slow; show progress indicator
- [ ] CSV with mixed trait types — user must select one trait type per CSV import; multiple imports for multiple types
- [ ] Import while another tab has unsaved persona edits — persona sync may overwrite unsaved changes (documented limitation)
- [ ] Traits JSONB exceeds Postgres row size limit (unlikely) — Postgres JSONB is TOAST-compressed, limit is 1GB
- [ ] URL requires login (LinkedIn private profile, Thumbtack dashboard) — Jina Reader returns login page HTML; detect by checking for common login indicators (`form[action*=login]`, "sign in" in first 500 chars); show: "This page requires login. Try a public URL or use the LinkedIn ZIP export instead."
- [ ] LinkedIn rate-limits Jina Reader — Jina may get 429 from LinkedIn; retry once after 2s, then fall back to: "LinkedIn is blocking automated access. Use the LinkedIn ZIP export instead."
- [ ] URL points to non-profile page (blog post, company homepage) — AI extraction returns mostly empty arrays; if < 3 total items extracted, warn: "We found very little profile data on this page. Is this the right URL?"
- [ ] Jina Reader returns very large content (100KB+ markdown) — truncate to first 30KB before sending to LLM (gpt-4o-mini context: 128K tokens, but cost scales with input)
- [ ] URL is a redirect chain — Jina Reader follows redirects; final URL may differ from input. Show final URL in UI for transparency.
- [ ] User submits localhost or private IP — validate URL hostname is not private/reserved IP range before fetching
- [ ] AI hallucination — extraction may invent traits not on the page; preview step lets user deselect incorrect items before import. This is why the preview/confirm flow exists.
- [ ] Jina Reader is down or unreachable — timeout after 15s, show: "Unable to reach the page. Please try again later."
- [ ] Rate limit exceeded — 10/hour or 50/day per user. Show: "You've reached the scan limit. Try again in X minutes." with countdown.

### 5.9 Test Criteria

**Existing unit tests (passing):**
- `mergeTraits` appends new skills to existing array
- `mergeTraits` skips unselected items
- `mergeTraits` skips duplicate items even if selected
- `isDuplicate` detects skill by name (case-insensitive)
- `isDuplicate` detects experience by company+title
- `isDuplicate` detects education by institution+degree
- `normalizeLinkedInDate` normalizes "Jan 2020" to "2020-01"
- `parseCsv` parses CSV with headers

**New unit tests:**
- CSV provider `parseFiles` extracts columns correctly
- CSV column mapper auto-suggests mappings
- Conflict detection returns `isConflict: true` for same-name different-detail skills
- Merge with `conflictResolution: 'replace'` replaces existing item
- Merge with `conflictResolution: 'keep_both'` keeps both items

**Integration tests:**
- Import LinkedIn → profile updated → traits match expected structure
- Import LinkedIn with persona sync → persona also updated
- Re-import same data → 0 items imported

**E2E tests:**
- Settings → Import → LinkedIn → upload ZIP → preview → confirm → success screen
- Settings → Import → LinkedIn → preview → uncheck items → import fewer
- Settings → Import → LinkedIn → select persona → import → verify persona updated
- Settings → Import → CSV → upload → map columns → preview → confirm

**New unit tests (URL import — scraping):**
- `scrapeUrl` returns markdown for a valid public URL (mock Jina Reader response)
- `scrapeUrl` throws on non-200 response
- `scrapeUrl` throws on insufficient content (<50 chars)
- `scrapeUrl` truncates content exceeding 30KB
- `scrapeUrl` times out after 15s on hung request (mock slow response)
- `detectLoginWall` returns true for page with "sign in" + "create an account"
- `detectLoginWall` returns false for normal profile page content
- `detectLoginWall` returns true for LinkedIn login redirect page
- `scrapeUrl` throws descriptive error when login wall detected
- `detectUrlType` returns `'linkedin'` for `linkedin.com/in/...`
- `detectUrlType` returns `'business_listing'` for `thumbtack.com/...`
- `detectUrlType` returns `'business_listing'` for `yelp.com/biz/...`
- `detectUrlType` returns `'portfolio'` for `github.io` domains
- `detectUrlType` returns `'generic'` for unknown domains

**New unit tests (URL import — AI extraction):**
- `extractTraitsFromMarkdown` returns structured skills from mock LinkedIn markdown (mock `generateObject`)
- `extractTraitsFromMarkdown` returns offerings from mock Thumbtack markdown
- `extractTraitsFromMarkdown` returns empty arrays for irrelevant content (blog post)
- `buildSystemPrompt` includes experience/skills hints for LinkedIn URLs
- `buildSystemPrompt` includes offerings-focused hints for business listings

**New unit tests (URL import — SSRF prevention):**
- `isPrivateHostname` blocks `localhost`
- `isPrivateHostname` blocks `127.0.0.1`
- `isPrivateHostname` blocks `10.0.0.1`, `172.16.0.1`, `192.168.1.1`
- `isPrivateHostname` blocks `169.254.169.254` (AWS metadata)
- `isPrivateHostname` blocks `[::1]` (IPv6 loopback)
- `isPrivateHostname` allows `example.com`, `linkedin.com`
- `scrapeUrlSchema` rejects `http://localhost:3000/api/secrets`
- `scrapeUrlSchema` rejects `http://169.254.169.254/latest/meta-data/`

**New integration tests (URL import):**
- `scrapeUrlForImport` returns `ImportPreview` with correct groups (mock Jina Reader + real AI)
- `scrapeUrlForImport` marks existing traits as duplicates
- `scrapeUrlForImport` returns error when rate limit exceeded
- `scrapeUrlForImport` rejects invalid URLs
- `scrapeUrlForImport` rejects private/internal URLs (SSRF)
- `scrapeUrlForImport` attaches low-result warning when < 3 items extracted

**New E2E tests (URL import):**
- Settings → Import → Website → paste URL → scan → preview → confirm → success
- Settings → Import → Website → paste invalid URL → see validation error
- Settings → Import → Website → paste login-walled URL → see helpful error message
- Settings → Import → Website → scan → low-result warning for non-profile page

### 5.10 Implementation Order

1. **LinkedIn provider** — fully implemented. Move to CSV.
2. Add `'csv'` to `IMPORT_PROVIDER_IDS` in `lib/constants.ts` (requires nothing)
3. `lib/import/providers/csv.ts` — CSV provider with column detection (requires step 2)
4. Register CSV provider in `lib/import/providers/index.ts` (requires step 3)
5. `components/csv-column-mapper.tsx` — column mapping UI (requires step 3)
6. Wire column mapper into `import-settings.tsx` wizard flow (requires step 5)
7. **Conflict resolution enhancement:** extend `MappedTraitItem` in `lib/import/types.ts` (requires nothing)
8. Update `lib/import/dedup.ts` to return conflict data (requires step 7)
9. Update `lib/import/merge.ts` to handle conflict resolutions (requires step 7)
10. Update `import-settings.tsx` to render conflict resolution UI (requires steps 8, 9)
11. Unit tests for CSV provider (requires step 3)
12. Unit tests for conflict resolution (requires steps 8, 9)
13. E2E test for CSV import flow (requires step 6)
14. E2E test for conflict resolution (requires step 10)
15. **URL import provider** — new provider using `UrlIntake` method
16. Add `'url'` to `IMPORT_PROVIDER_IDS` in `lib/constants.ts` (requires nothing)
17. `lib/validations/url-import.ts` — Zod schemas for URL input + `isPrivateHostname` SSRF guard (requires nothing)
18. `lib/import/providers/url/scrape.ts` — Jina Reader client with `AbortSignal.timeout(15s)`, content truncation (30KB cap), URL type detection (requires nothing)
19. `lib/import/providers/url/scrape.ts` — `detectLoginWall()` function: checks first 2KB for 2+ login indicators (requires step 18)
20. `lib/import/providers/url/extract.ts` — AI extraction with `generateObject` + Zod schema (requires step 18)
21. `lib/import/providers/url/index.ts` — provider definition with `UrlIntake` method (requires steps 18, 20)
22. Register URL provider in `lib/import/providers/index.ts` (requires step 21)
23. `app/actions/import.ts` — `scrapeUrlForImport()` server action with low-result warning (< 3 items → attach warning suggestion to `ImportPreview`) (requires steps 17, 18, 19, 20, 22)
24. Rate limiting utility for URL scraping — in-memory Map with TTL (requires nothing)
25. Wire rate limiter into `scrapeUrlForImport()` (requires steps 23, 24)
26. `components/url-import-input.tsx` — URL input + scan button + progress states (requires step 23)
27. Wire URL input into `import-settings.tsx` wizard flow (requires step 26)
28. Unit tests for `isPrivateHostname`, `scrapeUrlSchema` SSRF rejection (requires step 17)
29. Unit tests for `scrapeUrl`, `detectUrlType`, `detectLoginWall`, timeout, truncation (requires steps 18, 19)
30. Unit tests for `extractTraitsFromMarkdown` (requires step 20)
31. Integration test for low-result warning threshold (requires step 23)
32. E2E test for URL import flow (requires step 27)

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | User can view all profile items organized by category on the profile page | `identity`, `profile` | — | — |
| 1.2 | User can see which personas share each item on the profile page | `identity`, `profile` | 1.1 | — |
| 1.3 | New user with empty profile can see getting-started guidance | `identity`, `profile` | 1.1 | — |
| 1.4 | User can filter profile items by category via tabs | `identity`, `profile` | 1.1 | — |
| 1.5 | User can search their profile by keyword | `identity`, `profile` | 1.1 | — |
| 2.1 | User can type natural language in quick-add bar and see classified suggestions | `identity`, `profile`, `quick-add` | 1.1 | — |
| 2.2 | User can confirm a suggestion to instantly add an item to their profile | `identity`, `profile`, `quick-add` | 2.1 | — |
| 2.3 | System can classify free text into structured trait data (taxonomy/pattern/LLM) | `identity`, `profile`, `quick-add`, `classification` | — | — |
| 2.4 | User can elaborate on a quick-added item by opening the full detail form | `identity`, `profile`, `quick-add` | 2.2, 2.5 | — |
| 2.5 | System can render metadata-driven form from editConfig | `identity`, `profile`, `add` | — | — |
| 2.6 | User can add items directly within a category section on the profile page | `identity`, `profile`, `add` | 1.1, 2.5 | — |
| 2.7 | User can manually pick a trait type when classification fails | `identity`, `profile`, `quick-add` | 2.1 | — |
| 3.1 | User can open edit dialog for any profile item with pre-filled values | `identity`, `profile`, `edit` | 2.5 | — |
| 3.2 | User can save edited item and propagate to selected personas | `identity`, `profile`, `edit` | 3.1 | — |
| 3.3 | User can edit scalar traits (string/object types) | `identity`, `profile`, `edit` | 3.2 | — |
| 3.4 | User can remove a profile item with persona impact warning | `identity`, `profile`, `remove` | 1.2 | — |
| 3.5 | System removes profile item and optionally cascades to personas | `identity`, `profile`, `remove` | 3.4 | — |
| 3.6 | User can remove a single value from a string-array trait | `identity`, `profile`, `remove` | 3.5 | — |
| 4.1 | User can see available profile items when editing a persona | `identity`, `profile`, `curation` | 1.1 | — |
| 4.2 | User can add a profile item to a persona with one click | `identity`, `profile`, `curation` | 4.1 | — |
| 4.3 | User can remove item from persona without affecting their profile | `identity`, `profile`, `curation` | 4.1 | — |
| 4.4 | User can see when a persona's item differs from their profile | `identity`, `profile`, `curation` | 4.1 | — |
| 4.5 | User can reset a diverged persona item to match their profile | `identity`, `profile`, `curation` | 4.4 | — |
| 4.6 | User can add new item while editing persona that flows to both profile and persona | `identity`, `profile`, `curation` | 2.2, 4.2 | — |
| 5.1 | User can import from LinkedIn ZIP to populate their profile | `identity`, `import` | — | — |
| 5.2 | User can review import preview with duplicate detection | `identity`, `import` | 5.1 | — |
| 5.3 | User can confirm import with optional persona sync | `identity`, `import` | 5.2 | — |
| 5.4 | User can import from generic CSV by mapping columns | `identity`, `import`, `csv` | — | — |
| 5.5 | User can map CSV columns to profile fields with auto-suggestions | `identity`, `import`, `csv` | 5.4 | — |
| 5.6 | System detects partial duplicates and offers conflict resolution | `identity`, `import`, `conflict` | 5.2 | — |
| 5.7 | User can paste a URL and scan it to extract profile data | `identity`, `import`, `url` | — | — |
| 5.8 | System can scrape a public URL and extract structured traits via AI | `identity`, `import`, `url` | 5.7 | — |
| 5.9 | System detects URL source type and adapts extraction accordingly | `identity`, `import`, `url` | 5.8 | — |
| 5.10 | System rate-limits URL scraping to prevent abuse | `identity`, `import`, `url` | 5.7 | — |

**Conventions:**
- Story titles follow "Actor can DO THING in CONTEXT" format
- Labels include the spec suite (`identity`) and feature area (`profile`, `import`)
- Blocked By reflects story dependencies — matches implementation order
- Estimates filled in during implementation planning, not during spec writing
