---
type: spec
title: "Identity & Personas -- Persona Visibility"
description: "This spec covers all visibility and privacy controls for personas: the four-tier visibility system (public/authenticated/community/private), per-trait visibility overrides within a persona, MCP…"
status: current
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Persona Visibility

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-persona-lifecycle.md`, `03-trait-metadata.md`, `docs/foundation/authorization.md`
> Primary actors: User (authenticated persona owner), Visitor (unauthenticated or non-owner viewer), AI Agent (MCP consumer)

This spec covers all visibility and privacy controls for personas: the four-tier visibility system (public/authenticated/community/private), per-trait visibility overrides within a persona, MCP exposure settings for AI agent discovery, and the GDPR-inspired contact preferences system. Together these determine who sees what, how, and through which channels. The existing implementation is substantial -- this spec documents it, fills gaps, and defines the remaining UI and enforcement work.

---

## 1. Persona Visibility Tiers

### Overview

Every persona has a `visibility` field that controls the broadest access gate: which actors can discover and view the persona at all. This is the first authorization layer evaluated on any request (see `docs/foundation/authorization.md` Layer 2). The four tiers form a strict hierarchy where each level is a subset of the one above it. Changing visibility is an owner-only action with immediate effect on all viewers, search results, and MCP responses.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Persona Settings                                            [< Back]   │
│                                                                         │
│ ┌─ Visibility ────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  Who can see this persona?                                          │ │
│ │                                                                     │ │
│ │  ○ Public                                                           │ │
│ │    Anyone, including search engines and AI agents                   │ │
│ │                                                                     │ │
│ │  ○ Authenticated                                                    │ │
│ │    Only logged-in Personus users                                    │ │
│ │                                                                     │ │
│ │  ● Community  (default)                                             │ │
│ │    Only members of your shared communities                          │ │
│ │                                                                     │ │
│ │  ○ Private                                                          │ │
│ │    Only you — draft mode                                            │ │
│ │                                                                     │ │
│ │  ┌───────────────────────────────────────────────────────────────┐  │ │
│ │  │ ℹ Community visibility means anyone who shares a community   │  │ │
│ │  │   with this persona can see it. If you want different        │  │ │
│ │  │   audiences, create separate personas.                       │  │ │
│ │  └───────────────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Preview ───────────────────────────────────────────────────────────┐ │
│ │  Public search:     ✓ Visible     (or ✗ Hidden)                    │ │
│ │  Auth'd users:      ✓ Visible     (or ✗ Hidden)                    │ │
│ │  Community members:  ✓ Visible                                     │ │
│ │  AI agents (MCP):   ✓ Discoverable (or ✗ Hidden)                   │ │
│ │  SEO / Google:      ✓ Indexed     (or ✗ Not indexed)               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                                         [Save Changes]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx          ← EXISTS: Client Component
  └─ components/visibility-settings.tsx               ← NEW: Client Component ("use client")
       ├─ components/ui/card.tsx                      ← EXISTS
       ├─ components/ui/label.tsx                     ← EXISTS
       ├─ components/visibility-preview.tsx            ← NEW: Presentational
       └─ calls: app/actions/personas.ts → updatePersona()  ← EXISTS
            └─ writes: lib/db/schema/personas.ts → personas.visibility
```

Currently the visibility select is an inline `<Select>` in `app/(dashboard)/personas/[uri]/edit/page.tsx` (line ~59). The enhancement extracts it into a dedicated component with radio buttons and a live preview of what each tier means for this persona (factoring in community memberships).

### Workflows & Stories

---

#### Workflow: Owner configures persona visibility

**Preconditions:**
- User is authenticated via Clerk
- User owns at least one persona
- User is on the persona edit page

**Stories:**

**[1.1] Display current visibility with tier descriptions**
> Owner views the visibility setting so that they understand who can currently see this persona.

- **User:** Authenticated user editing their own persona.
- **Functional:** The visibility section renders as a radio group with all four tiers. Each tier shows a label and a one-line description. The current value from `persona.visibility` is pre-selected. A contextual info box explains the "community" tier nuance (visible to members of ANY shared community, not one specific community).
- **Technical:** New `components/visibility-settings.tsx` receives `visibility: VisibilityLevel` and `onVisibilityChange: (v: VisibilityLevel) => void` props. Uses `VISIBILITY_LEVELS` and `VISIBILITY_LABELS` from `@/lib/constants`. Descriptions are static strings in the component.
- **Acceptance criteria:**
  - [ ] All four tiers render as radio options with labels and descriptions
  - [ ] Current persona visibility is pre-selected on mount
  - [ ] Info box renders for "community" tier explaining shared-community behavior
  - [ ] Radio group is keyboard-navigable (up/down arrows, space to select)
- **Failure paths:**
  - If visibility value is not in `VISIBILITY_LEVELS`: default to `'community'` and log warning

**[1.2] Change visibility tier with immediate preview**
> Owner changes visibility so that they can control who discovers this persona.

- **User:** Authenticated user selecting a new visibility tier.
- **Functional:** Selecting a radio button optimistically updates a preview panel showing what the new visibility means: checkmarks/crosses for "Public search", "Authenticated users", "Community members", "AI agents (MCP)", and "SEO / Google". The preview updates instantly on selection (no save needed for preview). The actual save happens when the user clicks "Save Changes" on the edit form.
- **Technical:** The preview component (`components/visibility-preview.tsx`) maps visibility levels to a static boolean matrix:
  - `public`: all checkmarks
  - `authenticated`: public search no, auth users yes, community yes, MCP yes (if mcpEnabled), SEO no
  - `community`: only community members yes, MCP no, SEO no
  - `private`: all crosses except "You" row
  The parent edit page calls `updatePersona(uri, { visibility })` on form submit, which is already implemented in `app/actions/personas.ts` line ~171.
- **Acceptance criteria:**
  - [ ] Selecting a tier updates the preview panel immediately (no save)
  - [ ] Preview correctly reflects the boolean matrix for each tier
  - [ ] Save button triggers `updatePersona()` with the new visibility value
  - [ ] Toast notification confirms "Visibility updated" on success
  - [ ] Persona visibility column updates in database
- **Failure paths:**
  - If save fails: revert radio selection to previous value, show error toast

**[1.3] Enforce visibility on persona access**
> System applies visibility rules so that unauthorized actors cannot see restricted personas.

- **User:** Any actor attempting to view a persona (anonymous, authenticated, community member, owner).
- **Functional:** `getViewablePersona()` checks visibility via `canViewPersona()`. Public personas are visible to all. Authenticated personas require a logged-in user. Community personas require shared community membership (checked via `community_members` table). Private personas return null for non-owners. Owner always sees their own persona regardless of visibility.
- **Technical:** Already implemented in `app/actions/personas.ts` (`getViewablePersona()`, lines 110-130) and `lib/auth/permissions.ts` (`canViewPersona()`, lines 217-269). The `canViewPersona` function:
  1. Returns `true` for `public` visibility
  2. Returns `false` for unauthenticated viewers on non-public personas
  3. Returns `true` for `authenticated` visibility with any logged-in user
  4. Returns `false` for `private` visibility (ownership checked separately in `getViewablePersona`)
  5. For `community`: queries `community_members` to find shared communities between viewer and persona
- **Acceptance criteria:**
  - [ ] Anonymous user can view `public` personas but not `authenticated`/`community`/`private`
  - [ ] Authenticated user can view `public` and `authenticated` personas
  - [ ] Community member can view `community` personas in shared communities
  - [ ] Owner can view their own persona at any visibility level
  - [ ] Non-member authenticated user cannot view `community` persona (returns null)
  - [ ] `getViewablePersona` returns null (not 403) for hidden personas — no existence leakage
- **Failure paths:**
  - If community membership query fails: deny access (fail closed)
  - If persona not found: return null (same response as unauthorized)

**[1.4] Enforce visibility in search results**
> System filters search results by visibility so that unauthorized personas never appear in queries.

- **User:** Any actor performing a search (semantic or browse).
- **Functional:** Search results are filtered by the actor's authorization level. Anonymous queries only return `public` personas. Authenticated queries return `public` + `authenticated`. Community-scoped queries also include `community` personas where the searcher is a member. Private personas never appear in search.
- **Technical:** `lib/embeddings/search.ts` (`semanticSearch()`) accepts a `visibility` filter array that maps to a SQL `WHERE visibility IN (...)` clause. The caller determines the appropriate array:
  - Anonymous: `['public']`
  - Authenticated: `['public', 'authenticated']`
  - Community-scoped: `['public', 'authenticated', 'community']` + community membership check
  - MCP: `['public', 'authenticated']` + `mcpEnabled = true` (see `lib/mcp/tools.ts` line 77)
- **Acceptance criteria:**
  - [ ] Anonymous search returns only `public` personas
  - [ ] Authenticated search returns `public` + `authenticated` personas
  - [ ] Community-scoped search includes `community` personas for members
  - [ ] `private` personas never appear in any search results
  - [ ] Embeddings are computed for all personas regardless of visibility (for future changes)
- **Failure paths:**
  - If visibility filter array is empty: return zero results (fail closed)

**Workflow success:** Persona visibility is configurable, visually previewed, immediately enforced on all access paths (direct view, search, MCP), and follows the principle of fail-closed authorization.

---

### Schema

No schema changes. Uses existing column on `lib/db/schema/personas.ts`:

```typescript
// Already exists in lib/db/schema/personas.ts line 30
visibility: text('visibility').notNull().default('community'),
```

Valid values defined in `lib/constants.ts` line 16:
```typescript
export const VISIBILITY_LEVELS = ['public', 'authenticated', 'community', 'private'] as const;
```

### Server Actions

No new server actions. Uses existing actions from `app/actions/personas.ts`:

```typescript
updatePersona(uri: string, raw: UpdatePersonaInput): Promise<Persona>
// Authenticated owner required. Updates base fields including visibility.

getViewablePersona(uri: string): Promise<{ persona: Persona; isOwner: boolean } | null>
// Any actor. Returns persona with isOwner flag, or null if not authorized.
```

### Validation

No new schemas. Uses existing `updatePersonaSchema` from `lib/validations/personas.ts`:

```typescript
// Already exists in lib/validations/personas.ts line 30
export const updatePersonaSchema = z.object({
  // ...
  visibility: z.enum(VISIBILITY_LEVELS).optional(),
});
```

### Edge Cases

- [ ] Persona has `community` visibility but belongs to zero communities: effectively private (no one shares a community)
- [ ] Owner changes visibility from `public` to `private`: persona immediately disappears from all search results and MCP responses
- [ ] Persona is `community` and a community is deleted: visibility scope shrinks; persona may become effectively private
- [ ] Two personas in same community with different visibility: each evaluated independently
- [ ] Concurrent visibility update: last-write-wins (Drizzle `UPDATE` is atomic)
- [ ] Persona with `authenticated` visibility accessed by an AI agent: agent must have authenticated-tier API key

### Migration Notes

None. The `visibility` column already exists with `default('community')`.

### Test Criteria

**Unit tests:**
- `canViewPersona` returns correct boolean for each actor+visibility combination (4x4 matrix)
- `canViewPersona` returns `true` for owner regardless of visibility

**Integration tests:**
- `getViewablePersona` returns persona for authorized viewers and null for unauthorized
- `semanticSearch` with visibility filter excludes personas above the filter level
- Changing visibility from `public` to `private` removes persona from subsequent searches

**E2E tests:**
- Create persona with `public` visibility, verify accessible when logged out
- Change to `community`, verify inaccessible when logged out
- Verify owner can always access at every visibility level

### Implementation Order

1. Create `components/visibility-settings.tsx` — radio group with tier descriptions (maps to story 1.1)
2. Create `components/visibility-preview.tsx` — boolean matrix preview panel (maps to story 1.2)
3. Integrate both into `app/(dashboard)/personas/[uri]/edit/page.tsx`, replacing inline `<Select>` (maps to stories 1.1, 1.2)
4. Write unit tests for `canViewPersona` covering the 4x4 actor/visibility matrix (maps to story 1.3)
5. Write integration tests for `getViewablePersona` and `semanticSearch` visibility filtering (maps to stories 1.3, 1.4)
6. Write E2E test for visibility change flow (maps to story 1.2)

---

## 2. Per-Trait Visibility Overrides

### Overview

While the persona model provides audience separation by design (different personas for different audiences), individual traits within a persona can have a `visibilityOverride` that restricts their visibility below the persona level. This is not an alternative to creating separate personas -- it is a convenience for cases where a user wants most traits at one level but a few traits more restricted. The override can only restrict, never widen: a trait on a `community` persona cannot be made `public` via override.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Trait Visibility                                                        │
│                                                                         │
│ Persona visibility: Community                                           │
│ Individual traits can be further restricted below this level.           │
│                                                                         │
│ ┌─ Skills ────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  React                 [Community ▾]  (matches persona — default)  │ │
│ │  Python                [Community ▾]  (matches persona — default)  │ │
│ │  Mediation             [Private   ▾]  (more restricted)            │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Experience ────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  Google — Senior Engineer        [Community ▾]  (default)          │ │
│ │  Meta — Staff Engineer           [Community ▾]  (default)          │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Note: Overrides can only restrict visibility below the persona level.  │
│ To show a trait to a wider audience, add it to a more public persona.  │
│                                                                         │
│                                                         [Save Changes]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx           ← EXISTS: Client Component
  └─ components/trait-visibility-editor.tsx              ← NEW: Client Component ("use client")
       ├─ components/ui/select.tsx                       ← EXISTS
       ├─ components/ui/badge.tsx                        ← EXISTS
       └─ calls: app/actions/personas.ts → updatePersonaTraits()  ← EXISTS
            └─ writes: lib/db/schema/personas.ts → personas.traits JSONB
```

The `visibilityOverride` field already exists on the `skillSchema` in `lib/validations/traits.ts` (line 27). This feature extends it to all trait types that have structured objects (skills, experience, education, certifications, offerings, focusAreas) and wires it into the view layer.

### Workflows & Stories

---

#### Workflow: Owner sets per-trait visibility overrides

**Preconditions:**
- User is authenticated and owns the persona being edited
- Persona has at least one trait with a structured schema (skills, experience, etc.)

**Stories:**

**[2.1] Display per-trait visibility selectors**
> Owner views per-trait visibility controls so that they can restrict individual traits.

- **User:** Authenticated user on the persona edit page, trait editing section.
- **Functional:** Each structured trait item (skill, experience entry, education entry, certification, offering, focus area) shows a small visibility dropdown next to it. The dropdown offers only tiers at or below the persona's visibility level. If the persona is `community`, the dropdown offers: Community (default), Private. If the persona is `public`, the dropdown offers: Public (default), Authenticated, Community, Private. String-array traits (qualities, values, interests, languages, seekingOpportunities) do not have per-item overrides since they are simple strings without object structure.
- **Technical:** New `components/trait-visibility-editor.tsx` receives `personaVisibility: VisibilityLevel` and renders `<Select>` per trait item. Available options computed by filtering `VISIBILITY_LEVELS` to only include the current persona level and below:
  ```typescript
  const VISIBILITY_RANK = { public: 0, authenticated: 1, community: 2, private: 3 };
  const available = VISIBILITY_LEVELS.filter(v => VISIBILITY_RANK[v] >= VISIBILITY_RANK[personaVisibility]);
  ```
  Default is the persona's own visibility (no override stored). Only stores `visibilityOverride` when the user selects something different from the persona level.
- **Acceptance criteria:**
  - [ ] Each structured trait item shows a visibility dropdown
  - [ ] Dropdown options are limited to persona level and below
  - [ ] Default selection matches persona visibility (no override stored)
  - [ ] String-array traits (qualities, values, etc.) do not show visibility dropdowns
  - [ ] Dropdown is visually compact (does not dominate the trait editing UI)
- **Failure paths:**
  - If persona visibility changes after overrides are set: overrides that are now above persona level are automatically clamped (see story 2.3)

**[2.2] Save and enforce per-trait overrides**
> Owner saves per-trait visibility so that restricted traits are hidden from unauthorized viewers.

- **User:** Authenticated user saving trait changes with visibility overrides.
- **Functional:** When saved, each trait item's `visibilityOverride` is stored in the JSONB `traits` column. When a persona is viewed, the server filters out traits whose `visibilityOverride` restricts the viewer. A trait with `visibilityOverride: 'private'` on a `public` persona is hidden from everyone except the owner.
- **Technical:** The `visibilityOverride` field is already part of `skillSchema` in `lib/validations/traits.ts` (line 27). Extend to other structured trait schemas: `experienceSchema`, `educationSchema`, `certificationSchema`, `offeringSchema`, `focusAreaSchema`. Add `visibilityOverride: z.enum(VISIBILITY_LEVELS).optional()` to each.
  Enforcement: Add a `filterTraitsByViewerVisibility()` helper in `lib/personas/trait-visibility.ts` that takes the full traits JSONB, the viewer's effective visibility level, and returns a filtered copy. Call this from `getViewablePersona()` after the persona-level visibility check passes.
- **Acceptance criteria:**
  - [ ] `visibilityOverride` persists in the JSONB traits column on save
  - [ ] Traits without `visibilityOverride` inherit persona visibility (no filtering)
  - [ ] Trait with `visibilityOverride: 'private'` is hidden from all non-owner viewers
  - [ ] Trait with `visibilityOverride: 'community'` on a `public` persona is hidden from anonymous viewers
  - [ ] Owner always sees all traits regardless of overrides
  - [ ] Override values validate against `VISIBILITY_LEVELS` via Zod
- **Failure paths:**
  - If override value is invalid: Zod rejects the save with validation error
  - If filtering fails: fail closed -- return persona without any traits rather than unfiltered traits

**[2.3] Clamp overrides when persona visibility narrows**
> System automatically clamps overrides so that no trait is more visible than its persona.

- **User:** Owner who changes persona visibility from `public` to `community` while traits have `authenticated` overrides.
- **Functional:** When persona visibility is changed to a more restrictive level, any existing trait overrides that are now above the persona level are automatically clamped down. The user sees a notification explaining the adjustment. Overrides at or below the new level remain unchanged.
- **Technical:** In `updatePersona()` in `app/actions/personas.ts`, after updating the visibility column, check if any trait items in the JSONB have `visibilityOverride` values above the new persona level. If so, update those items to match the new persona level. Use the `VISIBILITY_RANK` mapping to compare levels. Return the adjusted persona with traits.
- **Acceptance criteria:**
  - [ ] Changing persona from `public` to `community` clamps `authenticated` overrides to `community`
  - [ ] Overrides already at or below the new level are unchanged
  - [ ] The save action returns the updated traits with clamped values
  - [ ] Toast notification explains "N trait overrides adjusted to match new visibility level"
- **Failure paths:**
  - If clamping fails: save the visibility change but leave overrides as-is (they will be filtered server-side anyway since the persona-level check is first)

**Workflow success:** Individual traits within a persona can be restricted below the persona level, overrides are enforced on view, and narrowing persona visibility automatically clamps overrides.

---

### Schema

No new tables or columns. The `visibilityOverride` field is stored inside the JSONB `traits` column on each trait item. Already partially implemented for skills:

```typescript
// Already exists in lib/validations/traits.ts line 27
visibilityOverride: z.enum(['public', 'authenticated', 'community', 'private']).optional(),
```

### Server Actions

```typescript
// Modifies existing app/actions/personas.ts — updatePersona()
// After updating persona.visibility, clamp any trait visibilityOverride values
// that exceed the new persona visibility level.

// New helper: lib/personas/trait-visibility.ts
filterTraitsByViewerVisibility(
  traits: Traits,
  viewerLevel: VisibilityLevel,
  isOwner: boolean
): Traits
// Returns a copy of traits with items removed whose visibilityOverride
// is more restrictive than viewerLevel. Owner sees everything.
```

### Validation

Add `visibilityOverride` to remaining structured trait schemas in `lib/validations/traits.ts`:

```typescript
// Add to experienceSchema, educationSchema, certificationSchema, offeringSchema, focusAreaSchema:
visibilityOverride: z.enum(VISIBILITY_LEVELS).optional(),
```

### Edge Cases

- [ ] Trait has `visibilityOverride: 'community'` but persona is `private`: override is irrelevant since persona-level check denies first
- [ ] All traits on a persona have `visibilityOverride: 'private'`: visitor sees persona base layer (name, headline) but no traits
- [ ] User traits sync: `visibilityOverride` is persona-specific and does NOT sync back to user traits (user traits have no visibility)
- [ ] MCP tool responses: `filterTraitsByVisibility` in `lib/mcp/tools.ts` should also respect `visibilityOverride` on individual trait items
- [ ] Batch override: user selects "make all skills private" — convenience but not MVP

### Migration Notes

- Additive only: new optional field on existing JSONB structures. No data migration needed.
- Existing traits without `visibilityOverride` continue to inherit persona visibility (backward compatible).

### Test Criteria

**Unit tests:**
- `filterTraitsByViewerVisibility` correctly filters traits based on override vs viewer level
- `filterTraitsByViewerVisibility` returns all traits for owner regardless of overrides
- Clamp logic correctly adjusts overrides when persona visibility narrows
- Override dropdown only shows tiers at or below persona level

**Integration tests:**
- Save traits with `visibilityOverride`, read back via `getViewablePersona` as non-owner, verify filtered
- Change persona visibility from `public` to `community`, verify `authenticated` overrides clamped

**E2E tests:**
- Edit persona, set one skill to `private`, save, view as non-owner, verify skill is hidden

### Implementation Order

1. Add `visibilityOverride` field to `experienceSchema`, `educationSchema`, `certificationSchema`, `offeringSchema`, `focusAreaSchema` in `lib/validations/traits.ts` (maps to story 2.2)
2. Create `lib/personas/trait-visibility.ts` with `filterTraitsByViewerVisibility()` and `clampTraitOverrides()` helpers (maps to stories 2.2, 2.3)
3. Integrate `filterTraitsByViewerVisibility()` into `getViewablePersona()` in `app/actions/personas.ts` (requires step 2, maps to story 2.2)
4. Add clamp logic to `updatePersona()` when visibility changes (requires step 2, maps to story 2.3)
5. Create `components/trait-visibility-editor.tsx` with per-item dropdowns (maps to story 2.1)
6. Integrate into persona edit page trait sections (requires step 5)
7. Write unit tests for `filterTraitsByViewerVisibility` and `clampTraitOverrides` (requires step 2)
8. Write E2E test for per-trait override flow

---

## 3. MCP Exposure Settings

### Overview

MCP (Model Context Protocol) exposure is an independent visibility layer that controls what AI agents can see about a persona. It is separate from web visibility: a persona can be `public` on the web but hidden from MCP, or vice versa. The MCP system has three tiers of control: (1) per-persona on/off toggle (`mcpEnabled`), (2) per-trait visibility map (`mcpTraitVisibility`), and (3) user-level AI interaction preferences (`mcpPreferences` on the `users` table). All three are already fully implemented; this spec documents the system and defines remaining UI polish.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings > MCP Exposure                                                     │
│                                                                             │
│ ┌─ AI Agent Visibility Controls ────────────────────────────────────┐       │
│ │ Shield icon  Manage what AI assistants discover about you          │       │
│ │              through the Personus MCP server                       │       │
│ │                                    [2 visible] [8 traits]          │       │
│ └────────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│ ┌─── Controls (340px) ──────────────┐  ┌─── Live Preview ─────────────────┐│
│ │                                    │  │                                   ││
│ │ Persona Visibility                 │  │ [Card View] [JSON]                ││
│ │ ┌──────────────────────────────┐   │  │                                   ││
│ │ │ [JS] Jamie Smith       [ON]  │   │  │ ┌──────────────────────────────┐  ││
│ │ │      community               │   │  │ │ [JS] Jamie Smith             │  ││
│ │ │ [AD] Acme Design      [OFF]  │   │  │ │     React, Python, Node.js   │  ││
│ │ └──────────────────────────────┘   │  │ │     Contact: mediated only   │  ││
│ │                                    │  │ └──────────────────────────────┘  ││
│ │ Trait Controls                     │  │                                   ││
│ │ ┌──────────────────────────────┐   │  │ ┌──────── Skills ─────────────┐  ││
│ │ │ Skills              [ON]     │   │  │ │ React  Python  Node.js      │  ││
│ │ │ Experience          [ON]     │   │  │ └─────────────────────────────┘  ││
│ │ │ Education           [OFF]    │   │  │                                   ││
│ │ │ Endorsements        [ON]     │   │  │ ┌──────── Qualities ──────────┐  ││
│ │ │ Offerings           [ON]     │   │  │ │ Detail-oriented  Empathetic │  ││
│ │ │ Qualities           [ON]     │   │  │ └─────────────────────────────┘  ││
│ │ │ Values              [OFF]    │   │  │                                   ││
│ │ │ Interests           [OFF]    │   │  │ --- or JSON tab: ---              ││
│ │ │ Focus Areas         [ON]     │   │  │ {                                 ││
│ │ │ Seeking Opportunities [ON]   │   │  │   "uri": "jamie-smith-x7k",      ││
│ │ │ Languages           [ON]     │   │  │   "displayName": "Jamie Smith",   ││
│ │ │ Certifications      [OFF]    │   │  │   "skills": [...],                ││
│ │ └──────────────────────────────┘   │  │   "aiPreferences": {...}          ││
│ │                                    │  │ }                                  ││
│ │ AI Interaction Preferences         │  │                                   ││
│ │ ┌──────────────────────────────┐   │  └───────────────────────────────────┘│
│ │ │ Allow search matching  [ON]  │   │                                       │
│ │ │ Allow introductions    [ON]  │   │                                       │
│ │ │ Allow direct messages  [OFF] │   │                                       │
│ │ └──────────────────────────────┘   │                                       │
│ └────────────────────────────────────┘                                       │
│                                                                             │
│ ─── Discovery Scenarios ─── (3 cards: Claude, ChatGPT, Perplexity)         │
│ ─── MCP Tools Reference ─── (4 cards: search, get_persona, intro, guilds)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/settings/page.tsx                          ← EXISTS: Server Component
  └─ app/(dashboard)/settings/settings-tabs.tsx            ← EXISTS: Client Component
       └─ app/(dashboard)/settings/mcp-exposure-settings.tsx ← EXISTS: Client Component (780 lines)
            ├─ PersonaToggle                                 ← EXISTS: Sub-component
            ├─ TraitToggle                                   ← EXISTS: Sub-component
            ├─ CardPreview                                   ← EXISTS: Sub-component
            ├─ JsonPreview                                   ← EXISTS: Sub-component
            └─ calls: app/actions/mcp.ts                     ← EXISTS: Server Actions
                 ├─ togglePersonaMcp(uri, enabled)
                 ├─ updateMcpTraitVisibility(uri, map)
                 └─ updateMcpPreferences(prefs)
                      └─ reads/writes: lib/db/schema/personas.ts (mcpEnabled, mcpTraitVisibility)
                                       lib/db/schema/users.ts (mcpPreferences)
```

The MCP exposure UI is fully implemented in `app/(dashboard)/settings/mcp-exposure-settings.tsx` (780 lines). Server actions are in `app/actions/mcp.ts`. MCP tool filtering is in `lib/mcp/tools.ts`. This section documents the existing system and defines remaining enhancements.

### Workflows & Stories

---

#### Workflow: Owner manages MCP exposure for their personas

**Preconditions:**
- User is authenticated via Clerk
- User has at least one persona
- User navigates to Settings > MCP Exposure tab

**Stories:**

**[3.1] Toggle per-persona MCP visibility**
> Owner toggles a persona's MCP visibility so that they control which personas AI agents can discover.

- **User:** Authenticated user on the MCP Exposure settings page.
- **Functional:** Each persona appears as a row with display name, current web visibility badge, and an on/off toggle. Toggling on makes the persona discoverable via MCP tools. Toggling off hides it from all MCP responses. The toggle uses optimistic updates (instant UI change, async server save). A toast confirms success. The selected persona highlights to show which one the trait controls apply to.
- **Technical:** Already implemented. `PersonaToggle` sub-component in `mcp-exposure-settings.tsx` (lines 168-217). Calls `togglePersonaMcp(uri, enabled)` from `app/actions/mcp.ts` (lines 99-119). Writes to `personas.mcpEnabled` column. On failure, rolls back the optimistic state.
- **Acceptance criteria:**
  - [ ] Each persona shows a toggle switch
  - [ ] Toggle updates `personas.mcpEnabled` in database
  - [ ] Optimistic update: UI changes immediately, rolls back on error
  - [ ] Toast: "Persona visible to AI agents" / "Persona hidden from AI agents"
  - [ ] Toggling off grays out the trait controls for that persona
- **Failure paths:**
  - If save fails: revert toggle, show error toast "Failed to update persona visibility"

**[3.2] Configure per-trait MCP visibility**
> Owner toggles individual trait categories so that they fine-tune what AI agents see on each persona.

- **User:** Authenticated user with a persona selected and MCP-enabled.
- **Functional:** Trait toggles show 12 professional trait categories (skills, experience, education, endorsements, offerings, qualities, values, interests, focusAreas, seekingOpportunities, languages, certifications). Each has an on/off switch. Defaults defined in `MCP_DEFAULT_TRAIT_VISIBILITY`: skills, experience, endorsements, offerings, qualities, focusAreas, seekingOpportunities, and languages default ON; education, values, interests, certifications default OFF. Commerce traits are not shown in the UI (all default OFF, opt-in via future commerce settings). Changes are saved per-persona. If the persona is MCP-disabled, all toggles show as disabled.
- **Technical:** Already implemented. `TraitToggle` sub-component in `mcp-exposure-settings.tsx` (lines 219-248). `UI_TRAIT_KEYS` array (lines 66-79) defines the 12 visible keys. Calls `updateMcpTraitVisibility(uri, map)` from `app/actions/mcp.ts` (lines 124-147). Writes to `personas.mcpTraitVisibility` JSONB column. Validated by `mcpTraitVisibilitySchema` from `lib/validations/mcp.ts`.
- **Acceptance criteria:**
  - [ ] 12 trait toggles render for the selected persona
  - [ ] Defaults match `MCP_DEFAULT_TRAIT_VISIBILITY` from `@/lib/constants`
  - [ ] Toggle updates `personas.mcpTraitVisibility` JSONB in database
  - [ ] Toggles are disabled when persona MCP is off
  - [ ] Commerce trait keys are not shown in the UI
  - [ ] Optimistic update with rollback on failure
- **Failure paths:**
  - If Zod validation rejects the visibility map: show error toast, revert toggle

**[3.3] Configure user-level AI interaction preferences**
> Owner sets global AI preferences so that they control how agents interact with all their personas.

- **User:** Authenticated user on the MCP Exposure settings page.
- **Functional:** Three user-level toggles: "Allow search matching" (default ON), "Allow introductions" (default ON), "Allow direct messages" (default OFF). These are global (apply across all personas). Stored on the `users.mcpPreferences` JSONB column. The MCP tools check these before including a persona in results or allowing contact.
- **Technical:** Already implemented. Three `Switch` components in `mcp-exposure-settings.tsx` (lines 612-646). Calls `updateMcpPreferences(prefs)` from `app/actions/mcp.ts` (lines 152-173). Writes to `users.mcpPreferences` JSONB. Validated by `mcpPreferencesSchema` from `lib/validations/mcp.ts`. Enforced in `lib/mcp/tools.ts`:
  - `mcpSearch()` checks `mcpPrefs.searchMatching` (line 97)
  - `mcpRequestIntroduction()` checks `mcpPrefs.introductions` (line 235)
- **Acceptance criteria:**
  - [ ] Three toggle switches render with correct defaults
  - [ ] Changes save to `users.mcpPreferences` JSONB
  - [ ] `mcpSearch()` excludes personas when `searchMatching` is false
  - [ ] `mcpRequestIntroduction()` rejects when `introductions` is false
  - [ ] Preferences are global (not per-persona)
- **Failure paths:**
  - If save fails: revert toggle, show error toast

**[3.4] Live preview of MCP response**
> Owner sees exactly what AI agents will receive so that they can make informed decisions.

- **User:** Authenticated user viewing the live preview panel.
- **Functional:** The right panel shows either a "Card View" (visual representation of what agents see) or a "JSON" view (raw MCP response payload). Both update in real-time as the user toggles trait visibility. If the persona is MCP-disabled, the preview shows a placeholder: "Persona hidden from AI agents." The JSON view shows the exact shape of data that `mcpGetPersona()` would return, including AI interaction preferences.
- **Technical:** Already implemented. `CardPreview` (lines 250-374) and `JsonPreview` (lines 376-424) sub-components in `mcp-exposure-settings.tsx`. Tab switching via `Tabs` from shadcn/ui. Card view renders: avatar, display name, visible skills as badges, qualities, experience entries, and offerings. JSON view renders `JSON.stringify(result, null, 2)` of the filtered persona object.
- **Acceptance criteria:**
  - [ ] Card view updates immediately when traits are toggled
  - [ ] JSON view shows the exact MCP response structure
  - [ ] Disabled persona shows "Persona hidden from AI agents" placeholder
  - [ ] Tab switching between Card and JSON preserves state
  - [ ] Preview reflects current trait toggle state (not saved state)
- **Failure paths:**
  - If persona has no traits: preview shows persona base info only (name, type, contact method)

**[3.5] Enforce MCP filtering in tool responses**
> System filters MCP tool responses so that only permitted data reaches AI agents.

- **User:** AI agent calling MCP tools (personus_search, personus_get_persona, personus_request_introduction).
- **Functional:** All MCP tool handlers enforce three layers of filtering: (1) `mcpEnabled` must be true for the persona, (2) `mcpTraitVisibility` map filters which trait categories appear, (3) `mcpPreferences` on the user gates search matching and introductions. Commerce traits are separately handled with the `agent_local` tier (budget, blocklists, authorization) NEVER appearing in MCP responses.
- **Technical:** Already implemented in `lib/mcp/tools.ts`:
  - `getEffectiveTraitVisibility()` (lines 28-38): merges stored visibility with `MCP_DEFAULT_TRAIT_VISIBILITY`
  - `filterTraitsByVisibility()` (lines 43-54): removes trait keys where visibility is false
  - `mcpSearch()` (lines 64-156): checks `mcpEnabled`, `searchMatching` pref, applies trait filtering
  - `mcpGetPersona()` (lines 164-199): checks `mcpEnabled`, applies trait filtering
  - `mcpRequestIntroduction()` (lines 207-265): checks `mcpEnabled` and `introductions` pref
  - `mcpGetCommercePersona()` (lines 304-379): enforces privacy tiers, never returns `COMMERCE_AGENT_LOCAL_KEYS`
- **Acceptance criteria:**
  - [ ] `mcpSearch` returns only personas with `mcpEnabled: true`
  - [ ] `mcpSearch` excludes personas where owner has `searchMatching: false`
  - [ ] `mcpGetPersona` returns 404-style error for MCP-disabled personas (no existence leakage)
  - [ ] Trait categories with `mcpTraitVisibility[key] = false` are omitted from responses
  - [ ] `COMMERCE_AGENT_LOCAL_KEYS` (budgetPreferences, blockedBrands, agentAuthorization, returnPreferences) never appear in any MCP response
  - [ ] `mcpRequestIntroduction` rejects when owner has `introductions: false`
- **Failure paths:**
  - If trait visibility map is empty or corrupt: fall back to `MCP_DEFAULT_TRAIT_VISIBILITY`
  - If mcpPreferences is empty: fall back to `DEFAULT_MCP_PREFERENCES` (searchMatching: true, introductions: true, directMessages: false)

**Workflow success:** Owners have full, granular control over AI agent discovery at three levels (persona, trait, preferences), with a live preview, and enforcement is applied in all MCP tool handlers.

---

#### Workflow: Owner understands MCP through discovery scenarios

**Preconditions:**
- User is on the MCP Exposure settings page

**Stories:**

**[3.6] View discovery scenarios and tool reference**
> Owner reviews example queries so that they understand how AI agents use their data.

- **User:** Authenticated user scrolling below the controls section.
- **Functional:** Three example scenarios show how Claude, ChatGPT, and Perplexity might discover and present the user's persona. Each card shows: the agent name, a sample user query, the AI's response (using the user's persona data), and what fields matched. Below that, four MCP tool reference cards explain each tool: name, description, and data exposed.
- **Technical:** Already implemented. `discoveryScenarios` array (lines 99-127) and `mcpTools` array (lines 129-164) in `mcp-exposure-settings.tsx`. Static content, no server calls.
- **Acceptance criteria:**
  - [ ] Three discovery scenario cards render with agent names and example queries
  - [ ] Four MCP tool reference cards render with tool names and exposed data
  - [ ] Content is readable and helps users understand the MCP value proposition
- **Failure paths:**
  - None (static content)

**Workflow success:** Users understand what MCP exposure means, how agents use their data, and feel empowered by the granular controls.

---

### Schema

No schema changes. Uses existing columns:

```typescript
// lib/db/schema/personas.ts lines 42-43
mcpEnabled: boolean('mcp_enabled').notNull().default(false),
mcpTraitVisibility: jsonb('mcp_trait_visibility').notNull().default('{}'),

// lib/db/schema/users.ts line 12
mcpPreferences: jsonb('mcp_preferences').notNull().default('{}'),
```

### Server Actions

All exist in `app/actions/mcp.ts`:

```typescript
getMcpSettingsForUser(): Promise<McpSettingsData>
// Authenticated user required. Returns all personas with MCP settings + user prefs.

togglePersonaMcp(uri: string, enabled: boolean): Promise<Persona>
// Authenticated owner required. Toggles mcpEnabled on one persona.

updateMcpTraitVisibility(uri: string, traitVisibility: Record<string, boolean>): Promise<Persona>
// Authenticated owner required. Updates the mcpTraitVisibility JSONB map.

updateMcpPreferences(prefs: McpPreferences): Promise<McpPreferences>
// Authenticated user required. Updates user-level mcpPreferences.
```

### Validation

All exist in `lib/validations/mcp.ts`:

```typescript
export const updatePersonaMcpSchema = z.object({
  mcpEnabled: z.boolean(),
});

export const mcpTraitVisibilitySchema = z.record(
  z.enum(MCP_TRAIT_KEYS),
  z.boolean()
);

export const mcpPreferencesSchema = z.object({
  searchMatching: z.boolean(),
  introductions: z.boolean(),
  directMessages: z.boolean(),
});
```

### Edge Cases

- [ ] Persona is `public` on web but `mcpEnabled: false`: visible in browser, invisible to AI agents
- [ ] Persona is `private` on web but `mcpEnabled: true`: MCP tools cannot see it (web visibility is checked first in search)
- [ ] User has `searchMatching: false` but `introductions: true`: persona does not appear in search but can be contacted directly by URI
- [ ] All personas have MCP disabled: MCP search returns empty results for this user
- [ ] Commerce persona: `agent_local` traits are never exposed even if `mcpTraitVisibility` has them set to true (enforcement is independent of user settings)
- [ ] MCP trait visibility map has keys not in `MCP_TRAIT_KEYS`: Zod validation rejects the save

### Migration Notes

None. All columns and JSONB structures already exist.

### Test Criteria

**Unit tests:**
- `getEffectiveTraitVisibility` correctly merges stored values with defaults
- `filterTraitsByVisibility` removes traits where visibility is false
- `COMMERCE_AGENT_LOCAL_KEYS` are never included in filtered output

**Integration tests:**
- `mcpSearch` with `mcpEnabled: false` persona: persona excluded from results
- `mcpSearch` with `searchMatching: false` user: persona excluded from results
- `mcpGetPersona` with trait visibility map: only enabled traits returned
- `mcpRequestIntroduction` with `introductions: false`: returns rejection message

**E2E tests:**
- Navigate to Settings > MCP Exposure, toggle persona on/off, verify preview updates
- Toggle trait off, switch to JSON view, verify trait absent from response
- Toggle AI preference, verify reflected in preview

### Implementation Order

1. No new implementation needed -- all stories are already implemented
2. Enhancement: Add per-trait visibility override awareness to `filterTraitsByVisibility` in `lib/mcp/tools.ts` (when section 2 is implemented)
3. Enhancement: Personalize discovery scenario cards to use the user's actual persona data instead of hardcoded "Carmen Delgado" examples
4. Write comprehensive integration tests for MCP tool filtering (maps to story 3.5)
5. Write E2E tests for MCP settings page interactions (maps to stories 3.1-3.4)

---

## 4. Contact Preferences

### Overview

Contact preferences are a GDPR-inspired 4-category system that controls how people and AI agents can interact with a persona. They are stored as a JSONB column (`contactPreferences`) on the `personas` table and provide fine-grained consent management across four domains: discovery, contact, data sharing, and communication. Contact preferences are independent of visibility -- they control HOW interactions happen, not WHETHER the persona is visible.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Contact Preferences                                                     │
│ How people and AI agents can interact with this persona                 │
│                                                                         │
│ ┌─ Discovery ──────────────────────────────────────────────────────────┐│
│ │  Search visibility      [Authenticated ▾]                            ││
│ │    (public | authenticated | connections | off)                       ││
│ │                                                                      ││
│ │  AI matching            [ON]                                         ││
│ │    Allow AI agents to include this persona in recommendations        ││
│ │                                                                      ││
│ │  Endorsement display    [Show All ▾]                                 ││
│ │    (show_all | count_only | hide)                                    ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Contact ────────────────────────────────────────────────────────────┐│
│ │  Direct messages        [Community Members ▾]                        ││
│ │    (anyone | connections | community_members | off)                   ││
│ │                                                                      ││
│ │  Connection requests    [Open ▾]                                     ││
│ │    (open | require_intro | off)                                      ││
│ │                                                                      ││
│ │  Opportunity contact    [ON]                                         ││
│ │    Allow recruiters and partners to reach out about opportunities    ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Data Sharing ───────────────────────────────────────────────────────┐│
│ │  Analytics contribution [ON]                                         ││
│ │    Contribute anonymized usage data to improve Personus              ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ Communication ──────────────────────────────────────────────────────┐│
│ │  Activity notifications [Important ▾]                                ││
│ │    (all | important | off)                                           ││
│ │                                                                      ││
│ │  Coach nudges           [ON]                                         ││
│ │    Receive suggestions from the Persona Coach to improve your profile││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                                                         [Save Changes]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/personas/[uri]/edit/page.tsx                 ← EXISTS: Client Component
  └─ components/contact-preferences-editor.tsx                ← NEW: Client Component ("use client")
       ├─ components/ui/select.tsx                            ← EXISTS
       ├─ components/ui/switch.tsx                            ← EXISTS
       ├─ components/ui/card.tsx                              ← EXISTS
       ├─ components/ui/separator.tsx                         ← EXISTS
       └─ calls: app/actions/personas.ts → updateContactPreferences()  ← NEW
            └─ writes: lib/db/schema/personas.ts → personas.contactPreferences JSONB

Also reads:
  lib/db/seed/contact-preferences-defaults.ts                ← EXISTS: Default values
  lib/validations/traits.ts → contactPreferencesSchema       ← EXISTS
  types/index.ts → ContactPreferences interface              ← EXISTS
```

The `ContactPreferences` interface exists in `types/index.ts` (lines 64-82), the Zod schema exists in `lib/validations/traits.ts` (lines 79-105), and defaults exist in `lib/db/seed/contact-preferences-defaults.ts`. The UI editor component and dedicated server action are new.

### Workflows & Stories

---

#### Workflow: Owner configures contact preferences

**Preconditions:**
- User is authenticated and owns the persona being edited
- User is on the persona edit page

**Stories:**

**[4.1] Display contact preferences with 4-category layout**
> Owner views contact preferences so that they understand and control how people interact with this persona.

- **User:** Authenticated user editing their own persona.
- **Functional:** Contact preferences render as four collapsible card sections: Discovery, Contact, Data Sharing, Communication. Each section shows its fields with current values. New personas use defaults from `lib/db/seed/contact-preferences-defaults.ts`. Each field has a label and a brief description explaining what it controls.
- **Technical:** New `components/contact-preferences-editor.tsx` receives `contactPreferences: ContactPreferences` and `onSave: (prefs: ContactPreferences) => Promise<void>` props. Uses:
  - `SEARCH_VISIBILITY_LEVELS` for searchVisibility select (4 options)
  - `ENDORSEMENT_VISIBILITY_LEVELS` for endorsementVisibility select (3 options)
  - `DM_POLICIES` for directMessages select (4 options)
  - `CONNECTION_REQUEST_POLICIES` for connectionRequests select (3 options)
  - `NOTIFICATION_LEVELS` for activityNotifications select (3 options)
  - Boolean switches for: aiMatching, opportunityContact, analyticsContribution, coachNudges
  All constants imported from `@/lib/constants`.
- **Acceptance criteria:**
  - [ ] Four category cards render: Discovery, Contact, Data Sharing, Communication
  - [ ] All fields display current values from `persona.contactPreferences`
  - [ ] New personas (empty `contactPreferences`) show defaults from `defaultContactPreferences`
  - [ ] Each field has a descriptive label
  - [ ] Select dropdowns show human-readable labels (not raw enum values)
- **Failure paths:**
  - If `contactPreferences` is empty `{}`: fall back to `defaultContactPreferences`
  - If `contactPreferences` has partial data: merge with defaults for missing fields

**[4.2] Save contact preferences**
> Owner saves contact preference changes so that they take effect immediately.

- **User:** Authenticated user modifying any contact preference field.
- **Functional:** Changes are saved when the user clicks "Save Changes". All four categories are saved as a single JSONB document. Validation ensures all required fields are present and values are from the allowed enums. Toast confirms success.
- **Technical:** New server action `updateContactPreferences(uri: string, prefs: ContactPreferences)` in `app/actions/personas.ts`. Validates with `contactPreferencesSchema` from `lib/validations/traits.ts`. Writes to `personas.contactPreferences` JSONB column. Requires ownership check via `ensureUser()` + `WHERE user_id = ?`.
- **Acceptance criteria:**
  - [ ] Save persists all four categories as a single JSONB document
  - [ ] Zod validation rejects invalid enum values
  - [ ] Toast: "Contact preferences updated" on success
  - [ ] Changes take effect immediately for subsequent viewers
  - [ ] Activity event logged: "Updated contact preferences for {displayName}"
- **Failure paths:**
  - If Zod validation fails: show validation errors inline, do not save
  - If DB update fails: show error toast "Failed to save contact preferences"
  - If persona not found: throw "Persona not found" error

**[4.3] Apply user-level defaults to new personas**
> System applies default contact preferences so that new personas start with sensible settings.

- **User:** Owner creating a new persona.
- **Functional:** When a persona is created, its `contactPreferences` is initialized from the user's `defaultContactPreferences` on the `users` table. If the user has not customized defaults, the system defaults from `lib/db/seed/contact-preferences-defaults.ts` are used. This ensures new personas are immediately configured without the owner having to manually set every field.
- **Technical:** Modify `createPersona()` in `app/actions/personas.ts` to:
  1. Look up `users.defaultContactPreferences` for the current user
  2. If non-empty, use it as the initial `contactPreferences`
  3. If empty `{}`, use `defaultContactPreferences` from `lib/db/seed/contact-preferences-defaults.ts`
  Currently `createPersona()` sets `contactPreferences: {}` (line 145). Change to resolved defaults.
- **Acceptance criteria:**
  - [ ] New persona's `contactPreferences` is populated from user defaults
  - [ ] If user has no custom defaults, system defaults are used
  - [ ] Resulting `contactPreferences` passes `contactPreferencesSchema` validation
  - [ ] Owner can immediately modify defaults on the new persona
- **Failure paths:**
  - If user `defaultContactPreferences` is corrupt: fall back to system defaults

**[4.4] Enforce discovery preferences in search**
> System respects discovery preferences so that search results honor the owner's choices.

- **User:** Any actor performing a search.
- **Functional:** The `searchVisibility` field in discovery preferences adds a second filter layer on top of persona visibility. If persona visibility is `public` but `searchVisibility` is `authenticated`, the persona appears in search only for authenticated users. If `searchVisibility` is `off`, the persona never appears in search (but can still be accessed by direct URL). The `aiMatching` boolean controls whether the persona appears in AI recommendation results.
- **Technical:** Enhance `semanticSearch()` in `lib/embeddings/search.ts` to also check `contactPreferences.discovery.searchVisibility` after the persona-level visibility filter. For MCP: `aiMatching` is already partially covered by the user-level `mcpPreferences.searchMatching`, but should also be checked per-persona in `contactPreferences.discovery.aiMatching`.
- **Acceptance criteria:**
  - [ ] Persona with `searchVisibility: 'off'` never appears in search results
  - [ ] Persona with `searchVisibility: 'authenticated'` only appears for logged-in searchers
  - [ ] Persona with `searchVisibility: 'connections'` only appears for users with endorsement-graph connection
  - [ ] `aiMatching: false` excludes persona from AI recommendation results
  - [ ] Direct URL access is NOT affected by `searchVisibility` (only search results)
- **Failure paths:**
  - If `contactPreferences` is empty: use default `searchVisibility: 'authenticated'`

**[4.5] Enforce contact preferences on contact requests**
> System checks contact preferences so that unwanted contact requests are blocked.

- **User:** Any actor attempting to send a contact request.
- **Functional:** The contact category fields gate inbound contact:
  - `directMessages`: who can send DMs (`anyone`, `connections`, `community_members`, `off`)
  - `connectionRequests`: how connection requests work (`open`, `require_intro`, `off`)
  - `opportunityContact`: whether recruiter/partner outreach is accepted (boolean)
  If a contact attempt fails the preference check, the actor sees a human-readable reason: "This person only accepts messages from community members."
- **Technical:** Add `checkContactAuthorization()` helper to `lib/auth/permissions.ts` that takes the target persona's `contactPreferences`, the actor's relationship to the persona (anonymous, authenticated, community member, connection), and the contact type. Return `{ allowed: boolean, reason?: string }`. Call from contact request creation actions in `app/actions/contacts.ts`.
- **Acceptance criteria:**
  - [ ] Contact request to persona with `directMessages: 'off'` returns rejection with reason
  - [ ] Contact request from non-community-member to persona with `directMessages: 'community_members'` returns rejection
  - [ ] Contact request from non-connection to persona with `connectionRequests: 'require_intro'` requires an introducer
  - [ ] Contact request honors `opportunityContact: false` for recruiter-flagged requests
  - [ ] Rejection messages are user-friendly, not technical
- **Failure paths:**
  - If `contactPreferences.contact` is missing: use default (directMessages: `community_members`, connectionRequests: `open`)

**[4.6] Enforce endorsement display preferences**
> System respects endorsement visibility preferences so that endorsements render according to owner wishes.

- **User:** Any actor viewing a persona's endorsements.
- **Functional:** The `endorsementVisibility` field in discovery preferences controls how endorsements are displayed:
  - `show_all`: full endorsement details (endorser name, text, strength)
  - `count_only`: shows "12 endorsements" but not who or what
  - `hide`: no endorsement information at all
  This is a display preference, not an authorization check -- the endorsements still exist and are returned to the owner.
- **Technical:** In the persona view components (`app/(dashboard)/personas/[uri]/page.tsx` and `app/p/[uri]/persona-public-view.tsx`), read `persona.contactPreferences.discovery.endorsementVisibility` and render accordingly. For `count_only`, query `countEndorsements()` from `lib/db/queries.ts` and display the count. For `hide`, skip the endorsement section entirely.
- **Acceptance criteria:**
  - [ ] `show_all`: endorsements render with full details
  - [ ] `count_only`: only the count is shown, no endorser names or text
  - [ ] `hide`: endorsement section is completely hidden
  - [ ] Owner always sees full endorsement details regardless of setting
  - [ ] MCP responses respect the same endorsement display preferences
- **Failure paths:**
  - If endorsementVisibility is missing: default to `show_all`

**Workflow success:** Contact preferences provide granular control over discovery, contact, data sharing, and communication, with system-wide enforcement across search, contact requests, and endorsement display.

---

#### Workflow: Owner sets user-level default contact preferences

**Preconditions:**
- User is authenticated
- User navigates to Settings page

**Stories:**

**[4.7] View and edit default contact preferences**
> Owner configures default contact preferences so that new personas start with their preferred settings.

- **User:** Authenticated user on the Settings page (Account tab).
- **Functional:** A "Default Contact Preferences" section shows the same 4-category editor used on persona edit, but saves to `users.defaultContactPreferences` instead of a specific persona. Changes here do NOT retroactively update existing personas -- they only apply to newly created personas.
- **Technical:** New `components/default-contact-preferences.tsx` (or section within settings page). Calls new server action `updateDefaultContactPreferences(prefs: ContactPreferences)` in `app/actions/profile.ts`. Writes to `users.defaultContactPreferences` JSONB column. Validation uses the same `contactPreferencesSchema`.
- **Acceptance criteria:**
  - [ ] Default preferences editor renders on Settings > Account tab
  - [ ] Save updates `users.defaultContactPreferences` in database
  - [ ] Changes do NOT retroactively modify existing personas
  - [ ] New personas created after the change use the new defaults
  - [ ] Info text explains "These defaults apply to new personas only"
- **Failure paths:**
  - If save fails: show error toast, do not modify stored defaults

**Workflow success:** Users can set organization-wide default contact preferences that automatically apply to new personas while leaving existing personas unaffected.

---

### Schema

No schema changes. Uses existing columns:

```typescript
// lib/db/schema/personas.ts line 31
contactPreferences: jsonb('contact_preferences').notNull().default('{}'),

// lib/db/schema/users.ts line 11
defaultContactPreferences: jsonb('default_contact_preferences').notNull().default('{}'),
```

### Server Actions

```typescript
// NEW — add to app/actions/personas.ts
updateContactPreferences(uri: string, prefs: ContactPreferences): Promise<Persona>
// Authenticated owner required. Updates persona.contactPreferences JSONB.
// Validates with contactPreferencesSchema. Logs activity event.

// NEW — add to app/actions/profile.ts
updateDefaultContactPreferences(prefs: ContactPreferences): Promise<void>
// Authenticated user required. Updates users.defaultContactPreferences JSONB.
// Validates with contactPreferencesSchema.

// MODIFY — app/actions/personas.ts → createPersona()
// Change contactPreferences initialization from {} to resolved defaults:
// 1. Check users.defaultContactPreferences
// 2. Fall back to defaultContactPreferences from lib/db/seed/contact-preferences-defaults.ts

// NEW — add to lib/auth/permissions.ts
checkContactAuthorization(
  contactPreferences: ContactPreferences,
  actorRelationship: 'anonymous' | 'authenticated' | 'community_member' | 'connection',
  contactType: 'dm' | 'connection_request' | 'opportunity'
): { allowed: boolean; reason?: string }
// Pure function — no DB queries. Evaluates contact preferences against actor.
```

### Validation

Already exists in `lib/validations/traits.ts` (lines 79-105):

```typescript
export const contactPreferencesSchema = z.object({
  discovery: z.object({
    searchVisibility: z.enum(SEARCH_VISIBILITY_LEVELS),
    aiMatching: z.boolean(),
    endorsementVisibility: z.enum(ENDORSEMENT_VISIBILITY_LEVELS),
  }).optional(),
  contact: z.object({
    directMessages: z.enum(DM_POLICIES),
    connectionRequests: z.enum(CONNECTION_REQUEST_POLICIES),
    opportunityContact: z.boolean(),
  }).optional(),
  dataSharing: z.object({
    analyticsContribution: z.boolean(),
  }).optional(),
  communication: z.object({
    activityNotifications: z.enum(NOTIFICATION_LEVELS),
    coachNudges: z.boolean(),
  }).optional(),
});
```

**Enhancement needed:** Make all four categories required (not optional) when saving via the dedicated action, while keeping optional for backward compatibility in other contexts:

```typescript
// NEW — add to lib/validations/traits.ts
export const contactPreferencesFullSchema = z.object({
  discovery: z.object({
    searchVisibility: z.enum(SEARCH_VISIBILITY_LEVELS),
    aiMatching: z.boolean(),
    endorsementVisibility: z.enum(ENDORSEMENT_VISIBILITY_LEVELS),
  }),
  contact: z.object({
    directMessages: z.enum(DM_POLICIES),
    connectionRequests: z.enum(CONNECTION_REQUEST_POLICIES),
    opportunityContact: z.boolean(),
  }),
  dataSharing: z.object({
    analyticsContribution: z.boolean(),
  }),
  communication: z.object({
    activityNotifications: z.enum(NOTIFICATION_LEVELS),
    coachNudges: z.boolean(),
  }),
});
```

### Edge Cases

- [ ] `contactPreferences` is empty `{}`: all checks fall back to `defaultContactPreferences`
- [ ] Partial `contactPreferences` (e.g., only `discovery` set): merge with defaults for missing categories
- [ ] `searchVisibility: 'off'` + `visibility: 'public'`: persona accessible by direct URL but never appears in search
- [ ] `directMessages: 'off'` + `connectionRequests: 'open'`: can receive connection requests but not DMs
- [ ] `opportunityContact: false` but no way to classify a request as "opportunity": classification deferred to AI triage (future)
- [ ] User changes `defaultContactPreferences`: existing personas are NOT retroactively updated
- [ ] `endorsementVisibility: 'hide'` on persona with 50 endorsements: count and details hidden from viewers
- [ ] Contact preferences on a `private` persona: preferences exist but are moot since no one can see the persona

### Migration Notes

- Additive only. The `contactPreferences` column exists with `default('{}')`.
- Existing personas with empty `{}` will use `defaultContactPreferences` at read time (no backfill needed).
- Optional: a backfill script could populate existing empty `contactPreferences` with the system defaults for consistency:
  ```sql
  UPDATE personas
  SET contact_preferences = '{"discovery":{"searchVisibility":"authenticated","aiMatching":true,"endorsementVisibility":"show_all"},"contact":{"directMessages":"community_members","connectionRequests":"open","opportunityContact":true},"dataSharing":{"analyticsContribution":true},"communication":{"activityNotifications":"important","coachNudges":true}}'::jsonb
  WHERE contact_preferences = '{}'::jsonb;
  ```

### Test Criteria

**Unit tests:**
- `checkContactAuthorization` returns correct `{allowed, reason}` for each DM policy + actor combination
- `checkContactAuthorization` handles `connectionRequests: 'require_intro'` correctly
- `contactPreferencesSchema` validates correct input and rejects invalid enum values
- Default merge: partial preferences + defaults = complete preferences

**Integration tests:**
- `updateContactPreferences` saves and retrieves correct JSONB
- `createPersona` uses user defaults when available, system defaults when not
- `semanticSearch` respects `searchVisibility` filter
- Contact request rejected when `directMessages: 'off'`

**E2E tests:**
- Edit persona, change direct messages to "off", save, verify toast
- Create new persona, verify contact preferences populated from user defaults
- View persona as non-owner, verify endorsement display matches preference

### Implementation Order

1. Create `contactPreferencesFullSchema` in `lib/validations/traits.ts` (maps to story 4.2)
2. Create `updateContactPreferences` server action in `app/actions/personas.ts` (requires step 1, maps to story 4.2)
3. Create `checkContactAuthorization` helper in `lib/auth/permissions.ts` (maps to story 4.5)
4. Modify `createPersona` to resolve defaults from user or system (maps to story 4.3)
5. Create `components/contact-preferences-editor.tsx` with 4-category layout (maps to story 4.1)
6. Integrate editor into `app/(dashboard)/personas/[uri]/edit/page.tsx` (requires step 5)
7. Create `updateDefaultContactPreferences` server action in `app/actions/profile.ts` (maps to story 4.7)
8. Add default preferences section to Settings page (requires steps 5, 7)
9. Integrate `searchVisibility` enforcement into `lib/embeddings/search.ts` (maps to story 4.4)
10. Integrate `endorsementVisibility` display logic into persona view pages (maps to story 4.6)
11. Write unit tests for `checkContactAuthorization` and default merge logic (requires steps 2, 3)
12. Write integration tests for search visibility enforcement (requires step 9)
13. Write E2E tests for contact preferences editor flow (requires steps 5, 6)

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Implement visibility radio group with tier descriptions | `personas`, `visibility` | -- | -- |
| 1.2 | Add visibility preview panel to persona edit | `personas`, `visibility` | 1.1 | -- |
| 1.3 | Enforce persona visibility in getViewablePersona | `personas`, `visibility`, `auth` | -- | -- |
| 1.4 | Enforce persona visibility in search results | `personas`, `visibility`, `search` | 1.3 | -- |
| 2.1 | Display per-trait visibility selectors on edit page | `personas`, `visibility`, `traits` | -- | -- |
| 2.2 | Implement per-trait visibility filtering in getViewablePersona | `personas`, `visibility`, `traits` | -- | -- |
| 2.3 | Auto-clamp trait overrides when persona visibility narrows | `personas`, `visibility`, `traits` | 2.2 | -- |
| 3.1 | Document existing persona MCP toggle behavior | `personas`, `mcp` | -- | -- |
| 3.2 | Document existing per-trait MCP visibility behavior | `personas`, `mcp` | 3.1 | -- |
| 3.3 | Document existing user-level AI preferences behavior | `personas`, `mcp` | -- | -- |
| 3.4 | Document existing MCP live preview behavior | `personas`, `mcp` | 3.1, 3.2 | -- |
| 3.5 | Write integration tests for MCP tool filtering | `personas`, `mcp`, `test` | -- | -- |
| 3.6 | Document MCP discovery scenarios and tool reference | `personas`, `mcp`, `docs` | -- | -- |
| 4.1 | Build contact preferences editor with 4-category layout | `personas`, `contact-prefs` | -- | -- |
| 4.2 | Implement updateContactPreferences server action | `personas`, `contact-prefs` | -- | -- |
| 4.3 | Initialize new personas with user-level default contact prefs | `personas`, `contact-prefs` | 4.2 | -- |
| 4.4 | Enforce searchVisibility in semantic search | `personas`, `contact-prefs`, `search` | 4.2 | -- |
| 4.5 | Implement checkContactAuthorization in permissions | `personas`, `contact-prefs`, `auth` | 4.2 | -- |
| 4.6 | Enforce endorsement display preferences in persona views | `personas`, `contact-prefs`, `endorsements` | 4.2 | -- |
| 4.7 | Build default contact preferences editor on Settings page | `personas`, `contact-prefs`, `settings` | 4.1, 4.2 | -- |

**Conventions:**
- Story IDs use `[Section#].[Story#]` format (e.g., `4.3` = section 4, story 3)
- Issue titles are imperative: "Implement visibility radio group" not "User sees visibility options"
- Labels include the spec suite (`personas`) and feature area (`visibility`, `mcp`, `contact-prefs`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
