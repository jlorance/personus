---
type: spec
title: Platform Integrations — Activity Tracking
description: "Community Organizers need to see whether their platform integrations are delivering value. This spec defines a privacy-preserving activity tracking system — no conversation content, no individual…"
status: planned
tags: [integrations]
timestamp: 2026-02-23
---

# Platform Integrations — Activity Tracking

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-overview.md`, `01-shared-architecture.md`, `03-bot-architecture.md`

Community Organizers need to see whether their platform integrations are delivering value. This spec defines a **privacy-preserving activity tracking system** — no conversation content, no individual message data, just volume, health, and benefit metrics.

---

## 1. Design Principles

### 1.1 Privacy First

Personus is an intelligence layer, not a surveillance tool. Activity tracking follows strict rules:

| Rule | What It Means |
|------|--------------|
| **No conversation content** | We never store, process, or summarize message content from any platform |
| **No individual activity logs** | We don't track which specific member used which command when |
| **Aggregate only** | All metrics are counts, not records. "12 searches today" — not who searched for what |
| **No cross-platform correlation** | Activity on Discord stays scoped to Discord. We don't correlate a member's Discord activity with their Slack activity |
| **Organizer-only access** | Only the community's stewards/admins see activity metrics |
| **Deletable** | All activity data can be purged by the organizer at any time |

### 1.2 Value, Not Vanity

Metrics should answer real organizer questions:

- "Is anyone actually using the bot in our Discord?" → **Yes, 47 searches this week**
- "Is the Telegram integration worth keeping?" → **3 introductions facilitated, 12 profile views**
- "Are members engaging with Personus, or did they forget about it?" → **Activity trend: up 23% this month**
- "Which platform gets the most use?" → **Discord: 65%, Telegram: 25%, Slack: 10%**

Not:
- "What did Alice search for?" (privacy violation)
- "How many messages were sent in #general?" (not our data)
- "Who is the most active member?" (surveillance)

---

## 2. What We Track

### 2.1 Event Types

Every interaction between a platform user and Personus generates an **integration event**. Events are categorized by type, not by individual.

| Event Type | Description | Source |
|------------|-------------|--------|
| `search_executed` | A skill/capability search was run | Bot command, Mini App, Widget |
| `profile_viewed` | A member's Personus profile was viewed | Bot command, Mini App |
| `introduction_requested` | An introduction was requested | Bot command, Mini App |
| `introduction_completed` | An introduction was accepted/completed | System |
| `account_linked` | A platform identity was linked to Personus | Link flow, Mini App auto-link |
| `command_used` | A bot command was invoked | Any bot command |
| `miniapp_opened` | A Mini App / Widget was opened | Telegram Mini App, Matrix Widget |
| `member_joined` | A member joined via the platform | Join event (where trackable) |
| `member_left` | A member left via the platform | Leave event (where trackable) |
| `webhook_delivered` | A notification was sent to the platform | Hookshot, Slack webhook |
| `endorsement_created` | An endorsement was created from the platform | Bot flow |

### 2.2 Event Record Schema

Events are stored as **anonymous aggregate counters**, not individual event records. This is the fundamental privacy mechanism.

```typescript
// lib/db/schema/integration-activity.ts

export const integrationActivityDaily = pgTable('integration_activity_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),          // 'discord', 'slack', 'telegram', 'matrix'
  date: date('date').notNull(),                   // Day bucket (no time, no timezone)
  eventType: text('event_type').notNull(),        // From event types above
  count: integer('count').notNull().default(0),   // Aggregate count for this day
}, (table) => [
  // One row per integration × date × event type
  uniqueIndex('integration_activity_daily_unique')
    .on(table.integrationId, table.date, table.eventType),
  index('integration_activity_daily_community')
    .on(table.communityId, table.date),
  index('integration_activity_daily_platform')
    .on(table.platform, table.date),
]);
```

**Why daily buckets, not individual events:**
- A row says "12 searches happened on this platform on Feb 23." Not who searched, not what they searched for, not when during the day.
- Prevents re-identification: even with access to the database, you can't determine which member did what.
- Efficient: one row per day per event type per integration. A community with 5 platform integrations and 11 event types generates at most 55 rows per day.

### 2.3 Event Recording

```typescript
// lib/integrations/activity.ts

import { db } from '@/lib/db';
import { integrationActivityDaily } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function recordIntegrationEvent(params: {
  integrationId: string;
  communityId: string;
  platform: string;
  eventType: string;
}) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await db
    .insert(integrationActivityDaily)
    .values({
      integrationId: params.integrationId,
      communityId: params.communityId,
      platform: params.platform,
      date: today,
      eventType: params.eventType,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [
        integrationActivityDaily.integrationId,
        integrationActivityDaily.date,
        integrationActivityDaily.eventType,
      ],
      set: {
        count: sql`${integrationActivityDaily.count} + 1`,
      },
    });
}
```

**Upsert pattern:** If a row already exists for this integration × date × event type, increment the counter. If not, create a new row with count 1. This is the only write operation — no individual event logs.

---

## 3. Integration Health

Beyond activity volume, organizers need to know if their integrations are **working**. Health is derived from operational signals, not conversation content.

### 3.1 Health Indicators

| Indicator | Healthy | Warning | Unhealthy |
|-----------|---------|---------|-----------|
| **Last event received** | Within 24 hours | 24-72 hours ago | >72 hours ago |
| **Webhook delivery** | All delivered | >5% failures | >25% failures |
| **Bot responsiveness** | Commands answered <5s | Some timeouts | Frequent timeouts |
| **Connection status** | Connected | Reconnecting | Disconnected |

### 3.2 Health Record

```typescript
// Add to platform_channel_bindings table (or a separate health table)
// These fields track operational health, not user activity

export const integrationHealth = pgTable('integration_health', {
  integrationId: uuid('integration_id')
    .primaryKey()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('unknown'), // 'healthy', 'warning', 'unhealthy', 'unknown'
  lastEventAt: timestamp('last_event_at'),
  lastHealthCheckAt: timestamp('last_health_check_at'),
  webhookFailureRate: real('webhook_failure_rate').default(0), // 0.0 - 1.0
  avgResponseTimeMs: integer('avg_response_time_ms'),
  notes: text('notes'),                                // System-generated status notes
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 4. Dashboard UI

### 4.1 Community Organizer View

The activity dashboard is accessible from **Settings → Connections** (per-community) or from the **Community Dashboard**.

```
┌─────────────────────────────────────────────────────────────┐
│  Integration Activity — Portland Rust Guild                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  This Month                              ▲ 23%      │    │
│  │                                                     │    │
│  │  47 Searches  │  12 Profiles  │  3 Intros  │  8 Links│   │
│  │  ■■■■■■■■■■■  │  ■■■■■        │  ■■         │  ■■■   │   │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Discord          │  │ Telegram         │                 │
│  │ ● Healthy        │  │ ● Healthy        │                 │
│  │ 31 searches      │  │ 12 searches      │                 │
│  │ 8 profiles       │  │ 4 profiles       │                 │
│  │ 2 intros         │  │ 1 intro          │                 │
│  │ Last active: 2h  │  │ Last active: 6h  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Matrix           │  │ Slack            │                 │
│  │ ○ Warning        │  │ ● Healthy        │                 │
│  │ 3 searches       │  │ 1 search         │                 │
│  │ 0 profiles       │  │ 0 profiles       │                 │
│  │ 0 intros         │  │ 0 intros         │                 │
│  │ Last active: 3d  │  │ Last active: 1d  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Activity Trend (30 days)                           │    │
│  │                                                     │    │
│  │  ▁▂▃▃▅▆▅▇▆▅▃▄▅▆▇█▇▆▅▆▇▅▆▇█▇▆▅▆▇                │    │
│  │  Jan 24                              Feb 23         │    │
│  │                                                     │    │
│  │  — Searches  — Profiles  — Intros                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Export CSV]  [Clear Activity Data]                        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Metrics

| Metric | Display | Calculation |
|--------|---------|-------------|
| **Searches this period** | Big number + trend arrow | Sum of `search_executed` events |
| **Profiles viewed** | Big number + trend arrow | Sum of `profile_viewed` events |
| **Introductions** | Big number + trend arrow | Sum of `introduction_requested` + `introduction_completed` |
| **Accounts linked** | Big number | Sum of `account_linked` events |
| **Activity trend** | Sparkline or bar chart | Daily totals over 30 days |
| **Platform breakdown** | Per-platform cards | Events grouped by platform |
| **Integration health** | Status badge per platform | From `integration_health` table |
| **Period comparison** | Percentage change | This month vs. last month |

### 4.3 Time Periods

The dashboard supports three time periods:
- **This week** (7 days)
- **This month** (30 days)
- **All time** (since integration was connected)

---

## 5. Server Action

```typescript
// app/actions/integration-activity.ts
'use server';

import { db } from '@/lib/db';
import { integrationActivityDaily, integrationHealth } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { requireCommunityRole } from '@/lib/auth/permissions';

export async function getIntegrationActivity(params: {
  communityId: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}) {
  // Authorization: only stewards/admins
  await requireCommunityRole(params.communityId, ['steward', 'admin']);

  // Aggregate by platform and event type
  const activity = await db
    .select({
      platform: integrationActivityDaily.platform,
      eventType: integrationActivityDaily.eventType,
      total: sql<number>`sum(${integrationActivityDaily.count})`,
    })
    .from(integrationActivityDaily)
    .where(
      and(
        eq(integrationActivityDaily.communityId, params.communityId),
        gte(integrationActivityDaily.date, params.startDate),
        lte(integrationActivityDaily.date, params.endDate),
      ),
    )
    .groupBy(integrationActivityDaily.platform, integrationActivityDaily.eventType);

  // Daily totals for trend chart
  const dailyTotals = await db
    .select({
      date: integrationActivityDaily.date,
      total: sql<number>`sum(${integrationActivityDaily.count})`,
    })
    .from(integrationActivityDaily)
    .where(
      and(
        eq(integrationActivityDaily.communityId, params.communityId),
        gte(integrationActivityDaily.date, params.startDate),
        lte(integrationActivityDaily.date, params.endDate),
      ),
    )
    .groupBy(integrationActivityDaily.date)
    .orderBy(integrationActivityDaily.date);

  // Health status per integration
  const health = await db
    .select()
    .from(integrationHealth)
    .innerJoin(
      integrations,
      eq(integrationHealth.integrationId, integrations.id),
    )
    .where(eq(integrations.communityId, params.communityId));

  return { activity, dailyTotals, health };
}

export async function clearIntegrationActivity(communityId: string) {
  await requireCommunityRole(communityId, ['steward']);

  await db
    .delete(integrationActivityDaily)
    .where(eq(integrationActivityDaily.communityId, communityId));
}
```

---

## 6. Data Retention

Activity data follows a tiered retention policy:

| Data | Retention | Rationale |
|------|-----------|-----------|
| **Daily counters** | 90 days | Sufficient for trend analysis |
| **Monthly rollups** | 2 years | Long-term trend, minimal storage |
| **Health status** | Current only | Only the latest status matters |

### 6.1 Monthly Rollup

A scheduled job (Vercel Cron) rolls up daily counters into monthly summaries:

```typescript
// lib/integrations/activity-rollup.ts

export const integrationActivityMonthly = pgTable('integration_activity_monthly', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  month: text('month').notNull(),                  // 'YYYY-MM' format
  eventType: text('event_type').notNull(),
  count: integer('count').notNull().default(0),
}, (table) => [
  uniqueIndex('integration_activity_monthly_unique')
    .on(table.integrationId, table.month, table.eventType),
]);

// Run monthly: aggregate daily → monthly, then delete daily rows >90 days old
export async function rollupAndPrune() {
  // 1. Aggregate daily rows into monthly summaries
  // 2. Delete daily rows older than 90 days
  // 3. Delete monthly rows older than 2 years
}
```

---

## 7. How Events Are Captured

Each bot endpoint / webhook handler calls `recordIntegrationEvent()` as a side effect. This is lightweight (one upsert) and non-blocking (use `void` to fire-and-forget if needed).

### 7.1 Discord (serverless)

```typescript
// app/api/discord/interactions/route.ts
import { recordIntegrationEvent } from '@/lib/integrations/activity';

// After processing a slash command:
void recordIntegrationEvent({
  integrationId,
  communityId,
  platform: 'discord',
  eventType: 'search_executed', // or 'profile_viewed', etc.
});
```

### 7.2 Telegram (serverless)

```typescript
// In grammY command handler:
bot.command('discover', async (ctx) => {
  // ... execute search ...

  void recordIntegrationEvent({
    integrationId,
    communityId,
    platform: 'telegram',
    eventType: 'search_executed',
  });
});
```

### 7.3 Matrix (bot process)

```typescript
// In Matrix Appservice command handler:
async function handleCommand(roomId: string, command: BotCommand) {
  // ... execute command ...

  void recordIntegrationEvent({
    integrationId,
    communityId,
    platform: 'matrix',
    eventType: command.name === 'search' ? 'search_executed' : 'command_used',
  });
}
```

### 7.4 Slack (serverless)

```typescript
// app/api/slack/commands/route.ts
// After processing a slash command:
void recordIntegrationEvent({
  integrationId,
  communityId,
  platform: 'slack',
  eventType: 'search_executed',
});
```

---

## 8. What This Does NOT Cover

To be explicit about boundaries:

| Not Tracked | Why |
|-------------|-----|
| **Message content** | Privacy. We never read, store, or process conversations. |
| **Message volume** | Not our data. "100 messages in #general today" is the platform's metric, not ours. |
| **Individual user activity** | Privacy. We don't track that Alice searched 5 times today. |
| **Time-of-day patterns** | Could enable re-identification. Daily buckets only. |
| **Search queries** | Privacy. "12 searches" — not "4 searches for Kubernetes, 3 for React." |
| **Platform analytics** | Discord Insights, Slack Analytics, Telegram Statistics are platform features. We don't replicate them. |
| **Member behavior** | We don't score, rank, or classify members by activity. |

---

## 9. Implementation Phases

### Phase 1: Schema + Recording (with first bot)
- [ ] Create `integration_activity_daily` table
- [ ] Create `integration_health` table
- [ ] Create `recordIntegrationEvent()` helper
- [ ] Wire into first bot endpoint (whichever ships first)
- [ ] Basic health status tracking (last event time)

### Phase 2: Dashboard UI
- [ ] Create activity dashboard component
- [ ] Per-platform breakdown cards
- [ ] Trend sparkline (Recharts)
- [ ] Health status badges
- [ ] Time period selector (week / month / all time)
- [ ] Add to community Settings → Connections

### Phase 3: Rollup + Retention
- [ ] Create `integration_activity_monthly` table
- [ ] Monthly rollup cron job
- [ ] 90-day daily data pruning
- [ ] 2-year monthly data pruning
- [ ] "Clear Activity Data" action for organizers

### Phase 4: Insights
- [ ] Period-over-period comparison (this month vs. last month)
- [ ] "Most active platform" highlight
- [ ] "Integration health alert" — notify organizer if an integration goes unhealthy
- [ ] CSV export for organizers who want to analyze externally

---

## 10. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Aggregate counters, not event logs | Privacy. Individual event records enable re-identification. Daily counters do not. |
| 2 | Daily bucket granularity | Balances usefulness (trend analysis) with privacy (no time-of-day correlation). |
| 3 | No search query tracking | "What people search for" is interesting but too identifying. The organizer sees "47 searches" — not the queries. |
| 4 | Fire-and-forget recording | `void recordIntegrationEvent(...)` — activity tracking should never slow down bot responses. |
| 5 | 90-day daily / 2-year monthly retention | Enough for trend analysis, prevents unbounded growth, respectable data minimization. |
| 6 | Organizer can delete all data | GDPR-aligned. Activity data belongs to the community, and the organizer controls it. |
| 7 | Ships with first bot, not before | No point tracking activity before there's activity to track. |
