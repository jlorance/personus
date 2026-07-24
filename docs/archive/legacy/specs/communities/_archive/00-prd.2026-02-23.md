---
type: spec
title: Communities — Product Requirements Document
description: "Communities are the multiplier in Personus. A persona alone is a structured identity. A persona inside a community becomes a discoverable, endorsable, routable capability node in a trust network."
status: superseded
tags: [archived]
timestamp: 2026-02-23
---

# Communities — Product Requirements Document

> Date: 2026-02-23
> Status: Draft
> Scope: All community-related functionality for Community Organizers (CO) and Community Members (CM)
> Related: `docs/foundation/02-data-model.md`, `docs/foundation/06-visual-interfaces.md`, `docs/foundation/08-guilds.md`, `docs/foundation/09-authorization.md`, `docs/business-model/02_packaging_and_pricing.md`, `docs/specs/integrations/`

---

## 1. Product Vision

Communities are the **multiplier** in Personus. A persona alone is a structured identity. A persona inside a community becomes a discoverable, endorsable, routable capability node in a trust network.

Personus communities are not chat rooms, forums, or social groups. They are **intelligence layers** — structured overlays that make existing groups self-aware. A community on Personus knows what its members can do, who trusts whom, and how to connect the right people. The community lives on Discord, Slack, Telegram, WhatsApp, or a dozen other platforms. Personus is where the capability graph lives.

### 1.1 Core Thesis

**Every group of people has hidden capabilities. Personus makes them visible.**

- The neighborhood has a retired electrician, a patent lawyer, and a beekeeper. No one knows.
- The Discord server has 200 members. The admin can't answer "who here knows grant writing?"
- The photography club has 85 members. Twelve of them own lighting gear they'd happily lend. Nobody's asked.
- The trades guild has 95 electricians. A general contractor needs three for next week. It takes 20 phone calls.

Personus makes the answer to "who can help?" instant, trustworthy, and privacy-preserving.

### 1.2 Two Roles, One Product

**Community Organizer (CO)** — The person who creates and stewards the community. They define what members share, configure how the community is discovered, connect platforms, approve membership, and monitor community health. COs are the growth engine of Personus — every community they create brings members into the network.

**Community Member (CM)** — The person who joins a community with a persona, shares context-specific traits, gets discovered by capability, earns endorsements, and receives introductions. CMs get value from being findable by the right people for the right reasons.

### 1.3 Nine Community Types

Communities are differentiated by **type**, each with its own trait schemas, feature flags, and defaults. Types are data-driven (seed table, not hardcoded):

| Type | What It Is | Example |
|------|-----------|---------|
| **Club** | Shared interest or activity group | Mill Valley Mountain Bikers |
| **Organization** | Formal membership org | Portland Tech Association |
| **Friends** | Informal group | The Dinner Crew |
| **Guild** | Skill-centric, with tiers, routing, and offerings | Pacific NW Plumbers Guild |
| **Workplace** | Company or org staff | Acme Corp |
| **Customer** | Customer/patron community | Rivian Owners Club |
| **Neighborhood** | Geographic/local community | Elm Street Neighbors |
| **Event** | Time-bounded gathering | React Summit 2026 |
| **Educational** | Alumni, cohorts, study groups | CS50 Alumni Network |

Each type defines:
- `communityTraitSchema` — what the community itself shares (skills, location, mission, etc.)
- `memberTraitSchema` — what members share within this community (role, availability, certifications, etc.)
- `featureFlags` — which capabilities are enabled (events, chapters, skill_taxonomy, request_routing, offerings, membership_tiers, etc.)
- Defaults for join policy, visibility, max members

---

## 2. What Already Exists

### 2.1 Fully Built

| Component | Status | Location |
|-----------|--------|----------|
| Database schema | Complete | `lib/db/schema/communities.ts`, `community-types.ts` |
| 9 community types (seed data) | Complete | `lib/db/seed/community-types.ts` (795 lines) |
| Guild tables (5) | Complete | `lib/db/schema/guilds.ts` |
| `createCommunity` server action | Complete | `app/actions/communities.ts` |
| `listCommunityTypes` server action | Complete | `app/actions/communities.ts` |
| Community creation wizard (3-step) | Complete | `app/(dashboard)/communities/new/wizard-client.tsx` |
| Zod validation schemas | Complete | `lib/validations/communities.ts` |
| Authorization model (CASL) | Complete | `lib/auth/abilities.ts`, `lib/auth/permissions.ts` |
| Guild spec (full) | Complete | `docs/foundation/08-guilds.md` (960 lines) |
| Business model / pricing | Complete | `docs/business-model/02_packaging_and_pricing.md` |
| Integration platform specs | Complete | `docs/specs/integrations/` (11 files) |
| UI wireframes (high-level) | Partial | `docs/foundation/06-visual-interfaces.md` §7-8 |

### 2.2 Partially Built

| Component | What Exists | What's Missing |
|-----------|------------|----------------|
| Explore page | Wireframe in Doc 6 | No implementation, no server actions |
| Community admin dashboard | Wireframe in Doc 6 | No implementation |
| Community public page | Route placeholder | No implementation |
| Member management | Schema supports it | No server actions, no UI |
| Analytics | Wireframe in Doc 6 | No schema, no tracking, no UI |

### 2.3 Not Built (Gaps This PRD Addresses)

| Gap | Why It Matters |
|-----|---------------|
| Community listing / "My Communities" | COs and CMs can't see their communities |
| Community detail / public page | Communities have no visible presence |
| Community settings / configuration | COs can't edit anything after creation |
| Member lifecycle (join, approve, leave, remove) | Members can't join communities |
| Member directory with search | The core value prop has no UI |
| Invitations | COs can't grow their community |
| Community traits editor | COs can't fill in community-level traits |
| Member traits editor | CMs can't fill in context-specific traits |
| Context schema builder | COs can't customize what members share |
| Role management | COs can't promote/demote members |
| Community discovery / Explore page | People can't find communities |
| Activity feed / recent activity | No one knows what's happening |
| Community-scoped search | The core "who knows X?" capability has no UI |
| Moderation (member removal, content policy) | COs can't manage bad actors |
| Notifications | No one gets told about anything |
| Integration connections UI | COs can't connect platforms from the UI |
| Community profile (aggregate "who's here") | No way to see what the community collectively offers without searching |
| Notices (community bulletin board) | Members can't broadcast time-bound asks/offers to the community |
| Similar communities (community-to-community discovery) | Members can't discover related communities from one they're in |
| Public community directory | No way for non-members to browse/search opted-in members (the "Find a Plumber" page) |

---

## 3. Spec Breakdown

This PRD is the umbrella. Each major functional area gets its own spec document with detailed workflows, server actions, components, and test criteria.

| Spec | Contents | Primary Actor |
|------|----------|---------------|
| **`00-prd.md`** (this file) | Vision, inventory, spec index, decisions | — |
| **`01-community-lifecycle.md`** | Create, edit, configure, archive, delete. Community profile (traits editor), schema builder, visibility/join policy changes. | CO |
| **`02-membership.md`** | Join flows (open, approval, invite), leave, removal, role changes (member → steward → admin). Persona selection ("which persona do I join with?"). Member traits editor. | CO + CM |
| **`03-member-directory.md`** | Member listing, community-scoped search ("who knows X in this community?"), filtering, profile cards within community context. Community capability profile ("who's here"). Public community directory (opt-in, searchable by visitors). | CO + CM + Public |
| **`04-discovery.md`** | Explore page, community cards, search/filter, recommendations, SEO (metadata, structured data, sitemaps), AIO (MCP tool enhancements, community feed endpoint, `llms.txt`). How humans and AI agents find communities. | Public + CM + AI |
| **`05-invitations.md`** | Invite links, invite codes, direct invitations, invite tracking, onboarding flow for new members arriving via invite. | CO |
| **`06-activity-and-analytics.md`** | Community activity feed, CO analytics dashboard, member activation metrics, unmet needs analysis, community health signals. | CO |
| **`07-moderation.md`** | Member removal, suspension, content/behavior policy, appeals, reporting, trust enforcement. | CO |
| **`08-notifications.md`** | What events trigger notifications, delivery channels (in-app, email, push), notification preferences, digest frequency. | CO + CM |
| **`09-integrations-ui.md`** | Reference doc for platform integration UI. Points to `docs/specs/integrations/` for all details. | CO |
| **`10-notices.md`** | Community bulletin board. Members post short, time-bound asks/offers. No replies, no ratings. Auto-expires. | CM |
| **`11-community-closure.md`** | Archive (reversible, dormant) and close (30-day grace, permanent). Data export, member notifications, billing/integration cleanup. | CO |
| **`12-community-relationships.md`** | Explicit community-to-community relationships: chapters, affiliations, referral partnerships, cohorts. Proposal/acceptance workflow, referral routing (CO Pro), trait schema inheritance (CO Base+). | CO |

**Guild-specific specs** remain in `docs/foundation/08-guilds.md` — the existing 960-line guild spec already covers tiers, taxonomy, routing, offerings, and the guild-specific dashboard. The community specs define the base layer that guilds build on.

---

## 4. User Journeys

These are the primary journeys that the specs must enable end-to-end.

### 4.1 CO: Create and Launch a Community

```
CO has a Discord server and a WhatsApp group for their photography club.
They want to make their 85 members' skills discoverable.

  1. CO signs up for Personus (or is already a user)             → Solo tier
  2. CO creates a community (type: Club)                          → 01-community-lifecycle
  3. CO fills in the community profile — activities, location,    → 01-community-lifecycle
     mission, tags, etc. (community traits = community profile,
     just like user traits = user profile)
  4. CO customizes what members share (gear, style, availability) → 01-community-lifecycle
  5. CO connects Discord and Instagram                            → 09-integrations-ui
  6. CO generates an invite link and shares it in Discord          → 05-invitations
  7. Members arrive, choose a persona, fill in their member traits → 02-membership
  8. CO sees members arriving, reviews activity                    → 06-activity-and-analytics
  9. CO promotes 2 trusted members to steward                      → 02-membership
  10. Members ask the CX chat "who shoots medium format?" → results   → 03-member-directory
```

### 4.2 CM: Join a Community and Get Discovered

```
CM receives an invite link from their photography club's Discord.

  1. CM clicks invite link → lands on community join page         → 02-membership
  2. CM signs up for Personus (or logs in)                        → Auth
  3. CM sees community info, selects a persona to join with       → 02-membership
  4. If approval-required: CM submits join request, waits         → 02-membership
  5. CM fills in member traits (gear, style, experience)          → 02-membership
  6. CM is now in the community's member directory                → 03-member-directory
  7. Someone asks CX chat "who knows Capture One?" → CM appears    → 03-member-directory
  8. CM receives an introduction request                          → Inbox (existing)
  9. CM endorses another member's darkroom skills                 → Endorsements (existing)
  10. CM's completeness score improves → more discoverable         → Coach (existing)
```

### 4.3 CO: Manage a Growing Community

```
Community has been running for 3 months. 45 members, 120 endorsements.

  1. CO checks analytics → 47 searches this week, 3 intros       → 06-activity-and-analytics
  2. CO sees unmet needs: "locksmith searched 5 times, not found" → 06-activity-and-analytics
  3. CO invites a known locksmith via direct invite               → 05-invitations
  4. CO notices a member posting spam → removes them              → 07-moderation
  5. CO gets a notification: "3 new members joined this week"     → 08-notifications
  6. CO edits community description for better discoverability    → 01-community-lifecycle
  7. CO adds a new member trait field: "Languages spoken"         → 01-community-lifecycle
  8. CO connects Telegram group (new platform)                    → 09-integrations-ui
  9. External AI agent queries: "photography clubs in Bay Area"   → 04-discovery
  10. CO shares community public page link on Instagram bio        → 04-discovery
```

### 4.4 Visitor: Find a Community

```
Person hears about "finding people who can help" and visits personus.ai.

  1. Visitor browses Explore page → sees community cards          → 04-discovery
  2. Visitor filters by type (Guild) and tag (photography)        → 04-discovery
  3. Visitor sees Bay Area Photography Collective (85 members)    → 04-discovery
  4. Visitor clicks → community public page with skills summary   → 04-discovery
  5. Visitor decides to join → sign-up + join flow                → 02-membership
```

### 4.6 CM/CO: Browse the Community Profile ("Who's Here")

```
CM has been in the photography club for a week. Wants to understand
what the community has to offer before searching for anyone specific.

  1. CM opens community → sees the Community Profile tab           → 03-member-directory
     (aggregate view — "what does this community know?")
  2. CM sees the overall capability snapshot:                       → 03-member-directory
     - 85 members across 4 experience levels
     - Top skills: landscape (15), wildlife (12), portrait (10)
     - Gear available: 18 members have lighting, 6 have drones
     - Languages spoken: English (82), Spanish (14), Mandarin (3)
     - Member trait breakdown by the community's schema fields
  3. CM sees unmet needs: "underwater photography searched 3 times, → 03-member-directory
     no matches" — realizes the community could use that capability
  4. CM clicks a skill tag → filtered member directory               → 03-member-directory
  5. CO sees the same view + the public-facing Community Profile:   → 01-community-lifecycle
     community traits (mission, location, focus areas, tags) that
     make this community discoverable — like a user's profile but
     for the group itself
```

### 4.7 CM: Post a Notice

```
CM is building a burning man art car and needs collaborators. Rather than
messaging people individually, they post a Notice to the community.

  1. CM opens community → Notices tab (or section on Overview)      → 10-notices
  2. CM sees existing notices from other members:
     - "ISO someone who knows welding for a weekend project" (3d left)
     - "Offering free headshots this Saturday at Golden Gate Park" (1d left)
  3. CM clicks [Post a Notice]                                      → 10-notices
  4. CM writes: "Looking for 2-3 collaborators to build a
     mutant vehicle for Burning Man. Need welding, LED wiring,
     and someone with a trailer. 6-month project starting March."
  5. CM sets duration: 2 weeks                                      → 10-notices
  6. Notice appears in the community — visible to all members       → 10-notices
  7. Interested members see the notice → contact the poster         → Inbox (existing)
     via standard introduction request (mediated, not public reply)
  8. Notice expires after 2 weeks → auto-archived, no longer shown  → 10-notices
```

### 4.8 CM: Discover Similar Communities

```
CM is in the Portland Photography Collective and loves it. Wonders
if there are similar communities elsewhere or with different focus.

  1. CM opens their community → sees "Similar Communities" section   → 04-discovery
     on the community page (sidebar or bottom)
  2. Personus shows communities with similar profiles:              → 04-discovery
     - Bay Area Photography Collective (78% trait overlap)
     - Pacific NW Street Photographers (65% trait overlap)
     - Seattle Nature Photography Guild (60% trait overlap)
  3. CM clicks "Bay Area Photography Collective" → public page      → 04-discovery
  4. CM sees it's active (120 members, 89 endorsements) → joins     → 02-membership
  5. CM is now in two photography communities, each seeing a
     different persona — professional in one, hobbyist in the other → 02-membership

How it works:
  - Communities have embeddings (vector(1536)) just like personas
  - Community profile traits → embedding → cosine similarity
  - "Similar communities" = nearest neighbors in embedding space
  - Filtered by visibility (only public/authenticated communities shown)
  - Excludes communities the user is already in
```

### 4.9 Visitor: Browse a Community Directory

```
A homeowner's kitchen faucet is leaking. They Google "plumber Nashville"
and land on the Tri-County Trades Guild's public directory page.

  1. Visitor arrives at /g/tri-county-trades/directory              → 03-member-directory
     (linked from the guild's website, Google, or community page)
  2. Visitor sees a searchable directory of opted-in members:       → 03-member-directory
     - 47 of 95 members have opted into the public directory
     - Search bar: "What do you need help with?"
     - Filters: specialty, location, availability
  3. Visitor searches "kitchen plumbing" → sees 8 results           → 03-member-directory
     - Each card shows: name, headline, skills, endorsement count
     - Trust signal: "Endorsed by 4 guild members for residential plumbing"
     - NO contact info shown (privacy preserved)
  4. Visitor clicks [Request Introduction] on a member              → Inbox (existing)
     - Visitor must sign up / log in to send the request
     - The request goes through Personus's mediated contact flow
     - The plumber decides whether to share contact info
  5. If visitor doesn't want to sign up → they see the              → 01-community-lifecycle
     community's external links (website, phone) as an alternative

How it works (CO setup):
  a. CO enables "Public Directory" in community settings             → 01-community-lifecycle
  b. Members opt in individually — a toggle in their member settings → 02-membership
  c. What's shown publicly is controlled by the community's
     "public directory fields" setting (CO chooses which member
     traits appear in the directory — e.g., skills and location
     but not rate range)
  d. Personus never exposes contact info — always mediated
```

### 4.5 CO: Day-to-Day Operations

```
Weekly rhythm for an active CO with 200+ members.

  Monday:
    - Open favorited community from the Favorites bar              → 01-community-lifecycle §2.6
    - Check analytics dashboard (searches, intros, new members)   → 06-activity-and-analytics
    - Review pending join requests (if approval-required)          → 02-membership
    - Glance at integration health (Discord bot working? Slack?)  → 09-integrations-ui
    - Scan recent notices from members                            → 10-notices

  As needed:
    - Post a notice ("New licensing requirements — heads up!")     → 10-notices (from action bar)
    - Share community link on social media                        → 01-community-lifecycle §2.5
    - Promote a trusted member to steward                         → 02-membership
    - Handle a moderation issue (spam, bad behavior)              → 07-moderation
    - Ask the Community Coach: "What skills are we missing?"      → 01-community-lifecycle §2.7
    - Share invite link in a new platform group                   → 05-invitations
    - Edit community traits or schema as the community evolves    → 01-community-lifecycle

  Regular member daily rhythm:
    - Open favorited community                                    → 01-community-lifecycle §2.6
    - Check notices tab for asks/offers                           → 10-notices
    - Post a notice: "Offering free headshots Saturday"           → 10-notices (from action bar)
    - Ask the Community Coach: "Who knows X?"                     → 01-community-lifecycle §2.7
    - Share community link with a friend                          → 01-community-lifecycle §2.5
```

---

## 5. Cross-Cutting Concerns

These apply to all community specs:

### 5.1 Authorization

Every action checks:
1. **Authentication** — Is the user logged in? (Clerk)
2. **Community role** — What role does the user have in this community? (member/steward/admin)
3. **Action permission** — Can this role perform this action? (CASL)

Role hierarchy: `member` < `steward` < `admin`. The `foundingUserId` is always an admin and cannot be removed.

See `docs/foundation/09-authorization.md` for the full model.

### 5.2 Persona Context

When a user interacts with a community, they do so **through a persona**. The `community_members` table stores both `userId` (the human) and `personaId` (what they share with this community). This means:

- A user's "professional persona" might be in 3 work-related communities
- Their "hobby persona" might be in 2 interest-based communities
- Each community sees only the traits from the persona they chose to share
- Users can switch which persona they present to a community (with some restrictions)

### 5.3 Privacy

- Member traits are **community-scoped** — what you share with one community is not automatically visible in another
- Community-scoped search respects persona visibility settings
- Contact requests are always mediated — no one's contact info is ever exposed
- COs can see aggregate analytics but never individual member activity logs
- External AI agents see only what privacy settings allow

### 5.4 Community Types as Configuration

Community types drive behavior:
- `communityTraitSchema` → what fields appear in the community traits editor
- `memberTraitSchema` → what fields appear when a member joins
- `featureFlags` → which features are available (e.g., `events`, `chapters`, `skill_taxonomy`, `request_routing`, `offerings`, `membership_tiers`)
- Defaults → join policy, visibility, max members

Specs should describe behavior generically and note where type-specific behavior diverges (e.g., guilds with tiers, events with dates, neighborhoods with geography).

### 5.5 Mobile-First

All community UI must work on mobile. The primary use case — someone in a Discord/Telegram chat taps a link to Personus — happens on a phone. Design for touch targets, minimal horizontal scrolling, and fast load times.

### 5.6 Pricing Boundaries

| Capability | Solo Free | Solo Pro | CO Base ($99/yr) | CO Pro ($199/mo) |
|-----------|-----------|---------|-----------------|-----------------|
| Communities created | Unlimited | Unlimited | Unlimited | Unlimited |
| Members per community | 200 | 200 | 1,000 | 10,000 |
| Context schema fields | 5 | 5 | 10 | Unlimited |
| Steward seats | 2 | 2 | 5 | 20 |
| Community types | All | All | All | All + network |
| Guild features | — | — | Yes | Yes |
| **Appearance: basics** (profile image, banner, tagline, accent color) | Yes | Yes | Yes | Yes |
| **Appearance: theme** (primary + secondary colors, light/dark) | — | — | Yes | Yes |
| **Appearance: gallery** (featured media on public page) | — | — | Up to 6 images | Up to 12 images |
| **Appearance: custom sections** (CO-authored markdown blocks) | — | — | — | Up to 5 |
| **Appearance: member badges** (visual flair on member cards) | — | — | — | Up to 10 |
| **Relationships** (active community-to-community connections) | 1 (accept only) | 1 (accept only) | Up to 5 | Unlimited |
| **Referral routing** (cross-community request routing) | — | — | — | Yes |
| **Schema inheritance** (parent → chapter trait schema sharing) | — | — | Yes | Yes |
| Analytics | Basic | Basic | Standard | Advanced |
| Integration APIs | — | — | — | Yes |

Discovery is never gated. Community creation is never throttled. Limits exist for infrastructure (member count, schema fields) and advanced features (analytics, branding), not for core value.

---

## 6. Spec Index

| # | Spec | Status | Primary Focus |
|---|------|--------|---------------|
| 00 | **`00-prd.md`** (this file) | Draft | Vision, inventory, journeys, cross-cutting concerns |
| 01 | **`01-community-lifecycle.md`** | Draft | Create → configure → edit → archive/delete, community profile, appearance (visual identity), action bar, favorites, share link, CX chat, relationships (concept) |
| 02 | **`02-membership.md`** | Draft | Join → approve → onboard → engage → leave/remove |
| 03 | **`03-member-directory.md`** | Draft | List, search, filter, profile cards, "who's here" view, public directory |
| 04 | **`04-discovery.md`** | Draft | Explore page, recommendations, SEO, AIO (AI-optimized discovery), similar communities |
| 05 | **`05-invitations.md`** | Draft | Invite links, codes, direct invites, onboarding |
| 06 | **`06-activity-and-analytics.md`** | Draft | Activity feed, CO dashboard, health signals |
| 07 | **`07-moderation.md`** | Draft | Removal, suspension, reporting, appeals |
| 08 | **`08-notifications.md`** | Draft | Events, channels, preferences, digests |
| 09 | **`09-integrations-ui.md`** | Draft | Integration UI reference (points to `docs/specs/integrations/`) |
| 10 | **`10-notices.md`** | Draft | Community bulletin board — time-bound asks/offers, no replies |
| 11 | **`11-community-closure.md`** | Draft | Archive, close (30-day grace), data export, notifications |
| 12 | **`12-community-relationships.md`** | Draft | Chapter/affiliate/referral/cohort relationships, routing, schema inheritance |

**Dependency order:** 01 → 02 → 03. These three form the core loop. 04 and 05 extend reach. 06-09 are operational concerns that can be built in parallel after the core. 10 is independent and can be built anytime after 02. 11 depends on 01 and 08 (notifications). 12 depends on 01 and optionally 03 (for referral routing).

---

## 7. Implementation Priority

### Wave 1: Core Loop (Must Have)

Build these first — they enable the fundamental CO and CM experience.

1. **`01-community-lifecycle.md`** — Can't do anything without a configurable community with a profile
2. **`02-membership.md`** — Can't do anything without members
3. **`03-member-directory.md`** — The core value prop: "who knows X?" + aggregate "who's here" view

### Wave 2: Growth + Engagement (Should Have)

These bring people to communities, help them find related ones, and give members a voice.

4. **`04-discovery.md`** — How humans and AI agents find communities (Explore, SEO, AIO, recommendations)
5. **`05-invitations.md`** — How COs grow their communities
6. **`10-notices.md`** — Members post time-bound asks/offers to the community

### Wave 3: Operations (Nice to Have for Launch)

These make running a community sustainable.

7. **`06-activity-and-analytics.md`** — COs need feedback on whether it's working
8. **`07-moderation.md`** — COs need tools to handle problems
9. **`08-notifications.md`** — People need to know things happened
10. **`09-integrations-ui.md`** — COs need to connect platforms from the UI
11. **`11-community-closure.md`** — COs need a safe, multi-step way to sunset a community
12. **`12-community-relationships.md`** — Communities need explicit connections (chapters, affiliations, referrals)

### What's NOT in Scope

- **Guild-specific features** (tiers, taxonomy, routing, offerings) — covered in `docs/foundation/08-guilds.md`
- **Endorsements** — existing system, community-scoped endorsements already designed
- **Shadow personas** — existing system
- **Coach chat (persona-level)** — existing system. The community-scoped CX chat (§2.7 in `01-community-lifecycle.md`) reuses the Community Coach agent from Doc 4 but is scoped to community context
- **MCP / API** — existing system, community tools already designed in Doc 3
- **Platform bots** — covered in `docs/specs/integrations/`
- **Payments / commerce** — future, after Sparks system is designed

---

## 8. Success Metrics

How we know Communities is working:

| Metric | Signal |
|--------|--------|
| **Communities created per week** | COs find value in creating communities |
| **Members per community (median)** | Communities aren't empty |
| **Searches per community per week** | Members are using "who knows X?" |
| **Introductions facilitated per community** | Discovery leads to connection |
| **Endorsements per community** | Trust network is growing |
| **Member retention (30-day)** | Members stick around after joining |
| **CO retention (30-day)** | COs keep coming back to manage |
| **Communities with 2+ platforms connected** | COs see Personus as cross-platform layer |
| **Time from invite click to first search** | Onboarding funnel is smooth |

---

## 9. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Communities PRD as a separate spec suite (not inline in existing docs) | Existing docs define the data model and vision. The PRD defines user-facing workflows, server actions, components, and test criteria — the implementation blueprint. |
| 2 | 9 spec documents + 1 PRD | Each functional area is complex enough to warrant its own spec. Keeps each document focused and reviewable. |
| 3 | Wave-based priority (core loop → growth → operations) | Can't build analytics before there's anything to analyze. Can't build invitations before there's a join flow. |
| 4 | Guild features stay in Doc 8 | The existing 960-line guild spec is comprehensive. Community specs define the base layer; guild specs define the guild-specific extension. |
| 5 | Specs describe generic behavior, note type-specific divergence | Avoids 9 copies of every workflow. Most behavior is shared; type-specific behavior (guild tiers, event dates) is called out where relevant. |
| 6 | Persona context is fundamental | Every membership is user + persona + community. This three-way relationship drives privacy, display, and scoped search. Specs must never treat membership as just "user in community." |
| 7 | Community profile parallels user profile | Communities have traits (JSONB + embedding) just like users. A community's profile is its public identity — mission, location, focus areas, tags. This enables community-to-community discovery via embedding similarity, and gives COs the same "fill in your profile" experience that users get. |
| 8 | Notices are not a message board | Notices are short, time-bound, one-way posts (asks/offers). No replies, no ratings, no threading. Members who want to respond use the standard introduction request flow. This prevents Personus from becoming a forum — the conversation happens on Discord/Slack/Telegram. |
| 9 | Community-to-community discovery uses embeddings | Communities already have `embedding` vector(1536). "Similar communities" is a nearest-neighbor query in embedding space — the same mechanism as persona-to-persona similarity. This makes cross-community discovery automatic as community profiles improve. |
| 10 | Public presence is a 3-tier model, not separate toggles | Private (invisible), Discoverable (business card page), Full Profile (rich page + optional public directory). Replaces the old `visibility` + `publicDirectory.enabled` two-toggle approach. Simpler mental model for COs. Full Profile with public directory still has double opt-in: CO enables public access, each member individually opts in. See `01-community-lifecycle.md` §3.2.3. |
| 11 | Action bar encourages interaction, not administration | The persistent action bar shows Post Notice, Invite, and Share Link — actions that build community. Management actions (Edit Settings, Manage Members) go in overflow. The bar is role-aware: members see what they can act on, COs see more. |
| 12 | Community CX Chat is always present | A collapsed chat bar docked to the bottom of every community dashboard. It's the primary nudge for "what are you looking for?" and "what can you offer?" interactions. Powered by the Community Coach agent scoped to the current community. This makes discovery and offering conversational rather than click-through. |
| 13 | Favorites are a user-level quick-access feature | Max 10 favorites. Appears as a chip bar on My Communities and as icon shortcuts in navigation. Simple toggle — no categories, no reordering. Reduces friction for returning to frequently-visited communities. |
| 14 | Public pages prioritize dynamic content over static | The Full Profile public page and public directory lead with "What's Happening" (notices), then "Community Pulse" (aggregate recent stats), then static content (capabilities, about, traits). This makes the page feel alive and encourages members to post notices, which in turn improves the public-facing experience. |
| 15 | Community closure is its own spec | Archive (reversible) and close (30-day grace period, then permanent) are multi-step processes affecting every other spec — memberships, endorsements, notices, integrations, billing. Deserves dedicated spec (`11-community-closure.md`) rather than a paragraph in the Danger Zone. |
| 16 | Member search is CX-first, not a search box | "Who knows X?" is conversational — typed or spoken in the CX chat, a platform bot command, or via an AI agent. The Members tab is for structured browsing (filters, sort) not semantic search. This keeps the UI minimal, mobile-friendly, and consistent across surfaces. No dedicated search page to build. See `03-member-directory.md` §3. |
| 17 | Community visual identity is tiered | Free tier gets the essentials (profile image, banner, tagline, accent color) — enough to make any community feel real. Paid tiers unlock theme customization, featured media galleries, custom sections, and member badges. Decoration drives emotional attachment. See `01-community-lifecycle.md` §3.2.6. |
| 18 | Community relationships replace parentCommunityId | The old `parentCommunityId` self-referencing FK is replaced by a `community_relationships` table supporting four relationship types (chapter_of, affiliated_with, referral_partner, cohort_of). All relationships are opt-in (proposal + acceptance). Referral routing requires CO Pro on both sides. Schema inheritance requires CO Base+. See `01-community-lifecycle.md` §7 and `12-community-relationships.md`. |
