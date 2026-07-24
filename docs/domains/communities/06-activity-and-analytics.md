---
type: spec
title: "Communities — Activity & Analytics"
description: "How COs understand what's happening in their community. Covers the activity feed, analytics dashboard, member activation metrics, unmet needs analysis, and community health signals."
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Activity & Analytics

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `03-member-directory.md`
> Primary actor: Community Organizer (CO)
> Related: `docs/specs/integrations/10-activity-tracking.md` (platform integration tracking)

How COs understand what's happening in their community. Covers the activity feed, analytics dashboard, member activation metrics, unmet needs analysis, and community health signals.

This spec is distinct from `docs/specs/integrations/10-activity-tracking.md` (which tracks platform bot usage). This covers **community-level activity** regardless of which platform it originated from.

**How the two systems relate:**
- **This spec** → `activity_events` table → "Is the community healthy?" (all sources combined)
- **Integration tracking** → `integration_activity_daily` table → "Is the Discord/Slack bot delivering value?" (per-platform)
- When a bot processes a search or introduction, the event is recorded in **both** tables: `activity_events` for community-wide analytics here, and `integration_activity_daily` for per-platform tracking in the integrations suite.
- The community health score (§3) includes an "Integration health" factor that reads from `integration_health` — this is the bridge point between the two systems.

---

## 1. Activity Feed

### 1.1 What's Tracked

Events within the community, shown in reverse chronological order:

| Event | Display | Source |
|-------|---------|--------|
| Member joined | "[Name] joined the community" | Join flow |
| Member left | "[Name] left the community" | Leave action |
| Endorsement created | "[Name] endorsed [Name] for [skill]" | Endorsement action |
| Introduction requested | "Someone requested an introduction to [Name]" | Contact request |
| Introduction completed | "An introduction was made between two members" | Contact accept |
| Member traits updated | "[Name] updated their profile" | Member traits edit |
| Search performed | "A search was performed" (no query shown) | Community-scoped search |
| Community settings changed | "[Name] updated community settings" | Settings edit |
| Member promoted | "[Name] was promoted to [role]" | Role change |

**Privacy:** Activity events are anonymized where needed. "A search was performed" — not "Alice searched for grant writing." Endorsement text is shown only if the endorsement is visible.

### 1.2 Server Action

```typescript
getCommunityActivity(input: {
  communityId: string;
  limit?: number;       // Default 20
  offset?: number;
  types?: string[];     // Filter by event type
}): Promise<{
  events: ActivityEvent[];
  total: number;
}>
```

Uses the existing `activity_events` table (already has `communityId` FK).

---

## 2. Analytics Dashboard

### 2.1 Route

Community dashboard → Analytics tab (steward+ only)

### 2.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Analytics                              [This Month ▾]    │
│                                                          │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐│
│ │ 47 searches │ │ 12 profiles│ │ 3 intros   │ │ 8 joins ││
│ │ ▲ 23%       │ │ ▲ 15%      │ │ ▲ 50%      │ │ ▼ 12%  ││
│ └────────────┘ └────────────┘ └────────────┘ └────────┘│
│                                                          │
│ ── Activity Trend (30 days) ─────────────────────────── │
│ [Sparkline chart: daily event counts]                    │
│                                                          │
│ ── Member Activation ────────────────────────────────── │
│ Active (complete profile + ≥1 endorsement):     87 (61%)│
│ Incomplete (joined but profile not complete):   34 (24%)│
│ Dormant (no activity in 30 days):               21 (15%)│
│                                                          │
│ ── Top Skills ───────────────────────────────────────── │
│ [Horizontal bar chart of most common skills]             │
│                                                          │
│ ── Unmet Needs ──────────────────────────────────────── │
│ [Traits searched for but not found — from 03-member-directory.md §5]│
│                                                          │
│ ── Growth ───────────────────────────────────────────── │
│ [Line chart: member count over time]                     │
│                                                          │
│ ── Endorsement Network ──────────────────────────────── │
│ Total endorsements: 234                                  │
│ Members with ≥1 endorsement: 67%                         │
│ Most endorsed skill: landscape photography (28)          │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Time Periods

- This week (7 days)
- This month (30 days) — default
- This quarter (90 days)
- All time

### 2.4 Key Metrics

| Metric | Calculation | Why It Matters |
|--------|-------------|---------------|
| **Searches** | Count of community-scoped searches | "Is anyone using the directory?" |
| **Profile views** | Count of member profile views within community | "Are people looking at each other?" |
| **Introductions** | Requested + completed | "Is discovery leading to connection?" |
| **New members** | Joins this period | "Is the community growing?" |
| **Member activation** | Members with complete profile + ≥1 endorsement | "Are members engaged or just signed up?" |
| **Endorsement density** | Endorsements / members | "How strong is the trust network?" |
| **Skill coverage** | Unique skills / members | "How diverse is the community?" |
| **Unmet needs** | Traits searched but not found | "What's missing?" |

### 2.5 Member Activation Segments

| Segment | Definition | CO Action |
|---------|-----------|-----------|
| **Active** | Complete profile + gave or received ≥1 endorsement | The ideal — celebrate and feature |
| **Incomplete** | Joined but profile <70% complete | Nudge to complete profile |
| **Dormant** | No activity in 30+ days | Re-engagement nudge or "are you still interested?" |
| **New** | Joined in last 7 days | Onboarding flow, welcome message |

---

## 3. Community Health Score

A single health signal visible on the community dashboard header.

### 3.1 Calculation

```
health = weighted average of:
  - Search activity (25%): ≥10 searches/week = healthy
  - Member growth (20%): ≥2 new members/month = healthy
  - Endorsement activity (20%): ≥5 endorsements/month = healthy
  - Introduction flow (15%): ≥1 intro/month = healthy
  - Profile completeness (10%): ≥60% of members have ≥70% complete profiles
  - Integration health (10%): All connected platforms operational (from `integration_health` table, see `docs/specs/integrations/10-activity-tracking.md` §3)
```

### 3.2 Display

| Score | Badge | Meaning |
|-------|-------|---------|
| ≥70 | 🟢 Healthy | Community is active and growing |
| 40-69 | 🟡 Growing | Community is functional but needs attention |
| <40 | 🔴 Needs Attention | Low engagement — CO should take action |

---

## 4. Server Actions

```typescript
getCommunityAnalytics(input: {
  communityId: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;
}): Promise<{
  searches: number;
  profileViews: number;
  introductions: { requested: number; completed: number };
  newMembers: number;
  activation: { active: number; incomplete: number; dormant: number; new: number };
  topSkills: { skill: string; count: number }[];
  unmetNeeds: { query: string; count: number }[];
  endorsements: { total: number; membersWithEndorsements: number };
  dailyActivity: { date: string; total: number }[];
}>
// Steward+ role required.

getCommunityHealthScore(communityId: string): Promise<{
  score: number;       // 0-100
  status: 'healthy' | 'growing' | 'needs_attention';
  factors: { name: string; score: number; weight: number }[];
}>
```

---

## 5. Privacy

Analytics show **aggregate data only**. COs never see:
- Individual search queries
- Who viewed whose profile
- Individual member activity logs
- Which specific members are "dormant" (only counts)

Exception: Member activation **counts** are shown, not individual lists. The CO can see "34 members have incomplete profiles" but not which 34 — unless they browse the member directory and see individual completeness indicators there.

---

## 6. Test Criteria

- Analytics returns correct counts for date range
- Activation segments calculated correctly from profile completeness + endorsement data
- Health score calculation is deterministic and bounded 0-100
- Steward can access analytics, member cannot
- Activity feed shows events in reverse chronological order
- Activity feed respects privacy (no search queries shown)

---

## 7. Implementation Order

1. Activity feed on Overview tab (uses existing `activity_events` table)
2. `getCommunityAnalytics` server action (aggregate queries)
3. Analytics tab — big number cards with period comparison
4. Activity trend sparkline (Recharts)
5. Member activation segments
6. `getCommunityHealthScore` server action
7. Health badge on community dashboard header
8. Growth chart (member count over time)
9. Endorsement network summary
