---
type: foundation
title: Personus.ai — Master Specification v4.0
description: "\"The social network for the AI age.\" Where your value is what you can do, not what you post, and connections are built on trust, not followers."
status: superseded
tags: [archived]
timestamp: 2026-02-08
---

# Personus.ai — Master Specification v4.0

**"The social network for the AI age."**
*Where your value is what you can do, not what you post, and connections are built on trust, not followers.*

**Date:** 2026-02-08
**Stack:** Next.js 15 (App Router) · Mastra.ai · Neon Postgres + pgvector · Clerk · Vercel
**Consolidates:** v3.0 through v3.7 spec chain (8 documents, 9 prototypes)

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Foundational Principles](#2-foundational-principles)
3. [Core Entities — Complete Data Model](#3-core-entities)
4. [Three-Layer Schema](#4-three-layer-schema)
5. [Database Schema (Postgres)](#5-database-schema)
6. [API Surface](#6-api-surface)
7. [Mastra Agent Architecture](#7-mastra-agent-architecture)
8. [UX Entry Points & Flows](#8-ux-entry-points)
9. [Privacy & Access Control](#9-privacy-and-access-control)
10. [Embedded Surfaces & Distribution](#10-embedded-surfaces)
11. [MVP Scope & Implementation Plan](#11-mvp-scope)
12. [Appendix A: Prototypes](#appendix-a)
13. [Appendix B: Design Tokens](#appendix-b)

---

## 1. Product Vision

Personus is a capability-based social network where every person is a semantic API endpoint — discoverable by AI agents, queryable by systems, and owned entirely by the individual.

**Problem:** People are invisible to AI. Word-of-mouth is unstructured and ephemeral. LinkedIn sells exposure, not discovery. When your AI assistant needs to find a plumber, a Kubernetes expert, or a doula — it has nothing to query.

**Solution:** Privacy-preserving personas + trust graph + AI-native discovery. Users create rich, multi-dimensional portraits of their capabilities within group contexts (neighborhoods, organizations, communities). Other users endorse people they trust, creating a queryable trust graph. AI agents query the graph via MCP/GraphQL and return trust-backed recommendations with mediated contact.

**Core loop:**
```
User creates persona → User endorses trusted people (shadow personas) →
Shadow personas become discoverable → AI agent finds match for a query →
Mediated introduction → Shadow person claims persona → They endorse THEIR people →
Network grows
```

**What Personus is NOT:** Not a job board, not a CRM, not a review platform. No feed. No algorithm. No follower count. No content production pressure. No advertising. No PII exposure.

---

## 2. Foundational Principles

1. **No PII, ever.** Personas expose capabilities, skills, interests, availability — never emails, phone numbers, or addresses. This is architectural, not a toggle. PII detection runs on all text input.

2. **Masked contactability.** Contact flows through privacy-preserving channels (email relay, Signal, in-app). The system guides users toward high-privacy options. Channels implement a `ContactChannelAdapter` abstraction.

3. **Every persona is an addressable endpoint.** Unique URI, queryable by AI agents via MCP, by systems via GraphQL, by humans via natural language.

4. **Dual query interface.** NLP Gateway (natural language + MCP) for AI agents and humans. GraphQL for enterprise and developers. Both hit the same data layer.

5. **AI-native.** Built for AI agents as primary consumers. JSON-LD, schema.org, MCP, A2A. Human UIs exist, but machine-readability is the architectural priority.

6. **Voice-first persona creation.** The Persona Coach builds rich portraits through conversation, not forms. The Recommender Coach builds trust-backed endorsements the same way.

7. **Trust through relationships, not reviews.** Endorsements are positive-only, group-scoped, grounded in declared relationship types, and queryable by AI agents. Digitized word-of-mouth.

8. **Context-dependent identity.** The same human can have different personas in different groups (neighbor vs. employee vs. club member), each with separate display names, headlines, skills, and contact settings. Personas within the same user account are never cross-linked without explicit opt-in.

9. **Groups own schema, individuals own data.** Group admins define Context Layer fields. Individuals own and control their persona data within those schemas.

10. **Every surface is a growth surface.** Shared links, embedded results, email digests — every touchpoint includes a path to claim, endorse, or join.

---

## 3. Core Entities

11 entities total. Complete TypeScript interfaces follow.

### 3.1 User

The authenticated human. Never directly queryable. Owns personas.

```typescript
interface User {
  id: string;                           // UUID
  clerkUserId: string;                  // Clerk auth ID
  did?: string;                         // Decentralized identifier (Phase 3)
  email: string;                        // Auth only — never exposed
  created_at: string;                   // ISO 8601
  updated_at: string;
}
```

### 3.2 Persona

The addressable semantic endpoint. The core entity. Contains Base Layer and Attribute Layer fields, with Context Layer data stored on PersonaGroupMembership.

```typescript
interface Persona {
  id: string;                           // UUID
  uri: string;                          // Unique URI: "personus:persona:<nanoid>"
  userId: string;                       // FK → User
  did?: string;                         // Optional DID binding (Phase 3)

  // ── BASE LAYER (universal per persona) ──

  displayName: string;                  // "Nadia K." or "Nadia Kovac, RVT"
  initial?: string;                     // "N" — for avatar gen, derived or overridden
  headline: string;                     // "Backyard beekeeper · Sourdough baker · Kitten fosterer"
  location?: string;                    // Freeform: "Sunnyside, San Francisco"
  travelRadius?: string;               // "Will travel within 45 min"

  availability?: {
    summary: string;                    // "Weekday evenings after 6, most weekends"
    timezone?: string;                  // "America/Los_Angeles"
    hoursPerWeek?: number;              // For contract/freelance
    status?: "available" | "limited" | "unavailable" | "booking-ahead";
  };

  visibility: "public" | "authenticated" | "group" | "private";
  contactPolicy: "open" | "mediated" | "closed";
  contactChannels: ContactChannelRegistration[];
  contactNote?: string;                 // "Best way: leave a note in the group chat"
  contactReasons?: string[];            // ["Pet sitting swap", "Beekeeping question"]

  personaLifespan: "permanent" | "temporary" | "event-scoped";
  lifespanExpiresAt?: string;           // For temporary/event-scoped
  endorsementPolicy: "accept-all" | "review" | "off";
  completenessScore: number;            // 0-100, computed on write

  // ── ATTRIBUTE LAYER (domain-general, self-declared) ──

  skills: Skill[];
  openTo: string[];                     // ["collaboration", "mentoring", "contracting"]
  workStyle?: string[];                 // ["async-first", "pair-programming"]
  values?: string[];                    // ["open-source", "sustainability", "craftsmanship"]
  distinctiveStrengths?: string[];      // ["explaining complex things simply"]
  currentFocus?: string[];              // ["building a Rust game engine"]
  interests?: string[];                 // General interests beyond skills
  languages?: string[];                 // ["English", "Spanish"]
  experience?: Experience[];

  // ── METADATA ──

  created_at: string;
  updated_at: string;
}

interface Skill {
  name: string;                         // "Galvanized pipe replacement"
  category?: string;                    // Optional grouping
  proficiency?: "learning" | "competent" | "expert";
  visibilityOverride?: "public" | "authenticated" | "group" | "private";
}

interface Experience {
  domain: string;                       // "Victorian plumbing"
  years?: number;
  context?: string;                     // "San Francisco residential"
}

interface ContactChannelRegistration {
  channelType: "email-relay" | "signal" | "telegram" | "whatsapp" | "in-app";
  privacyLevel: "high" | "medium" | "low";
  active: boolean;
  // Actual address/handle stored encrypted, never in API responses
  channelRef: string;                   // Encrypted reference
}
```

### 3.3 Group

A tenant, organization, or community. Owns the Context Layer schema.

```typescript
interface Group {
  id: string;                           // UUID
  slug: string;                         // URL-safe: "sunnyside-neighbors"
  name: string;                         // "Sunnyside Neighbors"
  description?: string;
  icon?: string;                        // Emoji or URL
  groupType: "neighborhood" | "organization" | "community" | "professional" | "custom";

  // Schema
  schema: GroupSchema;
  completenessConfig: CompletenessConfig;
  embedConfig: EmbedConfig;

  // Settings
  visibility: "public" | "invite-only" | "private";
  joinPolicy: "open" | "approval" | "invite-only";
  memberCount: number;                  // Denormalized for display

  // Admin
  createdByUserId: string;
  created_at: string;
  updated_at: string;
}

interface GroupSchema {
  fields: ContextFieldDefinition[];
  version: number;
  updated_at: string;
}

interface ContextFieldDefinition {
  key: string;                          // "block" / "role" / "instruments"
  label: string;                        // "Block" / "Role" / "Instruments"
  type: "text" | "number" | "select" | "multiselect" | "boolean";
  required: boolean;
  displayOrder: number;
  displayStyle: "grid" | "inline" | "hidden";
  options?: string[];                   // For select/multiselect
  placeholder?: string;
  helpText?: string;
}

interface CompletenessConfig {
  weights: {
    headline: number;                   // Default: 15
    skills: number;                     // Default: 15
    distinctiveStrengths: number;       // Default: 12
    openTo: number;                     // Default: 12
    contextFields: number;              // Default: 12
    values: number;                     // Default: 10
    currentFocus: number;               // Default: 8
    contactSettings: number;            // Default: 8
    endorsements: number;               // Default: 8
  };
  thresholds: {
    minimum: number;                    // Default: 30
    good: number;                       // Default: 70
    excellent: number;                  // Default: 90
  };
}

interface EmbedConfig {
  slackEnabled: boolean;
  discordEnabled: boolean;
  mcpEnabled: boolean;
  ogCardsEnabled: boolean;
  emailDigestEnabled: boolean;
  emailDigestFrequency: "daily" | "weekly" | "monthly";
  accentColor?: string;
  showEndorsementTextInEmbeds: boolean;
  showSkillsInOGCards: boolean;
  maxResultsPerQuery: number;           // Default: 5
}
```

### 3.4 Agent

AI agent identity for querying Personus.

```typescript
interface Agent {
  id: string;                           // UUID
  name: string;                         // "Claude", "RecruitBot"
  did?: string;                         // DID for verified agents (Phase 3)
  apiKey: string;                       // Hashed
  trustLevel: "anonymous" | "registered" | "verified" | "trusted";
  rateLimit: number;                    // Requests per minute
  allowedGroups?: string[];             // If scoped to specific groups
  created_at: string;
  updated_at: string;
}
```

### 3.5 Endorsement

Directional trust assertion between personas. Group-scoped. Positive-only.

```typescript
interface Endorsement {
  id: string;                           // UUID
  fromPersonaUri: string;               // Who is endorsing
  toPersonaUri?: string;                // Endorsed persona on Personus
  toShadowPersonaId?: string;          // OR endorsed person NOT on Personus
  groupId: string;                      // Group context — endorsement lives here

  relationshipType:
    | "vendor" | "collaborator" | "colleague" | "mentor"
    | "friend" | "family" | "expert" | "community";
  endorsementContext: string[];         // What for: ["residential plumbing", "pipe replacement"]
  strength: "strong" | "standard";      // Actively recommend vs. would use again
  testimonial?: string;                 // Rich narrative: "Marco saved our house..."

  visibility: "public" | "authenticated" | "group" | "query-only";
  promotedToPersona: boolean;           // Owner lifted this to persona-wide visibility
  active: boolean;

  created_at: string;
  updated_at: string;
}
```

### 3.6 ShadowPersona

PII-free representation of a non-Personus person. Created by endorsers. Claimable.

```typescript
interface ShadowPersona {
  id: string;                           // UUID
  groupId: string;                      // Which group this shadow lives in
  createdByPersonaUri: string;          // Who endorsed them first

  displayName: string;                  // First name or pseudonym only
  serviceDescription: string;           // "Residential plumber"
  skills: string[];                     // ["galvanized pipe replacement", "Victorian plumbing"]
  serviceArea?: string;                 // "Sunnyside & Inner Sunset, SF"
  distinctiveStrengths?: string[];      // From endorser conversations

  contactMethod: "through-endorser";    // ONLY way to reach them
  endorsementCount: number;             // Denormalized

  claimStatus: "unclaimed" | "invited" | "link_shared" | "claimed";
  claimedByPersonaUri?: string;
  claimToken?: string;                  // One-time claim token
  inviteSentVia?: string;              // "sms" | "email" | "link_copy"
  inviteSentAt?: string;
  inviteSentByPersonaUri?: string;

  // Auto-expiry for unclaimed shadows
  expiresAt?: string;                   // Default: 90 days from creation

  created_at: string;
  updated_at: string;
}
```

### 3.7 PersonaGroupMembership

Join entity: persona + group + Context Layer data. This IS the context.

```typescript
interface PersonaGroupMembership {
  id: string;                           // UUID
  personaUri: string;                   // FK → Persona
  groupId: string;                      // FK → Group

  contextData: Record<string, any>;     // Context Layer field values (JSONB)
  // Validated against Group.schema at write time

  contactChannelsOverride?: string[];   // Which channels active in this group
  contactReasonsOverride?: string[];    // Group-specific reasons
  contactNoteOverride?: string;         // Group-specific note

  role: "member" | "admin" | "owner";
  visible: boolean;                     // Discoverable in this group?

  joined_at: string;
  updated_at: string;
}
```

### 3.8 ContactRequest

Introduction request with AI triage.

```typescript
interface ContactRequest {
  id: string;                           // UUID

  // Who is requesting
  fromPersonaUri?: string;              // If requester is on Personus
  fromAgentId?: string;                 // If request via AI agent
  fromAnonymous?: {                     // If not on Personus
    displayName?: string;
    channel: string;                    // "web_form" | "slack" | "discord" | "mcp"
  };

  // Who is being contacted
  toPersonaUri: string;
  toGroupId?: string;                   // Group context

  // Request content
  reason: string;                       // From contactReasons
  message?: string;                     // Freeform

  // AI triage (populated by Contact Mediation Agent)
  triageNote?: string;                  // "Matches your openTo for 'beekeeping mentoring'"
  triageScore?: number;                 // 0-100
  matchedOpenTo?: string[];
  trustChain?: string[];                // Endorsement path: requester → target

  // Status
  status: "pending" | "approved" | "declined" | "expired";
  respondedAt?: string;
  responseNote?: string;                // Owner's note back

  created_at: string;
  expires_at?: string;                  // Auto-expire after N days
}
```

### 3.9 ActivityEvent

Cross-persona event log for dashboard feed.

```typescript
interface ActivityEvent {
  id: string;                           // UUID
  userId: string;                       // For cross-persona queries
  personaUri: string;
  groupId?: string;

  type:
    | "endorsement_received" | "endorsement_given"
    | "contact_request_received" | "contact_request_approved" | "contact_request_declined"
    | "persona_viewed" | "persona_matched"
    | "shadow_persona_claimed"
    | "group_joined" | "group_invited";

  payload: Record<string, any>;         // Event-specific data
  summary: string;                      // "R.P. endorsed you for cat fostering"

  created_at: string;
}
// Storage: Partitioned by userId. 90-day retention.
```

### 3.10 CoachSession

Persona Coach conversation log. Enables resumability and quality metrics.

```typescript
interface CoachSession {
  id: string;                           // UUID
  userId: string;
  personaUri: string;
  groupId: string;

  status: "active" | "completed" | "abandoned";
  mode: "creation" | "improvement" | "section_edit";
  targetSection?: string;              // If section_edit

  transcript: CoachMessage[];
  fieldsUpdated: FieldUpdate[];

  completenessAtStart: number;
  completenessAtEnd: number;
  durationSeconds: number;
  turnsCount: number;
  piiBlockedCount: number;

  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface CoachMessage {
  role: "coach" | "user";
  content: string;
  inputMode: "voice" | "text";
  fieldsMapped?: FieldUpdate[];
  piiDetected?: boolean;
  timestamp: string;
}

interface FieldUpdate {
  field: string;                        // "headline", "skills", "block"
  layer: "base" | "attribute" | "context";
  previousValue?: any;
  newValue: any;
  source: "coach_extraction";
}
```

### 3.11 RecommenderSession

Recommender Coach conversation log. Tracks shadow persona + endorsement creation.

```typescript
interface RecommenderSession {
  id: string;                           // UUID
  userId: string;
  endorserPersonaUri: string;
  groupId: string;

  targetType: "shadow" | "existing";
  shadowPersonaId?: string;            // If creating shadow
  targetPersonaUri?: string;           // If endorsing existing
  endorsementId?: string;              // Created endorsement

  status: "active" | "completed" | "abandoned";
  mode: "single" | "batch";

  transcript: CoachMessage[];           // Reuses CoachMessage type
  durationSeconds: number;
  turnsCount: number;
  inviteAction?: "invited" | "link_shared" | "deferred";

  created_at: string;
  updated_at: string;
}
```

### Derived Structures (not separate tables — views or computed)

```typescript
// Query logging for group analytics
interface GroupQueryLog {
  id: string;
  groupId: string;
  queryText: string;
  querySource: "nlp_gateway" | "graphql" | "mcp" | "slack" | "discord";
  agentId?: string;
  matchCount: number;
  matchedSkills: string[];
  resultedInContact: boolean;
  created_at: string;
}

// Aggregated analytics (materialized view, refreshed hourly)
interface GroupAnalyticsSummary {
  groupId: string;
  period: "day" | "week" | "month";
  periodStart: string;
  totalQueries: number;
  totalIntroductions: number;
  totalEndorsements: number;
  newMembers: number;
  topQueriedSkills: { skill: string; count: number }[];
  skillGaps: { skill: string; queryCount: number }[];
  memberActivationRate: number;
  averageCompleteness: number;
}

// Extension session tracking
interface ExtensionSession {
  id: string;
  userId: string;
  platform: "claude" | "chatgpt" | "custom";
  events: ExtensionEvent[];
  searchCount: number;
  resultsShown: number;
  contactRequestsSent: number;
  mode: "explicit" | "ambient" | "mixed";
  created_at: string;
  updated_at: string;
}

// Platform integration state
interface PlatformIntegration {
  id: string;
  groupId: string;
  platform: "slack" | "discord" | "email";
  status: "active" | "disconnected" | "pending";
  slackWorkspaceId?: string;
  discordGuildId?: string;
  accessToken?: string;                 // Encrypted
  refreshToken?: string;                // Encrypted
  installed_at: string;
  installed_by: string;
}
```

---

## 4. Three-Layer Schema

```
BASE LAYER (per Persona — universal)
├── id, uri, userId, did, timestamps
├── displayName, initial, headline
├── location, travelRadius
├── availability { summary, timezone, hoursPerWeek, status }
├── visibility, contactPolicy
├── contactChannels[], contactNote, contactReasons[]
├── personaLifespan, lifespanExpiresAt
├── endorsementPolicy
└── completenessScore (derived, 0-100)

ATTRIBUTE LAYER (per Persona — domain-general, self-declared)
├── skills[] { name, category, proficiency, visibilityOverride }
├── openTo[] (connection types)
├── workStyle[] (collaboration preferences)
├── values[] (what matters)
├── distinctiveStrengths[] (superpowers)
├── currentFocus[] (what's active now)
├── interests[]
├── languages[]
└── experience[] { domain, years, context }

CONTEXT LAYER (per PersonaGroupMembership — group-specific)
├── Defined by GroupSchema.fields[]
├── Stored as JSONB on PersonaGroupMembership.contextData
├── Validated against GroupSchema at write time (Zod)
├── Examples: "block", "credentials", "instruments", "IC level"
└── Display metadata on schema definition (label, order, style)
```

### Completeness Algorithm

```typescript
function computeCompleteness(
  persona: Persona,
  membership: PersonaGroupMembership,
  config: CompletenessConfig,
  endorsementCount: number
): number {
  const checks: Record<string, boolean> = {
    headline: !!persona.headline && persona.headline.length > 0,
    skills: (persona.skills?.length ?? 0) >= 2,
    distinctiveStrengths: (persona.distinctiveStrengths?.length ?? 0) > 0,
    openTo: (persona.openTo?.length ?? 0) > 0,
    contextFields: Object.keys(membership.contextData ?? {}).length >= 1,
    values: (persona.values?.length ?? 0) > 0,
    currentFocus: (persona.currentFocus?.length ?? 0) > 0,
    contactSettings: !!persona.contactPolicy && (persona.contactChannels?.length ?? 0) > 0,
    endorsements: endorsementCount >= 1,
  };

  let score = 0;
  for (const [field, filled] of Object.entries(checks)) {
    if (filled) score += config.weights[field as keyof typeof config.weights] ?? 0;
  }
  return Math.round(score);
}
```

### Trust-Weighted Search Scoring

```
final_score = (
  0.5 × structural_match +    // skills, availability, location
  0.3 × semantic_similarity +  // pgvector embedding cosine
  0.2 × trust_signal           // endorsement from querier's network
)

trust_signal =
  1.0 → endorsed by direct connection, "strong"
  0.7 → endorsed by direct connection, "standard"
  0.4 → endorsed by extended network (2-hop)
  0.0 → no network endorsement
```

---

## 5. Database Schema

Neon Postgres + pgvector. All tables use Row-Level Security for multi-tenancy.

```sql
-- ═══════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,                -- auth only, never exposed in API
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- GROUPS
-- ═══════════════════════════════════════════

CREATE TABLE groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  icon                TEXT,
  group_type          TEXT NOT NULL DEFAULT 'community',
  schema              JSONB NOT NULL DEFAULT '{"fields":[],"version":1}',
  completeness_config JSONB NOT NULL DEFAULT '{
    "weights":{"headline":15,"skills":15,"distinctiveStrengths":12,"openTo":12,
    "contextFields":12,"values":10,"currentFocus":8,"contactSettings":8,"endorsements":8},
    "thresholds":{"minimum":30,"good":70,"excellent":90}
  }',
  embed_config        JSONB NOT NULL DEFAULT '{
    "slackEnabled":false,"discordEnabled":false,"mcpEnabled":true,
    "ogCardsEnabled":true,"emailDigestEnabled":false,
    "emailDigestFrequency":"weekly","showEndorsementTextInEmbeds":true,
    "showSkillsInOGCards":true,"maxResultsPerQuery":5
  }',
  visibility          TEXT NOT NULL DEFAULT 'public',
  join_policy         TEXT NOT NULL DEFAULT 'open',
  member_count        INTEGER DEFAULT 0,
  created_by_user_id  UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- PERSONAS
-- ═══════════════════════════════════════════

CREATE TABLE personas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uri                   TEXT UNIQUE NOT NULL,      -- "personus:persona:<nanoid>"
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Base Layer
  display_name          TEXT NOT NULL,
  initial               TEXT,
  headline              TEXT NOT NULL DEFAULT '',
  location              TEXT,
  travel_radius         TEXT,
  availability          JSONB,                     -- { summary, timezone, hoursPerWeek, status }
  visibility            TEXT NOT NULL DEFAULT 'group',
  contact_policy        TEXT NOT NULL DEFAULT 'mediated',
  contact_channels      JSONB DEFAULT '[]',
  contact_note          TEXT,
  contact_reasons       JSONB DEFAULT '[]',        -- string[]
  persona_lifespan      TEXT NOT NULL DEFAULT 'permanent',
  lifespan_expires_at   TIMESTAMPTZ,
  endorsement_policy    TEXT NOT NULL DEFAULT 'accept-all',
  completeness_score    INTEGER DEFAULT 0,

  -- Attribute Layer
  skills                JSONB DEFAULT '[]',        -- Skill[]
  open_to               JSONB DEFAULT '[]',        -- string[]
  work_style            JSONB DEFAULT '[]',
  "values"              JSONB DEFAULT '[]',
  distinctive_strengths JSONB DEFAULT '[]',
  current_focus         JSONB DEFAULT '[]',
  interests             JSONB DEFAULT '[]',
  languages             JSONB DEFAULT '[]',
  experience            JSONB DEFAULT '[]',        -- Experience[]

  -- Search embedding
  embedding             vector(1536),              -- pgvector: OpenAI text-embedding-3-small

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personas_user ON personas(user_id);
CREATE INDEX idx_personas_uri ON personas(uri);
CREATE INDEX idx_personas_embedding ON personas USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_personas_skills ON personas USING gin (skills);

-- ═══════════════════════════════════════════
-- PERSONA GROUP MEMBERSHIP
-- ═══════════════════════════════════════════

CREATE TABLE persona_group_memberships (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_uri              TEXT NOT NULL REFERENCES personas(uri) ON DELETE CASCADE,
  group_id                 UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  context_data             JSONB DEFAULT '{}',
  contact_channels_override JSONB,
  contact_reasons_override  JSONB,
  contact_note_override     TEXT,
  role                     TEXT NOT NULL DEFAULT 'member',
  visible                  BOOLEAN DEFAULT true,
  joined_at                TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),

  UNIQUE(persona_uri, group_id)
);

CREATE INDEX idx_pgm_persona ON persona_group_memberships(persona_uri);
CREATE INDEX idx_pgm_group ON persona_group_memberships(group_id);

-- ═══════════════════════════════════════════
-- ENDORSEMENTS
-- ═══════════════════════════════════════════

CREATE TABLE endorsements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_persona_uri      TEXT NOT NULL REFERENCES personas(uri),
  to_persona_uri        TEXT REFERENCES personas(uri),
  to_shadow_persona_id  UUID REFERENCES shadow_personas(id),
  group_id              UUID NOT NULL REFERENCES groups(id),

  relationship_type     TEXT NOT NULL,
  endorsement_context   JSONB DEFAULT '[]',        -- string[]
  strength              TEXT NOT NULL DEFAULT 'standard',
  testimonial           TEXT,

  visibility            TEXT NOT NULL DEFAULT 'group',
  promoted_to_persona   BOOLEAN DEFAULT false,
  active                BOOLEAN DEFAULT true,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  CHECK (to_persona_uri IS NOT NULL OR to_shadow_persona_id IS NOT NULL)
);

CREATE INDEX idx_endorsements_to ON endorsements(to_persona_uri);
CREATE INDEX idx_endorsements_from ON endorsements(from_persona_uri);
CREATE INDEX idx_endorsements_group ON endorsements(group_id);
CREATE INDEX idx_endorsements_shadow ON endorsements(to_shadow_persona_id);

-- ═══════════════════════════════════════════
-- SHADOW PERSONAS
-- ═══════════════════════════════════════════

CREATE TABLE shadow_personas (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                 UUID NOT NULL REFERENCES groups(id),
  created_by_persona_uri   TEXT NOT NULL REFERENCES personas(uri),

  display_name             TEXT NOT NULL,
  service_description      TEXT NOT NULL,
  skills                   JSONB DEFAULT '[]',
  service_area             TEXT,
  distinctive_strengths    JSONB DEFAULT '[]',

  contact_method           TEXT DEFAULT 'through-endorser',
  endorsement_count        INTEGER DEFAULT 0,

  claim_status             TEXT DEFAULT 'unclaimed',
  claimed_by_persona_uri   TEXT REFERENCES personas(uri),
  claim_token              TEXT UNIQUE,
  invite_sent_via          TEXT,
  invite_sent_at           TIMESTAMPTZ,
  invite_sent_by_persona   TEXT,

  expires_at               TIMESTAMPTZ,

  -- Search embedding
  embedding                vector(1536),

  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shadow_group ON shadow_personas(group_id);
CREATE INDEX idx_shadow_claim ON shadow_personas(claim_status);
CREATE INDEX idx_shadow_embedding ON shadow_personas USING ivfflat (embedding vector_cosine_ops);

-- ═══════════════════════════════════════════
-- CONTACT REQUESTS
-- ═══════════════════════════════════════════

CREATE TABLE contact_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_persona_uri   TEXT REFERENCES personas(uri),
  from_agent_id      UUID REFERENCES agents(id),
  from_anonymous     JSONB,
  to_persona_uri     TEXT NOT NULL REFERENCES personas(uri),
  to_group_id        UUID REFERENCES groups(id),

  reason             TEXT NOT NULL,
  message            TEXT,

  triage_note        TEXT,
  triage_score       INTEGER,
  matched_open_to    JSONB,
  trust_chain        JSONB,

  status             TEXT NOT NULL DEFAULT 'pending',
  responded_at       TIMESTAMPTZ,
  response_note      TEXT,

  created_at         TIMESTAMPTZ DEFAULT now(),
  expires_at         TIMESTAMPTZ
);

CREATE INDEX idx_cr_to ON contact_requests(to_persona_uri);
CREATE INDEX idx_cr_status ON contact_requests(status);

-- ═══════════════════════════════════════════
-- ACTIVITY EVENTS
-- ═══════════════════════════════════════════

CREATE TABLE activity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  persona_uri  TEXT NOT NULL,
  group_id     UUID,
  type         TEXT NOT NULL,
  payload      JSONB DEFAULT '{}',
  summary      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ae_user ON activity_events(user_id, created_at DESC);

-- ═══════════════════════════════════════════
-- AGENTS
-- ═══════════════════════════════════════════

CREATE TABLE agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  api_key_hash   TEXT NOT NULL,
  trust_level    TEXT NOT NULL DEFAULT 'registered',
  rate_limit     INTEGER DEFAULT 100,
  allowed_groups JSONB,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- COACH SESSIONS
-- ═══════════════════════════════════════════

CREATE TABLE coach_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  persona_uri           TEXT NOT NULL REFERENCES personas(uri),
  group_id              UUID NOT NULL REFERENCES groups(id),
  status                TEXT NOT NULL DEFAULT 'active',
  mode                  TEXT NOT NULL DEFAULT 'creation',
  target_section        TEXT,
  transcript            JSONB DEFAULT '[]',
  fields_updated        JSONB DEFAULT '[]',
  completeness_at_start INTEGER,
  completeness_at_end   INTEGER,
  duration_seconds      INTEGER,
  turns_count           INTEGER DEFAULT 0,
  pii_blocked_count     INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- RECOMMENDER SESSIONS
-- ═══════════════════════════════════════════

CREATE TABLE recommender_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  endorser_persona_uri  TEXT NOT NULL REFERENCES personas(uri),
  group_id              UUID NOT NULL REFERENCES groups(id),
  target_type           TEXT NOT NULL,               -- "shadow" | "existing"
  shadow_persona_id     UUID REFERENCES shadow_personas(id),
  target_persona_uri    TEXT REFERENCES personas(uri),
  endorsement_id        UUID REFERENCES endorsements(id),
  status                TEXT NOT NULL DEFAULT 'active',
  mode                  TEXT NOT NULL DEFAULT 'single',
  transcript            JSONB DEFAULT '[]',
  duration_seconds      INTEGER,
  turns_count           INTEGER DEFAULT 0,
  invite_action         TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- QUERY LOG (for group analytics)
-- ═══════════════════════════════════════════

CREATE TABLE group_query_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id),
  query_text        TEXT NOT NULL,
  query_source      TEXT NOT NULL,
  agent_id          UUID,
  match_count       INTEGER DEFAULT 0,
  matched_skills    JSONB DEFAULT '[]',
  resulted_in_contact BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gql_group ON group_query_logs(group_id, created_at DESC);

-- ═══════════════════════════════════════════
-- PLATFORM INTEGRATIONS
-- ═══════════════════════════════════════════

CREATE TABLE platform_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES groups(id),
  platform         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  slack_workspace_id  TEXT,
  discord_guild_id    TEXT,
  access_token     TEXT,                        -- Encrypted at rest
  refresh_token    TEXT,                        -- Encrypted at rest
  installed_at     TIMESTAMPTZ DEFAULT now(),
  installed_by     TEXT NOT NULL
);
```

### Embedding Strategy

Which fields get embedded for semantic search (concatenated, then embedded via OpenAI `text-embedding-3-small`):

```typescript
function buildEmbeddingText(persona: Persona, membership?: PersonaGroupMembership): string {
  const parts = [
    persona.headline,
    persona.skills?.map(s => s.name).join(", "),
    persona.distinctiveStrengths?.join(". "),
    persona.openTo?.join(", "),
    persona.values?.join(", "),
    persona.currentFocus?.join(", "),
    persona.location,
    persona.interests?.join(", "),
    // Context Layer fields (values only, not keys)
    membership ? Object.values(membership.contextData ?? {}).join(", ") : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

// Same for shadow personas:
function buildShadowEmbeddingText(shadow: ShadowPersona): string {
  return [
    shadow.serviceDescription,
    shadow.skills?.join(", "),
    shadow.distinctiveStrengths?.join(". "),
    shadow.serviceArea,
  ].filter(Boolean).join(" | ");
}
```

Embeddings recompute on persona/shadow update. Store in `embedding` column. Search via pgvector `<=>` cosine distance.

---

## 6. API Surface

### 6.1 GraphQL Schema (Pothos)

```graphql
type Query {
  # Persona queries
  me: User!
  myPersonas: [Persona!]!
  persona(uri: String!): Persona
  searchPersonas(query: String!, groupId: ID, limit: Int): SearchResult!

  # Group queries
  group(id: ID, slug: String): Group
  myGroups: [GroupMembership!]!
  groupMembers(groupId: ID!, search: String, limit: Int, offset: Int): [PersonaGroupMembership!]!
  groupAnalytics(groupId: ID!, period: String!): GroupAnalyticsSummary

  # Endorsement queries
  endorsementsOfPersona(personaUri: String!, groupId: ID): [Endorsement!]!
  myEndorsements(groupId: ID): [Endorsement!]!

  # Contact queries
  myContactRequests(personaUri: String, status: String): [ContactRequest!]!

  # Activity
  activityFeed(limit: Int, offset: Int): [ActivityEvent!]!

  # Shadow
  shadowPersona(id: ID!): ShadowPersona
  shadowPersonaByClaimToken(token: String!): ShadowPersona
}

type Mutation {
  # Persona CRUD
  createPersona(input: CreatePersonaInput!): Persona!
  updatePersona(uri: String!, input: UpdatePersonaInput!): Persona!
  deletePersona(uri: String!): Boolean!

  # Group
  createGroup(input: CreateGroupInput!): Group!
  updateGroup(id: ID!, input: UpdateGroupInput!): Group!
  updateGroupSchema(id: ID!, schema: GroupSchemaInput!): Group!
  joinGroup(groupId: ID!, personaUri: String!): PersonaGroupMembership!

  # Context data
  updateContextData(personaUri: String!, groupId: ID!, data: JSON!): PersonaGroupMembership!

  # Endorsements
  createEndorsement(input: CreateEndorsementInput!): Endorsement!
  deactivateEndorsement(id: ID!): Endorsement!
  promoteEndorsement(id: ID!): Endorsement!

  # Shadow personas
  createShadowPersona(input: CreateShadowPersonaInput!): ShadowPersona!
  claimShadowPersona(token: String!): Persona!
  inviteClaimShadowPersona(id: ID!, via: String!): ShadowPersona!

  # Contact
  requestContact(input: RequestContactInput!): ContactRequest!
  respondToContact(id: ID!, status: String!, note: String): ContactRequest!

  # Coach sessions
  startCoachSession(input: StartCoachInput!): CoachSession!
  addCoachMessage(sessionId: ID!, message: CoachMessageInput!): CoachSession!
  completeCoachSession(sessionId: ID!): CoachSession!

  # Recommender sessions
  startRecommenderSession(input: StartRecommenderInput!): RecommenderSession!
}

type Subscription {
  onContactRequest(personaUri: String!): ContactRequest!
  onEndorsementReceived(personaUri: String!): Endorsement!
}
```

### 6.2 MCP Tools

Exposed via Mastra's built-in MCP server. These are what AI agents call.

```typescript
// Tool 1: Search personas
const personusSearch = {
  name: "personus_search",
  description: `Search the user's Personus trust networks for people matching a query.
    Use when the user needs a specific person OR when you detect they could benefit
    from connecting with someone. Returns personas with endorsements, trust signals,
    and mediated contact options.`,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural language: who they need" },
      groupIds: { type: "array", items: { type: "string" }, description: "Limit to specific groups" },
      context: { type: "string", description: "Conversation context for better summaries" },
      maxResults: { type: "number", description: "Max results (default 3)" },
    },
    required: ["query"],
  },
};

// Tool 2: Request introduction
const personusContact = {
  name: "personus_request_introduction",
  description: `Send a mediated introduction request to a Personus persona.
    The recipient decides whether to connect.`,
  inputSchema: {
    type: "object",
    properties: {
      targetPersonaUri: { type: "string" },
      reason: { type: "string" },
      message: { type: "string" },
      groupId: { type: "string" },
    },
    required: ["targetPersonaUri", "reason", "message"],
  },
};

// Tool 3: Get persona details
const personusGetPersona = {
  name: "personus_get_persona",
  description: "Get full details of a specific persona by URI.",
  inputSchema: {
    type: "object",
    properties: {
      personaUri: { type: "string" },
      groupId: { type: "string", description: "Group context for context fields" },
    },
    required: ["personaUri"],
  },
};

// Tool 4: List groups
const personusListGroups = {
  name: "personus_list_groups",
  description: "List the user's connected Personus groups.",
  inputSchema: { type: "object", properties: {} },
};
```

### 6.3 MCP Search Result Shape

What the AI agent receives from `personus_search`:

```typescript
interface PersonusSearchResponse {
  results: PersonaResult[];
  queryMeta: {
    group: string;
    matchedTerms: string[];
    totalResults: number;
    privacyNote: string;
    searchMode: "explicit" | "ambient";
  };
}

interface PersonaResult {
  personaType: "full" | "shadow";
  personaUri?: string;
  shadowPersonaId?: string;
  displayName: string;
  headline?: string;
  serviceDescription?: string;
  location?: string;
  skills: string[];
  distinctiveStrengths?: string[];
  values?: string[];
  openTo?: string[];
  endorsements: EndorsementSummary[];
  contactMethod: "mediated" | "through-endorser" | "direct";
  contextualSummary: string;            // Generated per-query by Value Conveyance Agent
  matchExplanation: {
    matchedTerms: string[];
    matchedFields: string[];
    relevanceScore: number;
    endorsementWeight: number;
  };
  actions: {
    requestIntroduction?: string;       // API endpoint
    viewFullPersona: string;            // URL
  };
}

interface EndorsementSummary {
  from: string;                         // Display name
  relationship: string;
  strength: "strong" | "standard";
  context: string[];
  testimonial?: string;
}
```

### 6.4 REST Endpoints (simple integrations)

```
GET    /api/personas/:uri
GET    /api/groups/:slug
GET    /api/groups/:slug/members
POST   /api/search
POST   /api/contact/request
GET    /api/shadow/:id
POST   /api/shadow/:token/claim
GET    /api/og/:personaUri          → OG image generation
GET    /api/og/shadow/:id           → Shadow OG image
GET    /api/og/group/:slug          → Group OG image
```

---

## 7. Mastra Agent Architecture

### 7.1 Agent Network Overview

```
                    ┌─────────────────┐
                    │  NLP Gateway    │ ← All queries enter here
                    │  (Router Agent) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌───────────┐ ┌───────────┐ ┌───────────────┐
        │  Query    │ │  Trust    │ │    Value      │
        │  Planner  │ │  Graph   │ │  Conveyance   │
        │           │ │  Agent   │ │    Agent      │
        └─────┬─────┘ └─────┬─────┘ └───────┬───────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Result Assembler│ → Ranked, filtered, formatted
                    └─────────────────┘

        ┌───────────────┐  ┌───────────────────┐
        │ Persona Coach │  │ Recommender Coach  │
        │   (voice)     │  │     (voice)        │
        └───────────────┘  └───────────────────┘

        ┌───────────────────┐
        │ Contact Mediation │ → AI triage of requests
        │      Agent        │
        └───────────────────┘
```

### 7.2 Agent Definitions (Mastra)

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// ── NLP Gateway ──
const gatewayAgent = new Agent({
  name: "gateway",
  model: openai("gpt-4o"),
  instructions: `You are the Personus query router. Parse natural language queries
    about finding people. Extract: intent (discovery/referral/availability),
    skills/capabilities needed, group context, trust requirements.
    Route to appropriate sub-agents.`,
  tools: [queryPlannerTool, personaSearchTool, trustGraphTool],
});

// ── Value Conveyance Agent ──
const valueConveyanceAgent = new Agent({
  name: "value-conveyance",
  model: openai("gpt-4o-mini"),         // Fast + cheap — runs per result
  instructions: `Generate a 2-4 sentence contextual summary explaining why this
    persona matches the user's query. Be specific about which skills, strengths,
    or endorsements are relevant. Reference query terms directly. Write for
    conversational AI context — this text will be read aloud or displayed inline.`,
});

// ── Persona Coach ──
const personaCoachAgent = new Agent({
  name: "persona-coach",
  model: openai("gpt-4o"),
  instructions: `You are the Personus Persona Coach. Guide users through creating
    a rich persona portrait through natural conversation. Draw out: headline, skills,
    distinctive strengths, values, openTo, currentFocus, and group-specific context.
    Be warm, specific, and encouraging. Catch PII and redirect to contact settings.
    Never echo back PII. Use "tell a friend" framing.`,
  tools: [
    updatePersonaFieldTool,
    checkPIITool,
    getGroupSchemaTool,
    promptEndorsementTool,
    getCompletenessTool,
  ],
  voice: {
    provider: "openai",
    tts: { model: "tts-1-hd", voice: "nova" },
    stt: { model: "whisper-1" },
  },
});

// ── Recommender Coach ──
const recommenderCoachAgent = new Agent({
  name: "recommender-coach",
  model: openai("gpt-4o"),
  instructions: `You are the Personus Recommender Coach. Help users endorse people
    they trust. Use "tell a friend" framing: "If a neighbor asked should I hire them,
    what would you say?" Extract: service description, skills, distinctive strengths,
    testimonial, endorsement strength, relationship type. Create shadow personas for
    non-Personus people. Offer batch mode for rapid seeding.`,
  tools: [
    createShadowPersonaTool,
    createEndorsementTool,
    searchExistingPersonasTool,
    matchShadowPersonaTool,
    sendClaimInviteTool,
    checkPIITool,
  ],
  voice: {
    provider: "openai",
    tts: { model: "tts-1-hd", voice: "nova" },
    stt: { model: "whisper-1" },
  },
});

// ── Contact Mediation Agent ──
const contactMediationAgent = new Agent({
  name: "contact-mediation",
  model: openai("gpt-4o-mini"),
  instructions: `You triage inbound contact requests. For each request, generate:
    1. A triage note explaining relevance (which openTo fields match, sender context)
    2. A triage score (0-100)
    3. Trust chain if the sender is connected to the target via endorsements
    Be concise and factual.`,
});
```

### 7.3 Coach Tool Definitions

```typescript
const updatePersonaFieldTool = createTool({
  id: "update-persona-field",
  description: "Update a specific field on the persona being built",
  inputSchema: z.object({
    personaUri: z.string(),
    field: z.string(),
    layer: z.enum(["base", "attribute", "context"]),
    value: z.any(),
    groupId: z.string().optional(),
  }),
  execute: async ({ personaUri, field, layer, value, groupId }) => {
    // Update persona or membership depending on layer
    // Recompute embedding
    // Recompute completeness score
    // Return updated completeness
  },
});

const checkPIITool = createTool({
  id: "check-pii",
  description: "Check text for PII (phone, email, address, SSN). Returns boolean + redacted text.",
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => {
    const patterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,        // Phone
      /\b[\w.+-]+@[\w-]+\.[\w.]+\b/,            // Email
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/,            // SSN
      /\b\d{1,5}\s+\w+\s+(St|Ave|Blvd|Dr|Rd|Ln|Ct)\b/i,  // Street address
    ];
    const hasPII = patterns.some(p => p.test(text));
    return { hasPII, detectedTypes: /* list */ };
  },
});

const getGroupSchemaTool = createTool({
  id: "get-group-schema",
  description: "Get the Context Layer field definitions for a group",
  inputSchema: z.object({ groupId: z.string() }),
  execute: async ({ groupId }) => {
    // Return GroupSchema.fields
  },
});

const createShadowPersonaTool = createTool({
  id: "create-shadow-persona",
  description: "Create a shadow persona for someone not on Personus",
  inputSchema: z.object({
    groupId: z.string(),
    createdByPersonaUri: z.string(),
    displayName: z.string(),
    serviceDescription: z.string(),
    skills: z.array(z.string()),
    serviceArea: z.string().optional(),
    distinctiveStrengths: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    // Create shadow persona
    // Generate embedding
    // Generate claim token
    // Return shadow
  },
});

const createEndorsementTool = createTool({
  id: "create-endorsement",
  description: "Create an endorsement for a persona or shadow persona",
  inputSchema: z.object({
    fromPersonaUri: z.string(),
    toPersonaUri: z.string().optional(),
    toShadowPersonaId: z.string().optional(),
    groupId: z.string(),
    relationshipType: z.string(),
    endorsementContext: z.array(z.string()),
    strength: z.enum(["strong", "standard"]),
    testimonial: z.string().optional(),
  }),
  execute: async (input) => {
    // Create endorsement
    // Update endorsement count on target
    // Create ActivityEvent
    // Return endorsement
  },
});
```

---

## 8. UX Entry Points

### 8.1 Entry Point Map

```
UNAUTHENTICATED SURFACES
├── Public Persona Card    personus.ai/:handle
├── Shadow Persona Card    personus.ai/s/:id
├── Shadow Claim Page      personus.ai/claim/:token
├── Group Landing Page     personus.ai/g/:slug
├── OG Link Previews       (generated images for social sharing)

AUTHENTICATED WEB APP (Dashboard)
├── Home                   Cross-persona overview, activity feed
├── Inbox                  Unified contact requests, AI triage
├── Persona Detail/Edit    Full portrait editor, inline edit
├── Persona Coach          Voice-first portrait builder
├── Recommender Coach      Endorsement/shadow creation flow
├── Group Admin            Members, schema builder, analytics
└── Account Settings       Auth, subscription, notification prefs

EMBEDDED SURFACES (Distribution Layer)
├── Slack Bot              @Personus or /personus find [query]
├── Discord Bot            /personus find [query]
├── AI Extension (MCP)     Claude/ChatGPT with Personus tools
├── Email Digest           Weekly group summary
└── OG Cards               Auto-generated for all shareable links

AI AGENT ACCESS
├── MCP Server             personus_search, personus_request_introduction, etc.
├── GraphQL API            Full schema for enterprise/developer
└── REST                   Simple endpoints for integrations
```

### 8.2 Public Persona Card

**URL:** `personus.ai/:handle` or `personus.ai/p/:uri`
**Purpose:** The shareable, linkable representation of a persona.

**Components:**
- Avatar (initial-based, color from persona type)
- Display name + headline
- Group badge
- Skills as tags
- Distinctive strengths
- Values
- Open to (connection types)
- Endorsements (count + top testimonials, respecting visibility)
- Context Layer fields (group-specific)
- Contact CTA → opens ContactRequest form
  - Contact reasons (pre-populated from persona)
  - Contact note (guidance text)
  - Message field
  - Privacy note: "No personal info shared. [Name] decides whether to connect."

**Visibility enforcement:**
- `public` → visible to anyone
- `authenticated` → visible to logged-in users
- `group` → visible only to group members
- `private` → not shown

### 8.3 Shadow Persona / Claim Flow

**URL:** `personus.ai/s/:id` (view) · `personus.ai/claim/:token` (claim)
**Purpose:** Discoverable card for people not yet on Personus. Claim flow converts them.

**Shadow Card:**
- Dashed-border avatar (visual "unclaimed" signal)
- Display name + service description
- Skills, distinctive strengths (from endorser)
- Endorsement(s) with testimonials
- "Contact through endorser" CTA
- "Is this you? Claim your persona →" CTA (if not yet claimed)

**Claim Flow:**
1. Land on claim page → see endorsements and what others said
2. Sign up (Clerk) → account created
3. Persona pre-populated from shadow data (skills, service description, distinctive strengths)
4. All endorsements transfer to new persona
5. Persona Coach offered: "Three neighbors recommended you. Let's build on what they said."
6. Contact settings configured
7. "Who would YOU recommend?" → Recommender Coach (flywheel)

### 8.4 Dashboard Home

**Components:**
- Persona cards (one per persona): avatar, display name, headline, group badge, endorsement count, pending contacts, completeness meter
- Activity feed (merged chronological): endorsements, contacts, views, matches
- Quick actions: Endorse someone, Persona Coach, Share link

### 8.5 Inbox

**Layout:** List + detail panel
**List columns:** Sender initials, reason, message preview, timestamp, group tag, status badge
**Detail panel:**
- Full request details
- **Contact Assistant Note** (AI triage): "Matches your openTo for 'beekeeping mentoring'. Sender is a 2-year Sunnyside member with 3 endorsements."
- Approve / Decline buttons
- If approved → channel revelation with privacy implications

### 8.6 Persona Coach Flow

**Layout:** Split-screen — conversation left, live persona preview right
**Input:** Voice primary (mic button), text fallback
**Conversation arc (7 turns, ~5 min, ~84% completeness):**

| Turn | Question Intent | Target Field | Layer |
|------|----------------|--------------|-------|
| 1 | Welcome + framing | — | — |
| 2 | "Describe you in one sentence" | headline | Base |
| 3 | "What do people come to you for?" | skills | Attribute |
| 4 | "Good at but wouldn't put on a resume?" | distinctiveStrengths | Attribute |
| 5 | "What matters to you?" | values | Attribute |
| 6 | "What are you open to?" | openTo | Attribute |
| 7 | Group-specific questions | Context fields | Context |
| 8 | "What are you excited about?" | currentFocus | Attribute |
| 9 | Wrap-up + next actions | — | — |

**Live preview:** Miniature persona card builds incrementally. "NEW" badges on new sections. Completeness meter climbing. "How conversation maps to data" legend.

**PII guardrail:** Real-time detection. Coach does NOT echo PII. Redirects to contact settings. "🛡️ PII blocked" visual badge.

**Re-entry:** "Talk to Coach about my strengths" → opens with previous context loaded.

### 8.7 Recommender Coach Flow

**Layout:** Split-screen — conversation left, dual preview right (shadow persona + endorsement)
**Conversation arc (7 turns, ~3 min):**

| Turn | Question Intent | Creates |
|------|----------------|---------|
| 1 | "On Personus or not?" | Route: shadow vs. existing |
| 2 | "Name, what they do" | Shadow: name, description, skills |
| 3 | "What specifically have they done?" | Shadow: skills enriched |
| 4 | "If a neighbor asked 'should I hire them?'" | Endorsement: testimonial |
| 5 | "Strong recommendation or solid?" | Endorsement: strength, relationship |
| 6 | "What makes them different?" | Shadow: distinctiveStrengths |
| 7 | "Send invite or share link?" | Claim status update |
| 8 | "Recommend someone else?" | Flywheel prompt |

**Batch mode:** "Recommend 5 people" — lighter flow (name + service + one-liner).

**Shadow merge:** If multiple people recommend the same person (3 neighbors say "Marco the plumber"), system matches on serviceDescription + serviceArea within group. Asks endorser to confirm. Merges endorsements.

### 8.8 Group Admin

**Four tabs:**
1. **Overview:** Stats, top skills, endorsement feed
2. **Members:** Searchable list, role management
3. **Schema Builder:** Context Layer field definitions — drag-to-reorder, add/edit fields, preview
4. **Analytics:** Queries/month, introductions, most-queried skills bar chart, **skill gaps** ("People searched for locksmith but found 0 results")

### 8.9 AI Extension (Claude/ChatGPT)

Two modes, same MCP tools:

**Mode 1 — Explicit Discovery:** User asks "I need a plumber for old pipes." Extension calls `personus_search`, returns inline results with trust-backed endorsements, match explanation, and "Request introduction" action.

**Mode 2 — Ambient Network Query:** User is working on a task ("help me plan a block party"). AI detects implicit need for people (honey for tasting table, someone who knows permits). Extension surfaces matches without breaking flow.

**Extension side panel:** Shows connected groups, conversation activity (searches, matches, intros sent), privacy controls.

**Contact flow in-chat:** AI drafts introduction message from conversation context. User confirms. ContactRequest created.

---

## 9. Privacy & Access Control

### 9.1 No-PII Contract

PII detection runs on all text fields at write time — personas, endorsements, shadow personas, contact messages. Patterns caught: phone numbers, email addresses, street addresses (with house numbers), SSNs.

PII in coach transcripts: detected and blocked in real-time. Coach never echoes PII. "🛡️ PII blocked" shown to user.

**What's NOT PII:** Block/street name (without house number), first name/pseudonym, metro area, job title, employer name.

### 9.2 Visibility Model

Four levels, applied at persona level with per-attribute overrides:

| Level | Who can see |
|-------|------------|
| `public` | Anyone, including unauthenticated |
| `authenticated` | Logged-in Personus users |
| `group` | Members of the persona's group(s) only |
| `private` | Only the persona owner |

### 9.3 Contact Mediation

```
Request arrives → Contact Mediation Agent generates triage note →
Notification to persona owner → Owner reviews with AI context →
Approve (choose channel) or Decline → If approved, channel revealed with privacy implications
```

For shadow personas: requester contacts endorser → endorser mediates introduction outside Personus → includes claim link.

### 9.4 Cross-Persona Unlinkability

The system NEVER cross-links personas of the same user without explicit opt-in. Different personas in different groups are independent identities. No API endpoint returns multiple personas for one user. No search result reveals persona co-ownership.

### 9.5 Endorsement Privacy

- Asymmetric consent: endorsers create unilaterally. Endorsed can see + request removal.
- No browsable endorsement lists — endorsements surface only in query responses.
- Group-scoped by default. Owner can promote to persona-wide.
- Shadow persona PII detection + 90-day auto-expiry if unclaimed.

### 9.6 Agent Trust Levels

| Level | Auth | Rate Limit | Access |
|-------|------|-----------|--------|
| anonymous | None | 10/min | Public personas only |
| registered | API key | 100/min | Public + authenticated |
| verified | DID + VC (Phase 3) | 500/min | Full access per group |
| trusted | Trusted Agent Protocol | 1000/min | Priority ranking |

---

## 10. Embedded Surfaces

### 10.1 Slack Bot

**Trigger:** `@Personus who's a good plumber?` or `/personus find plumber`
**Response:** Block Kit message with attachment sidebar color, persona card, endorsement, match explanation, "Request introduction" button, privacy footer.
**Platform limits:** 50 blocks, 3000 chars/block, buttons via action URLs.

### 10.2 Discord Bot

**Trigger:** `/personus find plumber`
**Response:** Rich embed with color sidebar, title, description, 2-column fields, Action Row buttons.
**Platform limits:** 256 char title, 4096 char description, 25 fields, 5 buttons/row.

### 10.3 OG Link Previews

Three card types, server-rendered (Next.js `generateImageMetadata`):
- **Full persona:** Avatar + name + headline + endorsement count
- **Shadow persona:** Dashed avatar + "Someone recommended you!"
- **Group invite:** Icon + name + member count + endorsement count

### 10.4 Email Digest

Weekly group digest: new endorsements, skill gaps, new members. HTML email (table layout, 600px, inline styles). Every email has growth CTA ("Recommend someone →").

### 10.5 contextualSummary Pipeline

Every MCP/API query result includes a `contextualSummary` — agent-generated narrative explaining why this persona matches. Generated by Value Conveyance Agent (gpt-4o-mini, <500ms). Cached by (queryHash, personaUri) with 1-hour TTL.

The same persona produces different summaries for different queries:
- "plumber for old pipes" → emphasizes Victorian plumbing expertise
- "someone reliable for home repairs" → emphasizes reliability, fair pricing

---

## 11. MVP Scope & Implementation Plan

### Phase 1 — Core Platform (8-10 weeks)

**Auth:** Clerk (email/passkey/OAuth)

**Database:** Neon Postgres + pgvector. All 11 entity tables. RLS for multi-tenancy.

**Core CRUD:**
- Users (Clerk webhook)
- Groups (create, join, admin)
- Personas (create, edit, delete, multi-persona per user)
- PersonaGroupMembership (join group, edit context data)
- Endorsements (create, deactivate, promote)
- ShadowPersonas (create, claim flow, auto-expiry)
- ContactRequests (create, triage, respond)
- ActivityEvents (write on all state changes)

**Search:**
- pgvector embedding generation on persona/shadow write
- NLP Gateway (simplified — single Mastra agent: NL → structured query → pgvector + attribute filters → ranked results)
- Trust-weighted scoring
- contextualSummary generation (Value Conveyance Agent)

**Persona Coach:**
- Text mode first (voice in Phase 1.5)
- Split-screen UX: conversation + live preview
- Conversation arc (7 turns)
- PII guardrail
- Completeness scoring
- CoachSession logging

**Recommender Coach:**
- Text mode first
- Shadow persona + endorsement creation
- Testimonial extraction ("tell a friend" framing)
- Batch mode (recommend 5 people)
- RecommenderSession logging

**Dashboard:**
- Home (persona cards, activity feed)
- Persona detail/edit (inline edit)
- Inbox (contact requests + AI triage notes)
- Group admin (members, schema builder, basic analytics)

**Public surfaces:**
- Persona card page
- Shadow persona card page
- Claim flow page
- Group landing page

**API:**
- GraphQL (Pothos) — full schema
- MCP server (Mastra built-in) — personus_search, personus_request_introduction
- REST endpoints for simple integrations
- OG image generation (Next.js)

**Contact:**
- Email relay adapter (MVP)
- In-app notification (MVP)
- Contact mediation workflow (AI triage → approve/decline → channel reveal)

**Deploy:** Vercel + Neon. Environment: staging + production.

### Phase 1.5 — Voice + Viral (4-6 weeks)

- Voice-enabled Persona Coach (Mastra STS pipeline, WebSocket)
- Voice-enabled Recommender Coach
- Enhanced claim flow (Persona Coach pre-loaded with shadow data)
- Email digest (weekly, per group)
- Shadow merge detection (multiple endorsers → same person)
- Mobile-responsive voice UX

### Phase 2 — Distribution (8-10 weeks)

- Slack bot (Block Kit, action payloads)
- Discord bot (rich embeds, Action Rows)
- AI Extension MCP tools (explicit + ambient mode)
- Signal contact adapter
- Full Mastra Agent Network (multi-agent NLP Gateway)
- 2-hop trust graph traversal
- Group analytics (queries, skill gaps, activation)
- Bulk persona import (CSV)

### Phase 3 — Identity + Federation (10-12 weeks)

- DIDs (`did:web`)
- Verifiable Credentials for endorsements
- A2A endpoint (Agent Card)
- ActivityPub federation
- Cross-group referral queries
- Personus Query Language (PQL) DSL

---

## Appendix A: Prototype Inventory {#appendix-a}

All prototypes in `/mnt/user-data/outputs/`:

| File | Surface | Version | Key Insight |
|------|---------|---------|-------------|
| `personus_public_surfaces.jsx` | Persona Card, Claim Flow, Group Landing | v3.1 | Three conversion surfaces |
| `personus_context_personas.jsx` | Same person, three group contexts | v3.1 | Context Layer proof |
| `personus_universal_cards.jsx` | Four diverse non-tech personas | v3.1 | Universal card structure |
| `personus_dual_persona.jsx` | Nadia — neighbor vs. employer | v3.2 | Privacy boundary visualization |
| `personus_dashboard.jsx` | Full authenticated dashboard | v3.3 | Home, inbox, persona edit, group admin |
| `personus_persona_coach.jsx` | Persona Coach conversational flow | v3.4 | Voice-first portrait builder |
| `personus_recommender_coach.jsx` | Recommender Coach flow | v3.5 | "Tell a friend" endorsement creation |
| `personus_embedded_surfaces.jsx` | Slack, Discord, MCP, OG, Email | v3.6 | Distribution layer rendering |
| `personus_extension_ux.jsx` | AI Extension (Claude/ChatGPT) | v3.7 | Explicit + ambient discovery |

---

## Appendix B: Design Tokens {#appendix-b}

```typescript
// Colors
const tokens = {
  bg: "#0d1117",
  bgCard: "#161b22",
  bgElevated: "#1c2129",
  text: "#e6edf3",
  textMuted: "#8b949e",
  textDim: "#484f58",
  accent: "#e8a838",           // Personus gold
  accentSoft: "rgba(232,168,56,0.10)",
  green: "#4ade80",            // Endorsements, trust
  purple: "#818cf8",           // Shadow personas
  blue: "#60a5fa",             // Info, links
  teal: "#2dd4bf",             // Success states
  orange: "#fb923c",           // Warnings, skill gaps
  border: "rgba(255,255,255,0.06)",
};

// Typography
const fonts = {
  display: "'Fraunces', Georgia, serif",       // Headlines, persona names
  body: "'Outfit', -apple-system, sans-serif", // Body text, UI
  mono: "'JetBrains Mono', monospace",         // Code, technical
};

// Persona type colors
const personaColors = {
  full: tokens.green,           // Claimed personas
  shadow: tokens.purple,        // Unclaimed shadow personas
  endorsement: tokens.green,    // Endorsement cards
  group: tokens.blue,           // Group badges
};
```

---

## Implementation Notes for Claude Code

### File Structure (Recommended)

```
personus/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                  # Authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── personas/[uri]/
│   │   │   ├── inbox/
│   │   │   ├── groups/[slug]/
│   │   │   ├── coach/
│   │   │   └── recommend/
│   │   ├── (public)/                # Public routes
│   │   │   ├── [handle]/            # Public persona card
│   │   │   ├── s/[id]/             # Shadow persona card
│   │   │   ├── claim/[token]/      # Claim flow
│   │   │   └── g/[slug]/           # Group landing
│   │   ├── api/
│   │   │   ├── graphql/
│   │   │   ├── search/
│   │   │   ├── contact/
│   │   │   ├── og/
│   │   │   └── webhooks/           # Clerk, Slack, Discord
│   │   └── layout.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle ORM schema
│   │   │   ├── migrations/
│   │   │   └── queries/            # Common query patterns
│   │   ├── mastra/
│   │   │   ├── agents/             # All agent definitions
│   │   │   ├── tools/              # All tool definitions
│   │   │   └── index.ts            # Mastra instance
│   │   ├── embeddings.ts           # OpenAI embedding generation
│   │   ├── completeness.ts         # Score computation
│   │   ├── pii.ts                  # PII detection
│   │   └── auth.ts                 # Clerk helpers
│   │
│   ├── components/
│   │   ├── persona/                # Persona card, edit, preview
│   │   ├── endorsement/            # Endorsement display, creation
│   │   ├── coach/                  # Coach UI components
│   │   ├── dashboard/              # Dashboard components
│   │   ├── group/                  # Group admin components
│   │   └── ui/                     # Shared UI (shadcn/ui)
│   │
│   └── graphql/
│       ├── schema.ts               # Pothos schema
│       ├── types/                   # GraphQL type definitions
│       └── resolvers/              # Resolver implementations
│
├── drizzle.config.ts
├── mastra.config.ts
└── package.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "@clerk/nextjs": "latest",
    "@mastra/core": "latest",
    "@ai-sdk/openai": "latest",
    "drizzle-orm": "latest",
    "@neondatabase/serverless": "latest",
    "pothos": "latest",
    "@pothos/plugin-drizzle": "latest",
    "zod": "latest",
    "nanoid": "latest",
    "openai": "latest"
  }
}
```

### Database Setup (Neon)

```bash
# Create database
neon database create personus

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Run migrations
npx drizzle-kit push
```

### Environment Variables

```env
DATABASE_URL=              # Neon connection string
CLERK_SECRET_KEY=          # Clerk auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
OPENAI_API_KEY=            # For embeddings + agents
MASTRA_LOG_LEVEL=info
```

### Testing Strategy

1. **Unit tests:** Completeness algorithm, PII detection, embedding text generation, trust-weighted scoring
2. **Integration tests:** Persona CRUD → embedding generation → search returns results. Endorsement creation → shadow persona → claim flow → endorsements transfer. ContactRequest → triage → approve → channel reveal.
3. **E2E tests:** Full coach conversation → persona created → searchable. Recommender conversation → shadow created → claim flow → persona live. Slack/Discord query → result returned.
4. **Seed data:** 50 synthetic personas across 3 groups (neighborhood, employer, professional community), 100 endorsements, 15 shadow personas. Use this for development and demos.

---

*End of Personus Master Specification v4.0*
*Consolidates: v3.0, v3.1, v3.2, v3.3, v3.4, v3.5, v3.6, v3.7*
*9 prototypes referenced, 11 entities defined, implementation-ready for Claude Code*
