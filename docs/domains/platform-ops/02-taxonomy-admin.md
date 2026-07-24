---
type: spec
title: "Platform & Operations -- Taxonomy Administration"
description: "Taxonomies are the suggested-value engine behind every tag input and combobox in the consumer app. The traittaxonomies table currently holds ~62 categories across 14 trait keys with ~1054…"
status: planned
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations -- Taxonomy Administration

> Date: 2026-02-24
> Status: Draft
> Depends on: `00-prd.md`, `01-monorepo-migration.md`
> Primary actors: Admin

Taxonomies are the suggested-value engine behind every tag input and combobox in the consumer app. The `trait_taxonomies` table currently holds ~62 categories across 14 trait keys with ~1054 suggested values, deployed as seed data via code. This spec defines the admin interface for managing taxonomies at runtime -- listing, searching, creating, editing, reordering, bulk importing/exporting, and auditing changes -- so that taxonomy updates no longer require a code deploy.

The admin manages **values** (adding "Rust" to the skills/technology category). The developer owns **structure** (the `trait_taxonomies` table schema, the `TaxonomySuggestionCombobox` component that renders them). See `00-prd.md` section 5 for the full boundary.

---

## 1. Taxonomy List and Search

### Overview

The taxonomy list is the admin's home screen for taxonomy management. It shows every taxonomy category as a row in a data table with trait key, display name, icon, value count, and last-modified timestamp. The admin can filter by trait key (dropdown), search across display names and values, and sort by any column. The data table uses shadcn/ui's DataTable pattern (TanStack Table + shadcn primitives).

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Taxonomies                                                                   │
│                                                                              │
│ ┌─────────────────────────────────────┐  ┌──────────────────┐               │
│ │ 🔍 Search categories or values...   │  │ Trait Key ▼  All │  [+ Category] │
│ └─────────────────────────────────────┘  └──────────────────┘               │
│                                                                              │
│ ┌────┬───────────────┬──────────────────────┬────────┬──────────┬──────────┐│
│ │ #  │ Trait Key      │ Category             │ Icon   │ Values   │ Updated  ││
│ ├────┼───────────────┼──────────────────────┼────────┼──────────┼──────────┤│
│ │  0 │ skills         │ Technology & Software│ 💻     │ 63       │ Feb 17   ││
│ │  1 │ skills         │ Business & Management│ 💼     │ 36       │ Feb 17   ││
│ │  2 │ skills         │ Finance & Accounting │ 📊     │ 24       │ Feb 17   ││
│ │  3 │ skills         │ Marketing & Comms    │ 📣     │ 27       │ Feb 17   ││
│ │  4 │ skills         │ Design & Creative    │ 🎨     │ 41       │ Feb 17   ││
│ │  … │ …              │ …                    │ …      │ …        │ …        ││
│ │ 47 │ interests      │ Arts & Crafts        │ 🎨     │ 16       │ Feb 17   ││
│ │ 48 │ interests      │ Music & Audio        │ 🎵     │ 15       │ Feb 17   ││
│ │ … │ …               │ …                    │ …      │ …        │ …        ││
│ │ 61 │ agentAuth...   │ Delegation Scope     │ 🤖     │ 12       │ Feb 17   ││
│ └────┴───────────────┴──────────────────────┴────────┴──────────┴──────────┘│
│                                                                              │
│ Showing 62 categories across 14 trait keys (1,054 total values)              │
│                                                         [Export All ↓]       │
└──────────────────────────────────────────────────────────────────────────────┘

Search active ("python"):
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐  ┌──────────────────┐               │
│ │ 🔍 python                       ✕   │  │ Trait Key ▼  All │  [+ Category] │
│ └─────────────────────────────────────┘  └──────────────────┘               │
│                                                                              │
│ 1 category matches (value match highlighted)                                 │
│ ┌────┬───────────────┬──────────────────────┬────────┬──────────┬──────────┐│
│ │  0 │ skills         │ Technology & Software│ 💻     │ 63       │ Feb 17   ││
│ │    │                │ Contains: "Python"   │        │          │          ││
│ └────┴───────────────┴──────────────────────┴────────┴──────────┴──────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/taxonomies/page.tsx              -- Server Component (data fetching)
  ├─ apps/admin/components/taxonomy-data-table.tsx       -- Client Component ("use client")
  │    ├─ components/ui/input.tsx                        -- search input (shadcn)
  │    ├─ components/ui/select.tsx                       -- trait key filter (shadcn)
  │    ├─ @tanstack/react-table                          -- column defs, sorting, filtering
  │    └─ components/ui/button.tsx                       -- "+ Category", "Export All"
  └─ calls: apps/admin/app/actions/taxonomies.ts
       └─ listTaxonomies()
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | Admin can view all taxonomy categories in a data table | Columns: displayOrder, traitKey, displayName, icon, value count, updatedAt |
| 1.2 | Admin can filter taxonomy categories by trait key | Dropdown populated from distinct traitKey values |
| 1.3 | Admin can search taxonomy categories by display name or value text | Case-insensitive search across displayName and suggestedValues array |
| 1.4 | Admin can see total category count and total value count | Summary row below the table |
| 1.5 | Admin can sort the data table by any column | Client-side sorting via TanStack Table |
| 1.6 | Admin can click a category row to navigate to the edit view | Row click navigates to `/taxonomies/[id]` |

### Server Actions

```typescript
// apps/admin/app/actions/taxonomies.ts

import { db } from '@personus/db';
import { traitTaxonomies } from '@personus/db/schema';
import { eq, ilike, sql } from 'drizzle-orm';

// Authenticated (admin). Fetches all taxonomy rows with value counts.
listTaxonomies(filters?: {
  traitKey?: string;
  search?: string;
}): Promise<TaxonomyListItem[]>
// where TaxonomyListItem = TraitTaxonomy & { valueCount: number }

// Fetches distinct trait keys for the filter dropdown.
listTraitKeys(): Promise<string[]>
```

### Validation

```typescript
// @personus/validations — taxonomy-admin.ts

import { z } from 'zod';

export const taxonomyListFiltersSchema = z.object({
  traitKey: z.string().optional(),
  search: z.string().max(200).optional(),
});
```

### Edge Cases

- [ ] **Search matches inside suggestedValues array:** Postgres `ANY()` or `array_to_string` for full-text search across the text[] column.
- [ ] **Empty taxonomy table:** Shows "No taxonomies found. Seed data may not be loaded." with link to docs.
- [ ] **Large number of categories (100+):** Paginate at 50 rows, but current data (62 categories) fits on one page.
- [ ] **Trait key with special characters:** traitKey is camelCase by convention; filter dropdown shows the raw value.

### Test Criteria

- `listTaxonomies()` returns all 62 categories with correct value counts
- `listTaxonomies({ traitKey: 'skills' })` returns exactly 17 rows
- `listTaxonomies({ search: 'python' })` returns categories containing "Python" in displayName or suggestedValues
- `listTaxonomies({ search: 'nonexistent' })` returns empty array
- `listTraitKeys()` returns 14 distinct trait keys
- Data table renders all columns and supports client-side sorting
- Row click navigates to category detail page

---

## 2. Taxonomy Category CRUD

### Overview

The category edit page lets the admin modify a single taxonomy category: its display name, description, icon, display order, and its suggested values list. This is the primary editing surface. Creating a new category uses the same form in "create" mode. Deleting a category requires confirmation because it affects the consumer app immediately (values disappear from comboboxes).

### Wireframe

```
Edit view (/taxonomies/[id]):
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Taxonomies                                                         │
│                                                                              │
│ Edit Category                                        [Delete Category]       │
│                                                                              │
│ ┌─ Category Details ───────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │  Trait Key          [skills                    ] (read-only on edit)      │ │
│ │  Taxonomy Slug      [skills-technology         ] (read-only on edit)      │ │
│ │  Display Name       [Technology & Software     ]                          │ │
│ │  Description        [Software development, IT, data, and digital...]     │ │
│ │  Icon               [💻] (emoji picker)                                  │ │
│ │  Display Order      [0 ] (number input)                                  │ │
│ │                                                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ Suggested Values (63) ──────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │  ┌────────────────────────────────────┐  [Add Value]  [Bulk Add]         │ │
│ │  │ 🔍 Filter values...               │                                  │ │
│ │  └────────────────────────────────────┘                                  │ │
│ │                                                                          │ │
│ │  ┌──────────────────────────────────────────────────────────────────┐    │ │
│ │  │  ≡  JavaScript                                            [✕]   │    │ │
│ │  │  ≡  TypeScript                                            [✕]   │    │ │
│ │  │  ≡  Python                                                [✕]   │    │ │
│ │  │  ≡  Java                                                  [✕]   │    │ │
│ │  │  ≡  C#                                                    [✕]   │    │ │
│ │  │  ≡  C++                                                   [✕]   │    │ │
│ │  │  ≡  Go                                                    [✕]   │    │ │
│ │  │  ≡  Rust                                                  [✕]   │    │ │
│ │  │  …  (drag handles ≡ for reorder, ✕ for remove)                  │    │ │
│ │  └──────────────────────────────────────────────────────────────────┘    │ │
│ │                                                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                              [Cancel]  [Save Changes]        │
└──────────────────────────────────────────────────────────────────────────────┘

Create view (/taxonomies/new):
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Taxonomies                                                         │
│                                                                              │
│ New Category                                                                 │
│                                                                              │
│ ┌─ Category Details ───────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │  Trait Key          [▼ Select or type...       ] (required, editable)     │ │
│ │  Taxonomy Slug      [auto-generated from name  ] (editable)              │ │
│ │  Display Name       [                          ] (required)              │ │
│ │  Description        [                          ]                          │ │
│ │  Icon               [  ] (emoji picker)                                  │ │
│ │  Display Order      [  ] (auto: max+1 for trait key)                     │ │
│ │                                                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ Suggested Values ──────────────────────────────────────────────────────┐  │
│ │  No values yet. [Add Value] or [Bulk Add] to get started.               │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│                                              [Cancel]  [Create Category]     │
└──────────────────────────────────────────────────────────────────────────────┘

Delete confirmation dialog:
┌────────────────────────────────────────────────┐
│  Delete "Technology & Software"?               │
│                                                │
│  This category has 63 suggested values.        │
│  Users will no longer see these suggestions    │
│  in the consumer app. Existing user data       │
│  that references these values is NOT affected. │
│                                                │
│  Type the category name to confirm:            │
│  [                                         ]   │
│                                                │
│                       [Cancel]  [Delete]        │
└────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/taxonomies/[id]/page.tsx        -- Server Component (data fetching)
  ├─ apps/admin/components/taxonomy-category-form.tsx   -- Client Component ("use client")
  │    ├─ components/ui/input.tsx                       -- displayName, description, displayOrder
  │    ├─ components/ui/select.tsx                      -- traitKey (create only)
  │    ├─ apps/admin/components/emoji-picker.tsx         -- icon selection
  │    ├─ apps/admin/components/sortable-value-list.tsx  -- drag-and-drop value list
  │    │    ├─ @dnd-kit/core + @dnd-kit/sortable        -- drag-and-drop
  │    │    └─ components/ui/button.tsx                  -- remove (✕)
  │    ├─ apps/admin/components/add-value-dialog.tsx     -- single value add
  │    ├─ apps/admin/components/bulk-add-dialog.tsx      -- bulk value add (see section 3)
  │    └─ components/ui/button.tsx                       -- Save, Cancel, Delete
  ├─ apps/admin/components/delete-category-dialog.tsx   -- confirmation dialog
  │    └─ components/ui/dialog.tsx                      -- shadcn Dialog
  └─ calls: apps/admin/app/actions/taxonomies.ts
       ├─ getTaxonomyById(id)
       ├─ createTaxonomy(data)
       ├─ updateTaxonomy(id, data)
       └─ deleteTaxonomy(id)

apps/admin/app/(admin)/taxonomies/new/page.tsx          -- Server Component (create mode)
  └─ reuses taxonomy-category-form.tsx in create mode
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | Admin can view a taxonomy category's details and values | Read-only fields (traitKey, slug) shown as disabled inputs |
| 2.2 | Admin can edit a category's display name, description, icon, and display order | Form with save/cancel, Zod validation |
| 2.3 | Admin can create a new taxonomy category | traitKey selectable from existing keys or typed as new; slug auto-generated from displayName |
| 2.4 | Admin can delete a taxonomy category with confirmation | Type-to-confirm dialog; cascade: removes category + all values |
| 2.5 | Admin can reorder values within a category via drag-and-drop | Array position in suggestedValues determines order |
| 2.6 | Admin can remove a single value from a category | Removes from suggestedValues array; does NOT affect existing user data |

### Server Actions

```typescript
// apps/admin/app/actions/taxonomies.ts

// Authenticated (admin). Fetches a single taxonomy row by ID.
getTaxonomyById(id: string): Promise<TraitTaxonomy | null>

// Authenticated (admin). Creates a new taxonomy category.
// Validates uniqueness of (traitKey, taxonomySlug).
// Logs to admin_audit_log.
createTaxonomy(data: CreateTaxonomyInput): Promise<TraitTaxonomy>

// Authenticated (admin). Updates an existing taxonomy category.
// traitKey and taxonomySlug are immutable after creation.
// Logs to admin_audit_log with before/after diff.
updateTaxonomy(id: string, data: UpdateTaxonomyInput): Promise<TraitTaxonomy>

// Authenticated (admin). Deletes a taxonomy category.
// Logs to admin_audit_log with full before-state.
deleteTaxonomy(id: string): Promise<void>
```

### Validation

```typescript
// @personus/validations -- taxonomy-admin.ts

export const createTaxonomySchema = z.object({
  traitKey: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Must be camelCase identifier'),
  taxonomySlug: z.string().min(1).max(150).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Must be kebab-case'),
  displayName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  suggestedValues: z.array(z.string().min(1).max(200)).default([]),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateTaxonomySchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  suggestedValues: z.array(z.string().min(1).max(200)).optional(),
  displayOrder: z.number().int().min(0).optional(),
});
```

### Edge Cases

- [ ] **Slug collision:** Creating a category with the same `(traitKey, taxonomySlug)` returns a 409 error with a user-friendly message.
- [ ] **Auto-slug generation:** `displayName` "Technology & Software" becomes `technology-software`. Strip non-alphanumeric, lowercase, hyphenate. Prefix with traitKey: `skills-technology-software`.
- [ ] **Empty suggestedValues array:** Valid -- a category can exist with no values (placeholder for future use).
- [ ] **Removing a value that users have selected:** The value remains in user data (stored as a string in persona JSONB). It simply stops appearing in the combobox suggestions. This is by design.
- [ ] **Very long value strings:** Max 200 characters per value. Validated on input.
- [ ] **Drag-and-drop on mobile:** `@dnd-kit` supports touch. Fall back to up/down arrow buttons on narrow viewports.
- [ ] **Concurrent edits:** Two admins editing the same category. Last-write-wins on save. The audit log captures both operations.
- [ ] **traitKey and taxonomySlug immutability:** These are the identity of the category. Changing them would break existing references. Read-only after creation.
- [ ] **displayOrder gaps:** Allowed. Display order is relative, not contiguous. 0, 5, 10 is valid.

### Test Criteria

- `getTaxonomyById(validId)` returns the full category with suggestedValues
- `getTaxonomyById(invalidId)` returns null
- `createTaxonomy()` inserts a new row and returns it with generated ID
- `createTaxonomy()` rejects duplicate `(traitKey, taxonomySlug)` with user-friendly error
- `createTaxonomy()` auto-fills displayOrder when omitted (max+1 for the traitKey)
- `updateTaxonomy()` updates only provided fields, leaving others unchanged
- `updateTaxonomy()` preserves suggestedValues order when reordered
- `deleteTaxonomy()` removes the row and returns success
- All mutations create an audit log entry
- Form validates with Zod before submission (client-side + server-side)
- Delete dialog requires exact name match to enable the delete button

---

## 3. Taxonomy Value Management

### Overview

Values are managed inline on the category edit page (section 2), but the add/edit interactions are complex enough to warrant their own section. An admin can add a single value, bulk-add from text input, and the system detects duplicates before saving. The filter input narrows the visible value list for categories with many values (skills/technology has 63).

### Wireframe

```
Add single value (inline):
┌──────────────────────────────────────────────────────────────────┐
│  Suggested Values (63)                                           │
│                                                                  │
│  ┌──────────────────────────┐  [Add]                             │
│  │ New value name...        │                                    │
│  └──────────────────────────┘                                    │
│  ⚠ "Python" already exists in this category (if duplicate)       │
│                                                                  │
│  ≡  JavaScript                                            [✕]    │
│  ≡  TypeScript                                            [✕]    │
│  ≡  Python                                                [✕]    │
│  …                                                               │
└──────────────────────────────────────────────────────────────────┘

Bulk add dialog:
┌────────────────────────────────────────────────────────┐
│  Bulk Add Values                                       │
│                                                        │
│  Paste values separated by commas or newlines:         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Elixir                                           │  │
│  │ Scala                                            │  │
│  │ Haskell                                          │  │
│  │ Clojure, Erlang, F#                              │  │
│  │                                                  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Preview (6 values parsed):                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ✓ Elixir                               (new)    │  │
│  │  ✓ Scala                                (new)    │  │
│  │  ✓ Haskell                              (new)    │  │
│  │  ✓ Clojure                              (new)    │  │
│  │  ✓ Erlang                               (new)    │  │
│  │  ✓ F#                                   (new)    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  0 duplicates skipped.                                 │
│                                                        │
│                           [Cancel]  [Add 6 Values]     │
└────────────────────────────────────────────────────────┘

Bulk add with duplicates:
┌────────────────────────────────────────────────────────┐
│  Preview (4 values parsed):                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ✓ Elixir                               (new)    │  │
│  │  ⚠ Python                          (duplicate)   │  │
│  │  ⚠ JavaScript                      (duplicate)   │  │
│  │  ✓ Scala                                (new)    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  2 duplicates will be skipped.                         │
│                                                        │
│                           [Cancel]  [Add 2 Values]     │
└────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/components/add-value-inline.tsx              -- Client Component
  ├─ components/ui/input.tsx                            -- value text input
  └─ components/ui/button.tsx                           -- "Add" button

apps/admin/components/bulk-add-dialog.tsx               -- Client Component
  ├─ components/ui/dialog.tsx                           -- shadcn Dialog
  ├─ components/ui/textarea.tsx                         -- raw text input
  └─ apps/admin/components/bulk-add-preview.tsx         -- parsed value preview
       └─ duplicate detection logic (case-insensitive match against existing values)
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | Admin can add a single value to a category | Inline text input + "Add" button; appended to end of list |
| 3.2 | Admin can see duplicate warning when adding an existing value | Case-insensitive comparison; warning shown inline, add blocked |
| 3.3 | Admin can bulk-add values from comma-separated or newline-separated text | Parses input, shows preview with new vs. duplicate classification |
| 3.4 | Admin can see a preview of parsed values before bulk adding | Preview list with checkmarks (new) and warnings (duplicate) |
| 3.5 | Admin can filter the visible value list by typing | Client-side filter; useful for large categories (63+ values) |
| 3.6 | Admin can edit an existing value's text in place | Double-click or edit icon to inline-edit; duplicate check on save |

### Validation

```typescript
// Inline add validation (client-side)
const singleValueSchema = z.string().min(1).max(200).trim();

// Bulk add parsing logic (client-side)
function parseBulkInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map(v => v.trim())
    .filter(v => v.length > 0 && v.length <= 200);
}

function detectDuplicates(
  newValues: string[],
  existingValues: string[]
): { unique: string[]; duplicates: string[] } {
  const existing = new Set(existingValues.map(v => v.toLowerCase()));
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicates: string[] = [];

  for (const v of newValues) {
    const key = v.toLowerCase();
    if (existing.has(key) || seen.has(key)) {
      duplicates.push(v);
    } else {
      seen.add(key);
      unique.push(v);
    }
  }
  return { unique, duplicates };
}
```

### Edge Cases

- [ ] **Whitespace-only input:** Trimmed to empty, rejected by min(1) validation.
- [ ] **Duplicate detection is case-insensitive:** "python" and "Python" are considered duplicates. The first occurrence's casing is preserved.
- [ ] **Bulk add with all duplicates:** Button shows "Add 0 Values" and is disabled. Message: "All values already exist."
- [ ] **Comma inside a value name:** "C#" is fine, but "Machine Learning, AI" would split into two values. The admin should use newline-only if values contain commas. The bulk-add dialog could offer a "newline-only" toggle.
- [ ] **Editing a value to match another existing value:** Blocked with duplicate warning.
- [ ] **Maximum values per category:** No hard limit in the schema, but show a warning above 500 values (performance concern for the consumer combobox).
- [ ] **Empty bulk input:** "Add 0 Values" button disabled.

### Test Criteria

- Single add appends value to the end of suggestedValues array
- Single add blocks duplicate (case-insensitive) with warning message
- Bulk parser splits on commas and newlines
- Bulk parser trims whitespace and filters empty strings
- Bulk parser rejects strings over 200 characters
- Duplicate detection correctly identifies case-insensitive matches
- Duplicate detection handles duplicates within the bulk input itself
- Preview shows correct counts for new vs. duplicate values
- Value filter narrows visible list client-side
- Inline edit updates the value at its current position (preserves order)
- Inline edit blocks renaming to an existing value

---

## 4. Bulk Import/Export

### Overview

Admins need to move taxonomy data between environments (staging to production) and create backups. Export produces a JSON or CSV file. Import reads a JSON file and either merges with existing data or replaces it entirely. The merge strategy is critical: merge mode adds new categories and appends new values to existing categories; replace mode is a full overwrite of all taxonomies matching the imported trait keys.

### Wireframe

```
Export (from list page toolbar):
┌────────────────────────────────────────────────────────┐
│  Export Taxonomies                                      │
│                                                        │
│  Format:  (●) JSON   ( ) CSV                           │
│                                                        │
│  Scope:   (●) All taxonomies (62 categories)           │
│           ( ) Current filter (skills, 17 categories)   │
│                                                        │
│                           [Cancel]  [Download]          │
└────────────────────────────────────────────────────────┘

Import dialog (from list page toolbar):
┌────────────────────────────────────────────────────────┐
│  Import Taxonomies                                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │          Drop a JSON file here                   │  │
│  │          or click to browse                      │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Mode:  (●) Merge — add new, keep existing             │
│         ( ) Replace — overwrite matching trait keys     │
│                                                        │
│                                  [Cancel]  [Import]     │
└────────────────────────────────────────────────────────┘

Import preview (after file parsed):
┌────────────────────────────────────────────────────────┐
│  Import Preview                                        │
│                                                        │
│  File: taxonomies-2026-02-24.json                      │
│  Mode: Merge                                           │
│                                                        │
│  Changes:                                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  + 2 new categories                               │  │
│  │    skills / skills-quantum (12 values)            │  │
│  │    interests / interests-esports (8 values)       │  │
│  │                                                   │  │
│  │  ~ 3 categories with new values                   │  │
│  │    skills-technology: +5 values                   │  │
│  │    interests-music: +2 values                     │  │
│  │    values-professional: +1 value                  │  │
│  │                                                   │  │
│  │  = 57 categories unchanged                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Replace mode warning (if selected):                   │
│  ⚠ This will delete all existing categories for        │
│    the imported trait keys and replace them with        │
│    the imported data. This cannot be undone.            │
│                                                        │
│                           [Cancel]  [Confirm Import]   │
└────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/components/export-dialog.tsx                 -- Client Component
  ├─ components/ui/dialog.tsx
  ├─ components/ui/radio-group.tsx                      -- format + scope selection
  └─ components/ui/button.tsx

apps/admin/components/import-dialog.tsx                 -- Client Component
  ├─ components/ui/dialog.tsx
  ├─ apps/admin/components/file-dropzone.tsx            -- drag-and-drop file upload
  ├─ components/ui/radio-group.tsx                      -- merge/replace mode
  └─ apps/admin/components/import-preview.tsx           -- diff preview
       └─ diff logic (compare imported data against current DB state)
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | Admin can export all taxonomies as JSON | Downloads a timestamped file: `taxonomies-YYYY-MM-DD.json` |
| 4.2 | Admin can export filtered taxonomies as JSON | Exports only categories matching the current trait key filter |
| 4.3 | Admin can export taxonomies as CSV | One row per value: `traitKey, taxonomySlug, displayName, value` |
| 4.4 | Admin can import taxonomies from a JSON file | File upload via drag-and-drop or file picker |
| 4.5 | Admin can choose merge or replace import mode | Merge: additive only. Replace: delete + insert for affected trait keys. |
| 4.6 | Admin can preview import changes before confirming | Shows new categories, modified categories (new values), and unchanged categories |
| 4.7 | Admin can see a warning when using replace mode | Explicit warning about data loss; requires confirmation |

### JSON Export Format

```typescript
// Export schema
interface TaxonomyExport {
  version: 1;
  exportedAt: string; // ISO-8601
  exportedBy: string; // admin user ID
  categories: Array<{
    traitKey: string;
    taxonomySlug: string;
    displayName: string;
    description: string | null;
    icon: string | null;
    suggestedValues: string[];
    displayOrder: number | null;
  }>;
}
```

### Server Actions

```typescript
// apps/admin/app/actions/taxonomies.ts

// Authenticated (admin). Exports taxonomies as JSON.
exportTaxonomies(filters?: { traitKey?: string }): Promise<TaxonomyExport>

// Authenticated (admin). Imports taxonomies from JSON.
// mode: 'merge' | 'replace'
// Merge: upsert categories (match on traitKey+taxonomySlug), append new values.
// Replace: delete all categories for imported trait keys, then insert.
// Logs to admin_audit_log with full before/after state.
importTaxonomies(data: TaxonomyExport, mode: 'merge' | 'replace'): Promise<ImportResult>
// where ImportResult = { created: number, updated: number, deleted: number, unchanged: number }
```

### Validation

```typescript
// @personus/validations -- taxonomy-admin.ts

export const taxonomyExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  exportedBy: z.string(),
  categories: z.array(z.object({
    traitKey: z.string().min(1),
    taxonomySlug: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    suggestedValues: z.array(z.string()),
    displayOrder: z.number().int().nullable().optional(),
  })),
});
```

### Edge Cases

- [ ] **Invalid JSON file:** Zod validation catches malformed data; show specific error message to admin.
- [ ] **Version mismatch:** If export format evolves, the `version` field enables migration. Currently only version 1.
- [ ] **Replace mode on a trait key not in the import:** Only affects trait keys present in the import. Other trait keys are untouched.
- [ ] **Merge mode duplicate handling:** If a category in the import matches an existing `(traitKey, taxonomySlug)`, the import appends any new values and updates displayName/description/icon if they differ. It does NOT remove existing values.
- [ ] **Large import file (10,000+ values):** Process in a single database transaction. Show progress indicator. Timeout at 30 seconds.
- [ ] **CSV export with commas in values:** Values are quoted per RFC 4180.
- [ ] **Empty import file:** Reject with "No categories found in file."
- [ ] **Import with overlapping values within the file:** Deduplicate within each category before processing.

### Test Criteria

- Export produces valid JSON matching `taxonomyExportSchema`
- Export with traitKey filter includes only matching categories
- CSV export has correct headers and proper quoting
- Merge import creates new categories and appends new values
- Merge import does not remove existing values
- Merge import updates displayName/description/icon when different
- Replace import deletes existing categories for imported trait keys
- Replace import does not affect trait keys not in the import
- Import rejects invalid JSON with specific error
- Import rejects files with version !== 1
- All import operations are wrapped in a single transaction
- Audit log entry captures full before/after state for imports

---

## 5. Audit Trail

### Overview

Every taxonomy mutation -- create, update, delete, bulk import -- is logged to the `admin_audit_log` table. The admin can view the audit history for a specific taxonomy category or browse all taxonomy-related audit entries. The audit log is append-only and immutable.

### Schema Addition

```sql
-- New table: admin_audit_log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,                     -- Clerk user ID of the admin
  action TEXT NOT NULL,                            -- 'create' | 'update' | 'delete' | 'bulk_import'
  entity_type TEXT NOT NULL,                       -- 'taxonomy' | 'trait_metadata' | 'system_setting' | 'user' | 'community'
  entity_id TEXT,                                  -- UUID of the affected row (null for bulk operations)
  entity_label TEXT,                               -- Human-readable label ("skills / Technology & Software")
  changes JSONB NOT NULL,                          -- { before: {...} | null, after: {...} | null }
  metadata JSONB,                                  -- Extra context: { importMode: 'merge', affectedCount: 5, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_entity ON admin_audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_admin ON admin_audit_log (admin_user_id);
CREATE INDEX idx_audit_created ON admin_audit_log (created_at DESC);
```

### Drizzle Schema

```typescript
// @personus/db -- schema/admin-audit-log.ts

import { jsonb, pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'bulk_import'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  'taxonomy',
  'trait_metadata',
  'system_setting',
  'user',
  'community',
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminUserId: text('admin_user_id').notNull(),
    action: text('action').notNull(),               // AuditAction
    entityType: text('entity_type').notNull(),       // AuditEntityType
    entityId: text('entity_id'),
    entityLabel: text('entity_label'),
    changes: jsonb('changes').notNull(),             // { before: T | null, after: T | null }
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_admin').on(table.adminUserId),
    index('idx_audit_created').on(table.createdAt),
  ],
);

export type AdminAuditLogRow = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLogRow = typeof adminAuditLog.$inferInsert;
```

### Wireframe

```
Audit history for a category (tab on category edit page):
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Taxonomies                                                         │
│                                                                              │
│ Technology & Software                                                        │
│ [Details]  [Values]  [History]                                               │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │  Feb 24, 2026 3:42 PM   admin@personus.ai                               │ │
│ │  Updated category                                                        │ │
│ │  ┌────────────────────────────────────────────────────────────────────┐  │ │
│ │  │  suggestedValues:                                                  │  │ │
│ │  │    + "Elixir"                                                      │  │ │
│ │  │    + "Scala"                                                       │  │ │
│ │  │    - "IoT" (removed)                                               │  │ │
│ │  │  displayName:                                                      │  │ │
│ │  │    "Technology & Software" → "Technology & Software Engineering"    │  │ │
│ │  └────────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                          │ │
│ │  Feb 17, 2026 10:15 AM   system                                         │ │
│ │  Created category (seed data)                                            │ │
│ │  ┌────────────────────────────────────────────────────────────────────┐  │ │
│ │  │  Initial seed with 63 values                                       │  │ │
│ │  └────────────────────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

Global audit log page:
┌──────────────────────────────────────────────────────────────────────────────┐
│ Audit Log                                                                    │
│                                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│ │ Entity ▼ All │  │ Action ▼ All │  │ Admin ▼  All │                       │
│ └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
│ ┌──────────┬──────────┬──────────────────────────┬──────────────┬─────────┐ │
│ │ Time     │ Admin    │ Action                   │ Entity       │ Details │ │
│ ├──────────┼──────────┼──────────────────────────┼──────────────┼─────────┤ │
│ │ 3:42 PM  │ admin@.. │ Updated taxonomy         │ skills /     │ [View]  │ │
│ │ Feb 24   │          │                          │ technology   │         │ │
│ ├──────────┼──────────┼──────────────────────────┼──────────────┼─────────┤ │
│ │ 3:40 PM  │ admin@.. │ Bulk import (merge)      │ 5 categories │ [View]  │ │
│ │ Feb 24   │          │                          │              │         │ │
│ ├──────────┼──────────┼──────────────────────────┼──────────────┼─────────┤ │
│ │ 10:15 AM │ system   │ Created taxonomy         │ skills /     │ [View]  │ │
│ │ Feb 17   │          │                          │ technology   │         │ │
│ └──────────┴──────────┴──────────────────────────┴──────────────┴─────────┘ │
│                                                                              │
│                                              [← Prev]  Page 1 of 3  [Next →]│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
apps/admin/app/(admin)/taxonomies/[id]/page.tsx
  └─ apps/admin/components/taxonomy-audit-history.tsx    -- Client Component
       └─ apps/admin/components/audit-diff-viewer.tsx    -- renders before/after changes
            └─ uses JSONB diff to highlight added/removed values and changed fields

apps/admin/app/(admin)/audit/page.tsx                    -- Server Component (global log)
  └─ apps/admin/components/audit-log-table.tsx           -- Client Component
       ├─ components/ui/select.tsx                       -- entity, action, admin filters
       ├─ @tanstack/react-table                          -- data table with pagination
       └─ apps/admin/components/audit-detail-dialog.tsx  -- full change details
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | Admin can view audit history for a specific taxonomy category | History tab on category edit page; chronological, newest first |
| 5.2 | Admin can see before/after diff for each change | Added values in green, removed in red, changed fields with arrow |
| 5.3 | Admin can view the global audit log for all taxonomy changes | Filterable by entity type, action, and admin user |
| 5.4 | Admin can filter the global audit log by entity type, action, and admin | Dropdowns populated from distinct values |
| 5.5 | Admin can paginate through the audit log | 25 entries per page; server-side pagination |
| 5.6 | Bulk import operations create a single audit entry with summary | metadata JSONB includes: importMode, affectedCount, created, updated, deleted |

### Server Actions

```typescript
// apps/admin/app/actions/audit.ts

// Authenticated (admin). Fetches audit log entries.
listAuditEntries(filters?: {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  adminUserId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ entries: AdminAuditLogRow[], total: number }>

// Internal helper. Creates an audit log entry. Called by taxonomy mutation actions.
// Not exposed as a server action.
logAuditEntry(entry: NewAdminAuditLogRow): Promise<void>
```

### Edge Cases

- [ ] **Seed data audit entries:** The initial seed run logs entries with `adminUserId: 'system'` and `action: 'create'`. This provides baseline history.
- [ ] **Very large changes JSONB:** A bulk import replacing 1000 values produces a large diff. Store only the summary in `changes` and the full before/after in `metadata` if the diff exceeds 100KB.
- [ ] **Admin user deleted from Clerk:** Audit log retains the Clerk user ID. The admin list page resolves display names from Clerk; deleted users show as "Unknown (user_xxxxx)".
- [ ] **Clock skew:** Use database `NOW()` for all timestamps, not client-side Date.
- [ ] **Audit log retention:** No automatic cleanup. Audit logs are small (JSONB diffs) and append-only. Revisit if table exceeds 1M rows.

### Test Criteria

- Every `createTaxonomy()` call produces an audit entry with `action: 'create'` and `changes.before: null`
- Every `updateTaxonomy()` call produces an audit entry with `action: 'update'` and both `before` and `after` in changes
- Every `deleteTaxonomy()` call produces an audit entry with `action: 'delete'` and `changes.after: null`
- Every `importTaxonomies()` call produces an audit entry with `action: 'bulk_import'` and summary metadata
- `listAuditEntries({ entityId })` returns only entries for that entity
- `listAuditEntries()` paginates correctly with total count
- Audit entries are immutable (no update or delete endpoints)
- Diff viewer correctly highlights added values (green), removed values (red), and changed fields

---

## 6. Cache Invalidation

### Overview

The consumer app caches taxonomy data via Next.js `unstable_cache` with a `taxonomy` tag (or per-traitKey tags). When an admin modifies taxonomy data, the consumer app's cache must be invalidated so users see updated suggestions. The invalidation strategy uses a combination of cache tags and a lightweight webhook.

### Architecture

```
Admin App (admin.personus.ai)          Consumer App (app.personus.ai)
─────────────────────────────         ──────────────────────────────
                                       getTaxonomyValues('skills')
                                         └─ unstable_cache({
                                              tags: ['taxonomy', 'taxonomy:skills'],
                                              revalidate: 3600  // 1 hour TTL fallback
                                            })

Admin saves taxonomy change
  └─ updateTaxonomy() in DB
  └─ logAuditEntry()
  └─ POST /api/revalidate
       ├─ header: x-revalidate-secret
       └─ body: { tags: ['taxonomy', 'taxonomy:skills'] }
                                       POST /api/revalidate (receives)
                                         └─ revalidateTag('taxonomy')
                                         └─ revalidateTag('taxonomy:skills')
                                         └─ returns 200 OK
```

### Invalidation Strategies

| Strategy | How It Works | Tradeoff |
|----------|-------------|----------|
| **Webhook + revalidateTag** (recommended) | Admin app POSTs to consumer app's `/api/revalidate` endpoint after each mutation. Consumer calls `revalidateTag()`. | Real-time. Requires shared secret. Works with Vercel ISR. |
| **TTL-only fallback** | `unstable_cache` with `revalidate: 3600` (1 hour). Changes propagate within the TTL window. | Simple. No coordination needed. Up to 1 hour stale. |
| **Database polling** | Consumer app polls a `last_modified` timestamp on a schedule. | No webhook needed. Adds DB load. Delay depends on poll interval. |

The recommended approach is **webhook + TTL fallback**. The webhook provides near-instant invalidation. The TTL ensures eventual consistency if the webhook fails.

### Consumer App Endpoint

```typescript
// apps/web/app/api/revalidate/route.ts

import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const tags: string[] = body.tags ?? [];

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags, now: Date.now() });
}
```

### Admin App Integration

```typescript
// apps/admin/lib/revalidate.ts

const CONSUMER_APP_URL = process.env.CONSUMER_APP_URL; // https://app.personus.ai
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function invalidateConsumerCache(tags: string[]): Promise<void> {
  if (!CONSUMER_APP_URL || !REVALIDATE_SECRET) {
    console.warn('Consumer cache invalidation not configured');
    return;
  }

  try {
    const response = await fetch(`${CONSUMER_APP_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      console.error(`Cache invalidation failed: ${response.status}`);
    }
  } catch (error) {
    // Non-fatal: TTL fallback ensures eventual consistency
    console.error('Cache invalidation error:', error);
  }
}
```

### Stories

| ID | Story | Notes |
|----|-------|-------|
| 6.1 | Consumer app caches taxonomy queries with `unstable_cache` and tag-based keys | Tags: `taxonomy` (global) + `taxonomy:{traitKey}` (per key) |
| 6.2 | Admin app invalidates consumer cache after taxonomy mutations | POST to `/api/revalidate` with affected tags |
| 6.3 | Consumer app exposes a revalidation endpoint protected by shared secret | Secret in `REVALIDATE_SECRET` env var; rejects unauthorized requests |
| 6.4 | Cache invalidation failures are non-fatal with TTL fallback | Log error, do not fail the admin mutation; TTL (1 hour) ensures eventual consistency |
| 6.5 | Bulk import invalidates the global `taxonomy` tag | Single invalidation call covers all affected trait keys |

### Environment Variables

```
# apps/admin/.env.local
CONSUMER_APP_URL=https://app.personus.ai
REVALIDATE_SECRET=<shared-secret>

# apps/web/.env.local
REVALIDATE_SECRET=<same-shared-secret>
```

### Edge Cases

- [ ] **Consumer app is down:** `invalidateConsumerCache` catches the error and logs it. The admin mutation still succeeds. The TTL fallback handles it.
- [ ] **Multiple consumer app instances (Vercel serverless):** `revalidateTag` is a Vercel-level primitive that invalidates across all instances. This works out of the box on Vercel.
- [ ] **Rapid successive changes:** Multiple invalidation calls in quick succession are fine. `revalidateTag` is idempotent.
- [ ] **Missing REVALIDATE_SECRET:** The consumer app rejects the request (401). The admin app logs a warning. No data is exposed.
- [ ] **Local development:** Both apps run on different ports (e.g., 3000, 3001). `CONSUMER_APP_URL=http://localhost:3000` works.

### Test Criteria

- Consumer's `getTaxonomyValues()` returns cached results on second call (no DB hit)
- After `revalidateTag('taxonomy:skills')`, next call to `getTaxonomyValues('skills')` hits DB
- Revalidation endpoint returns 401 for missing/wrong secret
- Revalidation endpoint returns 200 with list of revalidated tags
- Admin's `invalidateConsumerCache()` does not throw on network errors
- Admin's `invalidateConsumerCache()` logs a warning when env vars are missing

---

## Appendix A: Full Taxonomy Inventory

Current state of `trait_taxonomies` data (14 seed files, 62 categories, ~1054 values):

| # | Trait Key | Seed File | Categories | ~Values | Notes |
|---|-----------|-----------|------------|---------|-------|
| 1 | `skills` | skills.ts | 17 | ~650 | Largest. ESCO + O*NET + marketplace sources |
| 2 | `interests` | interests.ts | 14 | ~200 | Wikidata + hobby lists |
| 3 | `education` | education-fields.ts | 11 | ~87 | ISCED-F 2013 (UNESCO) |
| 4 | `qualities` | qualities.ts | 7 | ~42 | VIA Character Strengths |
| 5 | `values` | values.ts | 5 | ~26 | Schwartz Theory |
| 6 | `languages` | languages.ts | 1 | ~186 | ISO 639-1 + sign languages |
| 7 | `offerings` | offerings.ts | 2 | ~17 | Offering types + audiences |
| 8 | `seekingOpportunities` | seeking-opportunities.ts | 4 | ~33 | Career, business, learning, community |
| 9 | `focusAreas` | focus-areas.ts | 1 | ~6 | Domain presets |
| 10 | `dietaryRestrictions` | dietary.ts | 1 | ~20 | Diets and restrictions |
| 11 | `allergens` | dietary.ts | 1 | ~19 | FDA 9 + EU 14 |
| 12 | `dietaryPreferences` | dietary.ts | 1 | ~19 | Food quality preferences |
| 13 | `clothingSizes` | clothing-sizes.ts | 1 | ~29 | US letter + numeric + waist |
| 14 | `shoeSize` | clothing-sizes.ts | 1 | ~23 | US sizes + widths |
| 15 | `styleTags` | shopping-style.ts | 1 | ~20 | Fashion style descriptors |
| 16 | `materialPreferences` | shopping-style.ts | 1 | ~20 | Fabric preferences |
| 17 | `requiredCertifications` | shopping-style.ts | 1 | ~16 | Commerce certifications |
| 18 | `shippingPreferences` | carriers.ts | 1 | ~17 | Shipping carriers |
| 19 | `agentAuthorization` | delegation-scope.ts | 1 | ~12 | AI agent delegation categories |

(Some seed files produce multiple trait keys, e.g., `dietary.ts` covers 3 trait keys.)

---

## Appendix B: Linear Issue Mapping

| Issue ID | Story | Title | Labels | Depends On | Estimate |
|----------|-------|-------|--------|------------|----------|
| -- | 1.1 | Build taxonomy data table with columns and summary | `admin`, `taxonomy` | -- | -- |
| -- | 1.2 | Add trait key filter dropdown to taxonomy list | `admin`, `taxonomy` | 1.1 | -- |
| -- | 1.3 | Add search across display names and values | `admin`, `taxonomy` | 1.1 | -- |
| -- | 1.4 | Show total category and value counts | `admin`, `taxonomy` | 1.1 | -- |
| -- | 1.5 | Add client-side column sorting | `admin`, `taxonomy` | 1.1 | -- |
| -- | 1.6 | Add row click navigation to category edit | `admin`, `taxonomy` | 1.1 | -- |
| -- | 2.1 | Build taxonomy category detail/edit page | `admin`, `taxonomy` | 1.1 | -- |
| -- | 2.2 | Implement category field editing with validation | `admin`, `taxonomy` | 2.1 | -- |
| -- | 2.3 | Build new category creation form | `admin`, `taxonomy` | 2.1 | -- |
| -- | 2.4 | Implement category deletion with type-to-confirm | `admin`, `taxonomy` | 2.1 | -- |
| -- | 2.5 | Add drag-and-drop value reordering | `admin`, `taxonomy` | 2.1 | -- |
| -- | 2.6 | Add single value removal from category | `admin`, `taxonomy` | 2.1 | -- |
| -- | 3.1 | Build inline single value add input | `admin`, `taxonomy` | 2.1 | -- |
| -- | 3.2 | Add duplicate detection for single value add | `admin`, `taxonomy` | 3.1 | -- |
| -- | 3.3 | Build bulk add dialog with text parsing | `admin`, `taxonomy` | 2.1 | -- |
| -- | 3.4 | Add bulk add preview with duplicate classification | `admin`, `taxonomy` | 3.3 | -- |
| -- | 3.5 | Add value filter input for large categories | `admin`, `taxonomy` | 2.1 | -- |
| -- | 3.6 | Add inline value text editing | `admin`, `taxonomy` | 2.1 | -- |
| -- | 4.1 | Implement JSON export for all taxonomies | `admin`, `taxonomy`, `import-export` | 1.1 | -- |
| -- | 4.2 | Implement filtered JSON export | `admin`, `taxonomy`, `import-export` | 4.1, 1.2 | -- |
| -- | 4.3 | Implement CSV export | `admin`, `taxonomy`, `import-export` | 4.1 | -- |
| -- | 4.4 | Build JSON import with file upload | `admin`, `taxonomy`, `import-export` | -- | -- |
| -- | 4.5 | Implement merge and replace import modes | `admin`, `taxonomy`, `import-export` | 4.4 | -- |
| -- | 4.6 | Build import preview with change summary | `admin`, `taxonomy`, `import-export` | 4.4 | -- |
| -- | 4.7 | Add replace mode warning and confirmation | `admin`, `taxonomy`, `import-export` | 4.5 | -- |
| -- | 5.1 | Create admin_audit_log schema and migration | `admin`, `audit`, `schema` | -- | -- |
| -- | 5.2 | Build category audit history tab with diff viewer | `admin`, `audit`, `taxonomy` | 5.1, 2.1 | -- |
| -- | 5.3 | Wire audit logging into all taxonomy mutations | `admin`, `audit`, `taxonomy` | 5.1 | -- |
| -- | 5.4 | Build global audit log page with filters | `admin`, `audit` | 5.1 | -- |
| -- | 5.5 | Add pagination to audit log | `admin`, `audit` | 5.4 | -- |
| -- | 5.6 | Log bulk import as single audit entry with summary | `admin`, `audit`, `import-export` | 5.3, 4.5 | -- |
| -- | 6.1 | Add unstable_cache with taxonomy tags to consumer app | `consumer`, `taxonomy`, `cache` | -- | -- |
| -- | 6.2 | Build admin-side cache invalidation helper | `admin`, `taxonomy`, `cache` | 6.1 | -- |
| -- | 6.3 | Build consumer-side revalidation API endpoint | `consumer`, `taxonomy`, `cache` | -- | -- |
| -- | 6.4 | Add non-fatal error handling for cache invalidation | `admin`, `taxonomy`, `cache` | 6.2 | -- |
| -- | 6.5 | Wire bulk import to invalidate global taxonomy tag | `admin`, `taxonomy`, `cache` | 6.2, 4.5 | -- |

---

## Appendix C: Implementation Order

1. **admin_audit_log schema and migration** -- stories 5.1. Foundation for all audit logging. No UI dependency.
2. **Taxonomy list server actions** (`listTaxonomies`, `listTraitKeys`) -- stories 1.1-1.4. Query-only, no mutations.
3. **Taxonomy data table component** -- stories 1.1-1.6. First visible screen. Requires step 2.
4. **Taxonomy CRUD server actions** (`getTaxonomyById`, `createTaxonomy`, `updateTaxonomy`, `deleteTaxonomy`) with audit logging -- stories 2.1-2.4, 5.3. Requires step 1.
5. **Taxonomy category form component** (create + edit modes) -- stories 2.1-2.4. Requires steps 3, 4.
6. **Value management components** (inline add, bulk add, drag-and-drop, filter, inline edit) -- stories 2.5-2.6, 3.1-3.6. Requires step 5.
7. **Export/import server actions and components** -- stories 4.1-4.7. Requires steps 4, 6.
8. **Category audit history tab** -- story 5.2. Requires steps 4, 5.
9. **Global audit log page** -- stories 5.3-5.6. Requires step 1. Can be built in parallel with steps 3-7.
10. **Consumer app cache tagging** (`unstable_cache` with taxonomy tags) -- story 6.1. Independent of admin app.
11. **Consumer revalidation endpoint** -- story 6.3. Requires step 10.
12. **Admin cache invalidation wiring** -- stories 6.2, 6.4, 6.5. Requires steps 4, 11.
