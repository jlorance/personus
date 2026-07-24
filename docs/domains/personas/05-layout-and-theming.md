---
type: spec
title: "Identity & Personas -- Layout & Theming"
description: "This spec covers the layout preset system and visual theme system for persona public pages. Layout presets control information architecture -- section ordering, hero zone composition, CTA style,…"
status: planned
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Layout & Theming

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-persona-lifecycle.md`, `04-persona-visibility.md`, `docs/foundation/architecture.md`
> Primary actors: User (authenticated persona owner), Visitor (unauthenticated or non-owner viewer)

This spec covers the layout preset system and visual theme system for persona public pages. Layout presets control information architecture -- section ordering, hero zone composition, CTA style, and endorsement display. Themes control visual identity -- color palette, header treatment, and density. The two systems are independent and can be mixed and matched. Five layout presets (Professional, Personal, Community, Service, Creative) and seven color palettes ship at launch. The preset picker UI lives in the persona edit page and creation wizard.

---

## 1. Layout Presets Overview

### Overview

Every persona public page at `/p/[uri]` is rendered by a single component (`PersonaPublicView`) driven by a `LayoutConfig` data object. The layout preset determines what appears in the hero zone, the order of trait sections below the hero, how endorsements are displayed, and what the primary CTA button says. Five presets cover distinct persona use cases: Professional (credentials-forward), Personal (personality-forward), Community (mission-forward), Service (offerings-forward), and Creative (portfolio-forward). A sixth value, `'auto'`, is the column default -- it resolves at render time to Professional (for `person` entities) or Community (for `organization` entities).

The preset system is already fully implemented in `lib/personas/layout-config.ts`. This spec documents the implementation, defines the preset picker UI, and specifies acceptance criteria for each preset's rendering behavior.

### Wireframe

```
Preset Config → Public Page Rendering Pipeline:

┌───────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐
│ personas table │    │ resolveLayout-   │    │ getLayoutConfig()            │
│                │    │ Preset()         │    │                              │
│ layoutPreset:  │───>│                  │───>│ Merges preset defaults with  │
│   'auto'       │    │ 'auto' + person  │    │ user theme overrides         │
│ entityType:    │    │ = 'professional' │    │                              │
│   'person'     │    │                  │    │ Returns LayoutConfig + theme  │
│ theme: {}      │    └──────────────────┘    └──────────────┬───────────────┘
└───────────────┘                                            │
                                                             ▼
                              ┌───────────────────────────────────────────────┐
                              │ PersonaPublicView                             │
                              │                                               │
                              │  <header>  ← heroElements[] from config       │
                              │  <main>    ← sectionOrder[] from config       │
                              │  <cta>     ← ctaLabel + ctaStyle from config  │
                              │  <footer>                                     │
                              └───────────────────────────────────────────────┘
```

Five preset hero zone layouts:

```
PROFESSIONAL (person default)              PERSONAL
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│ [AV] Name           [CTA btn]  │        │         [Avatar large]          │
│      Headline                   │        │          Name                   │
│      Location  [person]         │        │       "Headline"                │
│      12 endorsements            │        │       Location                  │
└─────────────────────────────────┘        │         [CTA btn]              │
                                           └─────────────────────────────────┘

COMMUNITY (organization default)           SERVICE
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│ [AV] Org Name     [CTA btn]    │        │ [AV] Name           [CTA btn]  │
│      Mission statement          │        │      Headline                   │
│      Location  142 members      │        │      Location  [Available]      │
│                                 │        │      24 endorsements            │
└─────────────────────────────────┘        └─────────────────────────────────┘

CREATIVE
┌─────────────────────────────────┐
│ [full-width header image/banner]│
├─────────────────────────────────┤
│         Name                    │
│       "Headline"                │
│  skill  *  skill  *  skill      │
│     [CTA btn]  [CTA btn]       │
└─────────────────────────────────┘
```

### Component Hierarchy

```
app/p/[uri]/page.tsx                           ← EXISTS: Server Component (data fetching, layout resolution)
  ├─ resolveLayoutPreset()                     ← EXISTS: lib/personas/layout-config.ts line 240
  ├─ getLayoutConfig()                         ← EXISTS: lib/personas/layout-config.ts line 249
  └─ app/p/[uri]/persona-public-view.tsx       ← EXISTS: Client Component ("use client")
       ├─ <header> (hero zone)                 ← EXISTS: renders heroElements per config
       │    ├─ Avatar circle                   ← EXISTS: initial or first char, entity-type color
       │    ├─ Name + headline + location      ← EXISTS
       │    ├─ Entity badge                    ← EXISTS
       │    └─ Endorsement count badge         ← EXISTS
       ├─ <main> (sections)                    ← EXISTS: maps sectionOrder[]
       │    ├─ TraitSection                    ← EXISTS: renders trait via TraitDisplay
       │    └─ EndorsementSection              ← EXISTS: renders endorsements per endorsementStyle
       ├─ <cta> (sticky CTA bar)              ← EXISTS: uses ctaLabel from config
       └─ <footer>                             ← EXISTS
```

All components exist. This feature section documents behavior and defines test criteria. Enhancements include density-aware spacing, header treatment variants, and endorsement style variants (currently only `cards` and `inline` are rendered; `count-only` and `testimonial-carousel` need implementation).

### Workflows & Stories

---

#### Workflow: Visitor views a persona public page with a resolved layout preset

**Preconditions:**
- Persona exists in the `personas` table with visibility `'public'` or `'authenticated'`
- Visitor navigates to `/p/{uri}`

**Stories:**

**[1.1] Resolve layout preset from persona data**
> System resolves the effective layout preset so that the correct LayoutConfig drives rendering.

- **User:** Visitor (or search engine crawler) requesting `/p/{uri}`.
- **Functional:** The server component fetches the persona row, reads `layoutPreset` and `entityType`, calls `resolveLayoutPreset()` to handle the `'auto'` case, then calls `getLayoutConfig()` to merge preset defaults with the persona's `theme` JSONB. The resulting config is passed as a prop to `PersonaPublicView`.
- **Technical:** `app/p/[uri]/page.tsx` lines 52-56. `resolveLayoutPreset()` at `lib/personas/layout-config.ts` line 240. `getLayoutConfig()` at line 249. The `layoutPresets` record at line 117 contains all five configs.
- **Acceptance criteria:**
  - [ ] `layoutPreset: 'auto'` with `entityType: 'person'` resolves to `'professional'`
  - [ ] `layoutPreset: 'auto'` with `entityType: 'organization'` resolves to `'community'`
  - [ ] `layoutPreset: 'service'` is used directly regardless of entity type
  - [ ] `getLayoutConfig()` returns a complete `LayoutConfig` with merged theme overrides
  - [ ] Private personas return 404 (existing behavior, `getPublicPersona()` returns null)
- **Failure paths:**
  - If `layoutPreset` contains an unknown value: fall back to `'professional'` (defensive)
  - If persona not found: `notFound()` called (existing behavior)

**[1.2] Render hero zone from heroElements config**
> System renders the hero zone with elements specified by the preset so that visitors see the most important identity information first.

- **User:** Visitor viewing the public page.
- **Functional:** The hero zone renders elements from `layoutConfig.heroElements[]` in order. All five presets include `'avatar'` and `'name'`. Professional adds `'headline'`, `'location'`, `'entityBadge'`, `'endorsementCount'`. Personal uses only `'avatar'`, `'name'`, `'headline'`, `'location'`. Community replaces `'headline'` with `'missionStatement'` and adds `'memberCount'`. Service adds `'availabilityBadge'` and `'endorsementCount'`. Creative adds `'skillHighlights'`.
- **Technical:** `PersonaPublicView` in `app/p/[uri]/persona-public-view.tsx` lines 107-152. Currently renders a fixed hero layout. Enhancement: conditionally render elements based on `layoutConfig.heroElements[]`. The `HeroElement` type is defined at `lib/personas/layout-config.ts` line 35.
- **Acceptance criteria:**
  - [ ] Professional hero shows: avatar, name, headline, location, entity badge, endorsement count
  - [ ] Personal hero shows: avatar, name, headline, location (centered layout, larger avatar)
  - [ ] Community hero shows: avatar, name, mission statement, location, member count
  - [ ] Service hero shows: avatar, name, headline, location, availability badge, endorsement count
  - [ ] Creative hero shows: avatar, name, headline, location, skill highlights
  - [ ] Hero elements that reference missing data are gracefully omitted (e.g., no location = no location element)
  - [ ] All hero layouts are mobile-responsive (single column at < 640px)
- **Failure paths:**
  - If `heroElements` is empty (malformed config): render minimal hero with just avatar + name

**[1.3] Render sections in preset-defined order**
> System renders trait sections below the hero in the order defined by the preset so that the information hierarchy matches the persona's purpose.

- **User:** Visitor scrolling past the hero zone.
- **Functional:** The `sectionOrder[]` array from the layout config determines which sections appear and in what order. Each section maps to a trait key (e.g., `'skills'`, `'endorsements'`, `'offerings'`). Sections with no data are skipped. Endorsements render using the preset's `endorsementStyle`. Skills render using the preset's `skillDisplay`.
- **Technical:** `PersonaPublicView` lines 158-178. Maps `layoutConfig.sectionOrder`, rendering `EndorsementSection` for `'endorsements'` and `TraitSection` for all others. `TraitSection` looks up metadata from `traitMetadata` to get display config. Languages are appended if present but not in `sectionOrder` (line 181-189).
- **Acceptance criteria:**
  - [ ] Professional section order: endorsements, skills, experience, education, offerings, focusAreas, values, qualities
  - [ ] Personal section order: interests, skills, focusAreas, qualities, values, offerings, seekingOpportunities
  - [ ] Community section order: values, offerings, skills, focusAreas, interests, seekingOpportunities
  - [ ] Service section order: offerings, endorsements, skills, experience, focusAreas, values, qualities
  - [ ] Creative section order: focusAreas, skills, interests, endorsements, offerings, values, qualities, seekingOpportunities
  - [ ] Sections with no data (empty array, null, undefined) are not rendered
  - [ ] Languages appended at end if present and not in sectionOrder
- **Failure paths:**
  - If a section key in `sectionOrder` does not match any trait metadata: section skipped silently

**[1.4] Render CTA button from preset config**
> System renders the primary call-to-action button with preset-appropriate label and style so that visitors have a clear next step.

- **User:** Visitor viewing the public page.
- **Functional:** The CTA bar at the bottom (sticky on mobile, inline on desktop) shows a button with the preset's `ctaLabel` text. The `ctaStyle` controls the button variant: `'formal'` and `'action'` use a solid primary button, `'warm'` uses a softer treatment, `'community'` uses a community-accent style. All CTA buttons link to the contact/introduction flow.
- **Technical:** `PersonaPublicView` lines 194-202. Currently renders a `<Button>` with `layoutConfig.ctaLabel`. The `ctaStyle` from config is not yet applied to the button variant. Enhancement: map `ctaStyle` to button variant classes.
- **Acceptance criteria:**
  - [ ] Professional CTA: "Request Introduction" (primary solid button)
  - [ ] Personal CTA: "Say Hello" (warm/outline button)
  - [ ] Community CTA: "Get Involved" (community-accent button)
  - [ ] Service CTA: "Request a Quote" (high-contrast action button)
  - [ ] Creative CTA: "Let's Collaborate" (warm/outline button)
  - [ ] CTA is sticky at bottom on mobile (< 640px), inline on desktop
  - [ ] CTA button links to the contact/introduction flow for this persona
- **Failure paths:**
  - If `ctaLabel` is empty: fall back to "Get in Touch"

**[1.5] Render endorsements per preset endorsementStyle**
> System renders endorsements using the style specified by the preset so that trust signals match the persona's context.

- **User:** Visitor viewing endorsements on the public page.
- **Functional:** Four endorsement display styles:
  - `'cards'` (Professional, Service): Full card with avatar, name, relationship badge, strength badge, testimonial text, and context tags. Used for credibility-heavy presets.
  - `'inline'` (Personal): Compact pill-style display with avatar and name. Space-efficient for personality-forward pages.
  - `'count-only'`: Only the endorsement count badge in the hero zone; no endorsement section rendered.
  - `'testimonial-carousel'` (Community, Creative): Carousel of testimonials with navigation. Social-proof focused.
- **Technical:** `EndorsementSection` in `persona-public-view.tsx` lines 241-302. Currently supports `'inline'` (flex-wrap pills) and default card style. Enhancement: add `'count-only'` and `'testimonial-carousel'` rendering variants.
- **Acceptance criteria:**
  - [ ] `'cards'` style renders each endorsement as a full card with all fields
  - [ ] `'inline'` style renders endorsements as compact pills
  - [ ] `'count-only'` does not render an endorsement section (count is in hero only)
  - [ ] `'testimonial-carousel'` renders endorsements in a horizontally scrollable carousel
  - [ ] All styles gracefully handle 0 endorsements (section hidden)
  - [ ] All styles handle endorsements without testimonial text (show name + relationship only)
- **Failure paths:**
  - If `endorsementStyle` is unrecognized: fall back to `'cards'`

**Workflow success:** A visitor sees a public persona page rendered with the correct preset -- hero zone elements, section ordering, CTA label, and endorsement style all match the preset definition. Sections with no data are skipped. The page is mobile-responsive.

---

### Schema

No new tables or columns. Uses existing fields on the `personas` table in `lib/db/schema/personas.ts`:

```typescript
// Existing — lib/db/schema/personas.ts lines 35-36
layoutPreset: text('layout_preset').notNull().default('auto'),
theme: jsonb('theme').notNull().default('{}'),
```

Valid `layoutPreset` values: `'professional'` | `'personal'` | `'community'` | `'service'` | `'creative'` | `'auto'`

The `theme` JSONB column stores a `PersonaTheme` object (defined in `lib/personas/layout-config.ts` line 105).

### Server Actions

No new server actions for preset rendering. The public page server component (`app/p/[uri]/page.tsx`) fetches the persona directly via Drizzle, not through a server action. Layout resolution happens in the server component.

Preset changes are saved via the existing `updatePersona()` action in `app/actions/personas.ts`:

```typescript
// Existing — app/actions/personas.ts line 171
updatePersona(uri: string, raw: UpdatePersonaInput): Promise<Persona>
// Authenticated owner required. Accepts layoutPreset and theme in the update payload.
// Enhancement: add layoutPreset and theme to updatePersonaSchema (see feature 3).
```

### Validation

```typescript
// Enhancement to lib/validations/personas.ts — add to updatePersonaSchema

import { LAYOUT_PRESETS } from '@/lib/constants';

// Add these fields to the existing updatePersonaSchema z.object():
layoutPreset: z.enum([...LAYOUT_PRESETS, 'auto'] as [string, ...string[]]).optional(),
theme: z.object({
  colorPalette: z.enum(['default', 'ocean', 'forest', 'sunset', 'midnight', 'lavender', 'earth']).optional(),
  headerTreatment: z.enum(['gradient', 'solid', 'minimal', 'image']).optional(),
  density: z.enum(['comfortable', 'airy', 'compact']).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  headerImageUrl: z.string().url('Must be a valid URL').optional(),
}).optional(),
```

### Edge Cases

- [ ] Persona has `layoutPreset: 'auto'` and `entityType` is changed from `person` to `organization`: resolved preset changes from `professional` to `community` on next page load (no stored value change needed)
- [ ] Persona has `layoutPreset: 'creative'` but no traits at all: hero renders with name only, no sections rendered, CTA still shows
- [ ] Persona has endorsements but preset uses `'count-only'` endorsement style: no endorsement section below hero, count displayed in hero badge only
- [ ] `theme` JSONB contains extra unknown keys: ignored by `getLayoutConfig()` (spread merges only known fields)
- [ ] `theme.headerImageUrl` points to a broken image: header falls back to gradient treatment
- [ ] Mobile viewport with `'compact'` density: spacing already minimal, ensure no overlap

### Test Criteria

**Unit tests:**
- `resolveLayoutPreset('auto', 'person')` returns `'professional'`
- `resolveLayoutPreset('auto', 'organization')` returns `'community'`
- `resolveLayoutPreset('service', 'person')` returns `'service'` (explicit overrides auto)
- `getLayoutConfig('professional', {})` returns complete config with default theme
- `getLayoutConfig('personal', { colorPalette: 'ocean' })` returns config with ocean palette
- All five `layoutPresets` entries have non-empty `heroElements` and `sectionOrder`
- `layoutPresetOptions` array has exactly 5 entries matching the 5 presets

**Integration tests:**
- Public page server component resolves layout for a persona with `layoutPreset: 'auto'`
- Public page passes correct `LayoutConfig` props to `PersonaPublicView`

**E2E tests:**
- Navigate to `/p/{uri}` for a professional persona: verify hero shows endorsement count and section order starts with endorsements
- Navigate to `/p/{uri}` for a personal persona: verify section order starts with interests
- Navigate to `/p/{uri}` for an organization persona with `'auto'` preset: verify community layout (mission, member count)
- Verify sections with no data are not rendered
- Verify CTA label matches the preset

### Implementation Order

1. Add `'count-only'` endorsement rendering variant to `EndorsementSection` in `app/p/[uri]/persona-public-view.tsx` (return null when style is `'count-only'`)
2. Add `'testimonial-carousel'` endorsement rendering variant with horizontal scroll
3. Make hero zone rendering conditional on `heroElements[]` (currently hardcoded)
4. Map `ctaStyle` to button variant classes in the CTA section
5. Apply `density` config to spacing classes (`'compact'` = tighter, `'airy'` = wider)
6. Write unit tests for layout resolution functions
7. Write E2E tests for all 5 presets with seeded personas

---

## 2. Theme System

### Overview

The theme system provides three independent visual dimensions that layer on top of layout presets: color palette, header treatment, and density. Themes are stored as a JSONB object on the persona (`personas.theme` column). An empty object `{}` means "use all preset defaults." Each field is independently optional -- users can override just the palette without changing density. The theme system is implemented in `lib/personas/layout-config.ts` and rendered in `app/p/[uri]/persona-public-view.tsx`.

### Wireframe

```
Theme = 3 independent dimensions:

┌─────────────────────────────────────────────────────────────────────┐
│ COLOR PALETTE                                                        │
│                                                                      │
│ [default]  [ocean]  [forest]  [sunset]  [lavender]  [earth]         │
│                          [midnight]                                  │
│                                                                      │
│ Each palette defines: gradient classes + accent text color            │
│ Custom accent color: hex picker (overrides palette accent)           │
├─────────────────────────────────────────────────────────────────────┤
│ HEADER TREATMENT                                                     │
│                                                                      │
│ [gradient]  Accent color → transparent gradient (default)            │
│ [solid]     Flat accent color block                                  │
│ [minimal]   No header treatment, content starts immediately          │
│ [image]     User-uploaded banner image (requires headerImageUrl)     │
├─────────────────────────────────────────────────────────────────────┤
│ DENSITY                                                              │
│                                                                      │
│ [compact]     -20% spacing, default type scale                       │
│ [comfortable] Default spacing and type scale                         │
│ [airy]        +40% spacing, +1 type scale step                       │
└─────────────────────────────────────────────────────────────────────┘
```

Palette visual mapping (from `persona-public-view.tsx` lines 64-93):

```
default:   green persona-person gradient    → text-persona-person accent
ocean:     blue-500 → blue-400 gradient     → text-blue-600 accent
forest:    green-500 → green-400 gradient   → text-green-600 accent
sunset:    orange-500 → orange-400 gradient → text-orange-600 accent
midnight:  indigo-500 → indigo-400 gradient → text-indigo-600 accent
lavender:  purple-500 → purple-400 gradient → text-purple-600 accent
earth:     amber-500 → amber-400 gradient   → text-amber-600 accent
```

### Component Hierarchy

```
lib/personas/layout-config.ts                  ← EXISTS: Types + config objects
  ├─ PersonaTheme interface (line 105)         ← EXISTS: colorPalette, headerTreatment, density, accentColor, headerImageUrl
  ├─ ColorPalette type (line 63)               ← EXISTS: 7 palette options
  ├─ HeaderTreatment type (line 60)            ← EXISTS: gradient, solid, minimal, image
  ├─ LayoutDensity type (line 48)              ← EXISTS: comfortable, airy, compact
  └─ getLayoutConfig() (line 249)              ← EXISTS: merges preset defaults with theme overrides

app/p/[uri]/persona-public-view.tsx            ← EXISTS: Client Component
  ├─ colorPaletteClasses (lines 64-93)         ← EXISTS: maps ColorPalette → CSS classes
  ├─ gradient applied to <header> (line 110)   ← EXISTS
  └─ accent applied to endorsement badges      ← EXISTS
```

### Workflows & Stories

---

#### Workflow: System applies theme overrides to the public page

**Preconditions:**
- Persona has a `theme` JSONB value (may be `{}` for defaults)
- Layout preset has been resolved

**Stories:**

**[2.1] Apply color palette to public page**
> System applies the selected color palette so that the persona's visual identity is consistent.

- **User:** Visitor viewing a public persona page.
- **Functional:** The color palette determines the hero gradient background and accent text color used throughout the page (endorsement badges, section headers, CTA button). The `colorPaletteClasses` mapping in `PersonaPublicView` resolves the palette to Tailwind CSS class strings. Each palette provides a `gradient` class (hero background) and an `accent` class (text color). If the theme specifies a custom `accentColor` hex value, it is applied via inline styles alongside the palette.
- **Technical:** `colorPaletteClasses` at `persona-public-view.tsx` lines 64-93. The palette is read from `layoutConfig.colorPalette` (already merged with theme overrides by `getLayoutConfig()`). Hero gradient applied at line 110. Enhancement: apply accent color to section headings and CTA button.
- **Acceptance criteria:**
  - [ ] `'default'` palette uses `persona-person` green gradient and accent
  - [ ] `'ocean'` palette uses blue gradient and accent
  - [ ] `'forest'` palette uses green gradient and accent
  - [ ] `'sunset'` palette uses orange gradient and accent
  - [ ] `'midnight'` palette uses indigo gradient and accent
  - [ ] `'lavender'` palette uses purple gradient and accent
  - [ ] `'earth'` palette uses amber gradient and accent
  - [ ] Custom `accentColor` overrides the palette accent text color via inline style
  - [ ] All palettes maintain WCAG AA contrast ratios in both light and dark modes
- **Failure paths:**
  - If palette value not in `colorPaletteClasses`: fall back to `'default'`

**[2.2] Apply header treatment to public page**
> System renders the header zone using the specified treatment so that the visual tone matches the persona's intent.

- **User:** Visitor viewing a public persona page.
- **Functional:** Four header treatments:
  - `'gradient'` (default): Background gradient from palette accent color to transparent. Used by Professional, Personal, Community, Service presets by default.
  - `'solid'`: Flat accent color block as header background. More assertive.
  - `'minimal'`: No header background treatment. Content starts immediately on the base background. Clean and understated.
  - `'image'`: User-uploaded banner image as header background. `headerImageUrl` from theme is rendered as a `background-image` with cover sizing and a dark overlay for text readability. Falls back to gradient if no URL provided.
- **Technical:** Currently only `'gradient'` is rendered (line 110 applies `bg-gradient-to-b` + palette gradient). Enhancement: conditionally apply header classes based on `layoutConfig.headerTreatment`. For `'image'`, render a `div` with `background-image` CSS and a semi-transparent overlay.
- **Acceptance criteria:**
  - [ ] `'gradient'` renders a background gradient from accent to transparent
  - [ ] `'solid'` renders a flat accent-colored header block
  - [ ] `'minimal'` renders no header background (just the base page background)
  - [ ] `'image'` renders the `headerImageUrl` as a cover background with dark overlay
  - [ ] `'image'` with no `headerImageUrl` falls back to `'gradient'`
  - [ ] Text remains readable on all header treatments (contrast maintained)
  - [ ] Header treatments work in both light and dark modes
- **Failure paths:**
  - If `headerImageUrl` fails to load: CSS background-image fails silently, gradient shows as fallback via layered CSS

**[2.3] Apply density to public page spacing**
> System adjusts spacing and typography based on the density setting so that the page feels appropriately tight or open.

- **User:** Visitor viewing a public persona page.
- **Functional:** Three density levels affect the entire public page:
  - `'compact'`: Tighter padding (py-6, px-4), smaller gaps (gap-4, space-y-4), default type scale. Used by Service preset. Information-dense, conversion-focused.
  - `'comfortable'` (default): Standard padding (py-8, px-6), standard gaps (gap-6, space-y-8). Used by Professional and Community presets.
  - `'airy'`: Generous padding (py-12, px-8), large gaps (gap-8, space-y-12), +1 type scale step on headings. Used by Personal and Creative presets. Breathable, personality-forward.
- **Technical:** Enhancement to `PersonaPublicView`. The `density` value from `layoutConfig` (already merged with theme by `getLayoutConfig()`) maps to CSS classes applied to the main content container and section gaps. Implement as a `densityClasses` mapping similar to `colorPaletteClasses`.
- **Acceptance criteria:**
  - [ ] `'compact'` density reduces section spacing by ~20% from comfortable
  - [ ] `'comfortable'` density uses the current default spacing
  - [ ] `'airy'` density increases section spacing by ~40% from comfortable
  - [ ] `'airy'` density increases heading font size by one step
  - [ ] Density affects all sections uniformly (hero, traits, endorsements, CTA)
  - [ ] Density is mobile-responsive (compact does not cause overflow on small screens)
- **Failure paths:**
  - If density value is unrecognized: fall back to `'comfortable'`

**Workflow success:** A persona public page renders with the correct color palette, header treatment, and density -- all independently configurable and all layered on top of the layout preset. Theme overrides merge cleanly with preset defaults.

---

### Schema

No new columns. The existing `personas.theme` JSONB column stores the `PersonaTheme` interface:

```typescript
// Existing — lib/personas/layout-config.ts lines 105-113
export interface PersonaTheme {
  colorPalette?: ColorPalette;       // 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'lavender' | 'earth'
  headerTreatment?: HeaderTreatment; // 'gradient' | 'solid' | 'minimal' | 'image'
  density?: LayoutDensity;           // 'comfortable' | 'airy' | 'compact'
  accentColor?: string;              // hex color e.g. '#3b82f6'
  headerImageUrl?: string;           // URL for 'image' header treatment
}
```

### Server Actions

Theme changes are saved via the existing `updatePersona()` action. The `theme` field is included in the update payload as a JSONB object. See feature 3 (Preset Picker UI) for the full save flow.

### Validation

Theme validation is part of the `updatePersonaSchema` enhancement defined in feature 1's Validation section. The `theme` field is a nested `z.object()` with all optional fields and enum constraints for palette, header treatment, and density.

### Edge Cases

- [ ] Theme JSONB is `{}` (default): all values resolved from preset defaults via `getLayoutConfig()`
- [ ] Theme has partial overrides (e.g., `{ colorPalette: 'ocean' }` only): density and header treatment use preset defaults
- [ ] Theme specifies `'image'` header treatment but no `headerImageUrl`: falls back to `'gradient'`
- [ ] Theme specifies `accentColor` that is white or near-white: poor contrast on light mode; should be validated client-side (not blocked server-side)
- [ ] Theme JSONB contains extra unknown keys (e.g., from a future migration): ignored by `getLayoutConfig()`, preserved in storage
- [ ] Dark mode + `'midnight'` palette: ensure gradient is visible against dark background (indigo-500/10 is subtle)

### Test Criteria

**Unit tests:**
- `getLayoutConfig('professional', {})` returns `colorPalette: 'default'`, `headerTreatment: 'gradient'`, `density: 'comfortable'`
- `getLayoutConfig('personal', { colorPalette: 'ocean' })` returns `colorPalette: 'ocean'` with other values from personal preset
- `getLayoutConfig('creative', { density: 'compact' })` overrides creative's default `'airy'` density
- Theme validation schema accepts valid hex colors and rejects invalid ones
- Theme validation schema accepts all 7 palette values

**Integration tests:**
- `updatePersona(uri, { theme: { colorPalette: 'forest' } })` stores the theme in the DB
- Public page renders with the stored theme palette

**E2E tests:**
- Navigate to `/p/{uri}` with `theme: { colorPalette: 'ocean' }`: verify blue gradient in hero
- Navigate to `/p/{uri}` with `theme: { density: 'compact' }`: verify reduced spacing
- Navigate to `/p/{uri}` with `theme: { headerTreatment: 'minimal' }`: verify no gradient in hero

### Implementation Order

1. Create `densityClasses` mapping in `persona-public-view.tsx` (compact/comfortable/airy -> Tailwind classes)
2. Apply density classes to main content container, section gaps, and heading sizes
3. Implement `'solid'` header treatment variant (flat color block)
4. Implement `'minimal'` header treatment variant (no background)
5. Implement `'image'` header treatment variant (background-image with overlay)
6. Add accent color inline style support for custom `accentColor` hex values
7. Write unit tests for `getLayoutConfig()` theme merging
8. Write E2E tests for each palette and header treatment

---

## 3. Preset Picker UI

### Overview

The preset picker is the user-facing control for choosing a layout preset and customizing the theme. It appears in two locations: the persona creation wizard (step 2) and the persona edit page (foundations form). The picker shows all five presets as selectable cards with preview descriptions, a theme customizer with palette, header treatment, and density controls, and a live preview link. The picker reuses `layoutPresetOptions` from `lib/personas/layout-config.ts` for labels and descriptions.

### Wireframe

```
Layout Preset Picker (in edit page and creation wizard):

┌─────────────────────────────────────────────────────────────────────┐
│ Layout & Appearance                                                  │
│ Controls how your public page is organized and styled.               │
│                                                                      │
│ ─── Layout Preset ─────────────────────────────────────────────────  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Professional  │  │   Personal   │  │  Community   │               │
│  │ Credentials   │  │ Personality  │  │  Mission &   │               │
│  │ and expertise │  │ passions,    │  │  impact, how │               │
│  │ front and     │  │ and creative │  │  to get      │               │
│  │ center        │  │ side         │  │  involved    │               │
│  │ ─────────── * │  │              │  │              │               │
│  │ [Suggested]   │  │              │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐                                  │
│  │   Service    │  │   Creative   │                                  │
│  │ Services,    │  │ Portfolio,   │                                  │
│  │ availability │  │ projects,    │                                  │
│  │ and trust    │  │ and creative │                                  │
│  │ signals      │  │ vision       │                                  │
│  └──────────────┘  └──────────────┘                                  │
│                                                                      │
│ ─── Theme ─────────────────────────────────────────────────────────  │
│                                                                      │
│ Color Palette                                                        │
│ (●) (●) (●) (●) (●) (●) (●)     ← color dots, selected = ring      │
│ def  ocn  for  sun  mid  lav  ear                                    │
│                                                                      │
│ Header Style                                                         │
│ [Gradient v]                      ← select dropdown                  │
│                                                                      │
│ Density                                                              │
│ [Compact] [Comfortable *] [Airy] ← segmented control                │
│                                                                      │
│ [Preview ↗]                       ← opens /p/{uri} in new tab        │
└─────────────────────────────────────────────────────────────────────┘
```

Empty / first-time state:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layout & Appearance                                                  │
│ Controls how your public page is organized and styled.               │
│                                                                      │
│ ─── Layout Preset ─────────────────────────────────────────────────  │
│                                                                      │
│ Based on your persona type (Person), we suggest:                     │
│                                                                      │
│  ┌──────────────────────────────┐                                    │
│  │ ★ Professional               │  ← auto-selected, highlighted     │
│  │   Credentials and expertise  │                                    │
│  │   front and center           │                                    │
│  └──────────────────────────────┘                                    │
│                                                                      │
│  [See all presets]                ← expands to show all 5            │
│                                                                      │
│ Theme uses defaults. [Customize] ← expands theme section             │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
components/layout-preset-picker.tsx              ← NEW: Client Component ("use client")
  ├─ PresetCard (internal)                       ← renders one preset option
  │    ├─ components/ui/card.tsx                  ← EXISTS
  │    └─ components/ui/badge.tsx                 ← EXISTS (for "Suggested" label)
  ├─ ThemeCustomizer (internal)                  ← theme controls (palette, header, density)
  │    ├─ PaletteSelector (internal)             ← color dot selector
  │    ├─ components/ui/select.tsx               ← EXISTS (header treatment dropdown)
  │    └─ DensitySelector (internal)             ← segmented control
  ├─ reads: lib/personas/layout-config.ts        ← layoutPresetOptions, ColorPalette, etc.
  └─ reads: lib/constants.ts                     ← LAYOUT_PRESETS, LAYOUT_PRESET_LABELS

Used in:
  app/(dashboard)/personas/new/page.tsx          ← EXISTS: creation wizard step 2
  app/(dashboard)/personas/[uri]/edit/page.tsx   ← EXISTS: foundations form
```

### Workflows & Stories

---

#### Workflow: User selects a layout preset and customizes theme

**Preconditions:**
- User is authenticated and owns the persona (or is creating a new one)
- User is on the persona edit page or creation wizard step 2

**Stories:**

**[3.1] Render preset picker with entity-type suggestion**
> User sees all available presets with the system suggestion highlighted so that they can make an informed choice.

- **User:** Authenticated persona owner on the edit page or creation wizard.
- **Functional:** The preset picker renders 5 preset cards in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile). Each card shows the preset label and description (from `layoutPresetOptions` in `lib/personas/layout-config.ts`). The currently selected preset has a highlighted border (accent color). One card is marked as "Suggested" based on entity type: `person` suggests Professional, `organization` suggests Community. If the persona's `layoutPreset` is `'auto'`, the suggested preset is pre-selected. If it is an explicit value, that value is pre-selected.
- **Technical:** New `components/layout-preset-picker.tsx`. Receives props: `value: LayoutPreset | 'auto'`, `entityType: EntityType`, `theme: PersonaTheme`, `onChange: (preset: LayoutPreset | 'auto', theme: PersonaTheme) => void`. Uses `layoutPresetOptions` from `lib/personas/layout-config.ts` (line 272) for labels and descriptions. Uses `resolveLayoutPreset()` to determine which preset to show as active when value is `'auto'`.
- **Acceptance criteria:**
  - [ ] All 5 presets render with correct labels from `layoutPresetOptions`
  - [ ] Each card shows the preset description
  - [ ] "Suggested" badge appears on Professional for person entities, Community for org entities
  - [ ] Currently selected preset has a highlighted border
  - [ ] When `layoutPreset` is `'auto'`, the suggested preset appears selected
  - [ ] Clicking a different preset updates the selection immediately (local state)
  - [ ] Responsive grid: 3 cols on desktop (>= 1024px), 2 cols on tablet (>= 640px), 1 col on mobile
- **Failure paths:**
  - If `entityType` is unexpected: default suggestion to Professional

**[3.2] Select a preset and persist the change**
> User clicks a preset card so that the persona's layout is updated.

- **User:** Authenticated persona owner.
- **Functional:** Clicking a preset card updates the local state. The change is NOT immediately persisted -- it is saved when the user clicks "Save Foundations" (edit page) or "Create & Continue" (wizard). When the user selects the suggested preset, the stored value can be `'auto'` (allowing future entity type changes to adjust the preset). When the user selects a non-suggested preset, the explicit value is stored (e.g., `'service'`).
- **Technical:** The `onChange` callback passes the selected preset and current theme up to the parent form. The parent includes `layoutPreset` in the save payload. In the edit page (`app/(dashboard)/personas/[uri]/edit/page.tsx`), the `handleBaseSubmit` function includes `layoutPreset` in the `updatePersona()` call. In the wizard, `createPersona()` receives `layoutPreset`.
- **Acceptance criteria:**
  - [ ] Clicking a preset card updates the picker's visual selection
  - [ ] Selecting the suggested preset stores `'auto'` as the value
  - [ ] Selecting a non-suggested preset stores the explicit preset name
  - [ ] Change is batched with other foundation saves (not immediate server call)
  - [ ] User can change their mind before saving without side effects
  - [ ] Toast notification after successful save includes layout change
- **Failure paths:**
  - If save fails: picker retains the attempted selection, error shown, user can retry

**[3.3] Customize color palette**
> User selects a color palette so that the persona's visual identity matches their preference.

- **User:** Authenticated persona owner.
- **Functional:** Below the preset grid, a "Theme" section shows color palette options as a row of colored dots (one per palette). The dot matching the current palette has a ring highlight. Clicking a dot selects that palette and updates the local theme state. A "Custom" option allows entering a hex color code for `accentColor`. The palette change is previewed via the dot highlight but the full public page preview requires clicking "Preview".
- **Technical:** `PaletteSelector` internal component. Maps `ColorPalette` values to representative CSS colors for the dots. Receives `value: ColorPalette` and `onChange: (palette: ColorPalette) => void`. Palette labels: default, ocean, forest, sunset, midnight, lavender, earth.
- **Acceptance criteria:**
  - [ ] 7 color dots render, one per palette
  - [ ] Each dot uses a color representative of its palette (blue for ocean, green for forest, etc.)
  - [ ] Selected palette dot has a visible ring indicator
  - [ ] Clicking a dot updates the selection immediately
  - [ ] Palette change included in the theme JSONB when parent saves
  - [ ] Default palette dot is initially selected when theme is `{}`
- **Failure paths:**
  - If custom accent color input is not a valid hex: inline validation error, palette falls back to previous

**[3.4] Customize header treatment**
> User selects a header treatment so that the persona's header matches their aesthetic preference.

- **User:** Authenticated persona owner.
- **Functional:** A dropdown select control shows header treatment options: Gradient (default), Solid, Minimal, Image. Selecting "Image" reveals a URL input for `headerImageUrl`. The selected treatment is included in the theme JSONB. For "Image", the `headerImageUrl` field is required -- the select should not allow saving with "Image" selected and no URL provided.
- **Technical:** Uses existing `Select` component from `components/ui/select.tsx`. `HeaderTreatment` type from `lib/personas/layout-config.ts`. When `'image'` is selected, conditionally render an `Input` for URL. Both values are included in the theme object passed to `onChange`.
- **Acceptance criteria:**
  - [ ] Dropdown shows all 4 header treatment options
  - [ ] Currently selected treatment is pre-selected in dropdown
  - [ ] Selecting "Image" reveals a URL input field
  - [ ] URL input validates as a valid URL on blur
  - [ ] Treatment change included in theme JSONB on save
  - [ ] Default treatment (from preset) shown when theme has no `headerTreatment`
- **Failure paths:**
  - If "Image" selected with no URL: show inline warning "Header image URL required", fall back to gradient on public page

**[3.5] Customize density**
> User selects a density level so that the persona's page feels appropriately tight or open.

- **User:** Authenticated persona owner.
- **Functional:** A segmented control (3 buttons) shows density options: Compact, Comfortable, Airy. The currently active density has a filled background. Clicking a segment updates the selection. The density change is included in the theme JSONB.
- **Technical:** `DensitySelector` internal component. Three buttons styled as a segmented control (similar to radio group but visually connected). Uses `LayoutDensity` type. Receives `value` and `onChange` props.
- **Acceptance criteria:**
  - [ ] 3 density options render as a segmented control
  - [ ] Currently active density is visually distinct (filled background)
  - [ ] Clicking a density option updates the selection
  - [ ] Default density (from preset) shown when theme has no `density`
  - [ ] Density change included in theme JSONB on save
- **Failure paths:**
  - None (client-only, all values are valid)

**[3.6] Preview the public page with current settings**
> User opens a preview of the public page so that they can see how their preset and theme choices look.

- **User:** Authenticated persona owner who has made layout/theme changes.
- **Functional:** A "Preview" link/button at the bottom of the picker opens `/p/{uri}` in a new tab. The preview shows the persona's current public page. NOTE: If changes are not yet saved, the preview shows the previously saved state. The link is disabled (or shows a tooltip) if the persona has never been saved (during creation wizard, before step 2 is complete).
- **Technical:** A simple `<a href="/p/{uri}" target="_blank">` link. During creation (wizard step 2), the persona does not exist yet, so the preview link is hidden. In the edit page, the URI is available from `params.uri`.
- **Acceptance criteria:**
  - [ ] Preview link opens `/p/{uri}` in a new browser tab
  - [ ] Preview link visible on edit page
  - [ ] Preview link hidden during creation wizard (persona not yet saved)
  - [ ] Preview reflects the last saved state (not unsaved changes)
  - [ ] Link uses `target="_blank"` with `rel="noopener noreferrer"`
- **Failure paths:**
  - If persona is private: preview shows 404 for non-owners (expected; owner sees via dashboard)

**Workflow success:** User has selected a layout preset, customized the color palette, header treatment, and density, and can preview the result. All changes are batched into the parent form's save action.

---

#### Workflow: User selects layout preset during persona creation

**Preconditions:**
- User is authenticated
- User is on creation wizard step 2

**Stories:**

**[3.7] Show compact preset picker in creation wizard**
> User sees a simplified preset picker during creation so that they can choose a layout without being overwhelmed.

- **User:** Authenticated user creating a new persona.
- **Functional:** The creation wizard (step 2) shows a compact version of the preset picker: just the 5 preset chips (label only, no description) with the entity-type suggestion pre-selected. The full theme customizer is NOT shown during creation -- only the preset. Theme customization is available after creation on the edit page. Below the chips, a small helper text: "You can customize the theme later."
- **Technical:** `components/layout-preset-picker.tsx` accepts a `compact?: boolean` prop. When `compact` is true, render chips instead of cards, hide the theme customizer, and hide the preview link. The wizard at `app/(dashboard)/personas/new/page.tsx` passes `compact={true}`.
- **Acceptance criteria:**
  - [ ] 5 preset chips render with labels only (Professional, Personal, Community, Service Provider, Creative)
  - [ ] Suggested preset pre-selected based on entity type from step 1
  - [ ] User can click a different chip to override
  - [ ] Theme customizer NOT shown in compact mode
  - [ ] Helper text "You can customize the theme later." visible below chips
  - [ ] Selected preset included in `createPersona()` payload
- **Failure paths:**
  - If no chip is selected (user deselects somehow): fall back to `'auto'`

**Workflow success:** User has selected a layout preset during creation. The preset is saved to the persona and the public page uses it immediately.

---

### Schema

No new columns. Preset picker writes to existing `personas.layoutPreset` (text) and `personas.theme` (JSONB).

### Server Actions

No new server actions. The preset picker's changes are saved via:

```typescript
// Existing — app/actions/personas.ts
updatePersona(uri: string, raw: UpdatePersonaInput): Promise<Persona>
// Enhanced to accept layoutPreset and theme in the payload (see validation section).

createPersona(raw: CreatePersonaInput): Promise<Persona>
// Enhanced to accept layoutPreset in the payload.
```

Enhancement needed for `updatePersona()`: the `data` spread at line 177 must include `layoutPreset` and `theme` in the Drizzle `.set()` call. Currently it uses `{ ...data, updatedAt: new Date() }`, which will include any validated fields from the schema.

Enhancement needed for `createPersona()`: add `layoutPreset: data.layoutPreset ?? 'auto'` to the `newPersona` object at line 137.

### Validation

```typescript
// Enhancement to lib/validations/personas.ts

// Add to createPersonaSchema:
layoutPreset: z.enum([...LAYOUT_PRESETS, 'auto'] as [string, ...string[]]).default('auto'),

// Add to updatePersonaSchema:
layoutPreset: z.enum([...LAYOUT_PRESETS, 'auto'] as [string, ...string[]]).optional(),
theme: z.object({
  colorPalette: z.enum(['default', 'ocean', 'forest', 'sunset', 'midnight', 'lavender', 'earth']).optional(),
  headerTreatment: z.enum(['gradient', 'solid', 'minimal', 'image']).optional(),
  density: z.enum(['comfortable', 'airy', 'compact']).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  headerImageUrl: z.string().url('Must be a valid URL').optional(),
}).optional(),
```

Note: The `LAYOUT_PRESETS` constant already exists at `lib/constants.ts` line 167: `['professional', 'personal', 'community', 'service', 'creative']`. The schema adds `'auto'` as a valid option.

### Edge Cases

- [ ] User selects "Image" header treatment then clears the URL: save with `headerTreatment: 'image'` and no `headerImageUrl` -- public page falls back to gradient
- [ ] User selects a preset then changes entity type (e.g., person -> org): suggested preset changes but the selection does not auto-change (it is explicit)
- [ ] User saves with `layoutPreset: 'auto'` then changes entity type: resolved preset changes on next public page load
- [ ] Multiple browser tabs editing the same persona: last save wins for both preset and theme
- [ ] Theme JSONB with only one field (e.g., `{ density: 'compact' }`): other fields use preset defaults
- [ ] User selects compact density on a Service preset (already compact by default): no visible change (density is already compact)
- [ ] Very long `headerImageUrl`: validated as URL by Zod, no length limit imposed (browser handles)

### Test Criteria

**Unit tests:**
- `createPersonaSchema` accepts all 5 preset values plus `'auto'`
- `createPersonaSchema` rejects `'invalid_preset'`
- Theme validation accepts `{ colorPalette: 'ocean' }`
- Theme validation rejects `{ colorPalette: 'invalid' }`
- Theme validation accepts `{ accentColor: '#3b82f6' }` and rejects `{ accentColor: 'not-a-hex' }`
- Theme validation accepts `{ headerImageUrl: 'https://example.com/banner.jpg' }`
- `resolveLayoutPreset('auto', 'person')` returns `'professional'` (reconfirm)

**Integration tests:**
- `updatePersona(uri, { layoutPreset: 'creative' })` persists to DB
- `updatePersona(uri, { theme: { colorPalette: 'forest', density: 'airy' } })` persists both fields
- `createPersona({ ..., layoutPreset: 'service' })` stores `'service'` in the DB

**E2E tests:**
- Edit page: click "Creative" preset card, save, navigate to `/p/{uri}`, verify Creative layout
- Edit page: select "Ocean" palette dot, save, verify blue gradient on public page
- Edit page: change density to "Airy", save, verify increased spacing on public page
- Creation wizard: verify suggested preset matches entity type, select different preset, create, verify preset used
- Edit page: select "Image" header treatment, enter URL, save, verify image header on public page

### Implementation Order

1. Add `layoutPreset` to `createPersonaSchema` and `updatePersonaSchema` in `lib/validations/personas.ts` (also add `theme` validation)
2. Update `createPersona()` in `app/actions/personas.ts` to pass `layoutPreset` to the insert
3. Update `updatePersona()` to include `layoutPreset` and `theme` in the update set (already works via spread, but verify schema passes them through)
4. Create `components/layout-preset-picker.tsx` with preset cards grid, palette selector, header treatment dropdown, density segmented control, and preview link
5. Integrate picker into `app/(dashboard)/personas/[uri]/edit/page.tsx` foundations form (requires step 4)
6. Integrate compact picker into `app/(dashboard)/personas/new/page.tsx` step 2 (requires step 4)
7. Write unit tests for validation schemas
8. Write E2E test for preset picker in edit page and creation wizard

---

## 4. Public Page Rendering

### Overview

The public persona page at `/p/[uri]` is the external-facing output of the layout and theme systems. It is a server component that fetches the persona, resolves the layout preset, merges theme overrides, fetches endorsements and trait metadata, and passes everything to the `PersonaPublicView` client component. This feature section specifies the rendering pipeline, SEO metadata generation, and the mapping from layout config to rendered HTML.

### Wireframe

```
Full public page rendered with Professional preset + default theme:

┌─────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓ gradient header (persona-person green → transparent) ▓▓▓▓▓▓▓ │
│                                                                      │
│   ┌──────┐  Jamie Smith                                              │
│   │  JS  │  Full-stack engineer & open-source contributor            │
│   └──────┘  Austin, TX  [person]  [12 endorsements]                  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ── Endorsements ─────────────────────────────────────────── [12] ──  │
│ ┌─────────────────────────────────────────────────────────────────┐  │
│ │ [A] alice-dev  [colleague]  [Strong]                            │  │
│ │ "Jamie's architecture skills are exceptional..."                │  │
│ │ [React] [System Design]                                         │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ── Skills ───────────────────────────────────────────────────────── │
│ [TypeScript ■■■■] [React ■■■■■] [GraphQL ■■■□] [PostgreSQL ■■■■]  │
│                                                                      │
│ ── Experience ───────────────────────────────────────────────────── │
│ Senior Engineer, Acme Corp (2022-present)                            │
│ Software Developer, StartupX (2019-2022)                             │
│                                                                      │
│ ── Education ────────────────────────────────────────────────────── │
│ BS Computer Science, UT Austin (2019)                                │
│                                                                      │
│ ── Offerings ────────────────────────────────────────────────────── │
│ Mentorship: Code review & architecture guidance                      │
│                                                                      │
│ ── Focus Areas ──────────────────────────────────────────────────── │
│ Professional: Building open-source tools                             │
│                                                                      │
│ ── Values ───────────────────────────────────────────────────────── │
│ [Open Source] [Mentorship] [Transparency]                            │
│                                                                      │
│ ── Qualities ────────────────────────────────────────────────────── │
│ [Patient teacher] [Bridge-builder]                                   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│            [Request Introduction]                   (sticky mobile)  │
├──────────────────────────────────────────────────────────────────────┤
│ Personus — AI-native identity for capability-based discovery         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/p/[uri]/page.tsx                            ← EXISTS: Server Component
  ├─ getPublicPersona(uri)                      ← EXISTS: fetches persona, checks visibility
  ├─ resolveLayoutPreset()                      ← EXISTS: handles 'auto' resolution
  ├─ getLayoutConfig()                          ← EXISTS: merges preset with theme
  ├─ getEndorsementsForPersona()                ← EXISTS: lib/db/queries.ts
  ├─ db.select().from(traitMetadata)            ← EXISTS: fetches all metadata for rendering
  ├─ generateMetadata()                         ← EXISTS: SEO title + OG tags
  └─ PersonaPublicView                          ← EXISTS: Client Component
       ├─ colorPaletteClasses mapping            ← EXISTS
       ├─ <header> hero zone                     ← EXISTS (ENHANCED for preset-driven rendering)
       ├─ sectionOrder.map() → sections          ← EXISTS
       │    ├─ TraitSection                      ← EXISTS
       │    └─ EndorsementSection                ← EXISTS (ENHANCED for all 4 styles)
       ├─ CTA bar                                ← EXISTS (ENHANCED for ctaStyle mapping)
       └─ <footer>                               ← EXISTS
```

### Workflows & Stories

---

#### Workflow: System renders the public page from layout config

**Preconditions:**
- Persona exists and is not private
- Server component has resolved layout config and fetched all data

**Stories:**

**[4.1] Fetch and assemble all data for public page rendering**
> Server component fetches persona, endorsements, and trait metadata in parallel so that the page renders with complete data.

- **User:** Visitor requesting `/p/{uri}`.
- **Functional:** The server component performs three data fetches: persona row (by URI, visibility check), endorsements for the persona, and trait metadata (for rendering configuration). Layout preset is resolved and theme merged. All data is passed as props to `PersonaPublicView`.
- **Technical:** `app/p/[uri]/page.tsx` lines 46-79. `getPublicPersona()` at line 15 fetches persona and rejects private visibility. Endorsement fetch at line 59-63 (try/catch, non-blocking). Metadata fetch at line 66-69. Props assembled at lines 72-77.
- **Acceptance criteria:**
  - [ ] Persona fetched by URI with visibility check (private returns 404)
  - [ ] Endorsements fetched in parallel; failure does not block page render
  - [ ] Trait metadata fetched and ordered by category + displayOrder
  - [ ] Layout config fully resolved before passing to client component
  - [ ] `generateMetadata()` returns persona name and headline for SEO
- **Failure paths:**
  - If persona not found: `notFound()` renders Next.js 404 page
  - If endorsement fetch fails: page renders with empty endorsements array
  - If trait metadata fetch fails: sections render without metadata-driven display config

**[4.2] Render sections using trait metadata display config**
> System renders each trait section using the display configuration from trait_metadata so that rendering is metadata-driven, not hardcoded.

- **User:** Visitor viewing trait sections on the public page.
- **Functional:** Each section in `sectionOrder` maps to a trait key. The `TraitSection` component looks up the trait metadata row by key to get the `displayConfig` (rendering type: tag_list, timeline, etc.) and `displayName` (section heading). The trait value from the persona's JSONB is passed to `TraitDisplay` along with the display config. Sections with missing metadata or empty/null trait values are skipped.
- **Technical:** `TraitSection` at `persona-public-view.tsx` lines 217-239. Uses `metadataMap.get(sectionKey)` to find the metadata row. Delegates to `TraitDisplay` from `components/trait-displays.tsx`. Display config determines rendering variant (tag_list renders as badges, timeline renders as chronological entries, etc.).
- **Acceptance criteria:**
  - [ ] Each section heading uses `displayName` from trait metadata
  - [ ] `TraitDisplay` receives the correct `displayConfig` for the trait type
  - [ ] Sections with null/undefined/empty trait values are not rendered
  - [ ] Sections with no matching metadata row are not rendered
  - [ ] Section rendering order matches `sectionOrder` from layout config exactly
- **Failure paths:**
  - If trait value is an unexpected type (not matching displayConfig expectations): section renders fallback (raw JSON or "Unable to display")

**[4.3] Apply density-responsive spacing to the page**
> System applies the density setting to control spacing between sections so that the page feels appropriately tight or open.

- **User:** Visitor viewing the public page.
- **Functional:** The `density` value from the resolved layout config controls CSS spacing throughout the page. The main content container, section gaps, and heading font sizes all adapt to the density level. See feature 2, story [2.3] for density specifications.
- **Technical:** Enhancement to `PersonaPublicView`. Add a `densityClasses` mapping:
  ```
  compact:     space-y-4, py-6, text-base headings
  comfortable: space-y-8, py-8, text-lg headings
  airy:        space-y-12, py-12, text-xl headings
  ```
  Applied to the `<main>` container at line 155.
- **Acceptance criteria:**
  - [ ] Compact density visibly reduces spacing between sections
  - [ ] Airy density visibly increases spacing between sections
  - [ ] Comfortable density matches the current default spacing
  - [ ] Density is applied consistently to hero, sections, CTA, and footer
  - [ ] No content overflow at any density level on mobile (320px min width)
- **Failure paths:**
  - If density value is unrecognized: use `'comfortable'` default

**[4.4] Generate SEO metadata from persona data**
> Server component generates appropriate metadata so that the page is discoverable by search engines and social sharing.

- **User:** Search engine crawler or social media preview bot.
- **Functional:** The `generateMetadata()` function in the server component returns: `<title>` as "DisplayName -- Personus", `<meta description>` as the persona's headline (or fallback), and Open Graph tags (`og:title`, `og:description`, `og:type=profile`). Future enhancement: OG image generation (out of scope for this spec, covered in `06-public-pages.md`).
- **Technical:** `generateMetadata()` at `app/p/[uri]/page.tsx` lines 26-44. Already implemented. Returns `Metadata` object with `title`, `description`, and `openGraph` properties.
- **Acceptance criteria:**
  - [ ] Page title is "{DisplayName} -- Personus"
  - [ ] Meta description is the persona's headline
  - [ ] OG title is the display name
  - [ ] OG type is "profile"
  - [ ] Missing headline falls back to "{DisplayName} on Personus"
  - [ ] Non-existent persona returns `{ title: 'Not Found' }`
- **Failure paths:**
  - None (metadata generation uses only persona data already fetched)

**Workflow success:** The public page renders with the correct layout, theme, sections, endorsements, CTA, and SEO metadata. All rendering is driven by the layout config and trait metadata -- no preset-specific rendering logic exists in the component.

---

### Schema

No schema changes. Uses existing `personas` table and `traitMetadata` table.

### Server Actions

No server actions involved in public page rendering. All data fetching happens in the server component via direct Drizzle queries.

### Validation

No validation needed for read-only rendering. Input validation happens at write time (covered in features 1 and 3).

### Edge Cases

- [ ] Persona has `'auto'` preset and `entityType` changes between page loads: resolved preset changes accordingly (no caching issue since server component re-renders)
- [ ] Persona has a theme with `'image'` header but the image URL returns 404: CSS background-image silently fails, page still usable
- [ ] Persona has 0 traits: only hero zone and CTA render, no sections
- [ ] Persona has 100+ endorsements: all render (no pagination for MVP); consider virtual scrolling for testimonial-carousel
- [ ] Visitor's browser has JavaScript disabled: server-rendered HTML is visible (hero, sections); client interactivity (carousel) degrades gracefully
- [ ] Concurrent updates: persona updated while visitor is viewing; next page load shows updated version
- [ ] Extremely long headline (300 chars): truncated with ellipsis in hero zone

### Test Criteria

**Unit tests:**
- All 5 preset configs have valid `heroElements`, `sectionOrder`, `endorsementStyle`, `ctaLabel`, `ctaStyle`
- `getLayoutConfig()` correctly merges partial theme overrides for each preset
- Density mapping produces distinct class sets for each density level

**Integration tests:**
- Server component renders without error for each of the 5 preset values
- Server component handles missing endorsements gracefully
- SEO metadata generated correctly from persona data

**E2E tests:**
- Navigate to `/p/{uri}` for seeded persona with Professional preset: verify section order and CTA text
- Navigate to `/p/{uri}` for seeded persona with Personal preset: verify interests are first section
- Navigate to `/p/{uri}` for seeded persona with Service preset: verify offerings are first section
- Navigate to `/p/{uri}` for seeded persona with Community preset: verify values are first section
- Navigate to `/p/{uri}` for seeded persona with Creative preset: verify focusAreas are first section
- Verify empty trait sections are not rendered
- Verify page renders correctly on mobile viewport (375px width)
- Verify page title and OG tags in page source

### Implementation Order

1. Implement density-responsive spacing in `PersonaPublicView` (`densityClasses` mapping, apply to main container)
2. Make hero zone rendering conditional on `heroElements[]` config (requires feature 1, step 3)
3. Implement `'count-only'` endorsement style (return null from EndorsementSection)
4. Implement `'testimonial-carousel'` endorsement style (horizontal scroll container)
5. Map `ctaStyle` to button variant classes (formal=primary, warm=outline, action=primary high-contrast, community=accent)
6. Implement `'solid'`, `'minimal'`, and `'image'` header treatment variants
7. Write E2E tests for all 5 preset x theme combinations with seeded data
8. Verify SEO metadata output for all presets

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Implement layout preset resolution with fallback handling | `personas`, `layout`, `rendering` | -- | -- |
| 1.2 | Render hero zone conditionally from heroElements config | `personas`, `layout`, `rendering` | 1.1 | -- |
| 1.3 | Render trait sections in preset-defined order | `personas`, `layout`, `rendering` | 1.1 | -- |
| 1.4 | Map ctaStyle to button variant classes | `personas`, `layout`, `rendering` | 1.1 | -- |
| 1.5 | Implement all 4 endorsement display styles (cards, inline, count-only, testimonial-carousel) | `personas`, `layout`, `endorsements` | 1.3 | -- |
| 2.1 | Apply color palette CSS classes to public page | `personas`, `theming`, `rendering` | 1.1 | -- |
| 2.2 | Implement all 4 header treatment variants (gradient, solid, minimal, image) | `personas`, `theming`, `rendering` | 2.1 | -- |
| 2.3 | Implement density-responsive spacing (compact, comfortable, airy) | `personas`, `theming`, `rendering` | 1.1 | -- |
| 3.1 | Create layout preset picker component with entity-type suggestion | `personas`, `layout`, `ux` | -- | -- |
| 3.2 | Wire preset picker to updatePersona and createPersona save flows | `personas`, `layout`, `ux` | 3.1 | -- |
| 3.3 | Add color palette selector to theme customizer | `personas`, `theming`, `ux` | 3.1 | -- |
| 3.4 | Add header treatment dropdown to theme customizer | `personas`, `theming`, `ux` | 3.1 | -- |
| 3.5 | Add density segmented control to theme customizer | `personas`, `theming`, `ux` | 3.1 | -- |
| 3.6 | Add preview link to preset picker | `personas`, `layout`, `ux` | 3.2 | -- |
| 3.7 | Add compact preset picker to creation wizard step 2 | `personas`, `layout`, `creation` | 3.1 | -- |
| 4.1 | Verify public page data assembly and parallel fetching | `personas`, `rendering`, `performance` | 1.1 | -- |
| 4.2 | Verify trait section rendering uses metadata-driven display config | `personas`, `rendering`, `traits` | 1.3 | -- |
| 4.3 | Apply density classes to public page container and sections | `personas`, `theming`, `rendering` | 2.3 | -- |
| 4.4 | Verify SEO metadata generation for all presets | `personas`, `rendering`, `seo` | 1.1 | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `2.3` = feature 2, story 3)
- Issue titles are imperative: "Implement density-responsive spacing" not "User sees density changes"
- Labels include the spec suite (`personas`) and feature area (`layout`, `theming`, `rendering`, `ux`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
