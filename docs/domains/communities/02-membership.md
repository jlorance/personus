---
type: spec
title: Communities — Membership
description: "This spec covers the full member lifecycle: join, approve, onboard, engage, role changes, leave, and removal. Everything about how people become and remain members of a community."
status: current
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Membership

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-community-lifecycle.md`
> Primary actors: Community Organizer (CO), Community Member (CM)

This spec covers the full member lifecycle: join, approve, onboard, engage, role changes, leave, and removal. Everything about how people become and remain members of a community.

---

## 1. The Three-Part Membership

A community membership is not just "user in community." It's three things:

| Part | What It Is | Why It Matters |
|------|-----------|---------------|
| `userId` | The human being | For permissions, dedup, billing, management |
| `personaId` | What they share with this community | For display, scoped search, privacy isolation |
| `communityId` | The community they joined | For context, role, member traits |

**A user joins a community by sharing a persona with it.** The persona determines what the community sees — skills, experience, endorsements, contact preferences. Different communities can see different personas from the same user.

This is the core privacy mechanism: your photography club sees your "creative persona" with photography skills and gear. Your professional guild sees your "dev persona" with programming languages and certifications. Your neighborhood community sees your "local persona" with handyman skills and available hours.

---

## 2. Join Flows

### 2.1 Open Join (joinPolicy: 'open')

No approval needed. Member joins immediately.

```
CM clicks "Join" (from public page, invite link, or Explore)
  │
  ├─ If not logged in → Sign up / log in → return to join flow
  │
  ├─ Select persona screen:
  │  "Which persona do you want to share with [Community Name]?"
  │
  │  ┌──────────────────┐ ┌──────────────────┐
  │  │ [N] Nadia K.      │ │ [N] Nadia (Photo) │
  │  │ Vet tech          │ │ Photography       │
  │  │ Professional      │ │ Creative          │
  │  │ [Select]          │ │ [Select]          │
  │  └──────────────────┘ └──────────────────┘
  │
  │  [+ Create a new persona for this community]
  │
  ├─ Fill in member traits (from community's memberTraitSchema):
  │  "Tell [Community Name] about yourself"
  │
  │  Skills Offered: [landscape photography] [wildlife] [+ add]
  │  Gear Available: [Canon R5, 70-200mm f/2.8]
  │  Experience Level: [Advanced ▾]
  │
  │  [Join Community]
  │
  └─ Result:
     ├─ community_members row created (userId, personaId, communityId, role: 'member')
     ├─ memberTraits JSONB populated
     ├─ directoryOptIn set (if community has public directory enabled and member chose to opt in)
     ├─ communities.memberCount incremented
     ├─ Activity event logged: 'member_joined'
     └─ Toast: "Welcome to [Community Name]!"
```

### 2.2 Approval Join (joinPolicy: 'approval')

Member submits a request. CO/steward reviews and approves or declines.

```
CM clicks "Request to Join"
  │
  ├─ Same persona selection as Open Join
  │
  ├─ Fill in member traits + join message:
  │  "Why do you want to join [Community Name]?"
  │  [textarea — optional but encouraged]
  │
  │  [Submit Request]
  │
  ├─ Result:
  │  ├─ Join request record created (status: 'pending')
  │  ├─ Activity event: 'join_requested'
  │  ├─ CO/stewards notified (see 08-notifications.md)
  │  └─ CM sees: "Your request has been submitted. You'll be notified when reviewed."
  │
  └─ CO/Steward reviews:
     ├─ Sees request in Members tab → Pending Requests section
     │
     │  ┌─────────────────────────────────────────────────────┐
     │  │ [N] Nadia K. — Vet tech                             │
     │  │ Requested: 2 hours ago                               │
     │  │ Message: "I'm a landscape photographer with 10 years │
     │  │ experience, would love to join the community."       │
     │  │ Member traits preview: landscape, wildlife, Canon R5  │
     │  │                                                       │
     │  │ [Approve] [Decline] [Request More Info]               │
     │  └─────────────────────────────────────────────────────┘
     │
     ├─ Approve → member created, CM notified "You're in!"
     ├─ Decline → request closed, CM notified "Not approved" (optional reason)
     └─ Request More Info → message sent to CM, request stays pending
```

### 2.3 Invite-Only Join (joinPolicy: 'invite_only')

Members can only join via a direct invitation from a CO/steward/admin. No public "Join" button. See `05-invitations.md` for the invite flow.

```
CM receives invite (link, email, or in-app)
  │
  ├─ Clicks invite link → lands on join page with invite context
  │  "You've been invited to join [Community Name] by [Inviter Name]"
  │
  ├─ Same persona selection + member traits as Open Join
  │
  ├─ [Accept Invitation]
  │
  └─ Result:
     ├─ community_members row created with invitedByUserId
     ├─ Invite record marked as accepted
     └─ Inviter notified: "[Name] accepted your invitation"
```

### 2.4 Persona Selection Details

The "select persona" step is critical. UX considerations:

- **Show only relevant personas.** If the community is a photography club, the user's "vet tech" persona is still selectable but the "photography" persona (if it exists) should be suggested first.
- **Show persona preview.** The user should see what the community will see — skills, experience, endorsements visible at this community's scope.
- **Allow creating a new persona.** "I want to join this community but my existing personas don't fit." Opens a quick persona creation flow, then returns to the join flow.
- **One persona per community.** A user can only have one active membership in a community. They can change their persona later (see §5).

### 2.5 Member Traits Form

Generated dynamically from the community's `memberTraitSchema`. Same metadata-driven rendering as community traits:

- Each field renders based on its `type` (text, textarea, select, tag_input, number, url)
- Required fields are enforced
- Help text shown where configured
- Preview of what the community will see
- Can be partially filled at join time and completed later

### 2.6 Public Directory Opt-In

If the community has enabled a public directory (`publicPresence.level: 'full'` — see `01-community-lifecycle.md` §3.2.3), new members are shown a directory opt-in toggle during the join flow:

```
┌─────────────────────────────────────────────────────────┐
│ Public Directory                                         │
│                                                          │
│ This community has a public directory — a page where     │
│ anyone can search for members with specific skills.      │
│                                                          │
│ Include me in the public directory   [on/off]            │
│                                                          │
│ If you opt in, the following will be visible publicly:   │
│ • Display name and headline                              │
│ • Skills Offered                                         │
│ • Location                                               │
│ • Endorsement count (3)                                  │
│ (Based on what your community organizer has configured)  │
│                                                          │
│ Contact info is never shown — visitors use               │
│ the introduction request flow to reach you.              │
└─────────────────────────────────────────────────────────┘
```

**Default:** Off. Members must actively opt in.

**Current implementation:** The shipped `community_members.visible` boolean (default `true`) controls whether a member appears in the internal browsable directory. Members toggle it via `setMemberVisibility`. The `directoryOptIn` field for a separate public-directory opt-in is **not yet implemented** — the public directory feature (§3.2.3 of `01-community-lifecycle.md`) is planned but not shipped.

Members can change their internal directory visibility at any time from their member settings (see §6.1).

The visible fields shown in the preview come from the community's `publicPresence.directory.visibleFields` — the CO controls what appears publicly, the member controls whether they appear at all.

---

## 3. Join Request Schema

For communities with approval-required join policy (shipped in PER-8, physical schema in `packages/db/src/schema/communities.ts`):

```typescript
// packages/db/src/schema/communities.ts — actual shipped schema
export const communityJoinRequests = pgTable('community_join_requests', {
  // baseFields('cjr'): bigserial id, publicId (cjr_*), audit cols, deletedAt soft-delete
  ...baseFields('cjr'),
  communityId: bigint('community_id', { mode: 'bigint' })
    .references(() => communities.id, { onDelete: 'cascade' })
    .notNull(),
  requestingUserId: bigint('requesting_user_id', { mode: 'bigint' })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  requestingPersonaId: bigint('requesting_persona_id', { mode: 'bigint' })
    .references(() => personas.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'declined'
  decisionUserId: bigint('decision_user_id', { mode: 'bigint' }).references(() => users.id, {
    onDelete: 'set null',
  }),
  message: text('message'),  // "Why I want to join" — optional
}, (table) => [
  index('idx_cjr_community').on(table.communityId),
  index('idx_cjr_requesting_user').on(table.requestingUserId),
  index('idx_cjr_status').on(table.status),
  index('idx_cjr_active').on(table.id).where(sql`deleted_at IS NULL`),
]);
```

**Differences from the original design:**
- Field names use `requestingUserId` / `requestingPersonaId` (not `userId` / `personaId`) to avoid ambiguity.
- `decisionUserId` (not `reviewedByUserId`) — who approved or declined.
- No `memberTraits` column — member traits are set at membership creation time, not stored on the request.
- No `reviewNote` — decline reason is delivered via notification, not persisted.
- No separate `requestedAt` / `reviewedAt` — creation and update timestamps come from `baseFields`.
- Soft-delete via `deletedAt` from `baseFields` (not a hard delete).
- No `unique(userId, communityId)` constraint — idempotency is handled in the service layer by checking for an existing `pending` row before inserting, not by a DB constraint. **Known gap:** two concurrent requests from the same user could both pass the pending-row check and both insert (TOCTOU race). A partial unique index on `(communityId, requestingUserId)` WHERE `deleted_at IS NULL AND status = 'pending'` would make this atomic but is not yet in the schema.

---

## 4. Server Actions

### 4.1 Join / Request to Join

```typescript
// Shipped — open communities (joinPolicy: 'open')
joinCommunityAction(formData)  // service: joinCommunity(principal, slug, personaUri)
// Creates membership immediately. Throws ForbiddenError for non-open communities.

// Shipped — approval communities (joinPolicy: 'approval')
requestToJoinAction(formData)  // service: requestToJoin(principal, slug, personaUri)
// Creates a pending CommunityJoinRequest. Returns requestPublicId (cjr_*).
// Idempotent: returns existing publicId if a pending request already exists.
// No memberTraits parameter — see §3 "Differences from original design".

// Shipped — invite_only communities (joinPolicy: 'invite_only')
claimInvitationAction(formData)  // service: claimInvitation(principal, token, personaUri)
// Claims a single-use inv_* token to join. Throws ForbiddenError if expired or already claimed.
```

**Planned (not shipped):** A unified `joinCommunity` action accepting `memberTraits` and
`directoryOptIn` parameters. These fields are not in the shipped schema or service layer.

### 4.2 Review Requests (community admin only)

```typescript
// Shipped
listJoinRequests(principal, slug)
// Returns pending CommunityJoinRequest rows. Community or platform admin only.
// Returns: [{ publicId, personaUri, personaDisplayName, requestedAt }]

approveJoinRequestAction(formData)  // service: approveJoinRequest(principal, requestPublicId)
// requestPublicId: cjr_* format (NOT a UUID — see §8 reviewJoinRequestSchema correction)
// Creates membership + increments memberCount atomically. Notifies requester.
// Idempotent: if user is already a member, only marks request approved.

declineJoinRequestAction(formData)  // service: declineJoinRequest(principal, requestPublicId)
// requestPublicId: cjr_* format
// Marks request declined. Notifies requester via in-app notification.
// No note parameter — decline reason is delivered via notification, not persisted.
```

### 4.3 Member Management

```typescript
// Shipped
listCommunityMembers(principal, slug)
// Returns visible members: [{ uri, displayName, headline, location, completenessScore, role }].
// Members-only (or platform admin). visible=true filter is applied.

getFeaturedMembers(principal, slug, limit?)
// Returns top-endorsed visible members (default cap 6), ordered by endorsement count.

setMemberVisibilityAction(formData)  // service: setMemberVisibility(principal, slug, visible)
// Toggles community_members.visible for the caller. See §6.1.
```

**Planned (not shipped):**
```typescript
// updateMemberRole(communityId, memberId, newRole) — promote/demote
//   Role column exists (member/steward/admin) but no server action is wired.
// removeMember(communityId, memberId) — moderation removal. Not implemented (07-moderation.md).
// updateMemberTraits(communityId, memberTraits) — memberTraits column does not exist
//   in community_members; dependent on the memberTraitSchema feature.
```

### 4.4 Leave

```typescript
leaveCommunity(communityId: string)
// CM leaves voluntarily. Removes membership. Cannot be the last admin
// (must transfer ownership first).
```

### 4.5 Switch Persona

```typescript
// Planned (not shipped): switchCommunityPersona
switchCommunityPersona(input: {
  communityId: string;
  newPersonaId: string;
})
// CM changes which persona they present to this community.
// Member traits: the memberTraits column does not exist in the shipped schema, so
//   trait preservation is moot until that feature is implemented.
// Community-scoped endorsements remain attached to the membership, not the old persona.
```

---

## 5. Role Management

### 5.1 Role Hierarchy

| Role | Can Do | Who Assigns |
|------|--------|-------------|
| **member** | View directory, search, request introductions, endorse, edit own member traits | Automatic on join |
| **steward** | Everything member can + review join requests, manage members, view analytics, edit community description/traits | Admin promotes |
| **admin** | Everything steward can + edit settings, change join policy/visibility, manage schema, archive/delete, promote to admin | Admin promotes, founding user is permanent |

### 5.2 Steward Limits

| Tier | Max Stewards |
|------|-------------|
| Solo Free / Pro | 2 |
| CO Base | 5 |
| CO Pro | 20 |

Attempting to promote beyond the limit shows an upgrade prompt.

### 5.3 Founding User Protection

The `foundingUserId` is always an admin. They cannot be removed or demoted. They can transfer ownership to another admin (see `01-community-lifecycle.md` §3.2.4).

### 5.4 Promote / Demote UI

```
Members tab → click member → member detail panel

┌─────────────────────────────────────────────────────────┐
│ [N] Nadia K.                                 member     │
│ Vet tech • Joined 3 months ago                          │
│ 5 endorsements in this community                        │
│                                                          │
│ Member Traits:                                           │
│ Skills Offered: landscape photography, wildlife          │
│ Gear: Canon R5, 70-200mm f/2.8                          │
│ Experience: Advanced                                     │
│                                                          │
│ Actions:                                                 │
│ [Promote to Steward] [Remove from Community]             │
└─────────────────────────────────────────────────────────┘
```

Confirmation dialog for both actions. Promote includes the steward count and limit.

---

## 6. Onboarding Flow

After joining, guide the new member to complete their community profile:

```
Welcome to [Community Name]!

You're in. Here's how to get the most out of this community:

1. Complete your community profile           [→ 2 fields remaining]
   Skills Offered, Gear Available

2. Explore who's in the community            [→ Browse Members]
   Find people with skills you're looking for

3. Endorse someone you know                  [→ Give an Endorsement]
   Build trust signals that help everyone

[Got it — take me to the community]
```

This onboarding card appears:
- Once, immediately after joining
- As a dismissable banner on the community dashboard if member traits are incomplete
- Never again after the member has completed their traits and given at least one endorsement

---

## 6.1 Member Settings

After joining, a member can manage their community-specific settings from the community dashboard:

```
Community dashboard → Settings (or profile icon → Member Settings)

┌─────────────────────────────────────────────────────────┐
│ Your Settings in [Community Name]                        │
│                                                          │
│ ── Your Persona ─────────────────────────────────────── │
│ Currently sharing: [N] Nadia K. (Photography)            │
│ [Switch Persona]                                         │
│                                                          │
│ ── Member Traits ────────────────────────────────────── │
│ Skills Offered: landscape, wildlife        [Edit]        │
│ Gear Available: Canon R5, 70-200mm         [Edit]        │
│ Experience Level: Advanced                 [Edit]        │
│                                                          │
│ ── Public Directory ─────────────────────────────────── │
│ (Only shown when community has public directory enabled)  │
│                                                          │
│ Include me in the public directory   [on/off]            │
│ Anyone can see your name, headline, and the fields your  │
│ community organizer has selected. Contact always mediated.│
│                                                          │
│ ── Visibility ───────────────────────────────────────── │
│ Show me in the member directory     [on/off]             │
│ (Internal — community members only)                      │
│                                                          │
│ ── Leave ─────────────────────────────────────────────── │
│ [Leave Community]                                        │
└─────────────────────────────────────────────────────────┘
```

**Server action (shipped):**

```typescript
setMemberVisibility(principal, slug, visible)
// Toggles community_members.visible for the current user — controls
// whether they appear in the internal browsable directory.
// Throws ForbiddenError if the caller is not a member of the community.
```

**Planned (not yet shipped):** A separate `updateDirectoryOptIn` action to control `community_members.directoryOptIn` for the public member directory — dependent on the public directory feature (`01-community-lifecycle.md` §3.2.3).

---

## 7. Member Card Component

Within a community context, members are displayed with their community-specific persona and member traits:

```typescript
<MemberCard
  member={communityMember}
  persona={persona}
  variant="full" | "compact" | "minimal"
  showMemberTraits={boolean}
  showEndorsements={boolean}
  showActions={boolean}       // "Request Intro", "Endorse"
  currentUserRole={role}      // Controls what management actions appear
/>
```

```
┌─────────────────────────────────────────────────────────┐
│ [N] Nadia K.                    member  •  5 endorsements│
│ Vet tech • Mission District                              │
│                                                          │
│ Community context:                                       │
│ Skills Offered: landscape, wildlife                      │
│ Gear: Canon R5, 70-200mm                                │
│ Experience: Advanced                                     │
│                                                          │
│ [View Profile] [Request Introduction] [Endorse]          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Validation Schemas

```typescript
// lib/validations/communities.ts (additions)

// Planned schema for the unified joinCommunity action (not yet shipped).
// Shipped action uses formData with slug (community slug) and personaUri — no memberTraits.
joinCommunitySchema = z.object({
  communityId: z.string().uuid(),   // planned; shipped uses slug (community slug)
  personaId: z.string().uuid(),     // planned; shipped uses personaUri
  // memberTraits: planned — community_members has no memberTraits column yet
  // directoryOptIn: planned — not yet implemented
});

// Planned (not shipped): updateDirectoryOptInSchema for public directory opt-in
// Current: visibility toggle is handled by setMemberVisibility (no Zod schema; slug + bool)

// Planned schema for requestToJoin (not yet shipped as a schema).
// Shipped requestToJoinAction uses formData with slug and personaUri only — no memberTraits.
joinRequestSchema = z.object({
  communityId: z.string().uuid(),   // planned; shipped uses slug
  personaId: z.string().uuid(),     // planned; shipped uses personaUri
  message: z.string().max(1000).optional(),   // planned; not in shipped requestToJoin
  // memberTraits: planned — not in shipped schema
});

// Shipped API has separate approve/decline actions, not a unified reviewJoinRequest.
// requestPublicId is cjr_<nanoid17> format — NOT a UUID. z.string().uuid() would reject it.
reviewJoinRequestSchema = z.object({
  requestPublicId: z.string().regex(/^cjr_/),  // cjr_* publicId, not a UUID
  action: z.enum(['approve', 'decline']),
  // note: not persisted; decline reason is sent as in-app notification only
});

updateMemberRoleSchema = z.object({
  communityId: z.string().uuid(),
  memberId: z.string().uuid(),
  newRole: z.enum(['member', 'steward', 'admin']),
});

updateMemberTraitsSchema = z.object({
  communityId: z.string().uuid(),
  memberTraits: z.record(z.unknown()),
});

switchPersonaSchema = z.object({
  communityId: z.string().uuid(),
  newPersonaId: z.string().uuid(),
});
```

---

## 9. Test Criteria

### Unit Tests

- Open join: creates membership immediately with correct role and traits
- Approval join: creates pending request, does NOT create membership
- Invite-only: rejects join without valid invite
- Review request (approve): creates membership, updates request status, notifies CM
- Review request (decline): updates request status, does NOT create membership
- Leave: removes membership, decrements member count, cannot leave as last admin
- Role change: admin can promote, steward cannot promote to admin, founding user protected
- Persona switch: updates personaId on membership, preserves member traits
- Steward limit: rejects promotion when at tier limit
- Member traits: validates against community's memberTraitSchema
- Duplicate membership: rejects if user already has active membership in community
- `setMemberVisibility`: toggles `visible` on member row, throws ForbiddenError for non-members
- Public directory opt-in (`directoryOptIn`): planned, not yet testable

### Integration Tests

- Full open join flow: select persona → fill traits → join → appears in directory
- Full approval flow: request → CO reviews → approve → member appears
- Full approval flow: request → CO declines → member NOT in directory, notified
- Promote → verify role change persisted → verify analytics access granted
- Leave → verify membership removed → verify member count updated

### E2E Tests

- CM joins open community via public page → sees onboarding → completes traits → appears in search
- CM requests to join approval community → CO reviews → approves → CM sees community dashboard
- CO promotes member to steward → steward sees Members management tab
- CM leaves community → community no longer appears in "My Communities"
- CM switches persona → community sees different skills/traits

---

## 10. Implementation Order

1. `joinCommunity` server action (open flow only)
2. Persona selection component
3. Member traits form (dynamic from schema)
4. Join page UI (`/communities/[slug]/join`)
5. `listCommunityMembers` server action
6. Members tab on community dashboard (read-only list)
7. Member card component
8. `communityJoinRequests` schema + migration
9. `requestToJoinCommunity` + `reviewJoinRequest` server actions
10. Pending requests UI on Members tab (steward/admin view)
11. `updateMemberRole` + promote/demote UI
12. `leaveCommunity` + `removeMember` server actions
13. `switchCommunityPersona` server action
14. Onboarding flow component
15. `updateDirectoryOptIn` server action + member settings UI
16. Directory opt-in toggle in join flow (when community has public directory)
