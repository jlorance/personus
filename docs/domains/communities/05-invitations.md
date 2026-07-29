---
type: spec
title: Communities — Invitations
description: "How COs grow their communities. Covers invite links, invite codes, direct invitations, invite tracking, and the onboarding flow for people arriving via invite."
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Invitations

> Date: 2026-02-23
> Status: Draft (planned)
> Depends on: `00-prd.md`, `02-membership.md`
> Primary actor: Community Organizer (CO)

How COs grow their communities. Covers invite links, invite codes, direct invitations, invite tracking, and the onboarding flow for people arriving via invite.

> **What shipped (PER-8, Done):** The minimal token-based invitation flow for `invite_only` communities is live. An admin calls `createInvitation(principal, slug)` to mint a single-use `inv_*` token; the invitee claims it with `claimInvitation(principal, token, personaUri)` to join. Admin UI at `/communities/[slug]/requests`. Schema: `community_invitations` table. This is narrower than the full invitation system this spec describes (no shareable links, no email delivery, no per-link usage limits or expiry UI).
>
> The richer invitation system below — reusable links, email delivery, invite tracking dashboard — is `status: planned`.

---

## 1. Invite Methods

### 1.1 Shareable Invite Link

The primary growth mechanism. A URL the CO shares in Discord, posts in a Telegram group, or adds to their Instagram bio.

```
https://personus.ai/invite/[code]
```

- **Code:** 8-character alphanumeric (e.g., `aBc12XyZ`), URL-safe
- **Reusable:** Multiple people can join with the same link (until limit or expiry)
- **Configurable:** CO sets max uses and optional expiry date
- **Revocable:** CO can disable a link without affecting existing members

**Generate UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Invite Members                                           │
│                                                          │
│ Share this link to invite people:                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://personus.ai/invite/aBc12XyZ    [Copy] [QR]  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Settings:                                                │
│ Max uses: [Unlimited ▾]   Expires: [Never ▾]            │
│                                                          │
│ [Generate New Link]   [Manage Links]                     │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Direct Invitation (Email or Username)

CO invites specific people by email or Personus username.

```
┌─────────────────────────────────────────────────────────┐
│ Invite Someone                                           │
│                                                          │
│ Email or Personus username:                              │
│ [alice@example.com              ]                        │
│                                                          │
│ Personal message (optional):                             │
│ [Your photography skills would be great here!  ]         │
│                                                          │
│ [Send Invitation]                                        │
└─────────────────────────────────────────────────────────┘
```

- If the person is already on Personus: in-app notification + email
- If the person is not on Personus: email invitation with sign-up link that pre-attaches the community invite

### 1.3 Invite Code (Short Code)

For verbal sharing: "Join my community on Personus, code is `PHOTO42`"

- 6-character uppercase alphanumeric
- Entered at `/join` or in the app search
- Same backend as invite link, just a different UI entry point

---

## 2. Schema

```typescript
export const communityInvites = pgTable('community_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id),
  code: text('code').unique().notNull(),          // 8-char for links, 6-char for codes
  type: text('type').notNull().default('link'),   // 'link' | 'code' | 'direct'
  status: text('status').notNull().default('active'),
    // 'active' | 'pending' | 'joined' | 'declined' | 'expired' | 'cancelled' | 'exhausted'
    // Links/codes start 'active'; direct invites start 'pending'
  maxUses: integer('max_uses'),                    // null = unlimited
  useCount: integer('use_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),              // null = never
  // Direct invite fields
  inviteeEmail: text('invitee_email'),             // For direct invites
  inviteeUserId: uuid('invitee_user_id').references(() => users.id),
  personalMessage: text('personal_message'),
  lastResentAt: timestamp('last_resent_at'),       // Tracks most recent resend
  respondedAt: timestamp('responded_at'),          // When invitee joined or declined
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_invites_community').on(table.communityId),
  index('idx_invites_code').on(table.code),
  index('idx_invites_created_by').on(table.createdByUserId),
  index('idx_invites_status').on(table.communityId, table.status),
]);

// Tracks which user joined through which invite (link/code)
export const communityInviteRedemptions = pgTable('community_invite_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  inviteId: uuid('invite_id')
    .notNull()
    .references(() => communityInvites.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  personaId: uuid('persona_id')
    .references(() => personas.id),               // Which persona they joined with
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  index('idx_redemptions_invite').on(table.inviteId),
  uniqueIndex('uq_redemption_invite_user').on(table.inviteId, table.userId),
]);
```

> **Why a separate `communityInviteRedemptions` table?** Link and code invites can be used by many people. The redemptions table tracks *who* responded to each generic invite, powering the respondents detail view (§5.6). Direct invites are 1:1 so their status is tracked directly on the invite row.

---

## 3. Server Actions

```typescript
// ── Create invites ──────────────────────────────────────

createInviteLink(input: {
  communityId: string;
  maxUses?: number;
  expiresAt?: Date;
}): Promise<{ code: string; url: string }>
// Steward+ role required. Generates 8-char code. Status = 'active'.

createInviteCode(input: {
  communityId: string;
  maxUses?: number;
  expiresAt?: Date;
}): Promise<{ code: string }>
// Steward+ role required. Generates 6-char uppercase code. Status = 'active'.

sendDirectInvite(input: {
  communityId: string;
  email?: string;
  username?: string;             // Either email or username required
  message?: string;
}): Promise<void>
// Steward+ role required. Creates invite (status = 'pending') + sends email/notification.
// If user exists on Personus: in-app notification + email.
// If not on Personus: email with sign-up link that preserves invite context.

// ── Manage invites (table view) ─────────────────────────

listInvites(input: {
  communityId: string;
  type?: 'link' | 'code' | 'direct';
  status?: 'active' | 'pending' | 'joined' | 'declined' | 'expired' | 'cancelled' | 'exhausted';
  createdByUserId?: string;
  limit?: number;                // Default 25
  offset?: number;
}): Promise<{
  invites: CommunityInviteRow[];
  total: number;
}>
// Steward+ role required. Powers the invite management table.

interface CommunityInviteRow {
  id: string;
  type: 'link' | 'code' | 'direct';
  code: string;
  status: string;
  createdByUser: { id: string; displayName: string };
  inviteeEmail?: string;           // Direct invites
  inviteeUser?: { id: string; displayName: string };  // If invitee is on Personus
  maxUses?: number;
  useCount: number;
  expiresAt?: string;
  lastResentAt?: string;
  respondedAt?: string;
  createdAt: string;
}

listInviteRedemptions(input: {
  inviteId: string;
  limit?: number;                // Default 25
  offset?: number;
}): Promise<{
  redemptions: InviteRedemption[];
  total: number;
}>
// Steward+ role required. Shows who joined through a specific link/code.

interface InviteRedemption {
  userId: string;
  displayName: string;
  personaName?: string;           // The persona they joined with
  joinedAt: string;
  memberStatus: string;           // Current membership status (active, removed, etc.)
}

// ── Invite actions ──────────────────────────────────────

cancelInvite(inviteId: string): Promise<void>
// Creator of invite or admin. Sets status = 'cancelled'.
// Active links/codes stop accepting new uses. Pending direct invites become invalid.

resendDirectInvite(inviteId: string): Promise<void>
// Creator of invite or admin. Re-sends email/notification.
// Only valid for direct invites with status = 'pending'.
// Updates lastResentAt timestamp.

// ── Redeem (public) ─────────────────────────────────────

redeemInvite(code: string): Promise<{
  community: PublicCommunityCard;
  joinPolicy: string;
  alreadyMember: boolean;
}>
// Public. Validates code is active/not expired/not exhausted.
// Returns community info for join flow.
// On successful join: increments useCount, creates redemption record,
// transitions direct invites to 'joined' status.
```

---

## 4. Invite Landing Page

### 4.1 Route

`/invite/[code]` — Public landing page for invite links

### 4.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ You've been invited to                                   │
│                                                          │
│ [🔧] Tri-County Electrical Workers Guild                │
│ Guild  •  95 members  •  Nashville, TN                   │
│                                                          │
│ "Licensed electricians in the greater Nashville area.    │
│  Specialties: commercial, residential, solar..."         │
│                                                          │
│ Invited by: Sarah K. (admin)                             │
│ "Your electrical skills would be a great fit!"           │
│                                                          │
│ [Join This Community]          [Learn More]              │
│                                                          │
│ Not on Personus yet?                                     │
│ [Sign Up & Join]                                         │
└─────────────────────────────────────────────────────────┘
```

**Flow:**
- Already logged in → "Join" takes them to persona selection + member traits
- Not logged in → "Sign Up & Join" → auth flow → return to join with invite context preserved
- Invite expired/revoked → "This invite is no longer valid" with community public page link

---

## 5. Invite Management

### 5.1 Route

Settings tab → **Invites** (accessible to Steward+ roles)

This is the CO's operational hub for all invite activity. A table view provides at-a-glance status of every invite, with actions inline and new invite creation accessible from the same surface.

### 5.2 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Invites                                                              │
│                                                                      │
│ [+ Invite Link]  [+ Invite Code]  [+ Invite Someone]                │
│                                                                      │
│ Type: [All ▾]  Status: [All ▾]  Created by: [All ▾]                 │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Type     │ Invite              │ Created    │ Status   │ Actions │ │
│ ├──────────┼─────────────────────┼────────────┼──────────┼─────────┤ │
│ │ 🔗 Link  │ /invite/aBc12XyZ   │ Feb 20     │ Active   │ [Copy]  │ │
│ │          │ by Sarah K.         │ 12 uses    │          │ [Cancel]│ │
│ ├──────────┼─────────────────────┼────────────┼──────────┼─────────┤ │
│ │ 🔑 Code  │ PHOTO42            │ Feb 18     │ Active   │ [Copy]  │ │
│ │          │ by Sarah K.         │ 3/20 uses  │ Exp Mar 1│ [Cancel]│ │
│ ├──────────┼─────────────────────┼────────────┼──────────┼─────────┤ │
│ │ ✉️ Direct │ alice@example.com  │ Feb 22     │ Pending  │[Resend] │ │
│ │          │ by Sarah K.         │            │          │ [Cancel]│ │
│ ├──────────┼─────────────────────┼────────────┼──────────┼─────────┤ │
│ │ ✉️ Direct │ jordan@example.com │ Feb 19     │ Joined   │         │ │
│ │          │ by Mike R.          │ Feb 20     │ as Jordan│         │ │
│ ├──────────┼─────────────────────┼────────────┼──────────┼─────────┤ │
│ │ 🔗 Link  │ /invite/xYz98AbC   │ Jan 15     │ Cancelled│         │ │
│ │          │ by Sarah K.         │ 4 uses     │          │         │ │
│ └──────────┴─────────────────────┴────────────┴──────────┴─────────┘ │
│                                                                      │
│ Showing 5 of 23 invites                            [Load more]       │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Filters

| Filter | Options | Purpose |
|--------|---------|---------|
| **Type** | All, Link, Code, Direct | Segment by invite method |
| **Status** | All, Active, Pending, Joined, Expired, Cancelled | See what's outstanding vs. resolved |
| **Created by** | All stewards/admins who have sent invites | Multi-steward communities: see who sent what |

### 5.4 Statuses

| Status | Applies to | Meaning |
|--------|-----------|---------|
| **Active** | Link, Code | Invite is live and accepting new uses |
| **Pending** | Direct | Sent but not yet accepted or declined |
| **Joined** | Direct | Invitee accepted and is now a member |
| **Declined** | Direct | Invitee explicitly declined |
| **Expired** | Link, Code, Direct | Past the `expiresAt` date |
| **Cancelled** | Link, Code, Direct | CO revoked the invite |
| **Exhausted** | Link, Code | `useCount` has reached `maxUses` |

### 5.5 Row Actions

| Action | Applies to | What it does |
|--------|-----------|-------------|
| **Copy** | Link, Code | Copies the invite URL or code to clipboard |
| **Resend** | Direct (Pending only) | Re-sends the email/notification; updates `lastResentAt` |
| **Cancel** | Active/Pending only | Sets `isActive = false`; no one can use it going forward |

Joined, Declined, Expired, Cancelled, and Exhausted invites have no actions (read-only history).

### 5.6 Respondents View (Link/Code Detail)

Tapping a Link or Code row expands to show who joined through it:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔗 /invite/aBc12XyZ — 12 uses                                       │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Who        │ Joined     │ Persona              │ Status        │   │
│ ├────────────┼────────────┼──────────────────────┼───────────────┤   │
│ │ Jordan M.  │ Feb 21     │ Jordan — Electrician │ Active member │   │
│ │ Alex K.    │ Feb 21     │ Alex — Solar Tech    │ Active member │   │
│ │ Casey L.   │ Feb 22     │ Casey — Apprentice   │ Active member │   │
│ │ ...        │            │                      │               │   │
│ └────────────┴────────────┴──────────────────────┴───────────────┘   │
│                                                                      │
│ Showing 3 of 12 respondents                       [Load more]        │
└──────────────────────────────────────────────────────────────────────┘
```

This lets the CO see *which* generic link/code is performing and who responded to each. Useful for tracking which channel (Discord post vs. Instagram bio vs. verbal share) drives the most joins.

---

## 6. Test Criteria

### Invite Creation
- Invite link generates valid 8-char code with status `active`
- Invite code generates valid 6-char uppercase code with status `active`
- Direct invite creates row with status `pending` and sends email
- Direct invite to existing Personus user also sends in-app notification
- Steward+ can create invites; members cannot (role check)

### Invite Redemption
- Redeem valid link/code invite returns community info
- Redeem expired invite returns error
- Redeem cancelled invite returns error
- Redeem exhausted invite (useCount = maxUses) returns error
- Successful join: increments `useCount`, creates redemption record
- Successful join via direct invite: transitions status to `joined`, sets `respondedAt`
- Join via invite records `invitedByUserId` on membership

### Invite Management Table
- `listInvites` returns all invites for community, paginated
- Filter by type (link/code/direct) returns only matching rows
- Filter by status returns only matching rows
- Filter by creator returns only their invites
- `cancelInvite` sets status to `cancelled`; invite link/code stops working
- `resendDirectInvite` re-sends email and updates `lastResentAt`
- `resendDirectInvite` on non-pending invite returns error

### Respondents View
- `listInviteRedemptions` returns users who joined through a link/code
- Redemption records include persona name and current membership status
- Unique constraint prevents duplicate redemption records per user per invite

---

## 7. Implementation Order

1. `communityInvites` + `communityInviteRedemptions` schema + migration
2. `createInviteLink` server action
3. `redeemInvite` server action (with redemption record creation)
4. Invite landing page (`/invite/[code]`)
5. `createInviteCode` server action
6. `sendDirectInvite` server action + email/notification
7. `listInvites` server action (with filters, pagination)
8. `cancelInvite` + `resendDirectInvite` server actions
9. Invite management table UI (Settings → Invites tab)
10. Table filters (type, status, created by)
11. `listInviteRedemptions` server action
12. Respondents detail view (expandable row for link/code invites)
13. Quick-create buttons at top of table ([+ Invite Link], [+ Invite Code], [+ Invite Someone])
14. Status auto-transitions (active → expired when past `expiresAt`, active → exhausted when `useCount = maxUses`)
