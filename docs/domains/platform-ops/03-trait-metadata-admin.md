---
type: spec
title: "Platform & Operations -- Trait Metadata Admin"
description: "Trait metadata is the configuration layer that drives the entire consumer UI. Each of the 41 rows in traitmetadata tells the consumer app how to render a trait (via displayConfig) and how to let…"
status: planned
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations -- Trait Metadata Admin

> Date: 2026-02-24
> Status: Draft
> Depends on: `00-prd.md`, `01-monorepo-migration.md`, `02-taxonomy-admin.md`
> Primary actors: Admin, Developer

Trait metadata is the configuration layer that drives the entire consumer UI. Each of the 41 rows in `trait_metadata` tells the consumer app how to render a trait (via `displayConfig`) and how to let users edit it (via `editConfig`). Today this configuration lives in seed data. This spec makes the admin-safe properties -- display names, ordering, flags, category assignment, and completeness weights -- editable through the admin control plane, while keeping developer-owned structural configs (display/edit configs, data types, keys) read-only with clear visual boundaries. It also introduces a guided wizard for admins to add simple trait types that don't require new React components.

---

## 1. Trait Metadata List

### Overview

The trait metadata list is the admin's central view of every trait type in the system. It shows all 41 rows grouped by category (Foundations, Capabilities, Direction, Offerings, Commerce) with columns for the admin-editable fields and read-only indicators on developer-owned fields. Admins can filter by category and search by key or display name.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Trait Metadata                                                 [+ Add Trait Type] │
│ 41 trait types across 5 categories                                                │
│                                                                                   │
│ Filter: [All Categories v]     Search: [__________________ 🔍]                   │
│                                                                                   │
│ ── Foundations (3 traits) ─────────────────────────────────────────────────────── │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │  Key 🔒         Display Name     Data Type 🔒   Order  Searchable Endorsable │ │
│ │ ─────────────── ──────────────── ──────────────  ─────  ────────── ────────── │ │
│ │  headline       Headline         string          1      ✓          ·          │ │
│ │  location       Location         string          2      ✓          ·          │ │
│ │  languages      Languages        string_array    3      ✓          ·          │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│ ── Capabilities (5 traits) ───────────────────────────────────────────────────── │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │  Key 🔒         Display Name     Data Type 🔒   Order  Searchable Endorsable │ │
│ │ ─────────────── ──────────────── ──────────────  ─────  ────────── ────────── │ │
│ │  skills         Skills           array_of_objects  1    ✓          ✓          │ │
│ │  qualities      Qualities        string_array      2    ✓          ✓          │ │
│ │  experience     Experience       array_of_objects   3   ✓          ✓          │ │
│ │  education      Education        array_of_objects   4   ✓          ✓          │ │
│ │  certifications Certifications   array_of_objects   5   ✓          ✓          │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│ ── Direction (4 traits) ──────────────────────────────────────────────────────── │
│ │  ... │                                                                         │
│                                                                                   │
│ ── Offerings (1 trait) ───────────────────────────────────────────────────────── │
│ │  ... │                                                                         │
│                                                                                   │
│ ── Commerce (28 traits) ──────────────────────────────────────────────────────── │
│ │  ... (grouped by groupKey: commerce-foundations, commerce-shipping, etc.) │     │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│ 🔒 = Developer-owned (read-only). Click any row to edit admin-safe properties.    │
└─────────────────────────────────────────────────────────────────────────────────┘

Category filter applied (Commerce selected):
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Filter: [Commerce v]                                                             │
│                                                                                   │
│ ── commerce-foundations (4 traits) ───────────────────────────────────────────── │
│ │  commerceLocale      Locale & Currency     object    1   ·   ·                │ │
│ │  commerceTimezone    Timezone              string    2   ·   ·                │ │
│ │  verifiedAgeBracket  Age Verification      string    3   ·   ·                │ │
│ │  verifiedLocationZone Location Zone        string    4   ·   ·                │ │
│                                                                                   │
│ ── commerce-shipping (2 traits) ──────────────────────────────────────────────── │
│ │  ...                                                                           │ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/page.tsx          <- Server Component (data fetching)
  └─ components/trait-metadata-list.tsx                  <- Client Component ("use client")
       ├─ components/trait-metadata-table.tsx            <- Table per category group
       │    ├─ components/ui/table.tsx                   <- shadcn/ui
       │    └─ components/ui/badge.tsx                   <- shadcn/ui (lock icon badges)
       ├─ components/ui/select.tsx                       <- Category filter
       ├─ components/ui/input.tsx                        <- Search
       └─ calls: apps/admin/app/actions/trait-metadata.ts
            └─ reads: packages/db/src/schema/traits.ts -> traitMetadata table
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | Admin can view all trait metadata rows grouped by category on the trait metadata list page | Fetches all rows, groups by `category`, sub-groups commerce by `groupKey`. Shows key, displayName, dataType, displayOrder, isSearchable, isEndorsable. |
| 1.2 | Admin can filter trait metadata by category on the list page | Dropdown: All / Foundations / Capabilities / Direction / Offerings / Commerce. Commerce sub-groups by `groupKey`. URL param `?category=commerce`. |
| 1.3 | Admin can search trait metadata by key or display name on the list page | Client-side text filter across `key` and `displayName`. Debounced 200ms. Highlights matching text. |
| 1.4 | Admin can see lock icons on developer-owned columns to distinguish editable from read-only fields | `key` and `dataType` columns show a lock icon. Column headers include a lock indicator. Footer legend explains the icon. |

### Server Actions

```typescript
// NEW: apps/admin/app/actions/trait-metadata.ts

// Admin required. Returns all trait_metadata rows ordered by category, groupKey, displayOrder.
listTraitMetadata(filters?: { category?: string }): Promise<TraitMetadataRow[]>
```

### Edge Cases

- [ ] No trait metadata rows (empty table): show "No trait metadata found. Run the seed script to initialize."
- [ ] Commerce category has 28 rows: sub-group by `groupKey` to keep sections scannable
- [ ] Search term matches no rows: show "No results for [query]" with clear button
- [ ] Admin navigates directly to `/trait-metadata?category=invalid`: treat as "All"

---

## 2. Edit Admin-Safe Properties

### Overview

Admin can edit the six admin-safe properties on any trait metadata row: `displayName`, `displayOrder`, `category`, `groupKey`, `isSearchable`, and `isEndorsable`. Changes take effect immediately after save (cache invalidated in the consumer app). Every change is recorded in the `admin_audit_log` table with before/after values.

### Wireframe

```
Clicking a row on the list opens the edit panel:

┌─────────────────────────────────────────────────────────────────────────────────┐
│ Edit Trait: skills                                               [Back to List] │
│                                                                                  │
│ ┌── Developer-Owned (read-only) ──────────────────────────────────────────────┐ │
│ │  Key:        skills                                                🔒       │ │
│ │  Data Type:  array_of_objects                                      🔒       │ │
│ │  Display Config: { type: "tag_list", showField: "name", ... }      🔒 [View]│ │
│ │  Edit Config:   { type: "multi_item_form", fields: [...] }         🔒 [View]│ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌── Admin-Editable ───────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │  Display Name *     [Skills                                    ]             │ │
│ │  Category *         [capabilities              v]                            │ │
│ │  Group Key          [capabilities                              ]             │ │
│ │  Display Order *    [1     ]                                                 │ │
│ │                                                                              │ │
│ │  [x] Searchable    Include in search embeddings and discovery                │ │
│ │  [x] Endorsable    Other users can endorse this trait                        │ │
│ │                                                                              │ │
│ │  Completeness Weight   [20    ] / 100                                        │ │
│ │  (Currently unweighted traits: 15 points unallocated)                        │ │
│ │                                                                              │ │
│ │  [Save Changes]   [Cancel]                                                   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌── Audit History ────────────────────────────────────────────────────────────┐ │
│ │  2026-02-24 14:30  admin@personus.ai  displayName: "Skill" → "Skills"      │ │
│ │  2026-02-23 09:15  admin@personus.ai  isEndorsable: false → true           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/[id]/page.tsx        <- Server Component
  └─ components/trait-metadata-edit-form.tsx                <- Client Component ("use client")
       ├─ components/developer-owned-display.tsx            <- Read-only card with lock styling
       ├─ components/admin-editable-form.tsx                <- Form with admin-safe fields
       │    ├─ components/ui/input.tsx                      <- shadcn/ui
       │    ├─ components/ui/select.tsx                     <- Category dropdown
       │    ├─ components/ui/checkbox.tsx                   <- isSearchable, isEndorsable
       │    └─ components/ui/label.tsx                      <- shadcn/ui
       ├─ components/audit-log-timeline.tsx                 <- Recent changes for this row
       └─ calls: apps/admin/app/actions/trait-metadata.ts
            ├─ reads: packages/db/src/schema/traits.ts -> traitMetadata table
            └─ writes: admin_audit_log table
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | Admin can edit displayName for any trait metadata row | Text input, required, max 100 chars. Validated with Zod. |
| 2.2 | Admin can change category and groupKey for any trait metadata row | Category dropdown: foundations, capabilities, direction, offerings, commerce. GroupKey is free text (suggests existing groupKeys via combobox). |
| 2.3 | Admin can toggle isSearchable and isEndorsable flags for any trait | Checkboxes with descriptive labels. Changes affect embedding generation and endorsement eligibility. |
| 2.4 | Admin can change displayOrder for any trait within its category | Integer input. Validated non-negative. Reordering within a category is also covered by drag-reorder (section 3). |
| 2.5 | System logs every admin edit to the audit log with before/after values | Uses `admin_audit_log` table (from spec 02). Records `entityType: 'trait_metadata'`, `entityId`, `field`, `oldValue`, `newValue`, `adminId`, `timestamp`. |
| 2.6 | Admin can view recent audit history for a specific trait metadata row | Inline audit timeline below the edit form. Shows last 10 changes. Filterable by date. |
| 2.7 | System invalidates consumer app cache after trait metadata changes | Calls cache invalidation after save. Consumer app's `unstable_cache` for `getTraitMetadata()` is revalidated. |

### Server Actions

```typescript
// NEW: apps/admin/app/actions/trait-metadata.ts

// Admin required. Returns a single trait_metadata row with audit history.
getTraitMetadataById(id: string): Promise<{
  metadata: TraitMetadataRow;
  auditLog: AuditLogEntry[];
}>

// Admin required. Updates admin-safe properties only.
// Validates that only permitted fields are changed.
// Logs diff to admin_audit_log. Invalidates consumer cache.
updateTraitMetadata(id: string, data: {
  displayName?: string;
  category?: string;
  groupKey?: string;
  displayOrder?: number;
  isSearchable?: boolean;
  isEndorsable?: boolean;
  completenessWeight?: number | null;
}): Promise<TraitMetadataRow>
```

### Validation

```typescript
// NEW: packages/validations/src/trait-metadata-admin.ts

import { z } from 'zod';

const TRAIT_CATEGORIES = ['foundations', 'capabilities', 'direction', 'offerings', 'commerce'] as const;

export const updateTraitMetadataSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100).optional(),
  category: z.enum(TRAIT_CATEGORIES).optional(),
  groupKey: z.string().max(100).optional().nullable(),
  displayOrder: z.number().int().min(0, 'Display order must be non-negative').optional(),
  isSearchable: z.boolean().optional(),
  isEndorsable: z.boolean().optional(),
  completenessWeight: z.number().int().min(0).max(100).optional().nullable(),
});

export type UpdateTraitMetadataInput = z.infer<typeof updateTraitMetadataSchema>;
```

### Edge Cases

- [ ] Admin tries to edit `key`, `dataType`, `displayConfig`, or `editConfig`: server action rejects with 403 -- these are developer-owned
- [ ] Admin sets displayOrder to same value as another trait in the category: allowed -- shared positions render in insertion order
- [ ] Admin changes category from `capabilities` to `commerce`: allowed -- row moves to new category group on list page
- [ ] Admin clears displayName: Zod rejects with "Display name is required"
- [ ] Consumer cache invalidation fails: log error but don't block the save -- consumer will pick up changes on next cache expiry
- [ ] Two admins edit the same row concurrently: last write wins, both changes are audit logged
- [ ] Admin removes groupKey (sets to null): trait renders under category heading directly without sub-group

---

## 3. Reorder Traits Within Category

### Overview

Admin can drag traits to reorder them within a category, updating `displayOrder` values in bulk. This is a more intuitive alternative to manually editing displayOrder numbers. The reorder operation saves all affected rows in a single transaction and logs the batch change.

### Wireframe

```
Reorder mode (toggled via button):

┌─────────────────────────────────────────────────────────────────────────────────┐
│ Trait Metadata                                    [Reorder Mode: ON]  [Save Order] │
│                                                                                     │
│ ── Capabilities ──────────────────────────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │  ⠿ skills          Skills              1                                        │ │
│ │  ⠿ qualities       Qualities           2   ← ─ ─ dragging ─ ─ ─ ┐             │ │
│ │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   ← drop target line  │             │ │
│ │  ⠿ experience      Experience          3                         │             │ │
│ │  ⠿ education       Education           4                                        │ │
│ │  ⠿ certifications  Certifications      5                                        │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Save Order]  [Cancel Reorder]                                                      │
│                                                                                     │
│ Changes preview:                                                                    │
│   skills: 1 → 1 (unchanged)                                                        │
│   qualities: 2 → 3                                                                  │
│   experience: 3 → 2                                                                 │
│   education: 4 → 4 (unchanged)                                                     │
│   certifications: 5 → 5 (unchanged)                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/page.tsx
  └─ components/trait-metadata-list.tsx
       └─ components/trait-metadata-reorder.tsx          <- Client Component ("use client")
            ├─ @dnd-kit/core                             <- Drag-and-drop library
            ├─ @dnd-kit/sortable                         <- Sortable preset
            ├─ components/reorder-preview.tsx             <- Shows before/after displayOrder
            └─ calls: apps/admin/app/actions/trait-metadata.ts -> reorderTraitMetadata()
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | Admin can enter reorder mode to drag traits within a category | Toggle button. Drag handles appear on each row. Rows become draggable within their category group only. |
| 3.2 | Admin can see a preview of displayOrder changes before saving | Below the list, shows which rows changed: `key: oldOrder -> newOrder`. Unchanged rows marked. |
| 3.3 | Admin can save reordered traits in a single bulk operation | Single transaction updates all affected `displayOrder` values. Audit log records the batch change. Cache invalidated. |
| 3.4 | Admin can cancel reorder to restore original positions | Cancel button reverts to saved state. No audit log entry. |

### Server Actions

```typescript
// NEW: apps/admin/app/actions/trait-metadata.ts

// Admin required. Bulk updates displayOrder for multiple trait metadata rows.
// All updates in a single transaction. Logs batch to admin_audit_log.
// Invalidates consumer cache.
reorderTraitMetadata(
  updates: Array<{ id: string; displayOrder: number }>
): Promise<{ updated: number }>
```

### Edge Cases

- [ ] Admin drags a trait across category boundaries: not allowed -- drag is constrained within category
- [ ] Admin reorders and navigates away without saving: changes lost, no audit log
- [ ] Admin reorders commerce traits within a groupKey sub-group: order is within the full category, not sub-group -- rows from different groupKeys can interleave
- [ ] Only one trait in a category: reorder mode available but no drag targets
- [ ] Concurrent reorder by two admins in same category: last save wins -- both audit logged

---

## 4. Completeness Weight Management

### Overview

Completeness scoring currently uses 9 hardcoded trait keys with fixed point values (max 100) in `lib/personas/completeness.ts`. This section moves weights to the `trait_metadata` table via a new `completenessWeight` column, letting admins tune which traits matter most for persona completeness without code changes. Only traits with a non-null weight contribute to the score. The admin UI shows the current weight distribution and validates that total weights across all weighted traits sum to 100.

### Wireframe

```
Weight management (inline on the list page or as a dedicated view):

┌─────────────────────────────────────────────────────────────────────────────────┐
│ Completeness Weights                                              [Save Weights] │
│                                                                                   │
│ Total: 100 / 100 ✓                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────────┐   │
│ │ ████████████████████████████████████████████████████████████████████████████│   │
│ │ headline(15)  skills(20)  qual(10) val(8) seek(8) off(12) foc(7) loc(10)  │   │
│ │                                                                   cp(10)  │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│ ┌─── Weighted Traits ─────────────────────────────────────────────────────────┐   │
│ │  Trait               Category        Weight    Bar                          │   │
│ │ ──────────────────── ────────────── ────────── ──────────────────────────── │   │
│ │  headline            foundations     [15    ]   ███████████████              │   │
│ │  skills              capabilities   [20    ]   ████████████████████          │   │
│ │  qualities           capabilities   [10    ]   ██████████                    │   │
│ │  values              direction      [ 8    ]   ████████                      │   │
│ │  seekingOpportunities direction     [ 8    ]   ████████                      │   │
│ │  offerings           offerings      [12    ]   ████████████                  │   │
│ │  focusAreas          direction      [ 7    ]   ███████                       │   │
│ │  location            foundations    [10    ]   ██████████                    │   │
│ │  contactPreferences  (computed)     [10    ]   ██████████                    │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│ ┌─── Unweighted Traits (32) ──────────────────────────────────────────────────┐   │
│ │  languages, experience, education, certifications, interests,               │   │
│ │  commerceLocale, commerceTimezone, ... (collapsed)                          │   │
│ │                                                                              │   │
│ │  To add a trait to completeness scoring, set its weight above.              │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│ Warning: Total must equal 100. Current: 100 ✓                                    │
│ [Save Weights]  [Reset to Defaults]                                               │
└─────────────────────────────────────────────────────────────────────────────────┘

Validation error state:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Total: 85 / 100 ✗  (15 points unallocated)                                      │
│                                                                                   │
│ ⚠ Weights must sum to exactly 100. Adjust values before saving.                  │
│ [Save Weights] (disabled)                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/weights/page.tsx      <- Server Component
  └─ components/completeness-weights-editor.tsx              <- Client Component ("use client")
       ├─ components/weight-distribution-bar.tsx             <- Stacked bar visualization
       ├─ components/weight-row.tsx                          <- Per-trait weight input
       │    ├─ components/ui/input.tsx                       <- Number input
       │    └─ components/ui/progress.tsx                    <- Individual bar
       └─ calls: apps/admin/app/actions/trait-metadata.ts
            └─ reads/writes: trait_metadata.completenessWeight
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | Admin can view the current completeness weight distribution as a stacked bar chart | Visual representation. Color-coded by category. Shows trait key + weight as labels. |
| 4.2 | Admin can set completenessWeight (0-100) for any trait metadata row | Number input per trait. Null means not scored. Changing a weight updates the running total in real time. |
| 4.3 | System validates that total weights across all weighted traits sum to exactly 100 | Client-side running total. Save button disabled if total is not 100. Error message shows the delta. |
| 4.4 | Admin can reset weights to default values matching the current hardcoded scoring | "Reset to Defaults" button populates headline(15), skills(20), qualities(10), values(8), seekingOpportunities(8), offerings(12), focusAreas(7), location(10), contactPreferences(10). |
| 4.5 | System migrates completeness scoring from hardcoded to metadata-driven | Consumer app's `calculateCompleteness()` reads weights from `trait_metadata.completenessWeight` instead of the `MAX_SCORES` constant. Falls back to hardcoded if no weights in DB. |
| 4.6 | Admin can save updated weights with audit logging | Bulk save in a single transaction. Each changed weight logged to `admin_audit_log`. Consumer cache invalidated. |

### Schema

```typescript
// MODIFICATION: packages/db/src/schema/traits.ts
// Adds completenessWeight column to traitMetadata table

// Add to traitMetadata table definition:
completenessWeight: integer('completeness_weight'),
// Nullable. Null = this trait does not contribute to completeness scoring.
// Value 0-100, representing the maximum points this trait contributes.
// Sum of all non-null completenessWeight values should equal 100.
```

### Server Actions

```typescript
// NEW: apps/admin/app/actions/trait-metadata.ts

// Admin required. Returns all traits with completenessWeight info.
getCompletenessWeights(): Promise<Array<{
  id: string;
  key: string;
  displayName: string;
  category: string;
  completenessWeight: number | null;
}>>

// Admin required. Bulk updates completenessWeight for multiple rows.
// Validates that non-null weights sum to 100.
// Logs each change to admin_audit_log. Invalidates consumer cache.
updateCompletenessWeights(
  weights: Array<{ id: string; completenessWeight: number | null }>
): Promise<{ updated: number }>
```

### Validation

```typescript
// NEW: packages/validations/src/completeness-weights.ts

import { z } from 'zod';

export const completenessWeightEntrySchema = z.object({
  id: z.string().uuid(),
  completenessWeight: z.number().int().min(0).max(100).nullable(),
});

export const updateCompletenessWeightsSchema = z.object({
  weights: z.array(completenessWeightEntrySchema).refine(
    (entries) => {
      const total = entries
        .filter((e) => e.completenessWeight !== null)
        .reduce((sum, e) => sum + (e.completenessWeight ?? 0), 0);
      return total === 100;
    },
    { message: 'Weights must sum to exactly 100' }
  ),
});
```

### Edge Cases

- [ ] No traits have completenessWeight set (fresh migration): consumer app falls back to hardcoded `MAX_SCORES`
- [ ] Admin sets all weights to null: completeness scoring disabled -- all personas score 0 -- show a warning before save
- [ ] Admin enters weight of 0 for a trait: valid -- the trait is scored but contributes 0 points (effectively ignored but still listed as weighted)
- [ ] Admin adds a new weighted trait but forgets to reduce others: total exceeds 100, save blocked
- [ ] `contactPreferences` is not a trait_metadata row (it's a column on persona): handle as a special case -- either add a synthetic metadata row or keep hardcoded in the consumer scoring function
- [ ] Admin changes weights while users are active: new weights apply to the next completeness recalculation, not retroactively to cached scores

### Migration Notes

**Schema change:** Adds `completeness_weight` integer column (nullable) to `trait_metadata` table. This is an additive, non-breaking change.

```sql
ALTER TABLE trait_metadata ADD COLUMN completeness_weight INTEGER;
```

**Backfill:** After migration, run a one-time update to set initial weights matching the current hardcoded values:

```sql
UPDATE trait_metadata SET completeness_weight = 15 WHERE key = 'headline';
UPDATE trait_metadata SET completeness_weight = 20 WHERE key = 'skills';
UPDATE trait_metadata SET completeness_weight = 10 WHERE key = 'qualities';
UPDATE trait_metadata SET completeness_weight = 8  WHERE key = 'values';
UPDATE trait_metadata SET completeness_weight = 8  WHERE key = 'seekingOpportunities';
UPDATE trait_metadata SET completeness_weight = 12 WHERE key = 'offerings';
UPDATE trait_metadata SET completeness_weight = 7  WHERE key = 'focusAreas';
UPDATE trait_metadata SET completeness_weight = 10 WHERE key = 'location';
-- contactPreferences: handled as special case in scoring function (10 points)
-- All other traits: remain NULL (not scored)
```

**Consumer code change:** `lib/personas/completeness.ts` refactored to read weights from DB. New function signature:

```typescript
// Before: calculateCompleteness(persona: Persona)
// After:  calculateCompleteness(persona: Persona, weights?: Map<string, number>)
// If weights is undefined, fall back to hardcoded MAX_SCORES for backwards compatibility.
```

---

## 5. Developer-Owned Config Viewer

### Overview

Admin can view (but never edit) the `displayConfig` and `editConfig` JSONB for any trait. This read-only viewer helps admins understand what each trait does -- which React component renders it, what fields the editor shows, which taxonomies are connected -- without needing access to the codebase. The JSON is formatted, syntax-highlighted, and annotated with descriptions of known config keys.

### Wireframe

```
View button on the edit page opens a modal:

┌─────────────────────────────────────────────────────────────────────────────────┐
│ Display Configuration: skills                                          [Close] │
│                                                                                 │
│ 🔒 This configuration is developer-owned and cannot be edited here.            │
│ Contact the engineering team to make structural changes.                        │
│                                                                                 │
│ ┌─── displayConfig ─────────────────────────────────────────────────────────┐  │
│ │  {                                                                         │  │
│ │    "type": "tag_list",        // Renders as: TagListDisplay               │  │
│ │    "showField": "name",       // Shows this field on each tag             │  │
│ │    "badgeColor": "blue"       // Badge color: blue-50/blue-700            │  │
│ │  }                                                                         │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─── editConfig ────────────────────────────────────────────────────────────┐  │
│ │  {                                                                         │  │
│ │    "type": "multi_item_form", // Renders as: MultiItemFormEditor          │  │
│ │    "addButtonText": "Add Skill",                                           │  │
│ │    "fields": [                                                             │  │
│ │      {                                                                     │  │
│ │        "key": "name",                                                      │  │
│ │        "label": "Skill",                                                   │  │
│ │        "type": "text_with_suggestions",                                    │  │
│ │        "placeholder": "e.g., Python",                                      │  │
│ │        "taxonomySlug": "skills"   // → trait_taxonomies: 17 categories    │  │
│ │      },                                                                    │  │
│ │      {                                                                     │  │
│ │        "key": "proficiency",                                               │  │
│ │        "label": "Proficiency",                                             │  │
│ │        "type": "select",                                                   │  │
│ │        "options": ["beginner", "intermediate", "advanced", "expert"],       │  │
│ │        "optional": true                                                    │  │
│ │      }                                                                     │  │
│ │    ]                                                                        │  │
│ │  }                                                                         │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ Related Components:                                                             │
│   Display: components/trait-displays.tsx -> TagListDisplay                      │
│   Editor:  components/trait-editors.tsx -> MultiItemFormEditor                  │
│   Taxonomy: 17 categories, ~650 values (skills-technology, skills-business...)  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/[id]/page.tsx
  └─ components/trait-metadata-edit-form.tsx
       └─ components/config-viewer-modal.tsx             <- Client Component ("use client")
            ├─ components/ui/dialog.tsx                   <- shadcn/ui
            ├─ components/json-viewer.tsx                 <- Formatted JSON with annotations
            └─ components/component-reference.tsx         <- Maps config.type to component name
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | Admin can view displayConfig as formatted, annotated JSON in a read-only modal | [View] button on the edit page. Modal shows formatted JSON with inline comments explaining each key. Lock icon and "developer-owned" banner. |
| 5.2 | Admin can view editConfig as formatted, annotated JSON in a read-only modal | Same modal pattern. Shows field definitions, taxonomy connections, options arrays. |
| 5.3 | Admin can see which React components render and edit this trait | "Related Components" section maps `displayConfig.type` to component name (e.g., `tag_list` -> `TagListDisplay`). Same for `editConfig.type`. Static mapping, not dynamic import. |
| 5.4 | Admin can see taxonomy connection summary for traits with taxonomy-backed fields | If any field in editConfig has `taxonomySlug`, show the taxonomy slug, category count, and total value count. Links to taxonomy admin for that slug. |

### Edge Cases

- [ ] displayConfig or editConfig is malformed JSON: show raw string with a warning "Could not parse configuration"
- [ ] Config references a display/edit type not in the known mapping: show the raw type string with "Unknown component type"
- [ ] Commerce trait with `privacyTier` in displayConfig: annotate with the privacy tier description

---

## 6. Add Simple Trait Type

### Overview

Admin can add a new trait metadata row for simple types that use existing display and edit components. Simple types are defined as traits that use `pill_list` or `prose` for display and `tag_input`, `text_with_suggestions`, or `select` for editing. Complex types that require `multi_item_form`, `structured_form`, `timeline`, `card_list`, or `table` need developer intervention because they involve structured data schemas and field definitions. The wizard guides the admin through choosing compatible display/edit combinations and prevents invalid configurations.

### Wireframe

```
Add Trait Type wizard (3 steps):

Step 1: Basics
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Add Trait Type                                                   Step 1 of 3    │
│                                                                                  │
│ Key *              [new_trait_key              ]                                  │
│                    Unique identifier (camelCase, no spaces)                      │
│                                                                                  │
│ Display Name *     [My New Trait               ]                                 │
│                                                                                  │
│ Description        [Optional description of what this trait represents]          │
│                                                                                  │
│ Category *         [direction                v]                                  │
│                                                                                  │
│ Group Key          [direction                  ]  (defaults to category)         │
│                                                                                  │
│                                                       [Cancel]  [Next →]         │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 2: Display & Edit Configuration
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Add Trait Type                                                   Step 2 of 3    │
│                                                                                  │
│ Data Type *        [string_array             v]                                  │
│                    Determines what kind of data this trait stores.               │
│                                                                                  │
│ Compatible display types for string_array:                                       │
│   (●) pill_list      Colored badges in a row                                    │
│   ( ) prose          Not compatible with string_array                            │
│                                                                                  │
│ Display Options:                                                                 │
│   Badge Color      [teal                     v]                                  │
│                    Preview: ┌──────┐ ┌──────┐                                   │
│                             │ Teal │ │ Teal │                                   │
│                             └──────┘ └──────┘                                   │
│                                                                                  │
│ Compatible edit types for string_array:                                          │
│   (●) tag_input      Type and press Enter to add tags                           │
│   ( ) select         Single selection from predefined options                   │
│                                                                                  │
│ Edit Options:                                                                    │
│   Placeholder      [Type a value...           ]                                  │
│                                                                                  │
│ ⚠ Need multi_item_form, structured_form, timeline, card_list, or table?         │
│   These require developer intervention. Contact engineering.                     │
│                                                                                  │
│                                              [← Back]  [Cancel]  [Next →]        │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 3: Flags & Review
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Add Trait Type                                                   Step 3 of 3    │
│                                                                                  │
│ [x] Searchable     Include in search embeddings                                 │
│ [ ] Endorsable     Other users can endorse this trait                           │
│                                                                                  │
│ Display Order      [5     ]  (position within "direction" category)             │
│                                                                                  │
│ ── Review ────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│ Key:            new_trait_key                                                    │
│ Display Name:   My New Trait                                                     │
│ Category:       direction                                                        │
│ Data Type:      string_array                                                     │
│ Display:        pill_list (teal)                                                 │
│ Edit:           tag_input ("Type a value...")                                    │
│ Searchable:     Yes                                                              │
│ Endorsable:     No                                                               │
│                                                                                  │
│                                              [← Back]  [Cancel]  [Create Trait]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/trait-metadata/new/page.tsx        <- Server Component
  └─ components/add-trait-wizard.tsx                       <- Client Component ("use client")
       ├─ components/wizard-step-basics.tsx                <- Step 1: key, name, category
       ├─ components/wizard-step-config.tsx                <- Step 2: data type, display/edit
       │    ├─ components/display-type-picker.tsx          <- Compatible display types
       │    ├─ components/edit-type-picker.tsx             <- Compatible edit types
       │    └─ components/badge-color-preview.tsx          <- Live preview
       ├─ components/wizard-step-review.tsx                <- Step 3: flags, review, confirm
       └─ calls: apps/admin/app/actions/trait-metadata.ts -> createTraitMetadata()
```

### Compatibility Matrix

The wizard enforces these compatibility rules:

| Data Type | Allowed Display Types | Allowed Edit Types |
|-----------|----------------------|-------------------|
| `string` | `prose` | `text_with_suggestions`, `select` |
| `string_array` | `pill_list` | `tag_input` |

Complex data types (`array_of_objects`, `object`) require developer intervention and are not available in the admin wizard.

| Data Type | Requires Developer | Why |
|-----------|-------------------|-----|
| `array_of_objects` | Yes | Needs `fields[]` definition in editConfig, `showField` in displayConfig, and potentially a TypeScript interface + Zod schema |
| `object` | Yes | Needs `fields[]` definition in editConfig for structured_form |

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 6.1 | Admin can start the add-trait wizard from the trait metadata list page | [+ Add Trait Type] button. Opens 3-step wizard. |
| 6.2 | Admin can enter key, display name, description, category, and group key in wizard step 1 | Key validated: camelCase, unique, 1-50 chars. Display name required. Category from dropdown. Group key defaults to category. |
| 6.3 | Admin can select a compatible display/edit type based on data type in wizard step 2 | Data type dropdown shows only `string` and `string_array`. Compatible display/edit types auto-filter. Badge color picker for `pill_list`. Placeholder input for `tag_input`/`text_with_suggestions`. Options list for `select`. |
| 6.4 | Admin can set flags, review, and confirm the new trait in wizard step 3 | isSearchable, isEndorsable checkboxes. displayOrder input. Full review summary. "Create Trait" button. |
| 6.5 | System prevents admin from creating traits that require developer intervention | `array_of_objects` and `object` data types not in the dropdown. Warning message with explanation. Link to developer docs/contact. |
| 6.6 | System validates the new trait key is unique before creation | Async validation on blur in step 1. If key exists, show "This key is already in use" error. |
| 6.7 | Admin can see complex type creation guidance when the wizard's simple types are insufficient | Info banner: "Need structured data (timelines, card lists, forms)? These require developer setup." Links to the trait extension guide in docs. |

### Server Actions

```typescript
// NEW: apps/admin/app/actions/trait-metadata.ts

// Admin required. Creates a new trait_metadata row.
// Only allows simple types (string, string_array).
// Validates key uniqueness. Logs to admin_audit_log.
// Invalidates consumer cache.
createTraitMetadata(data: {
  key: string;
  displayName: string;
  description?: string;
  category: string;
  groupKey?: string;
  dataType: 'string' | 'string_array';
  displayConfig: { type: 'prose' } | { type: 'pill_list'; badgeColor?: string };
  editConfig:
    | { type: 'tag_input'; placeholder?: string }
    | { type: 'text_with_suggestions'; placeholder?: string }
    | { type: 'select'; options: string[] };
  displayOrder: number;
  isSearchable: boolean;
  isEndorsable: boolean;
}): Promise<TraitMetadataRow>

// Admin required. Checks if a trait key already exists.
checkTraitKeyUnique(key: string): Promise<{ unique: boolean }>
```

### Validation

```typescript
// NEW: packages/validations/src/trait-metadata-admin.ts (extends existing file)

const SIMPLE_DATA_TYPES = ['string', 'string_array'] as const;
const SIMPLE_DISPLAY_TYPES = ['prose', 'pill_list'] as const;
const SIMPLE_EDIT_TYPES = ['tag_input', 'text_with_suggestions', 'select'] as const;
const BADGE_COLORS = ['blue', 'green', 'orange', 'purple', 'teal'] as const;

export const createTraitMetadataSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(50, 'Key must be 50 characters or fewer')
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'Key must be camelCase (start lowercase, no spaces/special chars)'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(TRAIT_CATEGORIES),
  groupKey: z.string().max(100).optional(),
  dataType: z.enum(SIMPLE_DATA_TYPES),
  displayConfig: z.discriminatedUnion('type', [
    z.object({ type: z.literal('prose') }),
    z.object({ type: z.literal('pill_list'), badgeColor: z.enum(BADGE_COLORS).optional() }),
  ]),
  editConfig: z.discriminatedUnion('type', [
    z.object({ type: z.literal('tag_input'), placeholder: z.string().max(200).optional() }),
    z.object({ type: z.literal('text_with_suggestions'), placeholder: z.string().max(200).optional() }),
    z.object({ type: z.literal('select'), options: z.array(z.string().min(1)).min(1, 'At least one option required') }),
  ]),
  displayOrder: z.number().int().min(0),
  isSearchable: z.boolean(),
  isEndorsable: z.boolean(),
});
```

### Edge Cases

- [ ] Admin creates a trait with key that matches a reserved JavaScript keyword: regex validation rejects since keywords are lowercase-only and would conflict with JSONB parsing
- [ ] Admin creates a `string_array` trait with `prose` display: wizard prevents this -- pill_list is the only compatible display for string_array
- [ ] Admin creates a `string` trait with `tag_input` edit: wizard prevents this -- tag_input produces string[] which is incompatible with string data type
- [ ] Admin enters a key with spaces or uppercase start: Zod regex rejects with camelCase guidance
- [ ] Admin creates a `select` edit type with empty options array: Zod rejects with "At least one option required"
- [ ] Admin creates a trait and the Traits TypeScript interface does not include it: the consumer app stores the value in the JSONB `traits` column regardless -- the TypeScript interface is only for type safety during development, not runtime enforcement
- [ ] Admin creates a trait with same key as a deleted/removed trait: key uniqueness check still blocks this -- keys are never soft-deleted from metadata

---

## Schema

```typescript
// MODIFICATION: packages/db/src/schema/traits.ts
// Adds completenessWeight column to traitMetadata table

export const traitMetadata = pgTable('trait_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  groupKey: text('group_key'),
  dataType: text('data_type').notNull(),
  itemSchema: jsonb('item_schema'),
  displayConfig: jsonb('display_config').notNull(),
  editConfig: jsonb('edit_config').notNull(),
  isSearchable: boolean('is_searchable').default(true),
  isEndorsable: boolean('is_endorsable').default(false),
  icon: text('icon'),
  displayOrder: integer('display_order'),
  completenessWeight: integer('completeness_weight'),  // NEW — nullable, 0-100
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// REUSES: admin_audit_log table from spec 02-taxonomy-admin.md
// Schema defined there. entityType values include 'trait_metadata'.
```

## Test Criteria

**Unit tests:**

- `listTraitMetadata()` returns all 41 rows grouped by category then displayOrder
- `listTraitMetadata({ category: 'commerce' })` returns only commerce traits
- `updateTraitMetadata()` updates displayName and logs to audit
- `updateTraitMetadata()` rejects changes to developer-owned fields (key, dataType, displayConfig, editConfig)
- `updateTraitMetadataSchema` rejects empty displayName
- `updateTraitMetadataSchema` rejects negative displayOrder
- `reorderTraitMetadata()` updates multiple displayOrder values in one transaction
- `updateCompletenessWeights()` accepts weights summing to 100
- `updateCompletenessWeights()` rejects weights summing to 85
- `createTraitMetadataSchema` rejects key with spaces
- `createTraitMetadataSchema` rejects key starting with uppercase
- `createTraitMetadataSchema` rejects `string_array` with `prose` display
- `createTraitMetadataSchema` rejects `string` with `tag_input` edit
- `createTraitMetadata()` rejects duplicate key
- `checkTraitKeyUnique()` returns `{ unique: true }` for novel key
- `checkTraitKeyUnique()` returns `{ unique: false }` for existing key
- Compatibility matrix correctly maps data types to allowed display/edit types

**Integration tests:**

- Create a simple trait via wizard, verify it appears in `listTraitMetadata()` result
- Update displayName, verify consumer cache invalidation triggers
- Reorder 3 traits, verify all displayOrder values updated atomically
- Save completeness weights, verify consumer `calculateCompleteness()` uses new weights
- Audit log contains correct before/after for each admin edit

**E2E tests (Playwright):**

- Admin navigates to trait metadata list, verifies all 5 categories displayed
- Admin clicks a trait row, edits displayName, saves, verifies toast and updated list
- Admin enters reorder mode, drags a trait, saves, verifies new order
- Admin opens completeness weights page, adjusts a weight, verifies total validation
- Admin opens the add-trait wizard, creates a string_array trait, verifies it appears in list
- Admin attempts to create trait with existing key, verifies uniqueness error
- Admin views displayConfig modal, verifies formatted JSON shown with lock banner

## Implementation Order

1. **Schema migration: add `completenessWeight` column** to `trait_metadata` table. Run backfill SQL for the 9 currently scored traits. (Stories 4.5)
2. **`listTraitMetadata` server action** with category filter. (Stories 1.1, 1.2)
3. **Trait metadata list page** with grouped table, category filter, search, lock icons. (Stories 1.1, 1.2, 1.3, 1.4) -- requires step 2
4. **`getTraitMetadataById` and `updateTraitMetadata` server actions** with audit logging and cache invalidation. (Stories 2.1-2.5, 2.7)
5. **Trait metadata edit page** with admin-safe form, developer-owned read-only card, audit timeline. (Stories 2.1-2.6) -- requires step 4
6. **Config viewer modal** with formatted JSON, annotations, and component reference. (Stories 5.1-5.4) -- requires step 5
7. **`reorderTraitMetadata` server action** with batch transaction. (Story 3.3)
8. **Reorder UI** with drag-and-drop, preview, bulk save. (Stories 3.1-3.4) -- requires steps 3, 7
9. **`getCompletenessWeights` and `updateCompletenessWeights` server actions** with sum validation. (Stories 4.2, 4.3, 4.6)
10. **Completeness weights page** with stacked bar, weight inputs, total validation, reset. (Stories 4.1-4.4, 4.6) -- requires step 9
11. **Refactor consumer `calculateCompleteness()`** to read weights from DB with hardcoded fallback. (Story 4.5) -- requires steps 1, 9
12. **`createTraitMetadata` and `checkTraitKeyUnique` server actions** with compatibility validation. (Stories 6.2-6.6)
13. **Add-trait wizard** (3-step) with compatibility matrix, preview, and review. (Stories 6.1-6.7) -- requires step 12
14. **Unit tests** for all server actions and validation schemas. -- requires steps 2, 4, 7, 9, 12
15. **Integration tests** for cache invalidation, audit logging, consumer scoring. -- requires steps 4, 11
16. **E2E tests** for all admin workflows. -- requires steps 3, 5, 8, 10, 13

---

## Appendix: Linear Issue Mapping

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Implement trait metadata list with category grouping | `platform-ops`, `trait-metadata` | -- | -- |
| 1.2 | Add category filter to trait metadata list | `platform-ops`, `trait-metadata` | 1.1 | -- |
| 1.3 | Add search by key/display name to trait metadata list | `platform-ops`, `trait-metadata` | 1.1 | -- |
| 1.4 | Add lock icons on developer-owned columns | `platform-ops`, `trait-metadata` | 1.1 | -- |
| 2.1 | Implement displayName editing for trait metadata | `platform-ops`, `trait-metadata`, `editing` | 1.1 | -- |
| 2.2 | Implement category and groupKey editing for trait metadata | `platform-ops`, `trait-metadata`, `editing` | 2.1 | -- |
| 2.3 | Implement isSearchable and isEndorsable flag toggles | `platform-ops`, `trait-metadata`, `editing` | 2.1 | -- |
| 2.4 | Implement displayOrder editing for trait metadata | `platform-ops`, `trait-metadata`, `editing` | 2.1 | -- |
| 2.5 | Log all trait metadata edits to admin audit log | `platform-ops`, `trait-metadata`, `audit` | 2.1 | -- |
| 2.6 | Show audit history timeline on trait metadata edit page | `platform-ops`, `trait-metadata`, `audit` | 2.5 | -- |
| 2.7 | Invalidate consumer cache after trait metadata changes | `platform-ops`, `trait-metadata`, `cache` | 2.1 | -- |
| 3.1 | Implement drag-to-reorder mode for traits within a category | `platform-ops`, `trait-metadata`, `reorder` | 1.1 | -- |
| 3.2 | Show reorder preview with before/after displayOrder values | `platform-ops`, `trait-metadata`, `reorder` | 3.1 | -- |
| 3.3 | Implement bulk displayOrder save with transaction | `platform-ops`, `trait-metadata`, `reorder` | 3.1 | -- |
| 3.4 | Implement cancel reorder to restore original positions | `platform-ops`, `trait-metadata`, `reorder` | 3.1 | -- |
| 4.1 | Implement completeness weight distribution visualization | `platform-ops`, `trait-metadata`, `completeness` | -- | -- |
| 4.2 | Implement per-trait completenessWeight editing | `platform-ops`, `trait-metadata`, `completeness` | 4.1 | -- |
| 4.3 | Validate completeness weights sum to 100 | `platform-ops`, `trait-metadata`, `completeness` | 4.2 | -- |
| 4.4 | Implement reset-to-defaults for completeness weights | `platform-ops`, `trait-metadata`, `completeness` | 4.2 | -- |
| 4.5 | Migrate consumer completeness scoring to metadata-driven weights | `platform-ops`, `trait-metadata`, `completeness`, `consumer` | 4.2 | -- |
| 4.6 | Implement bulk weight save with audit logging | `platform-ops`, `trait-metadata`, `completeness`, `audit` | 4.2 | -- |
| 5.1 | Implement displayConfig read-only viewer modal | `platform-ops`, `trait-metadata`, `viewer` | 1.1 | -- |
| 5.2 | Implement editConfig read-only viewer modal | `platform-ops`, `trait-metadata`, `viewer` | 5.1 | -- |
| 5.3 | Map config types to React component names in viewer | `platform-ops`, `trait-metadata`, `viewer` | 5.1 | -- |
| 5.4 | Show taxonomy connection summary in config viewer | `platform-ops`, `trait-metadata`, `viewer`, `taxonomy` | 5.1 | -- |
| 6.1 | Implement add-trait wizard entry point from list page | `platform-ops`, `trait-metadata`, `creation` | 1.1 | -- |
| 6.2 | Implement wizard step 1: key, name, category, group key | `platform-ops`, `trait-metadata`, `creation` | 6.1 | -- |
| 6.3 | Implement wizard step 2: data type, display/edit config with compatibility | `platform-ops`, `trait-metadata`, `creation` | 6.2 | -- |
| 6.4 | Implement wizard step 3: flags, review, and confirmation | `platform-ops`, `trait-metadata`, `creation` | 6.3 | -- |
| 6.5 | Prevent admin from selecting complex types in wizard | `platform-ops`, `trait-metadata`, `creation` | 6.3 | -- |
| 6.6 | Validate trait key uniqueness asynchronously in wizard | `platform-ops`, `trait-metadata`, `creation` | 6.2 | -- |
| 6.7 | Show complex type guidance banner in wizard | `platform-ops`, `trait-metadata`, `creation` | 6.1 | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `3.2` = feature 3, story 2)
- Issue titles are imperative
- Labels include the spec suite (`platform-ops`) and feature area (`trait-metadata`, `editing`, `completeness`, etc.)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
