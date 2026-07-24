---
type: foundation
title: Personus.ai — Guilds
description: "Version: 2.0 Date: 2026-02-11 Depends on: Doc 1 (Foundation & Principles), Doc 2 (Data Model & Entities), Doc 4 (Agent Architecture) Depended on by: Doc 3 (API Surface), Doc 6 (Visual UI), Doc 9…"
status: superseded
tags: [archived]
timestamp: 2026-02-11
---

# Personus.ai — Guilds

**Version:** 2.0
**Date:** 2026-02-11
**Depends on:** Doc 1 (Foundation & Principles), Doc 2 (Data Model & Entities), Doc 4 (Agent Architecture)
**Depended on by:** Doc 3 (API Surface), Doc 6 (Visual UI), Doc 9 (Authorization)
**Status:** Design phase

---

## Table of Contents

1. [What Is a Guild?](#what-is-a-guild)
2. [How Guilds Differ from Existing Concepts](#how-guilds-differ)
3. [Use Cases](#use-cases)
4. [Data Model](#data-model)
5. [Membership & Tiers](#membership-and-tiers)
6. [Guild Skill Taxonomy](#guild-skill-taxonomy)
7. [Request Routing](#request-routing)
8. [Community Offerings](#community-offerings)
9. [Guild Reputation](#guild-reputation)
10. [Guild Public Page](#guild-public-page)
11. [AI Agent Integration](#ai-agent-integration)
12. [AT Protocol Considerations](#at-protocol-considerations)
13. [Roadmap Placement](#roadmap-placement)

---

## What Is a Guild? {#what-is-a-guild}

A Guild is a **skill-centric community** — a self-governing group of practitioners organized around a shared craft, discipline, or capability domain. Guilds serve as trusted intermediaries between outsiders who need help and members who can provide it.

The core value proposition: _"I need someone who can do X well — who do you trust?"_ A guild answers this by curating membership around skill quality, not employment or geography.

**Historical analogy:** Medieval craft guilds vouched for member quality, set standards, and served as a trusted point of contact for anyone needing skilled labor. Personus Guilds bring this model into the AI-native era — discoverable by agents, queryable via MCP, with endorsement-backed trust signals replacing institutional gatekeeping.

**Modern examples:**

- A freelance design community (vetted designers, shared client pipeline)
- A certified Mastra developer network (skill-gated, endorsed by peers)
- A local handyman guild (trade-verified, insured, neighborhood-trusted)
- A tutoring guild (subject-area experts, parent-endorsed)
- An open-source maintainer guild (project-verified contributors)
- A music producer community (genre-focused, gear-sharing, collaboration-oriented)

### Core Properties

A Guild:

- **Is organized around capability**, not corporate structure or geography
- **Vets its members** via skill criteria, endorsements, or demonstrated work
- **Serves as a discovery surface** for outsiders seeking specific expertise
- **Can broker requests** — outsiders describe a need, the guild routes to the right member
- **Defines a skill taxonomy** — a curated lens over its domain of expertise
- **Supports membership tiers** — progression from apprentice to master (or guild-defined equivalents)
- **Aggregates trust** — the guild's reputation is computed from its members' endorsement density and quality

---

## How Guilds Differ from Existing Concepts {#how-guilds-differ}

Guilds build on top of the existing organization + community architecture but add capabilities that neither provides alone.

### Compared to Organization Personas

An organization persona (business, nonprofit, etc.) represents a legal or institutional entity. A guild is more fluid:

| Dimension       | Organization Persona    | Guild                                                      |
| --------------- | ----------------------- | ---------------------------------------------------------- |
| Identity        | Legal entity with staff | Community of peers                                         |
| Membership      | Employment/affiliation  | Skill-gated, peer-vetted                                   |
| Hierarchy       | Owner → employees       | Stewards + tiers (not employer/employee)                   |
| Primary purpose | Represent the org       | Discover and broker member capabilities                    |
| Offerings       | Org's services          | Aggregated member capabilities                             |
| Revenue model   | Org earns, pays staff   | Members earn directly (guild may take referral fee or not) |

### Compared to Standard Communities

A standard community provides a context layer for its members. A guild adds active brokering and quality curation:

| Dimension          | Standard Community             | Guild                                               |
| ------------------ | ------------------------------ | --------------------------------------------------- |
| Join policy        | Open / invite / admin-approved | Skill criteria + endorsement requirements           |
| Schema             | Custom context fields          | Skill taxonomy + tier progression                   |
| Discovery          | Search within community members| Structured directory + request routing              |
| External interface | Community landing page         | Guild public page with offerings + request form     |
| Curation           | Passive (members self-manage)  | Active (tiers, skill verification, quality signals) |

### How They Compose (Community Model)

A guild is a **community** (Doc 2 §Communities) with `communityType: "guild"`. It is implemented as:

1. An **organization persona** with `entityType: "organization"` and `organizationMetadata.type: "guild"`
2. That **backs a community** via `communities.backing_persona_uri` (providing the membership and context layer)
3. With **additional guild-specific tables** (skill taxonomy, tiers, offerings, request queue — defined below)

This composition means guilds inherit all existing community capabilities: memberships, context schema, endorsements, search, affiliations, AT Protocol integration, MCP discoverability, authorization (Doc 9). The guild-specific additions are layered on top. The `/explore` page (Doc 6) lists guilds alongside other community types.

---

## Use Cases {#use-cases}

### Use Case 8: Freelance Design Community

**"Cascade Design Guild"** (organization persona, type: guild)

**Guild Persona:**

- **Headline:** "Vetted product designers • UX, visual, motion • Available for contract work"
- **Organization metadata:**
  - Type: guild
  - Size: small (14 members)
  - Verification: basic (portfolio-reviewed)
- **Skill taxonomy:** UX Research, Visual Design, Motion Design, Design Systems, Prototyping
- **Community offerings:** Design sprints, UX audits, brand identity, ongoing design retainers
- **Service area:** Remote (global)

**Membership tiers:**

- **Associate:** Portfolio reviewed, 1 member endorsement → listed in directory
- **Full Member:** 3 member endorsements + completed guild project → eligible for request routing
- **Senior:** 6+ endorsements + 2 years active → can vet new applicants

**Discovery scenarios:**

- "UX designer for fintech app" → Cascade Design Guild shows up as community result, plus individual member matches
- Outsider submits request: "Need a 2-week design sprint for a mobile banking app" → Guild steward reviews, routes to 2 Full Members with fintech experience
- AI agent query via MCP: `personus_search({ query: "motion designer for product launch video", scope: "global" })` → Returns guild + specific member

**Key points:**

- Individual members also have their own person personas (discoverable independently)
- Guild membership is an additional trust signal ("Cascade-vetted designer")
- Members control whether their guild affiliation appears on their personal persona

---

### Use Case 9: Local Trades Guild

**"Mission District Trades Guild"** (organization persona, type: guild)

**Guild Persona:**

- **Headline:** "Licensed tradespeople serving SF's Mission District • Plumbing, electrical, carpentry, painting"
- **Organization metadata:**
  - Type: guild
  - Size: small (22 members)
  - Verification: verified (license + insurance verification)
- **Skill taxonomy:** Plumbing (residential, commercial, Victorian-era), Electrical (residential, commercial, solar), Carpentry (framing, finish, restoration), Painting (interior, exterior, mural)
- **Community offerings:** Home repairs, renovations, emergency calls, free estimates
- **Service area:** SF Mission District + adjacent neighborhoods (3-mile radius)

**Membership criteria:**

- Valid CA contractor license (verified)
- General liability insurance (verified)
- 1 endorsement from existing guild member OR 3 endorsements from Personus users in the service area
- Background check consent

**Membership tiers:**

- **Member:** Meets base criteria → listed in directory
- **Preferred:** 5+ external endorsements + 1 year active + zero complaints → priority routing for requests
- **Master Tradesperson:** 10+ endorsements + guild-nominated → featured on public page, can vet new applicants

**Request routing example:**

1. Homeowner: "My kitchen faucet is leaking and I think there's water damage under the sink"
2. Guild routing agent analyzes: plumbing (residential), urgency (water damage = high), scope (repair, not remodel)
3. Routes to 3 available plumbing members with residential experience, sorted by tier + proximity + availability
4. Homeowner selects one → mediated contact initiated

**Key points:**

- License and insurance verification are guild-level requirements (not just individual claims)
- Guild provides collective accountability — complaints affect guild reputation
- Service area is meaningful (unlike a remote design guild)
- Carlos from Use Case 3 could join this guild via his "Carlos M." persona while keeping "Silva Plumbing" as his separate business identity

---

### Use Case 10: Knowledge & Mentorship Guild

**"Bay Area AI/ML Mentors Guild"** (organization persona, type: guild)

**Guild Persona:**

- **Headline:** "Experienced AI/ML practitioners offering mentorship, office hours, and code reviews"
- **Organization metadata:**
  - Type: guild
  - Size: medium (35 members)
  - Verification: basic (LinkedIn/GitHub cross-reference)
- **Skill taxonomy:** Machine Learning (supervised, unsupervised, reinforcement), Deep Learning (NLP, computer vision, generative), MLOps (deployment, monitoring, infrastructure), AI Ethics & Safety
- **Community offerings:** 1-on-1 mentorship sessions (free), architecture reviews ($150/hr), study groups (free), career coaching

**Membership criteria:**

- 3+ years professional ML experience OR published research
- 2 endorsements from existing guild members
- Commitment to 2 hours/month of mentorship availability

**Tiers:**

- **Mentor:** Meets criteria → can accept mentorship requests
- **Senior Mentor:** 10+ mentees helped + 5 endorsements from mentees → featured, can define study group topics
- **Guild Fellow:** Recognized industry contribution → advisory role, shapes guild direction

**Request routing example:**

1. Junior developer: "I'm transitioning from web dev to ML. Looking for someone to help me build a study plan and review my first projects."
2. Guild agent matches: career transition context, beginner-friendly mentors, web dev background (helpful for overlap)
3. Presents 2 mentors who specialize in career transitions, both with strong mentee endorsements
4. Contact is free (mentorship offering) — no mediation fee

---

## Data Model {#data-model}

Guilds compose existing entities with new guild-specific data. The goal is to add the minimum new structure while leveraging what exists.

### Entity Relationships

```
Guild Org Persona (personas table, entityType: "organization")
 │
 ├── backs → Guild Community (communities table, communityType: "guild",
 │             backing_persona_uri = guild org persona)
 │             │
 │             └── has members → Memberships (community_members)
 │                                 │
 │                                 └── memberTraits includes tier, skills, availability
 │
 ├── has → Guild Skill Categories (guild-specific table)
 │           │
 │           └── maps to global trait skills
 │
 ├── has → Guild Membership Tiers (guild-specific table)
 │           │
 │           └── defines criteria per tier
 │
 ├── has → Guild Offerings (guild-specific table)
 │           │
 │           └── links to fulfilling members
 │
 ├── receives → Guild Requests (guild-specific table)
 │                │
 │                └── routed to member personas → spawns contact_requests
 │
 └── affiliated with ← Member Person Personas (existing affiliation system)
```

### New: Guild Skill Categories

Defines the skill taxonomy a guild organizes around. These are curated lenses over the global skill space — a guild picks which skills matter for its domain and how to categorize them.

```
guild_skill_categories
  id                  UUID, primary key
  guildPersonaId      UUID → personas.id (the guild's org persona)
  name                TEXT, required (e.g., "Frontend Development")
  description         TEXT, optional
  parentCategoryId    UUID → guild_skill_categories.id, nullable (for nesting)
  skillTags           TEXT[] (mapped global skill names, e.g., ["React", "Vue", "CSS"])
  displayOrder        INTEGER
  icon                TEXT, optional
  color               TEXT, optional (hex)
  createdAt           TIMESTAMPTZ
  updatedAt           TIMESTAMPTZ

  unique(guildPersonaId, name)
```

**Relationships:**

- Many-to-one with personas (guild org persona)
- Self-referential for nested categories (parentCategoryId)
- `skillTags` maps to skill names in the global trait system — not foreign keys, just string matching. This keeps it flexible (a guild can define categories for skills that don't exist in the taxonomy yet).

**Example data:**

```json
[
  {
    "name": "UX Research",
    "skillTags": ["user research", "usability testing", "interviews", "surveys", "analytics"],
    "parentCategoryId": null
  },
  {
    "name": "Visual Design",
    "skillTags": ["UI design", "typography", "color theory", "Figma", "illustration"],
    "parentCategoryId": null
  },
  {
    "name": "Motion Design",
    "skillTags": ["animation", "After Effects", "Lottie", "micro-interactions"],
    "parentCategoryId": null
  }
]
```

### New: Guild Membership Tiers

Defines the progression levels within a guild. Each tier has criteria that members must meet.

```
guild_membership_tiers
  id                  UUID, primary key
  guildPersonaId      UUID → personas.id
  name                TEXT, required (e.g., "Apprentice", "Full Member", "Master")
  description         TEXT, optional
  displayOrder        INTEGER (lower = entry-level)
  criteria            JSONB, required (see below)
  permissions         JSONB (what this tier can do)
  badgeConfig         JSONB (icon, color, label for UI)
  createdAt           TIMESTAMPTZ
  updatedAt           TIMESTAMPTZ

  unique(guildPersonaId, name)
```

**Criteria JSONB structure:**

```json
{
  "minEndorsementsFromMembers": 1,
  "minEndorsementsExternal": 0,
  "minTenureMonths": 0,
  "requiredSkillCategories": [],
  "requiredVerifications": ["portfolio_review"],
  "customRequirements": [
    { "key": "license", "label": "Valid contractor license", "verificationType": "document" }
  ]
}
```

**Permissions JSONB structure:**

```json
{
  "visibleInDirectory": true,
  "eligibleForRouting": true,
  "canVetApplicants": false,
  "canManageOfferings": false,
  "canModifyTaxonomy": false,
  "canSteward": false
}
```

**Relationships:**

- Many-to-one with personas (guild org persona)
- Referenced by memberships via `memberTraits.tierId`

### New: Guild Offerings

Community offerings that the guild provides, fulfilled by its members. Builds on the individual `offerings` trait field but at the guild level.

```
guild_offerings
  id                  UUID, primary key
  guildPersonaId      UUID → personas.id
  title               TEXT, required (e.g., "Design Sprint")
  description         TEXT, required
  category            TEXT (e.g., "consulting", "mentorship", "service", "training")
  skillCategoryIds    UUID[] (references guild_skill_categories — which skills are involved)
  priceModel          JSONB, nullable (see below)
  availability        TEXT (e.g., "ongoing", "limited", "seasonal")
  status              TEXT, default "active" ("active" | "paused" | "archived")
  displayOrder        INTEGER
  createdAt           TIMESTAMPTZ
  updatedAt           TIMESTAMPTZ
```

**Price model JSONB structure:**

```json
{
  "type": "range",
  "currency": "USD",
  "min": 200,
  "max": 500,
  "unit": "project"
}
```

or `{ "type": "free" }` or `{ "type": "hourly", "rate": 150 }` or `null` (contact for pricing).

**Offering fulfillment mapping:**

```
guild_offering_members
  id                  UUID, primary key
  offeringId          UUID → guild_offerings.id
  memberPersonaUri    TEXT → personas.uri
  status              TEXT, default "active" ("active" | "paused")
  notes               TEXT, optional (e.g., "Available Tues/Thurs only")
  createdAt           TIMESTAMPTZ

  unique(offeringId, memberPersonaUri)
```

**Relationships:**

- guild_offerings → many-to-one with personas (guild org persona)
- guild_offering_members → many-to-many between offerings and member personas

### New: Guild Requests

Requests from outsiders directed to the guild (not to a specific member). The guild's routing system matches and forwards.

```
guild_requests
  id                  UUID, primary key
  guildPersonaId      UUID → personas.id
  requesterId         UUID → users.id, nullable (anonymous requests allowed depending on guild config)
  requesterPersonaUri TEXT → personas.uri, nullable

  needDescription     TEXT, required
  matchedCategoryIds  UUID[] (guild_skill_categories matched by routing agent)
  matchedOfferingId   UUID → guild_offerings.id, nullable

  routedToPersonaUris TEXT[] (member personas the request was routed to)
  selectedPersonaUri  TEXT → personas.uri, nullable (member who accepted / was chosen)

  status              TEXT, default "pending"
                      ("pending" | "routed" | "accepted" | "completed" | "expired" | "cancelled")
  urgency             TEXT, default "normal" ("low" | "normal" | "high" | "emergency")
  responseDeadline    TIMESTAMPTZ, nullable

  createdAt           TIMESTAMPTZ
  expiresAt           TIMESTAMPTZ
```

**Relationships:**

- Many-to-one with personas (guild org persona)
- References guild_skill_categories via matchedCategoryIds
- References guild_offerings via matchedOfferingId
- Links to member personas via routedToPersonaUris and selectedPersonaUri
- Can spawn a `contact_requests` row once a member is selected (reusing existing mediated contact flow)

### Communities Table (Community Model)

Per the community model (Doc 2 §Communities), guilds use `communityType: "guild"` and `backing_persona_uri` pointing to the guild's org persona. Guild-specific configuration lives in the community's existing `context_schema` JSONB, extended with guild fields:

```json
{
  "fields": [
    {
      "key": "specialties",
      "label": "Your specialties in this guild",
      "type": "multi-select",
      "required": true
    },
    {
      "key": "availability",
      "label": "Current availability",
      "type": "select",
      "options": ["available", "busy", "on-break"],
      "required": true
    }
  ],
  "version": 1,
  "guildConfig": {
    "defaultTierId": "uuid-of-entry-tier",
    "requiresApplication": true,
    "allowAnonymousRequests": false,
    "routingMode": "steward-reviewed",
    "maxActiveRequests": 10
  }
}
```

Note: `guildPersonaId` is no longer needed in `guildConfig` — the guild's org persona is referenced via `communities.backing_persona_uri`. Guild-specific tables reference the guild org persona directly.

`routingMode` options:

- `"auto"` — AI agent routes directly to best-match members
- `"steward-reviewed"` — AI suggests matches, guild steward approves routing
- `"round-robin"` — Distribute evenly among eligible members in matched skill category
- `"broadcast"` — Notify all eligible members, first to accept gets it

### Modified: Community Members

When the community is guild-backed, `memberTraits` includes guild-specific fields:

```json
{
  "tierId": "uuid-of-current-tier",
  "specialties": ["React", "Design Systems"],
  "availability": "available",
  "joinedAsTier": "uuid-of-entry-tier",
  "tierPromotedAt": "2026-03-15T00:00:00Z",
  "activeRequestCount": 2
}
```

No schema changes needed — this is already flexible JSONB.

### Modified: Organization Metadata

The existing `organizationMetadata` JSONB on persona traits gains `"guild"` as a recognized type value:

```json
{
  "type": "guild",
  "founded": "2025",
  "size": "small",
  "verification": "basic",
  "guildMission": "Connecting clients with vetted product designers",
  "activeMemberCount": 14,
  "totalRequestsFulfilled": 87,
  "avgResponseTimeHours": 4.2
}
```

The `guildMission`, `activeMemberCount`, `totalRequestsFulfilled`, and `avgResponseTimeHours` fields are guild-specific extensions. `activeMemberCount` and stats fields are computed/cached values, updated periodically.

### Entity Relationship Summary

```
personas (guild org)
  ├─ 1:N → guild_skill_categories
  ├─ 1:N → guild_membership_tiers
  ├─ 1:N → guild_offerings
  │          └─ 1:N → guild_offering_members → personas (member)
  ├─ 1:N → guild_requests
  │          └─ spawns → contact_requests (existing)
  ├─ 1:1 → communities (backed community, communityType: "guild")
  │          └─ 1:N → community_members → personas (member)
  └─ N:1 ← personas (members, via affiliation system)
```

---

## Membership & Tiers {#membership-and-tiers}

### Joining a Guild

The join flow for a guild differs from a standard community:

1. **Applicant visits guild public page** (or is invited by a member)
2. **Applicant selects a persona** to join with (typically a person persona, but could be an org)
3. **Application is evaluated against entry-tier criteria:**
   - Does the persona's traits include required skills?
   - Does the persona have required endorsements?
   - Are custom requirements met (license, portfolio, etc.)?
4. **If `requiresApplication: true`:** Application enters steward review queue
5. **If criteria auto-verifiable:** Applicant joins at entry tier immediately
6. **Guild-specific context fields populated** (specialties, availability)

### Tier Progression

Tiers are **not applied for** — they're **earned**. The system evaluates tier criteria periodically or on endorsement events:

```
Event: new endorsement received by guild member
  → Check: does member now meet next tier criteria?
  → If yes: promote, update memberTraits.tierId, notify member
  → Activity event logged: "promoted to Full Member in Cascade Design Guild"
```

Tier criteria can reference:

- Endorsement count (from guild members, from external users, total)
- Tenure in guild (months since joining)
- Requests fulfilled (count of completed guild_requests)
- Skill categories covered (breadth across guild taxonomy)
- Custom verifications (license, certification, portfolio review)

### Stewards

Guilds have **stewards** rather than "admins" — the naming reflects the guild's peer-oriented culture. Stewards are members at a tier with `canSteward: true` permission. They:

- Review membership applications
- Approve or modify request routing
- Manage the skill taxonomy and offerings
- Represent the guild in disputes
- Are not employers or managers — they're elected/nominated peers

In the existing `community_members.role` field, stewards use the value `"admin"` (consistent with existing community roles). The "steward" label is a UI/UX convention, not a schema change.

---

## Guild Skill Taxonomy {#guild-skill-taxonomy}

### Purpose

A guild's skill taxonomy is its curated view of the skill space. It answers: _"What capabilities does this guild organize around, and how are they categorized?"_

This is distinct from the global `trait_taxonomies` table (which provides suggested values for any user). A guild taxonomy:

- **Scopes** the global skill space to what's relevant for this guild
- **Categorizes** skills in domain-specific ways (a "Frontend" category in a dev guild vs. a "Residential" category in a trades guild)
- **Maps** to the skill tags that members already have in their traits

### How It Works with Existing Traits

Guild skill categories contain `skillTags[]` — an array of skill name strings. When a member joins a guild, the system can:

1. Auto-suggest specialties by matching the member's `traits.skills[].name` against guild `skillTags`
2. Show gaps: "This guild covers Motion Design but you don't have animation skills listed — add them?"
3. Power the directory: clicking "UX Research" shows members whose skills overlap with that category's tags

No new trait types are created. The guild taxonomy is a **read-only lens** over existing skill data.

### Hierarchical Categories

Categories can nest one level deep via `parentCategoryId`:

```
Frontend Development (parent)
  ├── React & Next.js
  ├── Vue & Nuxt
  └── CSS & Animation

Backend Development (parent)
  ├── Node.js & Bun
  ├── Python & FastAPI
  └── Rust & Systems
```

Deeper nesting is not supported to keep the model simple. If a guild needs more granularity, they should use flatter categories with more descriptive names.

---

## Request Routing {#request-routing}

### The Flow

Request routing is the guild's killer feature — the ability to turn "I need help with X" into a qualified match without the requester needing to browse a directory.

```
1. Requester describes need (free text or structured form)
         │
2. Guild Routing Agent (Mastra) analyzes:
   ├── Extract required skills → match to guild_skill_categories
   ├── Match to guild_offerings (if applicable)
   ├── Assess urgency
   └── Identify constraints (budget, timeline, location)
         │
3. Agent queries eligible members:
   ├── Filter: tier permissions (eligibleForRouting: true)
   ├── Filter: availability (memberTraits.availability != "on-break")
   ├── Filter: skill overlap (member skills ∩ matched category skillTags)
   ├── Rank: tier (higher = better), endorsement count, response history
   └── Limit: top N candidates
         │
4. Based on routingMode:
   ├── auto → notify matched members directly
   ├── steward-reviewed → steward sees matches, approves/modifies
   ├── round-robin → assign to next eligible member in rotation
   └── broadcast → notify all eligible, first-accept wins
         │
5. Selected member accepts → contact_request created (existing flow)
         │
6. Fulfillment tracked → guild_request status updated
```

### Routing Agent

The Guild Routing Agent is a new Mastra agent (or an extension of the existing Discovery Agent). It has access to:

- Guild skill taxonomy
- Guild offerings catalog
- Member availability and tier data
- Member skill profiles (from persona traits)
- Historical routing data (which members responded quickly, fulfillment success rate)

**Tool definition (Mastra):**

```
guild_route_request
  description: "Analyze a help request and find the best matching guild members"
  input: guildPersonaId, needDescription, urgency, constraints
  output: matchedCategories[], matchedOffering?, candidateMembers[], routingRationale
```

### Integration with Existing Contact System

Once a guild request is routed and a member is selected, the flow joins the existing `contact_requests` pipeline:

- A `contact_request` is created with `toPersonaUri` = selected member, `toCommunityId` = guild's community
- The existing Contact Mediation Agent handles triage
- The guild request row (`guild_requests`) tracks the lifecycle separately (for guild analytics)

This means guild requests don't require a parallel contact system — they feed into the one that already exists.

---

## Community Offerings {#community-offerings}

### How They Differ from Individual Offerings

Individual offerings live in a persona's `traits.offerings` field (e.g., "I offer mentorship"). Guild offerings are aggregated capabilities that the guild provides as a community:

| Individual Offering            | Guild Offering                                |
| ------------------------------ | --------------------------------------------- |
| "I do UX audits"               | "The guild does UX audits"                    |
| Fulfilled by one person        | Fulfilled by any qualified member             |
| Priced by the individual       | Guild sets price range, members can customize |
| Discovered on person's persona | Discovered on guild's public page             |

### Offering ↔ Member Mapping

The `guild_offering_members` table tracks which members can fulfill each offering. A member's eligibility is typically based on their tier + skill overlap, but stewards can manually add/remove members from offerings.

When a request comes in that matches an offering, the routing agent draws from the offering's member pool rather than the entire guild membership.

### Offering Lifecycle

```
Steward creates offering → Members opt-in (or are auto-matched by skill) →
  Offering appears on guild page → Outsider requests it →
  Routed to eligible member → Fulfilled → Guild stats updated
```

Offerings can be paused (seasonal) or archived (no longer provided).

---

## Guild Reputation {#guild-reputation}

### Computed Metrics

A guild's reputation is an aggregate of its members' endorsement data. No new tables — this is a computed view.

**Inputs:**

- Total endorsements received by guild members (within guild context)
- Cross-endorsement density (how much members endorse each other)
- External endorsements (from non-guild-member Personus users)
- Request fulfillment rate (completed / total routed)
- Average response time
- Member tenure distribution (new guild vs. established one)

**Display:**

- "14 vetted members • 47 peer endorsements • 23 external endorsements"
- "87 requests fulfilled • avg 4-hour response"
- Individual tier distribution: "3 Senior, 8 Full, 3 Associate"

### Trust Signal in Search Results

When a guild member appears in search results (via their personal persona), their guild membership can optionally appear as a trust badge:

> **Maya Chen** — Staff Engineer • Distributed Systems
> Cascade Design Guild (Senior Member) ✦

The member controls whether guild affiliation shows on their persona (privacy principle: members control what's linked).

---

## Guild Public Page {#guild-public-page}

### Route: `/guild/[slug]`

The guild public page is the external-facing discovery surface, accessible from the `/explore` page (Doc 6 §Explore & Discovery) and via direct link. It's distinct from a standard community landing page because it's organized around skills and offerings, not just member listing. Full wireframes are in Doc 6 §Guild Surfaces.

### Page Sections

**Hero:**

- Guild name, headline, mission statement
- Aggregate stats (member count, endorsements, requests fulfilled)
- Verification badge (if applicable)
- "I need help" CTA button → opens request form

**Skill Directory:**

- Cards for each top-level skill category
- Each card shows: category name, member count, sample member avatars
- Click to expand: subcategories, full member list filtered to that skill
- Search within guild skills

**Offerings Catalog:**

- Card grid of active guild offerings
- Each card: title, description, price range, availability
- "Request this" button → pre-fills guild request with offering context

**Featured Members:**

- Carousel or grid of highest-tier members
- Shows: name, headline, tier badge, top skills, endorsement highlights
- Click through to individual persona page

**Recent Activity:**

- Recent endorsements within the guild
- New members who joined
- Offerings added or updated

**Request Form:**

- Free-text need description
- Optional: urgency, budget range, timeline
- Optional: select from offerings
- Submit → creates guild_request → routing begins

### Member-Facing Views

**Guild Dashboard (for members):**

- Your tier + progress toward next tier
- Requests routed to you (pending, active, completed)
- Your offerings within the guild
- Guild-wide activity feed

**Guild Admin/Steward Dashboard:**

- Application review queue
- Request routing queue (if steward-reviewed mode)
- Skill taxonomy editor
- Offerings manager
- Analytics: requests by category, fulfillment rate, skill gaps, response times

---

## AI Agent Integration {#ai-agent-integration}

### MCP Tools

Guilds extend the existing MCP tool surface with guild-aware queries:

**Enhanced `personus_search`:**

- New filter: `guildId` or `guildSlug` — search within a specific guild
- New result type: guild results alongside person/org results
- When a query matches a guild's domain better than any individual, return the guild as a top result

**New `personus_list_guilds`:**

```
description: "List guilds matching a domain or skill area"
input: query (string), location (optional), skillTags (optional)
output: guild summaries with member count, offerings, reputation stats
```

**New `personus_submit_guild_request`:**

```
description: "Submit a help request to a guild for routing to the right member"
input: guildId, needDescription, urgency, constraints
output: requestId, estimatedResponseTime, matchedCategories
```

### Ambient Discovery

In the ambient discovery pattern (Use Case 6 from Doc 1), guilds add a new capability:

**Before guilds:** AI finds individual personas matching a need.
**With guilds:** AI can also recommend submitting a request to a relevant guild, especially when:

- The need is broad (multiple skills might be needed)
- The user doesn't know exactly what kind of expert they need
- The guild has a strong track record for this type of request

Example:

> **User:** "My startup needs to overhaul our entire frontend — design, implementation, the works."
>
> **Claude:** "I found the Cascade Design Guild — they specialize in product design with 14 vetted members covering UX, visual, and motion design. They offer design sprints and ongoing retainers. I also found 3 individual designers in your network. Would you like me to submit a request to the guild, or connect you with one of the individuals?"

---

## AT Protocol Considerations {#at-protocol-considerations}

Building on Doc 7 (AT Protocol Design), guilds map naturally to the decentralized social web:

**Guild as AT Protocol collection:** A guild's skill taxonomy, offerings, and member roster could be published as Lexicon-defined records, making guilds discoverable and queryable across the ATmosphere.

**Guild membership as verifiable credential:** "Member of Cascade Design Guild (Senior tier)" could be a portable credential that members carry to other platforms.

**Federated guild directories:** Multiple Personus instances could list each other's guilds, enabling cross-instance discovery: "Find a trades guild near me" could query guilds hosted on different PDS instances.

**BlueSky list mapping:** A guild's member roster could sync bidirectionally with a BlueSky list, with guild membership serving as the authoritative source.

These are Phase 3+ considerations. The data model designed here is compatible with future AT Protocol publication — no redesign needed.

---

## Roadmap Placement {#roadmap-placement}

### Dependencies

Guilds build on three features not yet implemented:

1. **Endorsements** (Phase 1, Weeks 5-6) — needed for trust signals, membership gates, and reputation
2. **Search & Discovery** (Phase 1, Weeks 7-8) — needed for guild directory pages and MCP integration
3. **Communities & Context Layer** (Phase 1, Weeks 9-10) — guilds extend the community concept

### Suggested Timeline

**Phase 1.5 or early Phase 2 (Weeks 13-18)** — after core communities + endorsements + search are solid.

**Week 13-14: Guild Foundation**

- Add `"guild"` to organization metadata types
- Create guild_skill_categories, guild_membership_tiers tables
- Guild creation flow (create org persona + backing community + initial taxonomy + tiers)
- Guild public page (static: hero, skill directory, member list)

**Week 15-16: Guild Membership**

- Application flow with criteria evaluation
- Tier assignment and progression logic
- Member dashboard within guild
- Steward tools (application review, taxonomy editor)

**Week 17-18: Request Routing & Offerings**

- guild_offerings and guild_offering_members tables
- guild_requests table
- Guild Routing Agent (Mastra)
- Request form on public page
- Integration with existing contact_request flow
- Guild analytics dashboard

**Phase 2 (Weeks 19+): Distribution**

- MCP tools for guild search and request submission
- Slack/Discord bot integration ("ask the guild")
- Guild reputation in search result ranking

**Phase 3 (Weeks 29+): Federation**

- AT Protocol publication of guild data
- Cross-instance guild discovery
- Verifiable guild membership credentials

### Implementation Approach

Guilds should be built incrementally, each stage providing standalone value:

1. **Guild as directory** (valuable without routing) — "Here are our members, organized by skill"
2. **Guild with tiers** (valuable without routing) — "These members are vetted at this level"
3. **Guild with routing** (full value) — "Tell us what you need, we'll find the right person"
4. **Guild with offerings** (commerce value) — "Here's what we offer, with pricing"

Each stage can ship independently. A guild with just a directory and tiers is already more useful than a standard community for skill-based discovery.

---

**End of Guilds Document**

**Cross-references:**

- Doc 1 §Foundational Principles — Principle 9 (Communities are optional), Principle 11 (unified model)
- Doc 1 §Progressive Onboarding — Phase 4 (Create & Lead) covers guild creation
- Doc 2 §Communities — guilds use the community data model with `communityType: "guild"` and `backing_persona_uri`
- Doc 2 §Personas — guild org persona uses existing persona table with `organizationMetadata.type: "guild"`
- Doc 4 §Community Coach — AI-guided guild creation and configuration
- Doc 4 §Cross-Agent Patterns — coach handoffs and community-aware suggestions
- Doc 6 §Explore & Discovery — guild cards on explore page
- Doc 6 §Guild Surfaces — full wireframes for guild public page, member dashboard, steward dashboard
- Doc 7 §AT Protocol — guild membership as verifiable credential, federated guild directories
- Doc 9 §Guild Authorization — tier-based permissions, steward role, request routing authorization
