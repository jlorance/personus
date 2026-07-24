---
type: spec
title: Communities — Moderation
description: "How COs maintain community quality. Covers member removal, suspension, reporting, and basic safety tools. Intentionally lightweight — Personus communities are intelligence layers, not social…"
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Moderation

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `02-membership.md`
> Primary actor: Community Organizer (CO)

How COs maintain community quality. Covers member removal, suspension, reporting, and basic safety tools. Intentionally lightweight — Personus communities are intelligence layers, not social networks. The communication happens on Discord/Slack/Telegram where those platforms have mature moderation tools. Our moderation is about the capability directory, not conversations.

---

## 1. Scope

Moderation in Personus covers:
- **Member removal** — Remove someone from the community directory
- **Member suspension** — Temporarily hide a member from search and directory
- **Profile flags** — Flag misleading skills/endorsements for review
- **Join request screening** — Decline applicants (covered in `02-membership.md`)

Moderation does NOT cover:
- **Conversation moderation** — That's Discord/Slack/Telegram's job
- **Content moderation** — We don't host user-generated content (no posts, no comments)
- **Identity verification** — Separate concern (endorsements serve as peer verification)

---

## 2. Member Removal

### 2.1 Flow

```
CO/Steward → Members tab → click member → Member detail panel
  │
  ├─ [Remove from Community]
  │
  ├─ Confirmation dialog:
  │  "Remove [Name] from [Community Name]?"
  │
  │  Reason (optional):
  │  [Inactive / Policy violation / Misleading profile / Other]
  │
  │  Note (optional):
  │  [Free text — internal, not shown to member]
  │
  │  ☐ Also block from rejoining
  │
  │  [Cancel]  [Remove Member]
  │
  └─ Result:
     ├─ community_members row deleted
     ├─ communities.memberCount decremented
     ├─ If "block" checked: user added to community block list
     ├─ Activity event: 'member_removed' (reason stored, not public)
     ├─ Member notified: "You've been removed from [Community]" (no reason shown unless CO writes a message)
     └─ Member's traits and other community memberships unaffected
```

### 2.2 Block List

Blocked users cannot rejoin (via open join, approval, or invite). Stored as:

```typescript
export const communityBlocks = pgTable('community_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  blockedByUserId: uuid('blocked_by_user_id')
    .notNull()
    .references(() => users.id),
  reason: text('reason'),
  blockedAt: timestamp('blocked_at').defaultNow().notNull(),
}, (table) => [
  unique('uq_community_blocks').on(table.communityId, table.userId),
]);
```

### 2.3 Unblock

Admins can unblock a previously blocked user. Stewards cannot unblock.

---

## 3. Member Suspension

Temporary removal from search and directory without full removal.

| State | In Directory | In Search | Can Log In | Can View Community |
|-------|-------------|-----------|-----------|-------------------|
| Active | Yes | Yes | Yes | Yes |
| Suspended | No | No | Yes | Yes (read-only) |
| Removed | No | No | Yes | No |

**Suspension adds a `suspendedAt` timestamp to the membership.** The member can still see the community (for transparency) but is hidden from search, directory, and bot results.

**Use case:** CO suspects a member has misleading credentials. Suspends while investigating. Reinstates or removes after review.

---

## 4. Reporting

Members can flag another member's profile for review by stewards/admins.

### 4.1 Flow

```
CM viewing another member's profile → [⚑ Report]
  │
  ├─ Report dialog:
  │  "What's the concern?"
  │  ○ Misleading skills or experience
  │  ○ Fake endorsements
  │  ○ Inappropriate content in profile
  │  ○ Other: [free text]
  │
  │  [Submit Report]
  │
  └─ Result:
     ├─ Report created (stored, not shown to reported member)
     ├─ CO/Stewards see report in Members tab → Reports section
     ├─ CO reviews → Dismiss / Suspend / Remove
     └─ Reporter gets no details on outcome (prevents weaponized reporting)
```

### 4.2 Report Schema

```typescript
export const communityReports = pgTable('community_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  reportedMemberId: uuid('reported_member_id')
    .notNull()
    .references(() => communityMembers.id),
  reportedByUserId: uuid('reported_by_user_id')
    .notNull()
    .references(() => users.id),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').notNull().default('pending'),  // 'pending' | 'reviewed' | 'dismissed'
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});
```

---

## 5. Server Actions

```typescript
removeMember(input: { communityId: string; memberId: string; reason?: string; block?: boolean })
suspendMember(input: { communityId: string; memberId: string; reason?: string })
reinstateMember(input: { communityId: string; memberId: string })
unblockUser(input: { communityId: string; userId: string })
listBlocked(communityId: string): Promise<BlockedUser[]>
reportMember(input: { communityId: string; memberId: string; reason: string; details?: string })
listReports(communityId: string, status?: string): Promise<CommunityReport[]>
reviewReport(input: { reportId: string; action: 'dismiss' | 'suspend' | 'remove'; note?: string })
```

---

## 6. Test Criteria

- Remove member: deletes membership, decrements count, member notified
- Remove + block: user cannot rejoin via any method
- Suspend: member hidden from directory and search, can still view community
- Reinstate: member visible again
- Unblock: user can rejoin
- Report: creates report, visible to stewards, reporter sees no outcome details
- Cannot remove founding user
- Steward can remove members but cannot unblock

---

## 7. Implementation Order

1. `removeMember` with confirmation dialog (already defined in 02-membership.md)
2. `communityBlocks` schema + block on removal
3. `unblockUser` + blocked users list in settings
4. Suspension (add `suspendedAt` to community_members, filter in queries)
5. `communityReports` schema + `reportMember` action
6. Reports section in Members tab (steward/admin view)
7. `reviewReport` action
