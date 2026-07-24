---
type: spec
title: Communities — Community Relationships
description: "How communities form explicit connections with other communities. Covers the proposal/acceptance workflow, relationship types, display, dissolution, and advanced features like referral routing and…"
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Community Relationships

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-community-lifecycle.md`
> Primary actors: Community Organizer (CO), Community Admin

How communities form explicit connections with other communities. Covers the proposal/acceptance workflow, relationship types, display, dissolution, and advanced features like referral routing and trait schema inheritance.

**Distinct from "Similar Communities" (spec 04 §2.2):** Similar communities are discovered automatically via embedding similarity. Relationships are intentional, declared, and managed — they represent affiliations that exist in the real world.

---

## 1. Relationship Types

### 1.1 Overview

| Type | Direction | Who Initiates | Meaning |
|------|-----------|--------------|---------|
| `chapter_of` | Directed (child → parent) | Either side | "We are a local branch of this larger community" |
| `affiliated_with` | Bidirectional | Either side | "We're formally connected but independently run" |
| `referral_partner` | Bidirectional | Either side | "We route work/requests to each other when appropriate" |
| `cohort_of` | Directed (child → parent) | Parent admin typically | "This is a time-bounded sub-group of an ongoing community" |

### 1.2 Chapter Of

A community declares itself a chapter (local branch) of a parent community. The parent is the umbrella; chapters are regional/topical sub-groups.

**Examples:**
- Portland Photography → PNW Photography Network
- Nashville Runners → Southeast Running Alliance
- Maplewood Block 4 → Maplewood HOA

**What it enables:**
- Parent's public page shows "12 chapters, 2,400 total members"
- Chapter's public page shows "Part of [Parent Name]" badge with link
- Members of the parent can discover chapters by location/topic
- With CO Base+: chapters can inherit the parent's member trait schema
- With CO Pro: parent CO sees aggregated analytics across chapters

**Constraints:**
- A community can be a chapter of at most one parent
- A chapter can have its own chapters (max 2 levels deep)
- Chapters maintain independent governance — the parent CO cannot manage chapter members

### 1.3 Affiliated With

Two communities declare a formal affiliation. They share identity or purpose but are independently governed.

**Examples:**
- React Portland ↔ React Community (global)
- Bay Area Photo Collective ↔ SF Camera Club
- Two neighborhood communities in adjacent blocks

**What it enables:**
- Both communities show "Affiliated with [Name]" on dashboard and public page
- Cross-discovery: members in one see the other in "Related Communities" (before embedding-based similar communities)
- Potential for shared events or cross-posted notices (future)

**Constraints:**
- No limit on number of affiliations (beyond tier limits on total relationships)
- Affiliations are always bidirectional — both sides must agree

### 1.4 Referral Partner

Two communities agree to route overflow or specialized requests to each other. Primarily useful for guilds and professional networks.

**Examples:**
- Portland Plumbers Guild ↔ Portland Electricians Guild (cross-trade referrals)
- Nashville Trades Guild ↔ Franklin Trades Guild (geographic overflow)
- Two photography clubs with different specialties (weddings ↔ commercial)

**What it enables:**
- When a member search returns no results, CX chat can suggest: "No match here, but our referral partner [Name] might have someone. Want me to check?"
- With CO Pro: automated referral routing — a guild request that can't be fulfilled is offered to the partner community's stewards
- Both communities show "Referral partner" on their pages

**Constraints:**
- Referral routing requires CO Pro on both sides
- The receiving community's stewards must accept each referral (not automatic passthrough)
- Referral metrics are tracked for both communities (see spec 06)

### 1.5 Cohort Of

A time-bounded sub-group of an ongoing community. The parent persists; cohorts come and go.

**Examples:**
- CS50 2024 → CS50 Alumni Network
- React Summit 2026 Mentors → React Summit (ongoing event series)
- Q1 2026 Onboarding → Acme Corp (workplace)

**What it enables:**
- Parent page shows active and past cohorts
- Cohort members automatically get lightweight membership in the parent (configurable)
- When a cohort's event/period ends, members are prompted to stay in the parent community

**Constraints:**
- A cohort typically has an end date (from `communities.endDate` for event types)
- Cohort → parent member flow is opt-in, not forced

---

## 2. Proposal & Acceptance Workflow

All relationships require mutual consent. One community proposes; the other accepts or declines.

### 2.1 Initiating a Relationship

**Entry point:** Community Settings → Relationships tab (admin only)

```
┌─────────────────────────────────────────────────────────┐
│ Community Relationships                                  │
│                                                          │
│ ── Active ───────────────────────────────────────────── │
│ [img] PNW Photography Network     chapter_of    active   │
│       "We are a chapter of this network"       [Manage]  │
│                                                          │
│ [img] SF Camera Club              affiliated    active   │
│       "Affiliated photography community"       [Manage]  │
│                                                          │
│ ── Pending ──────────────────────────────────────────── │
│ [img] Portland Electricians       referral      pending  │
│       "Awaiting their acceptance"              [Cancel]  │
│                                                          │
│ [+ Propose Relationship]                                 │
│                                                          │
│ Relationships used: 2 of 5 (CO Base)                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Propose Relationship Dialog

```
┌─────────────────────────────────────────────────────────┐
│ Propose a Relationship                                   │
│                                                          │
│ Search for a community:                                  │
│ [🔍 Portland Electricians Guild              ]           │
│                                                          │
│ Relationship type:                                       │
│ ○ Chapter of — we're a local branch of this community   │
│ ● Affiliated with — we're formally connected             │
│ ○ Referral partner — we route work to each other         │
│ ○ Cohort of — we're a time-bounded sub-group             │
│                                                          │
│ Message to their admin (optional):                       │
│ [We'd love to set up cross-referrals for overflow     ]  │
│ [work. Our plumbers, your electricians — natural fit.  ] │
│                                                          │
│ [Send Proposal]                                          │
└─────────────────────────────────────────────────────────┘
```

**Community search:** Uses `listPublicCommunities` — can only propose relationships to communities with `publicPresence.level` of `discoverable` or `full`. Private communities can only be linked via direct invite (the proposing CO enters a community slug or receives an invite link).

### 2.3 Receiving a Proposal

The target community's admin receives:
- An in-app notification (spec 08)
- An entry in their Community Settings → Relationships tab under "Pending — Incoming"

```
┌─────────────────────────────────────────────────────────┐
│ ── Incoming Proposals ───────────────────────────────── │
│                                                          │
│ [img] Portland Plumbers Guild wants to be a              │
│       referral partner                                   │
│                                                          │
│ "We'd love to set up cross-referrals for overflow        │
│  work. Our plumbers, your electricians — natural fit."   │
│                                                          │
│ From: Sarah K. (admin) • Proposed 2 days ago             │
│                                                          │
│ [Accept]  [Decline]  [View Community →]                  │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Status Lifecycle

```
pending → active      (accepted by target admin)
pending → declined    (rejected — row deleted after 30 days)
active  → dissolved   (either side ends the relationship)
```

- **Declined proposals** are soft-deleted (kept for 30 days to prevent spam re-proposals, then hard deleted).
- **Dissolved relationships** are kept as historical records (`status: 'dissolved'`) with a `dissolvedAt` timestamp in `metadata`.
- Either community's admin can dissolve an active relationship at any time. The other side is notified.

---

## 3. Display

### 3.1 Community Dashboard

"Related Communities" section in the sidebar or on the Overview tab:

```
┌───────────────────────────────────────┐
│ Related Communities                    │
│                                        │
│ Part of:                               │
│ [img] PNW Photography Network →        │
│                                        │
│ Affiliated:                            │
│ [img] SF Camera Club →                 │
│                                        │
│ Referral partners:                     │
│ [img] Portland Electricians Guild →    │
└───────────────────────────────────────┘
```

### 3.2 Public Page

**Discoverable and Full Profile tiers:**

- **Chapter badge:** "Part of [Parent Name]" shown near the community name/header. Links to the parent's public page.
- **Related Communities section** (below About): Shows affiliated and referral partner communities as small cards with name + type + member count.
- **Parent community page:** "Chapters" section listing active chapters with location and member count.

### 3.3 Community Cards (Explore + My Communities)

A small relationship indicator on the community card when relevant:

- "Chapter of [Parent Name]" as a subtle subtitle
- A link icon if the community has affiliations (hover/tap to see them)

---

## 4. Referral Routing (CO Pro)

When both communities in a `referral_partner` relationship have CO Pro, requests can be routed between them.

### 4.1 Flow

```
Member in Guild A searches "EV charger installation"
  → 0 results in Guild A
  → CX chat: "No match here. Our referral partner
     Guild B specializes in electrical. Want me to check?"
  → Member: "Yes"
  → System checks Guild B for matching members
  → If found: "Guild B has 3 members with EV charger skills.
     Want to request an introduction through them?"
  → Member clicks "Request Introduction"
  → Introduction request goes to Guild B member with context:
     "Referred from Guild A — looking for EV charger installation"
```

### 4.2 Steward Approval

For guild-type communities, referral requests can optionally go through the receiving community's stewards first:

```
communities.settings.referralPolicy: 'auto' | 'steward_review'
```

- `auto` (default): Referral searches are transparent — results are shown and introductions go directly to the member.
- `steward_review`: Referral requests land in the steward's queue first. The steward can accept (routes to the member) or decline (sends "no availability" response).

### 4.3 Referral Tracking

Each referral creates an activity event in both communities:

```typescript
{
  type: 'referral_sent' | 'referral_received' | 'referral_completed',
  fromCommunityId: string,
  toCommunityId: string,
  query: string,              // What was searched for
  resultCount: number,        // Matches found in partner community
}
```

Visible in the analytics dashboard (spec 06) as a "Referrals" section.

---

## 5. Trait Schema Inheritance (CO Base+)

When a community is a chapter of a parent, the parent can share its member trait schema with chapters.

### 5.1 How It Works

- Parent CO defines a member trait schema (e.g., "Skills Offered", "Availability", "Certifications")
- When a chapter relationship is active, the chapter's schema editor shows inherited fields as locked (can't remove or change type, but can add additional fields)
- Chapter COs can extend but not reduce the parent's schema

```
┌─────────────────────────────────────────────────────────┐
│ Member Schema — What members share                       │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔒 1. Skills Offered (tag_input)    [Inherited]     │ │
│ │    From: PNW Photography Network                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 🔒 2. Experience Level (select)     [Inherited]     │ │
│ │    From: PNW Photography Network                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │    3. Local Meetup Day (select)     [Edit] ↕        │ │
│ │    Options: Mon, Tue, Wed, Thu, Fri, Sat, Sun       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [+ Add Field]                                            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Opt-In

Schema inheritance is not automatic. When a chapter relationship is established:

1. Parent admin can choose to share their schema (toggle in relationship settings)
2. Chapter admin can choose to accept inherited fields (toggle on their side)
3. Both must agree — if either opts out, the chapter uses its own independent schema

### 5.3 Schema Updates

When the parent updates their schema:
- New fields are propagated to chapters that have opted in
- Removed fields are marked as "no longer inherited" in chapters (data preserved, field becomes chapter-owned)
- Type changes to existing fields require chapter admin confirmation

---

## 6. Server Actions

```typescript
proposeRelationship(input: {
  fromCommunityId: string;
  toCommunityId: string;
  type: 'chapter_of' | 'affiliated_with' | 'referral_partner' | 'cohort_of';
  message?: string;
}): Promise<{ relationshipId: string; status: 'pending' }>
// Admin of fromCommunity. Validates tier limits. Creates row with status 'pending'.
// Sends notification to target community admins.

respondToRelationship(input: {
  relationshipId: string;
  action: 'accept' | 'decline';
}): Promise<{ status: 'active' | 'declined' }>
// Admin of toCommunity (for directed types) or either community (for bidirectional).

dissolveRelationship(relationshipId: string): Promise<void>
// Admin of either community. Sets status to 'dissolved'. Notifies the other side.

listCommunityRelationships(communityId: string): Promise<{
  active: CommunityRelationshipWithDetails[];
  pending: {
    outgoing: CommunityRelationshipWithDetails[];
    incoming: CommunityRelationshipWithDetails[];
  };
}>
// Any community member can view. Pending details visible to admins only.

// Referral routing (CO Pro)
searchReferralPartners(input: {
  communityId: string;
  query: string;
}): Promise<{
  partner: { communityId: string; communityName: string };
  results: SearchResult[];
}[]>
// Searches across referral partner communities. Returns grouped by partner.
// Only available when both communities have CO Pro.

// Schema inheritance (CO Base+)
toggleSchemaSharing(input: {
  relationshipId: string;
  side: 'parent' | 'chapter';
  enabled: boolean;
}): Promise<void>
// Parent toggles sharing; chapter toggles acceptance.

interface CommunityRelationshipWithDetails {
  id: string;
  type: string;
  status: string;
  relatedCommunity: {
    id: string;
    name: string;
    slug: string;
    profileImageUrl?: string;
    icon?: string;
    communityType: string;
    memberCount: number;
  };
  direction: 'from' | 'to';      // Which side of the relationship this community is on
  message?: string;
  createdAt: Date;
}
```

---

## 7. Validation

```typescript
proposeRelationshipSchema = z.object({
  fromCommunityId: z.string().uuid(),
  toCommunityId: z.string().uuid(),
  type: z.enum(['chapter_of', 'affiliated_with', 'referral_partner', 'cohort_of']),
  message: z.string().max(500).optional(),
}).refine(d => d.fromCommunityId !== d.toCommunityId, {
  message: "A community cannot relate to itself",
});

respondToRelationshipSchema = z.object({
  relationshipId: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});
```

---

## 8. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Community A proposes to B; B proposes to A (same type) | Second proposal auto-accepts — both wanted it |
| Community is archived while relationship is active | Relationship stays but is hidden from display. Unarchiving restores it. |
| Community is closed (spec 11) | All relationships dissolved automatically. Partners notified. |
| Chapter's parent is closed | Chapter becomes independent (relationship dissolved). Chapter is notified. |
| Free-tier community hits relationship limit | Show upgrade prompt: "Upgrade to CO Base to add more relationships" |
| Referral search to a partner that has no matches | Return empty gracefully: "No matches at [Partner Name] either. Consider posting a notice." |
| Both communities in a referral have the same member | Don't show the member twice. Prefer the community where the member has more endorsements. |
| Admin who initiated a relationship leaves the community | Relationship persists — it's between communities, not individuals |

---

## 9. Test Criteria

### Unit Tests

- `proposeRelationship` creates row with `pending` status
- `proposeRelationship` rejects self-referential relationships
- `proposeRelationship` respects tier limits (free: 1, CO Base: 5, CO Pro: unlimited)
- `proposeRelationship` rejects duplicate pending/active relationships of the same type
- `respondToRelationship` sets status to `active` on accept
- `respondToRelationship` soft-deletes on decline
- `dissolveRelationship` sets status to `dissolved`, preserves record
- `chapter_of` enforces max-one-parent constraint
- `chapter_of` enforces max 2 levels deep
- Bidirectional types (`affiliated_with`, `referral_partner`) stored with consistent direction
- `listCommunityRelationships` returns relationships from both directions
- `searchReferralPartners` only works when both communities have CO Pro
- `searchReferralPartners` returns results grouped by partner community
- Schema inheritance: inherited fields are locked in chapter's schema editor
- Schema inheritance: chapter can extend but not remove inherited fields

### Integration Tests

- Propose → accept → verify both communities show relationship
- Propose → decline → verify 30-day retention then cleanup
- Dissolve → verify both sides notified, relationship marked dissolved
- Community closure → verify all relationships dissolved
- Referral search → member found in partner → introduction request created with referral context

### E2E Tests

- CO opens Settings → Relationships → proposes affiliation to another community → partner accepts → both dashboards show "Related Communities"
- CO proposes chapter_of → parent accepts → chapter shows "Part of" badge on public page
- Member searches in CX chat → no results → CX offers referral partner search → member requests intro through partner
- CO on free tier tries to add second relationship → sees upgrade prompt
- CO dissolves a relationship → other community's admin is notified → relationship disappears from both dashboards

---

## 10. Implementation Order

1. `community_relationships` schema + migration (replaces `parentCommunityId`)
2. `proposeRelationship` + `respondToRelationship` + `dissolveRelationship` server actions
3. `listCommunityRelationships` server action
4. Relationships tab in Community Settings (propose, view, manage)
5. Proposal notification (spec 08 integration)
6. "Related Communities" display on dashboard sidebar
7. "Part of" badge + related communities section on public page
8. Relationship indicators on community cards (Explore + My Communities)
9. Referral routing — `searchReferralPartners` server action (CO Pro)
10. CX chat integration — "No match here, check referral partner?" flow
11. Referral steward review queue (CO Pro, `steward_review` policy)
12. Referral tracking (activity events, analytics integration)
13. Trait schema inheritance — parent sharing toggle, chapter acceptance toggle
14. Schema editor locked/inherited field display
15. Schema update propagation (parent changes → chapter notification)
