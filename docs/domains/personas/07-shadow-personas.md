---
type: spec
title: "Identity & Personas -- Shadow Personas"
description: "This spec covers shadow personas: placeholder personas created for people who are not yet on Personus. A community member creates a shadow persona for someone they know, optionally endorses it,…"
status: planned
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Shadow Personas

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-persona-lifecycle.md`, `docs/foundation/data-model.md`, `docs/foundation/authorization.md`
> Primary actors: Creator (authenticated community member), Claimant (non-user or new user), Visitor (unauthenticated viewer), System (expiry cleanup)

This spec covers shadow personas: placeholder personas created for people who are not yet on Personus. A community member creates a shadow persona for someone they know, optionally endorses it, and shares a unique claim link. The recipient follows the link to claim the shadow, create an account, and absorb the endorsements into their own persona. Unclaimed shadows expire after 90 days. The shadow persona system is the primary viral growth mechanism for Personus -- every shadow is an invitation backed by real social proof.

---

## 1. Shadow Persona Creation

### Overview

A shadow persona is created within a community context by an existing member who wants to vouch for someone not yet on Personus. The creator provides a display name, optional entity type, and optional traits (skills, qualities, interests) to describe the person. The system generates a UUID claim token, sets a 90-day expiration, and returns a shareable claim URL. The creator can then share this URL with the person via any channel (email, text, DM).

### Wireframe

```
Shadow Creation (from community directory or member list):
+---------------------------------------------------------------------+
|                                                                     |
| Know someone who should be here?                                    |
| Create a profile for them and vouch for their skills.               |
|                                                                     |
| +---------------------------------------------------------------+  |
| | Display Name *      [Alex Rivera                             ] |  |
| |                                                                |  |
| | Type                [Person           v]                       |  |
| |                                                                |  |
| | --- Skills (optional) ---------------------------------------- |  |
| | [Add skill...                              ] [Add]             |  |
| | [TypeScript] [React] [Node.js]                                 |  |
| |                                                                |  |
| | --- Qualities (optional) ------------------------------------- |  |
| | [Add quality...                            ] [Add]             |  |
| | [Detail-oriented] [Great communicator]                         |  |
| |                                                                |  |
| | --- Interests (optional) ------------------------------------- |  |
| | [Add interest...                           ] [Add]             |  |
| | [Open source] [DevOps]                                         |  |
| |                                                                |  |
| |                              [Cancel]  [Create Shadow Profile] |  |
| +---------------------------------------------------------------+  |
|                                                                     |
+---------------------------------------------------------------------+

After creation -- share dialog:
+---------------------------------------------------------------------+
| Profile created for Alex Rivera!                                    |
|                                                                     |
| Share this link so they can claim their profile:                     |
|                                                                     |
| +---------------------------------------------------------------+  |
| | https://personus.ai/claim/a1b2c3d4-...                  [Copy]|  |
| +---------------------------------------------------------------+  |
|                                                                     |
| This link expires in 90 days.                                       |
| You can also endorse Alex now to add social proof.                  |
|                                                                     |
|                     [Endorse Now]  [Done]                            |
+---------------------------------------------------------------------+
```

### Component Hierarchy

```
app/(dashboard)/communities/[id]/page.tsx          <-- EXISTS: community detail page
  +-- components/create-shadow-dialog.tsx           <-- NEW: Client Component ("use client")
       +-- components/ui/dialog.tsx                 <-- EXISTS
       +-- components/ui/input.tsx                  <-- EXISTS
       +-- components/ui/select.tsx                 <-- EXISTS
       +-- components/ui/badge.tsx                  <-- EXISTS
       +-- components/ui/button.tsx                 <-- EXISTS
       +-- components/share-claim-link.tsx           <-- NEW: copy-to-clipboard claim URL
       +-- calls: app/actions/shadows.ts
            +-- createShadowAction()                <-- EXISTS
            +-- reads/writes: lib/db/schema/shadow-personas.ts
```

The server action `createShadowAction` already exists in `app/actions/shadows.ts` (lines 85-118). The query helper `createShadowPersona` exists in `lib/db/queries.ts` (lines 86-108). What is missing is the UI: the creation dialog component and the share-link component.

### Workflows & Stories

---

#### Workflow: Community member creates a shadow persona for a non-user

**Preconditions:**
- User is authenticated via Clerk
- User is a member of the community (validated by `assertInCommunity`)
- User owns the persona they are creating the shadow from (validated by `assertOwnsPersona`)

**Stories:**

**[1.1] Open shadow creation dialog from community context**
> Creator opens the shadow creation form from within a community so that they can nominate someone who is not on Personus.

- **User:** Authenticated community member viewing a community page.
- **Functional:** A "Know someone who should be here?" prompt or button on the community page opens a dialog. The dialog is pre-populated with the current community ID and the user's active persona URI for that community. If the user has multiple personas in the community, the first is used (matching `getPersonaDefaultCommunity` behavior).
- **Technical:** New `components/create-shadow-dialog.tsx` client component. Receives `communityId: string` and `createdByPersonaUri: string` props from the parent server component. Uses `Dialog` from `components/ui/dialog.tsx`. Form state managed with `useState`. On submit, calls `createShadowAction()` from `app/actions/shadows.ts`.
- **Acceptance criteria:**
  - [ ] Dialog opens from community page CTA
  - [ ] Community ID and creator persona URI pre-filled (not user-editable)
  - [ ] Display Name field is required
  - [ ] Entity type defaults to "person" with dropdown for "organization"
  - [ ] Dialog has Cancel and Create buttons
- **Failure paths:**
  - If user is not a community member: `assertInCommunity` throws, error toast shown
  - If user does not own the creating persona: `assertOwnsPersona` throws, error toast shown

**[1.2] Enter shadow persona details and submit**
> Creator enters a display name and optional traits for the shadow persona so that the shadow has enough information to be recognizable and endorsable.

- **User:** Authenticated community member with the shadow creation dialog open.
- **Functional:** Creator enters: display name (required, 1-100 chars), entity type (person or organization), and optional trait fields: skills (name + optional proficiency), qualities (string tags), interests (string tags). On submit, calls `createShadowAction()` which: validates input via `createShadowInput` Zod schema, verifies ownership and community membership, calls `createShadowPersona()` which generates a UUID claim token, sets `expiresAt` to 90 days from now, inserts the row, and logs a `shadow_created` activity event. Returns the created shadow (including `claimToken`).
- **Technical:** `createShadowAction` at `app/actions/shadows.ts` lines 85-118. Zod schema `createShadowInput` at lines 25-38. Query helper `createShadowPersona` at `lib/db/queries.ts` lines 86-108. The claim token is generated via `crypto.randomUUID()` (line 93). Expiry set to `Date.now() + 90 * 24 * 60 * 60 * 1000` (line 104).
- **Acceptance criteria:**
  - [ ] Shadow persona row created in `shadow_personas` table
  - [ ] `claimStatus` set to `'unclaimed'`
  - [ ] `claimToken` is a valid UUID (unique)
  - [ ] `expiresAt` is 90 days from creation time
  - [ ] `createdByPersonaUri` references the creator's persona
  - [ ] `communityId` references the community
  - [ ] `traits` JSONB stores skills, qualities, interests if provided
  - [ ] Activity event logged with type `shadow_created`
  - [ ] Index `idx_shadow_community` covers the community lookup
  - [ ] Index `idx_shadow_claim` covers the claim status lookup
- **Failure paths:**
  - If display name is empty: Zod validation fails, error shown in dialog
  - If community ID is invalid: DB FK constraint fails, error toast
  - If creator persona URI is invalid: `assertOwnsPersona` throws, error toast

**[1.3] Display shareable claim link after creation**
> Creator sees the claim URL so that they can share it with the intended recipient.

- **User:** Authenticated community member who just created a shadow persona.
- **Functional:** After successful creation, the dialog transitions to a success state showing: (a) confirmation message with the shadow's display name, (b) the claim URL (`/claim/{claimToken}`), (c) a copy-to-clipboard button, (d) expiration notice ("This link expires in 90 days"), (e) an "Endorse Now" button that navigates to endorse the shadow, and (f) a "Done" button that closes the dialog. The claim URL format is `https://personus.ai/claim/{claimToken}` (uses `NEXT_PUBLIC_APP_URL` env var for base URL).
- **Technical:** New `components/share-claim-link.tsx` receives `claimToken: string`, `shadowName: string`, `shadowId: string`. Uses `navigator.clipboard.writeText()` for copy. "Endorse Now" links to an endorsement flow targeting the shadow's ID. Toast on copy: "Link copied to clipboard".
- **Acceptance criteria:**
  - [ ] Claim URL displayed and fully selectable
  - [ ] Copy button copies URL to clipboard
  - [ ] Toast notification on successful copy
  - [ ] Expiration notice shows "90 days"
  - [ ] "Endorse Now" button links to endorsement flow for this shadow
  - [ ] "Done" button closes dialog
  - [ ] URL uses correct base domain from `NEXT_PUBLIC_APP_URL`
- **Failure paths:**
  - If clipboard API unavailable (older browsers): fallback to text selection, no toast

**[1.4] Endorse a shadow persona at creation time**
> Creator endorses the shadow persona immediately after creating it so that the shadow has social proof before the claim link is shared.

- **User:** Authenticated community member who just created a shadow persona.
- **Functional:** "Endorse Now" button in the share dialog navigates to an endorsement form targeting the shadow persona. The endorsement form is the same as the existing one but targets `toShadowPersonaId` instead of `toPersonaUri`. The endorsement is stored with `toShadowPersonaId = shadow.id` and `toPersonaUri = null`. When the shadow is later claimed, the endorsement's `toPersonaUri` is updated to the claiming persona's URI (handled by `claimShadowPersona` in `lib/db/queries.ts` line 153-156).
- **Technical:** `createEndorsementAction` in `app/actions/endorsements.ts` lines 70-114 already supports `toShadowPersonaId`. The endorsements table has a CHECK constraint ensuring at least one of `toPersonaUri` or `toShadowPersonaId` is set (`endorsement_target_check` in `lib/db/schema/endorsements.ts` line 30-33). Index `idx_endorsements_shadow` covers shadow lookups (line 37).
- **Acceptance criteria:**
  - [ ] Endorsement created with `toShadowPersonaId` set and `toPersonaUri` null
  - [ ] CHECK constraint satisfied (shadow ID is not null)
  - [ ] Endorsement appears on the shadow persona display page (`/s/{id}`)
  - [ ] Endorsement count included in claim page display
- **Failure paths:**
  - If endorsement creation fails: error toast, shadow persona still exists and is shareable

**Workflow success:** A shadow persona exists in the database with a claim token, traits, and optionally one or more endorsements. The creator has a shareable claim URL to send to the intended recipient.

---

### Schema

No schema changes. Uses existing `shadow_personas` table from `lib/db/schema/shadow-personas.ts`:

```typescript
// Existing — lib/db/schema/shadow-personas.ts
export const shadowPersonas = pgTable(
  'shadow_personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id').references(() => communities.id).notNull(),
    createdByPersonaUri: text('created_by_persona_uri').references(() => personas.uri).notNull(),
    displayName: text('display_name').notNull(),
    entityType: text('entity_type').notNull().default('person'),
    traits: jsonb('traits').notNull().default('{}'),
    embedding: vector('embedding', { dimensions: 1536 }),
    claimStatus: text('claim_status').default('unclaimed'),
    claimToken: text('claim_token').unique(),
    claimedByPersonaUri: text('claimed_by_persona_uri').references(() => personas.uri),
    inviteSentVia: text('invite_sent_via'),      // 'email' | 'sms' | 'link' | etc.
    inviteSentAt: timestamp('invite_sent_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_shadow_community').on(table.communityId),
    index('idx_shadow_claim').on(table.claimStatus),
    index('idx_shadow_embedding').using('ivfflat', table.embedding.op('vector_cosine_ops')),
  ],
);
```

### Server Actions

Existing actions in `app/actions/shadows.ts`:

```typescript
createShadowAction(raw: CreateShadowInput): Promise<ShadowPersona>
// Authenticated user required. Validates input, checks persona ownership and community
// membership, creates shadow with claim token and 90-day expiry, logs activity.

getUnclaimedShadowsAction(communityId: string): Promise<ShadowPersona[]>
// Authenticated user required. Checks community membership. Returns unclaimed shadows.
```

### Validation

Existing Zod schema in `app/actions/shadows.ts` (lines 25-38):

```typescript
const createShadowInput = z.object({
  communityId: z.string().uuid(),
  createdByPersonaUri: z.string().min(1),
  displayName: z.string().min(1),
  entityType: z.enum(['person', 'organization']).optional(),
  traits: z.object({
    skills: z.array(z.object({ name: z.string() }).passthrough()).optional(),
    qualities: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
  }).passthrough().optional(),
});
```

Enhancement: move this schema to `lib/validations/shadows.ts` for reuse by form components:

```typescript
// NEW — lib/validations/shadows.ts

import { z } from 'zod';
import { ENTITY_TYPES } from '@/lib/constants';

export const createShadowSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  createdByPersonaUri: z.string().min(1, 'Creator persona URI is required'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer'),
  entityType: z.enum(ENTITY_TYPES).default('person'),
  traits: z.object({
    skills: z.array(z.object({
      name: z.string().min(1),
      proficiency: z.string().optional(),
    }).passthrough()).optional(),
    qualities: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
  }).passthrough().optional(),
});

export type CreateShadowInput = z.infer<typeof createShadowSchema>;

export const claimShadowSchema = z.object({
  shadowId: z.string().uuid('Invalid shadow ID'),
  claimToken: z.string().min(1, 'Claim token is required'),
  claimingPersonaUri: z.string().min(1, 'Claiming persona URI is required'),
});

export type ClaimShadowInput = z.infer<typeof claimShadowSchema>;

export const publicClaimSchema = z.object({
  claimToken: z.string().min(1, 'Claim token is required'),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
});

export type PublicClaimInput = z.infer<typeof publicClaimSchema>;
```

### Edge Cases

- [ ] Creator tries to create a shadow with the same name as an existing shadow in the community: allowed (no unique constraint on `displayName` per community)
- [ ] Creator creates shadow in a community they are not a member of: `assertInCommunity` throws
- [ ] Creator creates shadow with a persona they do not own: `assertOwnsPersona` throws
- [ ] Creator creates shadow with empty traits: `traits` defaults to `{}`
- [ ] Claim token uniqueness: `claimToken` column has a UNIQUE constraint; `crypto.randomUUID()` collision is astronomically unlikely but the DB constraint provides a safety net
- [ ] Creator creates multiple shadows in the same community: allowed, each gets its own claim token

### Test Criteria

**Unit tests:**
- `createShadowSchema` accepts valid input with all fields
- `createShadowSchema` rejects empty display name
- `createShadowSchema` rejects invalid community ID (not UUID)
- `createShadowSchema` accepts input without optional traits

**Integration tests:**
- `createShadowAction` creates a row with correct `claimStatus`, `claimToken`, and `expiresAt`
- `createShadowAction` rejects when user is not a community member
- `createShadowAction` rejects when user does not own the creating persona
- `createShadowAction` logs a `shadow_created` activity event

**E2E tests:**
- Open shadow creation dialog, fill form, submit, verify claim link shown
- Copy claim link to clipboard, verify toast
- Verify shadow appears in unclaimed shadows list for the community

### Implementation Order

1. Create `lib/validations/shadows.ts` with `createShadowSchema`, `claimShadowSchema`, `publicClaimSchema`
2. Update `app/actions/shadows.ts` to import schemas from `lib/validations/shadows.ts` instead of inline definitions
3. Create `components/share-claim-link.tsx` -- claim URL display with copy button
4. Create `components/create-shadow-dialog.tsx` -- form dialog with trait inputs (requires steps 1, 3)
5. Integrate shadow creation dialog into community page (requires step 4)
6. Write unit tests for validation schemas
7. Write integration tests for `createShadowAction`
8. Write E2E test for shadow creation flow

---

## 2. Shadow Persona Display

### Overview

The shadow persona display page (`/s/{id}`) is a public, unauthenticated page that shows limited information about a shadow persona: display name, entity type, traits (skills, qualities, interests), endorsements, and a "Claim this profile" call-to-action. It serves two purposes: (1) give the intended recipient a preview of what has been created for them, and (2) give other community members context about the shadow before endorsing it.

### Wireframe

```
Shadow Persona Display (/s/{id}):
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| |                                                               |  |
| |                     ( A )                                     |  |
| |                  Alex Rivera                                  |  |
| |                    [person]                                   |  |
| |             [Profile awaiting claim]                          |  |
| |                                                               |  |
| | Skills                                                        |  |
| | [TypeScript] [React (Advanced)] [Node.js]                     |  |
| |                                                               |  |
| | Qualities                                                     |  |
| | [Detail-oriented] [Great communicator]                        |  |
| |                                                               |  |
| | Interests                                                     |  |
| | [Open source] [DevOps]                                        |  |
| |                                                               |  |
| | ─────────────────────────────────────────                     |  |
| | * 3 endorsements                                              |  |
| +---------------------------------------------------------------+  |
|                                                                     |
| +-- Endorsements -----------------------------------------------+  |
| | [3 received]                                                  |  |
| | +-----------------------------------------------------------+ |  |
| | | (J) Jamie Smith  [colleague]  [Strong]                     | |  |
| | |     "Alex is one of the best frontend devs I've worked..." | |  |
| | |     [TypeScript] [React]                                    | |  |
| | +-----------------------------------------------------------+ |  |
| | ...                                                           |  |
| +---------------------------------------------------------------+  |
|                                                                     |
| +-- Claim CTA (unclaimed only) ---------------------------------+  |
| |                      ( Users icon )                            |  |
| |                    Is this you?                                 |  |
| |  Someone created this profile for you. Claim it to take        |  |
| |  ownership of your endorsements and build your full profile.   |  |
| |                                                                |  |
| |                  [Claim This Profile  >]                       |  |
| +---------------------------------------------------------------+  |
|                                                                     |
| Shadow profiles are created by community members on Personus.ai     |
+---------------------------------------------------------------------+

Already claimed state:
+---------------------------------------------------------------+
| |                     ( A )                                   |
| |                  Alex Rivera                                |
| |                    [person]                                 |
| |                    [Claimed]                                |
+---------------------------------------------------------------+
(No claim CTA shown)

Expired state:
+---------------------------------------------------------------+
| |              This profile has expired.                      |
| |  The claim link is no longer active.                        |
+---------------------------------------------------------------+
```

### Component Hierarchy

```
app/s/[id]/page.tsx                                 <-- EXISTS: Server Component (data fetching)
  +-- components/ui/card.tsx                        <-- EXISTS
  +-- components/ui/badge.tsx                       <-- EXISTS
  +-- components/ui/button.tsx                      <-- EXISTS
  +-- calls:
       +-- lib/db/queries.ts -> getShadowById()     <-- EXISTS
       +-- lib/db/queries.ts -> getEndorsementsForShadow()  <-- EXISTS
```

The shadow display page already exists at `app/s/[id]/page.tsx` (219 lines). It renders the shadow's display name, entity type badge, claim status badge, traits (skills/qualities/interests), endorsement list, and a claim CTA linking to `/claim/{claimToken}`. Enhancements: add expired state handling and basic SEO metadata.

### Workflows & Stories

---

#### Workflow: Visitor views a shadow persona page

**Preconditions:**
- Shadow persona exists in the database
- Visitor navigates to `/s/{id}` (via direct link, community directory, or search)

**Stories:**

**[2.1] Render shadow persona with traits and endorsements**
> Visitor views the shadow persona page so that they can see who this person is and what others say about them.

- **User:** Any visitor (authenticated or unauthenticated).
- **Functional:** Page displays: avatar initial (first character of display name, purple background using `persona-shadow` color), display name, entity type badge, claim status badge ("Profile awaiting claim" for unclaimed, "Claimed" for claimed), traits organized by category (skills with proficiency, qualities, interests), endorsement count with gold star icon, and full endorsement cards below. Endorsement cards show: endorser initials (derived from `fromPersonaUri`), relationship type badge, strength badge (if "strong"), testimonial text, and context tags.
- **Technical:** Existing `app/s/[id]/page.tsx`. Calls `getShadowById(id)` (line 18) and `getEndorsementsForShadow(shadow.id)` (line 21). Casts `shadow.traits` to `ShadowTraits` interface (lines 9-14). Returns `notFound()` if shadow does not exist.
- **Acceptance criteria:**
  - [ ] Page renders for valid shadow ID
  - [ ] 404 returned for invalid shadow ID
  - [ ] Avatar shows first character of display name with purple background
  - [ ] Entity type badge displayed
  - [ ] Claim status badge shows "Profile awaiting claim" (unclaimed) or "Claimed"
  - [ ] Skills rendered with name and optional proficiency
  - [ ] Qualities rendered as outline badges
  - [ ] Interests rendered as outline badges
  - [ ] Empty trait categories are not rendered (no empty sections)
  - [ ] Endorsement count shown with star icon
  - [ ] Each endorsement card shows endorser info, relationship, strength, testimonial, context
- **Failure paths:**
  - If shadow ID is invalid UUID format: Next.js returns 404
  - If shadow not found in DB: `notFound()` returns 404 page
  - If DB query fails: Next.js error boundary

**[2.2] Display claim CTA for unclaimed shadows**
> Visitor sees a call-to-action to claim the profile so that the intended recipient can take ownership.

- **User:** Any visitor viewing an unclaimed shadow persona.
- **Functional:** A gradient card at the bottom of the page shows: users icon, "Is this you?" heading, descriptive text explaining the claim process, and a "Claim This Profile" button linking to `/claim/{claimToken}`. The CTA is only shown when: (a) `claimStatus === 'unclaimed'`, (b) `claimToken` is not null, and (c) the shadow has not expired. The CTA is hidden for claimed shadows.
- **Technical:** Existing conditional rendering at `app/s/[id]/page.tsx` lines 186-207. Checks `isUnclaimed && shadow.claimToken`. Links to `/claim/${shadow.claimToken}`.
- **Acceptance criteria:**
  - [ ] Claim CTA shown for unclaimed shadows with valid claim token
  - [ ] Claim CTA hidden for claimed shadows
  - [ ] Claim CTA hidden when claim token is null
  - [ ] Button links to `/claim/{claimToken}` (not `/claim/{id}`)
  - [ ] CTA uses purple gradient background matching shadow persona color scheme
- **Failure paths:**
  - None (display only)

**[2.3] Handle expired shadow persona display**
> Visitor sees an appropriate message when viewing an expired shadow so that they understand the profile is no longer claimable.

- **User:** Any visitor viewing an expired shadow persona.
- **Functional:** If `shadow.expiresAt` is in the past, the page still renders the shadow's info (name, traits, endorsements) but: (a) replaces the claim status badge with "Expired", (b) hides the claim CTA, and (c) shows a notice: "This profile has expired. The claim link is no longer active." Expired shadows are still viewable for context (endorsements are still visible) but cannot be claimed.
- **Technical:** Enhancement to `app/s/[id]/page.tsx`. Add `isExpired` check: `shadow.expiresAt && new Date(shadow.expiresAt) < new Date()`. Render expired badge and suppress claim CTA when expired.
- **Acceptance criteria:**
  - [ ] Expired shadow shows "Expired" badge instead of "Profile awaiting claim"
  - [ ] Claim CTA hidden for expired shadows
  - [ ] Traits and endorsements still visible on expired shadows
  - [ ] Expiration check uses server time (SSR), not client time
- **Failure paths:**
  - If `expiresAt` is null: treat as non-expiring (show claim CTA if unclaimed)

**Workflow success:** Visitor can view shadow persona details, see endorsements, and access the claim flow if the shadow is unclaimed and not expired.

---

### Schema

No schema changes. Uses existing `shadow_personas` and `endorsements` tables.

### Server Actions

No new server actions. Uses existing query helpers:

```typescript
// Existing — lib/db/queries.ts
getShadowById(id: string): Promise<ShadowPersona | null>
getEndorsementsForShadow(shadowPersonaId: string): Promise<Endorsement[]>
```

### Validation

No validation needed for display. The shadow ID is a UUID from the URL path parameter.

### Edge Cases

- [ ] Shadow with no traits: only name and entity type shown, no trait sections rendered
- [ ] Shadow with no endorsements: endorsement section hidden, count shows "0 endorsements"
- [ ] Shadow that was claimed: shows "Claimed" badge, no claim CTA, endorsements still visible
- [ ] Shadow with `expiresAt` in the past: expired state shown
- [ ] Shadow with `expiresAt` null: treated as non-expiring
- [ ] External endorser URI (`external:jane-doe`): display logic extracts readable name (splits on `-`, capitalizes)

### Test Criteria

**Unit tests:**
- Expired shadow check: `expiresAt < now` returns true for past dates
- External endorser name extraction from `external:first-last` format

**Integration tests:**
- `getShadowById` returns correct shadow for valid ID
- `getShadowById` returns null for invalid ID
- `getEndorsementsForShadow` returns only active endorsements for the shadow

**E2E tests:**
- Navigate to `/s/{id}` for unclaimed shadow: verify name, traits, endorsements, claim CTA
- Navigate to `/s/{id}` for claimed shadow: verify "Claimed" badge, no claim CTA
- Navigate to `/s/{invalid-id}`: verify 404 page

### Implementation Order

1. Add expired state handling to `app/s/[id]/page.tsx` -- `isExpired` check, expired badge, hide claim CTA
2. Add basic SEO metadata to shadow display page (title, description, noindex for expired)
3. Write E2E test for shadow display in unclaimed, claimed, and expired states

---

## 3. Claim Flow

### Overview

The claim flow is the critical conversion funnel that turns shadow personas into real Personus users. It is a 3-step process accessed via `/claim/{token}`: (1) welcome/preview showing the shadow's name and endorsement count, (2) identity verification (name + email for MVP, or sign-in for existing users), and (3) success confirmation with sign-up/sign-in CTAs. The full claim flow (for authenticated users) additionally involves selecting or creating a persona to absorb the shadow's endorsements.

### Wireframe

```
Claim Page (/claim/{token}) -- Token Not Found:
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| |                     ( Shield icon )                            |  |
| |                                                                |  |
| |                Claim Link Not Found                            |  |
| |  This claim link is invalid or has expired. If you believe     |  |
| |  this is an error, please contact the person who shared it.    |  |
| |                                                                |  |
| |                    [Go to Personus]                             |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+

Claim Page -- Already Claimed:
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| |                     ( Star icon )                              |  |
| |                                                                |  |
| |                   Already Claimed                              |  |
| |  The profile for Alex Rivera has already been claimed. If      |  |
| |  this was you, sign in to access your profile.                 |  |
| |                                                                |  |
| |                       [Sign In]                                |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+

Claim Flow Step 1: Welcome / Preview
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| |                                                                |  |
| |                     ( A )  purple bg                           |  |
| |                                                                |  |
| |          [Sparkles] Profile Created For You                    |  |
| |               Welcome, Alex Rivera!                            |  |
| |  Someone in your network created a profile for you on          |  |
| |  Personus and vouched for your skills. Claim it to take        |  |
| |  ownership.                                                    |  |
| |                                                                |  |
| |        ( * ) 3 endorsements waiting for you                    |  |
| |                                                                |  |
| |               [Claim My Profile  >]                            |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+

Claim Flow Step 2: Identity Verification (MVP)
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| | [===] [===] [   ]   (progress bar: 2 of 3)                    |  |
| |                                                                |  |
| | Verify Your Identity                                           |  |
| | Confirm your details to claim the profile created for          |  |
| | Alex Rivera.                                                   |  |
| |                                                                |  |
| | Your Full Name *    [                                 ]        |  |
| |                                                                |  |
| | Email Address *     [                                 ]        |  |
| |  We will use this to connect you when you sign up.             |  |
| |                                                                |  |
| |              [Back]          [UserCheck] Confirm Claim          |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+

Claim Flow Step 3: Success
+---------------------------------------------------------------------+
|                         Personus.ai                                 |
|                                                                     |
| +---------------------------------------------------------------+  |
| |                                                                |  |
| |                ( Checkmark icon ) green bg                     |  |
| |                                                                |  |
| | [===] [===] [===]   (progress bar: 3 of 3)                    |  |
| |                                                                |  |
| |               Claim Successful!                                |  |
| |  You have claimed the profile for Alex Rivera. Sign up         |  |
| |  or sign in to build your full profile and access your         |  |
| |  endorsements.                                                 |  |
| |                                                                |  |
| |     ( * ) 3 endorsements will transfer to your profile         |  |
| |                                                                |  |
| |       [Sign Up for Personus  >]   [Sign In]                   |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+

Authenticated Claim Flow (post-MVP):
+---------------------------------------------------------------------+
|                                                                     |
| Step 2 (authenticated): Select Persona                              |
| +---------------------------------------------------------------+  |
| | Choose which persona to merge this shadow into:                |  |
| |                                                                |  |
| | ( ) Jamie Smith - Full-stack engineer     [Professional]       |  |
| | ( ) JS Photography - Freelance photog     [Creative]           |  |
| | ( ) [+ Create New Persona]                                     |  |
| |                                                                |  |
| | --- Adopt traits from shadow? ---                              |  |
| | [x] TypeScript (skill)                                         |  |
| | [x] React (skill)                                              |  |
| | [ ] Detail-oriented (quality)                                  |  |
| |                                                                |  |
| |              [Back]               [Claim into Persona]         |  |
| +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+
```

### Component Hierarchy

```
app/claim/[token]/page.tsx                          <-- EXISTS: Server Component
  +-- app/claim/[token]/claim-flow.tsx              <-- EXISTS: Client Component ("use client")
       +-- Step 1: Welcome preview                  <-- EXISTS (inline)
       +-- Step 2: Identity form (MVP)              <-- EXISTS (inline)
       +-- Step 3: Success                          <-- EXISTS (inline)
       +-- components/ui/card.tsx                   <-- EXISTS
       +-- components/ui/input.tsx                  <-- EXISTS
       +-- components/ui/badge.tsx                  <-- EXISTS
       +-- components/ui/button.tsx                 <-- EXISTS
       +-- calls:
            +-- app/actions/shadows.ts
                 +-- submitPublicClaim()            <-- EXISTS
                 +-- claimShadowAction()            <-- EXISTS (authenticated flow)

app/claim/[token]/auth-claim-flow.tsx               <-- NEW: Authenticated claim flow
  +-- components/persona-selector.tsx               <-- NEW: persona radio list
  +-- components/shadow-trait-adopter.tsx            <-- NEW: trait adoption checkboxes
  +-- calls:
       +-- app/actions/shadows.ts -> claimShadowAction()
       +-- app/actions/personas.ts -> listPersonas()
       +-- app/actions/personas.ts -> updatePersonaTraits()
```

The claim page (`app/claim/[token]/page.tsx`, 95 lines) and claim flow client component (`app/claim/[token]/claim-flow.tsx`, 238 lines) already exist and implement the 3-step MVP flow. The authenticated claim flow (persona selection + trait adoption) is new.

### Workflows & Stories

---

#### Workflow: Non-user claims a shadow persona via the MVP public flow

**Preconditions:**
- Shadow persona exists with `claimStatus = 'unclaimed'`
- Shadow has not expired (`expiresAt > now` or `expiresAt` is null)
- Visitor has the claim token (shared by the shadow creator)

**Stories:**

**[3.1] Validate claim token and render claim page**
> Visitor navigates to the claim URL so that they can see who created a profile for them.

- **User:** Unauthenticated visitor with a claim token URL.
- **Functional:** Server component calls `getShadowByTokenPublic(token)` which looks up the shadow by claim token and returns it with the endorsement count. Three states: (a) token not found -- shows "Claim Link Not Found" error card with "Go to Personus" button, (b) already claimed -- shows "Already Claimed" message with "Sign In" button, (c) valid unclaimed -- renders the `ClaimFlow` component with shadow details.
- **Technical:** Existing `app/claim/[token]/page.tsx`. `getShadowByTokenPublic` at `app/actions/shadows.ts` lines 175-184 calls `getShadowByClaimToken(token)` then `getEndorsementsForShadow(shadow.id)`. Returns `null` if token not found. Page checks `result` (null = not found), then `shadow.claimStatus === 'claimed'` (already claimed), then renders `ClaimFlow`.
- **Acceptance criteria:**
  - [ ] Invalid token shows "Claim Link Not Found" with shield icon
  - [ ] Claimed shadow shows "Already Claimed" with star icon and sign-in CTA
  - [ ] Unclaimed shadow renders the 3-step ClaimFlow component
  - [ ] ClaimFlow receives `claimToken`, `shadowName`, `shadowInitial`, `endorsementCount`
  - [ ] Page is accessible without authentication (no `serverAuth.protect()` call)
- **Failure paths:**
  - If token is empty string: `getShadowByClaimToken` returns null, "not found" state rendered
  - If DB error: Next.js error boundary

**[3.2] Preview shadow and start claim (step 1)**
> Visitor sees a welcome screen with the shadow's name and endorsement count so that they understand what they are claiming.

- **User:** Unauthenticated visitor on the claim page.
- **Functional:** Step 1 shows: purple avatar circle with initial, "Profile Created For You" badge with sparkle icon, "Welcome, {shadowName}!" heading, descriptive text, endorsement count (if > 0) in a gold-accented pill, and "Claim My Profile" button. Clicking the button advances to step 2.
- **Technical:** Existing step 1 in `app/claim/[token]/claim-flow.tsx` lines 65-104. State managed by `useState<1 | 2 | 3>(1)`. Button calls `setStep(2)`.
- **Acceptance criteria:**
  - [ ] Avatar shows first character with purple background
  - [ ] Shadow name displayed in heading
  - [ ] Endorsement count pill shown only when count > 0
  - [ ] "Claim My Profile" button advances to step 2
  - [ ] No server call on step 1 (display only from props)
- **Failure paths:**
  - None (client-only display)

**[3.3] Submit identity verification (step 2 - MVP)**
> Visitor enters their name and email to claim the shadow so that their identity is recorded and they can later sign up to complete the claim.

- **User:** Unauthenticated visitor on step 2 of the claim flow.
- **Functional:** Form with two required fields: Full Name (text input) and Email Address (email input). Client-side validation: name must not be empty, email must be a valid format. "Back" button returns to step 1. "Confirm Claim" button submits: calls `submitPublicClaim({ claimToken, name, email })` which marks the shadow as `claimed` in the database. On success, advances to step 3 and shows success toast.
- **Technical:** Existing step 2 in `app/claim/[token]/claim-flow.tsx` lines 108-183. Client-side validation in `validateStep2()` (lines 34-43). Calls `submitPublicClaim` from `app/actions/shadows.ts` (lines 194-218) which: looks up shadow by token, checks not already claimed, checks not expired, sets `claimStatus = 'claimed'`. Note: MVP flow does NOT transfer endorsements yet -- it only marks the shadow as claimed. Full endorsement transfer happens in the authenticated claim flow (story 3.5).
- **Acceptance criteria:**
  - [ ] Name field required, shows error if empty on submit
  - [ ] Email field required, validates email format
  - [ ] "Back" button returns to step 1 without losing form data
  - [ ] "Confirm Claim" button shows loading state ("Claiming...")
  - [ ] Button disabled during submission (prevents double-submit)
  - [ ] On success: shadow `claimStatus` set to `'claimed'`
  - [ ] On success: `updatedAt` timestamp updated
  - [ ] On success: toast "Profile claimed successfully!"
  - [ ] On success: step advances to 3
- **Failure paths:**
  - If shadow already claimed (race condition): error "This profile has already been claimed"
  - If shadow expired: error "This claim link has expired"
  - If shadow not found: error "Shadow persona not found"
  - If network error: error toast, form remains editable for retry

**[3.4] Claim success and sign-up prompt (step 3)**
> Visitor sees a success confirmation and is directed to sign up so that they can complete their Personus profile.

- **User:** Visitor who just completed the claim.
- **Functional:** Step 3 shows: green checkmark icon in green circle, completed progress bar (3/3), "Claim Successful!" heading, descriptive text about signing up, endorsement transfer notice (if count > 0 -- "{N} endorsements will transfer to your profile"), and two CTAs: "Sign Up for Personus" (primary) and "Sign In" (secondary). Both currently link to `/` (root page where Clerk sign-up/sign-in is available).
- **Technical:** Existing step 3 in `app/claim/[token]/claim-flow.tsx` lines 187-237. Display only, no server calls.
- **Acceptance criteria:**
  - [ ] Green checkmark icon displayed
  - [ ] Progress bar shows all 3 steps complete
  - [ ] Endorsement transfer notice shown only when count > 0
  - [ ] "Sign Up for Personus" links to sign-up flow
  - [ ] "Sign In" links to sign-in flow
  - [ ] Both buttons are functional and navigate correctly
- **Failure paths:**
  - None (display only)

---

#### Workflow: Authenticated user claims a shadow persona with persona selection

**Preconditions:**
- User is authenticated via Clerk
- User has at least one persona
- Shadow persona exists with `claimStatus = 'unclaimed'` and valid claim token
- Shadow has not expired

**Stories:**

**[3.5] Authenticated claim with persona selection and endorsement transfer**
> Authenticated user selects which persona to claim the shadow into so that endorsements transfer to the correct persona.

- **User:** Authenticated user who navigated to `/claim/{token}` while logged in.
- **Functional:** Instead of the MVP name/email form, the authenticated claim page shows: (a) the shadow preview (same as step 1), (b) a persona selector -- radio list of the user's existing personas with option to "Create New Persona", (c) a trait adoption section showing the shadow's traits with checkboxes for each, and (d) a "Claim into Persona" button. On submit: calls `claimShadowAction(shadowId, claimToken, claimingPersonaUri)` which updates the shadow's `claimStatus` to `'claimed'`, sets `claimedByPersonaUri`, and transfers all endorsements from `toShadowPersonaId = shadow.id` to `toPersonaUri = claimingPersonaUri`. If trait adoption is selected, the adopted traits are merged into the claiming persona via `updatePersonaTraits()`.
- **Technical:** New `app/claim/[token]/auth-claim-flow.tsx` client component. The server component at `app/claim/[token]/page.tsx` checks authentication state: if authenticated, renders `AuthClaimFlow`; if not, renders existing `ClaimFlow`. `claimShadowAction` at `app/actions/shadows.ts` lines 126-157 validates the claim token via `assertCanClaimShadow` (checks status, token, expiry at `lib/auth/permissions.ts` lines 297-318), then calls `claimShadowPersona` at `lib/db/queries.ts` lines 138-159 which updates the shadow row and transfers endorsements.
- **Acceptance criteria:**
  - [ ] Authenticated users see persona selector instead of name/email form
  - [ ] All user's personas listed as radio options
  - [ ] "Create New Persona" option available (redirects to `/personas/new` then back)
  - [ ] Shadow's traits shown as checkboxes (skills, qualities, interests)
  - [ ] Selected traits merged into claiming persona's `traits` JSONB on claim
  - [ ] `claimShadowPersona` updates shadow: `claimStatus = 'claimed'`, `claimedByPersonaUri = claimingPersonaUri`
  - [ ] `claimShadowPersona` transfers endorsements: `endorsements.toPersonaUri = claimingPersonaUri` WHERE `toShadowPersonaId = shadow.id`
  - [ ] Activity event logged with type `shadow_claimed`
  - [ ] Claiming persona's completeness score recalculated after trait adoption
  - [ ] Redirect to claiming persona's detail page after success
- **Failure paths:**
  - If user does not own the selected persona: `assertOwnsPersona` throws
  - If shadow already claimed: `assertCanClaimShadow` throws "Shadow persona is not claimable"
  - If claim token is wrong: `assertCanClaimShadow` throws "Invalid claim token"
  - If shadow expired: `assertCanClaimShadow` throws "Claim token has expired"

**[3.6] Adopt shadow traits into claiming persona**
> Authenticated claimant selects which shadow traits to adopt so that the shadow's skills and qualities enrich their persona.

- **User:** Authenticated user on the claim page selecting traits to adopt.
- **Functional:** The shadow's traits are displayed as checkboxes grouped by category. Skills show name + proficiency. Qualities and interests show as string checkboxes. All traits are checked by default (opt-out model). Unchecked traits are not adopted. Adopted traits are merged into the claiming persona's `traits` JSONB using the same merge logic as `updatePersonaTraits()` -- persona keys overwrite user trait keys, new categories are added.
- **Technical:** New `components/shadow-trait-adopter.tsx` receives `shadowTraits: ShadowTraits` and returns `adoptedTraits: Partial<ShadowTraits>`. After calling `claimShadowAction`, if adopted traits exist, calls `updatePersonaTraits(claimingPersonaUri, mergedTraits)` where `mergedTraits` is the claiming persona's existing traits merged with adopted traits. Skill adoption merges by name (avoids duplicates).
- **Acceptance criteria:**
  - [ ] All shadow traits shown as checkboxes, checked by default
  - [ ] User can uncheck traits they do not want to adopt
  - [ ] Skills merged by name (no duplicates if claiming persona already has the skill)
  - [ ] If claiming persona has a skill with different proficiency, shadow's proficiency does NOT overwrite
  - [ ] String-array traits (qualities, interests) deduplicated on merge
  - [ ] Adopted traits appear in claiming persona after claim
  - [ ] Non-adopted traits are discarded (not stored anywhere)
  - [ ] Trait adoption is optional (user can uncheck all and still claim)
- **Failure paths:**
  - If trait merge fails: claim still succeeds (endorsements transferred), traits not adopted, error toast

**Workflow success:** Shadow persona is claimed, endorsements transferred to the selected persona, and optionally shadow traits are adopted into the persona. The shadow's `claimStatus` is `'claimed'` and `claimedByPersonaUri` references the claiming persona.

---

### Schema

No schema changes. Uses existing tables:

- `shadow_personas` -- `claimStatus`, `claimToken`, `claimedByPersonaUri`, `expiresAt`
- `endorsements` -- `toShadowPersonaId`, `toPersonaUri` (updated during transfer)
- `personas` -- `traits` (updated if trait adoption occurs)

### Server Actions

Existing actions in `app/actions/shadows.ts`:

```typescript
getShadowByTokenPublic(token: string): Promise<{ shadow: ShadowPersona; endorsementCount: number } | null>
// Public (no auth required). Looks up shadow by claim token, returns shadow and endorsement count.

submitPublicClaim(data: { claimToken: string; name: string; email: string }): Promise<ShadowPersona>
// Public (no auth required). MVP claim: marks shadow as claimed. Does NOT transfer endorsements.

claimShadowAction(shadowId: string, claimToken: string, claimingPersonaUri: string): Promise<ShadowPersona>
// Authenticated user required. Full claim: validates token and expiry, marks shadow as claimed,
// sets claimedByPersonaUri, transfers endorsements to claiming persona, logs activity.
```

New actions needed:

```typescript
// NEW — add to app/actions/shadows.ts

export async function getShadowTraitsForAdoption(shadowId: string): Promise<ShadowTraits>
// Public (no auth required). Returns the shadow's traits for the trait adoption step.
// Simply calls getShadowById and returns shadow.traits.

export async function adoptShadowTraits(
  claimingPersonaUri: string,
  adoptedTraits: Partial<ShadowTraits>,
): Promise<void>
// Authenticated user required. Merges adopted traits into the claiming persona's traits JSONB.
// Uses existing updatePersonaTraits() logic for merge and completeness recalculation.
```

### Validation

Uses existing and new schemas from `lib/validations/shadows.ts`:

```typescript
// Existing (moved from inline in shadows.ts)
claimShadowSchema  // { shadowId: uuid, claimToken: string, claimingPersonaUri: string }
publicClaimSchema  // { claimToken: string, name: string, email: email }
```

### Edge Cases

- [ ] Two users try to claim the same shadow simultaneously: first write wins, second gets "already claimed" error
- [ ] User claims shadow with a persona that already has the same skills: skills deduplicated by name
- [ ] User claims shadow then deletes the claiming persona: shadow remains `claimed` but `claimedByPersonaUri` becomes a dangling reference (handled by deletion cascade in spec 01, story 5.2)
- [ ] Expired shadow claim attempt: both MVP and authenticated flows check `expiresAt` before allowing claim
- [ ] Claim token with special characters: token is a UUID (`crypto.randomUUID()`), always URL-safe
- [ ] Authenticated user with zero personas tries to claim: "Create New Persona" option is the only choice, redirects to creation wizard
- [ ] Same user who created the shadow tries to claim it: allowed (no restriction, though unusual)
- [ ] Shadow with `claimToken = null`: claim page returns "not found" (line 177 in shadows.ts)

### Test Criteria

**Unit tests:**
- `publicClaimSchema` accepts valid name and email
- `publicClaimSchema` rejects empty name
- `publicClaimSchema` rejects invalid email format
- `claimShadowSchema` accepts valid UUIDs and strings
- Trait merge logic: deduplication by skill name (case-insensitive)
- Trait merge logic: string array deduplication for qualities/interests

**Integration tests:**
- `getShadowByTokenPublic` returns shadow and endorsement count for valid token
- `getShadowByTokenPublic` returns null for invalid token
- `submitPublicClaim` sets `claimStatus` to `'claimed'`
- `submitPublicClaim` rejects already-claimed shadows
- `submitPublicClaim` rejects expired shadows
- `claimShadowAction` transfers endorsements to claiming persona
- `claimShadowAction` sets `claimedByPersonaUri` on shadow
- `claimShadowAction` logs `shadow_claimed` activity event

**E2E tests:**
- Navigate to `/claim/{token}`: verify step 1 welcome screen with shadow name
- Step 1 -> Step 2: enter name and email, submit, verify step 3 success
- Verify shadow status is "claimed" after public claim
- Navigate to `/claim/{token}` for claimed shadow: verify "Already Claimed" state
- Navigate to `/claim/{invalid-token}`: verify "Not Found" state
- Authenticated claim: verify persona selector, select persona, claim, verify endorsements transferred

### Implementation Order

1. Add expired shadow check to `getShadowByTokenPublic` and claim page (return expired state)
2. Move inline Zod schemas from `app/actions/shadows.ts` to `lib/validations/shadows.ts` (requires step 1 of feature 1)
3. Create `components/persona-selector.tsx` -- radio list of user's personas
4. Create `components/shadow-trait-adopter.tsx` -- trait adoption checkboxes with deduplication logic
5. Create `app/claim/[token]/auth-claim-flow.tsx` -- authenticated claim flow with persona selection and trait adoption (requires steps 3, 4)
6. Update `app/claim/[token]/page.tsx` to detect auth state and render `AuthClaimFlow` vs `ClaimFlow` (requires step 5)
7. Implement `adoptShadowTraits` server action in `app/actions/shadows.ts`
8. Write unit tests for trait merge deduplication logic
9. Write integration tests for claim actions
10. Write E2E test for full claim flow (both public and authenticated)

---

## 4. Endorsement Transfer

### Overview

Endorsement transfer is the mechanism that makes shadow personas valuable: endorsements given to a shadow persona are automatically redirected to the claiming persona when the shadow is claimed. This transfer is atomic -- it happens in the same database operation as the claim itself. After transfer, the endorsements appear on the claiming persona's profile as if they had always been directed there. The `toShadowPersonaId` column is preserved for audit purposes, but `toPersonaUri` is updated to the claimer's persona URI.

### Wireframe

```
Before claim:
endorsements table:
+------+------------------+---------------------+
| id   | to_persona_uri   | to_shadow_persona_id|
+------+------------------+---------------------+
| e1   | NULL             | shadow-abc          |  <-- targets shadow
| e2   | NULL             | shadow-abc          |  <-- targets shadow
| e3   | jamie-smith      | NULL                |  <-- targets persona (unrelated)
+------+------------------+---------------------+

After claim (shadow-abc claimed by alex-rivera):
+------+------------------+---------------------+
| id   | to_persona_uri   | to_shadow_persona_id|
+------+------------------+---------------------+
| e1   | alex-rivera      | shadow-abc          |  <-- transferred
| e2   | alex-rivera      | shadow-abc          |  <-- transferred
| e3   | jamie-smith      | NULL                |  <-- unchanged
+------+------------------+---------------------+

Claiming persona's profile (/p/alex-rivera):
+---------------------------------------------------------------------+
| Alex Rivera                                                         |
|                                                                     |
| Endorsements                                                        |
| +---------------------------------------------------------------+  |
| | (J) Jamie Smith  [colleague]  [Strong]                         |  |
| |     "Alex is one of the best frontend devs..."                 |  |
| +---------------------------------------------------------------+  |
| | (S) Sarah Chen   [mentor]     [Standard]                       |  |
| |     "Incredible eye for detail and design."                    |  |
| +---------------------------------------------------------------+  |
|                                                                     |
| * Includes endorsements from a claimed shadow profile               |
+---------------------------------------------------------------------+
```

### Component Hierarchy

No new UI components for endorsement transfer itself -- it is a server-side operation. The claiming persona's detail page (`app/(dashboard)/personas/[uri]/page.tsx`) and public page (`app/p/[uri]/persona-public-view.tsx`) already display endorsements via `getEndorsementsForPersona(personaUri)`. After transfer, the endorsements automatically appear because their `toPersonaUri` now matches the claiming persona's URI.

```
lib/db/queries.ts -> claimShadowPersona()           <-- EXISTS: handles transfer
  +-- UPDATE shadow_personas SET claimStatus, claimedByPersonaUri
  +-- UPDATE endorsements SET toPersonaUri WHERE toShadowPersonaId = shadowId
```

### Workflows & Stories

---

#### Workflow: System transfers endorsements during shadow claim

**Preconditions:**
- Shadow persona has one or more active endorsements (with `toShadowPersonaId = shadow.id`)
- User is performing an authenticated claim (not MVP public claim)

**Stories:**

**[4.1] Transfer all shadow endorsements to claiming persona**
> System redirects endorsements from the shadow to the claiming persona so that the claimant inherits all social proof.

- **User:** System operation triggered by `claimShadowAction`.
- **Functional:** When `claimShadowPersona(shadowId, claimingPersonaUri)` is called, it performs two updates: (a) sets `claimStatus = 'claimed'` and `claimedByPersonaUri = claimingPersonaUri` on the shadow, and (b) sets `toPersonaUri = claimingPersonaUri` on ALL endorsements where `toShadowPersonaId = shadowId`. The `toShadowPersonaId` column is NOT nulled out (preserved for audit trail). After transfer, endorsements are queryable via `getEndorsementsForPersona(claimingPersonaUri)`.
- **Technical:** Existing `claimShadowPersona` at `lib/db/queries.ts` lines 138-159. Two sequential updates (not transactional in current code -- enhancement wraps in transaction). First update: shadow row. Second update: endorsements batch update. The endorsements index `idx_endorsements_shadow` on `toShadowPersonaId` (from `lib/db/schema/endorsements.ts` line 37) covers the WHERE clause.
- **Acceptance criteria:**
  - [ ] All endorsements with `toShadowPersonaId = shadow.id` get `toPersonaUri` updated
  - [ ] `toShadowPersonaId` is preserved (not set to NULL)
  - [ ] `updatedAt` timestamp updated on transferred endorsements
  - [ ] Endorsements with `active = false` are also transferred (they remain inactive but point at the right persona)
  - [ ] Endorsements targeting other shadows are NOT affected
  - [ ] After transfer, `getEndorsementsForPersona(claimingPersonaUri)` returns the transferred endorsements
  - [ ] Shadow row updated atomically with endorsement transfer
- **Failure paths:**
  - If endorsement update fails: shadow claim should also roll back (transaction requirement)
  - If no endorsements exist for the shadow: claim still succeeds (zero rows updated is fine)

**[4.2] Wrap claim and transfer in a database transaction**
> System ensures claim and endorsement transfer are atomic so that partial failures do not leave inconsistent state.

- **User:** System operation.
- **Functional:** The shadow claim status update and endorsement transfer must both succeed or both fail. If the endorsement transfer fails after the shadow is marked as claimed, the shadow would be in a "claimed" state but endorsements would not be transferred -- an inconsistent state.
- **Technical:** Enhancement to `claimShadowPersona` in `lib/db/queries.ts`. Wrap both updates in `db.transaction(async (tx) => { ... })`. Use `tx.update()` instead of `db.update()` within the transaction.
- **Acceptance criteria:**
  - [ ] Both operations succeed or both roll back
  - [ ] If endorsement transfer fails, shadow status reverts to `'unclaimed'`
  - [ ] Transaction uses Drizzle's `db.transaction()` API
- **Failure paths:**
  - If transaction fails: error propagated to caller, shadow remains unclaimed

**[4.3] Display transferred endorsements on claiming persona**
> Claiming persona's profile shows the transferred endorsements so that the claimant has visible social proof.

- **User:** Any viewer of the claiming persona's profile.
- **Functional:** After endorsement transfer, the claiming persona's detail page and public page show the transferred endorsements alongside any endorsements that were directly given to the persona. There is no visual distinction between transferred and direct endorsements (they look the same). Optionally, a small footnote note: "Includes endorsements from a claimed shadow profile" can be shown when the persona has at least one endorsement with a non-null `toShadowPersonaId`.
- **Technical:** The existing `getEndorsementsForPersona(personaUri)` at `lib/db/queries.ts` lines 19-24 already queries by `toPersonaUri`. After transfer sets `toPersonaUri = claimingPersonaUri`, these endorsements are automatically included. No code change needed for basic display. Enhancement: query for `toShadowPersonaId IS NOT NULL` to detect transferred endorsements for the footnote.
- **Acceptance criteria:**
  - [ ] Transferred endorsements appear on the claiming persona's detail page
  - [ ] Transferred endorsements appear on the public page (`/p/{uri}`)
  - [ ] Endorsement display includes: endorser info, relationship type, strength, testimonial, context
  - [ ] No visual difference between transferred and direct endorsements
  - [ ] Optional: footnote when persona has transferred endorsements
- **Failure paths:**
  - None (read-only display)

**[4.4] Preserve endorsement history for audit**
> System preserves the `toShadowPersonaId` on transferred endorsements so that the endorsement origin is auditable.

- **User:** System / admin.
- **Functional:** After transfer, the `toShadowPersonaId` column retains the original shadow persona ID. This allows: (a) determining which endorsements came from shadow claims, (b) audit trails for trust verification, and (c) potential future features like "endorsed before they joined" badges.
- **Technical:** The current `claimShadowPersona` at `lib/db/queries.ts` line 155 only sets `toPersonaUri` and `updatedAt` -- it does NOT touch `toShadowPersonaId`. This is the correct behavior. The CHECK constraint `endorsement_target_check` allows both fields to be non-null (the constraint is `toPersonaUri IS NOT NULL OR toShadowPersonaId IS NOT NULL`, and after transfer both are non-null, which satisfies the OR).
- **Acceptance criteria:**
  - [ ] `toShadowPersonaId` unchanged after transfer
  - [ ] Endorsement row has both `toPersonaUri` and `toShadowPersonaId` set after transfer
  - [ ] CHECK constraint satisfied (both non-null satisfies OR condition)
  - [ ] Query for transferred endorsements possible via `WHERE toShadowPersonaId IS NOT NULL`
- **Failure paths:**
  - None (preservation is passive -- no action needed)

**Workflow success:** All endorsements on the shadow persona are transferred to the claiming persona atomically. They appear on the claiming persona's profile and are auditable via the preserved `toShadowPersonaId` field.

---

### Schema

No schema changes. Existing columns and constraints are sufficient:

```typescript
// Existing — lib/db/schema/endorsements.ts
endorsements = pgTable('endorsements', {
  // ...
  toPersonaUri: text('to_persona_uri').references(() => personas.uri),
  toShadowPersonaId: uuid('to_shadow_persona_id').references(() => shadowPersonas.id),
  // ...
}, (table) => [
  check('endorsement_target_check',
    sql`${table.toPersonaUri} IS NOT NULL OR ${table.toShadowPersonaId} IS NOT NULL`),
  index('idx_endorsements_shadow').on(table.toShadowPersonaId),
]);
```

The CHECK constraint allows both fields to be non-null (post-transfer state: `toPersonaUri = claimingUri` AND `toShadowPersonaId = shadowId`). The index on `toShadowPersonaId` covers the transfer update's WHERE clause.

### Server Actions

No new actions. Enhancement to existing query helper:

```typescript
// MODIFIED — lib/db/queries.ts claimShadowPersona()
// Wrap in transaction:

export async function claimShadowPersona(shadowId: string, claimingPersonaUri: string) {
  return db.transaction(async (tx) => {
    // 1. Update shadow status
    const [shadow] = await tx
      .update(shadowPersonas)
      .set({ claimStatus: 'claimed', claimedByPersonaUri: claimingPersonaUri, updatedAt: new Date() })
      .where(eq(shadowPersonas.id, shadowId))
      .returning();
    if (!shadow) throw new Error('Shadow persona not found');

    // 2. Transfer endorsements
    await tx
      .update(endorsements)
      .set({ toPersonaUri: claimingPersonaUri, updatedAt: new Date() })
      .where(eq(endorsements.toShadowPersonaId, shadowId));

    return shadow;
  });
}
```

### Validation

No new validation schemas. Transfer is triggered by the claim action which already validates the claim token and shadow status.

### Edge Cases

- [ ] Shadow has zero endorsements: claim succeeds, zero rows updated (no error)
- [ ] Shadow has endorsements from the same endorser who endorsed the claiming persona directly: both endorsements exist on the persona (no deduplication -- each endorsement is a separate event)
- [ ] Shadow has inactive endorsements (`active = false`): still transferred (inactive endorsements keep their inactive status but point to the right persona)
- [ ] Claiming persona is later deleted: endorsements become orphaned (handled by deletion cascade in spec 01, story 5.2 -- endorsements set `active = false` and `toPersonaUri = null`)
- [ ] Two shadows with endorsements claimed into the same persona: all endorsements from both shadows transfer, persona accumulates all endorsements
- [ ] Endorsement with `toPersonaUri` already set (shouldn't happen for shadow endorsements): UPDATE overwrites with claiming persona URI
- [ ] Transaction timeout with many endorsements: unlikely at MVP scale but the transaction ensures atomicity

### Test Criteria

**Unit tests:**
- None (transfer is a DB operation, tested via integration tests)

**Integration tests:**
- `claimShadowPersona` transfers 3 endorsements to claiming persona
- `claimShadowPersona` preserves `toShadowPersonaId` on transferred endorsements
- `claimShadowPersona` handles shadow with 0 endorsements gracefully
- Transaction rolls back both shadow and endorsement updates on failure
- After transfer, `getEndorsementsForPersona(claimingUri)` includes transferred endorsements
- After transfer, `getEndorsementsForShadow(shadowId)` still returns the endorsements (both fields set)

**E2E tests:**
- Create shadow, endorse it, claim it, verify endorsements appear on claiming persona's detail page
- Verify endorsements appear on claiming persona's public page (`/p/{uri}`)

### Implementation Order

1. Wrap `claimShadowPersona` in `db.transaction()` in `lib/db/queries.ts`
2. Add optional "transferred endorsement" footnote to persona detail page
3. Write integration tests for transactional endorsement transfer
4. Write E2E test for end-to-end shadow -> endorse -> claim -> verify endorsements flow

---

## 5. Expiry and Cleanup

### Overview

Shadow personas expire 90 days after creation if unclaimed. Expiry prevents stale shadows from cluttering community directories and ensures claim links do not remain active indefinitely. Expired shadows are still viewable (for endorsement context) but cannot be claimed. A periodic cleanup job can optionally archive or delete expired shadows after an additional grace period.

### Wireframe

```
Community directory -- expired shadow:
+---------------------------------------------------------------+
| Unclaimed Profiles in Portland DevOps Guild                    |
|                                                                |
| +-- Active --------------------------------------------------+ |
| | (A) Alex Rivera   [3 endorsements]  [Claim link >]         | |
| | (B) Blake Torres  [1 endorsement]   [Claim link >]         | |
| +------------------------------------------------------------+ |
|                                                                |
| +-- Expired -------------------------------------------------+ |
| | (C) Casey Kim     [2 endorsements]  [Expired]  [Resend?]   | |
| +------------------------------------------------------------+ |
+---------------------------------------------------------------+

Admin view -- expired shadow management:
+---------------------------------------------------------------+
| Shadow Personas — Cleanup                                      |
|                                                                |
| 12 expired shadows (oldest: 143 days ago)                      |
|                                                                |
| [x] Auto-archive shadows expired > 180 days                   |
|                                                                |
| [Archive Selected]  [Extend Expiry by 90 Days]                 |
+---------------------------------------------------------------+
```

### Component Hierarchy

```
lib/db/queries.ts                                    <-- MODIFIED: add expiry queries
  +-- getExpiredShadows(communityId)                 <-- NEW
  +-- extendShadowExpiry(shadowId, days)             <-- NEW
  +-- archiveExpiredShadows(olderThanDays)           <-- NEW

app/actions/shadows.ts                               <-- MODIFIED: add expiry actions
  +-- getExpiredShadowsAction(communityId)           <-- NEW
  +-- extendShadowExpiryAction(shadowId)             <-- NEW
  +-- cleanupExpiredShadowsAction()                  <-- NEW (admin/cron)
```

### Workflows & Stories

---

#### Workflow: System enforces shadow persona expiry

**Preconditions:**
- Shadow persona exists with `expiresAt` timestamp set
- Current time may be before or after the `expiresAt` timestamp

**Stories:**

**[5.1] Prevent claim of expired shadows**
> System rejects claim attempts on expired shadows so that stale profiles cannot be claimed.

- **User:** Visitor attempting to claim an expired shadow.
- **Functional:** Both claim paths (MVP public and authenticated) check `expiresAt` before allowing a claim. If `shadow.expiresAt < new Date()`, the claim is rejected with "This claim link has expired." The shadow display page (`/s/{id}`) shows an "Expired" badge and hides the claim CTA. The claim page (`/claim/{token}`) shows a "Claim Link Not Found" error (since `getShadowByTokenPublic` returns null or an expired state).
- **Technical:** Expiry is checked in three places:
  1. `assertCanClaimShadow` at `lib/auth/permissions.ts` lines 315-317: `if (shadow.expiresAt && shadow.expiresAt < new Date()) throw`
  2. `submitPublicClaim` at `app/actions/shadows.ts` lines 204-206: `if (shadow.expiresAt && new Date(shadow.expiresAt) < new Date()) throw`
  3. Shadow display page enhancement: `isExpired` check
- **Acceptance criteria:**
  - [ ] Authenticated claim rejected for expired shadow with clear error message
  - [ ] Public claim rejected for expired shadow with clear error message
  - [ ] Shadow display page shows "Expired" badge
  - [ ] Shadow display page hides claim CTA
  - [ ] Claim page shows expired/not-found state
  - [ ] Expiry check uses server time (not client time) for consistency
- **Failure paths:**
  - If `expiresAt` is null: shadow never expires (claim allowed regardless of age)

**[5.2] List expired shadows in community directory**
> Community admin sees which shadows have expired so that they can decide to extend or clean up.

- **User:** Community admin viewing the community's shadow persona list.
- **Functional:** The unclaimed shadows list (from `getUnclaimedShadowsAction`) is partitioned into "Active" (not expired) and "Expired" (past expiry). Expired shadows show an "Expired" badge and optionally a "Resend?" button that extends the expiry by 90 days and regenerates the claim link. The count of expired shadows is shown.
- **Technical:** New query helper `getExpiredShadows(communityId)` in `lib/db/queries.ts`. Filters by `claimStatus = 'unclaimed'` AND `expiresAt < now`. New action `getExpiredShadowsAction(communityId)` in `app/actions/shadows.ts` checks community membership.
- **Acceptance criteria:**
  - [ ] Active and expired shadows shown in separate sections
  - [ ] Expired shadows show "Expired" badge
  - [ ] Expired shadow count displayed
  - [ ] Community membership checked before listing
  - [ ] Expired shadows sorted by expiry date (most recently expired first)
- **Failure paths:**
  - If no expired shadows: "Expired" section hidden

**[5.3] Extend shadow persona expiry**
> Community member extends an expired shadow's claim window so that the intended recipient gets more time to claim.

- **User:** Authenticated community member (the shadow's creator or a community admin).
- **Functional:** Clicking "Resend?" or "Extend Expiry" on an expired shadow sets a new `expiresAt` 90 days from the current time. The claim token remains the same (the URL does not change). The shadow's `claimStatus` remains `'unclaimed'`. An activity event is logged. Optionally, `inviteSentVia` and `inviteSentAt` are updated if the user re-shares the link.
- **Technical:** New query helper `extendShadowExpiry(shadowId: string, days: number)` in `lib/db/queries.ts`. Updates `expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)` and `updatedAt`. New action `extendShadowExpiryAction(shadowId: string)` in `app/actions/shadows.ts` validates the user is the shadow's creator or a community admin.
- **Acceptance criteria:**
  - [ ] `expiresAt` updated to 90 days from now
  - [ ] `claimToken` unchanged (same URL still works)
  - [ ] `claimStatus` unchanged (still `'unclaimed'`)
  - [ ] Only shadow creator or community admin can extend
  - [ ] Activity event logged with type `shadow_extended`
  - [ ] Toast: "Claim link extended for 90 days"
- **Failure paths:**
  - If shadow is already claimed: extension not allowed ("Shadow is already claimed")
  - If user is not creator or admin: authorization error

**[5.4] Periodic cleanup of long-expired shadows**
> System archives shadows that have been expired for 180+ days so that stale data does not accumulate.

- **User:** System (cron job or admin action).
- **Functional:** Shadows that expired more than 180 days ago (i.e., were created 270+ days ago and never claimed) can be archived. Archiving sets a flag or deletes the row. Endorsements on archived shadows are preserved (they have `toShadowPersonaId` set but the shadow row may no longer exist -- the FK is nullable in practice since we can SET NULL before delete). For MVP, this is a manual admin action. Post-MVP, a cron job (Vercel Cron or similar) runs daily.
- **Technical:** New query helper `archiveExpiredShadows(olderThanDays: number)` in `lib/db/queries.ts`. Deletes shadows WHERE `claimStatus = 'unclaimed'` AND `expiresAt < now - olderThanDays`. Before deleting, sets `toShadowPersonaId = NULL` on any endorsements pointing at the shadow (to avoid FK violations). New action `cleanupExpiredShadowsAction()` in `app/actions/shadows.ts` -- admin-only.
- **Acceptance criteria:**
  - [ ] Shadows expired > 180 days are deleted
  - [ ] Endorsements on deleted shadows have `toShadowPersonaId` set to NULL
  - [ ] Endorsements on deleted shadows are set `active = false` (since neither target field has a value)
  - [ ] Claimed shadows are never archived (regardless of age)
  - [ ] Active (non-expired) shadows are never archived
  - [ ] Cleanup is idempotent (running twice does not error)
  - [ ] Count of archived shadows returned for logging
- **Failure paths:**
  - If endorsement cleanup fails: shadow deletion skipped (transaction ensures atomicity)
  - If no shadows qualify: returns count 0, no error

**Workflow success:** Expired shadows are prevented from being claimed, visible in community directories with expired status, extendable by the creator, and eventually cleaned up after a grace period.

---

### Schema

No schema changes. Uses existing columns:

- `shadow_personas.expiresAt` -- already a `timestamp` column, set to `Date.now() + 90 days` on creation
- `shadow_personas.claimStatus` -- `'unclaimed'` / `'claimed'`

### Server Actions

```typescript
// NEW — add to app/actions/shadows.ts

export async function getExpiredShadowsAction(communityId: string): Promise<ShadowPersona[]>
// Authenticated user required. Checks community membership.
// Returns unclaimed shadows where expiresAt < now.

export async function extendShadowExpiryAction(shadowId: string): Promise<ShadowPersona>
// Authenticated user required. Must be shadow creator or community admin.
// Extends expiresAt by 90 days from now. Logs shadow_extended activity.

export async function cleanupExpiredShadowsAction(): Promise<{ archivedCount: number }>
// Admin required. Deletes unclaimed shadows expired > 180 days.
// Cleans up endorsement FK references before deletion.
```

### Validation

```typescript
// Addition to lib/validations/shadows.ts

export const extendExpirySchema = z.object({
  shadowId: z.string().uuid('Invalid shadow ID'),
});

export type ExtendExpiryInput = z.infer<typeof extendExpirySchema>;
```

### Edge Cases

- [ ] Shadow with `expiresAt = null`: never expires, never appears in expired list, never cleaned up
- [ ] Shadow exactly at expiry boundary (expiresAt === now): treated as expired (`<` comparison)
- [ ] Shadow extended multiple times: each extension adds 90 days from the current moment (not from previous expiry)
- [ ] Shadow expired but has active endorsements: endorsements visible on shadow display page but claim CTA hidden
- [ ] Cleanup run during active claim: transaction prevents race condition (if shadow is claimed between check and delete, the WHERE clause no longer matches)
- [ ] Timezone differences: all timestamps are UTC in the database, server-side checks use `new Date()` which is UTC

### Migration Notes

No schema migration needed. The `expiresAt` column and `claimStatus` column already exist. The 90-day default is set in application code (`lib/db/queries.ts` line 104), not as a database default.

### Test Criteria

**Unit tests:**
- Expiry check: `new Date('2026-01-01') < new Date('2026-04-01')` returns true (expired)
- Expiry check: `null` expiresAt returns false (not expired)

**Integration tests:**
- `getExpiredShadows` returns only unclaimed, expired shadows in the specified community
- `getExpiredShadows` does not return claimed shadows even if past expiresAt
- `extendShadowExpiry` updates expiresAt to 90 days from now
- `extendShadowExpiry` preserves claimToken
- `archiveExpiredShadows(180)` deletes shadows expired > 180 days ago
- `archiveExpiredShadows` nulls out endorsement FK before deletion
- `archiveExpiredShadows` does not touch claimed shadows

**E2E tests:**
- View expired shadow at `/s/{id}`: verify "Expired" badge, no claim CTA
- Attempt to claim expired shadow: verify rejection message
- Extend expired shadow: verify new expiry date, claim link works again

### Implementation Order

1. Add `getExpiredShadows` query helper to `lib/db/queries.ts`
2. Add `extendShadowExpiry` query helper to `lib/db/queries.ts`
3. Add `archiveExpiredShadows` query helper with endorsement cleanup to `lib/db/queries.ts`
4. Add `getExpiredShadowsAction`, `extendShadowExpiryAction`, `cleanupExpiredShadowsAction` to `app/actions/shadows.ts` (requires steps 1-3)
5. Add expired state to shadow display page `app/s/[id]/page.tsx` (same as feature 2, step 1)
6. Add expired shadow section to community shadow list UI
7. Write integration tests for expiry query helpers
8. Write E2E test for expiry display and extension flow

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Create shadow persona dialog component for community page | `personas`, `shadows`, `ux` | -- | -- |
| 1.2 | Implement shadow persona creation with claim token generation | `personas`, `shadows`, `creation` | 1.1 | -- |
| 1.3 | Build shareable claim link component with copy-to-clipboard | `personas`, `shadows`, `ux` | 1.2 | -- |
| 1.4 | Support endorsing shadow personas at creation time | `personas`, `shadows`, `endorsements` | 1.2 | -- |
| 2.1 | Render shadow persona display page with traits and endorsements | `personas`, `shadows`, `display` | -- | -- |
| 2.2 | Display claim CTA on unclaimed shadow persona pages | `personas`, `shadows`, `display` | 2.1 | -- |
| 2.3 | Handle expired shadow persona display state | `personas`, `shadows`, `display`, `expiry` | 2.1 | -- |
| 3.1 | Validate claim token and render claim page states | `personas`, `shadows`, `claim` | -- | -- |
| 3.2 | Implement claim flow step 1 welcome preview | `personas`, `shadows`, `claim`, `ux` | 3.1 | -- |
| 3.3 | Implement claim flow step 2 MVP identity verification | `personas`, `shadows`, `claim` | 3.2 | -- |
| 3.4 | Implement claim flow step 3 success with sign-up prompts | `personas`, `shadows`, `claim`, `ux` | 3.3 | -- |
| 3.5 | Implement authenticated claim with persona selection and endorsement transfer | `personas`, `shadows`, `claim`, `endorsements` | 3.3 | -- |
| 3.6 | Build shadow trait adoption UI for authenticated claim | `personas`, `shadows`, `claim`, `traits` | 3.5 | -- |
| 4.1 | Transfer shadow endorsements to claiming persona on claim | `personas`, `shadows`, `endorsements`, `data-integrity` | 3.5 | -- |
| 4.2 | Wrap claim and endorsement transfer in database transaction | `personas`, `shadows`, `data-integrity` | 4.1 | -- |
| 4.3 | Display transferred endorsements on claiming persona profile | `personas`, `shadows`, `endorsements`, `display` | 4.1 | -- |
| 4.4 | Preserve endorsement audit trail via toShadowPersonaId | `personas`, `shadows`, `endorsements`, `data-integrity` | 4.1 | -- |
| 5.1 | Prevent claim of expired shadow personas | `personas`, `shadows`, `expiry` | -- | -- |
| 5.2 | List expired shadows in community directory | `personas`, `shadows`, `expiry`, `ux` | 5.1 | -- |
| 5.3 | Implement shadow persona expiry extension | `personas`, `shadows`, `expiry` | 5.1 | -- |
| 5.4 | Implement periodic cleanup of long-expired shadows | `personas`, `shadows`, `expiry`, `cleanup` | 5.1 | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `3.5` = feature 3, story 5)
- Issue titles are imperative: "Implement authenticated claim with persona selection" not "User claims shadow"
- Labels include the spec suite (`personas`) and feature area (`shadows`, `claim`, `endorsements`, `expiry`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
