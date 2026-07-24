---
type: foundation
title: Personus.ai — Persona Layout Strategy
description: "Version: 1.0 Date: 2026-02-14 Depends on: Doc 2 (Data Model & Entities), Doc 6 (Visual User Interfaces), docs/patterns/profile-page-design.md Depended on by: Doc 6 (Visual User Interfaces — public…"
status: superseded
tags: [archived]
timestamp: 2026-02-14
---

# Personus.ai — Persona Layout Strategy

**Version:** 1.0
**Date:** 2026-02-14
**Depends on:** Doc 2 (Data Model & Entities), Doc 6 (Visual User Interfaces), `docs/patterns/profile-page-design.md`
**Depended on by:** Doc 6 (Visual User Interfaces — public persona pages), Doc 5 (Implementation)
**Status:** Design phase

---

## Table of Contents

1. [Overview](#overview)
2. [Layout Presets](#layout-presets)
3. [Visual Theme System](#visual-theme-system)
4. [Preset Comparison](#preset-comparison)
5. [Data Model Changes](#data-model-changes)
6. [Layout Configuration Architecture](#layout-configuration-architecture)
7. [Smart Defaults](#smart-defaults)
8. [Eye-Tracking Rationale](#eye-tracking-rationale)
9. [Implementation Phases](#implementation-phases)

---

## 1. Overview {#overview}

Personus persona public pages use two independent systems:

- **Layout Presets** control what content gets emphasis and where it appears on the page.
- **Visual Themes** control how that content looks (color, density, header treatment).

Together they let each persona feel purpose-built while sharing underlying components. A freelance photographer and a plumbing company both use the same rendering engine, but their public pages feel completely different because they use different presets (Creative vs. Service) and different themes.

This separation is intentional. Layout is about **information architecture** (what questions does a visitor need answered?). Theme is about **aesthetic identity** (how does this persona want to feel?). Users can mix and match: a Creative layout with a warm earth palette, or a Professional layout with a bold high-contrast theme.

### Design Constraints

1. **Single rendering engine.** Five presets, one `<PersonaPublicPage>` component. No per-preset page routes.
2. **Metadata-driven.** Preset configs are data objects, not component trees. New presets require no new components.
3. **Mobile-first.** All presets must degrade gracefully to single-column at mobile breakpoints.
4. **Dark-mode native.** All presets and themes work on the Personus dark background (`#0d1117`).
5. **Consistent trust signals.** Endorsements are always accessible within two scrolls regardless of preset.

---

## 2. Layout Presets {#layout-presets}

Five presets cover the range of persona use cases. Each preset is defined by its hero zone, section order, density, and primary CTA. The presets are opinionated about information hierarchy but delegate all visual styling to the theme system.

### 2.1 Professional (default for person entities)

**Inspired by:** LinkedIn hero + Upwork trust signals + Wellfound airiness

**Visitor question:** "Is this person competent and trustworthy?"

Endorsements sit in the hero zone, not buried below the fold. Skills show proficiency levels. Experience uses a structured timeline. Medium information density balances thoroughness with readability.

**Hero Zone:**

```
+------------------------------------------------------------------+
|                                                                  |
|   +--------+   Display Name               [Request Introduction] |
|   |        |   Headline                                          |
|   | Photo  |   Location                                          |
|   |        |   ----------------------------------------          |
|   +--------+   12 Endorsements  |  18 Skills  |  8yr Experience  |
|                                                                  |
|   [ React ]  [ TypeScript ]  [ System Design ]  [ Leadership ]   |
|                                                                  |
+------------------------------------------------------------------+
```

**Section Order:**

1. Endorsements (testimonial style with relationship context)
2. Skills (with proficiency indicators)
3. Experience (timeline)
4. Education
5. Offerings
6. Focus Areas
7. Values / Qualities

**CTA:** "Request Introduction" (primary button)
**Density:** Comfortable
**Scan pattern:** F-pattern (text-heavy, left-anchored)

---

### 2.2 Personal (user-selected for person entities)

**Inspired by:** About.me + Instagram bio + Linktree

**Visitor question:** "Who IS this person?"

Personality leads. Credentials are present but muted. Larger photo, bigger typography, more whitespace. Qualities and interests replace skills and experience as the primary content. This is the layout for someone whose persona is about connection, not evaluation.

**Hero Zone:**

```
+------------------------------------------------------------------+
|                                                                  |
|                    +-----------+                                  |
|                    |           |                                  |
|                    |   Photo   |                                  |
|                    |  (large)  |                                  |
|                    |           |                                  |
|                    +-----------+                                  |
|                                                                  |
|                    Display Name                                   |
|               "Tagline, not credentials"                          |
|                                                                  |
|          curious  *  empathetic  *  builder                       |
|                                                                  |
|                      [ Connect ]                                  |
|                                                                  |
+------------------------------------------------------------------+
```

**Section Order:**

1. Interests
2. Qualities / Values
3. Focus Areas
4. Offerings
5. Skills (tags only, no proficiency indicators)
6. Experience (minimized, collapsed by default)

**CTA:** "Connect" (outline button)
**Density:** Airy
**Scan pattern:** Z-pattern (visual, centered)

---

### 2.3 Community (default for organization entities)

**Inspired by:** Meetup + Discord server pages + Facebook Groups

**Visitor question:** "Should I join this?"

Mission and social proof answer that question. Member count and activity level signal that this is a living community, not a dead listing. Offerings reframe as "how to get involved." Cover image option creates visual warmth.

**Hero Zone:**

```
+------------------------------------------------------------------+
|  [optional cover image / gradient banner]                        |
|                                                                  |
|   +--------+   Organization Name         [Join / Learn More]     |
|   |  Logo  |   "Mission tagline"                                 |
|   +--------+   ----------------------------------------         |
|                 142 Members  |  Active  |  Founded 2024          |
|                                                                  |
|   [ open source ]  [ developer tools ]  [ education ]            |
|                                                                  |
+------------------------------------------------------------------+
```

**Section Order:**

1. Mission / Description
2. Offerings (framed as "how to get involved")
3. Endorsements (member testimonials)
4. Focus Areas
5. Skills (framed as "capabilities")
6. Values

**CTA:** "Join / Learn More" (primary button)
**Density:** Comfortable
**Scan pattern:** F-pattern with visual header (cover image draws initial Z-pattern eye movement, then F-pattern below)

---

### 2.4 Service (user-selected for freelancers, tradespeople, small businesses)

**Inspired by:** Thumbtack + Angi + Fiverr

**Visitor question:** "Can I hire this person/company, and should I trust them?"

Trust signals dominate. Offerings render as service cards with availability. Endorsements display in review format with project context (not just a name and a quote). Compact density maximizes above-the-fold content. This is a conversion-oriented layout.

**Hero Zone:**

```
+------------------------------------------------------------------+
|                                                                  |
|   +--------+   Display Name                 [Request a Quote]    |
|   |        |   Headline                                          |
|   | Photo  |   Location + Service area                           |
|   |        |   ----------------------------------------          |
|   +--------+   Trust Score: 4.9  |  24 Endorsements              |
|                                                                  |
|   +------------------+ +------------------+ +------------------+ |
|   | Offering 1       | | Offering 2       | | Offering 3       | |
|   | (mini-card)      | | (mini-card)      | | (mini-card)      | |
|   +------------------+ +------------------+ +------------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

**Section Order:**

1. Offerings (service cards with availability indicators)
2. Endorsements (review-style with project context and outcome)
3. Skills (with proficiency)
4. Certifications
5. Experience
6. Focus Areas

**CTA:** "Request a Quote" (primary button, high-contrast)
**Density:** Compact
**Scan pattern:** F-pattern (information-dense, scanning for specific trust/service data)

---

### 2.5 Creative (user-selected for artists, designers, musicians)

**Inspired by:** Behance + Dribbble + Cargo

**Visitor question:** "What does this person's work feel like?"

The aesthetic IS the credential. Full-width banner hero creates immediate visual impact. Minimal chrome so the persona's own visual identity dominates. Focus areas render as creative descriptors. Skills are medium-sized tags (present but not clinical). Gallery-like flow.

**Hero Zone:**

```
+------------------------------------------------------------------+
|                                                                  |
|             [full-width banner image / artwork]                   |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|                    Display Name                                   |
|                  "Short tagline"                                  |
|                                                                  |
|         visual design  *  brand identity  *  motion               |
|                                                                  |
|              [ Collaborate ]  [ Hire ]                             |
|                                                                  |
+------------------------------------------------------------------+
```

**Section Order:**

1. Focus Areas (as creative descriptors, large type)
2. Offerings
3. Skills (medium tags, no proficiency indicators)
4. Endorsements
5. Interests
6. Experience (minimal, collapsed by default)

**CTA:** "Collaborate / Hire" (outline button)
**Density:** Airy
**Scan pattern:** Z-pattern (visual-dominant, centered content, dramatic whitespace)

---

## 3. Visual Theme System {#visual-theme-system}

The theme system has three independent dimensions. Each can be configured separately from the layout preset. A Professional layout with a bold palette is valid. A Creative layout with comfortable density is valid. The combinations are intentionally unconstrained.

### 3.1 Color Palettes

Predefined palette sets that override the base persona-type colors:

| Palette   | Description                                      | Accent Example  |
| --------- | ------------------------------------------------ | --------------- |
| `default` | Inherits persona-type color (green/blue/purple)  | Per entity type |
| `warm`    | Amber and terracotta tones                       | `#d97706`       |
| `cool`    | Slate and blue tones                             | `#3b82f6`       |
| `earth`   | Olive and forest tones                           | `#65a30d`       |
| `bold`    | High-contrast, saturated                         | `#ef4444`       |
| `neutral` | Grayscale with a single accent color             | User-selected   |
| `custom`  | User picks one accent color, system derives rest | User-selected   |

The `custom` palette uses the user-selected accent color to derive a full set of complementary shades (hover states, muted backgrounds, border colors) via OKLCH color math. This ensures accessibility contrast ratios are maintained regardless of the accent chosen.

### 3.2 Header Treatments

| Treatment  | Description                                        | Best paired with      |
| ---------- | -------------------------------------------------- | --------------------- |
| `gradient` | Default. Gradient from accent color to background. | Professional, Service |
| `solid`    | Flat accent color block.                           | Community             |
| `image`    | User-uploaded banner image.                        | Creative, Community   |
| `minimal`  | No header treatment. Content starts immediately.   | Personal              |

### 3.3 Density

| Density       | Spacing | Typography Scale | Best paired with        |
| ------------- | ------- | ---------------- | ----------------------- |
| `comfortable` | Default | Default          | Professional, Community |
| `airy`        | +40%    | +1 step          | Personal, Creative      |
| `compact`     | -20%    | Default          | Service                 |

Density affects padding, margin, gap, and font-size scaling across all section components. It is applied as a CSS custom property (`--layout-density`) that section components consume.

---

## 4. Preset Comparison {#preset-comparison}

| Dimension             | Professional                                                                | Personal                                                         | Community                                                     | Service                                                                  | Creative                                                            |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Default for**       | Person entities                                                             | User-selected                                                    | Org entities                                                  | User-selected                                                            | User-selected                                                       |
| **Visitor question**  | Competent/trustworthy?                                                      | Who is this person?                                              | Should I join?                                                | Can I hire them?                                                         | What does the work feel like?                                       |
| **Hero layout**       | `standard`                                                                  | `minimal`                                                        | `standard`                                                    | `storefront`                                                             | `banner`                                                            |
| **Hero elements**     | Photo, Name, Headline, Location, Metrics, Top Skills                        | Large Photo, Name, Tagline, Qualities                            | Logo, Name, Mission, Member Count, Tags                       | Photo, Name, Headline, Location, Trust Score, Mini-cards                 | Banner Image, Name, Tagline, Focus Descriptors                      |
| **Primary CTA**       | Request Introduction                                                        | Connect                                                          | Join / Learn More                                             | Request a Quote                                                          | Collaborate / Hire                                                  |
| **CTA style**         | `primary`                                                                   | `outline`                                                        | `primary`                                                     | `primary`                                                                | `outline`                                                           |
| **Section order**     | Endorsements, Skills, Experience, Education, Offerings, Focus Areas, Values | Interests, Qualities, Focus Areas, Offerings, Skills, Experience | Mission, Offerings, Endorsements, Focus Areas, Skills, Values | Offerings, Endorsements, Skills, Certifications, Experience, Focus Areas | Focus Areas, Offerings, Skills, Endorsements, Interests, Experience |
| **Endorsement style** | `testimonial`                                                               | `minimal`                                                        | `testimonial`                                                 | `review`                                                                 | `minimal`                                                           |
| **Skill display**     | `detailed`                                                                  | `tags`                                                           | `tags`                                                        | `detailed`                                                               | `tags`                                                              |
| **Default density**   | Comfortable                                                                 | Airy                                                             | Comfortable                                                   | Compact                                                                  | Airy                                                                |
| **Scan pattern**      | F-pattern                                                                   | Z-pattern                                                        | F + Z hybrid                                                  | F-pattern                                                                | Z-pattern                                                           |
| **Inspiration**       | LinkedIn, Upwork, Wellfound                                                 | About.me, Instagram, Linktree                                    | Meetup, Discord, Facebook Groups                              | Thumbtack, Angi, Fiverr                                                  | Behance, Dribbble, Cargo                                            |

---

## 5. Data Model Changes {#data-model-changes}

Two new fields on the `personas` table (`lib/db/schema/personas.ts`):

### 5.1 `layoutPreset`

```sql
layout_preset TEXT NOT NULL DEFAULT 'auto'
```

Valid values: `'professional'` | `'personal'` | `'community'` | `'service'` | `'creative'` | `'auto'`

When set to `'auto'` (the default), the public page resolves the preset at render time based on `entityType`:

| `entityType`   | Resolved preset |
| -------------- | --------------- |
| `person`       | `professional`  |
| `organization` | `community`     |

Users can override this to any preset in persona settings, at which point the value is stored explicitly.

### 5.2 `theme`

```sql
theme JSONB NOT NULL DEFAULT '{}'
```

TypeScript interface:

```typescript
interface PersonaTheme {
  palette?: 'default' | 'warm' | 'cool' | 'earth' | 'bold' | 'neutral' | 'custom';
  headerStyle?: 'gradient' | 'solid' | 'image' | 'minimal';
  density?: 'comfortable' | 'airy' | 'compact';
  accentColor?: string; // hex color, used when palette is 'custom' or 'neutral'
}
```

An empty object `{}` means "use all defaults." Each field is independently optional. Partial overrides are valid: `{ palette: 'warm' }` means warm palette with default header style and default density.

### 5.3 Schema Change (Drizzle)

```typescript
// In lib/db/schema/personas.ts — add to the personas table definition:
layoutPreset: text('layout_preset').notNull().default('auto'),
theme: jsonb('theme').notNull().default('{}'),
```

No new indexes required. These fields are read at render time, not queried against.

---

## 6. Layout Configuration Architecture {#layout-configuration-architecture}

### 6.1 LayoutConfig Interface

A single data interface drives all five presets:

```typescript
interface LayoutConfig {
  /** Hero visual structure */
  heroLayout: 'standard' | 'banner' | 'minimal' | 'storefront';

  /** Ordered list of trait sections to render */
  sectionOrder: TraitSection[];

  /** Metrics displayed in the hero zone (e.g., endorsement count, skills count) */
  heroMetrics: string[];

  /** Primary CTA button text */
  ctaLabel: string;

  /** Primary CTA button style */
  ctaStyle: 'primary' | 'outline';

  /** Content density */
  density: 'comfortable' | 'airy' | 'compact';

  /** How endorsements render */
  endorsementStyle: 'testimonial' | 'review' | 'minimal';

  /** How skills render */
  skillDisplay: 'detailed' | 'tags' | 'minimal';
}

type TraitSection =
  | 'endorsements'
  | 'skills'
  | 'experience'
  | 'education'
  | 'offerings'
  | 'focusAreas'
  | 'values'
  | 'qualities'
  | 'interests'
  | 'mission'
  | 'certifications';
```

### 6.2 Preset Config Objects

Each preset is a static `LayoutConfig` object:

```typescript
const LAYOUT_PRESETS: Record<string, LayoutConfig> = {
  professional: {
    heroLayout: 'standard',
    sectionOrder: [
      'endorsements',
      'skills',
      'experience',
      'education',
      'offerings',
      'focusAreas',
      'values',
    ],
    heroMetrics: ['endorsementCount', 'skillCount', 'yearsExperience'],
    ctaLabel: 'Request Introduction',
    ctaStyle: 'primary',
    density: 'comfortable',
    endorsementStyle: 'testimonial',
    skillDisplay: 'detailed',
  },
  personal: {
    heroLayout: 'minimal',
    sectionOrder: ['interests', 'qualities', 'focusAreas', 'offerings', 'skills', 'experience'],
    heroMetrics: [],
    ctaLabel: 'Connect',
    ctaStyle: 'outline',
    density: 'airy',
    endorsementStyle: 'minimal',
    skillDisplay: 'tags',
  },
  community: {
    heroLayout: 'standard',
    sectionOrder: ['mission', 'offerings', 'endorsements', 'focusAreas', 'skills', 'values'],
    heroMetrics: ['memberCount', 'activityLevel', 'foundedDate'],
    ctaLabel: 'Join / Learn More',
    ctaStyle: 'primary',
    density: 'comfortable',
    endorsementStyle: 'testimonial',
    skillDisplay: 'tags',
  },
  service: {
    heroLayout: 'storefront',
    sectionOrder: [
      'offerings',
      'endorsements',
      'skills',
      'certifications',
      'experience',
      'focusAreas',
    ],
    heroMetrics: ['trustScore', 'endorsementCount'],
    ctaLabel: 'Request a Quote',
    ctaStyle: 'primary',
    density: 'compact',
    endorsementStyle: 'review',
    skillDisplay: 'detailed',
  },
  creative: {
    heroLayout: 'banner',
    sectionOrder: ['focusAreas', 'offerings', 'skills', 'endorsements', 'interests', 'experience'],
    heroMetrics: [],
    ctaLabel: 'Collaborate / Hire',
    ctaStyle: 'outline',
    density: 'airy',
    endorsementStyle: 'minimal',
    skillDisplay: 'tags',
  },
};
```

### 6.3 Rendering Pipeline

```
1. Fetch persona from DB (includes layoutPreset, theme, traits, entityType)
                    |
2. Resolve preset:  layoutPreset === 'auto'
                      ? defaultForEntityType(entityType)
                      : layoutPreset
                    |
3. Get LayoutConfig: LAYOUT_PRESETS[resolvedPreset]
                    |
4. Apply theme overrides: merge theme.density into config (theme wins)
                    |
5. Render <PersonaPublicPage config={config} theme={theme} persona={persona} />
                    |
6. Page renders:
     <HeroZone layout={config.heroLayout} ... />
     {config.sectionOrder.map(section =>
       <TraitSection key={section} variant={config[section + 'Style']} ... />
     )}
```

All section components already exist (or will exist) as metadata-driven renderers from the trait_metadata system. The layout engine does not create new components. It orchestrates existing ones by passing configuration props that control variant, density, and display style.

---

## 7. Smart Defaults {#smart-defaults}

### 7.1 Automatic Preset Resolution

| Scenario                                       | Resolved preset | Rationale                                                 |
| ---------------------------------------------- | --------------- | --------------------------------------------------------- |
| New person persona, no override                | Professional    | Most person personas are professional-context first       |
| New organization persona, no override          | Community       | Organizations default to community-building framing       |
| User explicitly selects "Personal" in settings | Personal        | Stored as `layoutPreset: 'personal'`, bypasses auto logic |
| User explicitly selects "Service" in settings  | Service         | Stored as `layoutPreset: 'service'`, bypasses auto logic  |

### 7.2 Theme Defaults per Preset

When `theme` is `{}` (empty), the rendering engine applies preset-appropriate defaults:

| Preset       | Default palette | Default header | Default density |
| ------------ | --------------- | -------------- | --------------- |
| Professional | `default`       | `gradient`     | `comfortable`   |
| Personal     | `default`       | `minimal`      | `airy`          |
| Community    | `default`       | `solid`        | `comfortable`   |
| Service      | `default`       | `gradient`     | `compact`       |
| Creative     | `default`       | `image`        | `airy`          |

These defaults are suggestions, not constraints. A user can pair any theme dimension with any preset.

### 7.3 Coach Integration

The Persona Coach agent can suggest layout presets contextually:

- If a user's traits are heavy on offerings and certifications, the Coach may suggest "Your persona might work well as a **Service** layout -- it puts your offerings front and center."
- If the user uploads portfolio-style images or describes themselves with creative language, the Coach may suggest the Creative layout.
- Suggestions are non-blocking. The Coach never auto-switches layouts.

---

## 8. Eye-Tracking Rationale {#eye-tracking-rationale}

The preset designs are informed by the research documented in `docs/patterns/profile-page-design.md`. Key findings that shaped these presets:

### 8.1 The 300-400px Rule

The top 300-400px of any profile page receives 80%+ of initial attention. Every preset puts the most important trust/identity signal in this zone:

| Preset       | What's in the top 400px                              |
| ------------ | ---------------------------------------------------- |
| Professional | Photo, name, headline, endorsement count, top skills |
| Personal     | Large photo, name, tagline, qualities                |
| Community    | Logo, name, mission, member count                    |
| Service      | Photo, name, trust score, top 3 offerings            |
| Creative     | Full-width banner image, name, tagline               |

### 8.2 Scan Patterns

**F-pattern** layouts (Professional, Service) place the most critical content in the top-left quadrant and structure sections as horizontal scan bands. These are appropriate for text-heavy, evaluation-oriented pages where visitors are scanning for specific data points.

**Z-pattern** layouts (Personal, Creative) center content and use dramatic whitespace to guide the eye diagonally. These are appropriate for personality-forward or visually-driven personas where the experience is about impression, not evaluation.

**Hybrid** (Community) uses a visual header (cover image or gradient) that triggers initial Z-pattern eye movement, then transitions to F-pattern for the text content below.

### 8.3 Faces as Attention Anchors

Eye-tracking research consistently shows that faces are the strongest attention anchors on any page. All five presets lead with a photo or avatar. The Personal preset makes the photo larger. The Creative preset uses a banner but still anchors the name/identity directly below. No preset buries the face below the fold.

### 8.4 Endorsements as Differentiator

The research in `docs/patterns/profile-page-design.md` found that endorsements with relationship context is a pattern no current platform does well:

- LinkedIn buries recommendations at the bottom of the page.
- Upwork shows reviews but without relationship depth.
- Thumbtack shows star ratings but no narrative context.

Personus makes endorsements a first-class section across all presets. In the Professional and Community presets, endorsements appear as the first or second scrollable section. In the Service preset, they render in review format with project context and outcomes. Even in Personal and Creative presets (where endorsements are lower priority), they are always present and accessible within two scrolls.

This is a deliberate competitive differentiator: trust signals should be as prominent as the content they validate.

---

## 9. Implementation Phases {#implementation-phases}

### Phase 1: Professional + Personal (Weeks 5-6)

**Goal:** Cover the two person-entity layout variants. Most users will use one of these.

- Add `layoutPreset` and `theme` columns to the `personas` table
- Implement `LayoutConfig` interface and preset config objects
- Build `<PersonaPublicPage>` component with config-driven rendering
- Build `<HeroZone>` with `standard` and `minimal` variants
- Build section ordering logic (map over `sectionOrder`, render existing trait section components)
- Wire `auto` resolution (person -> professional)
- Add layout picker to persona settings UI (Professional / Personal toggle)
- No theme picker yet -- defaults only

**Deliverables:**

- Public persona page renders with Professional layout by default
- Users can switch to Personal layout in settings
- Both layouts are mobile-responsive

### Phase 2: Community + Schema Fields (Weeks 7-8)

**Goal:** Cover organization entities and introduce theme controls.

- Build `<HeroZone>` `standard` variant for organization context (logo instead of photo, member metrics)
- Wire `auto` resolution (organization -> community)
- Implement the `community` preset config
- Build theme picker UI (palette selector, header style selector, density slider)
- Persist theme selections to `theme` JSONB column
- Apply theme CSS custom properties at render time

**Deliverables:**

- Organization personas render with Community layout by default
- Theme picker available in persona settings for all entity types
- All three implemented presets respect theme overrides

### Phase 3: Service + Creative + Coach Suggestions (Weeks 9-10)

**Goal:** Complete the preset suite and integrate with the Persona Coach.

- Build `<HeroZone>` `storefront` variant (offering mini-cards in hero)
- Build `<HeroZone>` `banner` variant (full-width image hero)
- Implement `service` and `creative` preset configs
- Build endorsement `review` variant (star-style with project context)
- Add Coach suggestion logic for layout recommendations
- Add custom accent color picker for `custom` and `neutral` palettes
- End-to-end QA across all 5 presets x 7 palettes x 4 header treatments x 3 densities

**Deliverables:**

- All five layout presets available
- Full theme system operational
- Coach can suggest layout changes contextually
- Public persona pages are fully customizable

---

## Appendix A: Hero Zone Variant Summary

```
STANDARD (Professional, Community)          MINIMAL (Personal)
+---+---------------------------+--+        +---------------------------+
| P |  Name / Headline / Loc    |CT|        |        +------+          |
| H |  Metrics row              |A |        |        | Photo|          |
| O |  Top skills / tags        |  |        |        +------+          |
| T |                           |  |        |     Name / Tagline       |
| O |                           |  |        |     Qualities            |
+---+---------------------------+--+        |        [CTA]             |
                                            +---------------------------+

STOREFRONT (Service)                        BANNER (Creative)
+---+---------------------------+--+        +---------------------------+
| P |  Name / Headline / Loc    |CT|        |  [full-width image]       |
| H |  Trust score / Endorsements|A|        |                           |
| O |                           |  |        +---------------------------+
| T +--------+--------+--------+  |        |     Name / Tagline        |
| O | Offer1 | Offer2 | Offer3 |  |        |     Focus descriptors     |
+---+--------+--------+--------+--+        |   [CTA]       [CTA]       |
                                            +---------------------------+
```

## Appendix B: Relationship to Existing Systems

### Trait Metadata

The layout system does not replace the `trait_metadata`-driven rendering system described in `docs/patterns/ui-components.md`. Instead, it orchestrates it. Each entry in `sectionOrder` maps to a trait key whose `displayConfig` (from `trait_metadata`) determines how that section renders internally. The layout system controls order, visibility, and variant; the metadata system controls field-level rendering.

### Persona Types vs. Layout Presets

Persona `entityType` (`person`, `organization`) is a data-model concept that affects schema validation, search behavior, and trust graph semantics. Layout presets are a presentation concept that affects visual rendering only. They correlate (person defaults to Professional, organization defaults to Community) but are independently settable. A person entity can use the Community layout. An organization entity can use the Creative layout.

### Theme vs. Design Tokens

The Personus design token system (defined in `app/globals.css`) provides the base visual language. Theme overrides are applied on top of these tokens via CSS custom properties scoped to the persona public page. The theme system never modifies global tokens -- it layers persona-specific values that cascade within the public page component tree.
