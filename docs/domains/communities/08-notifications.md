---
type: spec
title: Communities — Notifications
description: "What events trigger notifications, how they're delivered, and how users control them. Intentionally minimal — we notify for actions that need attention, not for engagement farming."
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Notifications

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, all other community specs
> Primary actors: Community Organizer (CO), Community Member (CM)

What events trigger notifications, how they're delivered, and how users control them. Intentionally minimal — we notify for actions that need attention, not for engagement farming.

---

## 1. Notification Philosophy

- **Actionable only.** Every notification should prompt a specific action: review a request, respond to an introduction, check a report. No "Alice updated her profile" unless Alice is in your community and you're a CO.
- **Respect attention.** Default to fewer notifications. Users opt into more, not out of noise.
- **No dark patterns.** No "you haven't visited in 3 days" nudges. No engagement gamification.

---

## 2. Notification Events

### 2.1 For Community Organizers (Steward/Admin)

| Event | Trigger | Default | Channel |
|-------|---------|---------|---------|
| **Join request pending** | Member requests to join (approval communities) | On | In-app + email |
| **New member joined** | Member joins (open communities) | On | In-app |
| **Member left** | Member leaves voluntarily | On | In-app |
| **Report filed** | Member reports another member | On | In-app + email |
| **Integration unhealthy** | Platform bot/webhook fails | On | In-app + email |
| **Milestone reached** | 50, 100, 200, 500, 1000 members | On | In-app |
| **Weekly digest** | Summary of week's activity (searches, joins, intros) | On | Email |

### 2.2 For Community Members

| Event | Trigger | Default | Channel |
|-------|---------|---------|---------|
| **Join request approved** | CO approves join request | On | In-app + email |
| **Join request declined** | CO declines join request | On | In-app + email |
| **Introduction request** | Someone requests an intro to you | On | In-app + email |
| **Endorsement received** | Someone endorses you in this community | On | In-app |
| **Invited to community** | Direct invitation received | On | In-app + email |
| **Removed from community** | CO removes you | On | In-app + email |
| **Role changed** | Promoted or demoted | On | In-app |

---

## 3. Delivery Channels

### 3.1 In-App

Bell icon in dashboard nav with unread count badge. Dropdown shows recent notifications grouped by community.

```
┌───────────────────────────────┐
│ 🔔 Notifications (3)          │
├───────────────────────────────┤
│ Tri-County Electrical Guild   │
│ • Join request from Mike T.   │
│   2 hours ago                 │
│ • New member: Lisa K.         │
│   Yesterday                   │
├───────────────────────────────┤
│ Bay Area Photo Collective     │
│ • Alex endorsed you for       │
│   landscape photography       │
│   3 hours ago                 │
├───────────────────────────────┤
│ [View All Notifications]      │
└───────────────────────────────┘
```

### 3.2 Email

Transactional emails for high-priority events (join requests, introductions, reports). Uses existing email infrastructure.

### 3.3 Weekly Digest (CO Only)

```
Subject: Your week at Tri-County Electrical Guild

This week:
  • 3 new members joined (total: 98)
  • 12 searches performed
  • 2 introductions facilitated
  • 1 new endorsement

Top searched skill: solar installation (4 searches)
Unmet need: EV charger installation (2 searches, no matches)

[View Community Dashboard →]
```

---

## 4. Notification Preferences

### 4.1 Route

Settings → Notifications (global), or per-community in community settings

### 4.2 Controls

Per-community, per-event-type toggles:

| Event | In-app | Email |
|-------|--------|-------|
| Join requests | [on/off] | [on/off] |
| New members | [on/off] | — |
| Introductions | [on/off] | [on/off] |
| Endorsements | [on/off] | — |
| Weekly digest | — | [on/off] |

Global "mute all from this community" override.

---

## 5. Schema

```typescript
// Extend existing notification system or create:
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id')
    .references(() => communities.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                  // Event type from tables above
  title: text('title').notNull(),
  body: text('body'),
  actionUrl: text('action_url'),                 // Deep link to relevant page
  read: boolean('read').notNull().default(false),
  emailSent: boolean('email_sent').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_user').on(table.userId),
  index('idx_notifications_unread').on(table.userId, table.read),
]);
```

---

## 6. Server Actions

```typescript
listNotifications(input: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<Notification[]>
markNotificationRead(notificationId: string): Promise<void>
markAllRead(): Promise<void>
getUnreadCount(): Promise<number>
updateNotificationPreferences(input: { communityId: string; preferences: Record<string, boolean> }): Promise<void>
```

---

## 7. Test Criteria

- Join request creates notification for all stewards/admins of that community
- Endorsement creates notification for the endorsed member
- Introduction request creates notification for the target member
- `markNotificationRead` updates the read flag
- `getUnreadCount` returns correct count
- Notification preferences respected (disabled events don't create notifications)
- Weekly digest includes correct stats for the period

---

## 8. Implementation Order

1. `notifications` schema + migration
2. `listNotifications` + `markNotificationRead` + `getUnreadCount` server actions
3. Notification bell component in dashboard nav
4. Notification dropdown UI
5. Create notifications in join, endorsement, and introduction flows
6. Email notifications for high-priority events
7. Notification preferences UI + server action
8. Weekly digest cron job + email template
