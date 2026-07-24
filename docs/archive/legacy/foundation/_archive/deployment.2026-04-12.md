---
type: foundation
title: "Personus.ai — Implementation & Deployment"
description: "Version: 5.0 Date: 2026-02-08 Depends on: All other documents Status: Planning phase"
status: superseded
tags: [archived]
timestamp: 2026-02-08
---

# Personus.ai — Implementation & Deployment

**Version:** 5.0  
**Date:** 2026-02-08  
**Depends on:** All other documents  
**Status:** Planning phase

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Key Dependencies](#key-dependencies)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [MVP Implementation Phases](#mvp-implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)
9. [Design Tokens](#design-tokens)

---

## Tech Stack {#tech-stack}

**Frontend:**

- Next.js 15 (App Router)
- React 19
- TypeScript 5.3+
- Tailwind CSS
- shadcn/ui components

**Backend:**

- Next.js API Routes (App Router)
- Drizzle ORM
- Pothos GraphQL
- Mastra.ai (agent framework)

**Database:**

- Neon Postgres (serverless)
- pgvector extension

**Auth:**

- Clerk

**AI/ML:**

- OpenAI GPT-4o (agents)
- OpenAI text-embedding-3-small (embeddings)
- Mastra STS pipeline (voice)

**Deployment:**

- Vercel (hosting + edge functions)
- Neon (database)

---

## Project Structure {#project-structure}

```
personus/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                  # Authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── personas/[uri]/
│   │   │   ├── inbox/
│   │   │   ├── communities/[slug]/
│   │   │   ├── coach/
│   │   │   └── recommend/
│   │   ├── (public)/                # Public routes
│   │   │   ├── [handle]/            # Public persona card
│   │   │   ├── s/[id]/             # Shadow persona card
│   │   │   ├── claim/[token]/      # Claim flow
│   │   │   └── g/[slug]/           # Community landing
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
│   │   │   ├── schema.ts           # Drizzle schema (from Doc 2)
│   │   │   ├── migrations/
│   │   │   └── queries/            # Common query patterns
│   │   ├── mastra/
│   │   │   ├── agents/             # All agent definitions (from Doc 4)
│   │   │   ├── tools/              # All tool definitions
│   │   │   └── index.ts            # Mastra instance
│   │   ├── embeddings.ts           # OpenAI embedding generation
│   │   ├── completeness.ts         # Score computation (from Doc 2)
│   │   ├── pii.ts                  # PII detection
│   │   └── auth.ts                 # Clerk helpers
│   │
│   ├── components/
│   │   ├── persona/                # Persona card, edit, preview
│   │   ├── endorsement/            # Endorsement display, creation
│   │   ├── coach/                  # Coach UI components
│   │   ├── dashboard/              # Dashboard components
│   │   ├── community/              # Community admin components
│   │   └── ui/                     # Shared UI (shadcn/ui)
│   │
│   └── graphql/
│       ├── schema.ts               # Pothos schema (from Doc 3)
│       ├── types/                   # GraphQL type definitions
│       └── resolvers/              # Resolver implementations
│
├── drizzle.config.ts
├── mastra.config.ts
├── package.json
└── .env.local
```

---

## Key Dependencies {#key-dependencies}

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@clerk/nextjs": "^5.0.0",

    "@mastra/core": "latest",
    "@ai-sdk/openai": "latest",

    "drizzle-orm": "latest",
    "@neondatabase/serverless": "latest",
    "drizzle-kit": "latest",

    "@pothos/core": "latest",
    "@pothos/plugin-drizzle": "latest",
    "graphql": "^16.8.0",
    "graphql-yoga": "^5.0.0",

    "zod": "^3.22.0",
    "nanoid": "^5.0.0",
    "openai": "^4.28.0",

    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.3.0",
    "vitest": "latest",
    "@testing-library/react": "latest"
  }
}
```

---

## Environment Setup {#environment-setup}

### `.env.local`

```bash
# Database
DATABASE_URL=                          # Neon connection string

# Auth
CLERK_SECRET_KEY=                      # Clerk backend key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=     # Clerk frontend key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# AI
OPENAI_API_KEY=                        # For embeddings + agents

# Mastra
MASTRA_LOG_LEVEL=info

# App
NEXT_PUBLIC_APP_URL=https://personus.ai
```

---

## Database Setup {#database-setup}

### 1. Create Neon Database

```bash
# Via Neon CLI or dashboard
neon database create personus
```

### 2. Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Drizzle Schema Definition

**`src/lib/db/schema.ts`** - Translates TypeScript interfaces from Doc 2 into Drizzle schema:

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  vector,
} from 'drizzle-orm/pg-core';

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  defaultLocation: jsonb('default_location'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Personas (unified: person + organization)
export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  uri: text('uri').notNull().unique(),
  entityType: text('entity_type').notNull().default('person'), // 'person' | 'organization'
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Base Layer
  displayName: text('display_name').notNull(),
  initial: text('initial'),
  headline: text('headline').notNull().default(''),
  location: jsonb('location'),
  serviceArea: jsonb('service_area'),
  availability: jsonb('availability'),
  visibility: text('visibility').notNull().default('public'),
  contactPolicy: text('contact_policy').notNull().default('mediated'),
  contactChannels: jsonb('contact_channels').default([]),
  contactNote: text('contact_note'),
  contactReasons: jsonb('contact_reasons').default([]),
  personaLifespan: text('persona_lifespan').notNull().default('permanent'),
  lifespanExpiresAt: timestamp('lifespan_expires_at'),
  endorsementPolicy: text('endorsement_policy').notNull().default('accept-all'),
  completenessScore: integer('completeness_score').default(0),

  // Attribute Layer
  skills: jsonb('skills').default([]),
  openTo: jsonb('open_to').default([]),
  workStyle: jsonb('work_style').default([]),
  values: jsonb('values').default([]),
  distinctiveStrengths: jsonb('distinctive_strengths').default([]),
  currentFocus: jsonb('current_focus').default([]),
  interests: jsonb('interests').default([]),
  languages: jsonb('languages').default([]),
  experience: jsonb('experience').default([]),

  // Type-specific metadata
  organizationMetadata: jsonb('organization_metadata'),
  personMetadata: jsonb('person_metadata'),

  // Search
  embedding: vector('embedding', { dimensions: 1536 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ... Continue for all entities from Doc 2
```

### 4. Run Migrations

```bash
# Generate migration from schema
npx drizzle-kit generate:pg

# Push to database
npx drizzle-kit push:pg
```

---

## MVP Implementation Phases {#mvp-implementation-phases}

### Phase 1: Core Platform (10-12 weeks)

**Week 1-2: Foundation**

- [ ] Project setup (Next.js 15, TypeScript, Tailwind)
- [ ] Clerk auth integration
- [ ] Drizzle schema from Doc 2 (all 13 entities)
- [ ] Database migrations
- [ ] Basic UI components (shadcn/ui)

**Week 3-4: Persona CRUD**

- [ ] User model + Clerk webhook
- [ ] Persona create/read/update/delete
- [ ] Entity type switching (person/org)
- [ ] Completeness scoring (from Doc 2)
- [ ] Location & service area models

**Week 5-6: Endorsements & Shadows**

- [ ] Endorsement creation (general, not group-scoped)
- [ ] Shadow persona creation (lightweight)
- [ ] AI extraction from quick endorsement
- [ ] Claim flow (shadow → full persona)
- [ ] Endorsement transfer on claim

**Week 7-8: Search & Discovery**

- [ ] OpenAI embedding generation
- [ ] pgvector similarity search
- [ ] Trust-weighted scoring (from Doc 2)
- [ ] Entity type filtering (person/org)
- [ ] Location-based filtering

**Week 9-10: Communities & Context Layer**

- [ ] Community CRUD
- [ ] Community schema builder
- [ ] CommunityMember join
- [ ] Context data validation (Zod)
- [ ] Community-backed org personas

**Week 11-12: Contact & Activities**

- [ ] ContactRequest creation
- [ ] Contact Mediation Agent (AI triage)
- [ ] ActivityEvent logging
- [ ] Delegations (create/revoke)
- [ ] Organization verification (basic tier)

### Phase 1.5: Voice + Viral (4-6 weeks)

- [ ] Mastra STS pipeline integration
- [ ] Persona Coach voice mode
- [ ] Recommender Coach voice mode
- [ ] WebSocket voice streaming
- [ ] Mobile-responsive voice UI

### Phase 2: Distribution (8-10 weeks)

- [ ] Slack bot (Block Kit)
- [ ] Discord bot (embeds)
- [ ] MCP server (Mastra)
- [ ] AI Extension tools
- [ ] Email digests

### Phase 3: Identity + Federation (10-12 weeks)

- [ ] DIDs (did:web)
- [ ] Verifiable Credentials
- [ ] Multi-factor org verification
- [ ] ActivityPub federation

---

## Testing Strategy {#testing-strategy}

### Unit Tests

**Vitest + Testing Library**

```typescript
// Test completeness algorithm
describe('computeCompleteness', () => {
  it('scores persona without community at 85%', () => {
    const persona = {
      headline: 'Engineer',
      skills: [{ name: 'Rust' }, { name: 'APIs' }],
      distinctiveStrengths: ['Clear communication'],
      values: ['Open-source'],
      openTo: ['Consulting'],
      contactPolicy: 'mediated',
      contactChannels: [{ channelType: 'email-relay' }],
    };

    const score = computeCompleteness(persona, null, defaultConfig, 0);
    expect(score).toBe(85);
  });
});

// Test PII detection
describe('detectPII', () => {
  it('detects phone numbers', () => {
    const result = detectPII('Call me at 415-555-1234');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('phone');
  });
});

// Test trust scoring
describe('computeTrustSignal', () => {
  it('returns 1.0 for direct strong endorsement', () => {
    const endorsements = [
      {
        fromPersonaUri: 'A',
        toPersonaUri: 'B',
        strength: 'strong',
      },
    ];

    const score = computeTrustSignal('A', 'B', endorsements);
    expect(score).toBe(1.0);
  });
});
```

### Integration Tests

```typescript
describe('Shadow claim flow', () => {
  it('transfers endorsements on claim', async () => {
    // 1. Create shadow persona
    const shadow = await createShadowPersona({
      entityType: 'person',
      displayName: 'Marco',
      quickEndorsement: 'Great plumber',
    });

    // 2. Create endorsement to shadow
    const endorsement = await createEndorsement({
      fromPersonaUri: 'alice-persona',
      toShadowPersonaId: shadow.id,
      relationshipType: 'vendor',
    });

    // 3. Claim shadow
    const claimedPersona = await claimShadowPersona(shadow.claimToken);

    // 4. Verify endorsement transferred
    const updatedEndorsement = await getEndorsement(endorsement.id);
    expect(updatedEndorsement.toPersonaUri).toBe(claimedPersona.uri);
    expect(updatedEndorsement.toShadowPersonaId).toBeNull();
  });
});
```

### E2E Tests

```typescript
describe('Persona Coach flow', () => {
  it('creates complete persona through conversation', async () => {
    const session = await startCoachSession({
      userId: 'user-123',
      mode: 'creation',
      entityType: 'person',
    });

    // Simulate conversation
    await addCoachMessage(session.id, "I'm a software engineer");
    await addCoachMessage(session.id, 'Rust, APIs, distributed systems');
    await addCoachMessage(session.id, 'Explaining complex things simply');
    // ... continue conversation

    const completedSession = await completeCoachSession(session.id);

    expect(completedSession.completenessAtEnd).toBeGreaterThan(80);

    const persona = await getPersona(completedSession.personaUri);
    expect(persona.headline).toContain('software engineer');
    expect(persona.skills.length).toBeGreaterThan(0);
  });
});
```

### Seed Data

**`src/lib/db/seed.ts`**

```typescript
async function seed() {
  // Create test users
  const users = await createTestUsers(10);

  // Create personas (30 person, 20 org)
  const personPersonas = await createTestPersonas(users, 'person', 30);
  const orgPersonas = await createTestPersonas(users, 'organization', 20);

  // Create communities
  const communities = await createTestCommunities(users, 5);

  // Create memberships
  await createTestMemberships(personPersonas, communities);

  // Create endorsements (100 total)
  await createTestEndorsements(personPersonas, orgPersonas, 100);

  // Create shadow personas (20 total)
  await createTestShadows(personPersonas, 20);

  // Create affiliations (10 person→org)
  await createTestAffiliations(personPersonas, orgPersonas, 10);
}
```

---

## Deployment {#deployment}

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add CLERK_SECRET_KEY
vercel env add OPENAI_API_KEY
# ... etc

# Deploy
vercel --prod
```

### Environment Variables (Vercel Dashboard)

- `DATABASE_URL` → Neon connection string
- `CLERK_SECRET_KEY` → Clerk backend key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Clerk frontend key
- `OPENAI_API_KEY` → OpenAI API key
- `MASTRA_LOG_LEVEL` → `info`

### Database (Neon)

- Production database: `personus-prod`
- Staging database: `personus-staging`
- Enable connection pooling
- Enable pgvector extension

---

## Design Tokens {#design-tokens}

**`src/lib/design-tokens.ts`**

```typescript
export const tokens = {
  colors: {
    bg: '#0d1117',
    bgCard: '#161b22',
    bgElevated: '#1c2129',
    text: '#e6edf3',
    textMuted: '#8b949e',
    textDim: '#484f58',
    accent: '#e8a838', // Personus gold
    accentSoft: 'rgba(232,168,56,0.10)',
    green: '#4ade80', // Person personas, trust
    purple: '#818cf8', // Shadow personas
    blue: '#60a5fa', // Organizations, verified
    teal: '#2dd4bf', // Success states
    orange: '#fb923c', // Warnings
    border: 'rgba(255,255,255,0.06)',
  },

  fonts: {
    display: "'Fraunces', Georgia, serif",
    body: "'Outfit', -apple-system, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  entityColors: {
    person: '#4ade80',
    organization: '#60a5fa',
    shadow: '#818cf8',
  },

  verificationBadges: {
    basic: '✓',
    verified: '✓✓',
    official: '⭐',
  },
};

// Tailwind CSS config
export const tailwindConfig = {
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: {
        display: [tokens.fonts.display],
        body: [tokens.fonts.body],
        mono: [tokens.fonts.mono],
      },
    },
  },
};
```

---

_End of Implementation & Deployment Document_
