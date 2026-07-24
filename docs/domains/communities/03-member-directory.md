---
type: spec
title: "Communities — Member Directory & Scoped Search"
description: "This spec covers the core value proposition: \"Who in my community knows X?\" It defines how members are listed, searched, filtered, and displayed within community context."
status: current
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Member Directory & Scoped Search

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `02-membership.md`
> Primary actors: Community Organizer (CO), Community Member (CM)

This spec covers the core value proposition: **"Who in my community knows X?"** It defines how members are listed, searched, filtered, and displayed within community context.

---

## 1. The Core Interaction

A member opens their community and asks: "Who here knows grant writing?" or "Anyone have a boom lift?" or "Who shoots medium format?"

**The primary interface for this is conversational (CX).** Members speak or type what they need — in the community dashboard's CX chat bar (see `01-community-lifecycle.md` §2.7), in a platform bot (Discord `/discover`, Slack `/whocando`), or via external AI agents (MCP). The same `searchCommunityMembers` server action powers all surfaces.

Personus answers with:
1. **Semantic search** across member personas + member traits within this community
2. **Trust-ranked results** — endorsed members surface first
3. **Privacy-preserving display** — only shows what the persona's visibility allows
4. **Action-oriented results** — every result has "Request Introduction" and "Endorse"

This is what makes Personus more than a directory. It's a **capability search engine** scoped to a trust network — and it works the way people naturally ask for help: by saying what they need.

---

## 2. Member Directory (Browse Mode)

### 2.1 Route

Community dashboard → Members tab (authenticated, any member)

### 2.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Members (142)                                            │
│                                                          │
│ Filter: [All Roles ▾] [Any Skill ▾] [Sort: Endorsements ▾]│
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [S] Sarah K.               admin  •  8 endorsements  │ │
│ │ Community organizer                                   │ │
│ │ Skills: trail planning, group leadership, first aid   │ │
│ │ [View Profile] [Endorse]                              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [N] Nadia K.               member •  5 endorsements  │ │
│ │ Landscape photographer                                │ │
│ │ Skills: landscape, wildlife • Gear: Canon R5          │ │
│ │ [View Profile] [Request Intro] [Endorse]              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [C] Carlos M.              member •  3 endorsements  │ │
│ │ Street photographer                                   │ │
│ │ Skills: street, documentary • Gear: Fuji X-T5        │ │
│ │ [View Profile] [Request Intro] [Endorse]              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Load More]                                              │
│                                                          │
│ Steward/Admin only:                                      │
│ [+ Invite Members] [Export Member List]                  │
└─────────────────────────────────────────────────────────┘
```

**No search bar on this tab.** The Members tab is for **browsing** — structured filters (role, skill, sort) let you narrow the list visually. For capability search ("who knows grant writing?"), use the CX chat bar at the bottom of the dashboard (see `01-community-lifecycle.md` §2.7). This keeps the UI clean and mobile-friendly, and makes the CX chat the natural entry point for discovery.

### 2.3 What Each Member Card Shows

| Field | Source | Always Visible |
|-------|--------|---------------|
| Display name | Persona `displayName` | Yes |
| Headline | Persona `headline` | Yes |
| Role badge | `community_members.role` | Yes |
| Endorsement count | Count of community-scoped endorsements | Yes |
| Skills | Persona traits + member traits (merged) | Per visibility setting |
| Member traits | `community_members.memberTraits` | Yes (community-scoped) |
| Location | Persona `location` | Per visibility setting |

### 2.4 Sort Options

| Sort | Logic | Default |
|------|-------|---------|
| **Endorsements** (default) | Descending by community-scoped endorsement count | Yes |
| **Recently joined** | Descending by `joinedAt` | |
| **Name** | Alphabetical by `displayName` | |

### 2.5 Filter Options

| Filter | Source | Options |
|--------|--------|---------|
| **Role** | `community_members.role` | All, Members, Stewards, Admins |
| **Skills** | Persona traits (skills array) | Autocomplete from community's skill pool |
| **Member traits** | `community_members.memberTraits` | Dynamic from community's `memberTraitSchema` (e.g., "Experience Level: Advanced") |
| **Has endorsements** | Endorsement count | Yes / No / Any |

---

## 3. Community-Scoped Search (CX-First)

The "who knows X?" search is the core value prop. It's designed **conversational-first (CX)** — members ask naturally in their own words, whether through the dashboard chat, a platform bot, or an AI agent. There's no dedicated search page to build or maintain.

### 3.1 Surfaces

Search happens through these CX surfaces — all powered by the same `searchCommunityMembers` server action:

| Surface | How It Works | Example |
|---------|-------------|---------|
| **Dashboard CX Chat** | Member types in the persistent chat bar at the bottom of the community dashboard | "Who knows grant writing?" → inline member cards |
| **Platform Bot** | Member types a command in Discord, Slack, Telegram | `/discover grant writing` → embedded result cards |
| **AI Agent (MCP)** | External agent calls the community search tool | "Find someone who can help with a kitchen remodel" |
| **Visual prompts** | The CX chat and Members tab can surface available traits as tappable chips — a complement to typing, not a replacement | [grant writing] [solar installation] [first aid] |

**Why CX-first?** A search box requires a dedicated UI, keyboard, and screen real estate. CX works everywhere — in the app, in Discord, on a phone via voice. It keeps the UI minimal, mobile-friendly, and consistent across surfaces. Members just say what they need.

### 3.2 How It Works

```
Member says: "who knows grant writing?"
  │
  ├─ Query is sent to semantic search
  │
  ├─ Search scope:
  │  1. Persona embedding similarity (cosine distance via pgvector)
  │  2. Member traits text matching
  │  3. Persona skills keyword matching
  │
  ├─ Results filtered to:
  │  - Members of this community only
  │  - Personas with visibility >= 'authenticated' (or community-scoped)
  │  - Members with visible = true
  │
  ├─ Results ranked by:
  │  1. Semantic relevance score (0-1)
  │  2. Endorsement boost (endorsed members get a ranking bonus)
  │  3. Completeness boost (complete profiles rank higher)
  │
  └─ Top N results returned with match metadata
```

### 3.3 Search Result Display

Results are rendered inline in the CX surface — as member cards in the chat panel, as embeds in Discord, etc. The format adapts to the surface but always includes:

| Field | Source | Purpose |
|-------|--------|---------|
| **Match reason** | Search analysis | "grant writing (skill), federal grants (experience)" — why this person matched |
| **Context snippet** | Persona traits / member traits | Relevant text from their profile that matches the query |
| **Trust signals** | Endorsements | Top endorsement text that relates to the query skill |
| **Relevance score** | Semantic similarity | Internal, used for ranking (not shown to user) |

**In the dashboard CX chat**, results appear as condensed member cards:

```
💬 Community Coach
Found 4 members with grant writing experience:

┌─────────────────────────────────────────────────────┐
│ [R] Rebecca T.          steward  •  6 endorsements   │
│ Non-profit consultant                                 │
│ Match: grant writing (skill), federal grants (exp)    │
│ "Rebecca's grant proposals have a 40% success rate"   │
│ [Request Introduction]    [View Profile]              │
├─────────────────────────────────────────────────────┤
│ [M] Marcus D.            member  •  2 endorsements   │
│ Environmental scientist                               │
│ Match: grant writing (skill)                          │
│ "Written 3 successful state-level grants"             │
│ [Request Introduction]    [View Profile]              │
└─────────────────────────────────────────────────────┘

🔒 Contact info is never shared directly.
```

**Visual prompts (optional enhancement):** In the app, the CX chat and Members tab can show tappable trait chips to help members who aren't sure what to search for. These are generated from the community's aggregated skills:

```
Try asking about:
[grant writing] [event planning] [web design] [photography] [legal]
```

Tapping a chip fills the CX input with a search query. This visual prompting complements the conversational interface — it doesn't replace it. It's especially useful for new members exploring what the community offers.

### 3.4 Zero-Result Handling

When a search returns no matches, the CX response is helpful rather than empty:

- "No one in this community has listed grant writing yet."
- If unmet needs tracking is enabled: "This has been searched for 3 times. Want to post a notice asking the community?"
- Offers to post a notice (type: `looking_for`) — prefills the notice form with the query

This turns a dead-end into an action and feeds the unmet needs tracking (§5.3).

---

## 4. Server Actions

### 4.1 List Members

```typescript
listCommunityMembers(input: {
  communityId: string;
  role?: 'member' | 'steward' | 'admin';
  skills?: string[];          // Filter by specific skills
  memberTraitFilters?: Record<string, string>;  // Filter by member trait values
  sortBy?: 'endorsements' | 'joined' | 'name';
  limit?: number;             // Default 20
  offset?: number;
}): Promise<{
  members: CommunityMemberWithPersona[];
  total: number;
}>
// Browse-mode list with structured filters. For semantic search
// ("who knows X?"), use searchCommunityMembers via CX surfaces.
```

**Authorization:** Any community member can list. Public community pages show a limited subset (featured members only — see `01-community-lifecycle.md` §4).

### 4.2 Search Members

```typescript
searchCommunityMembers(input: {
  communityId: string;
  query: string;              // Natural language query
  limit?: number;             // Default 10
}): Promise<{
  results: SearchResult[];
  total: number;
}>

interface SearchResult {
  member: CommunityMemberWithPersona;
  score: number;              // 0-1 relevance
  matchReasons: string[];     // ["skill: grant writing", "experience: federal grants"]
  contextSnippet?: string;    // Relevant text from profile
  endorsementSnippet?: string;// Relevant endorsement text
}
```

**How the search works internally:**

1. Generate embedding for the query text (same model: `text-embedding-3-small`)
2. Query community members' persona embeddings via pgvector cosine similarity
3. Also do keyword matching on skills arrays and member traits text fields
4. Combine semantic + keyword scores
5. Apply endorsement boost: `finalScore = semanticScore * (1 + 0.1 * endorsementCount)`
6. Apply completeness boost: `finalScore *= (0.8 + 0.2 * completenessScore)`
7. Filter by visibility and membership status
8. Return top N results with match metadata

### 4.3 Types

```typescript
interface CommunityMemberWithPersona {
  membership: {
    id: string;
    role: 'member' | 'steward' | 'admin';
    memberTraits: Record<string, unknown>;
    joinedAt: Date;
    visible: boolean;
  };
  persona: {
    id: string;
    displayName: string;
    headline: string;
    uri: string;
    entityType: string;
    traits: Record<string, unknown>;  // Filtered by visibility
    location?: string;
  };
  endorsementCount: number;           // Community-scoped count
  topEndorsement?: {                  // Highest-rated endorsement text
    endorserName: string;
    strength: string;
    text: string;
  };
}
```

---

## 5. Community Capability Profile ("Who's Here")

An aggregate view of what capabilities, traits, and resources exist in the community. This is the community's **member-derived profile** — a complement to the community's own profile traits (mission, location, focus areas) defined in `01-community-lifecycle.md`. Together they answer: "What is this community, and what can its members do?"

**Where it appears:**
- **Dashboard Overview tab** — Full view for community members (all aggregated data + unmet needs)
- **Full Profile public page** — Condensed "What Members Offer" section showing top skills with counts (see `01-community-lifecycle.md` §4.3). Unmet needs are NOT shown publicly (CO-only insight). Only skills from opted-in/visible members are included in the public version.
- **Featured Members** — Top-endorsed members shown as a card carousel (3-6 members). Appears on both the dashboard Overview and the public page. Members shown are those with the highest community-scoped endorsement count and `visible = true`.

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│ What This Community Offers                  85 members   │
│                                                          │
│ ── Top Skills ───────────────────────────────────────── │
│                                                          │
│ [landscape photography ██████████ 15]                    │
│ [wildlife              ████████ 12]                      │
│ [portrait              ███████ 10]                       │
│ [street                ██████ 8]                         │
│ [darkroom printing     ████ 6]                           │
│ Click any skill to see members →                         │
│                                                          │
│ ── Members By Experience ────────────────────────────── │
│                                                          │
│ Beginner: 12  •  Intermediate: 35  •  Advanced: 28      │
│ Professional: 10                                         │
│                                                          │
│ ── Resources Available ──────────────────────────────── │
│                                                          │
│ Lighting equipment (18)  •  Studio space (4)             │
│ Drone (6)  •  Darkroom access (2)                        │
│                                                          │
│ ── Languages Spoken ─────────────────────────────────── │
│                                                          │
│ English (82)  •  Spanish (14)  •  Mandarin (3)          │
│ Japanese (2)  •  Korean (1)                              │
│                                                          │
│ ── Unmet Needs ──────────────────────────────────────── │
│ Searched for but no matches found:                       │
│ Underwater photography (3 searches)                      │
│ Film processing (2 searches)                             │
│ Drone pilot (1 search)                                   │
│                                                          │
│ 💡 Consider inviting members with these capabilities     │
└─────────────────────────────────────────────────────────┘
```

**Key interaction:** Clicking any skill tag navigates to the member directory filtered by that skill — from "the community has 15 landscape photographers" to "here are the 15 landscape photographers."

### 5.1.1 What Gets Aggregated

The sections in this view are generated dynamically from the community's `memberTraitSchema` — whatever fields the CO has configured for members to share, the aggregate view summarizes them:

| Schema field type | Aggregate display |
|-------------------|-------------------|
| Array (skills, languages, gear) | Tag cloud with counts |
| Enum/select (experience level) | Breakdown bar chart |
| Boolean (has_studio, available_weekends) | Count of "yes" |
| Free text | Not aggregated (privacy) |

Skills are always aggregated from persona traits regardless of member trait schema — they're the universal capability signal.

### 5.2 Server Actions

```typescript
getCommunityCapabilityProfile(communityId: string): Promise<{
  memberCount: number;
  topSkills: { skill: string; count: number }[];
  memberTraitSummary: Record<string, Record<string, number>>;  // e.g., { experienceLevel: { beginner: 12, advanced: 28 } }
  unmetNeeds: { query: string; searchCount: number }[];
}>
```

**Skill aggregation:** Extract skills from all member personas' traits arrays. Count occurrences. Sort by count.

**Member trait aggregation:** For each field in `memberTraitSchema`, aggregate values across all members. Only aggregate array, enum, and boolean fields — free text fields are skipped for privacy.

```typescript
getFeaturedMembers(communityId: string, limit?: number): Promise<CommunityMemberWithPersona[]>
// Returns top-endorsed visible members, limited to 6.
// Used on both the dashboard Overview tab and the public page.
// For the public page: only includes members with visible = true.

getPublicCapabilityProfile(communityId: string): Promise<{
  memberCount: number;
  topSkills: { skill: string; count: number }[];
}>
// Public-safe version of getCommunityCapabilityProfile.
// Only includes top skills (no gaps, no member trait breakdown).
// Used on the Full Profile public page.
```

**Unmet needs:** Track searches within this community that returned 0 results. Aggregate the query terms. This is valuable CO intelligence — it tells them what the community is being asked for but can't deliver. Could be skills, gear, languages, availability, certifications — whatever the community's members are expected to offer.

### 5.3 Unmet Needs Tracking

When a community-scoped search returns 0 results:

```typescript
recordUnmetNeed(input: {
  communityId: string;
  query: string;
  date: string;   // YYYY-MM-DD
})
```

Stored as daily aggregate counters (same pattern as `10-activity-tracking.md`):

```typescript
export const communityUnmetNeeds = pgTable('community_unmet_needs', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  queryTerm: text('query_term').notNull(),          // Normalized search term
  date: date('date').notNull(),
  count: integer('count').notNull().default(1),
}, (table) => [
  uniqueIndex('community_unmet_needs_unique')
    .on(table.communityId, table.queryTerm, table.date),
  index('idx_unmet_needs_community').on(table.communityId),
]);
```

---

## 6. Member Profile in Community Context

When a member clicks "View Profile" from within a community, they see the persona **in community context** — member traits alongside persona traits.

### 6.1 Route

`/communities/[slug]/members/[personaUri]` — Member profile within community

### 6.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to [Community Name]                               │
│                                                          │
│ [N] Nadia K.                              member         │
│ Landscape photographer                                   │
│ 📍 Mill Valley, CA                                       │
│                                                          │
│ ── In This Community ─────────────────────────────────── │
│ Skills Offered: landscape, wildlife, astrophotography    │
│ Gear Available: Canon R5, 70-200mm f/2.8, star tracker  │
│ Experience Level: Advanced                               │
│ Availability: Weekends, some weekday evenings            │
│                                                          │
│ ── Endorsements (5) ─────────────────────────────────── │
│ Sarah K. (strong): "Nadia's landscape work is...        │
│ Bob M. (standard): "Great eye for composition"          │
│ [View all endorsements]                                  │
│                                                          │
│ ── Full Profile ──────────────────────────────────────── │
│ Skills: landscape, wildlife, astrophotography, editing   │
│ Experience: 10 years • Former National Geographic intern │
│ Values: Environmental conservation, visual storytelling  │
│                                                          │
│ [Request Introduction]    [Endorse Nadia]                │
│                                                          │
│ 🔒 Contact info is private. Nadia decides whether to     │
│    share it after you request an introduction.            │
└─────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- Community-specific member traits shown **first** (above the fold) — this is why someone is looking at this member in this context
- Full persona profile shown below, but clearly separated
- Endorsements shown are community-scoped first, then global
- Action buttons are prominent — the goal is connection, not just viewing

---

## 7. Bot / Platform Integration

The member directory and search are the primary features exposed via platform bots (Discord, Slack, Telegram, Matrix). The bot commands call the same server actions:

| Bot Command | Maps To |
|-------------|---------|
| `/discover TypeScript` | `searchCommunityMembers(communityId, "TypeScript")` |
| `/whocando grant writing` | `searchCommunityMembers(communityId, "grant writing")` |
| `/profile @alice` | Member profile lookup |
| `/community` | `getCommunityCapabilityProfile(communityId)` |

Bot formatting (embeds, Block Kit, inline keyboards) is handled by the platform-specific specs in `docs/specs/integrations/`.

---

## 8. Privacy Enforcement

### 8.1 Visibility Rules

| Data | Who Sees It |
|------|------------|
| Member's display name + headline | All community members |
| Member traits | All community members (these are community-scoped by design) |
| Persona skills (public) | All community members |
| Persona skills (authenticated) | All community members (they're authenticated) |
| Persona skills (private) | Only the member themselves |
| Contact info | Never shown — always mediated |
| Member's other communities | Never shown in this community context |

### 8.2 Search Privacy

- Search results only include members whose `visible` flag is `true`
- Search results only include trait data the persona's visibility allows
- Search result context snippets are generated from visible data only
- No search query logging that could identify who searched for what (see privacy model in `10-activity-tracking.md`)

### 8.3 CO Analytics Privacy

COs see aggregate data (top skills, unmet needs, member counts) but NOT:
- Individual search queries
- Who searched for whom
- Which members were viewed most
- Individual member activity patterns

---

## 9. Validation Schemas

```typescript
// lib/validations/communities.ts (additions)

listMembersSchema = z.object({
  communityId: z.string().uuid(),
  role: z.enum(['member', 'steward', 'admin']).optional(),
  skills: z.array(z.string().max(100)).max(10).optional(),
  memberTraitFilters: z.record(z.string()).optional(),
  sortBy: z.enum(['endorsements', 'joined', 'name']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
// Note: No search param — browse uses structured filters.
// Semantic search is handled by searchCommunityMembers via CX.

searchMembersSchema = z.object({
  communityId: z.string().uuid(),
  query: z.string().min(2).max(200),
  limit: z.number().int().min(1).max(50).optional(),
});
```

---

## 10. Test Criteria

### Unit Tests

- `listCommunityMembers` returns only members of the specified community
- `listCommunityMembers` respects `visible` flag (hidden members excluded)
- `listCommunityMembers` sorts by endorsement count by default
- `listCommunityMembers` filters by role correctly
- `searchCommunityMembers` returns results ranked by relevance
- `searchCommunityMembers` boosts endorsed members
- `searchCommunityMembers` excludes non-visible members
- `searchCommunityMembers` respects persona visibility settings
- `getCommunityCapabilityProfile` aggregates skills correctly
- `getCommunityCapabilityProfile` returns accurate member trait summaries
- Unmet need recording increments counters correctly

### Integration Tests

- Member joins → appears in directory
- Member leaves → disappears from directory
- Member updates traits → search results reflect changes
- Search "grant writing" → returns members with grant writing skills
- Search with 0 results → unmet need recorded
- Endorsement created → member's endorsement count updates → ranking changes

### E2E Tests

- CM opens Members tab → sees member list → filters by skill → finds relevant member → requests intro
- CM types "who knows grant writing?" in CX chat → sees inline member cards with match reasons → clicks "Request Introduction"
- CM taps a trait chip in CX chat → search executes → results appear inline
- CM searches for a skill no one has → CX suggests posting a notice → notice form prefilled
- CO views capability profile → sees top skills, member breakdown, and gaps → invites someone to fill a gap
- Bot command `/discover TypeScript` → returns same results as CX chat search

---

## 11. Implementation Order

1. `listCommunityMembers` server action (basic list, no search)
2. Members tab UI — member list with role/skill filters and sort
3. Member card component (`MemberCard`)
4. `searchCommunityMembers` server action (semantic + keyword)
5. CX chat integration — wire search results into Community Coach inline responses (see `01-community-lifecycle.md` §2.7)
6. Search result card component (inline in CX, adaptable to bot embeds)
7. Visual trait prompts — tappable chips generated from community skill pool (optional CX enhancement)
8. Zero-result → notice suggestion flow
9. `getCommunityCapabilityProfile` server action
10. Community capability profile component on Overview tab
11. `communityUnmetNeeds` schema + recording
12. Unmet needs section on Overview tab
13. Member profile in community context page
14. `listPublicDirectoryMembers` + `searchPublicDirectory` server actions
15. Public directory page UI (`/g/[slug]/directory`)
16. Public directory SEO (metadata, structured data, OG image)

---

## 12. Public Community Directory

The browsable member directory that appears when a community's public presence is **Full Profile** (see `01-community-lifecycle.md` §3.2.3). Two access modes:

- **Members-only** (default): The community's public page shows aggregate info (top skills, notices, pulse) but the browsable member directory is behind authentication + membership
- **Public**: Anyone can browse opted-in members — the "Find a Plumber" page

This spec covers the **public** access mode. The members-only mode uses the internal member directory (§2) with no additional work.

**Distinct from the internal member directory (§2):** The internal directory is for community members, shows all members, and uses the full member card. The public directory is for visitors, shows only opted-in members, and displays only the fields the CO has configured.

### 12.1 Route

`/g/[slug]/directory` — Public (no authentication required when `directory.access` is `'public'`)

### 12.2 Prerequisites

- Community has `publicPresence.level: 'full'`
- Community has `publicPresence.directory.access: 'public'`
- At least one member has opted in (`community_members.directoryOptIn = true` — see `02-membership.md` §2.6)

If the community's presence level is not `full`, or directory access is `members`, the route returns 404 (for non-members) or redirects to the internal directory (for members). If public but no members have opted in, show an empty state: "No members have joined the public directory yet."

### 12.3 Layout

The directory page leads with dynamic content — the community's latest notices and pulse — before the member listing. This gives the page a "living" feel even when the member list itself is relatively stable.

**Example: Tri-County Trades Guild (Guild)**

```
┌─────────────────────────────────────────────────────────┐
│ ← Tri-County Trades Guild                                │
│                                                          │
│ Find a Professional                         42 listed    │
│                                                          │
│ ── What's Happening ────────────────────────────────── │
│ [gift] "Offering free estimates for EV charger installs  │
│  through end of March." — Marcus D. • 3 hours ago        │
│ [megaphone] "New licensing requirements for solar        │
│  installers." — admin • 1 day ago                        │
│                                                          │
│ 🔍 Search by skill, specialty, or keyword...             │
│ [plumbing, solar installation, kitchen remodel]          │
│                                                          │
│ Filter: [Any Skill ▾]  [Any Location ▾]                  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [M] Mike R.                                          │ │
│ │ Licensed master plumber                              │ │
│ │ 📍 Nashville, TN                                     │ │
│ │ Skills: residential plumbing, kitchen, bathroom      │ │
│ │ Certifications: TN Master Plumber License            │ │
│ │ ★ 12 endorsements                                    │ │
│ │                                                      │ │
│ │ [Request Introduction]                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [S] Sandra L.                                        │ │
│ │ Solar installation specialist                        │ │
│ │ 📍 Franklin, TN                                      │ │
│ │ Skills: solar panels, EV chargers, electrical        │ │
│ │ ★ 8 endorsements                                     │ │
│ │                                                      │ │
│ │ [Request Introduction]                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Load More]                                              │
│                                                          │
│ 🔒 Contact info is never shown publicly. Use             │
│    "Request Introduction" to reach a member.             │
│                                                          │
│ Want to join this guild? [Learn More →]                   │
└─────────────────────────────────────────────────────────┘
```

**Example: Portland Trail Running (Club — public directory)**

```
┌─────────────────────────────────────────────────────────┐
│ ← Portland Trail Running                                 │
│                                                          │
│ Meet Our Runners                            68 listed    │
│                                                          │
│ ── What's Happening ────────────────────────────────── │
│ [magnifying glass] "Need a pacer for Gorge Waterfalls    │
│  100K. Miles 60-80." — Carlos M. • 2 days ago            │
│ [gift] "2 extra spots in my car to Bend this weekend.    │
│  Gas split." — Mika T. • 5 hours ago                     │
│                                                          │
│ 🔍 Search by skill, distance, or name...                 │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [A] Alma P.                                          │ │
│ │ Ultra runner & trail guide                           │ │
│ │ 📍 Portland, OR                                      │ │
│ │ Distances: 50K, 100K, 100mi                          │ │
│ │ Willing to pace: Yes                                 │ │
│ │ ★ 8 endorsements                                     │ │
│ │                                                      │ │
│ │ [Request Introduction]                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Want to run with us? [Join the Community →]               │
└─────────────────────────────────────────────────────────┘
```

### 12.4 Content Priority

Like the public community page (see `01-community-lifecycle.md` §4.3), the directory prioritizes fresh content above static listings:

| Priority | Section | Owned By |
|---------|---------|----------|
| 1 | **What's Happening** (notices) | `10-notices.md` §4.3 |
| 2 | **Search + filters** | This spec (below) |
| 3 | **Member listing** | This spec (below) |
| 4 | **Join CTA** | `01-community-lifecycle.md` |

The "What's Happening" section shows up to 2 recent active notices (see `10-notices.md` §4.3 for display rules and public safety filtering). If no active notices exist, the section is hidden (not an empty state).

### 12.5 What Visitors See

Only data the CO has explicitly approved via `publicPresence.directory.visibleFields`:

| Field | Source | Always Visible |
|-------|--------|---------------|
| Display name | Persona `displayName` | Yes (required minimum) |
| Headline | Persona `headline` | Yes (required minimum) |
| Endorsement count | Community-scoped endorsements | Only if CO enabled `showEndorsements` |
| Member trait fields | `community_members.memberTraits` | Only fields in `visibleFields` |
| Contact info | — | **Never** — always mediated |

**What visitors NEVER see:**
- Full persona profile or traits not in `visibleFields`
- Other community memberships
- The member's other personas
- Email, phone, or any direct contact method

### 12.6 Search (When Enabled)

If the CO has enabled `publicPresence.directory.allowSearch`:

- **Keyword search** on persona `displayName`, `headline`, and visible member trait fields
- **Skill filter** — autocomplete from the aggregated skills of opted-in members
- **Location filter** — if location is in `visibleFields`
- No semantic/embedding search for the public directory (that's an internal feature) — keyword matching is sufficient and doesn't require authentication
- Results sorted by endorsement count (highest first), then alphabetical

If search is disabled, visitors can only browse the paginated list.

### 12.7 Request Introduction (Visitor Flow)

When a visitor clicks "Request Introduction" on a public directory member:

1. **If not logged in:** Prompt to sign up or log in, then return to the request flow
2. **If logged in:** Standard introduction request flow (`app/actions/contacts.ts`) with the community as context
3. **If visitor doesn't want to sign up:** The community's public page shows external links (website, phone) as an alternative contact path — the directory page links back to the community page with a "Contact this community directly" prompt

### 12.8 Server Actions

```typescript
listPublicDirectoryMembers(input: {
  communitySlug: string;
  search?: string;            // Keyword search (if CO enabled)
  skills?: string[];          // Filter by specific skills
  location?: string;          // Filter by location (if in visibleFields)
  sortBy?: 'endorsements' | 'name';  // Default: endorsements
  limit?: number;             // Default 20
  offset?: number;
}): Promise<{
  members: PublicDirectoryMember[];
  total: number;
  communityName: string;
  communitySlug: string;
  searchEnabled: boolean;
  recentNotices: PublicNotice[];   // Up to 2 active notices
}>

interface PublicDirectoryMember {
  personaUri: string;
  displayName: string;
  headline: string;
  endorsementCount?: number;           // Only if showEndorsements
  visibleTraits: Record<string, unknown>;  // Only CO-approved fields
}

interface PublicNotice {
  type: 'looking_for' | 'offering' | 'heads_up' | 'general';
  body: string;
  authorName: string;
  authorRole: string;    // 'member' | 'admin' etc.
  createdAt: Date;
  expiresAt: Date;
}
```

**Authorization:** None required — this is a public endpoint. But it only returns data for communities with `publicPresence.level: 'full'` and `directory.access: 'public'` and members with `directoryOptIn = true`.

**Privacy enforcement:** The server action itself filters to `visibleFields` — the client never receives data the CO hasn't approved for public display.

### 12.9 SEO

The public directory is a high-value SEO surface — it's the page that answers "plumber in Nashville" or "trail runners Portland" searches.

**Page metadata (Guild example):**

```html
<title>Find a Professional — Tri-County Trades Guild | Personus</title>
<meta name="description" content="Browse 42 licensed tradespeople in Nashville, TN. Plumbing, electrical, solar, HVAC. Request introductions through the Tri-County Trades Guild." />
<meta property="og:title" content="Tri-County Trades Guild — Member Directory" />
<meta property="og:description" content="Find licensed tradespeople in Nashville." />
<meta property="og:image" content="/api/og/community/tri-county-trades/directory" />
```

**Page metadata (Club example):**

```html
<title>Meet Our Runners — Portland Trail Running | Personus</title>
<meta name="description" content="68 trail runners in Portland, OR. Ultra, 50K, trail navigation, pace coaching. Find a running partner or pacer." />
```

**Structured data:**

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Tri-County Trades Guild Member Directory",
  "description": "Licensed tradespeople in Nashville, TN",
  "numberOfItems": 42,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Person",
        "name": "Mike R.",
        "jobTitle": "Licensed master plumber",
        "memberOf": {
          "@type": "Organization",
          "name": "Tri-County Trades Guild"
        }
      }
    }
  ]
}
```

**OG image route:** `/api/og/community/[slug]/directory` — shows community name + directory label + member count + top skills.

**Individual member pages are NOT publicly indexed.** The directory is the entry point; individual profiles are behind the introduction request flow. This prevents member name + skill combinations from appearing in search results without the community context.

### 12.10 Test Criteria

- Public directory only available when `publicPresence.level: 'full'` and `directory.access: 'public'`
- Returns 404 when presence is `private` or `discoverable`
- Returns 404 when directory access is `members` (for non-members)
- Redirects members to internal directory when access is `members`
- Returns only `directoryOptIn = true` members
- Returns only CO-configured `visibleFields`
- Contact info is never included in responses
- Recent notices appear when active notices exist
- Recent notices hidden when no active notices
- Search works on name, headline, and visible trait fields only
- Disabled search shows browse-only (no search bar)
- Endorsement counts shown only when `showEndorsements` is true
- `listPublicDirectoryMembers` works without authentication
- Request Introduction routes to sign-up for unauthenticated visitors
- Member opts out → immediately removed from public directory results
- CO changes presence from `full` to `discoverable` → directory returns 404
- CO removes a field from `visibleFields` → field no longer returned
