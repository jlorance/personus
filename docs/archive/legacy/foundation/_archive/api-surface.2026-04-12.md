---
type: foundation
title: Personus.ai — API Surface
description: "Version: 5.0 Date: 2026-02-08 Depends on: Doc 2 (Data Model & Entities) Depended on by: Doc 4 (Agent Architecture), Doc 5 (Implementation) Status: Design phase"
status: superseded
tags: [archived]
timestamp: 2026-02-08
---

# Personus.ai — API Surface

**Version:** 5.0  
**Date:** 2026-02-08  
**Depends on:** Doc 2 (Data Model & Entities)  
**Depended on by:** Doc 4 (Agent Architecture), Doc 5 (Implementation)  
**Status:** Design phase

---

## Table of Contents

1. [GraphQL Schema](#graphql-schema)
2. [MCP Tools](#mcp-tools)
3. [REST Endpoints](#rest-endpoints)

---

## GraphQL Schema {#graphql-schema}

Built with Pothos GraphQL. Full type-safe schema generated from TypeScript interfaces in Doc 2.

### Queries

```graphql
type Query {
  # Auth & user
  me: User!

  # Personas
  myPersonas: [Persona!]!
  persona(uri: String!): Persona
  searchPersonas(input: SearchPersonasInput!): SearchResult!

  # Communities
  community(id: ID, slug: String): Community
  myCommunities: [CommunityMember!]!
  communityMembers(communityId: ID!, search: String, limit: Int, offset: Int): [CommunityMember!]!
  communityAnalytics(communityId: ID!, period: String!): CommunityAnalyticsSummary

  # Endorsements
  endorsementsOfPersona(personaUri: String!, visibility: String): [Endorsement!]!
  myEndorsements(personaUri: String): [Endorsement!]!

  # Affiliations
  affiliationsOfPersona(personaUri: String!): PersonaAffiliationResult!

  # Contact
  myContactRequests(personaUri: String, status: String): [ContactRequest!]!

  # Activity
  activityFeed(limit: Int, offset: Int): [ActivityEvent!]!

  # Shadow
  shadowPersona(id: ID!): ShadowPersona
  shadowPersonaByClaimToken(token: String!): ShadowPersona

  # Delegation
  myDelegations: [PersonaDelegation!]!
  personasDelegatedToMe: [DelegatedPersonaAccess!]!

  # Verification
  verificationStatus(personaUri: String!): OrganizationVerification
}
```

### Mutations

```graphql
type Mutation {
  # Persona CRUD
  createPersona(input: CreatePersonaInput!): Persona!
  updatePersona(uri: String!, input: UpdatePersonaInput!): Persona!
  deletePersona(uri: String!): Boolean!

  # Community
  createCommunity(input: CreateCommunityInput!): Community!
  updateCommunity(id: ID!, input: UpdateCommunityInput!): Community!
  updateCommunitySchema(id: ID!, schema: CommunitySchemaInput!): Community!
  joinCommunity(communityId: ID!, personaUri: String!): CommunityMember!

  # Context data
  updateMemberTraits(personaUri: String!, communityId: ID!, data: JSON!): CommunityMember!

  # Endorsements
  createEndorsement(input: CreateEndorsementInput!): Endorsement!
  deactivateEndorsement(id: ID!): Endorsement!

  # Shadow personas
  createShadowPersona(input: CreateShadowPersonaInput!): ShadowPersona!
  enrichShadowPersona(id: ID!, input: EnrichShadowInput!): ShadowPersona!
  claimShadowPersona(token: String!): Persona!
  inviteClaimShadowPersona(id: ID!, via: String!): ShadowPersona!

  # Affiliations
  createAffiliation(input: CreateAffiliationInput!): PersonaAffiliation!
  updateAffiliation(id: ID!, input: UpdateAffiliationInput!): PersonaAffiliation!
  deleteAffiliation(id: ID!): Boolean!

  # Org relationships
  createOrgRelationship(input: CreateOrgRelationshipInput!): OrganizationRelationship!

  # Delegations
  createDelegation(input: CreateDelegationInput!): PersonaDelegation!
  updateDelegation(id: ID!, input: UpdateDelegationInput!): PersonaDelegation!
  revokeDelegation(id: ID!): Boolean!

  # Contact
  requestContact(input: RequestContactInput!): ContactRequest!
  respondToContact(id: ID!, status: String!, note: String): ContactRequest!

  # Coach sessions
  startCoachSession(input: StartCoachInput!): CoachSession!
  addCoachMessage(sessionId: ID!, message: CoachMessageInput!): CoachSession!
  completeCoachSession(sessionId: ID!): CoachSession!

  # Recommender sessions
  startRecommenderSession(input: StartRecommenderInput!): RecommenderSession!

  # Verification
  requestVerification(personaUri: String!, method: String!): OrganizationVerification!
  submitVerificationEvidence(personaUri: String!, evidence: JSON!): OrganizationVerification!
}
```

### Subscriptions

```graphql
type Subscription {
  onContactRequest(personaUri: String!): ContactRequest!
  onEndorsementReceived(personaUri: String!): Endorsement!
  onDelegationGranted(userId: ID!): PersonaDelegation!
}
```

### Key Input Types

```graphql
input SearchPersonasInput {
  query: String!
  entityType: String # "person" | "organization" | null (both)
  communityIds: [ID!]
  location: LocationInput
  maxDistance: Float # Miles from location
  scope: String # "global" | "my-network" | "community"
  limit: Int
}

input CreatePersonaInput {
  entityType: String! # "person" | "organization"
  displayName: String!
  headline: String!
  location: LocationInput
  serviceArea: ServiceAreaInput
  skills: [SkillInput!]
  organizationMetadata: OrganizationMetadataInput
  # ... other base + attribute fields
}

input CreateShadowPersonaInput {
  entityType: String!
  serviceCategory: String
  quickEndorsement: String!
  discoveryNote: String
}

input CreateDelegationInput {
  personaUri: String!
  delegatedToUserId: ID!
  permissions: [String!]!
  scope: DelegationScopeInput
  expiresAt: String
}
```

### Return Types

```graphql
type PersonaAffiliationResult {
  personAffiliations: [PersonaAffiliation!]! # If person: orgs they're affiliated with
  orgAffiliations: [PersonaAffiliation!]! # If org: people affiliated with it
  orgRelationships: [OrganizationRelationship!]! # If org: relationships with other orgs
}

type DelegatedPersonaAccess {
  persona: Persona!
  delegation: PersonaDelegation!
  ownerUser: User!
}

type SearchResult {
  results: [PersonaResult!]!
  queryMeta: SearchQueryMeta!
}

type PersonaResult {
  persona: Persona
  shadow: ShadowPersona
  matchScore: Float!
  matchExplanation: MatchExplanation!
  endorsements: [Endorsement!]!
  affiliations: [PersonaAffiliation!]
  contextualSummary: String! # AI-generated per-query summary
}
```

---

## MCP Tools {#mcp-tools}

Exposed via Mastra's built-in MCP server. AI agents call these.

### Tool 1: Search Personas

```typescript
const personusSearch = {
  name: 'personus_search',
  description: `Search Personus for people or organizations matching a query.
    Returns personas (both person and organization types) with endorsements,
    trust signals, affiliations, and mediated contact options.
    Use when user needs someone/something OR when you detect implicit needs.`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language: who/what they need',
      },
      entityType: {
        type: 'string',
        enum: ['person', 'organization', 'any'],
        description: 'Filter by person/org/both (default: any)',
      },
      communityIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Limit to specific communities (optional)',
      },
      scope: {
        type: 'string',
        enum: ['global', 'my-network', 'community'],
        description: 'Search scope (default: global)',
      },
      context: {
        type: 'string',
        description: 'Conversation context for better summaries',
      },
      maxResults: {
        type: 'number',
        description: 'Max results (default 3)',
      },
    },
    required: ['query'],
  },
};
```

### Tool 2: Request Introduction

```typescript
const personusContact = {
  name: 'personus_request_introduction',
  description: `Send mediated introduction request to a persona (person or org).
    Recipient decides whether to connect.`,
  inputSchema: {
    type: 'object',
    properties: {
      targetPersonaUri: { type: 'string' },
      reason: { type: 'string' },
      message: { type: 'string' },
      communityId: { type: 'string', description: 'Optional community context' },
    },
    required: ['targetPersonaUri', 'reason', 'message'],
  },
};
```

### Tool 3: Get Persona Details

```typescript
const personusGetPersona = {
  name: 'personus_get_persona',
  description: 'Get full details of a specific persona (person or org) by URI.',
  inputSchema: {
    type: 'object',
    properties: {
      personaUri: { type: 'string' },
      communityId: {
        type: 'string',
        description: 'Community context for context fields (optional)',
      },
    },
    required: ['personaUri'],
  },
};
```

### Tool 4: List Communities

```typescript
const personusListCommunities = {
  name: 'personus_list_communities',
  description: "List the user's connected Personus communities.",
  inputSchema: { type: 'object', properties: {} },
};
```

### Tool 5: Get Affiliations

```typescript
const personusGetAffiliations = {
  name: 'personus_get_affiliations',
  description: `Get affiliations for a persona. 
    If person: returns orgs they work for/with.
    If org: returns people affiliated + other org relationships.`,
  inputSchema: {
    type: 'object',
    properties: {
      personaUri: { type: 'string' },
    },
    required: ['personaUri'],
  },
};
```

### Tool 6: `personus_get_commerce_persona`

Returns commerce/buyer preference traits for a persona, filtered by privacy tier. Designed for AI shopping agents that need to understand user preferences when making purchasing decisions.

**Input:**
```json
{
  "personaUri": "string (required) — Persona URI",
  "includeSensitive": "boolean (optional, default false) — Include sensitive traits (dietary, allergens). Requires explicit user consent."
}
```

**Output:**
```json
{
  "persona": {
    "uri": "maria-garcia",
    "displayName": "Maria Garcia",
    "commerceTraits": {
      "commerceLocale": { "language": "en-US", "country": "US", "currency": "USD" },
      "clothingSizes": { "tops": "M", "bottoms": "8", "sizeSystem": "US" },
      "shoeSize": "8 US",
      "fitPreference": "regular",
      "favoriteBrands": ["Patagonia", "Everlane", "Allbirds"],
      "styleTags": ["minimalist", "casual"],
      "sustainabilityPriority": "prefer",
      "requiredCertifications": ["B Corp", "Fair Trade"]
    },
    "sensitiveIncluded": false,
    "privacyNote": "Agent-local traits (budget, blocklists, authorization) are never shared. Sensitive traits excluded — set includeSensitive=true with user consent."
  }
}
```

**Privacy enforcement:**
- **Agent-local traits** (`budgetPreferences`, `blockedBrands`, `agentAuthorization`, `returnPreferences`) are NEVER returned, regardless of settings
- **Sensitive traits** (`dietaryRestrictions`, `allergens`, `householdDietary`, `paymentMethodTokens`) only returned when `includeSensitive: true`
- All other commerce traits respect the persona's `mcpTraitVisibility` settings (default: opt-in)

**Errors:**
- Returns `{ "error": "Persona not found" }` if persona doesn't exist or has MCP disabled
- Returns `{ "error": "User has disabled MCP sharing" }` if user has opted out of MCP

### MCP Search Result Shape

```typescript
interface PersonusSearchResponse {
  results: PersonaResult[];
  queryMeta: {
    entityTypeFilter?: 'person' | 'organization';
    community?: string;
    matchedTerms: string[];
    totalResults: number;
    privacyNote: string;
    searchMode: 'explicit' | 'ambient';
  };
}

interface PersonaResult {
  personaType: 'full' | 'shadow';
  entityType: 'person' | 'organization';

  // Persona data
  personaUri?: string;
  shadowPersonaId?: string;
  displayName: string;
  headline?: string;
  serviceDescription?: string;
  location?: Location;
  skills: string[];
  distinctiveStrengths?: string[];
  values?: string[];
  openTo?: string[];

  // Organization-specific
  organizationMetadata?: {
    type?: string;
    certifications?: string[];
    verificationStatus?: string;
    size?: string;
  };

  // Affiliations (if relevant)
  affiliations?: {
    employedAt?: string[]; // Org names (if person)
    staff?: string[]; // Person names (if org)
    parentOrg?: string; // Parent org (if chapter)
  };

  // Endorsements & trust
  endorsements: EndorsementSummary[];
  contactMethod: 'mediated' | 'through-endorser' | 'direct';

  // AI-generated per-query
  contextualSummary: string;

  matchExplanation: {
    matchedTerms: string[];
    matchedFields: string[];
    relevanceScore: number;
    trustScore: number;
  };

  actions: {
    requestIntroduction?: string;
    viewFullPersona: string;
  };
}

interface EndorsementSummary {
  from: string; // Display name
  relationship: string;
  strength: 'strong' | 'standard';
  context: string[];
  testimonial?: string;
}
```

---

## REST Endpoints {#rest-endpoints}

Simple HTTP endpoints for integrations that don't need GraphQL.

### Personas

```
GET    /api/personas/:uri
GET    /api/personas/:uri/affiliations
GET    /api/personas/:uri/endorsements
```

### Communities

```
GET    /api/communities/:slug
GET    /api/communities/:slug/members
```

### Search

```
POST   /api/search
Body: { query, entityType?, communityIds?, scope?, maxResults? }
```

### Contact

```
POST   /api/contact/request
Body: { targetPersonaUri, reason, message, communityId? }
```

### Shadow

```
GET    /api/shadow/:id
POST   /api/shadow/:token/claim
```

### Verification

```
POST   /api/verify/request
POST   /api/verify/submit
```

### OG Image Generation

```
GET    /api/og/:personaUri           # Person or org persona
GET    /api/og/shadow/:id            # Shadow persona
GET    /api/og/community/:slug       # Community landing
```

**Returns:** PNG image (1200x630) for OpenGraph/Twitter cards

---

_End of API Surface Document_
