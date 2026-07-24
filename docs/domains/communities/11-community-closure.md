---
type: spec
title: Communities — Community Closure
description: "How a community ends. Covers the full wind-down process: founder initiates closure, members are notified, data is preserved or exported, integrations are disconnected, and the community is…"
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Community Closure

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-community-lifecycle.md`, `02-membership.md`, `08-notifications.md`
> Primary actor: Community Founder (the `foundingUserId`)

How a community ends. Covers the full wind-down process: founder initiates closure, members are notified, data is preserved or exported, integrations are disconnected, and the community is archived or permanently deleted.

---

## 1. Why This Is Its Own Spec

Closing a community affects every other spec — memberships, endorsements, notices, integrations, notifications, the public page, search indexes, billing, and member data. It's not a single button; it's a multi-step process that respects the people who invested in the community.

A community with 200 members, active notices, and connected platforms can't just vanish. The closure process gives the founder control while giving members time and information.

---

## 2. Who Can Close a Community

**Only the founding user** (`foundingUserId`). Not any admin — the founder specifically. This is an irreversible, high-stakes action.

If the founder wants to leave but keep the community alive, they must **transfer ownership** first (see `01-community-lifecycle.md` §3.2.5). The new owner then becomes the only person who can close it.

---

## 3. Closure vs. Archive

Two distinct paths:

| Path | What Happens | Reversible | Data |
|------|-------------|-----------|------|
| **Archive** | Community goes dormant. Hidden from Explore, read-only for members, public page shows "archived" banner. Can be unarchived by founder. | Yes | All data preserved |
| **Close (Delete)** | Community enters a wind-down period, then is permanently deleted. | During grace period only | Permanently removed after grace period |

The founder chooses between these in the Danger Zone (§5).

---

## 4. Archive Flow

The lighter option — the community goes to sleep but can wake up.

### 4.1 What Happens

```
Founder clicks "Archive Community" in Danger Zone
  │
  ├─ Confirmation: "Type the community name to confirm"
  │
  ├─ Immediate effects:
  │  ├─ Community status set to 'archived'
  │  ├─ Public presence → hidden (removed from Explore, public page shows archive banner)
  │  ├─ All members notified: "[Community] has been archived by the organizer"
  │  ├─ Dashboard becomes read-only for all members
  │  ├─ No new joins, invites, notices, or endorsements
  │  ├─ Active notices immediately expire
  │  ├─ Integrations paused (bots stop responding, sync stops)
  │  ├─ Existing data is preserved — members, endorsements, traits, activity history
  │  └─ Activity event logged: 'community_archived'
  │
  └─ Members see:
     ┌─────────────────────────────────────────────────────────┐
     │ ⚠️ This community has been archived                      │
     │                                                          │
     │ [Community Name] was archived on Feb 23, 2026.           │
     │ Your membership, endorsements, and community traits      │
     │ are preserved but the community is read-only.            │
     │                                                          │
     │ [Export My Data]  [Leave Community]                       │
     └─────────────────────────────────────────────────────────┘
```

### 4.2 Unarchive

The founder can unarchive at any time:

```
Founder visits archived community dashboard
  │
  ├─ Banner: "This community is archived. [Reactivate]"
  │
  ├─ Click "Reactivate" → confirmation dialog
  │
  └─ Immediate effects:
     ├─ Community status set back to 'active'
     ├─ Public presence restored to previous setting
     ├─ All members notified: "[Community] has been reactivated!"
     ├─ Integrations resumed (bots reconnect, sync restarts)
     ├─ Dashboard becomes read-write again
     └─ Activity event logged: 'community_reactivated'
```

**No time limit on archive.** A community can stay archived indefinitely. Data is never deleted from an archived community.

---

## 5. Close (Delete) Flow

The permanent option. Multi-step process with a grace period.

### 5.1 Step 1: Initiate Closure

```
Founder clicks "Close Community" in Danger Zone
  │
  ├─ Confirmation dialog:
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │ Close [Community Name]?                                   │
  │  │                                                          │
  │  │ This will permanently delete this community after a      │
  │  │ 30-day wind-down period. During this period:             │
  │  │                                                          │
  │  │ • Members will be notified and can export their data     │
  │  │ • The community will be read-only                        │
  │  │ • No new members can join                                │
  │  │ • You can cancel the closure at any time                 │
  │  │                                                          │
  │  │ After 30 days, all community data will be permanently    │
  │  │ deleted — memberships, endorsements, notices, activity   │
  │  │ history, and community traits.                           │
  │  │                                                          │
  │  │ Member traits and personal endorsements are NOT          │
  │  │ affected — they belong to the members.                   │
  │  │                                                          │
  │  │ Type "CLOSE [Community Name]" to confirm:                │
  │  │ [                                                  ]     │
  │  │                                                          │
  │  │ Optional: Closure message to members                     │
  │  │ [Thanks everyone for an amazing 3 years. I'm moving     ]│
  │  │ [and can't keep this going. Join Eastside Runners!      ]│
  │  │                                                          │
  │  │ [Cancel]  [Close Community]                              │
  │  └─────────────────────────────────────────────────────────┘
  │
  └─ Result:
     ├─ Community status set to 'closing'
     ├─ closureInitiatedAt timestamp recorded
     ├─ closureMessage stored (optional)
     ├─ 30-day grace period begins
     └─ Activity event logged: 'community_closure_initiated'
```

### 5.2 Step 2: Wind-Down Period (30 Days)

During the grace period, the community is in a "closing" state.

**What changes immediately:**
- Public page shows a closure banner with the date and founder's message
- Community removed from Explore and search results
- No new joins, invites, or join requests accepted
- No new notices or endorsements
- Dashboard shows a prominent closure countdown
- All integrations disconnected (bots removed, sync stopped)

**What stays the same:**
- Existing members can still view the community, member directory, and their own data
- Members can export their community-specific data (member traits, endorsements received)
- Members can leave voluntarily at any time
- The founder can cancel the closure (see §5.4)

**Member experience during wind-down:**

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ [Community Name] is closing                            │
│                                                          │
│ This community will be permanently deleted on             │
│ March 25, 2026 (28 days remaining).                      │
│                                                          │
│ Message from the organizer:                              │
│ "Thanks everyone for an amazing 3 years. I'm moving      │
│  and can't keep this going. Join Eastside Runners!"      │
│                                                          │
│ [Export My Data]  [Leave Community]                       │
│                                                          │
│ Your personal traits, endorsements you've given to       │
│ others, and your traits are NOT affected.                 │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Step 3: Final Deletion

After 30 days, automatic deletion runs:

```
Day 30 (automated):
  │
  ├─ Final notification to all remaining members:
  │  "[Community Name] has been permanently closed."
  │
  ├─ Data deleted (CASCADE):
  │  ├─ community_members rows
  │  ├─ community_join_requests rows
  │  ├─ community_notices rows
  │  ├─ community_favorites rows
  │  ├─ community_unmet_needs rows
  │  ├─ community_relationships rows (partners notified — see 12-community-relationships.md §8)
  │  ├─ Community-scoped endorsements
  │  ├─ Community activity events
  │  ├─ Integration records (platform_channel_bindings table rows for this community)
  │  ├─ Community traits, settings, embedding
  │  └─ communities row itself
  │
  ├─ Data preserved (belongs to users, not the community):
  │  ├─ User accounts and user traits
  │  ├─ Personas (the persona still exists, just no longer attached to this community)
  │  ├─ Non-community-scoped endorsements
  │  └─ Contact request history (with community reference nullified)
  │
  ├─ Slug released (can be reused by a new community after 90 days)
  │
  └─ Activity event logged to affected users: 'community_deleted'
```

### 5.4 Cancel Closure

The founder can cancel at any time during the 30-day grace period:

```
Founder visits closing community dashboard
  │
  ├─ Banner: "This community is closing in [N] days. [Cancel Closure]"
  │
  ├─ Click "Cancel Closure" → confirmation
  │
  └─ Result:
     ├─ Community status set back to 'active'
     ├─ closureInitiatedAt cleared
     ├─ Public presence restored
     ├─ All members notified: "Good news — [Community] is no longer closing!"
     ├─ Integrations must be manually reconnected (they were disconnected at initiation)
     └─ Activity event logged: 'community_closure_cancelled'
```

**Note on integrations:** Platform integrations (Discord bots, Slack apps, etc.) are disconnected immediately when closure is initiated — this is intentional, not a bug. Bots shouldn't keep running in a closing community. If the founder cancels, they'll need to reconnect integrations manually, which is a deliberate "are you sure you want this running again?" moment.

---

## 6. Data Export

Members should be able to take their community-specific data with them before a community closes (or anytime, really — but the closure flow makes it prominent).

### 6.1 What Can Be Exported

| Data | Format | Notes |
|------|--------|-------|
| Member traits | JSON | The member's `memberTraits` JSONB for this community |
| Endorsements received | JSON | Community-scoped endorsements where this member is the subject |
| Endorsements given | JSON | Endorsements this member wrote in this community |
| Community membership history | JSON | Join date, role history, community name/type |
| Notices posted | JSON | Notices the member authored (active + expired) |

### 6.2 What Cannot Be Exported

- Other members' data (privacy)
- Community-wide analytics or activity logs
- The community's own traits or settings
- Search history

### 6.3 Export Format

Single JSON file: `[community-slug]-export-[date].json`

```typescript
interface CommunityDataExport {
  exportedAt: string;
  community: {
    name: string;
    slug: string;
    type: string;
    joinedAt: string;
    role: string;
  };
  memberTraits: Record<string, unknown>;
  endorsementsReceived: {
    endorserName: string;
    strength: string;
    content: string;
    createdAt: string;
  }[];
  endorsementsGiven: {
    subjectName: string;
    strength: string;
    content: string;
    createdAt: string;
  }[];
  noticesPosted: {
    type: string;
    body: string;
    createdAt: string;
    expiresAt: string;
  }[];
}
```

### 6.4 Server Action

```typescript
exportMyCommunityData(communityId: string): Promise<CommunityDataExport>
// Any member can export their own data at any time.
// During closure wind-down, the Export button is prominently displayed.
// No rate limiting needed (one member, one community, one export).
```

---

## 7. Notifications

### 7.1 Archive Notifications

| Event | Recipients | Channel |
|-------|-----------|---------|
| Community archived | All members | In-app + email |
| Community reactivated | All members | In-app + email |

### 7.2 Closure Notifications

| Event | Recipients | Channel | Timing |
|-------|-----------|---------|--------|
| Closure initiated | All members | In-app + email | Immediately |
| Closure reminder (week 2) | All remaining members | In-app + email | Day 14 |
| Closure reminder (final week) | All remaining members | In-app + email | Day 23 |
| Community deleted | All remaining members | Email only (community no longer exists in-app) | Day 30 |
| Closure cancelled | All members | In-app + email | Immediately |

**Email content for closure initiated:**
> Subject: [Community Name] is closing
>
> [Founder Name] has decided to close [Community Name]. The community will be permanently deleted on [date].
>
> [If closure message]: "[closure message text]"
>
> Your personal data (traits, endorsements to other communities) is NOT affected.
>
> Before [date], you can:
> - Export your community data
> - View your endorsements and member traits one last time
> - Leave the community on your own terms
>
> [Export My Data] [View Community]

---

## 8. Schema Additions

```typescript
// Addition to communities table (or communities.settings JSONB):

communities.status: text('status').notNull().default('active'),
  // 'active' | 'archived' | 'closing'

communities.closureInitiatedAt: timestamp('closure_initiated_at'),
  // When the founder initiated closure. NULL if not closing.

communities.closureMessage: text('closure_message'),
  // Optional message from the founder. Max 1000 chars.

communities.archivedAt: timestamp('archived_at'),
  // When the community was archived. NULL if not archived.
```

**Status transitions:**

```
active → archived    (archive)
archived → active    (unarchive)
active → closing     (initiate closure)
closing → active     (cancel closure, within 30 days)
closing → [deleted]  (day 30, automated)
```

**No `archived → closing` transition.** If a founder wants to delete an archived community, they must unarchive it first, then close it. This is intentional — archiving is the "I might come back" path, closure is the "I'm done" path. Forcing them through unarchive first is a deliberate speed bump.

---

## 9. Server Actions

```typescript
archiveCommunity(communityId: string): Promise<void>
// Founder only. Sets status to 'archived'. Notifies all members.
// Pauses integrations. Sets archivedAt.

unarchiveCommunity(communityId: string): Promise<void>
// Founder only. Sets status back to 'active'. Notifies all members.
// Resumes integrations. Clears archivedAt.

initiateCommunityClosure(input: {
  communityId: string;
  message?: string;          // Optional founder message, max 1000 chars
}): Promise<{ closureDate: Date }>
// Founder only. Sets status to 'closing'. Records closureInitiatedAt.
// Disconnects integrations. Sends notifications.
// Returns the date when permanent deletion will occur.

cancelCommunityClosure(communityId: string): Promise<void>
// Founder only. Only valid when status is 'closing'.
// Sets status back to 'active'. Clears closureInitiatedAt.
// Sends notifications. Integrations must be manually reconnected.

exportMyCommunityData(communityId: string): Promise<CommunityDataExport>
// Any member. Returns their community-specific data as JSON.

// Internal (cron or background job):
processExpiredClosures(): Promise<{ deleted: string[] }>
// Runs daily. Finds communities where status = 'closing' AND
// closureInitiatedAt + 30 days <= now(). Deletes them.
// Sends final notification emails.
```

---

## 10. Validation Schemas

```typescript
// lib/validations/communities.ts (additions)

initiateCommunityClosureSchema = z.object({
  communityId: z.string().uuid(),
  message: z.string().max(1000).optional(),
});

exportCommunityDataSchema = z.object({
  communityId: z.string().uuid(),
});
```

---

## 11. Edge Cases

### 11.1 Closing a Community with Active Billing

If the community is on a paid CO plan:
- Closure initiates immediately regardless of billing status
- Billing is cancelled at the end of the current billing period
- No refunds for the current period (standard SaaS practice)
- If the founder cancels closure, billing resumes normally

### 11.2 Closing a Community with Active Guild Requests

If the community is a guild with pending requests from external clients:
- All pending guild requests are marked as `cancelled` with reason "Community closing"
- Requesters are notified: "The guild you submitted a request to is closing"
- No new requests accepted during wind-down

### 11.3 Transfer Ownership During Closure

Not allowed. The founder must cancel the closure first, then transfer ownership if they want someone else to take over.

### 11.4 Last Admin Scenario

If all other admins leave during the wind-down period, the founder remains the sole admin. The closure proceeds on schedule. The founder cannot leave their own closing community — they see the countdown but can't use "Leave Community."

### 11.5 Community with External Platform Presence

When integrations are disconnected during closure:
- Discord/Slack/Telegram bots are removed from the external platforms
- A final message is posted by the bot: "This Personus community is closing. The bot will be removed."
- External platform groups/channels continue to exist — Personus only removes its own bot

---

## 12. Test Criteria

### Unit Tests

- `archiveCommunity` sets status to 'archived', sets archivedAt
- `archiveCommunity` rejects non-founder
- `unarchiveCommunity` sets status back to 'active', clears archivedAt
- `unarchiveCommunity` rejects when status is not 'archived'
- `initiateCommunityClosure` sets status to 'closing', records timestamp and message
- `initiateCommunityClosure` rejects non-founder
- `initiateCommunityClosure` rejects when status is 'archived' (must unarchive first)
- `cancelCommunityClosure` sets status back to 'active', clears closure fields
- `cancelCommunityClosure` rejects when status is not 'closing'
- `exportMyCommunityData` returns only the requesting member's data
- `exportMyCommunityData` excludes other members' data
- `processExpiredClosures` deletes communities past 30-day grace period
- `processExpiredClosures` does not delete communities within grace period
- Community in 'closing' status rejects new joins, invites, notices, endorsements
- Community in 'archived' status is read-only (rejects all mutations)
- Slug is released 90 days after deletion

### Integration Tests

- Archive → members see archive banner → unarchive → banner gone
- Initiate closure → members notified → export data → data matches expectations
- Initiate closure → cancel within grace period → community fully restored
- Initiate closure → 30 days pass → community deleted → members notified by email
- Initiate closure → integrations disconnected → cancel → integrations require manual reconnect

### E2E Tests

- Founder archives community → member sees read-only view → founder unarchives → member can post again
- Founder initiates closure → member exports data → verifies JSON contains their endorsements and traits
- Founder initiates closure → views countdown → cancels on day 15 → community restored
- Non-founder admin cannot access archive or close actions

---

## 13. Implementation Order

1. `communities.status` column + `closureInitiatedAt` + `archivedAt` + `closureMessage` schema additions
2. `archiveCommunity` + `unarchiveCommunity` server actions
3. Archive banner component (displayed on dashboard and public page)
4. `initiateCommunityClosure` server action with confirmation dialog
5. Closure banner component with countdown and founder message
6. Read-only enforcement: middleware/guards that check community status before mutations
7. `cancelCommunityClosure` server action
8. `exportMyCommunityData` server action + download UI
9. Closure notification emails (initiated, reminders, final)
10. `processExpiredClosures` background job (cron)
11. Integration disconnection during closure + bot farewell message
12. Danger Zone UI in Settings (archive, close, transfer ownership)
