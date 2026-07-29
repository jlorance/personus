---
type: spec
title: "Identity & Personas -- Cross-Persona Linking"
description: "This spec covers the opt-in cross-persona linking system: how a user voluntarily reveals that two of their personas belong to the same person, scoped to a specific community. Links are stored in…"
status: planned
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Cross-Persona Linking

> Date: 2026-02-23
> Status: Planned
> Depends on: `00-prd.md`, `01-persona-lifecycle.md`, `04-persona-visibility.md`, `docs/foundation/authorization.md`, `docs/specs/communities/guilds-prd.md`
> Primary actors: User (authenticated persona owner), Viewer (community member viewing linked personas), CO (community organizer/admin)

This spec covers the opt-in cross-persona linking system: how a user voluntarily reveals that two of their personas belong to the same person, scoped to a specific community. Links are stored in `community_members.memberTraits.linkedPersonas` (JSONB) and are only visible to members of the community where the link was created. This is the most advanced feature in the Identity & Personas suite -- a relatively simple data model (no new tables, just a JSONB field) with a complex permission model that interacts with persona visibility, community membership, and the core unlinkability principle.

---

## 1. Linking Model

### Overview

Cross-persona linking is an explicit, voluntary disclosure where a persona owner says: "In this community, I want people to know about my other persona." By default, personas owned by the same user are unlinkable -- no one can tell they belong to the same person. Linking is the controlled exception. The owner creates the link; the system enforces the boundary. A link is always community-scoped: it exists only within a single community's context and is invisible outside that community.

### Wireframe

```
Community Member Directory — Iron Oak Gym
┌──────────────────────────────────────────────────────────────────────┐
│ Members (24)                                          [Search...]    │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [MR] Maria Rodriguez                                             │ │
│ │      Powerlifting Coach & Competitor                              │ │
│ │                                                                  │ │
│ │      Also in this community as:                                  │ │
│ │      ┌──────────────────────────────────────────────────────┐    │ │
│ │      │ [MR] Product Designer — "Happy to chat about UX or  │    │ │
│ │      │      startup ideas"                           [View] │    │ │
│ │      └──────────────────────────────────────────────────────┘    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [JS] Jamie Smith                                                 │ │
│ │      Full-stack engineer                                         │ │
│ │      (no linked personas)                                        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

Link Visibility States:
┌──────────────────────────────────────────────────┐
│ FULL — viewer can see target persona:            │
│ "Also in this community as:"                     │
│ [MR] Product Designer — "Happy to chat..." [View]│
├──────────────────────────────────────────────────┤
│ LABEL-ONLY — target is auth'd, viewer is anon:   │
│ "Also in this community as:"                     │
│ [MR] Product Designer (no clickable link)        │
├──────────────────────────────────────────────────┤
│ SUPPRESSED — target is private or unreachable:   │
│ (nothing rendered — link invisible)              │
├──────────────────────────────────────────────────┤
│ DEAD REFERENCE — target persona deleted:         │
│ (nothing rendered — stale link suppressed)        │
└──────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Community member profile/directory view (context-dependent)
  └─ components/linked-personas-display.tsx           ← NEW: Client Component
       ├─ components/ui/card.tsx                      ← EXISTS
       ├─ components/ui/avatar.tsx                    ← EXISTS
       ├─ components/ui/badge.tsx                     ← EXISTS
       └─ calls:
            ├─ app/actions/personas.ts → getViewablePersona()  ← EXISTS
            └─ lib/auth/permissions.ts → resolveLinkedPersonaVisibility()  ← EXISTS (enhance)
```

The `linked-personas-display.tsx` component receives a list of `linkedPersonas` entries from the community member's `memberTraits` JSONB, resolves each target persona's visibility for the current viewer, and renders the appropriate state (full, label-only, suppressed).

### Workflows & Stories

---

#### Workflow: Viewer sees linked personas in a community directory

**Preconditions:**
- Viewer is a member of the community
- At least one community member has linked personas in their `memberTraits`
- Viewer is viewing the community directory or a member profile within the community

**Stories:**

**[1.1] Render linked persona references on community member profiles**
> Viewer sees "Also in this community as: [persona name]" on a member profile so that they can discover another facet of that person.

- **User:** Authenticated community member viewing the directory or a member profile.
- **Functional:** When a community member's `memberTraits.linkedPersonas` array is non-empty, each linked persona is resolved against the viewer's permissions. For each link, the system fetches the target persona and determines the visibility level: `full` (show name + label + note + clickable link to `/p/{uri}`), `label-only` (show label text but no clickable link), or `suppressed` (render nothing). Links are displayed in a "Also in this community as:" section on the member card. Multiple links are stacked vertically.
- **Technical:** New `components/linked-personas-display.tsx`. Receives `linkedPersonas: LinkedPersona[]` from parent. For each entry, calls a server action `resolveLinkedPersonas(personaUris: string[])` (batched) that returns visibility data. Uses `resolveLinkedPersonaVisibility()` from `packages/auth/src/permissions.ts` (the implementation design lives in the archived `docs/foundation/_archive/authorization.2026-04-12.md` §Implementation Guidance §Multi-Step Orchestration Functions). The `[View]` link navigates to `/p/{personaUri}`.
- **Acceptance criteria:**
  - [ ] "Also in this community as:" section renders when linkedPersonas is non-empty
  - [ ] Each link shows the target persona's display name and the owner-set label
  - [ ] Optional note text renders below the label if present
  - [ ] Full-visibility links include a clickable "[View]" or link to `/p/{uri}`
  - [ ] Label-only links show text but no clickable navigation
  - [ ] Suppressed links render nothing (no "hidden" indicator)
  - [ ] Multiple links stack vertically with consistent spacing
  - [ ] Section hidden entirely when all links are suppressed
- **Failure paths:**
  - If target persona fetch fails (network error): suppress that link, render remaining
  - If viewer is not a community member: entire linked section hidden (standard community auth)

**[1.2] Resolve linked persona visibility based on target persona's visibility level**
> System evaluates each linked persona against the viewer's permissions so that privacy rules are enforced consistently.

- **User:** System (automated, runs on each view).
- **Functional:** Visibility resolution follows the cross-persona linking authz rules (originally in `docs/foundation/authorization.md` §Cross-Persona Linking, archived at `docs/foundation/_archive/authorization.2026-04-12.md` §6 — the live content lives in this feature spec):
  - Target visibility `public`: show full link to any viewer
  - Target visibility `authenticated`: show full link if viewer is authenticated, label-only if anonymous
  - Target visibility `community`: show full link only if viewer is a member of a community the target persona belongs to (can be a different community)
  - Target visibility `private`: suppress entirely
  - Target persona deleted or not found: suppress entirely
- **Technical:** Enhances `resolveLinkedPersonaVisibility()` in `lib/auth/permissions.ts` (line 1355 of doc 09). Current implementation is a pure function taking `(ability, link, targetPersona)`. For the `community` visibility case, the function needs the viewer's community memberships to check shared community overlap. The `AppAbility` instance already encodes community membership context via `buildAbilityContext()`. New server-side helper `resolveLinkedPersonasForViewer(viewerUserId, linkedPersonas)` in `app/actions/communities.ts` fetches target personas and calls the permission function.
- **Acceptance criteria:**
  - [ ] Public target persona returns `full` for any community member
  - [ ] Authenticated target persona returns `full` for auth'd viewer, `label-only` for anonymous
  - [ ] Community target persona returns `full` only if viewer shares a community with target
  - [ ] Private target persona returns `suppressed` always
  - [ ] Deleted target persona returns `suppressed`
  - [ ] Resolution never leaks existence of private/unreachable personas
- **Failure paths:**
  - If ability context build fails: suppress all links (fail-closed)

**Workflow success:** Community members see appropriate linked persona disclosures on member profiles, with visibility correctly enforced per the target persona's settings.

---

### Schema

No new tables. Cross-persona links are stored in the existing `community_members.memberTraits` JSONB column. The schema is defined by convention, not by a Drizzle column definition.

```typescript
// Shape of linkedPersonas within community_members.memberTraits
// Stored at: community_members.member_traits -> 'linkedPersonas'

interface LinkedPersona {
  /** URI of the target persona being linked to (must be owned by the same user) */
  personaUri: string;
  /** Short display label chosen by the owner (free text, max 100 chars) */
  label: string;
  /** Optional context note ("Ask me about...", "Available for freelance") */
  note?: string;
  /** ISO timestamp when the link was created */
  linkedAt: string;
}

// Full memberTraits shape (extends existing community type schema):
interface MemberTraitsWithLinks {
  // ... existing member traits per community_types.memberTraitSchema ...
  linkedPersonas?: LinkedPersona[];
}
```

**Existing schema reference** (`lib/db/schema/communities.ts` line 103):
```typescript
memberTraits: jsonb('member_traits').notNull().default('{}'),
```

No migration needed -- the JSONB column already exists and accepts any shape. `linkedPersonas` is a new key within the existing JSONB.

### Server Actions

```typescript
// NEW actions — add to app/actions/communities.ts

linkPersonaInCommunity(input: {
  communityId: string;
  sourceMembershipId: string;   // the community_members row where the link lives
  targetPersonaUri: string;     // the persona to link to
  label: string;                // display label
  note?: string;                // optional context
}): Promise<{ success: boolean }>
// Authenticated user required. Owner of BOTH the membership's persona AND the target persona.
// Appends a LinkedPersona entry to community_members.memberTraits.linkedPersonas.

unlinkPersonaInCommunity(input: {
  communityId: string;
  sourceMembershipId: string;
  targetPersonaUri: string;
}): Promise<{ success: boolean }>
// Authenticated user required. Owner of the membership.
// Removes the matching LinkedPersona entry from memberTraits.linkedPersonas.

updatePersonaLink(input: {
  communityId: string;
  sourceMembershipId: string;
  targetPersonaUri: string;
  label?: string;
  note?: string;
}): Promise<{ success: boolean }>
// Authenticated user required. Owner of the membership.
// Updates label/note on an existing link.

resolveLinkedPersonasForViewer(input: {
  viewerUserId: string | null;
  linkedPersonas: LinkedPersona[];
}): Promise<Array<{ personaUri: string; visibility: 'full' | 'label-only' | 'suppressed'; displayName?: string; label: string; note?: string }>>
// Batched resolution of linked persona visibility for a specific viewer.
// Fetches target personas, evaluates visibility, returns render-ready data.
```

### Validation

```typescript
// NEW — add to lib/validations/communities.ts

import { z } from 'zod';

export const linkedPersonaSchema = z.object({
  personaUri: z.string().min(1, 'Persona URI is required'),
  label: z.string().min(1, 'Label is required').max(100, 'Label must be 100 characters or fewer'),
  note: z.string().max(300, 'Note must be 300 characters or fewer').optional(),
});

export const linkPersonaInputSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  sourceMembershipId: z.string().uuid('Invalid membership ID'),
  targetPersonaUri: z.string().min(1, 'Target persona URI is required'),
  label: z.string().min(1, 'Label is required').max(100, 'Label must be 100 characters or fewer'),
  note: z.string().max(300, 'Note must be 300 characters or fewer').optional(),
});

export type LinkPersonaInput = z.infer<typeof linkPersonaInputSchema>;

export const unlinkPersonaInputSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  sourceMembershipId: z.string().uuid('Invalid membership ID'),
  targetPersonaUri: z.string().min(1, 'Target persona URI is required'),
});

export type UnlinkPersonaInput = z.infer<typeof unlinkPersonaInputSchema>;

export const updatePersonaLinkInputSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  sourceMembershipId: z.string().uuid('Invalid membership ID'),
  targetPersonaUri: z.string().min(1, 'Target persona URI is required'),
  label: z.string().min(1).max(100).optional(),
  note: z.string().max(300).optional(),
});

export type UpdatePersonaLinkInput = z.infer<typeof updatePersonaLinkInputSchema>;
```

### Edge Cases

- [ ] Target persona is deleted after link is created: link becomes a dead reference; display component suppresses it (renders nothing)
- [ ] Target persona changes visibility to `private` after link is created: link is silently suppressed for all viewers; `linkedPersonas` entry remains in JSONB but is not rendered
- [ ] Target persona changes visibility back from `private` to `public`: link reappears automatically (no action needed from owner)
- [ ] User tries to link to a persona they do not own: server action rejects with ownership check failure
- [ ] User tries to link to the same persona that is already linked: server action checks for duplicates, returns error "This persona is already linked"
- [ ] User is not a member of the community: server action rejects via `assertInCommunity()` check
- [ ] Community membership `visible: false` (hidden member): linked personas follow the same visibility -- hidden members' links are not shown to other members, but are shown to community admins
- [ ] User has 10+ personas and links all of them: no hard limit on link count, but UI should handle gracefully with scrollable list
- [ ] Concurrent link/unlink operations: JSONB update uses atomic `jsonb_set` or read-modify-write with optimistic concurrency; last write wins for MVP

### Test Criteria

**Unit tests:**
- `resolveLinkedPersonaVisibility()` returns `full` for public target persona
- `resolveLinkedPersonaVisibility()` returns `label-only` for authenticated target + unauthenticated viewer
- `resolveLinkedPersonaVisibility()` returns `suppressed` for private target persona
- `resolveLinkedPersonaVisibility()` returns `suppressed` for null (deleted) target persona
- `resolveLinkedPersonaVisibility()` returns `suppressed` for community target when viewer does not share a community
- `resolveLinkedPersonaVisibility()` returns `full` for community target when viewer shares a community

**Integration tests:**
- `linkPersonaInCommunity()` appends entry to `memberTraits.linkedPersonas`
- `unlinkPersonaInCommunity()` removes entry from `memberTraits.linkedPersonas`
- `linkPersonaInCommunity()` rejects when user does not own target persona
- `resolveLinkedPersonasForViewer()` returns correct visibility for mixed-visibility targets

**E2E tests:**
- Community directory: member with linked persona shows "Also in this community as:" section
- Community directory: linked persona with private visibility does not render
- Manage links page: user adds a link, verifies it appears in community directory
- Manage links page: user removes a link, verifies it disappears from directory

### Implementation Order

1. Add `linkedPersonaSchema`, `linkPersonaInputSchema`, `unlinkPersonaInputSchema`, and `updatePersonaLinkInputSchema` to `lib/validations/communities.ts`
2. Implement `linkPersonaInCommunity()`, `unlinkPersonaInCommunity()`, and `updatePersonaLink()` server actions in `app/actions/communities.ts` (requires step 1)
3. Implement `resolveLinkedPersonasForViewer()` server action leveraging `resolveLinkedPersonaVisibility()` from `lib/auth/permissions.ts` (requires step 2)
4. Create `components/linked-personas-display.tsx` (requires step 3)
5. Integrate `linked-personas-display.tsx` into community member profile / directory views
6. Write unit tests for `resolveLinkedPersonaVisibility()` and validation schemas
7. Write integration tests for link/unlink server actions
8. Write E2E test for linked persona display in community directory

---

## 2. Link Management UI

### Overview

The link management UI lets persona owners create, edit, and remove cross-persona links within their community memberships. This is accessed from the community membership settings or from a "Manage Links" option on the persona detail page when the persona belongs to a community. The UI shows which personas are linked in which communities, and provides controls to add new links or remove existing ones.

### Wireframe

```
Manage Linked Personas — Iron Oak Gym
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to Community                                                  │
│                                                                      │
│ Linked Personas                                                      │
│ Other members of Iron Oak Gym can see that these personas             │
│ belong to the same person.                                           │
│                                                                      │
│ ─── Currently Linked ────────────────────────────────────────────── │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [MR] Maria Pro — Product Designer                                │ │
│ │      "Happy to chat about UX or startup ideas"                   │ │
│ │      Linked Feb 15, 2026                                         │ │
│ │                                       [Edit Label]  [Unlink]     │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ─── Available Personas ──────────────────────────────────────────── │
│ These are your other personas that are not yet linked here.          │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [MR] Maria Freelance — UX Consultant                             │ │
│ │      Visibility: authenticated                                   │ │
│ │                                                        [+ Link]  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [MR] Maria Draft — (Private)                                     │ │
│ │      Visibility: private                                         │ │
│ │      Cannot link — private personas cannot be linked     [----]  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ─── Empty State ──────────────────────────────────────────────────  │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ No linked personas yet.                                          │ │
│ │ Linking lets other members know about your other roles.          │ │
│ │ You control which personas are linked and can unlink at any time.│ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

Link Dialog (triggered by [+ Link]):
┌──────────────────────────────────────────────────────────────────────┐
│ Link Persona in Iron Oak Gym                                    [X] │
│                                                                      │
│ Linking lets other community members see that your gym persona       │
│ and this persona belong to the same person.                          │
│                                                                      │
│ Persona: Maria Pro — Product Designer                                │
│                                                                      │
│ Display label *                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Product Designer                                                 │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ This is what community members will see. Doesn't have to match       │
│ the persona's headline.                                              │
│                                                                      │
│ Note (optional)                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Happy to chat about UX or startup ideas                          │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ Additional context for community members.                            │
│                                                                      │
│                                       [Cancel]  [Link Persona]       │
└──────────────────────────────────────────────────────────────────────┘

Unlink Confirmation:
┌──────────────────────────────────────────────────────────────────────┐
│ Unlink Persona                                                  [X] │
│                                                                      │
│ This will remove the link between your gym persona and               │
│ "Maria Pro" in Iron Oak Gym. Other members will no longer            │
│ see the connection.                                                  │
│                                                                      │
│ This can be re-linked at any time.                                   │
│                                                                      │
│                                        [Cancel]  [Unlink]            │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/communities/[slug]/members/[membershipId]/links/page.tsx  ← NEW: Server Component
  └─ components/manage-linked-personas.tsx              ← NEW: Client Component ("use client")
       ├─ components/linked-persona-card.tsx            ← NEW: shows linked persona with edit/unlink
       ├─ components/available-persona-card.tsx         ← NEW: shows linkable persona with [+ Link]
       ├─ components/link-persona-dialog.tsx            ← NEW: label + note form
       │    ├─ components/ui/dialog.tsx                 ← EXISTS
       │    ├─ components/ui/input.tsx                  ← EXISTS
       │    └─ components/ui/textarea.tsx               ← EXISTS
       ├─ components/unlink-confirm-dialog.tsx          ← NEW: unlink confirmation
       │    └─ components/ui/dialog.tsx                 ← EXISTS
       └─ calls:
            ├─ app/actions/personas.ts → listPersonas()           ← EXISTS
            ├─ app/actions/communities.ts → linkPersonaInCommunity()    ← NEW (from feature 1)
            ├─ app/actions/communities.ts → unlinkPersonaInCommunity()  ← NEW (from feature 1)
            └─ app/actions/communities.ts → updatePersonaLink()         ← NEW (from feature 1)
```

### Workflows & Stories

---

#### Workflow: User creates a cross-persona link in a community

**Preconditions:**
- User is authenticated
- User has at least 2 personas
- User is a member of at least one community
- User is viewing their community membership settings

**Stories:**

**[2.1] View current links and available personas for a community membership**
> User opens the link management page so that they can see which personas are linked and which are available to link.

- **User:** Authenticated user who is a community member.
- **Functional:** Page shows two sections: "Currently Linked" (existing links from `memberTraits.linkedPersonas`) and "Available Personas" (user's other personas not yet linked in this community). Each currently-linked entry shows the target persona's display name, the owner-set label, the note (if any), and the date linked. Each available persona shows the display name, headline, and visibility level. Private personas are shown with a "Cannot link -- private personas cannot be linked" message and a disabled link button.
- **Technical:** Server component fetches: (1) community membership via `communityMembers` where `id = membershipId AND userId = currentUser`, (2) all user personas via `listPersonas()`. Client component computes the difference between all personas and already-linked personas. The current persona (the one used in this community membership) is excluded from the available list (you cannot link a persona to itself). Private personas are shown but disabled.
- **Acceptance criteria:**
  - [ ] "Currently Linked" section shows all linked personas with label, note, and linked date
  - [ ] "Available Personas" section shows unlinked personas owned by the user
  - [ ] The persona used in this membership is excluded from the available list
  - [ ] Private personas are shown but with disabled link button and explanation text
  - [ ] Empty state renders when no links exist
  - [ ] Persona avatar, display name, and headline are shown for each card
- **Failure paths:**
  - If membership not found or not owned: redirect to community page
  - If user has only 1 persona: "Available Personas" section shows empty state with "Create another persona to link here"

**[2.2] Create a new cross-persona link**
> User links one of their other personas in this community so that other members can discover their other role.

- **User:** Authenticated user with 2+ personas, viewing the link management page.
- **Functional:** User clicks "[+ Link]" on an available persona. A dialog opens with:
  - Persona name (read-only, for confirmation)
  - Display label (text input, required, max 100 chars, pre-filled with the target persona's headline)
  - Note (textarea, optional, max 300 chars)
  - Privacy explanation: "Other members of [community name] will see this link."
  - [Cancel] and [Link Persona] buttons.

  On submit, calls `linkPersonaInCommunity()`. On success: dialog closes, toast "Persona linked", persona moves from "Available" to "Currently Linked" section. Activity event logged.
- **Technical:** `components/link-persona-dialog.tsx` renders a `Dialog` with form fields. Validates with `linkPersonaInputSchema`. On submit, calls server action. Server action:
  1. Validates input with Zod
  2. Verifies user owns the membership's persona (via `community_members.userId = currentUser`)
  3. Verifies user owns the target persona (via `personas.userId = currentUser AND personas.uri = targetPersonaUri`)
  4. Verifies target persona is not `private` visibility
  5. Verifies target persona is not already linked (no duplicate `personaUri` in `linkedPersonas`)
  6. Reads current `memberTraits`, appends to `linkedPersonas` array, writes back via JSONB update
  7. Logs activity event type `membership.link_created`
- **Acceptance criteria:**
  - [ ] Dialog opens with target persona name and pre-filled label
  - [ ] Label is required; submit button disabled when empty
  - [ ] Note is optional
  - [ ] Label max 100 characters enforced
  - [ ] Note max 300 characters enforced
  - [ ] On success, linked persona moves to "Currently Linked" section
  - [ ] Toast notification "Persona linked"
  - [ ] Activity event logged with type `membership.link_created`
  - [ ] Private personas cannot be linked (button disabled, server-side rejection as fallback)
  - [ ] Duplicate link prevented (same persona URI in same community)
- **Failure paths:**
  - If user does not own target persona: server rejects with "You do not own this persona"
  - If target persona is private: server rejects with "Private personas cannot be linked"
  - If target is already linked: server rejects with "This persona is already linked in this community"
  - If community membership not found: server rejects with "Membership not found"

**[2.3] Edit a linked persona's label or note**
> User updates the display label or note on an existing link so that they can change how the link is presented.

- **User:** Authenticated user viewing the link management page with existing links.
- **Functional:** User clicks "[Edit Label]" on a currently-linked persona. An inline edit form (or dialog) appears with the current label and note pre-populated. User modifies and saves. Calls `updatePersonaLink()`. On success: inline update, toast "Link updated".
- **Technical:** `components/linked-persona-card.tsx` has an edit mode toggled by the "[Edit Label]" button. Uses the same form fields as the link dialog (label + note). Validates with `updatePersonaLinkInputSchema`. Server action reads `memberTraits`, finds the matching `linkedPersonas` entry by `personaUri`, updates `label` and `note`, writes back.
- **Acceptance criteria:**
  - [ ] Edit mode shows current label and note in editable fields
  - [ ] Saving updates the label/note in the JSONB
  - [ ] Toast notification "Link updated"
  - [ ] Cancel reverts to display mode without saving
- **Failure paths:**
  - If link no longer exists (concurrent unlink): error message, page refreshes

**[2.4] Remove a cross-persona link (unlink)**
> User removes a link so that other community members can no longer see the connection.

- **User:** Authenticated user viewing the link management page with existing links.
- **Functional:** User clicks "[Unlink]" on a currently-linked persona. A confirmation dialog appears explaining what will happen: "This will remove the link between your [source persona] and '[target label]' in [community name]. Other members will no longer see the connection. This can be re-linked at any time." User confirms with [Unlink] or cancels.

  On confirm, calls `unlinkPersonaInCommunity()`. Removal is immediate. On success: dialog closes, toast "Persona unlinked", entry moves from "Currently Linked" to "Available Personas" section.
- **Technical:** `components/unlink-confirm-dialog.tsx` renders confirmation. Server action reads `memberTraits`, filters out the matching `linkedPersonas` entry by `personaUri`, writes back. If `linkedPersonas` array becomes empty, the key can remain as `[]` or be removed entirely -- either is handled correctly by the display component. Logs activity event `membership.link_removed`.
- **Acceptance criteria:**
  - [ ] Confirmation dialog explains the effect of unlinking
  - [ ] On confirm, link is removed from `memberTraits.linkedPersonas`
  - [ ] Unlinked persona moves to "Available Personas" section
  - [ ] Toast notification "Persona unlinked"
  - [ ] Activity event logged with type `membership.link_removed`
  - [ ] Removal is immediate (no grace period, no cached copies)
- **Failure paths:**
  - If link already removed (concurrent operation): no-op, toast "Link already removed"

**Workflow success:** User can create, edit, and remove cross-persona links within any of their community memberships. Changes are reflected immediately in the community directory for all viewers.

---

#### Workflow: User accesses link management from persona detail page

**Preconditions:**
- User is authenticated and owns the persona
- Persona belongs to at least one community

**Stories:**

**[2.5] Navigate to link management from persona detail page**
> User discovers the link management feature from the persona detail page so that they can control cross-community visibility.

- **User:** Authenticated persona owner viewing their persona detail page.
- **Functional:** On the persona detail page (`/personas/{uri}`), if the persona belongs to at least one community, a "Linked Personas" section appears in the sidebar or below the communities list. It shows:
  - Count of active links across all communities
  - A "Manage Links" button for each community the persona belongs to (navigates to the link management page for that membership)
  - If no communities: "Join a community to link personas" helper text.
- **Technical:** The persona detail page already shows community memberships. Enhancement: add a "Manage Links" link next to each community membership. The link navigates to `/communities/{slug}/members/{membershipId}/links`. The `membershipId` is the `community_members.id` for this persona in that community.
- **Acceptance criteria:**
  - [ ] "Manage Links" action visible for each community the persona belongs to
  - [ ] Link navigates to the correct link management page
  - [ ] If persona has no community memberships, helper text shown instead
  - [ ] Link count shown per community (e.g., "2 linked personas")
- **Failure paths:**
  - If community membership data fails to load: "Manage Links" action hidden

**Workflow success:** User can navigate to the link management page from the persona detail page.

---

### Schema

No new tables or columns. Uses existing `community_members.memberTraits` (JSONB).

### Server Actions

See feature 1 server actions. No additional actions for this feature.

### Validation

See feature 1 validation schemas. No additional schemas for this feature.

### Edge Cases

- [ ] User has only 1 persona: "Available Personas" section is empty, shows "Create another persona to link here"
- [ ] User is member of the same community with 2 different personas: can link between them (both memberships exist, cross-linked in both directions)
- [ ] User unlinks, then immediately re-links the same persona: works correctly (no cooldown)
- [ ] Community admin views the link management page: they only see their own links, not other members' links
- [ ] JSONB concurrent modification: if two link operations happen simultaneously on the same membership, last write wins. Acceptable for MVP -- cross-persona linking is a low-frequency operation

### Test Criteria

**Unit tests:**
- Link dialog form validates label (required, max 100) and note (optional, max 300)
- Available personas list correctly excludes already-linked and self-persona

**Integration tests:**
- `linkPersonaInCommunity()` appends to JSONB without destroying existing memberTraits
- `unlinkPersonaInCommunity()` removes only the target entry, preserves others
- `updatePersonaLink()` updates label/note without affecting other links

**E2E tests:**
- Open link management page, see available personas
- Click "+ Link", fill label, submit, verify persona moves to "Currently Linked"
- Click "Unlink", confirm, verify persona moves to "Available Personas"
- Navigate from persona detail page "Manage Links" to link management page

### Implementation Order

1. Create `components/link-persona-dialog.tsx` with label + note form (requires feature 1 validation schemas)
2. Create `components/unlink-confirm-dialog.tsx` with confirmation text
3. Create `components/linked-persona-card.tsx` with edit/unlink actions
4. Create `components/available-persona-card.tsx` with link action and private-persona handling
5. Create `components/manage-linked-personas.tsx` client component composing the above
6. Create `app/(dashboard)/communities/[slug]/members/[membershipId]/links/page.tsx` server component (requires steps 1-5)
7. Add "Manage Links" navigation to persona detail page (`app/(dashboard)/personas/[uri]/page.tsx`)
8. Write E2E test for full link management flow

---

## 3. Authorization & Visibility Rules

### Overview

Cross-persona link authorization is the most nuanced permission model in Personus. It intersects persona visibility, community membership, and the core unlinkability principle. This section defines the complete authorization rules for creating, viewing, and removing links.

### Wireframe

```
Authorization Decision Flow (for reference):

CREATE LINK
┌─────────────────────────────────────────────────────────────┐
│ 1. User authenticated?                    → NO → DENY       │
│ 2. User owns source membership persona?   → NO → DENY       │
│ 3. User owns target persona?              → NO → DENY       │
│ 4. Target persona visibility != private?  → NO → DENY       │
│ 5. Target not already linked?             → NO → DENY (dup) │
│ 6. All checks pass?                       → ALLOW            │
└─────────────────────────────────────────────────────────────┘

VIEW LINK
┌─────────────────────────────────────────────────────────────┐
│ 1. Viewer is community member?            → NO → SUPPRESS    │
│ 2. Membership visible: true?              → NO → SUPPRESS    │
│    (unless viewer is admin)                                  │
│ 3. Target persona exists?                 → NO → SUPPRESS    │
│ 4. Target visibility = public?            → YES → FULL       │
│ 5. Target visibility = authenticated?                        │
│    5a. Viewer authenticated?              → YES → FULL       │
│    5b. Viewer anonymous?                  → LABEL-ONLY       │
│ 6. Target visibility = community?                            │
│    6a. Viewer shares community w/ target? → YES → FULL       │
│    6b. Viewer does not share?             → SUPPRESS          │
│ 7. Target visibility = private?           → SUPPRESS          │
└─────────────────────────────────────────────────────────────┘

REMOVE LINK
┌─────────────────────────────────────────────────────────────┐
│ 1. User authenticated?                    → NO → DENY       │
│ 2. User owns the membership?              → NO → DENY       │
│ 3. All checks pass?                       → ALLOW            │
│                                                              │
│ NOTE: Community admins CANNOT remove links on behalf of      │
│ members. Only the persona owner can manage their own links.  │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
lib/auth/permissions.ts                                ← EXISTS: Enhanced
  ├─ resolveLinkedPersonaVisibility()                   ← EXISTS (enhance with community check)
  └─ assertCanManageLinks()                             ← NEW: ownership + membership check

app/actions/communities.ts                              ← EXISTS: Enhanced
  └─ Server actions use assertCanManageLinks() before mutations
```

### Workflows & Stories

---

#### Workflow: System enforces link creation authorization

**Preconditions:**
- User is attempting to create a cross-persona link

**Stories:**

**[3.1] Verify same-user ownership of both personas**
> System ensures the user owns both the source and target personas so that no one can link personas belonging to different people.

- **User:** System (automated, runs during `linkPersonaInCommunity()`).
- **Functional:** The server action verifies that the authenticated user's internal DB user ID (`users.id`) matches both:
  - The `userId` on the `community_members` row (source membership)
  - The `userId` on the target `personas` row

  This check is performed server-side only. The API never reveals whether two personas belong to the same user -- it simply returns an authorization error if they do not.
- **Technical:** In `linkPersonaInCommunity()`:
  ```typescript
  // 1. Get current user
  const userId = await ensureUser();

  // 2. Verify ownership of the source membership
  const [membership] = await db.select()
    .from(communityMembers)
    .where(and(
      eq(communityMembers.id, input.sourceMembershipId),
      eq(communityMembers.userId, userId),
    ))
    .limit(1);
  if (!membership) throw new Error('Membership not found');

  // 3. Verify ownership of the target persona
  const [targetPersona] = await db.select()
    .from(personas)
    .where(and(
      eq(personas.uri, input.targetPersonaUri),
      eq(personas.userId, userId),
    ))
    .limit(1);
  if (!targetPersona) throw new Error('You do not own this persona');
  ```

  The error message for step 3 intentionally does not distinguish between "persona not found" and "persona not owned" -- both return the same generic error to prevent enumeration of other users' personas.
- **Acceptance criteria:**
  - [ ] Link creation succeeds when user owns both personas
  - [ ] Link creation fails when user does not own target persona
  - [ ] Link creation fails when user does not own source membership
  - [ ] Error messages do not reveal persona ownership to other users
  - [ ] Server-side check only -- no client-side ownership verification exposed via API
- **Failure paths:**
  - If user does not own source membership: "Membership not found" (generic)
  - If user does not own target persona: "You do not own this persona" (or generic "Persona not found")

**[3.2] Prevent linking private personas**
> System prevents linking to personas with `private` visibility so that the unlinkability principle is maintained for private personas.

- **User:** System (automated).
- **Functional:** Private personas are excluded from linking because their entire purpose is to be invisible to others. A link to a private persona would always be suppressed for every viewer, making it pointless. The server action checks `targetPersona.visibility !== 'private'` before creating the link.
- **Technical:** In `linkPersonaInCommunity()`, after fetching the target persona:
  ```typescript
  if (targetPersona.visibility === 'private') {
    throw new Error('Private personas cannot be linked');
  }
  ```
  The client-side UI also disables the "[+ Link]" button for private personas with explanatory text.
- **Acceptance criteria:**
  - [ ] Server rejects link creation for private visibility target
  - [ ] Client disables link button for private personas
  - [ ] Error message clearly states the reason
- **Failure paths:**
  - If client-side check bypassed (direct API call): server-side check catches it

**[3.3] Prevent community admins from forcing links**
> System ensures that only the persona owner can create links so that community organizers cannot compel identity disclosure.

- **User:** System (automated, principle enforcement).
- **Functional:** Community admins and stewards have no ability to create, modify, or remove cross-persona links on behalf of other members. The link management actions exclusively check `userId` ownership on the membership row. There is no admin override for link management. This is a core privacy principle: linking is opt-in, and only the persona owner controls it.
- **Technical:** All link management server actions use `communityMembers.userId = currentUserId` in their queries, not a role-based check. Even if an admin calls the action with another member's `membershipId`, the ownership check fails because the admin's `userId` does not match the membership's `userId`.
- **Acceptance criteria:**
  - [ ] Admin cannot create links on other members' memberships
  - [ ] Admin cannot remove links on other members' memberships
  - [ ] Admin cannot edit labels/notes on other members' links
  - [ ] No admin override endpoint or parameter exists
- **Failure paths:**
  - Admin attempts to manage another member's links: "Membership not found" (generic, same as non-owner)

**Workflow success:** Link creation is restricted to the persona owner, private personas are excluded, and no one can force identity disclosure.

---

#### Workflow: System enforces link viewing authorization

**Preconditions:**
- Viewer is viewing a community directory or member profile
- The member has linkedPersonas in their memberTraits

**Stories:**

**[3.4] Enforce community membership gate for link viewing**
> System ensures only community members can see cross-persona links so that links are truly community-scoped.

- **User:** System (automated, runs during linked persona resolution).
- **Functional:** Cross-persona links are only visible to members of the community where the link was created. Non-members never see the link data. This is enforced at two levels:
  1. The community directory/profile page is only accessible to community members (standard community authorization via `visibility` + `communityMembers` check)
  2. The `resolveLinkedPersonasForViewer()` function verifies community membership before processing links

  The `linkedPersonas` data is never included in public API responses, MCP tool responses, or search results. Links are a UI-only feature within community context.
- **Technical:** The community directory page already gates on membership. The `resolveLinkedPersonasForViewer()` action additionally validates: `viewerUserId` must have a `community_members` row for the community in question. If not, all links are returned as `suppressed`.
- **Acceptance criteria:**
  - [ ] Non-members of the community never see linked persona data
  - [ ] MCP search results never include linkedPersonas data
  - [ ] Public persona pages (`/p/{uri}`) never show linked persona data
  - [ ] Links are only visible within the community context where they were created
- **Failure paths:**
  - If viewer's membership check fails: all links suppressed (fail-closed)

**[3.5] Evaluate target persona visibility for each link**
> System applies the target persona's visibility rules to determine how each link is presented so that persona visibility is consistently enforced.

- **User:** System (automated).
- **Functional:** For each linked persona entry, the system:
  1. Fetches the target persona by URI
  2. Evaluates the target persona's `visibility` against the viewer:
     - `public` -> `full` (show everything, clickable link)
     - `authenticated` + auth'd viewer -> `full`
     - `authenticated` + anonymous viewer -> `label-only`
     - `community` + viewer shares another community with target -> `full`
     - `community` + viewer does not share community -> `suppressed`
     - `private` -> `suppressed`
  3. Returns the resolution to the display component

  Silent suppression is critical: the viewer gets no indication that a suppressed link exists. This prevents information leakage about the existence of other personas.
- **Technical:** Enhances `resolveLinkedPersonaVisibility()` in `lib/auth/permissions.ts`. The existing pure function (documented in doc 09 line 1355) takes `(ability, link, targetPersona)` and returns `'full' | 'label-only' | 'suppressed'`. For the `community` visibility case, the function needs to check whether the viewer shares a community with the target persona. This requires `canViewPersona()` from `lib/auth/permissions.ts` (line 217), which already handles the community membership overlap query.

  The batched resolution function `resolveLinkedPersonasForViewer()` fetches all target personas in a single query (by URI list), then maps each through the visibility function.
- **Acceptance criteria:**
  - [ ] Public target -> `full` for all community members
  - [ ] Authenticated target -> `full` for auth'd members, `label-only` for anonymous
  - [ ] Community target with shared community -> `full`
  - [ ] Community target without shared community -> `suppressed`
  - [ ] Private target -> `suppressed`
  - [ ] Deleted target -> `suppressed`
  - [ ] No "permission denied" error exposed for suppressed links
  - [ ] Batch resolution fetches all target personas in one query
- **Failure paths:**
  - If target persona fetch fails: suppress that link, process remaining

**Workflow success:** Link visibility is correctly resolved for every viewer, enforcing persona visibility rules and the community-scoped boundary.

---

### Schema

No schema changes. Authorization rules are enforced in application logic (CASL + permissions.ts orchestration functions).

### Server Actions

```typescript
// NEW — add to lib/auth/permissions.ts

/**
 * Assert that the current user can manage links for a specific community membership.
 *
 * Checks:
 * 1. Membership exists
 * 2. Membership belongs to the current user (userId match)
 *
 * NOTE: No admin override. Only the membership owner can manage links.
 *
 * @param userId - Internal DB user ID
 * @param membershipId - community_members.id
 * @throws Error if checks fail
 */
assertCanManageLinks(userId: string, membershipId: string): Promise<{ membership: CommunityMember }>

/**
 * Resolve visibility for a list of linked personas for a specific viewer.
 * Pure function with pre-fetched data.
 *
 * @param viewerUserId - viewer's internal DB user ID, or null if anonymous
 * @param linkedPersonas - array of LinkedPersona entries from memberTraits
 * @param targetPersonas - pre-fetched persona rows for the linked URIs
 * @param viewerCommunityIds - community IDs the viewer belongs to
 */
resolveLinkedPersonasVisibility(
  viewerUserId: string | null,
  linkedPersonas: LinkedPersona[],
  targetPersonas: Map<string, Persona | null>,
  viewerCommunityIds: string[],
): Array<{ personaUri: string; visibility: 'full' | 'label-only' | 'suppressed'; persona?: Persona; label: string; note?: string }>
```

### Validation

No new validation schemas for this feature. Authorization is enforced via DB queries and CASL conditions, not Zod schemas.

### Edge Cases

- [ ] User owns persona A in community X and persona B in community Y, and persona B has `community` visibility: linking B in community X means viewers in X can see the link only if they are also members of a community B belongs to (which is community Y). If no X member is also in Y, the link is suppressed for everyone -- still valid to create, just invisible
- [ ] User is both admin and regular member in different communities: admin role in community X does not grant link management in community Y
- [ ] Race condition: user deletes target persona while another user is viewing the link: viewer sees suppressed link (target fetch returns null)
- [ ] Org persona links to person persona: allowed. Both must be owned by the same user. Useful for "This organization is run by [person]"
- [ ] User leaves the community (membership deleted): all linkedPersonas on that membership are destroyed with the membership row. Links in other communities referencing the deleted membership's persona are unaffected (they reference by URI, not membership ID)

### Test Criteria

**Unit tests:**
- `assertCanManageLinks()` allows membership owner
- `assertCanManageLinks()` denies non-owner (including admin)
- `resolveLinkedPersonasVisibility()` returns correct visibility for all 6 target visibility scenarios
- `resolveLinkedPersonasVisibility()` handles mixed visibility targets in a single batch

**Integration tests:**
- Admin cannot create link on another member's membership
- Link to private persona rejected at server level
- Link viewing returns `suppressed` for non-community-member viewer

**E2E tests:**
- Create link as owner: succeeds
- View link as community member: sees "Also in this community as:"
- View link as non-member: link not visible (verify via different user session)

### Implementation Order

1. Implement `assertCanManageLinks()` in `lib/auth/permissions.ts` -- ownership check on community_members row
2. Implement `resolveLinkedPersonasVisibility()` as a pure function in `lib/auth/permissions.ts` (enhance existing `resolveLinkedPersonaVisibility()`)
3. Wire `assertCanManageLinks()` into all link management server actions (requires steps 1, feature 1 step 2)
4. Wire `resolveLinkedPersonasVisibility()` into `resolveLinkedPersonasForViewer()` server action (requires step 2, feature 1 step 3)
5. Write unit tests for both permission functions (requires steps 1, 2)
6. Write integration tests for admin-cannot-force-links scenario
7. Write E2E test for link visibility across different viewer types

---

## 4. Bidirectional Link Display

### Overview

When a user links persona A to persona B in community X, the link should be visible on both sides: viewers of persona A's membership see a reference to persona B, and viewers of persona B's profile (if B is also in community X) see a reference back to persona A. However, the actual data only lives on one membership row. This feature handles the bidirectional display by checking whether a reverse link exists or by rendering a "linked from" indicator.

### Wireframe

```
Persona A's membership in Community X:
┌──────────────────────────────────────────────────────────────────────┐
│ [MR] Maria Gym — Powerlifting Coach                                  │
│                                                                      │
│ Also in this community as:                                           │
│ [MR] Product Designer — "Happy to chat about UX"          [View]     │
│                                                                      │
│ (This link was created by Maria, stored on her gym membership)       │
└──────────────────────────────────────────────────────────────────────┘

Persona B's membership in Community X (if B is also a member):
┌──────────────────────────────────────────────────────────────────────┐
│ [MR] Maria Pro — Product Designer                                    │
│                                                                      │
│ Also in this community as:                                           │
│ [MR] Powerlifting Coach                                    [View]    │
│                                                                      │
│ (This is a REVERSE link — derived from Maria Gym's linkedPersonas)   │
└──────────────────────────────────────────────────────────────────────┘

When BOTH memberships have explicit links to each other:
(Forward link on A pointing to B) + (Forward link on B pointing to A)
→ Deduplicated in display: show only one "Also in this community as:" entry per pair
```

### Component Hierarchy

```
components/linked-personas-display.tsx                  ← EXISTS (from feature 1, ENHANCED)
  └─ Receives both forward links (from this membership's memberTraits)
     and reverse links (from other memberships pointing to this persona)
     └─ calls: app/actions/communities.ts → getLinkedPersonasForMember()  ← NEW
```

### Workflows & Stories

---

#### Workflow: Viewer sees bidirectional links in community context

**Preconditions:**
- Viewer is a community member
- At least one member has created a cross-persona link
- The linked persona also belongs to the same community (for reverse links)

**Stories:**

**[4.1] Compute and display reverse links**
> System shows "Also in this community as:" on the target persona's membership when someone else has linked to it, so that the bidirectional relationship is visible from both sides.

- **User:** System + Viewer (community member).
- **Functional:** When rendering a member profile in a community, the system gathers links from two sources:
  1. **Forward links:** This membership's `memberTraits.linkedPersonas` array (the links this user explicitly created)
  2. **Reverse links:** Other memberships in the same community whose `memberTraits.linkedPersonas` contain a reference to this membership's persona URI

  Both sets are merged (deduplicated by persona URI pair) and displayed under "Also in this community as:". Reverse links show the source persona (the one that created the link) rather than the target. Reverse link visibility follows the same rules as forward links -- the source persona's visibility is evaluated for the viewer.
- **Technical:** New server action `getLinkedPersonasForMember()` in `app/actions/communities.ts`:
  1. Fetch the current membership and its `memberTraits.linkedPersonas` (forward links)
  2. Query all other memberships in the same community where `memberTraits->'linkedPersonas'` contains a JSON object with `personaUri` matching this membership's persona URI:
     ```sql
     SELECT cm.* FROM community_members cm
     WHERE cm.community_id = $communityId
     AND cm.id != $currentMembershipId
     AND cm.member_traits->'linkedPersonas' @> $jsonMatch::jsonb
     ```
     Where `$jsonMatch` is `[{"personaUri": "<this-persona-uri>"}]`
  3. For each reverse link found, create a synthetic `LinkedPersona` entry pointing back to the source persona
  4. Merge forward + reverse links, deduplicate by persona URI pair
  5. Apply visibility resolution to the merged set

  The GIN index on `community_members.member_traits` (if added) would make the JSONB containment query efficient. For MVP, a sequential scan across community members is acceptable (community sizes are typically <1000).
- **Acceptance criteria:**
  - [ ] Forward links display as before (from feature 1)
  - [ ] Reverse links display when another member has linked to this persona
  - [ ] Deduplication: if A links to B AND B links to A, only one entry per pair is shown
  - [ ] Reverse link visibility follows the same rules as forward links
  - [ ] Reverse links are only computed within the same community
  - [ ] Performance: reverse link query does not cause noticeable latency for communities <1000 members
- **Failure paths:**
  - If JSONB containment query fails: only forward links shown (graceful degradation)
  - If community has 0 other members with links: only forward links shown

**[4.2] Distinguish forward and reverse links in the management UI (owner only)**
> Persona owner sees both their own links and links others have created pointing to their persona, so that they understand the full picture.

- **User:** Authenticated persona owner on the link management page.
- **Functional:** The link management page shows:
  - "Your Links" section: links the owner explicitly created (editable, unlinkable)
  - "Linked To You" section: reverse links created by other memberships in this community (read-only, not removable by this user -- only the link creator can remove)

  The "Linked To You" section is informational. It shows: "[Persona name] linked to you in this community." No edit/unlink actions are available because the owner of the reverse link is a different person (who happens to own a different membership in the same community but linked to this persona).

  Note: in practice, reverse links between different users are impossible because linking requires same-user ownership. Reverse links only occur when the same user has multiple memberships in the same community (e.g., person persona + org persona). In this case, the "Linked To You" section will show links from the user's own other memberships.
- **Technical:** On the link management page, query for reverse links as in story 4.1. Display them in a separate read-only section. Since reverse links are always from the same user (same-user ownership requirement for linking), the "Linked To You" section effectively shows "Your other membership linked to this persona." This could be simplified to a note: "Your [other persona name] membership also links here."
- **Acceptance criteria:**
  - [ ] "Your Links" section shows owner-created links with edit/unlink
  - [ ] "Linked To You" section shows reverse links as read-only
  - [ ] Reverse links display the source persona name
  - [ ] No edit/unlink actions on reverse links
  - [ ] If no reverse links exist, section is hidden
- **Failure paths:**
  - If reverse link query fails: section hidden, forward links still manageable

**Workflow success:** Bidirectional links are visible from both sides within a community, with correct deduplication and visibility enforcement.

---

### Schema

No schema changes. Reverse links are computed at query time from existing `memberTraits.linkedPersonas` data on other memberships in the same community.

### Server Actions

```typescript
// NEW — add to app/actions/communities.ts

getLinkedPersonasForMember(input: {
  communityId: string;
  membershipId: string;
  viewerUserId: string | null;
}): Promise<{
  forwardLinks: ResolvedLink[];
  reverseLinks: ResolvedLink[];
}>
// Authenticated community member required.
// Returns both forward links (from this membership) and reverse links
// (from other memberships in the same community pointing to this persona).
// Each link includes visibility resolution for the viewer.

interface ResolvedLink {
  personaUri: string;
  displayName: string;
  label: string;
  note?: string;
  visibility: 'full' | 'label-only' | 'suppressed';
  direction: 'forward' | 'reverse';
  linkedAt: string;
}
```

### Validation

No new validation schemas. Reverse links are read-only computed data.

### Edge Cases

- [ ] User has persona A and persona B both in community X, and A links to B: A's profile shows forward link to B. B's profile shows reverse link from A. The user sees both on the management page.
- [ ] A links to B and B links to A in same community: deduplicated to one entry per pair in the viewer display. The management page shows both as "Your Links" since the user owns both memberships.
- [ ] User deletes persona A (which was linked to by B): B's forward link to A becomes a dead reference (suppressed). A's reverse link from B no longer exists (A's membership deleted).
- [ ] Large community (500+ members): JSONB containment query may be slow without a GIN index on `member_traits`. Consider adding index if performance degrades.

### Test Criteria

**Unit tests:**
- Deduplication logic: A->B and B->A produces one entry per pair
- Reverse link resolution correctly identifies source persona

**Integration tests:**
- `getLinkedPersonasForMember()` returns forward + reverse links
- `getLinkedPersonasForMember()` correctly deduplicates bidirectional links
- Reverse link visibility follows the same rules as forward links

**E2E tests:**
- Create link from persona A to persona B in same community
- View persona B's profile in community directory: see reverse link to persona A
- Manage links page: see "Linked To You" section with reverse link

### Implementation Order

1. Implement `getLinkedPersonasForMember()` server action with JSONB containment query for reverse links
2. Add deduplication logic for forward + reverse link pairs
3. Enhance `components/linked-personas-display.tsx` to accept both forward and reverse links (requires step 1)
4. Add "Linked To You" section to `components/manage-linked-personas.tsx` (requires step 1)
5. Write integration tests for bidirectional link computation
6. Write E2E test for bidirectional display

---

## 5. Activity Logging & Audit Trail

### Overview

Cross-persona link operations are logged to the `activity_events` table for transparency and debugging. Link creation and removal are auditable events visible to the data owner on their activity feed.

### Wireframe

```
Activity Feed (persona owner):
┌──────────────────────────────────────────────────────────────────────┐
│ Recent Activity                                                      │
│                                                                      │
│ Feb 23  Linked "Product Designer" in Iron Oak Gym                    │
│ Feb 22  Unlinked "UX Consultant" from Iron Oak Gym                   │
│ Feb 20  Updated link label for "Product Designer" in Iron Oak Gym    │
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Existing activity feed (no new components needed)
  └─ calls: lib/db/queries.ts → logActivity()   ← EXISTS
```

### Workflows & Stories

---

#### Workflow: System logs link operations for audit

**Preconditions:**
- User performs a link, unlink, or edit link operation

**Stories:**

**[5.1] Log link creation event**
> System records when a cross-persona link is created so that the owner has an audit trail.

- **User:** System (automated, triggered by `linkPersonaInCommunity()`).
- **Functional:** After a successful link creation, an activity event is logged with:
  - `type`: `'membership.link_created'`
  - `userId`: the persona owner's user ID
  - `personaUri`: the source persona's URI (the one in the community membership)
  - `communityId`: the community where the link was created
  - `summary`: `'Linked "[label]" in [community name]'`
  - `metadata`: `{ targetPersonaUri, label, note }`
- **Technical:** Uses existing `logActivity()` from `lib/db/queries.ts`. Called at the end of `linkPersonaInCommunity()` after the JSONB update succeeds.
- **Acceptance criteria:**
  - [ ] Activity event created on successful link
  - [ ] Activity event NOT created on failed link (validation error, auth error)
  - [ ] Event includes community context (communityId)
  - [ ] Event summary is human-readable
- **Failure paths:**
  - If `logActivity()` fails: link still succeeds (activity logging is non-critical)

**[5.2] Log link removal event**
> System records when a cross-persona link is removed so that the owner has a complete history.

- **User:** System (automated, triggered by `unlinkPersonaInCommunity()`).
- **Functional:** After a successful unlink, an activity event is logged with:
  - `type`: `'membership.link_removed'`
  - `userId`: the persona owner's user ID
  - `personaUri`: the source persona's URI
  - `communityId`: the community
  - `summary`: `'Unlinked "[label]" from [community name]'`
- **Technical:** Same pattern as 5.1, called at the end of `unlinkPersonaInCommunity()`.
- **Acceptance criteria:**
  - [ ] Activity event created on successful unlink
  - [ ] Event summary names the unlinked persona label and community
- **Failure paths:**
  - If `logActivity()` fails: unlink still succeeds

**[5.3] Log link update event**
> System records when a link's label or note is updated.

- **User:** System (automated, triggered by `updatePersonaLink()`).
- **Functional:** After a successful update, an activity event is logged with:
  - `type`: `'membership.link_updated'`
  - `summary`: `'Updated link label for "[label]" in [community name]'`
- **Technical:** Same pattern. Called at the end of `updatePersonaLink()`.
- **Acceptance criteria:**
  - [ ] Activity event created on successful update
  - [ ] Event summary mentions which link was updated
- **Failure paths:**
  - If `logActivity()` fails: update still succeeds

**Workflow success:** All link operations are logged to the activity feed, providing the persona owner with a complete audit trail.

---

### Schema

No schema changes. Uses existing `activity_events` table from `lib/db/schema/activity-events.ts`. New event types added as string values -- the `type` column is `text`, not an enum, so no migration needed.

Activity types to add to `ACTIVITY_TYPES` in `lib/constants.ts`:
```typescript
// Add to ACTIVITY_TYPES array in lib/constants.ts
'membership.link_created',
'membership.link_removed',
'membership.link_updated',
```

### Server Actions

No new server actions. Activity logging is called from within existing link management actions.

### Validation

No new validation schemas.

### Edge Cases

- [ ] Rapid link/unlink/link: all three events logged in order
- [ ] Activity event for a deleted community: event remains in history, community name in summary may be stale

### Test Criteria

**Unit tests:**
- Activity event has correct type and summary for each operation

**Integration tests:**
- `linkPersonaInCommunity()` creates an activity event with correct metadata
- `unlinkPersonaInCommunity()` creates an activity event
- `updatePersonaLink()` creates an activity event

### Implementation Order

1. Add new activity types to `ACTIVITY_TYPES` in `lib/constants.ts`
2. Add `logActivity()` calls to `linkPersonaInCommunity()`, `unlinkPersonaInCommunity()`, and `updatePersonaLink()` (requires feature 1 step 2)
3. Write integration tests for activity event creation

---

## Appendix: What Links Do NOT Enable

For clarity, cross-persona links are a narrowly-scoped disclosure mechanism. They explicitly do NOT:

- **Make the target persona searchable within the source community.** Linking does not add the target persona to the community's search index or directory. The link is a UI display, not a data relationship.
- **Transfer endorsements across personas.** Endorsements on persona A remain on persona A. Linking A to B does not show A's endorsements on B's profile.
- **Create affiliation relationships.** A link is not a community membership. The target persona does not become a member of the source community.
- **Grant the community admin access to the target persona.** Admins see the link (if it passes visibility) but cannot view, edit, or manage the target persona.
- **Appear in MCP search results.** Links are a UI-only feature within community context. AI agents and MCP tools never receive linked persona data.
- **Survive community deletion.** If the community is deleted, all memberships are deleted, and all links within those memberships are destroyed.
- **Create cross-community visibility.** A link in community X does not make the linked persona visible in community Y.

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| 1.1 | Implement linked personas display component for community profiles | `personas`, `linking`, `communities` | -- | -- |
| 1.2 | Implement linked persona visibility resolution with target persona checks | `personas`, `linking`, `permissions` | -- | -- |
| 2.1 | Build link management page with current links and available personas | `personas`, `linking`, `ux` | 1.1, 1.2 | -- |
| 2.2 | Implement create cross-persona link with dialog and server action | `personas`, `linking`, `crud` | 2.1 | -- |
| 2.3 | Implement edit link label and note | `personas`, `linking`, `crud` | 2.2 | -- |
| 2.4 | Implement unlink persona with confirmation dialog | `personas`, `linking`, `crud` | 2.2 | -- |
| 2.5 | Add "Manage Links" navigation from persona detail page | `personas`, `linking`, `ux` | 2.1 | -- |
| 3.1 | Implement same-user ownership verification for link creation | `personas`, `linking`, `permissions` | -- | -- |
| 3.2 | Implement private persona linking prevention | `personas`, `linking`, `permissions` | 3.1 | -- |
| 3.3 | Verify admin cannot force links on other members | `personas`, `linking`, `permissions` | 3.1 | -- |
| 3.4 | Enforce community membership gate for link viewing | `personas`, `linking`, `permissions` | 1.2 | -- |
| 3.5 | Implement target persona visibility evaluation for links | `personas`, `linking`, `permissions` | 3.4 | -- |
| 4.1 | Implement reverse link computation and bidirectional display | `personas`, `linking`, `communities` | 1.1 | -- |
| 4.2 | Add "Linked To You" section to link management page | `personas`, `linking`, `ux` | 4.1, 2.1 | -- |
| 5.1 | Log activity event on link creation | `personas`, `linking`, `audit` | 2.2 | -- |
| 5.2 | Log activity event on link removal | `personas`, `linking`, `audit` | 2.4 | -- |
| 5.3 | Log activity event on link update | `personas`, `linking`, `audit` | 2.3 | -- |

**Conventions:**
- Story IDs use `[Feature#].[Story#]` format (e.g., `3.2` = feature 3, story 2)
- Issue titles are imperative: "Implement linked persona visibility resolution" not "User sees linked personas"
- Labels include the spec suite (`personas`) and feature area (`linking`, `permissions`, `communities`, `crud`, `audit`)
- Blocked By reflects story dependencies -- matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
