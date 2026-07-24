---
type: foundation
title: "Personus.ai — Data Model & Entities"
description: "Version: 6.0 Date: 2026-02-11 Depends on: Doc 1 (Foundation & Principles) Depended on by: Doc 3 (API Surface), Doc 4 (Agent Architecture), Doc 5 (Implementation), Doc 8 (Guilds), Doc 9…"
status: superseded
tags: [archived]
timestamp: 2026-02-11
---

# Personus.ai — Data Model & Entities

**Version:** 6.0
**Date:** 2026-02-11
**Depends on:** Doc 1 (Foundation & Principles)
**Depended on by:** Doc 3 (API Surface), Doc 4 (Agent Architecture), Doc 5 (Implementation), Doc 8 (Guilds), Doc 9 (Authorization)
**Status:** Design phase - Hybrid JSONB Model

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decision: Hybrid JSONB](#architecture-decision)
3. [Terminology: Traits vs User-Facing Language](#terminology)
4. [Core Database Schema](#core-database-schema)
5. [User & Traits](#user-traits)
6. [Trait Metadata System](#trait-metadata)
7. [Personas](#personas)
8. [Groups & Memberships](#groups-memberships)
9. [Endorsements & Shadow Personas](#endorsements-shadow)
10. [Contact Requests](#contact-requests)
11. [Activity & Sessions](#activity-sessions)
12. [TypeScript Interfaces](#typescript-interfaces)
13. [Commerce Traits](#commerce-traits)

---

## Overview {#overview}

This document defines the complete data model for Personus.ai using a **hybrid approach**: Postgres with JSONB for flexible trait storage + relational tables for trust graph and memberships.

**Key architectural decision:** User traits (skills, employment, hobbies, etc.) are stored as flexible JSONB documents. Personas select and copy traits from the user's pool. Relationships (endorsements, memberships) remain relational for efficient graph traversal.

**Core entities:** Users, User Traits, Personas, Communities, Community Members, Endorsements, Shadow Personas, Contact Requests

---

## Architecture Decision: Hybrid JSONB {#architecture-decision}

### Why Not Pure 3NF?

Our initial design had highly normalized tables:

- `attributes` table with 40+ rows for each attribute type
- `user_attributes` junction table
- `persona_attributes` junction table

**Problems:**

1. Adding new attribute types requires migrations
2. AI extracts freeform data from voice/text - forcing into rigid schema is fighting the model
3. Privacy via unlinkability requires denormalization anyway
4. Over-engineering for flexibility we get naturally with JSONB

### Why Not Pure Document Store (MongoDB)?

**We have genuinely relational data:**

- Endorsement graph (A endorses B endorses C)
- Community memberships (persona ↔ community)
- Trust path traversal (find path from X to Y via endorsements)

MongoDB makes graph traversal harder, and we'd need to add vector search separately.

### The Hybrid Solution

**Store as documents:**

- User traits (`user_traits.traits` = JSONB)
- Personas (`personas.traits` = JSONB)
- Shadow personas (`shadow_personas.traits` = JSONB)

**Store as relations:**

- Endorsements (graph edges)
- Community members (persona-community joins)
- Communities, Users (clear entities)

**Benefits:**

- ✅ Flexible schema - add "favorite_synthesizer" without migration
- ✅ Fast reads - one row fetch gets entire persona
- ✅ Privacy via denormalization - traits copied to personas, not referenced
- ✅ Graph traversal - proper foreign keys for endorsements
- ✅ Vector search - pgvector in same database
- ✅ Single database - no sync issues, ACID transactions

---

## Terminology: Traits vs User-Facing Language {#terminology}

**Internal (code/database):** We use "traits" as the technical term

- `user_traits`
- `trait_metadata`
- `personas.traits`

**User-facing (UI/Coach):** Natural language specific to what we're asking

- "What skills do you have?"
- "Tell me about your work experience"
- "What are your hobbies?"
- "What languages do you speak?"

Users NEVER see "Add your traits" - they experience natural conversation that extracts structured data into the trait system.

---

## Core Database Schema {#core-database-schema}

### Key Tables

```
users                    - Authenticated accounts
user_traits              - JSONB document per user (all traits)
trait_metadata           - Describes how to render/edit each trait type
trait_taxonomies         - Suggested values (e.g., tech skills list)

personas                 - JSONB traits + identity (DENORMALIZED from pool)
communities              - Communities (communities, teams, guilds, chapters, networks)
community_members        - persona ↔ community relationships
community_types          - Seed data for community types (data-driven)
endorsements             - Trust graph edges
shadow_personas          - Non-users who've been endorsed

contact_requests         - Introduction workflow
activity_events          - Cross-persona activity log
integrations             - Slack/Discord connections
query_logs               - Search analytics

-- Guild-specific tables (see Doc 8):
guild_skill_categories   - Skill taxonomy per guild
guild_membership_tiers   - Tier definitions + criteria
guild_offerings          - Collective offerings catalog
guild_offering_members   - Offering ↔ member mapping
guild_requests           - Incoming help requests to guilds
```

---

## User & Traits {#user-traits}

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,                   -- Auth only, never exposed

  preferred_languages TEXT[],            -- ["en", "es"] ISO codes
  default_location JSONB,                -- {city, state, country, lat, lng}

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### User Traits Table

```sql
CREATE TABLE user_traits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- All traits as flexible JSONB
  traits JSONB NOT NULL DEFAULT '{}',

  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_traits_traits ON user_traits USING gin (traits jsonb_path_ops);
```

### Example Traits Document

```json
{
  "skills": [
    { "name": "Rust", "proficiency": "expert", "yearsExperience": 5 },
    { "name": "Plumbing", "proficiency": "advanced", "yearsExperience": 15 },
    { "name": "Vegan cooking", "proficiency": "intermediate" }
  ],
  "employment": [
    {
      "company": "Google",
      "title": "Staff Engineer",
      "startDate": "2020-01",
      "endDate": null,
      "current": true,
      "description": "Leading distributed systems team"
    }
  ],
  "education": [
    {
      "institution": "Stanford",
      "degree": "MS",
      "field": "Computer Science",
      "year": 2017
    }
  ],
  "certifications": [
    {
      "name": "CPA",
      "issuer": "State Board of Accountancy",
      "credentialId": "12345",
      "year": 2018
    }
  ],
  "hobbies": [
    {
      "name": "DJing",
      "skillLevel": "advanced",
      "yearsActive": 8,
      "genres": ["Techno", "House"]
    }
  ],
  "languages": [
    { "name": "English", "proficiency": "native" },
    { "name": "Spanish", "proficiency": "fluent" }
  ],
  "openTo": ["Consulting", "Technical mentoring", "New tax clients"],
  "values": ["Open source", "Sustainability"],
  "interests": [{ "category": "music", "specific": ["Modular synthesis", "Vinyl collecting"] }],
  "businessInfo": {
    "yearsInBusiness": 5,
    "teamSize": "Solo",
    "insurance": [{ "type": "General Liability", "verified": true }]
  }
}
```

---

## Trait Metadata System {#trait-metadata}

Describes how to capture, display, and edit each trait type.

### Trait Metadata Table

```sql
CREATE TABLE trait_metadata (
  id UUID PRIMARY KEY,

  -- Identity
  key TEXT UNIQUE NOT NULL,              -- "skills", "employment", "hobbies"
  display_name TEXT NOT NULL,            -- "Skills", "Work Experience", "Hobbies"
  description TEXT,

  -- Organization
  category TEXT NOT NULL,                -- "professional", "personal", "business"
  group_key TEXT NOT NULL,               -- "capabilities", "experience", "interests"

  -- Data structure
  data_type TEXT NOT NULL,               -- "array_of_objects", "string_array", "object"
  item_schema JSONB,                     -- JSON Schema for validation

  -- UI rendering
  display_config JSONB NOT NULL,         -- How to show on persona card
  edit_config JSONB NOT NULL,            -- How to capture/edit

  -- Behavior
  is_searchable BOOLEAN DEFAULT true,
  is_endorsable BOOLEAN DEFAULT false,

  -- Display
  icon TEXT,
  display_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Trait Taxonomies Table

Suggested values for specific trait types (e.g., common tech skills).

```sql
CREATE TABLE trait_taxonomies (
  id UUID PRIMARY KEY,

  trait_key TEXT NOT NULL,               -- "skills", "hobbies", "interests"
  taxonomy_slug TEXT NOT NULL,           -- "tech", "construction", "outdoor"
  display_name TEXT NOT NULL,            -- "Technology", "Construction & Trades"
  description TEXT,
  icon TEXT,

  suggested_values TEXT[] NOT NULL,      -- ["Rust", "Python", "JavaScript", ...]

  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(trait_key, taxonomy_slug)
);
```

### Example Metadata: Skills

```json
{
  "key": "skills",
  "displayName": "Skills",
  "category": "professional",
  "groupKey": "capabilities",
  "dataType": "array_of_objects",
  "itemSchema": {
    "properties": {
      "name": { "type": "string", "required": true },
      "proficiency": {
        "type": "string",
        "enum": ["beginner", "intermediate", "advanced", "expert"]
      },
      "yearsExperience": { "type": "number" }
    }
  },
  "displayConfig": {
    "type": "tag_list",
    "showField": "name",
    "badgeColor": "proficiency",
    "colorMap": {
      "beginner": "gray",
      "intermediate": "blue",
      "advanced": "green",
      "expert": "purple"
    }
  },
  "editConfig": {
    "type": "multi_item_form",
    "addButtonText": "Add Skill",
    "fields": [
      { "key": "name", "label": "Skill", "type": "text_with_suggestions" },
      { "key": "proficiency", "label": "Proficiency", "type": "select" }
    ]
  }
}
```

---

## Personas {#personas}

### Personas Table

```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY,
  uri TEXT UNIQUE NOT NULL,              -- "personus:persona:<nanoid>"
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Core identity
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  entity_type TEXT NOT NULL,             -- "person" | "organization"

  -- Location (inherits from user.default_location, can override)
  location JSONB,

  -- Traits (COPIED from user_traits, not referenced)
  -- This denormalization enforces privacy/unlinkability
  traits JSONB NOT NULL DEFAULT '{}',

  -- Semantic search
  embedding vector(1536),

  -- Access control
  visibility TEXT NOT NULL DEFAULT 'community',
  contact_policy TEXT NOT NULL DEFAULT 'mediated',
  contact_channels JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personas_user ON personas(user_id);
CREATE INDEX idx_personas_uri ON personas(uri);
CREATE INDEX idx_personas_embedding ON personas USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_personas_traits ON personas USING gin (traits jsonb_path_ops);
CREATE INDEX idx_personas_entity_type ON personas(entity_type);
```

### How Personas Are Created

```typescript
// 1. User has traits
const pool = await db.userTraits.findOne({ userId: 'user_123' });

// 2. User creates professional persona - selects traits
const professionalTraits = {
  skills: pool.traits.skills.filter((s) =>
    ['Rust', 'Python', 'Distributed Systems'].includes(s.name),
  ),
  employment: pool.traits.employment,
  education: pool.traits.education,
  openTo: ['Consulting', 'Technical mentoring'],
};

// 3. Create persona (traits are COPIED)
const persona = await db.personas.create({
  userId: 'user_123',
  uri: 'personus:persona:maya-pro',
  displayName: 'Maya Chen',
  headline: 'Staff Engineer • Distributed Systems',
  entityType: 'person',
  traits: professionalTraits, // Denormalized copy
  visibility: 'public',
});

// 4. Later: User creates personal persona with DIFFERENT traits
const personalTraits = {
  hobbies: pool.traits.hobbies,
  interests: pool.traits.interests,
  openTo: ['Hiking buddies', 'Recipe swaps'],
};

const personalPersona = await db.personas.create({
  userId: 'user_123',
  uri: 'personus:persona:maya-personal',
  displayName: 'Maya',
  headline: 'Techno DJ • Vegan cook',
  entityType: 'person',
  traits: personalTraits, // Different subset
  visibility: 'authenticated',
});

// Result: Same user, two completely unlinkable personas
```

### Searching Personas

```sql
-- Semantic search with filters
SELECT p.*,
       1 - (p.embedding <=> $queryEmbedding) AS similarity
FROM personas p
WHERE p.visibility = 'public'
  AND p.entity_type = 'person'
  AND p.traits @> '{"skills": [{"name": "Rust"}]}'
ORDER BY p.embedding <=> $queryEmbedding
LIMIT 10;

-- Search for Spanish speakers
SELECT * FROM personas
WHERE traits @> '{"languages": [{"name": "Spanish"}]}';

-- Search skills with JSONB path query
SELECT * FROM personas
WHERE traits @? '$.skills[*] ? (@.name == "Plumbing")';
```

---

## Communities & Members {#groups-memberships}

### The Community Model

"Community" is the umbrella term for all organizational entities in Personus: communities, teams, guilds, chapters, networks. Every community is stored in the `communities` table, differentiated by `community_type`. This unifies the data model, authorization system, UI components, and API surface under one concept.

| Community Type | Example                | Key Differentiator                                                      |
| -------------- | ---------------------- | ----------------------------------------------------------------------- |
| `community`    | Sunnyside Neighbors    | Open/invite-based, context layer, community discovery                   |
| `team`         | BAPH Team              | Org-backed employee/staff community, internal directory                 |
| `guild`        | Cascade Design Guild   | Skill-gated, tiered, request routing, community offerings (see Doc 8)   |
| `chapter`      | Rotary Club of Oakland | Parent org relationship, delegated verification                         |
| `network`      | AAPI Tech Workers      | Affinity-based, cross-org, often authenticated-visibility               |

All community types share: memberships, context schema, endorsement scoping, search, analytics, and the same authorization model (Doc 9). Guild-specific features (tiers, taxonomy, offerings, routing) are layered on top via additional tables defined in Doc 8.

### Community Types Table

Community types are data-driven via a seed table, not a hardcoded enum. Each type defines its own trait schemas, feature flags, and defaults. Adding a new type requires a seed data change — no code change.

```sql
CREATE TABLE community_types (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER,
  community_trait_schema JSONB,        -- what the community itself shares
  member_trait_schema JSONB,           -- what members share within this community
  feature_flags JSONB,                 -- which capabilities are enabled
  default_join_policy TEXT,
  default_visibility TEXT,
  default_max_members INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### The 9 community types

Seed data in `packages/db/src/schema/community-types.ts`. These are the canonical types; the Communities PRD ([`../specs/communities/00-prd.md`](../specs/communities/00-prd.md)) operates on them generically and notes type-specific divergence where relevant.

| Type | What it is | Example |
|------|-----------|---------|
| **Club** | Shared interest or activity group | Mill Valley Mountain Bikers |
| **Organization** | Formal membership org | Portland Tech Association |
| **Friends** | Informal group | The Dinner Crew |
| **Guild** | Skill-centric, with tiers, routing, and offerings (see [`../specs/communities/guilds-prd.md`](../specs/communities/guilds-prd.md)) | Pacific NW Plumbers Guild |
| **Workplace** | Company or org staff | Acme Corp |
| **Customer** | Customer/patron community | Rivian Owners Club |
| **Neighborhood** | Geographic/local community | Elm Street Neighbors |
| **Event** | Time-bounded gathering | React Summit 2026 |
| **Educational** | Alumni, cohorts, study groups | CS50 Alumni Network |

Each type defines:
- **`communityTraitSchema`** — the fields the community itself publishes (mission, location, focus areas, tags, skills, etc.). A community's traits are its public identity, parallel to a user's traits.
- **`memberTraitSchema`** — the fields members fill in when they join (role, availability, certifications, gear, etc.). Member traits are **community-scoped** — what you share here is not automatically visible elsewhere.
- **`featureFlags`** — which capabilities are enabled: `events`, `chapters`, `skill_taxonomy`, `request_routing`, `offerings`, `membership_tiers`, etc. Most flags map to specific feature specs in the Communities suite; guild-specific flags (skill_taxonomy, request_routing, offerings, membership_tiers) are covered in the Guilds sub-PRD.
- **Defaults** — initial join policy (open, invite, approval), default visibility (public, authenticated, community, private), default max members.

Feature specs in `docs/specs/communities/` describe behavior generically and note type-specific divergence (e.g., guilds with tiers, events with dates, neighborhoods with geography). The feature-flag system is the mechanism by which one codebase handles nine types without per-type branching.

### Communities Table

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,

  -- Community type (data-driven via community_types table)
  community_type TEXT NOT NULL DEFAULT 'community',
  -- One of: 'community' | 'team' | 'guild' | 'chapter' | 'network'

  -- Optional backing persona (org persona that "owns" this community)
  backing_persona_uri TEXT REFERENCES personas(uri),

  -- Discovery tags (for explore page and search)
  tags TEXT[] DEFAULT '{}',

  -- Flexible traits (community-level attributes, searchable)
  traits JSONB NOT NULL DEFAULT '{}',

  -- Semantic search
  embedding vector(1536),

  -- Context schema (community-specific fields members fill out)
  context_schema JSONB DEFAULT '[]',

  -- External platform links (Slack, Discord, etc.)
  external_platforms JSONB DEFAULT '[]',

  -- Ownership and billing
  founding_user_id UUID REFERENCES users(id),
  billing_user_id UUID REFERENCES users(id),

  -- Temporal bounds
  start_date DATE,
  end_date DATE,

  -- Geographic bounds (for location-based communities)
  geographic_bounds JSONB,

  -- Hierarchy
  parent_community_id UUID REFERENCES communities(id),

  -- Configuration
  auto_archive BOOLEAN DEFAULT false,
  max_members INTEGER,

  visibility TEXT NOT NULL DEFAULT 'public',
  join_policy TEXT NOT NULL DEFAULT 'open',
  member_count INTEGER DEFAULT 0,

  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_communities_type ON communities(community_type);
CREATE INDEX idx_communities_backing ON communities(backing_persona_uri);
CREATE INDEX idx_communities_tags ON communities USING gin (tags);
CREATE INDEX idx_communities_traits ON communities USING gin (traits jsonb_path_ops);
CREATE INDEX idx_communities_embedding ON communities USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_communities_parent ON communities(parent_community_id);
```

**`backing_persona_uri`:** When set, this community is officially backed by an organization persona. The backing persona's verification status, endorsements, and trust signals extend to the community. Used by teams (company communities), guilds (community org persona), and chapters (chapter org persona). A community without a backing persona is a peer community -- no org "owns" it.

**`tags`:** Freeform tags for discoverability on the explore page and in search. Examples: `["plumbing", "SF", "trades"]`, `["design", "freelance", "remote"]`. Tags power the `/explore` community browse page and MCP tool `personus_list_communities`.

**`traits`:** JSONB document for flexible community-level attributes (similar to persona traits). Enables community-level search and discovery.

**`external_platforms`:** JSONB array of linked platforms (e.g., `[{"platform": "slack", "workspaceId": "T123"}]`).

**`parent_community_id`:** Self-referential FK for hierarchical communities (e.g., Rotary District -> Rotary Club).

### Community Members Table

```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- Role within the community
  role TEXT NOT NULL DEFAULT 'member',

  -- Member-specific traits (community-specific context data)
  member_traits JSONB DEFAULT '{}',    -- {block: "Monterey Blvd", specialties: ["React"]}

  visible BOOLEAN DEFAULT true,

  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(persona_id, community_id)
);

CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_persona ON community_members(persona_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_traits ON community_members USING gin (member_traits jsonb_path_ops);
```

### How Communities Compose with Personas

```
User Account
  └── owns Personas
        ├── Person Persona ("Maya Chen, Engineer")
        │     └── member of → Community ("Sunnyside Neighbors")
        │     └── member of → Guild ("Cascade Design Guild")
        │
        ├── Person Persona ("Maya C.", neighborhood)
        │     └── member of → Community ("Sunnyside Neighbors")
        │
        └── Org Persona ("Cascade Design Guild")
              └── backs → Guild Community (communityType: "guild")
                    └── has members → personas via community_members
```

**Key relationships:**

- A community may be backed by an org persona (`backing_persona_uri`), or be a peer community (no backing persona)
- A persona joins a community via a `community_members` row (with community-specific `member_traits`)
- The same user can join the same community with different personas (e.g., personal + professional)
- Cross-persona links within a community are opt-in (see Doc 9 §Cross-Persona Linking)

### Community Creation Flows

| Flow                | Who Creates                                                   | Result                                                                                        |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Community**       | Any authenticated user                                        | Community with `community_type: "community"`, no backing persona                              |
| **Org-backed team** | Org persona owner                                             | Creates community with `community_type: "team"`, `backing_persona_uri` = org persona          |
| **Guild**           | Org persona owner (with `organizationMetadata.type: "guild"`) | Creates community with `community_type: "guild"`, plus guild tables (Doc 8)                   |
| **Chapter**         | Parent org admin or chapter org owner                         | Community with `community_type: "chapter"`, backing persona has parent org affiliation         |
| **Network**         | Any authenticated user                                        | Community with `community_type: "network"`, typically authenticated visibility                 |

---

## Endorsements & Shadow Personas {#endorsements-shadow}

### Endorsements Table

```sql
CREATE TABLE endorsements (
  id UUID PRIMARY KEY,
  from_persona_uri TEXT NOT NULL REFERENCES personas(uri),
  to_persona_uri TEXT REFERENCES personas(uri),
  to_shadow_persona_id UUID REFERENCES shadow_personas(id),
  community_id UUID NOT NULL REFERENCES communities(id),

  relationship_type TEXT NOT NULL,       -- "vendor", "colleague", "mentor", "friend"
  endorsement_context TEXT[] DEFAULT '{}',
  strength TEXT NOT NULL DEFAULT 'standard',
  testimonial TEXT,

  visibility TEXT NOT NULL DEFAULT 'community',
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CHECK (to_persona_uri IS NOT NULL OR to_shadow_persona_id IS NOT NULL)
);

CREATE INDEX idx_endorsements_to ON endorsements(to_persona_uri);
CREATE INDEX idx_endorsements_from ON endorsements(from_persona_uri);
CREATE INDEX idx_endorsements_community ON endorsements(community_id);
CREATE INDEX idx_endorsements_shadow ON endorsements(to_shadow_persona_id);
```

### Shadow Personas Table

```sql
CREATE TABLE shadow_personas (
  id UUID PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  created_by_persona_uri TEXT NOT NULL REFERENCES personas(uri),

  display_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'person',

  -- Traits (extracted by AI from endorsement conversation)
  traits JSONB NOT NULL DEFAULT '{}',

  -- Semantic search
  embedding vector(1536),

  -- Claiming
  claim_status TEXT DEFAULT 'unclaimed',
  claim_token TEXT UNIQUE,
  claimed_by_persona_uri TEXT REFERENCES personas(uri),
  invite_sent_via TEXT,
  invite_sent_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ,                -- Auto-expire unclaimed after 90 days

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shadow_community ON shadow_personas(community_id);
CREATE INDEX idx_shadow_claim ON shadow_personas(claim_status);
CREATE INDEX idx_shadow_embedding ON shadow_personas USING ivfflat (embedding vector_cosine_ops);
```

---

## Contact Requests {#contact-requests}

```sql
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY,

  -- Who is requesting
  from_persona_uri TEXT REFERENCES personas(uri),
  from_agent_id UUID,
  from_anonymous JSONB,

  -- Who is being contacted
  to_persona_uri TEXT NOT NULL REFERENCES personas(uri),
  to_community_id UUID REFERENCES communities(id),

  -- Request content
  reason TEXT NOT NULL,
  message TEXT,

  -- AI triage
  triage_note TEXT,
  triage_score INTEGER,
  matched_open_to TEXT[],
  trust_chain TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  response_note TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_contact_requests_to ON contact_requests(to_persona_uri);
CREATE INDEX idx_contact_requests_status ON contact_requests(status);
```

---

## Activity & Sessions {#activity-sessions}

### Activity Events

```sql
CREATE TABLE activity_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  persona_uri TEXT NOT NULL,
  community_id UUID,

  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  summary TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_events_user ON activity_events(user_id, created_at DESC);
```

### Coach Sessions

```sql
CREATE TABLE coach_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  persona_uri TEXT REFERENCES personas(uri),
  community_id UUID REFERENCES communities(id),

  status TEXT NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL DEFAULT 'creation',

  transcript JSONB DEFAULT '[]',
  traits_updated JSONB DEFAULT '[]',       -- Which traits were added/modified

  completeness_at_start INTEGER,
  completeness_at_end INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### Supporting Tables

```sql
-- Platform integrations (Slack/Discord)
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  slack_workspace_id TEXT,
  discord_guild_id TEXT,
  access_token TEXT,                     -- Encrypted
  refresh_token TEXT,                    -- Encrypted
  installed_at TIMESTAMPTZ DEFAULT now(),
  installed_by TEXT NOT NULL
);

-- Query analytics
CREATE TABLE query_logs (
  id UUID PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  query_text TEXT NOT NULL,
  query_source TEXT NOT NULL,
  agent_id UUID,
  match_count INTEGER DEFAULT 0,
  matched_skills TEXT[],
  resulted_in_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## TypeScript Interfaces {#typescript-interfaces}

```typescript
// ============================================
// USER & TRAITS
// ============================================

interface User {
  id: string;
  clerkUserId: string;
  email: string;
  preferredLanguages: string[];
  defaultLocation?: Location;
  createdAt: string;
  updatedAt: string;
}

interface UserTraits {
  userId: string;
  traits: TraitsDocument;
  updatedAt: string;
}

interface TraitsDocument {
  skills?: Skill[];
  employment?: Employment[];
  education?: Education[];
  certifications?: Certification[];
  licenses?: License[];
  hobbies?: Hobby[];
  languages?: Language[];
  openTo?: string[];
  values?: string[];
  interests?: Interest[];
  businessInfo?: BusinessInfo;
  pricing?: PricingModel[];
  [key: string]: any; // Extensible
}

interface Skill {
  name: string;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience?: number;
}

interface Employment {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

// ... other trait interfaces

// ============================================
// TRAIT METADATA
// ============================================

interface TraitMetadata {
  id: string;
  key: string;
  displayName: string;
  description?: string;
  category: string;
  groupKey: string;
  dataType: string;
  itemSchema?: Record<string, any>;
  displayConfig: DisplayConfig;
  editConfig: EditConfig;
  isSearchable: boolean;
  isEndorsable: boolean;
  icon?: string;
  displayOrder: number;
}

interface DisplayConfig {
  type: 'tag_list' | 'timeline' | 'card_list' | 'pill_list' | 'table' | 'prose';
  [key: string]: any; // Type-specific config
}

interface EditConfig {
  type: 'multi_item_form' | 'tag_input' | 'text_with_suggestions' | 'structured_form';
  [key: string]: any; // Type-specific config
}

// ============================================
// PERSONAS
// ============================================

interface Persona {
  id: string;
  uri: string;
  userId: string;
  displayName: string;
  headline: string;
  entityType: 'person' | 'organization';
  location?: Location;
  traits: TraitsDocument; // Copied from user pool
  embedding: number[];
  visibility: 'public' | 'authenticated' | 'community' | 'private';
  contactPolicy: 'open' | 'mediated' | 'closed';
  contactChannels: ContactChannel[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMMUNITIES & MEMBERS
// ============================================

type CommunityType = 'community' | 'team' | 'guild' | 'chapter' | 'network';

interface Community {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  communityType: CommunityType;
  backingPersonaUri?: string; // Org persona that backs this community
  tags: string[]; // Discovery tags for explore/search
  traits: Record<string, any>; // Community-level flexible attributes
  embedding: number[];
  contextSchema: ContextFieldDefinition[];
  externalPlatforms: ExternalPlatform[];
  foundingUserId?: string;
  billingUserId?: string;
  startDate?: string;
  endDate?: string;
  geographicBounds?: Record<string, any>;
  parentCommunityId?: string;
  autoArchive: boolean;
  maxMembers?: number;
  visibility: 'public' | 'authenticated' | 'private';
  joinPolicy: 'open' | 'admin-approved' | 'invite-only';
  memberCount: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface CommunityMember {
  id: string;
  userId: string;
  personaId: string;
  communityId: string;
  role: 'member' | 'admin' | 'owner';
  memberTraits: Record<string, any>; // Community-specific context data, linkedPersonas, guild tierId, etc.
  visible: boolean;
  joinedAt: string;
  updatedAt: string;
}

// ============================================
// ENDORSEMENTS
// ============================================

interface Endorsement {
  id: string;
  fromPersonaUri: string;
  toPersonaUri?: string;
  toShadowPersonaId?: string;
  communityId: string;
  relationshipType: string;
  endorsementContext: string[];
  strength: 'strong' | 'standard';
  testimonial?: string;
  visibility: string;
  active: boolean;
  createdAt: string;
}

interface ShadowPersona {
  id: string;
  communityId: string;
  createdByPersonaUri: string;
  displayName: string;
  entityType: 'person' | 'organization';
  traits: TraitsDocument;
  embedding: number[];
  claimStatus: string;
  claimToken?: string;
  claimedByPersonaUri?: string;
  createdAt: string;
}
```

---

## Commerce Traits {#commerce-traits}

### Overview

Commerce traits extend the user traits model into buyer/consumer identity. They follow the same metadata-driven pattern as professional traits — each commerce trait is defined as a row in `trait_metadata` with `category: 'commerce'`, requiring no code changes to add new buyer attributes.

### Privacy Tiers

Commerce traits introduce a `privacyTier` field in `displayConfig` JSONB to control disclosure:

| Tier | Meaning | MCP Behavior |
|------|---------|-------------|
| `public` | Always shared | Included by default in MCP responses |
| `selective` | Per-persona choice | Included if user opts in via trait visibility settings |
| `gated` | ZK-provable | Returns attestation only (e.g., "over 21 = true"), not raw value |
| `sensitive` | Explicit consent (GDPR Art. 9) | Only returned with consent token; covers health-adjacent data |
| `agent_local` | Never leaves user's agent | **Never in MCP responses** — instructions for user's own AI agent only |

### Commerce Trait Categories

**Commerce Foundations (4 traits):** `commerceLocale`, `commerceTimezone`, `verifiedAgeBracket`, `verifiedLocationZone` — basic buyer identity without PII.

**Shipping & Delivery (2):** `shippingPreferences`, `deliveryWindows` — carrier, speed, and timing preferences.

**Budget & Financial (3):** `budgetPreferences` (agent-local), `paymentMethodTokens` (sensitive), `loyaltyPrograms` — spending constraints and payment methods.

**Size & Fit (4):** `clothingSizes`, `shoeSize`, `fitPreference`, `brandSizeNotes` — body measurements for fashion commerce.

**Dietary & Health (4):** `dietaryRestrictions` (sensitive), `allergens` (sensitive), `dietaryPreferences`, `householdDietary` (sensitive) — food-related preferences. These are GDPR Article 9 special category data.

**Brand & Style (5):** `favoriteBrands`, `blockedBrands` (agent-local), `styleTags`, `materialPreferences`, `techEcosystem` — aesthetic and brand preferences.

**Values & Sustainability (4):** `sustainabilityPriority`, `requiredCertifications`, `packagingPreference`, `secondhandOk` — values-based shopping filters.

**Agent Authorization & Returns (2):** `agentAuthorization` (agent-local), `returnPreferences` (agent-local) — delegation rules for autonomous AI shopping.

### Architectural Alignment

Commerce traits reuse the existing Personus architecture without modifications:

- **Traits → Persona projection:** All 28 commerce traits live in the user's traits. A "Grocery Persona" projects dietary traits; a "Fashion Persona" projects sizes and brands. Same selective disclosure model.
- **Metadata-driven rendering:** Commerce trait metadata rows define `displayConfig` and `editConfig` just like professional traits. The UI renders them automatically.
- **JSONB storage:** Commerce traits are stored in the persona's `traits` JSONB column alongside professional traits.
- **Vector embeddings:** Commerce preferences can contribute to persona embeddings for semantic matching (e.g., "find someone who knows about sustainable fashion").

---

**End of Data Model & Entities Document**

**Cross-references:**

- Doc 01 §Foundational Principles — Principle 9 (communities are optional), Principle 11 (unified model), Principle 12 (communities own schema)
- Doc 03 will define GraphQL/MCP APIs that expose these entities
- Doc 04 covers how AI agents interact with this model (including Community Coach)
- Doc 06 shows UI components that render traits dynamically via trait_metadata, plus community explore page
- Doc 08 defines guild-specific tables and features layered on the Community model
- Doc 09 defines the full authorization model for communities, tiers, and cross-persona linking
