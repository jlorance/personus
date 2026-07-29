---
type: spec
title: "Identity & Personas -- Public Pages"
description: "This spec covers the public persona page at /p/[uri] -- the primary way the outside world sees a persona. It defines SEO metadata generation, schema.org structured data (JSON-LD), AI Overview…"
status: current
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Public Pages

> Date: 2026-02-23
> Status: Current
> Depends on: `00-prd.md`, `04-persona-visibility.md`, `05-layout-and-theming.md`, `docs/foundation/data-model.md`, `docs/foundation/vision.md`
> Primary actors: Visitor (unauthenticated or non-owner viewer), Search Engines (Googlebot, Bingbot), AI Agents (ChatGPT, Perplexity, Gemini)

This spec covers the public persona page at `/p/[uri]` -- the primary way the outside world sees a persona. It defines SEO metadata generation, schema.org structured data (JSON-LD), AI Overview (AIO) optimization for AI-powered search, dynamic OG image generation, and the visitor interaction surface (endorsements, introduction requests, sharing). The public page renders based on the layout preset and theme system defined in spec 05, with visibility filtering from spec 04 applied before any data reaches the client.

---

## 1. Public Page Rendering

### Overview

The public persona page is a server-rendered page at `/p/[uri]` that displays a persona's published traits, endorsements, and identity to visitors. It uses the layout preset system (`lib/personas/layout-config.ts`) to determine section ordering, hero composition, and visual density. The page must render fast (no client-side data fetching), be fully crawlable, and degrade gracefully when optional data is missing. The existing implementation in `app/p/[uri]/page.tsx` and `app/p/[uri]/persona-public-view.tsx` provides the foundation -- this spec extends it with structured data, visitor CTAs, and community context.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  HERO ZONE (gradient/solid/image per theme)                     │ │
│ │                                                                 │ │
│ │  [JS]  Jamie Smith                                              │ │
│ │        Full-stack engineer & open-source contributor             │ │
│ │        Austin, TX  |  person  |  5 endorsements                 │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Visitor Action Bar ──────────────────────────────────────────── │
│ │ [Endorse]  [Request Introduction]  [Share]                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ─── Sections (layout-driven order) ───                              │
│                                                                     │
│ ┌─ Endorsements (if present) ─────────────────────────────────────┐ │
│ │ [AM] Alice M.  |  Colleague  |  Strong                         │ │
│ │ "Jamie is an exceptional engineer..."                           │ │
│ │                                                                 │ │
│ │ [BT] Bob T.  |  Client  |  Moderate                            │ │
│ │ "Delivered our platform on time and under budget."              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Skills ────────────────────────────────────────────────────────┐ │
│ │ [TypeScript] [React] [GraphQL] [PostgreSQL]  (with proficiency) │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Experience ────────────────────────────────────────────────────┐ │
│ │ Senior Engineer at Acme Corp  (2022 - Present)                  │ │
│ │ Software Developer at StartupXYZ  (2019 - 2022)                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ... (remaining sections per layout preset) ...                      │
│                                                                     │
│ ┌─ Community Context (if ?community=xyz) ─────────────────────────┐ │
│ │ Member of Portland Tech Guild  |  Role: Steward                 │ │
│ │ Community traits: mentoring, code review                        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Sticky CTA ───────────────────────────────────────────────────┐ │
│ │              [Request Introduction]  (mobile: sticky bottom)    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Footer ────────────────────────────────────────────────────────┐ │
│ │ Personus -- AI-native identity for capability-based discovery   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ <!-- JSON-LD script (invisible, in <head>) -->                      │
│ <script type="application/ld+json">                                 │
│   { "@context": "https://schema.org", "@type": "Person", ... }     │
│ </script>                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/p/[uri]/page.tsx                            ← EXISTS: Server Component (data fetching, metadata)
  ├─ generateMetadata()                         ← EXISTS (ENHANCED: OG image, structured tags)
  ├─ getPublicPersona()                         ← EXISTS (ENHANCED: community context)
  ├─ app/p/[uri]/persona-public-view.tsx        ← EXISTS: Client Component (ENHANCED: visitor bar)
  │    ├─ components/trait-displays.tsx           ← EXISTS: TraitDisplay component
  │    ├─ app/p/[uri]/visitor-action-bar.tsx     ← NEW: Client Component
  │    │    ├─ components/share-persona-dialog.tsx ← EXISTS
  │    │    └─ app/(dashboard)/personas/[uri]/request-intro-button.tsx ← EXISTS (extracted)
  │    ├─ app/p/[uri]/endorsement-section.tsx    ← NEW: extracted from persona-public-view.tsx
  │    └─ app/p/[uri]/community-context.tsx      ← NEW: optional community membership display
  ├─ app/p/[uri]/json-ld.tsx                    ← NEW: Server Component (JSON-LD script)
  └─ calls:
       ├─ lib/db/queries.ts → getPersonaByUri()          ← EXISTS
       ├─ lib/db/queries.ts → getEndorsementsForPersona() ← EXISTS
       └─ lib/db/queries.ts → getCommunityMembers()       ← EXISTS
```

### Workflows & Stories

---

#### Workflow: Visitor views a public persona page

**Preconditions:**
- Visitor has a URL to `/p/[uri]` (shared link, search result, QR code, or direct navigation)
- No authentication required for public personas

**Stories:**

**[1.1] Render public persona page from server**
> Visitor navigates to `/p/[uri]` so that they can see the persona's published identity and traits.

- **User:** Any visitor (authenticated or not).
- **Functional:** Server component fetches persona by URI, checks visibility (private returns 404, community returns 404 for unauthenticated visitors), resolves layout preset (via `resolveLayoutPreset()`), fetches endorsements and trait metadata in parallel. Passes resolved data to `PersonaPublicView` client component. Hero zone renders avatar, display name, headline, location, entity badge, and endorsement count. Sections render in layout-defined order. Empty sections are skipped. The page renders with zero client-side data fetching.
- **Technical:** Existing `app/p/[uri]/page.tsx` with `getPublicPersona()` (lines 15-23) and default export (lines 46-79). Enhancement: the visibility check currently only gates `private`; extend to also gate `community` personas when the visitor is not authenticated and not a community member. The `PersonaPublicView` at `app/p/[uri]/persona-public-view.tsx` renders hero and sections (lines 107-214).
- **Acceptance criteria:**
  - [ ] Public persona renders with all base fields (name, headline, location)
  - [ ] Trait sections render in layout-defined order from `layoutConfig.sectionOrder`
  - [ ] Empty trait sections are not rendered (existing behavior in `TraitSection`, line 228-229)
  - [ ] Private personas return Next.js `notFound()` (existing, line 19)
  - [ ] Community-visibility personas return `notFound()` for unauthenticated visitors
  - [ ] Page is fully server-rendered (no `useEffect` data fetching)
  - [ ] Layout preset resolved from `persona.layoutPreset` and `persona.entityType`
  - [ ] Theme colors applied from `persona.theme` JSONB via `getLayoutConfig()`
- **Failure paths:**
  - If URI does not match any persona: `notFound()` renders global 404 page
  - If database is unreachable: Next.js error boundary catches

**[1.2] Display visitor action bar**
> Visitor sees actionable buttons (endorse, request introduction, share) so that they can interact with the persona.

- **User:** Any visitor on the public page.
- **Functional:** A horizontal action bar appears below the hero zone with three buttons: "Endorse" (links to `/endorse/[uri]`), "Request Introduction" (opens contact request flow -- requires auth), and "Share" (opens share dialog). The CTA label on the existing sticky bottom bar changes to match the layout preset's `ctaLabel` (e.g., "Request Introduction" for professional, "Say Hello" for personal). On mobile, the primary CTA is sticky at the bottom of the viewport (existing behavior).
- **Technical:** New `app/p/[uri]/visitor-action-bar.tsx` client component. Receives `personaUri`, `displayName`, and `ctaLabel` props. Renders three `Button` components. "Endorse" is a `Link` to `/endorse/{uri}`. "Request Introduction" uses the existing `RequestIntroButton` from `app/(dashboard)/personas/[uri]/request-intro-button.tsx` (needs extraction to a shared location or re-export). "Share" uses existing `SharePersonaDialog` from `components/share-persona-dialog.tsx`. The `PersonaPublicView` component renders the visitor action bar between the hero and sections.
- **Acceptance criteria:**
  - [ ] Endorse button links to `/endorse/{uri}` (existing page at `app/endorse/[uri]/page.tsx`)
  - [ ] Request Introduction button calls `sendContactRequestAction` (requires authentication)
  - [ ] Share button opens `SharePersonaDialog` with correct public URL
  - [ ] Buttons render in a horizontal row on desktop, stacked on mobile
  - [ ] Primary CTA label matches layout preset (from `layoutConfig.ctaLabel`)
  - [ ] On mobile, primary CTA stays sticky at viewport bottom
- **Failure paths:**
  - If visitor clicks "Request Introduction" without being authenticated: redirect to sign-in with return URL
  - If contact request fails: toast error via sonner

**[1.3] Display endorsements on the public page**
> Visitor sees endorsements for this persona so that they can evaluate trust signals.

- **User:** Any visitor on the public page.
- **Functional:** Endorsements render in the section position defined by the layout preset. Display style varies by preset: cards (professional/service), inline badges (personal), testimonial carousel (community/creative), or count-only. Each endorsement shows: endorser identifier (name or initial), relationship type badge, strength badge (for "strong"), testimonial text (if present), and context tags. The endorsement count also appears in the hero zone as a gold-accented badge.
- **Technical:** Extract `EndorsementSection` from `app/p/[uri]/persona-public-view.tsx` (lines 241-302) into `app/p/[uri]/endorsement-section.tsx`. Server component fetches endorsements via `getEndorsementsForPersona(persona.uri)` at `lib/db/queries.ts` line 19. Currently passes `endorsements` array and `style` to the section component. Enhancement: add testimonial carousel rendering for `endorsementStyle: 'testimonial-carousel'` and `count-only` display modes.
- **Acceptance criteria:**
  - [ ] Endorsements render in layout-defined position within `sectionOrder`
  - [ ] Card style shows full endorsement details (existing behavior)
  - [ ] Inline style shows compact badges (existing behavior)
  - [ ] Testimonial carousel cycles through endorsements with testimonials
  - [ ] Count-only style shows "N endorsements" badge without individual cards
  - [ ] Zero endorsements: section not rendered (existing behavior, line 160)
  - [ ] Endorsement count in hero zone shows gold accent badge (existing, line 141-147)
  - [ ] Context tags render as secondary badges (existing, lines 287-295)
- **Failure paths:**
  - If endorsement fetch fails: endorsements array is empty, section not rendered (existing try/catch, lines 60-64)

**[1.4] Community context display**
> Visitor sees the persona's community membership context when navigating from a community link so that they understand the persona's role in that community.

- **User:** Visitor who arrived via a community-scoped link (`/p/[uri]?community=[communityId]`).
- **Functional:** When the `community` query parameter is present, an additional "Community Context" section renders below the main sections. Shows: community name, the persona's role in that community (member/steward/admin), and any `memberTraits` the persona has shared in that community. If the community parameter is invalid or the persona is not a member, the section is omitted silently.
- **Technical:** New `app/p/[uri]/community-context.tsx` server component. The parent `page.tsx` reads `searchParams.community`, queries `communityMembers` joined with `communities` for matching `personaId` + `communityId`. Passes result to the community context component. Uses existing `getCommunityMembers()` pattern from `lib/db/queries.ts` but filtered for a single persona + community.
- **Acceptance criteria:**
  - [ ] Community context section renders when valid `?community=` param provided
  - [ ] Shows community name, persona's role, and member traits
  - [ ] Section omitted when `?community` param is absent
  - [ ] Section omitted when persona is not a member of the specified community
  - [ ] Invalid community ID does not cause page error (silently omitted)
- **Failure paths:**
  - If community query fails: section omitted, rest of page renders normally

**Workflow success:** Visitor sees a fully rendered public page with persona identity, traits in layout-defined order, endorsements, visitor action buttons, and optional community context. Page is server-rendered and crawlable.

---

### Schema

No new tables. Uses existing schema:

- `personas` table (`lib/db/schema/personas.ts`): `uri`, `displayName`, `headline`, `location`, `entityType`, `visibility`, `traits` (JSONB), `layoutPreset`, `theme` (JSONB), `contactPreferences` (JSONB)
- `endorsements` table (`lib/db/schema/endorsements.ts`): `fromPersonaUri`, `toPersonaUri`, `relationshipType`, `strength`, `testimonial`, `endorsementContext`, `active`
- `community_members` table (`lib/db/schema/communities.ts`): `personaId`, `communityId`, `role`, `memberTraits` (JSONB)
- `communities` table (`lib/db/schema/communities.ts`): `id`, `name`

### Server Actions

No new server actions for rendering. Uses existing functions:

```typescript
// lib/db/queries.ts — existing
getPersonaByUri(uri: string): Promise<Persona | null>
getEndorsementsForPersona(personaUri: string): Promise<Endorsement[]>

// NEW query helper — add to lib/db/queries.ts
getPersonaCommunityContext(personaId: string, communityId: string): Promise<{
  communityName: string;
  role: string;
  memberTraits: Record<string, unknown>;
} | null>
// No auth required. Returns membership + community info for display.
```

### Validation

No new validation schemas for rendering. The `uri` path parameter is validated by route matching. The `community` query parameter is a UUID validated before query:

```typescript
// Inline in app/p/[uri]/page.tsx
const communityId = searchParams?.community;
if (communityId && z.string().uuid().safeParse(communityId).success) {
  // fetch community context
}
```

### Edge Cases

- [ ] Persona has no traits: page renders with hero zone only, no sections
- [ ] Persona has no headline: hero renders name only, meta description falls back to display name
- [ ] Persona has no endorsements: endorsement section skipped, hero badge omitted
- [ ] Community query param references a community the persona is not in: section omitted silently
- [ ] URI contains special characters (URL-encoded): Drizzle handles via parameterized query
- [ ] Authenticated visitor views their own persona: page renders normally (no special owner treatment on public page; editing is at `/personas/[uri]/edit`)
- [ ] Persona visibility is `authenticated` and visitor is not signed in: return `notFound()`

### Test Criteria

**Unit tests:**
- `getPublicPersona()` returns null for private personas
- `getPublicPersona()` returns persona for public visibility
- Layout preset resolution for 'auto' with entity type 'person' returns 'professional'

**Integration tests:**
- Public page renders for a seeded public persona with all sections
- Community context renders when valid community param matches persona membership
- Community context omitted when community param is invalid

**E2E tests:**
- Navigate to `/p/{seeded-uri}`, verify hero zone renders with name/headline/location
- Verify endorsement section renders with seeded endorsements
- Click "Share" button, verify dialog opens with correct URL
- Click "Endorse" button, verify navigation to `/endorse/{uri}`
- Append `?community={id}` to URL, verify community context section appears

### Implementation Order

1. Add `getPersonaCommunityContext()` query helper to `lib/db/queries.ts`
2. Extract `EndorsementSection` from `persona-public-view.tsx` to `app/p/[uri]/endorsement-section.tsx` -- pure refactor
3. Create `app/p/[uri]/visitor-action-bar.tsx` with Endorse, Request Introduction, and Share buttons
4. Create `app/p/[uri]/community-context.tsx` server component for optional community display
5. Enhance `app/p/[uri]/page.tsx` to read `searchParams.community` and pass community context (requires steps 1, 4)
6. Integrate visitor action bar into `PersonaPublicView` between hero and sections (requires step 3)
7. Add testimonial carousel and count-only modes to `EndorsementSection` (requires step 2)
8. Write E2E test for full public page with endorsements, visitor actions, and community context

---

## 2. SEO Metadata

### Overview

Each public persona page generates comprehensive SEO metadata including title, description, canonical URL, Open Graph tags, and Twitter Card tags. The existing `generateMetadata()` function in `app/p/[uri]/page.tsx` provides basic title and description. This spec extends it with full OG tags (including generated images), Twitter cards, canonical URLs, and appropriate robots directives based on persona visibility.

### Wireframe

```
No visual wireframe — metadata lives in <head>:

<head>
  <title>Jamie Smith -- Personus</title>
  <meta name="description" content="Full-stack engineer & open-source contributor.
    Known for TypeScript, React, GraphQL. 5 endorsements. Based in Austin, TX." />
  <link rel="canonical" href="https://personus.ai/p/jamie-smith-abc123" />

  <!-- Open Graph -->
  <meta property="og:title" content="Jamie Smith" />
  <meta property="og:description" content="Full-stack engineer & open-source contributor" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="https://personus.ai/p/jamie-smith-abc123" />
  <meta property="og:image" content="https://personus.ai/api/og/persona/jamie-smith-abc123" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Personus" />
  <meta property="profile:first_name" content="Jamie" />
  <meta property="profile:last_name" content="Smith" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Jamie Smith" />
  <meta name="twitter:description" content="Full-stack engineer & open-source contributor" />
  <meta name="twitter:image" content="https://personus.ai/api/og/persona/jamie-smith-abc123" />

  <!-- Robots -->
  <meta name="robots" content="index, follow" />
</head>
```

### Component Hierarchy

```
app/p/[uri]/page.tsx → generateMetadata()     ← EXISTS (ENHANCED)
  └─ lib/personas/seo.ts                      ← NEW: SEO metadata builder utilities
       ├─ buildPersonaDescription()            ← Generates rich meta description
       ├─ buildOpenGraphMetadata()             ← OG tags from persona data
       └─ buildRobotsDirective()               ← Robots directive from visibility
```

### Workflows & Stories

---

#### Workflow: Search engine crawls a public persona page

**Preconditions:**
- Persona exists and has `visibility: 'public'`
- Search engine crawler (Googlebot, Bingbot) requests `/p/[uri]`

**Stories:**

**[2.1] Generate comprehensive meta description**
> Search engine receives a rich meta description so that the SERP snippet accurately represents the persona.

- **User:** Googlebot or Bingbot crawling the page.
- **Functional:** The meta description is generated from persona data, not a static string. Format: `"{headline}. Known for {top 3 skills}. {endorsement count} endorsements. Based in {location}."`. If parts are missing, they are omitted gracefully. Max 160 characters (truncated with ellipsis if needed). The description prioritizes the most discovery-relevant information: what they do (headline), what they know (skills), trust signals (endorsements), and where they are (location).
- **Technical:** New `lib/personas/seo.ts` exports `buildPersonaDescription(persona, endorsementCount)`. Called by `generateMetadata()` in `app/p/[uri]/page.tsx` (line 36). Currently the description is `persona.headline || \`${persona.displayName} on Personus\`` (line 38). Enhancement replaces this with the richer builder.
- **Acceptance criteria:**
  - [ ] Description includes headline when present
  - [ ] Description includes top 3 skill names when skills trait is non-empty
  - [ ] Description includes endorsement count when > 0
  - [ ] Description includes location when present
  - [ ] Description is 160 characters or fewer
  - [ ] Falls back to `"{displayName} on Personus"` when all optional fields are empty
  - [ ] No trailing punctuation issues when optional parts are missing
- **Failure paths:**
  - If traits JSONB is malformed: falls back to headline-only description

**[2.2] Generate Open Graph metadata**
> Social platforms (Facebook, LinkedIn, Slack, iMessage) render a rich preview card so that shared persona links look professional.

- **User:** Someone shares a persona URL on a social platform or messaging app.
- **Functional:** OG metadata includes: `og:title` (display name), `og:description` (headline), `og:type` (profile), `og:url` (canonical URL), `og:image` (generated OG image URL), `og:image:width` (1200), `og:image:height` (630), `og:site_name` (Personus). For person entities, also includes `profile:first_name` and `profile:last_name` (best-effort split from displayName). The OG image URL points to the dynamic OG image endpoint defined in feature 4.
- **Technical:** Enhancement to `generateMetadata()` in `app/p/[uri]/page.tsx`. New `buildOpenGraphMetadata()` helper in `lib/personas/seo.ts`. Uses Next.js `Metadata` type from `next`. The `NEXT_PUBLIC_APP_URL` env var provides the base URL for canonical and image URLs. Falls back to `https://personus.ai` if not set.
- **Acceptance criteria:**
  - [ ] `og:title` is the persona display name
  - [ ] `og:description` is the headline (not the full meta description)
  - [ ] `og:type` is `profile`
  - [ ] `og:url` is the canonical URL (`{APP_URL}/p/{uri}`)
  - [ ] `og:image` points to `/api/og/persona/{uri}` (dynamic OG image)
  - [ ] `og:image:width` is 1200, `og:image:height` is 630
  - [ ] `og:site_name` is "Personus"
  - [ ] `profile:first_name` and `profile:last_name` set for person entities
  - [ ] Organization entities omit `profile:first_name`/`profile:last_name`
- **Failure paths:**
  - If `NEXT_PUBLIC_APP_URL` is not set: OG image URL is relative (still works for most platforms)

**[2.3] Generate Twitter Card metadata**
> X/Twitter renders a rich card when a persona URL is shared so that the persona is presented attractively.

- **User:** Someone shares a persona URL on X/Twitter.
- **Functional:** Twitter Card with `summary_large_image` type. Includes `twitter:title`, `twitter:description`, `twitter:image`. The image is the same dynamic OG image used for Open Graph.
- **Technical:** Add `twitter` key to the `Metadata` return object in `generateMetadata()`. Next.js automatically renders Twitter meta tags from the `twitter` property.
- **Acceptance criteria:**
  - [ ] `twitter:card` is `summary_large_image`
  - [ ] `twitter:title` is the display name
  - [ ] `twitter:description` is the headline
  - [ ] `twitter:image` points to the dynamic OG image endpoint
- **Failure paths:**
  - None (metadata-only, no runtime behavior)

**[2.4] Set robots directive based on visibility**
> Search engines only index public personas so that private and community-only personas stay out of search results.

- **User:** Search engine crawling any persona page.
- **Functional:** Public personas: `index, follow`. Authenticated/community personas: `noindex, nofollow`. Private personas never reach this point (404). The robots directive is set via the `robots` property in Next.js `Metadata`.
- **Technical:** New `buildRobotsDirective(visibility)` in `lib/personas/seo.ts`. Returns `{ index: true, follow: true }` for public, `{ index: false, follow: false }` for authenticated/community. Added to `generateMetadata()` return.
- **Acceptance criteria:**
  - [ ] Public personas: `robots` is `index, follow`
  - [ ] Authenticated personas: `robots` is `noindex, nofollow`
  - [ ] Community personas: `robots` is `noindex, nofollow`
  - [ ] Private personas: never reach metadata (404 first)
- **Failure paths:**
  - None (metadata-only)

**[2.5] Set canonical URL**
> Search engines see a canonical URL so that duplicate content issues are avoided (e.g., with/without query params).

- **User:** Search engine crawling the page.
- **Functional:** Canonical URL is `{APP_URL}/p/{uri}` with no query parameters (community context param is not canonical). Prevents duplicate indexing from `?community=xyz` variants.
- **Technical:** Add `alternates: { canonical: \`${appUrl}/p/${uri}\` }` to `generateMetadata()` return. `appUrl` from `process.env.NEXT_PUBLIC_APP_URL || 'https://personus.ai'`.
- **Acceptance criteria:**
  - [ ] Canonical URL is set to `{APP_URL}/p/{uri}`
  - [ ] Query parameters are excluded from canonical URL
  - [ ] Canonical is absolute (includes protocol and domain)
- **Failure paths:**
  - None (metadata-only)

**Workflow success:** Search engines receive comprehensive metadata for public personas, including rich descriptions, OG tags for social sharing, Twitter cards, robots directives, and canonical URLs. Non-public personas are excluded from search indexing.

---

### Schema

No schema changes.

### Server Actions

No new server actions. Metadata generation is server-side in `generateMetadata()`.

### Validation

No new validation schemas. The description builder validates input defensively (null checks, type guards on traits).

### Edge Cases

- [ ] Display name with no spaces (mononym): `profile:first_name` set, `profile:last_name` omitted
- [ ] Display name with 3+ words: first word is first_name, rest is last_name
- [ ] Headline is 300+ characters: meta description truncates to 160 chars with ellipsis
- [ ] Skills array is empty: skills portion of description omitted
- [ ] `NEXT_PUBLIC_APP_URL` not set: canonical and OG URLs use relative paths
- [ ] Special characters in display name or headline: properly HTML-escaped by Next.js

### Test Criteria

**Unit tests:**
- `buildPersonaDescription()` with full data returns correct format under 160 chars
- `buildPersonaDescription()` with empty skills omits skills portion
- `buildPersonaDescription()` with no headline falls back to display name
- `buildRobotsDirective('public')` returns `{ index: true, follow: true }`
- `buildRobotsDirective('community')` returns `{ index: false, follow: false }`
- `buildOpenGraphMetadata()` includes `profile:first_name` for person entities
- `buildOpenGraphMetadata()` omits profile fields for organization entities

**E2E tests:**
- Navigate to public persona page, inspect HTML `<meta>` tags for OG and Twitter
- Verify canonical URL is absolute and excludes query params

### Implementation Order

1. Create `lib/personas/seo.ts` with `buildPersonaDescription()`, `buildOpenGraphMetadata()`, `buildRobotsDirective()`
2. Enhance `generateMetadata()` in `app/p/[uri]/page.tsx` to use new SEO builders (requires step 1)
3. Add `twitter`, `robots`, and `alternates.canonical` to metadata return
4. Write unit tests for all SEO builder functions
5. Write E2E test to verify meta tags in rendered HTML

---

## 3. Structured Data (JSON-LD)

### Overview

Each public persona page includes schema.org structured data in JSON-LD format, embedded as a `<script type="application/ld+json">` in the page. This enables rich results in Google Search (knowledge panels, rich snippets) and provides machine-readable identity data for AI agents and crawlers. The structured data maps Personus persona traits to established schema.org types: `Person` or `Organization`, with nested `hasOccupation`, `alumniOf`, `hasCredential`, `knowsAbout`, and `InteractionCounter` for endorsements.

### Wireframe

```
Not a visual component — rendered as a <script> tag in the page:

{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://personus.ai/p/jamie-smith-abc123",
  "name": "Jamie Smith",
  "description": "Full-stack engineer & open-source contributor",
  "jobTitle": "Full-stack Engineer",
  "url": "https://personus.ai/p/jamie-smith-abc123",
  "image": "https://personus.ai/api/og/persona/jamie-smith-abc123",

  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Austin",
    "addressRegion": "TX"
  },

  "knowsAbout": [
    "TypeScript", "React", "GraphQL", "PostgreSQL"
  ],

  "hasOccupation": [
    {
      "@type": "Occupation",
      "name": "Senior Engineer",
      "occupationalCategory": "15-1252.00"
    }
  ],

  "alumniOf": [
    {
      "@type": "EducationalOrganization",
      "name": "University of Texas at Austin"
    }
  ],

  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "name": "AWS Solutions Architect",
      "credentialCategory": "certification",
      "recognizedBy": {
        "@type": "Organization",
        "name": "Amazon Web Services"
      }
    }
  ],

  "knowsLanguage": ["English", "Spanish"],

  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/EndorseAction",
    "userInteractionCount": 5
  },

  "makesOffer": [
    {
      "@type": "Offer",
      "description": "Code review & architecture guidance",
      "category": "mentorship"
    }
  ],

  "seeks": [
    {
      "@type": "Demand",
      "description": "Consulting"
    }
  ]
}
```

### Component Hierarchy

```
app/p/[uri]/json-ld.tsx                         ← NEW: Server Component
  └─ lib/personas/structured-data.ts            ← NEW: JSON-LD builder
       ├─ buildPersonJsonLd()                   ← For entityType === 'person'
       ├─ buildOrganizationJsonLd()             ← For entityType === 'organization'
       ├─ mapSkillsToKnowsAbout()              ← skills[] → string[]
       ├─ mapExperienceToOccupation()           ← experience[] → Occupation[]
       ├─ mapEducationToAlumniOf()              ← education[] → EducationalOrganization[]
       ├─ mapCertificationsToCredentials()      ← certifications[] → EducationalOccupationalCredential[]
       ├─ mapOfferingsToOffers()                ← offerings[] → Offer[]
       └─ mapEndorsementsToInteraction()        ← endorsementCount → InteractionCounter
```

### Workflows & Stories

---

#### Workflow: Search engine or AI agent parses structured data from persona page

**Preconditions:**
- Persona is public (`visibility: 'public'`)
- Crawler or AI agent requests the page and parses `<script type="application/ld+json">`

**Stories:**

**[3.1] Generate Person JSON-LD for individual personas**
> Google and AI agents parse structured Person data so that the persona can appear in knowledge panels and AI overviews.

- **User:** Googlebot, Perplexity, ChatGPT browse, or any JSON-LD consumer.
- **Functional:** For personas with `entityType: 'person'`, generate a `schema.org/Person` JSON-LD object. Map persona fields: `name` (displayName), `description` (headline), `jobTitle` (extracted from headline or first experience title), `url` (canonical URL), `image` (OG image URL), `address` (parsed from location string), `knowsAbout` (skill names), `hasOccupation` (from experience array), `alumniOf` (from education array), `hasCredential` (from certifications), `knowsLanguage` (from languages), `interactionStatistic` (endorsement count as EndorseAction), `makesOffer` (from offerings), `seeks` (from seekingOpportunities).
- **Technical:** New `lib/personas/structured-data.ts` with `buildPersonJsonLd()`. New `app/p/[uri]/json-ld.tsx` server component renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />`. Called from `app/p/[uri]/page.tsx` and placed before the closing tag. Trait data accessed via `persona.traits` as `Traits`.
- **Acceptance criteria:**
  - [ ] `@type` is `Person` for `entityType: 'person'`
  - [ ] `@id` is the canonical URL
  - [ ] `name` is the display name
  - [ ] `description` is the headline
  - [ ] `knowsAbout` contains skill names from `traits.skills`
  - [ ] `hasOccupation` maps each experience entry to an `Occupation` object
  - [ ] `alumniOf` maps each education entry to an `EducationalOrganization`
  - [ ] `hasCredential` maps each certification to `EducationalOccupationalCredential`
  - [ ] `knowsLanguage` is the languages array
  - [ ] `interactionStatistic` shows endorsement count with `EndorseAction` type
  - [ ] `makesOffer` maps offerings to `Offer` objects
  - [ ] `seeks` maps seekingOpportunities to `Demand` objects
  - [ ] JSON-LD validates against schema.org validator
  - [ ] Empty arrays produce omitted fields (not empty arrays in JSON-LD)
- **Failure paths:**
  - If traits JSONB parsing fails: JSON-LD includes only base fields (name, description, url)

**[3.2] Generate Organization JSON-LD for organization personas**
> Search engines parse Organization data so that organization personas appear correctly in knowledge panels.

- **User:** Search engine crawling an organization persona page.
- **Functional:** For personas with `entityType: 'organization'`, generate a `schema.org/Organization` JSON-LD object. Map: `name` (displayName), `description` (headline), `url` (canonical URL), `image` (OG image URL), `address` (from location), `knowsAbout` (from skills -- organization competencies), `makesOffer` (from offerings), `interactionStatistic` (endorsement count).
- **Technical:** `buildOrganizationJsonLd()` in `lib/personas/structured-data.ts`. Same pattern as Person but with `@type: 'Organization'` and without person-specific fields (jobTitle, alumniOf, hasOccupation).
- **Acceptance criteria:**
  - [ ] `@type` is `Organization` for `entityType: 'organization'`
  - [ ] Organization-specific fields included (no `jobTitle`, `alumniOf`, `hasOccupation`)
  - [ ] `knowsAbout` lists organization competencies from skills
  - [ ] `makesOffer` maps organization offerings
- **Failure paths:**
  - Same as 3.1 -- base fields only on parse failure

**[3.3] Map experience to Occupation with SOC codes**
> Experience entries include standardized occupation codes so that search engines can categorize the persona's professional background.

- **User:** Search engine parsing structured data.
- **Functional:** Each experience entry maps to a `schema.org/Occupation` object with `name` (title), `description` (description), `occupationalCategory` (SOC code if determinable). The SOC code mapping is best-effort based on common job titles. A static lookup table covers the top ~50 job title patterns to SOC codes (e.g., "software engineer" -> "15-1252.00", "product manager" -> "11-2021.00"). Unmatched titles omit `occupationalCategory`.
- **Technical:** `mapExperienceToOccupation()` in `lib/personas/structured-data.ts`. Static `SOC_CODE_MAP: Record<string, string>` with pattern-matched keys (lowercased title substrings). Matching is case-insensitive substring check against the map keys.
- **Acceptance criteria:**
  - [ ] Each experience entry produces an `Occupation` object
  - [ ] `name` is the experience title
  - [ ] Common titles (software engineer, product manager, designer) include SOC codes
  - [ ] Unknown titles omit `occupationalCategory` (do not include incorrect codes)
  - [ ] Current positions include `startDate` and omit `endDate`
  - [ ] Past positions include both `startDate` and `endDate`
- **Failure paths:**
  - If experience array is empty: `hasOccupation` field omitted from JSON-LD

**[3.4] Map certifications to EducationalOccupationalCredential**
> Certifications include issuing organization and credential metadata so that they appear in Google's rich results for credentials.

- **User:** Search engine parsing structured data.
- **Functional:** Each certification maps to `schema.org/EducationalOccupationalCredential` with `name`, `credentialCategory` ("certification"), `recognizedBy` (issuer as Organization), `dateCreated` (issueDate), `validUntil` (expiryDate), and `url` (credentialUrl). Fields are omitted when not present on the source `Certification` object.
- **Technical:** `mapCertificationsToCredentials()` in `lib/personas/structured-data.ts`. Accesses `traits.certifications` from the `Traits` interface.
- **Acceptance criteria:**
  - [ ] Each certification produces an `EducationalOccupationalCredential`
  - [ ] `recognizedBy` is an Organization with the issuer name
  - [ ] `url` included when `credentialUrl` is present
  - [ ] `validUntil` included when `expiryDate` is present
  - [ ] Missing optional fields are omitted (not null)
- **Failure paths:**
  - If certifications array is empty: `hasCredential` field omitted

**[3.5] Render JSON-LD script tag in the page**
> The JSON-LD is embedded in the page HTML so that crawlers can parse it without JavaScript execution.

- **User:** Any crawler or AI agent.
- **Functional:** A `<script type="application/ld+json">` tag is rendered in the page containing the complete JSON-LD object. It is placed after the main content in the server component output. The JSON is minified (no pretty-printing in production). For non-public personas that somehow reach rendering, JSON-LD is omitted.
- **Technical:** New `app/p/[uri]/json-ld.tsx` exports a `PersonaJsonLd` server component. Receives `persona`, `endorsementCount`, and `appUrl` props. Calls `buildPersonJsonLd()` or `buildOrganizationJsonLd()` based on entity type. Uses `dangerouslySetInnerHTML` with `JSON.stringify()` to embed. Imported and rendered in `app/p/[uri]/page.tsx` after `<PersonaPublicView>`.
- **Acceptance criteria:**
  - [ ] `<script type="application/ld+json">` present in page HTML
  - [ ] JSON-LD is valid JSON (parseable by `JSON.parse`)
  - [ ] JSON-LD is valid schema.org (passes Google Rich Results Test)
  - [ ] Only rendered for public and authenticated personas
  - [ ] No `<script>` injection possible (JSON.stringify escapes special chars)
- **Failure paths:**
  - If JSON-LD builder throws: script tag omitted, page renders normally

**Workflow success:** Public persona pages include machine-readable JSON-LD that maps persona data to schema.org types, enabling rich search results, AI overviews, and structured data consumption by external tools.

---

### Schema

No schema changes. Structured data is generated at render time from existing persona data.

### Server Actions

No new server actions. JSON-LD generation is pure data transformation in server components.

### Validation

No new Zod schemas. JSON-LD output is validated by structure (schema.org compliance) rather than input validation.

### Edge Cases

- [ ] Persona has no skills, no experience, no education: JSON-LD includes only base fields (name, description, url)
- [ ] Experience with no title: entry skipped in `hasOccupation`
- [ ] Certification with no issuer: `recognizedBy` field omitted
- [ ] Location string is freeform ("Austin, TX" vs "New York, NY, USA"): best-effort parsing to `addressLocality` + `addressRegion`
- [ ] Location string cannot be parsed: use freeform `name` field on `PostalAddress`
- [ ] Display name has unicode characters: JSON.stringify handles encoding
- [ ] Very large traits collection (100+ skills): all included in `knowsAbout` (no truncation for structured data)
- [ ] Offerings with no description: entry skipped

### Test Criteria

**Unit tests:**
- `buildPersonJsonLd()` returns valid `@type: 'Person'` with all mapped fields
- `buildOrganizationJsonLd()` returns valid `@type: 'Organization'`
- `mapSkillsToKnowsAbout()` extracts skill names from Skill objects
- `mapExperienceToOccupation()` includes SOC code for "software engineer"
- `mapExperienceToOccupation()` omits SOC code for unknown title
- `mapCertificationsToCredentials()` includes `recognizedBy` with issuer
- `mapEducationToAlumniOf()` produces `EducationalOrganization` with institution name
- `mapOfferingsToOffers()` maps offering type and description
- `mapEndorsementsToInteraction()` produces `InteractionCounter` with correct count
- Empty arrays produce omitted fields (not empty arrays)

**Integration tests:**
- Full JSON-LD generation for a seeded persona with all trait categories
- JSON-LD output passes `JSON.parse()` without error

**E2E tests:**
- Navigate to public persona page, find `<script type="application/ld+json">` in DOM
- Parse the JSON-LD and verify `@type` is correct for entity type
- Verify `knowsAbout` contains seeded skill names

### Implementation Order

1. Create `lib/personas/structured-data.ts` with all mapping functions and JSON-LD builders
2. Create `app/p/[uri]/json-ld.tsx` server component that renders the script tag
3. Import and render `PersonaJsonLd` in `app/p/[uri]/page.tsx` after `PersonaPublicView` (requires steps 1, 2)
4. Add SOC code lookup table for top 50 job title patterns
5. Write unit tests for all mapping functions
6. Validate JSON-LD output against Google Rich Results Test tool

---

## 4. AIO (AI Overview) Optimization

### Overview

AI-powered search engines (Google AI Overviews, Perplexity, ChatGPT Browse) increasingly synthesize answers from structured data rather than traditional page crawling. Personus personas should be optimized for AI discovery by providing comprehensive structured data (from feature 3), clear factual content structure, and an AI-readable summary. This feature adds an AI-focused meta tag and ensures the page content structure is optimized for extraction by AI agents.

### Wireframe

```
No new visual elements — AIO optimization is structural:

<head>
  <!-- Existing SEO tags from feature 2 -->
  ...

  <!-- AIO-specific: comprehensive description for AI extraction -->
  <meta name="description" content="Jamie Smith is a full-stack engineer based in Austin, TX.
    Skills: TypeScript (expert), React (advanced), GraphQL (advanced), PostgreSQL (advanced).
    Experience: Senior Engineer at Acme Corp (2022-present).
    Education: B.S. Computer Science from UT Austin.
    Values: Open Source, Mentorship.
    Endorsed by 5 people for leadership, design thinking.
    Open to: consulting, co-founder opportunities.
    Offerings: code review, architecture guidance." />
</head>

<!-- Page content structured for AI extraction -->
<article itemscope itemtype="https://schema.org/Person">
  <!-- Each section has clear semantic headings -->
  <h1>Jamie Smith</h1>
  <p role="doc-subtitle">Full-stack engineer & open-source contributor</p>

  <section aria-label="Skills">
    <h2>Skills</h2>
    ...
  </section>

  <section aria-label="Experience">
    <h2>Experience</h2>
    ...
  </section>
</article>
```

### Component Hierarchy

```
app/p/[uri]/page.tsx                            ← EXISTS (ENHANCED: semantic structure)
  └─ app/p/[uri]/persona-public-view.tsx        ← EXISTS (ENHANCED: aria-labels, semantic headings)
       └─ lib/personas/seo.ts                   ← EXISTS from feature 2 (ENHANCED: AI description)
            └─ buildAIDescription()             ← NEW: comprehensive description for AI extraction
```

### Workflows & Stories

---

#### Workflow: AI agent extracts persona information from the public page

**Preconditions:**
- Persona is public
- AI agent (Perplexity, ChatGPT Browse, Google Gemini) accesses the page

**Stories:**

**[4.1] Generate AI-optimized meta description**
> AI agents receive a comprehensive factual description so that they can accurately represent the persona in AI overviews and answers.

- **User:** AI search agent synthesizing information.
- **Functional:** A separate, longer description is generated for AI extraction. Unlike the 160-char SEO description, this is a comprehensive factual summary that includes: name, role, location, all skills with proficiency, experience summary, education, values, endorsement count and top contexts, seeking opportunities, and offerings. This description is placed in the standard `<meta name="description">` tag -- the 160-char truncation is only relevant for SERP display; AI agents read the full content. The JSON-LD (feature 3) provides the primary structured data; this description provides a natural-language fallback.
- **Technical:** New `buildAIDescription()` in `lib/personas/seo.ts`. Returns a comprehensive string (up to 500 chars) that reads as factual prose. Called alongside `buildPersonaDescription()` -- the SEO description is used for the `<meta name="description">` tag (since Google shows this in SERPs at ~160 chars), while the AI description is embedded in the JSON-LD `description` field where length is not constrained.
- **Acceptance criteria:**
  - [ ] AI description includes all available factual data about the persona
  - [ ] AI description reads as natural-language prose (not comma-separated keywords)
  - [ ] AI description up to 500 characters
  - [ ] Skills include proficiency levels
  - [ ] Experience includes titles and companies
  - [ ] Endorsement context tags mentioned when available
  - [ ] JSON-LD `description` field uses the AI description, not the truncated SEO version
- **Failure paths:**
  - If trait data is sparse: description includes only available data

**[4.2] Add semantic HTML structure for AI extraction**
> The page uses semantic HTML so that AI agents can reliably extract section-level information.

- **User:** AI agent parsing page HTML.
- **Functional:** The public page uses `<article>` as the root content wrapper with `itemscope` and `itemtype` attributes. Each trait section is wrapped in `<section aria-label="{Section Name}">` with an `<h2>` heading. The persona name uses `<h1>`. The headline uses a `<p role="doc-subtitle">`. This semantic structure enables AI agents to extract section-specific information without relying on CSS class names.
- **Technical:** Enhancement to `app/p/[uri]/persona-public-view.tsx`. Wrap the outermost `<div>` in `<article>`. Add `aria-label` to each section rendered by the `sectionOrder` loop (line 158). Currently sections are rendered by `TraitSection` which returns a `<TraitDisplay>` component -- the enhancement wraps each in a `<section>` with the appropriate `aria-label` from the trait metadata `displayName`.
- **Acceptance criteria:**
  - [ ] Root content is an `<article>` element
  - [ ] Each trait section is a `<section>` with `aria-label`
  - [ ] Persona name is `<h1>`
  - [ ] Section headings are `<h2>` (already in TraitDisplay)
  - [ ] Endorsement section has `aria-label="Endorsements"`
  - [ ] Page passes axe accessibility scan without new violations
- **Failure paths:**
  - None (structural change, no runtime behavior)

**[4.3] Ensure structured data completeness for AI agents**
> The JSON-LD from feature 3 is comprehensive enough that AI agents can answer questions like "What skills does Jamie Smith have?" or "Where is Jamie Smith located?"

- **User:** AI agent answering a user query about a persona.
- **Functional:** The JSON-LD must answer these common AI queries:
  - "What does [name] do?" -> `description` + `jobTitle` + `hasOccupation`
  - "What skills does [name] have?" -> `knowsAbout`
  - "Where is [name] located?" -> `address`
  - "Is [name] endorsed?" -> `interactionStatistic`
  - "What does [name] offer?" -> `makesOffer`
  - "What is [name] looking for?" -> `seeks`
  - "What are [name]'s credentials?" -> `hasCredential` + `alumniOf`
  - "What languages does [name] speak?" -> `knowsLanguage`
  Each of these mappings is covered by the JSON-LD builder in feature 3. This story validates completeness.
- **Technical:** No new code. This is a validation story that ensures the JSON-LD from feature 3 covers all common AI query patterns. Write integration tests that verify each query pattern maps to a non-empty JSON-LD field for a fully populated persona.
- **Acceptance criteria:**
  - [ ] Each listed query pattern maps to a populated JSON-LD field
  - [ ] All 8 query patterns covered by structured data
  - [ ] AI description in JSON-LD is the comprehensive version (not truncated)
- **Failure paths:**
  - If persona is sparse (few traits): some query patterns return empty results (acceptable)

**Workflow success:** AI agents can accurately extract and represent persona information from both structured data and semantic HTML, enabling personas to appear in AI overviews and conversational search results.

---

### Schema

No schema changes.

### Server Actions

No new server actions. AIO optimization is structural (HTML) and metadata (JSON-LD).

### Validation

No new validation schemas.

### Edge Cases

- [ ] AI agent requests only the JSON-LD (no HTML rendering): structured data is self-contained
- [ ] Page rendered without JavaScript: all content is server-rendered (SSR), AI agents can parse
- [ ] Multiple personas with similar names: `@id` in JSON-LD distinguishes them by URI

### Test Criteria

**Unit tests:**
- `buildAIDescription()` includes skills with proficiency for populated persona
- `buildAIDescription()` produces graceful output for sparse persona

**Integration tests:**
- Full page render includes `<article>` root and `<section>` wrappers
- JSON-LD `description` field is the comprehensive AI version

**E2E tests:**
- Navigate to public persona, verify `<article>` and `<section>` elements present
- Verify `aria-label` attributes on trait sections

### Implementation Order

1. Create `buildAIDescription()` in `lib/personas/seo.ts` (requires feature 2 step 1)
2. Update JSON-LD builder to use AI description for `description` field (requires feature 3 step 1)
3. Enhance `PersonaPublicView` in `persona-public-view.tsx` with semantic HTML structure
4. Write unit tests for `buildAIDescription()`
5. Write E2E test verifying semantic structure

---

## 5. OG Image Generation

### Overview

Each public persona page has a dynamically generated Open Graph image that appears when the URL is shared on social platforms. The image is generated server-side using Next.js `ImageResponse` (based on Satori) at a dedicated API route. It renders the persona's display name, headline, key skills, avatar initial, and entity type badge on a branded background. Images are 1200x630 pixels (standard OG image dimensions) and cached.

### Wireframe

```
OG Image (1200 x 630px):
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌──────────┐                                                      │
│   │          │                                                      │
│   │   [JS]   │   Jamie Smith                                        │
│   │          │   Full-stack engineer & open-source contributor       │
│   └──────────┘                                                      │
│                                                                     │
│   ┌──────┐ ┌──────┐ ┌──────────┐ ┌────────────┐                    │
│   │TS    │ │React │ │GraphQL   │ │PostgreSQL  │                     │
│   └──────┘ └──────┘ └──────────┘ └────────────┘                     │
│                                                                     │
│   Austin, TX                                                        │
│                                                                     │
│                                          ┌─────────────────────┐    │
│                                          │  personus.ai        │    │
│                                          └─────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Theme variations:
- Background gradient matches persona's color palette
- Entity type indicator: green circle = person, blue circle = org
- If 5+ endorsements: gold "5 endorsements" badge
```

### Component Hierarchy

```
app/api/og/persona/[uri]/route.tsx              ← NEW: Route Handler (ImageResponse)
  └─ lib/personas/og-image.ts                   ← NEW: OG image JSX builder
       └─ reads: lib/db/queries.ts → getPersonaByUri()
       └─ reads: lib/db/queries.ts → countEndorsements()
```

### Workflows & Stories

---

#### Workflow: Social platform fetches OG image for a shared persona link

**Preconditions:**
- A persona URL has been shared on a social platform (Slack, iMessage, X, LinkedIn)
- The platform's crawler requests the OG image URL from the `og:image` meta tag

**Stories:**

**[5.1] Create OG image API route**
> Social platforms fetch a dynamically generated image so that shared persona links display a branded visual card.

- **User:** Social platform crawler (Facebook, Slack, X, LinkedIn, iMessage).
- **Functional:** API route at `GET /api/og/persona/[uri]` returns a 1200x630 PNG image. The image includes: avatar initial circle (colored by entity type: green for person, blue for org), display name (bold, large), headline (regular, medium), up to 4 skill badges, location, endorsement count badge (gold, if > 0), and Personus branding. Background uses a gradient matching the persona's color palette. The image is generated using Next.js `ImageResponse` (Satori).
- **Technical:** New `app/api/og/persona/[uri]/route.tsx` exports a `GET` handler. Fetches persona via `getPersonaByUri(uri)`. Returns `new ImageResponse(jsx, { width: 1200, height: 630 })`. The JSX uses Satori-compatible elements (only `<div>`, `<span>`, `<img>` with inline styles -- no Tailwind, no custom components). Satori requires `display: 'flex'` on all containers. The persona's `theme.colorPalette` determines the background gradient colors.
- **Acceptance criteria:**
  - [ ] `GET /api/og/persona/{uri}` returns `image/png` with 200 status
  - [ ] Image dimensions are 1200x630
  - [ ] Image includes display name and headline
  - [ ] Image includes avatar initial with entity-type color
  - [ ] Image includes up to 4 skill names as badges
  - [ ] Image includes location when present
  - [ ] Image includes endorsement count badge when > 0
  - [ ] Image includes Personus branding text
  - [ ] Background gradient matches persona's color palette
  - [ ] Non-existent URI returns 404 (not an error image)
  - [ ] Private personas return 404
- **Failure paths:**
  - If persona not found: return 404 response (not an error image)
  - If Satori rendering fails: return a static fallback Personus branded image

**[5.2] Cache OG images for performance**
> OG images are cached so that repeated requests from social platforms are served instantly.

- **User:** Social platform crawler making repeated requests.
- **Functional:** OG images are cached at the CDN edge. Cache headers: `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200` (1 hour browser, 24 hour CDN, 12 hour stale-while-revalidate). When a persona is updated (name, headline, skills, theme), the cache should eventually invalidate via the stale-while-revalidate pattern. No manual cache purging for MVP.
- **Technical:** The route handler sets `Cache-Control` header in the `ImageResponse` options or via `NextResponse.headers`. Vercel edge caching respects these headers automatically. The `s-maxage` of 86400 means CDN serves cached images for up to 24 hours.
- **Acceptance criteria:**
  - [ ] Response includes `Cache-Control` header with `s-maxage=86400`
  - [ ] Repeated requests within TTL serve from cache (verified by response headers)
  - [ ] Updated persona data appears in OG image within 24 hours (stale-while-revalidate)
- **Failure paths:**
  - If cache is missed: image regenerated on the fly (acceptable latency: < 2 seconds)

**[5.3] Apply theme-aware styling to OG images**
> OG images match the persona's chosen color palette so that the visual identity is consistent across share contexts.

- **User:** Social platform rendering the OG image preview.
- **Functional:** The background gradient, avatar circle, and skill badge colors adapt to the persona's theme. Color palette mapping:
  - `default`: green gradient (persona-person)
  - `ocean`: blue gradient
  - `forest`: green gradient (darker)
  - `sunset`: orange gradient
  - `midnight`: indigo gradient
  - `lavender`: purple gradient
  - `earth`: amber gradient
  These match the `colorPaletteClasses` in `persona-public-view.tsx` (lines 64-93) but as hex values for Satori (which does not support Tailwind classes).
- **Technical:** New `lib/personas/og-image.ts` exports `getOgPaletteColors(palette: ColorPalette): { bgFrom: string; bgTo: string; accent: string }`. Maps each palette to hex color pairs for the gradient and accent.
- **Acceptance criteria:**
  - [ ] Each of the 7 color palettes produces a visually distinct OG image
  - [ ] Avatar initial circle uses entity-type color (green/blue), not palette color
  - [ ] Skill badges use the palette accent color
  - [ ] Text is readable against all gradient backgrounds (contrast ratio >= 4.5:1)
- **Failure paths:**
  - If palette value is unrecognized: fall back to `default` palette

**Workflow success:** Shared persona links display a branded, theme-aware visual card on all major social platforms. Images are generated on-demand, cached at the CDN edge, and reflect the persona's identity and chosen visual style.

---

### Schema

No schema changes. OG image generation reads existing persona data.

### Server Actions

No server actions. OG image is a route handler, not a server action.

### Validation

```typescript
// Inline in route handler
const uri = params.uri;
if (!uri || typeof uri !== 'string') {
  return new Response('Not found', { status: 404 });
}
```

### Edge Cases

- [ ] Persona with no skills: skill badges section omitted from image
- [ ] Persona with no headline: second line shows entity type instead
- [ ] Very long display name (60+ chars): truncated with ellipsis in image
- [ ] Very long headline: truncated to ~80 chars with ellipsis
- [ ] Persona has `theme: {}` (empty): uses default palette from layout preset
- [ ] Concurrent requests for same OG image: CDN deduplicates via request coalescing
- [ ] Non-Latin characters in display name: Satori supports UTF-8 via embedded fonts

### Test Criteria

**Unit tests:**
- `getOgPaletteColors('ocean')` returns correct hex values
- `getOgPaletteColors('unknown')` falls back to default

**Integration tests:**
- `GET /api/og/persona/{seeded-uri}` returns 200 with content-type `image/png`
- `GET /api/og/persona/{nonexistent}` returns 404
- `GET /api/og/persona/{private-persona}` returns 404
- Response includes correct `Cache-Control` header

**E2E tests:**
- Verify `og:image` meta tag URL is functional (returns an image)
- Verify image content includes persona name (visual regression test optional)

### Implementation Order

1. Create `lib/personas/og-image.ts` with `getOgPaletteColors()` and color mappings
2. Create `app/api/og/persona/[uri]/route.tsx` with `GET` handler using `ImageResponse` (requires step 1)
3. Add cache headers to the route handler response
4. Update `generateMetadata()` in `app/p/[uri]/page.tsx` to reference the new OG image URL (requires step 2)
5. Write integration tests for the OG image route
6. Manual verification: share a persona URL on Slack and X, verify image renders correctly

---

## 6. Visitor Interactions

### Overview

Visitors to a public persona page can take three actions: endorse the persona, request an introduction, and share the persona link. The endorsement flow (`/endorse/[uri]`) and introduction request (`RequestIntroButton`) already exist. This feature integrates them into the public page, adds a share mechanism, and handles the authentication boundary (endorsement is public, introduction requires auth).

### Wireframe

```
Desktop action bar (below hero):
┌─────────────────────────────────────────────────────────────────────┐
│     [Endorse]        [Request Introduction]        [Share]          │
│     (link)           (auth required)               (dialog)        │
└─────────────────────────────────────────────────────────────────────┘

Mobile action bar (sticky bottom):
┌─────────────────────────────────────────────────────────────────────┐
│ [Request Introduction]                          [Endorse]  [Share]  │
│ (primary CTA, full width)                      (icon)     (icon)   │
└─────────────────────────────────────────────────────────────────────┘

Unauthenticated visitor clicks "Request Introduction":
→ Redirect to /sign-in?redirect_url=/p/{uri}
→ After sign-in, return to public page
→ Button now functional (user has a persona to send from)

No-persona authenticated visitor clicks "Request Introduction":
┌────────────────────────────────────────────────────────────────┐
│ You need a persona to request an introduction.                  │
│ [Create a Persona]   (links to /personas/new)                   │
└────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/p/[uri]/visitor-action-bar.tsx              ← NEW (from feature 1, step 3)
  ├─ EndorseButton                              ← NEW: inline, links to /endorse/{uri}
  ├─ IntroRequestButton                         ← NEW: auth-aware wrapper
  │    └─ app/(dashboard)/personas/[uri]/request-intro-button.tsx  ← EXISTS
  ├─ ShareButton                                ← Uses SharePersonaDialog
  │    └─ components/share-persona-dialog.tsx    ← EXISTS
  └─ calls:
       └─ app/actions/contacts.ts → sendContactRequestAction()  ← EXISTS
```

### Workflows & Stories

---

#### Workflow: Visitor endorses a persona from the public page

**Preconditions:**
- Visitor is on the public persona page
- No authentication required to submit an endorsement

**Stories:**

**[6.1] Navigate to endorsement form from public page**
> Visitor clicks "Endorse" so that they can write an endorsement for this persona.

- **User:** Any visitor (authenticated or not) on the public page.
- **Functional:** The "Endorse" button in the visitor action bar is a link to `/endorse/{uri}`. The existing endorsement form page (`app/endorse/[uri]/page.tsx`) handles the full flow: it validates the persona exists, renders the `EndorseForm` component with persona info (name, headline, initial), and submits via `submitPublicEndorsement()`. No changes needed to the endorsement form itself.
- **Technical:** `EndorseButton` in `visitor-action-bar.tsx` is a `Link` component to `/endorse/${personaUri}`. The existing `app/endorse/[uri]/page.tsx` and `app/endorse/[uri]/endorse-form.tsx` handle the complete flow. `submitPublicEndorsement()` in `app/actions/endorsements.ts` (lines 183-221) creates the endorsement with a placeholder `fromPersonaUri` and auto-assigns the target persona's first community.
- **Acceptance criteria:**
  - [ ] "Endorse" button navigates to `/endorse/{uri}`
  - [ ] Endorsement form pre-populates target persona info
  - [ ] Endorsement submission works without authentication
  - [ ] Submitted endorsement appears on the persona's public page (after page refresh)
  - [ ] Success screen links back to the persona's public page
- **Failure paths:**
  - If persona has no community membership: endorsement form shows error ("This persona is not a member of any community yet." from `submitPublicEndorsement()` line 201)

**[6.2] Request introduction from public page (authenticated)**
> Authenticated visitor requests an introduction so that they can connect with the persona owner.

- **User:** Authenticated visitor with at least one persona.
- **Functional:** The "Request Introduction" button calls `sendContactRequestAction()` with the visitor's active persona as `fromPersonaUri` and the viewed persona as `toPersonaUri`. The reason is auto-populated with "Interested in connecting after viewing profile." On success, the button changes to "Requested" (disabled). Toast notification confirms. If the visitor has multiple personas, the system uses their first persona as the sender (MVP simplification -- persona selection deferred).
- **Technical:** The existing `RequestIntroButton` at `app/(dashboard)/personas/[uri]/request-intro-button.tsx` already implements this flow. It calls `sendContactRequestAction()` from `app/actions/contacts.ts` (line 62). The enhancement wraps it in an auth-aware container that checks: (1) is user authenticated? If not, redirect to sign-in. (2) does user have at least one persona? If not, show "Create a Persona" prompt.
- **Acceptance criteria:**
  - [ ] Authenticated user with personas: button works, sends contact request
  - [ ] Button shows "Sending..." during request, changes to "Requested" on success
  - [ ] Toast: "Introduction requested from {displayName}"
  - [ ] Unauthenticated visitor: redirect to `/sign-in?redirect_url=/p/{uri}`
  - [ ] Authenticated user with no personas: show "Create a Persona" prompt
  - [ ] Contact request appears in the persona owner's inbox
- **Failure paths:**
  - If `sendContactRequestAction` fails: toast error "Failed to send request. Please try again."
  - If user's persona cannot be determined: show error prompt

**[6.3] Share persona link from public page**
> Visitor shares the persona's public URL so that they can send it to others.

- **User:** Any visitor on the public page.
- **Functional:** The "Share" button opens the existing `SharePersonaDialog`. The dialog shows the public URL (`{origin}/p/{uri}`) in a read-only input with a "Copy Link" button. Copying triggers a toast "Link copied to clipboard." The dialog also supports native Web Share API on mobile (if available).
- **Technical:** Existing `components/share-persona-dialog.tsx` already implements the copy-to-clipboard flow. Enhancement: add Web Share API fallback for mobile:
  ```typescript
  if (navigator.share) {
    await navigator.share({ title: displayName, url: publicUrl });
  } else {
    // existing clipboard copy
  }
  ```
- **Acceptance criteria:**
  - [ ] "Share" button opens the dialog
  - [ ] Public URL shown in read-only input
  - [ ] "Copy Link" copies to clipboard and shows toast
  - [ ] On mobile with Web Share API: native share sheet opens
  - [ ] Dialog shows persona display name in title
- **Failure paths:**
  - If clipboard API fails: toast error "Failed to copy link" (existing, line 38)
  - If Web Share API fails: fall back to clipboard copy

**Workflow success:** Visitors can endorse (no auth needed), request introductions (auth required, graceful handling of unauthenticated state), and share persona links (clipboard + native share) directly from the public page.

---

### Schema

No schema changes.

### Server Actions

No new server actions. Uses existing:

```typescript
// app/actions/endorsements.ts — existing
submitPublicEndorsement(data: { ... }): Promise<Endorsement>
// No auth required. Creates endorsement with placeholder fromPersonaUri.

// app/actions/contacts.ts — existing
sendContactRequestAction(raw: SendContactRequestInput): Promise<ContactRequest>
// Auth required. Sends introduction request.
```

### Validation

No new validation schemas. Uses existing `sendContactRequestSchema` from `lib/validations/contacts.ts`.

### Edge Cases

- [ ] Visitor endorses then immediately views page: endorsement may not appear until page re-renders (server component)
- [ ] Visitor sends duplicate introduction request: `sendContactRequestAction` allows duplicates (no unique constraint on from+to); acceptable for MVP
- [ ] Visitor is the persona owner: "Request Introduction" and "Endorse" still render (self-interaction prevention deferred)
- [ ] Persona has `contactPreferences.contact.connectionRequests: 'off'`: "Request Introduction" button should be hidden (or show "Not accepting introductions")
- [ ] Mobile viewport: sticky CTA shows primary button only; secondary actions in overflow or smaller icons
- [ ] Web Share API not available and clipboard API not available (rare): button does nothing, no crash

### Test Criteria

**Unit tests:**
- Auth-aware wrapper redirects unauthenticated users to sign-in URL with redirect

**Integration tests:**
- `submitPublicEndorsement()` creates endorsement for valid persona
- `sendContactRequestAction()` creates contact request for authenticated user

**E2E tests:**
- Click "Endorse" on public page, verify navigation to `/endorse/{uri}`
- Complete endorsement form, verify success screen
- Click "Share", verify dialog opens and clipboard copy works
- Click "Request Introduction" while signed out, verify redirect to sign-in
- Sign in, return to public page, click "Request Introduction", verify toast

### Implementation Order

1. Create `app/p/[uri]/visitor-action-bar.tsx` with EndorseButton (link), IntroRequestButton (auth-aware), ShareButton (dialog) (builds on feature 1, step 3)
2. Add auth-awareness to IntroRequestButton: check authentication state, check persona existence
3. Add Web Share API support to `components/share-persona-dialog.tsx`
4. Integrate visitor action bar into `PersonaPublicView` layout (requires step 1)
5. Add contact preference check: hide "Request Introduction" when `connectionRequests: 'off'`
6. Write E2E test for all three visitor actions

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Render public persona page with visibility gating | `personas`, `public-pages` | -- | -- |
| 1.2 | Add visitor action bar to public persona page | `personas`, `public-pages`, `ux` | 1.1 | -- |
| 1.3 | Display endorsements on public page with all styles | `personas`, `public-pages`, `endorsements` | 1.1 | -- |
| 1.4 | Add community context display to public page | `personas`, `public-pages`, `communities` | 1.1 | -- |
| 2.1 | Generate comprehensive SEO meta description | `personas`, `seo` | -- | -- |
| 2.2 | Generate Open Graph metadata for persona pages | `personas`, `seo`, `og` | 2.1 | -- |
| 2.3 | Generate Twitter Card metadata for persona pages | `personas`, `seo` | 2.2 | -- |
| 2.4 | Set robots directive based on persona visibility | `personas`, `seo` | 2.1 | -- |
| 2.5 | Set canonical URL excluding query parameters | `personas`, `seo` | 2.1 | -- |
| 3.1 | Generate Person JSON-LD structured data | `personas`, `structured-data`, `seo` | 2.1 | -- |
| 3.2 | Generate Organization JSON-LD structured data | `personas`, `structured-data`, `seo` | 3.1 | -- |
| 3.3 | Map experience to Occupation with SOC codes | `personas`, `structured-data` | 3.1 | -- |
| 3.4 | Map certifications to EducationalOccupationalCredential | `personas`, `structured-data` | 3.1 | -- |
| 3.5 | Render JSON-LD script tag in public page | `personas`, `structured-data` | 3.1 | -- |
| 4.1 | Generate AI-optimized description for JSON-LD | `personas`, `aio`, `seo` | 2.1, 3.1 | -- |
| 4.2 | Add semantic HTML structure for AI extraction | `personas`, `aio`, `a11y` | 1.1 | -- |
| 4.3 | Validate structured data completeness for AI queries | `personas`, `aio`, `structured-data` | 3.1, 4.1 | -- |
| 5.1 | Create dynamic OG image API route | `personas`, `og`, `api` | -- | -- |
| 5.2 | Add cache headers to OG image route | `personas`, `og`, `performance` | 5.1 | -- |
| 5.3 | Apply theme-aware styling to OG images | `personas`, `og`, `theming` | 5.1 | -- |
| 6.1 | Navigate to endorsement form from public page | `personas`, `public-pages`, `endorsements` | 1.2 | -- |
| 6.2 | Implement auth-aware introduction request on public page | `personas`, `public-pages`, `contacts` | 1.2 | -- |
| 6.3 | Implement share with clipboard and Web Share API | `personas`, `public-pages`, `sharing` | 1.2 | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `3.4` = feature 3, story 4)
- Issue titles are imperative: "Generate Person JSON-LD structured data" not "Structured data is generated"
- Labels include the spec suite (`personas`) and feature area (`public-pages`, `seo`, `structured-data`, `og`, `aio`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
