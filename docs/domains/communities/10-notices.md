---
type: spec
title: Communities — Notices
description: "A lightweight community bulletin board. Members post short, time-bound asks and offers. Not a message board — no replies, no ratings, no threading. Notices expire automatically. If someone wants…"
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Notices

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `02-membership.md`
> Primary actor: Community Member (CM)

A lightweight community bulletin board. Members post short, time-bound asks and offers. Not a message board — no replies, no ratings, no threading. Notices expire automatically. If someone wants to respond, they use the standard introduction request flow.

---

## 1. What Notices Are (and Aren't)

### What They Are

- **Short posts** — a sentence or two, like a classified ad or a sticky note on a community board
- **Time-bound** — every notice has an expiration (1 day to 30 days, chosen by the poster)
- **One-way** — the poster broadcasts to the community; interested members reach out privately
- **Actionable** — "looking for X", "offering Y", "heads up about Z"

### What They Aren't

- **Not a message board** — no replies, no comment threads, no quote-retweets
- **Not a feed** — no infinite scroll, no algorithmic ranking, no engagement metrics
- **Not a chat** — the conversation happens on Discord/Slack/Telegram, not here
- **Not rated** — no likes, upvotes, or reactions (prevents popularity contests)

### Why This Constraint

Personus is an intelligence layer, not a social network. The moment we add replies, we're competing with Discord. The moment we add likes, we're incentivizing engagement farming. Notices give members a voice without turning Personus into a content platform.

A notice is a **signal** — "I need help with X" or "I'm offering Y." The **response** happens through Personus's mediated contact system (introduction requests), which preserves the privacy model.

---

## 2. Notice Types

| Type | Icon | Example |
|------|------|---------|
| **Looking for** | magnifying glass | "Looking for 2-3 collaborators to build a mutant vehicle for Burning Man" |
| **Offering** | gift | "Offering free headshots this Saturday at Golden Gate Park" |
| **Heads up** | megaphone | "FYI: The city just posted new licensing requirements for solar installers" |
| **General** | message | "Anyone going to the Portland Maker Faire next month?" |

Types are for display/filtering only — they don't change behavior.

---

## 3. Posting a Notice

### 3.1 Entry Points

- Community dashboard → **Action bar** → [Post Notice] (primary — always visible, see `01-community-lifecycle.md` §2.4)
- Community dashboard → Notices tab → [Post a Notice]
- Community dashboard → Overview → Recent Notices section → [Post a Notice]
- Community CX Chat → member says "I can help with X" → coach suggests posting a notice → prefills form

### 3.2 Post Form

```
+-------------------------------------------------------------+
| Post a Notice                                                |
|                                                              |
| Type: [Looking for v]                                        |
|                                                              |
| What's on your mind?                                         |
| +----------------------------------------------------------+|
| | Looking for 2-3 collaborators to build a mutant vehicle  ||
| | for Burning Man. Need welding, LED wiring, and someone   ||
| | with a trailer. 6-month project starting March.          ||
| +----------------------------------------------------------+|
| 280 / 500 characters                                        |
|                                                              |
| Expires in: [2 weeks v]                                      |
|                                                              |
| [Cancel]  [Post Notice]                                      |
+-------------------------------------------------------------+
```

### 3.3 Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max length | 500 characters | Keep it short — this is a bulletin board, not a blog |
| Min length | 20 characters | Prevent empty or trivial posts |
| Duration options | 1 day, 3 days, 1 week, 2 weeks, 1 month | All notices expire — no permanent content |
| Max active per member | 3 per community | Prevent flooding |
| Who can post | Controlled by `communities.settings.noticePolicy` (see `01-community-lifecycle.md` §2.4). Default: `all_members` (any non-suspended member). Alternative: `stewards_and_admins` | Stewards/admins can also delete any notice |
| Formatting | Plain text only | No markdown, no links, no images — keeps it simple and safe |

---

## 4. Viewing Notices

### 4.1 Notices Tab

```
+-------------------------------------------------------------+
| Notices (8 active)                          [Post a Notice]  |
|                                                              |
| Filter: [All v]                                              |
|                                                              |
| +----------------------------------------------------------+|
| | [magnifying glass] Looking for                            ||
| | "Looking for 2-3 collaborators to build a mutant         ||
| |  vehicle for Burning Man. Need welding, LED wiring..."   ||
| | Posted by Carlos M. * 2 days ago * Expires in 12 days    ||
| | [Contact Carlos]                                          ||
| +----------------------------------------------------------+|
| | [gift] Offering                                           ||
| | "Offering free headshots this Saturday at Golden Gate     ||
| |  Park. DM me to reserve a slot."                         ||
| | Posted by Nadia K. * 5 hours ago * Expires in 2 days     ||
| | [Contact Nadia]                                           ||
| +----------------------------------------------------------+|
| | [megaphone] Heads up                                      ||
| | "FYI: The city just posted new licensing requirements     ||
| |  for solar installers. Check their website."              ||
| | Posted by Sarah K. (admin) * 1 day ago * Expires in 6d   ||
| +----------------------------------------------------------+|
+-------------------------------------------------------------+
```

### 4.2 Overview Section

The community Overview tab shows the 3 most recent active notices in a compact format, with a "View all notices" link to the full tab.

### 4.3 Public Page & Public Directory

Notices are the highest-priority content on the public-facing pages (see `01-community-lifecycle.md` §4.4):

- **Full Profile public page:** Shows up to 3 most recent active notices in a "What's Happening" section at the top of the page, before capabilities and featured members.
- **Public directory page:** Shows up to 2 most recent active notices above the search bar and member listing (see `03-member-directory.md` §12.4).
- **Discoverable public page:** Does not show notices (not enough context without the full profile).

This gives notices a dual purpose: they help members communicate internally AND they make the public page feel alive to visitors. A guild with a recent "Offering free estimates" notice is more compelling than one with only static skill lists.

**Public notice display:** Author names are shown (first name + last initial), but the [Contact Name] button is not available — visitors use the community's join flow or the "Contact the Organizer" option instead. Only the `body`, `type`, `authorName`, and timestamps are exposed publicly.

### 4.4 Display Rules

- Notices shown in reverse chronological order (newest first)
- Expired notices are hidden (never shown, auto-archived)
- Filter by type (Looking for / Offering / Heads up / General / All)
- No pagination needed at launch — communities won't have hundreds of active notices given the constraints
- [Contact Name] button triggers the standard introduction request flow (`app/actions/contacts.ts`)

---

## 5. Managing Notices

### 5.1 Author Actions

- **Delete own notice** — removes immediately (confirmation dialog)
- **Edit not supported** — post a new one if the old one was wrong (keeps it simple, avoids edit-history complexity)

### 5.2 Steward/Admin Actions

- **Delete any notice** — for moderation (with optional reason stored, not shown to poster)
- Deletions create an activity event: `'notice_removed'`

---

## 6. Schema

```typescript
export const communityNotices = pgTable('community_notices', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id')
    .notNull()
    .references(() => users.id),
  authorPersonaId: uuid('author_persona_id')
    .notNull()
    .references(() => personas.id),
  type: text('type').notNull().default('general'),  // 'looking_for' | 'offering' | 'heads_up' | 'general'
  body: text('body').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  deletedAt: timestamp('deleted_at'),               // Soft delete for moderation
  deletedByUserId: uuid('deleted_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notices_community').on(table.communityId),
  index('idx_notices_active').on(table.communityId, table.expiresAt),
  index('idx_notices_author').on(table.authorUserId),
]);
```

**Why `authorPersonaId`:** Notices are posted through a persona (the one the member uses in this community), so the display name and avatar come from the persona, not the raw user.

**Why soft delete:** When a steward deletes a notice, it's hidden but preserved for audit. The `deletedByUserId` tracks who removed it.

**No separate `status` column:** A notice is active if `expiresAt > now() AND deletedAt IS NULL`. Simple.

---

## 7. Server Actions

```typescript
postNotice(input: {
  communityId: string;
  type: 'looking_for' | 'offering' | 'heads_up' | 'general';
  body: string;
  durationDays: 1 | 3 | 7 | 14 | 30;
}): Promise<{ id: string }>
// Checks community's noticePolicy setting (all_members or stewards_and_admins).
// Rejects suspended members. Checks max 3 active notices per member.
// Activity event: 'notice_posted'

listNotices(input: {
  communityId: string;
  type?: string;       // Filter by notice type
  limit?: number;      // Default 20
  offset?: number;
}): Promise<{
  notices: CommunityNotice[];
  total: number;
}>
// Any community member. Returns only active (not expired, not deleted).

deleteNotice(input: {
  noticeId: string;
  reason?: string;     // For steward/admin moderation
}): Promise<void>
// Author can delete own. Steward/admin can delete any.
// Activity event: 'notice_removed' (if steward/admin deleted it)
```

---

## 8. Validation Schema

```typescript
// lib/validations/communities.ts (additions)

const postNoticeSchema = z.object({
  communityId: z.string().uuid(),
  type: z.enum(['looking_for', 'offering', 'heads_up', 'general']),
  body: z.string().min(20).max(500),
  durationDays: z.enum(['1', '3', '7', '14', '30']).transform(Number),
});
```

---

## 9. Notifications

When a notice is posted, **no notification is sent**. Notices are passive — members see them when they visit the community. This is intentional:

- Avoids notification spam in active communities
- Keeps notices low-pressure (no "3 people saw your notice" engagement metrics)
- Members check the board when they have time, not when they're interrupted

Exception: If a community has very few notices (future consideration), a weekly digest could mention "2 new notices in your community" — but this is deferred.

---

## 10. Test Criteria

- Post notice → appears in Notices tab for all community members
- Post notice → author's active notice count increments (max 3 enforced)
- Notice with expired `expiresAt` → not returned by `listNotices`
- Author deletes own notice → `deletedAt` set, no longer visible
- Steward deletes notice → `deletedAt` set, `deletedByUserId` recorded
- Member cannot delete another member's notice
- Suspended member cannot post a notice
- Body under 20 or over 500 characters → validation error
- [Contact Name] button triggers introduction request flow
- Filter by type returns only matching notices

---

## 11. Implementation Order

1. `community_notices` schema + migration
2. `postNotice` server action with validation
3. `listNotices` server action
4. Notices tab UI (list with type filter)
5. Post notice form (with character count and duration picker)
6. [Contact Name] button wired to introduction request flow
7. `deleteNotice` server action (author + steward/admin)
8. Overview section (3 most recent notices)
9. Auto-cleanup: cron or query-time filtering for expired notices
