---
type: spec
title: "Platform & Operations -- User & Community Operations"
description: "Operational tooling for the admin control plane covering user management, community moderation, read-only impersonation for support, and audit log inspection. All admin actions are audit-logged.…"
status: planned
tags: [platform-ops]
timestamp: 2026-02-24
---

# Platform & Operations -- User & Community Operations

> Date: 2026-02-24
> Status: Draft
> Depends on: `00-prd.md`, `01-monorepo-migration.md`, `02-taxonomy-admin.md` (audit log table), `04-system-settings.md`
> Primary actors: Admin

Operational tooling for the admin control plane covering user management, community moderation, read-only impersonation for support, and audit log inspection. All admin actions are audit-logged. No user data is deleted -- disabling accounts and archiving communities are soft operations that preserve data integrity and enable reversal.

---

## 1. Admin Dashboard Home

### 1.1 Overview

The landing page for the admin app. Provides at-a-glance system health, aggregate counts, and a feed of recent admin activity. This is a read-only dashboard -- all actions happen in the dedicated management pages linked from here.

### 1.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Personus Admin                                    [avatar] Admin Name  [v] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  System Overview                                                            │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Users      │  │   Personas   │  │ Communities  │  │  Endorsements │    │
│  │     32        │  │      37      │  │       8      │  │      42       │    │
│  │  +3 this week │  │  +5 this week│  │  +1 this week│  │ +12 this week │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                             │
│  System Health                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Database         ● Connected    Neon Postgres       12ms latency   │    │
│  │  Authentication   ● Connected    Clerk               OK             │    │
│  │  AI / Embeddings  ● Connected    OpenAI              OK             │    │
│  │  Vector Index     ● Healthy      pgvector ivfflat    3 indexes      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Recent Admin Actions                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Today 2:14 PM   admin@personus.ai  updated taxonomy   "skills"     │    │
│  │  Today 1:30 PM   admin@personus.ai  disabled user      jamie@...    │    │
│  │  Yesterday        ops@personus.ai   flagged community  "DesignGuild"│    │
│  │  Yesterday        ops@personus.ai   updated setting    rate_limit   │    │
│  │  Feb 22           admin@personus.ai created taxonomy   "carriers"   │    │
│  │                                                      [View All ->]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Quick Navigation                                                           │
│  [Users]  [Communities]  [Taxonomies]  [Trait Metadata]  [Settings]         │
│  [Audit Log]                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Hierarchy

```
apps/admin/app/(admin)/page.tsx                      ← Server Component (data fetching)
  ├─ components/admin/stat-card.tsx                    ← Server Component (count + delta)
  │    └─ @personus/ui/card                            ← Shared shadcn/ui
  ├─ components/admin/system-health.tsx                ← Server Component (health checks)
  │    └─ @personus/ui/badge                           ← Status badges
  ├─ components/admin/recent-actions-feed.tsx           ← Server Component (last 10 audit entries)
  │    └─ @personus/ui/avatar                          ← Admin avatar
  └─ components/admin/quick-nav.tsx                    ← links to management sections
```

### 1.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 1.1 | Admin can view aggregate counts for users, personas, communities, and endorsements | Count queries with week-over-week delta |
| 1.2 | Admin can view system health status for database, Clerk, and OpenAI | Lightweight health checks, not deep probes |
| 1.3 | Admin can view the 10 most recent admin audit log entries | Sourced from `admin_audit_log` table |
| 1.4 | Admin can navigate to all management sections from the dashboard | Quick-nav links |

### 1.5 Server Actions

```typescript
// apps/admin/app/actions/dashboard.ts

/** Aggregate counts with week-over-week deltas */
export async function getDashboardStats(): Promise<{
  users:        { total: number; deltaThisWeek: number };
  personas:     { total: number; deltaThisWeek: number };
  communities:  { total: number; deltaThisWeek: number };
  endorsements: { total: number; deltaThisWeek: number };
}>;

/** Lightweight connectivity checks — no heavy queries */
export async function getSystemHealth(): Promise<{
  database:   { status: 'connected' | 'error'; latencyMs: number };
  clerk:      { status: 'connected' | 'error' };
  openai:     { status: 'connected' | 'error' };
}>;

/** Last N entries from admin_audit_log, newest first */
export async function getRecentAdminActions(limit?: number): Promise<AuditLogEntry[]>;
```

### 1.6 Health Check Implementation

Health checks are intentionally lightweight. They do not run expensive queries or call external APIs with large payloads.

| Service | Check Method | Timeout |
|---------|-------------|---------|
| Database | `SELECT 1` on Neon connection, measure round-trip | 3s |
| Clerk | `GET /v1/instance` with Clerk secret key | 3s |
| OpenAI | `GET /v1/models` with API key (list, not generate) | 5s |

All checks run in parallel via `Promise.allSettled`. A failed check returns `status: 'error'` but does not block the page render.

---

## 2. User Management Dashboard

### 2.1 Overview

Admin can search, filter, and browse all users. The list is paginated and supports text search across email, display name (from the user's first persona), and Clerk ID. Each row links to the user detail page. Disabled users are visually dimmed but always included in results (with a filter to show/hide them).

### 2.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Users                                                                      │
│                                                                             │
│  ┌──────────────────────────────────┐  Status: [All v]  [Search]            │
│  │  Search by email, name, clerkId  │                                       │
│  └──────────────────────────────────┘                                       │
│                                                                             │
│  32 users total   (2 disabled)                                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Name / Email              Personas  Communities  Created     Status  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  Jamie Smith               3         2            2026-01-15  Active  │  │
│  │  jamie@example.com                                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  Alex Chen                 2         1            2026-01-18  Active  │  │
│  │  alex@example.com                                                    │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ░░ Sam Rivera (dimmed)    1         0            2026-02-01 Disabled │  │
│  │  ░░ sam@example.com                                                  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ...                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Showing 1-25 of 32                           [< Prev]  [1] [2]  [Next >]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Hierarchy

```
apps/admin/app/(admin)/users/page.tsx                ← Server Component (initial data + pagination)
  ├─ components/admin/user-search-bar.tsx              ← Client Component (search + status filter)
  │    ├─ @personus/ui/input                           ← Search input
  │    └─ @personus/ui/select                          ← Status filter dropdown
  ├─ components/admin/user-table.tsx                   ← Server Component (table rendering)
  │    ├─ @personus/ui/badge                           ← Active/Disabled badge
  │    └─ components/admin/user-row.tsx                ← Link to user detail
  └─ components/admin/pagination.tsx                   ← Client Component (page nav)
```

### 2.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 2.1 | Admin can view a paginated list of all users with persona count, community count, created date, and status | 25 per page, cursor-based pagination |
| 2.2 | Admin can search users by email, display name, or Clerk ID | Case-insensitive ILIKE across columns |
| 2.3 | Admin can filter the user list by status (all, active, disabled) | Default: all |
| 2.4 | Admin can click a user row to navigate to the user detail page | Server-side navigation to `/users/[id]` |

### 2.5 Server Actions

```typescript
// apps/admin/app/actions/users.ts

export async function listUsers(params: {
  query?: string;          // search across email, display name, clerkId
  status?: 'all' | 'active' | 'disabled';
  cursor?: string;         // cursor-based pagination (user.id)
  limit?: number;          // default 25, max 100
}): Promise<{
  users: AdminUserRow[];
  nextCursor: string | null;
  total: number;
}>;

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;   // derived from first persona or null
  clerkUserId: string;
  personaCount: number;
  communityCount: number;
  isDisabled: boolean;
  createdAt: Date;
}
```

### 2.6 Query Design

The user list query joins across three tables to produce the aggregate columns. Display name is derived from the user's first persona (by `createdAt`), since the `users` table does not have a `displayName` column.

```sql
SELECT
  u.id,
  u.email,
  u.clerk_user_id,
  u.is_disabled,
  u.created_at,
  (SELECT display_name FROM personas WHERE user_id = u.id ORDER BY created_at LIMIT 1) AS display_name,
  (SELECT COUNT(*) FROM personas WHERE user_id = u.id) AS persona_count,
  (SELECT COUNT(DISTINCT community_id) FROM community_members WHERE user_id = u.id) AS community_count
FROM users u
WHERE
  (u.email ILIKE '%query%' OR u.clerk_user_id ILIKE '%query%'
   OR EXISTS (SELECT 1 FROM personas p WHERE p.user_id = u.id AND p.display_name ILIKE '%query%'))
  AND (status_filter IS NULL OR u.is_disabled = status_bool)
ORDER BY u.created_at DESC
LIMIT 25;
```

---

## 3. User Detail & Actions

### 3.1 Overview

The user detail page is a comprehensive view of a single user's data and relationships. It is organized into tabbed sections: Overview, Personas, Communities, Endorsements, Contacts, and Activity. Admin actions (disable, enable, reset contact preferences) are accessible from the Overview tab's action menu.

### 3.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  < Back to Users                                                            │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  [JM]  Jamie Smith                                                   │   │
│  │        jamie@example.com                                             │   │
│  │        Clerk: user_2abc...xyz                                        │   │
│  │        Joined: January 15, 2026                                      │   │
│  │        Status: ● Active                              [Actions  v]    │   │
│  │                                                      ┌────────────┐  │   │
│  │                                                      │ Disable    │  │   │
│  │                                                      │ Impersonate│  │   │
│  │                                                      │ Reset Prefs│  │   │
│  │                                                      └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Overview]  [Personas (3)]  [Communities (2)]  [Endorsements]  [Activity]  │
│                                                                             │
│  ── Overview Tab ──────────────────────────────────────────────────────────  │
│                                                                             │
│  User Traits (master collection)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Skills: React, TypeScript, Node.js, PostgreSQL                      │   │
│  │  Experience: 3 entries                                               │   │
│  │  Interests: hiking, photography, cooking                             │   │
│  │  Languages: English, Spanish                                         │   │
│  │  Offerings: 2 entries                                                │   │
│  │  Contact Preferences: networking=open, recruiting=ask, ...           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Personas Tab ──────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Professional Jamie         person   ████████░░ 72%   public        │   │
│  │  Jamie's Freelance          person   ██████░░░░ 58%   community     │   │
│  │  Acme Corp                  org      ████░░░░░░ 35%   authenticated │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Communities Tab ───────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Portland Designers Guild   guild    steward   joined 2026-01-20    │   │
│  │  React Devs PDX             club     member    joined 2026-02-01    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Endorsements Tab ──────────────────────────────────────────────────────  │
│                                                                             │
│  Given (5)                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  -> Alex Chen (React Devs)    "Excellent React mentor"   2026-02-10 │   │
│  │  -> Sam Rivera (Designers)    "Great eye for layout"     2026-02-05 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  Received (8)                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  <- Alex Chen (React Devs)    "Go-to for TypeScript"    2026-02-12  │   │
│  │  <- Pat Kim (Designers)       "Collaborative spirit"    2026-01-28  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Activity Tab ──────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Feb 24  Created persona "Acme Corp"                                 │   │
│  │  Feb 22  Joined community "React Devs PDX"                           │   │
│  │  Feb 20  Received endorsement from Alex Chen                         │   │
│  │  Feb 18  Updated traits: added 2 skills                              │   │
│  │  ...                                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Hierarchy

```
apps/admin/app/(admin)/users/[id]/page.tsx           ← Server Component (user + tabs data)
  ├─ components/admin/user-header.tsx                  ← Server Component (avatar, name, email, status)
  ├─ components/admin/user-actions-menu.tsx             ← Client Component (dropdown: disable/enable/impersonate/reset)
  │    ├─ @personus/ui/dropdown-menu
  │    └─ @personus/ui/dialog                          ← Confirmation dialogs
  ├─ components/admin/user-detail-tabs.tsx              ← Client Component (tab navigation)
  │    └─ @personus/ui/tabs
  ├─ components/admin/user-overview-tab.tsx             ← Server Component (user_traits display)
  ├─ components/admin/user-personas-tab.tsx             ← Server Component (persona cards)
  ├─ components/admin/user-communities-tab.tsx          ← Server Component (membership list)
  ├─ components/admin/user-endorsements-tab.tsx         ← Server Component (given/received)
  └─ components/admin/user-activity-tab.tsx             ← Server Component (activity_events feed)
```

### 3.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 3.1 | Admin can view a user's complete profile: email, Clerk ID, join date, status, and master traits | Read-only display of `users` + `user_traits` data |
| 3.2 | Admin can view all personas belonging to a user with completeness scores, entity type, and visibility | List from `personas` where `userId` matches |
| 3.3 | Admin can view all community memberships for a user with role and join date | Join `community_members` + `communities` |
| 3.4 | Admin can view endorsements given and received by a user's personas | Split into two lists: given (fromPersonaUri) and received (toPersonaUri) |
| 3.5 | Admin can view a user's activity event feed in reverse chronological order | Paginated, from `activity_events` |
| 3.6 | Admin can disable a user account | Sets `isDisabled=true`, `disabledAt=now()`, `disabledBy=adminId`. Audit logged |
| 3.7 | Admin can enable a previously disabled user account | Sets `isDisabled=false`, clears `disabledAt`/`disabledBy`. Audit logged |
| 3.8 | Admin can reset a user's contact preferences to system defaults | Resets `users.defaultContactPreferences` to `{}`. Audit logged |

### 3.5 Server Actions

```typescript
// apps/admin/app/actions/users.ts

export async function getUserDetail(userId: string): Promise<{
  user: User & { isDisabled: boolean; disabledAt: Date | null; disabledBy: string | null };
  traits: Record<string, unknown>;
  personas: Array<Persona & { completenessScore: number }>;
  communities: Array<CommunityMember & { community: Community }>;
  endorsementsGiven: Endorsement[];
  endorsementsReceived: Endorsement[];
  recentActivity: ActivityEvent[];
}>;

export async function disableUser(userId: string): Promise<void>;
export async function enableUser(userId: string): Promise<void>;
export async function resetContactPreferences(userId: string): Promise<void>;
```

### 3.6 Disable/Enable Behavior

**Disabling a user** is a soft operation. It does NOT delete any data, remove personas, or revoke community memberships. The flag is checked at authentication time to prevent login.

| Action | Database Change | Side Effects |
|--------|----------------|-------------|
| Disable | `users.isDisabled = true`, `disabledAt = now()`, `disabledBy = adminUserId` | Clerk session invalidated (webhook or API call to Clerk `banUser`). Personas remain but are excluded from search results. Community memberships preserved. |
| Enable | `users.isDisabled = false`, `disabledAt = null`, `disabledBy = null` | Clerk ban lifted. Personas re-included in search. |
| Reset prefs | `users.defaultContactPreferences = '{}'` | User's custom contact preferences removed. Next login shows defaults. Persona-level prefs unchanged. |

All three actions require a confirmation dialog before execution. The confirmation for disable includes the text: "This will prevent the user from logging in. Their data will be preserved and they can be re-enabled at any time."

### 3.7 Audit Log Entries for User Actions

Each user action writes to `admin_audit_log`:

```typescript
// disable
{ entityType: 'user', entityId: userId, action: 'update',
  field: 'isDisabled', previousValue: false, newValue: true }

// enable
{ entityType: 'user', entityId: userId, action: 'update',
  field: 'isDisabled', previousValue: true, newValue: false }

// reset contact preferences
{ entityType: 'user', entityId: userId, action: 'update',
  field: 'defaultContactPreferences', previousValue: {...priorPrefs}, newValue: {} }
```

---

## 4. Impersonation for Support

### 4.1 Overview

Admin can view the consumer app exactly as a specific user sees it -- same personas, same communities, same dashboard. This is strictly read-only: the admin cannot create, edit, or delete anything while impersonating. The feature exists for debugging support tickets ("I can't see my community" / "my completeness score seems wrong").

Impersonation is the most sensitive admin action. Every session is audit-logged with start time, end time, and the target user. A visible banner is always displayed during impersonation so the admin never forgets which context they are in.

### 4.2 Wireframe

```
Impersonation entry (from User Detail page):
┌──────────────────────────────────────────────────────────────────────────┐
│                      Impersonate User                                    │
│                                                                          │
│  You are about to view the app as:                                       │
│                                                                          │
│    Jamie Smith (jamie@example.com)                                       │
│                                                                          │
│  This is READ-ONLY. You will see exactly what this user sees             │
│  but cannot make any changes. This session will be recorded              │
│  in the audit log.                                                       │
│                                                                          │
│                              [Cancel]  [Start Impersonation]             │
└──────────────────────────────────────────────────────────────────────────┘

During impersonation (consumer app with banner):
┌──────────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓  IMPERSONATING: Jamie Smith (jamie@example.com)   [End Session]    ▓ │
│ ▓  READ-ONLY — No changes can be made                                ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  (Normal consumer app dashboard — exactly what user sees)          │ │
│  │                                                                    │ │
│  │  Your Personas                                                     │ │
│  │  Professional Jamie    ████████░░ 72%                              │ │
│  │  Jamie's Freelance     ██████░░░░ 58%                              │ │
│  │                                                                    │ │
│  │  All mutation buttons are disabled / hidden                        │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Component Hierarchy

```
apps/admin/app/(admin)/users/[id]/impersonate/page.tsx   ← Client Component (iframe host + banner)
  ├─ components/admin/impersonation-banner.tsx             ← Client Component (fixed top banner)
  │    └─ @personus/ui/button                              ← "End Session" button
  └─ <iframe>                                              ← Consumer app loaded with impersonation token

apps/web/                                                  (Consumer app changes)
  ├─ lib/auth/impersonation.ts                             ← NEW: validate impersonation token, read-only guard
  └─ app/(dashboard)/layout.tsx                            ← Modified: detect impersonation mode, disable mutations
```

### 4.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 4.1 | Admin can initiate a read-only impersonation session for a specific user | Confirmation dialog required. Generates a signed, time-limited token |
| 4.2 | Admin sees the consumer app exactly as the target user would see it | User's personas, communities, dashboard, inbox -- all from their perspective |
| 4.3 | Admin cannot make any changes during impersonation -- all mutation actions are disabled | Server actions reject writes when impersonation token is present |
| 4.4 | Admin sees a persistent banner during impersonation showing target user and read-only status | Fixed position, high-contrast background, cannot be dismissed |
| 4.5 | Admin can end the impersonation session at any time | "End Session" button in banner returns to admin user detail |
| 4.6 | Impersonation sessions are audit-logged with start time, end time, and target user | Two audit entries: session_start and session_end |
| 4.7 | Impersonation tokens expire after 30 minutes | Token includes `exp` claim; expired tokens redirect back to admin |

### 4.5 Impersonation Token Design

Impersonation does NOT use Clerk's session system. Instead, the admin app generates a short-lived signed JWT that the consumer app validates.

```typescript
// Token payload
interface ImpersonationToken {
  sub: string;          // target user's internal DB ID
  adminId: string;      // admin's internal DB ID
  adminEmail: string;   // for audit display
  iat: number;          // issued at
  exp: number;          // expires: iat + 30 minutes
  readonly: true;       // always true — enforced server-side
}
```

**Token flow:**

1. Admin clicks "Impersonate" on user detail page, confirms dialog
2. Admin server action generates a JWT signed with a shared secret (`IMPERSONATION_SECRET` env var)
3. Audit log entry written: `{ action: 'impersonate_start', entityType: 'user', entityId: targetUserId }`
4. Admin app opens the consumer app in an iframe with the token as a query parameter: `app.personus.ai/?_imp={token}`
5. Consumer app's `proxy.ts` detects `_imp` parameter, validates JWT signature and expiration
6. If valid, the consumer app sets a server-side cookie `__imp_token` (HttpOnly, Secure, SameSite=Strict, 30min max-age)
7. All server actions check for `__imp_token`. If present and valid: resolve user context from `token.sub` (not Clerk session), reject all mutations
8. "End Session" clears the cookie and writes audit log entry: `{ action: 'impersonate_end' }`

### 4.6 Read-Only Enforcement

Mutations are blocked at two layers:

**Server-side (authoritative):** A guard function wraps all mutating server actions:

```typescript
// apps/web/lib/auth/impersonation.ts

export function assertNotImpersonating(): void {
  const token = cookies().get('__imp_token');
  if (token) {
    throw new Error('Action not permitted during impersonation');
  }
}

// Usage in every mutating server action:
export async function createPersona(data: CreatePersonaInput) {
  assertNotImpersonating();
  // ... normal flow
}
```

**Client-side (UX):** When `__imp_token` cookie exists, the dashboard layout adds `data-impersonating="true"` to the body. CSS hides or disables mutation triggers:

```css
[data-impersonating="true"] button[data-action="mutate"],
[data-impersonating="true"] [data-mutation] {
  pointer-events: none;
  opacity: 0.4;
}
```

---

## 5. Community Management Dashboard

### 5.1 Overview

Admin can search, filter, and browse all communities. The list supports text search on community name and founding user, filtering by community type and status (active, flagged, archived). Each row links to the community detail page.

### 5.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Communities                                                                │
│                                                                             │
│  ┌──────────────────────────────────┐  Type: [All v]  Status: [All v]       │
│  │  Search by name or founder       │                                       │
│  └──────────────────────────────────┘                                       │
│                                                                             │
│  8 communities total   (1 flagged, 0 archived)                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Name                    Type       Members  Founded      Status     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  Portland Designers      guild      24       2026-01-10   Active     │  │
│  │  Guild                                                               │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  React Devs PDX          club       18       2026-01-15   Active     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ⚠ Sketchy Network       org        3        2026-02-20   Flagged    │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ...                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Showing 1-8 of 8                                         [< Prev] [Next >]│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Component Hierarchy

```
apps/admin/app/(admin)/communities/page.tsx           ← Server Component (data fetching + pagination)
  ├─ components/admin/community-search-bar.tsx         ← Client Component (search + type/status filters)
  │    ├─ @personus/ui/input                           ← Search input
  │    └─ @personus/ui/select                          ← Type and status dropdowns
  ├─ components/admin/community-table.tsx              ← Server Component (table rendering)
  │    ├─ @personus/ui/badge                           ← Type and status badges
  │    └─ components/admin/community-row.tsx           ← Link to community detail
  └─ components/admin/pagination.tsx                   ← Reused from user list
```

### 5.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 5.1 | Admin can view a paginated list of all communities with type, member count, founded date, and status | 25 per page, cursor-based |
| 5.2 | Admin can search communities by name or founding user's email | ILIKE across `communities.name` and joined `users.email` |
| 5.3 | Admin can filter communities by type (all, club, guild, org, etc.) | Dropdown populated from `community_types` seed data |
| 5.4 | Admin can filter communities by status (all, active, flagged, archived) | Combined with type filter |
| 5.5 | Admin can click a community row to navigate to community detail | Server-side navigation to `/communities/[id]` |

### 5.5 Server Actions

```typescript
// apps/admin/app/actions/communities.ts

export async function listCommunities(params: {
  query?: string;
  communityType?: string;    // slug from community_types
  status?: 'all' | 'active' | 'flagged' | 'archived';
  cursor?: string;
  limit?: number;            // default 25, max 100
}): Promise<{
  communities: AdminCommunityRow[];
  nextCursor: string | null;
  total: number;
}>;

interface AdminCommunityRow {
  id: string;
  name: string;
  slug: string;
  communityType: string;
  memberCount: number;
  founderEmail: string;
  isFlagged: boolean;
  isArchived: boolean;
  createdAt: Date;
}
```

---

## 6. Community Detail & Moderation

### 6.1 Overview

The community detail page shows the full community profile and membership list. Moderation actions are available from an action menu: flag/unflag, archive/unarchive, transfer founding user, and adjust member cap. All moderation actions are audit-logged and require confirmation.

Community moderation never deletes data. "Archiving" a community sets a soft-delete flag that hides it from consumer app search and browse, but preserves all data for potential restoration.

### 6.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  < Back to Communities                                                      │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Portland Designers Guild                                            │   │
│  │  Type: guild   |  Visibility: public   |  Join: request              │   │
│  │  Founded by: jamie@example.com  |  Created: January 10, 2026        │   │
│  │  Members: 24 / 100 max                                               │   │
│  │  Status: ● Active                                    [Actions  v]    │   │
│  │                                                      ┌─────────────┐ │   │
│  │                                                      │ Flag        │ │   │
│  │                                                      │ Archive     │ │   │
│  │                                                      │ Transfer    │ │   │
│  │                                                      │ Adjust Cap  │ │   │
│  │                                                      └─────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Details]  [Members (24)]  [Endorsements]  [External Platforms]            │
│                                                                             │
│  ── Details Tab ───────────────────────────────────────────────────────────  │
│                                                                             │
│  Description: A guild for Portland-area designers to share work...          │
│                                                                             │
│  Community Traits                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Focus Areas: UI/UX, Brand Design, Motion Graphics                   │   │
│  │  Tools: Figma, Sketch, After Effects                                 │   │
│  │  Tags: #design, #portland, #guild                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Members Tab ───────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  User                  Persona Shared     Role      Joined           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  jamie@example.com     Professional Jamie  admin    2026-01-10       │  │
│  │  alex@example.com      Alex Designer        steward  2026-01-12      │  │
│  │  pat@example.com       Pat's Portfolio      member   2026-01-15      │  │
│  │  ...                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ── External Platforms Tab ────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Discord:  https://discord.gg/pdxdesigners                           │   │
│  │  Slack:    https://pdxdesigners.slack.com                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Component Hierarchy

```
apps/admin/app/(admin)/communities/[id]/page.tsx       ← Server Component (community data + tabs)
  ├─ components/admin/community-header.tsx               ← Server Component (name, type, status, founder)
  ├─ components/admin/community-actions-menu.tsx          ← Client Component (moderation dropdown)
  │    ├─ @personus/ui/dropdown-menu
  │    └─ @personus/ui/dialog                            ← Confirmation dialogs
  ├─ components/admin/community-detail-tabs.tsx           ← Client Component (tab navigation)
  │    └─ @personus/ui/tabs
  ├─ components/admin/community-details-tab.tsx           ← Server Component (description, traits, tags)
  ├─ components/admin/community-members-tab.tsx           ← Server Component (member table)
  ├─ components/admin/community-endorsements-tab.tsx      ← Server Component (endorsements within community)
  └─ components/admin/community-platforms-tab.tsx         ← Server Component (external platform links)
```

### 6.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 6.1 | Admin can view community details: description, traits, tags, visibility, join policy | Read-only display of `communities` row |
| 6.2 | Admin can view the full member list with user email, shared persona, role, and join date | Join `community_members` + `users` + `personas` |
| 6.3 | Admin can view endorsements scoped to this community | Filter `endorsements` by `communityId` |
| 6.4 | Admin can view external platform links for the community | Parsed from `communities.externalPlatforms` JSONB |
| 6.5 | Admin can flag a community for review | Sets `isFlagged=true`, `flaggedAt=now()`, `flaggedBy=adminId`. Audit logged |
| 6.6 | Admin can unflag a previously flagged community | Clears flag fields. Audit logged |
| 6.7 | Admin can archive a community (soft delete) | Sets `isArchived=true`, `archivedAt=now()`, `archivedBy=adminId`. Community hidden from consumer search. Audit logged |
| 6.8 | Admin can unarchive a previously archived community | Clears archive fields. Community re-appears in search. Audit logged |
| 6.9 | Admin can transfer the founding user of a community to a different user | Updates `foundingUserId`. Requires selecting target user via search. Audit logged |
| 6.10 | Admin can adjust the member cap for a community | Updates `maxMembers`. Null = unlimited. Audit logged |

### 6.5 Server Actions

```typescript
// apps/admin/app/actions/communities.ts

export async function getCommunityDetail(communityId: string): Promise<{
  community: Community & ModerationFields;
  members: Array<CommunityMember & { user: User; persona: Persona }>;
  endorsements: Endorsement[];
}>;

export async function flagCommunity(communityId: string, reason?: string): Promise<void>;
export async function unflagCommunity(communityId: string): Promise<void>;
export async function archiveCommunity(communityId: string, reason?: string): Promise<void>;
export async function unarchiveCommunity(communityId: string): Promise<void>;
export async function transferFoundingUser(communityId: string, newFounderUserId: string): Promise<void>;
export async function adjustMemberCap(communityId: string, maxMembers: number | null): Promise<void>;
```

### 6.6 Moderation Behavior

| Action | Database Change | Consumer App Effect |
|--------|----------------|-------------------|
| Flag | `isFlagged=true`, `flaggedAt`, `flaggedBy`, `flagReason` | No immediate consumer impact. Flagged communities appear in admin review queue. Future: display a review notice to community admins |
| Unflag | `isFlagged=false`, clear flag fields | Removes from review queue |
| Archive | `isArchived=true`, `archivedAt`, `archivedBy`, `archiveReason` | Community hidden from search, browse, and discovery. Existing members see "This community has been archived" notice. Direct URL returns 410 |
| Unarchive | `isArchived=false`, clear archive fields | Community restored to normal visibility |
| Transfer founder | `foundingUserId = newUserId` | New founder gains full admin rights. Old founder retains their existing membership role |
| Adjust cap | `maxMembers = value` | If new cap < current member count, existing members are NOT removed. New joins blocked until count drops below cap |

---

## 7. Audit Log Viewer

### 7.1 Overview

A filterable, searchable interface for browsing the `admin_audit_log` table. The audit log is append-only and immutable -- entries cannot be edited or deleted through the UI. The viewer supports filtering by admin user, entity type, action type, and date range. Each entry shows the before/after diff for the changed field.

### 7.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Audit Log                                                                  │
│                                                                             │
│  Filters                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ Admin: [All] │ │ Entity: [All]│ │ Action: [All]│ │ Date: [Last 7d v]│   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │
│                                                                             │
│  147 entries                                                [Export CSV]    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Timestamp           Admin              Action   Entity      Detail  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  2026-02-24 14:14    admin@personus.ai  update   taxonomy    [v]     │  │
│  │  ┌─ Diff ──────────────────────────────────────────────────────────┐ │  │
│  │  │  Field: values[12].label                                        │ │  │
│  │  │  - "React.js"                                                   │ │  │
│  │  │  + "React"                                                      │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  2026-02-24 13:30    admin@personus.ai  update   user        [v]     │  │
│  │  ┌─ Diff ──────────────────────────────────────────────────────────┐ │  │
│  │  │  Field: isDisabled                                              │ │  │
│  │  │  - false                                                        │ │  │
│  │  │  + true                                                         │ │  │
│  │  │  Target: jamie@example.com (user_abc123)                        │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  2026-02-24 11:00    ops@personus.ai    create   taxonomy    [v]     │  │
│  │  ┌─ Diff ──────────────────────────────────────────────────────────┐ │  │
│  │  │  Created taxonomy category: "carriers"                          │ │  │
│  │  │  + { key: "carriers", displayName: "Carriers", values: [...] }  │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ...                                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Showing 1-50 of 147                          [< Prev]  [1] [2] [3] [Next>] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Component Hierarchy

```
apps/admin/app/(admin)/audit-log/page.tsx              ← Server Component (data fetching + pagination)
  ├─ components/admin/audit-log-filters.tsx              ← Client Component (filter controls)
  │    ├─ @personus/ui/select                            ← Admin, entity type, action dropdowns
  │    └─ @personus/ui/popover + date picker             ← Date range selector
  ├─ components/admin/audit-log-table.tsx                ← Server Component (table rendering)
  │    └─ components/admin/audit-log-row.tsx             ← Client Component (expandable diff)
  │         └─ components/admin/audit-diff-view.tsx      ← Inline before/after diff display
  ├─ components/admin/pagination.tsx                     ← Reused from user/community lists
  └─ components/admin/export-csv-button.tsx              ← Client Component (triggers server action)
```

### 7.4 Stories

| ID | Story | Notes |
|----|-------|-------|
| 7.1 | Admin can browse the audit log in reverse chronological order with pagination | 50 per page, cursor-based |
| 7.2 | Admin can filter the audit log by admin user | Dropdown populated from distinct `adminUserId` values |
| 7.3 | Admin can filter the audit log by entity type | Options: taxonomy, trait_metadata, system_setting, user, community |
| 7.4 | Admin can filter the audit log by action type | Options: create, update, delete, impersonate_start, impersonate_end |
| 7.5 | Admin can filter the audit log by date range | Preset options: last 24h, last 7d, last 30d, custom range |
| 7.6 | Admin can expand an audit log entry to see the before/after diff | Inline expand, not a separate page. Shows `previousValue` and `newValue` |
| 7.7 | Admin can export the current filtered audit log view as CSV | Server action generates CSV; browser downloads. Max 10,000 rows per export |

### 7.5 Server Actions

```typescript
// apps/admin/app/actions/audit-log.ts

export async function listAuditEntries(params: {
  adminUserId?: string;
  entityType?: 'taxonomy' | 'trait_metadata' | 'system_setting' | 'user' | 'community';
  action?: 'create' | 'update' | 'delete' | 'impersonate_start' | 'impersonate_end';
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: string;
  limit?: number;           // default 50, max 100
}): Promise<{
  entries: AuditLogEntry[];
  nextCursor: string | null;
  total: number;
}>;

export async function exportAuditLogCsv(params: {
  adminUserId?: string;
  entityType?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{ csv: string; rowCount: number }>;

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  adminEmail: string;       // resolved from admin user for display
  entityType: string;
  entityId: string;
  action: string;
  field: string | null;
  previousValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
```

### 7.6 Diff Display

The diff view renders differently based on the value types:

| Value Type | Display |
|-----------|---------|
| Primitive (string, number, boolean) | Single line: `- oldValue` / `+ newValue` with red/green backgrounds |
| Object (JSONB) | JSON diff with added/removed/changed keys highlighted. Nested objects show dot-path (`traits.skills[3]`) |
| Array | Added items in green, removed items in red, unchanged items in gray |
| null to value | `+ newValue` only (creation) |
| value to null | `- oldValue` only (deletion) |

For large JSONB diffs, the view is collapsible with a "Show full diff" toggle.

---

## 8. Schema Additions

### 8.1 Users Table Additions

Three new columns on the `users` table to support account disabling:

```typescript
// Additions to lib/db/schema/users.ts (or packages/db/src/schema/users.ts post-migration)

export const users = pgTable('users', {
  // ... existing columns ...

  // Account status — checked at auth time to prevent login
  isDisabled: boolean('is_disabled').notNull().default(false),
  disabledAt: timestamp('disabled_at'),
  disabledBy: text('disabled_by'),   // admin user ID who disabled the account
});
```

### 8.2 Communities Table Additions

Four new columns on the `communities` table to support flagging and archiving:

```typescript
// Additions to lib/db/schema/communities.ts (or packages/db/src/schema/communities.ts post-migration)

export const communities = pgTable('communities', {
  // ... existing columns ...

  // Moderation — flagging
  isFlagged: boolean('is_flagged').notNull().default(false),
  flaggedAt: timestamp('flagged_at'),
  flaggedBy: text('flagged_by'),         // admin user ID
  flagReason: text('flag_reason'),

  // Moderation — archiving (soft delete)
  isArchived: boolean('is_archived').notNull().default(false),
  archivedAt: timestamp('archived_at'),
  archivedBy: text('archived_by'),       // admin user ID
  archiveReason: text('archive_reason'),
});
```

### 8.3 Admin Audit Log Table (defined in spec 02)

The `admin_audit_log` table is defined in `02-taxonomy-admin.md`. For reference, the expected schema:

```typescript
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: text('admin_user_id').notNull(),   // Clerk user ID of the admin
  entityType: text('entity_type').notNull(),        // taxonomy | trait_metadata | system_setting | user | community
  entityId: text('entity_id').notNull(),            // ID of the affected entity
  action: text('action').notNull(),                 // create | update | delete | impersonate_start | impersonate_end
  field: text('field'),                             // specific field changed (nullable for create/delete)
  previousValue: jsonb('previous_value'),           // value before change (nullable for create)
  newValue: jsonb('new_value'),                     // value after change (nullable for delete)
  metadata: jsonb('metadata'),                      // additional context (e.g., reason, impersonation target)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_audit_log_admin').on(table.adminUserId),
  index('idx_audit_log_entity').on(table.entityType, table.entityId),
  index('idx_audit_log_action').on(table.action),
  index('idx_audit_log_created').on(table.createdAt),
]);
```

This spec adds `impersonate_start` and `impersonate_end` as new action types alongside the existing `create`, `update`, `delete` actions.

### 8.4 Environment Variable Additions

| Variable | Required | Purpose |
|----------|----------|---------|
| `IMPERSONATION_SECRET` | Yes (admin app) | Shared secret for signing impersonation JWTs. Min 32 characters. Must match between admin and consumer apps |

---

## 9. Admin Authorization

### 9.1 CASL Abilities for Admin

The admin app uses a separate CASL ability set from the consumer app. Admin abilities are coarse-grained -- an authenticated admin can perform all admin actions. Future refinement may introduce admin roles (viewer, editor, superadmin).

```typescript
// packages/auth/src/admin-abilities.ts

type AdminSubjects =
  | 'User'
  | 'Community'
  | 'Taxonomy'
  | 'TraitMetadata'
  | 'SystemSetting'
  | 'AuditLog'
  | 'all';

type AdminActions = 'read' | 'update' | 'create' | 'delete' | 'impersonate' | 'manage';

export function defineAdminAbilities(adminUserId: string): AdminAbility {
  const { can, build } = new AbilityBuilder<AdminAbility>(createMongoAbility);

  // All authenticated admins get full access (v1)
  can('manage', 'all');

  return build();
}
```

### 9.2 Admin Authentication Flow

1. Admin navigates to `admin.personus.ai`
2. Clerk (separate admin Clerk app) handles sign-in
3. Admin Clerk app only contains users with admin access -- no consumer users
4. On successful auth, `defineAdminAbilities` creates the CASL ability
5. Every server action checks: (a) valid Clerk session, (b) admin CASL ability for the action

---

## 10. Implementation Order

Implementation follows a dependency chain. Each phase builds on the previous.

### Phase 1: Schema & Foundation

1. Add `isDisabled`, `disabledAt`, `disabledBy` columns to `users` table
2. Add `isFlagged`, `flaggedAt`, `flaggedBy`, `flagReason`, `isArchived`, `archivedAt`, `archivedBy`, `archiveReason` columns to `communities` table
3. Ensure `admin_audit_log` table exists (from spec 02)
4. Set up admin CASL abilities in `packages/auth`
5. Create `IMPERSONATION_SECRET` env var and add to `.env.example`

### Phase 2: Admin Dashboard Home

6. Implement `getDashboardStats` server action (count queries)
7. Implement `getSystemHealth` server action (connectivity checks)
8. Build admin dashboard page with stat cards, health display, recent actions feed

### Phase 3: User Management

9. Implement `listUsers` server action with search and pagination
10. Build user list page with search bar, status filter, table, pagination
11. Implement `getUserDetail` server action
12. Build user detail page with tabbed sections
13. Implement `disableUser`, `enableUser`, `resetContactPreferences` server actions with audit logging
14. Build action menu with confirmation dialogs

### Phase 4: Community Management

15. Implement `listCommunities` server action with search, type/status filters, pagination
16. Build community list page with search, filters, table
17. Implement `getCommunityDetail` server action
18. Build community detail page with tabbed sections
19. Implement moderation actions: `flagCommunity`, `unflagCommunity`, `archiveCommunity`, `unarchiveCommunity`, `transferFoundingUser`, `adjustMemberCap` with audit logging
20. Build moderation action menu with confirmation dialogs

### Phase 5: Audit Log

21. Implement `listAuditEntries` server action with filters and pagination
22. Build audit log page with filter controls, table, expandable diff rows
23. Implement `exportAuditLogCsv` server action
24. Build CSV export button

### Phase 6: Impersonation

25. Implement impersonation token generation (admin server action)
26. Implement impersonation token validation in consumer app (`lib/auth/impersonation.ts`)
27. Add `assertNotImpersonating` guard to all mutating consumer server actions
28. Build impersonation banner component in consumer app
29. Build impersonation entry page in admin app (confirmation dialog + iframe host)
30. Add impersonation audit log entries (start/end)

---

## Appendix: Linear Issue Mapping

| Story ID | Linear Issue Title | Labels | Priority |
|----------|-------------------|--------|----------|
| 1.1 | Admin can view aggregate dashboard stats | `admin`, `dashboard` | Normal |
| 1.2 | Admin can view system health status | `admin`, `dashboard`, `observability` | Normal |
| 1.3 | Admin can view recent admin actions on dashboard | `admin`, `dashboard`, `audit` | Normal |
| 1.4 | Admin can navigate to all management sections | `admin`, `dashboard` | Normal |
| 2.1 | Admin can view paginated user list | `admin`, `users` | High |
| 2.2 | Admin can search users by email, name, or Clerk ID | `admin`, `users`, `search` | High |
| 2.3 | Admin can filter user list by status | `admin`, `users` | Normal |
| 2.4 | Admin can navigate to user detail | `admin`, `users` | High |
| 3.1 | Admin can view user profile with traits | `admin`, `users` | High |
| 3.2 | Admin can view user's personas | `admin`, `users`, `personas` | High |
| 3.3 | Admin can view user's community memberships | `admin`, `users`, `communities` | Normal |
| 3.4 | Admin can view user's endorsements | `admin`, `users`, `endorsements` | Normal |
| 3.5 | Admin can view user's activity feed | `admin`, `users`, `activity` | Low |
| 3.6 | Admin can disable a user account | `admin`, `users`, `moderation` | High |
| 3.7 | Admin can enable a disabled user account | `admin`, `users`, `moderation` | High |
| 3.8 | Admin can reset user contact preferences | `admin`, `users` | Low |
| 4.1 | Admin can initiate read-only impersonation | `admin`, `impersonation`, `support` | Normal |
| 4.2 | Impersonation shows exact user view | `admin`, `impersonation` | Normal |
| 4.3 | Impersonation blocks all mutations | `admin`, `impersonation`, `security` | High |
| 4.4 | Impersonation banner is always visible | `admin`, `impersonation` | Normal |
| 4.5 | Admin can end impersonation session | `admin`, `impersonation` | Normal |
| 4.6 | Impersonation sessions are audit-logged | `admin`, `impersonation`, `audit` | High |
| 4.7 | Impersonation tokens expire after 30 minutes | `admin`, `impersonation`, `security` | High |
| 5.1 | Admin can view paginated community list | `admin`, `communities` | High |
| 5.2 | Admin can search communities | `admin`, `communities`, `search` | High |
| 5.3 | Admin can filter communities by type | `admin`, `communities` | Normal |
| 5.4 | Admin can filter communities by status | `admin`, `communities` | Normal |
| 5.5 | Admin can navigate to community detail | `admin`, `communities` | High |
| 6.1 | Admin can view community details | `admin`, `communities` | High |
| 6.2 | Admin can view community member list | `admin`, `communities` | High |
| 6.3 | Admin can view community endorsements | `admin`, `communities`, `endorsements` | Normal |
| 6.4 | Admin can view community external platforms | `admin`, `communities` | Low |
| 6.5 | Admin can flag a community | `admin`, `communities`, `moderation` | High |
| 6.6 | Admin can unflag a community | `admin`, `communities`, `moderation` | High |
| 6.7 | Admin can archive a community | `admin`, `communities`, `moderation` | High |
| 6.8 | Admin can unarchive a community | `admin`, `communities`, `moderation` | Normal |
| 6.9 | Admin can transfer community founding user | `admin`, `communities`, `moderation` | Normal |
| 6.10 | Admin can adjust community member cap | `admin`, `communities` | Low |
| 7.1 | Admin can browse audit log with pagination | `admin`, `audit` | High |
| 7.2 | Admin can filter audit log by admin user | `admin`, `audit` | Normal |
| 7.3 | Admin can filter audit log by entity type | `admin`, `audit` | Normal |
| 7.4 | Admin can filter audit log by action type | `admin`, `audit` | Normal |
| 7.5 | Admin can filter audit log by date range | `admin`, `audit` | Normal |
| 7.6 | Admin can view before/after diff for audit entries | `admin`, `audit` | High |
| 7.7 | Admin can export filtered audit log as CSV | `admin`, `audit`, `export` | Low |
