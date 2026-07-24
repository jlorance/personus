---
type: foundation
title: "Personus.ai — External Discovery & Access"
description: "Version: 6.0 Date: 2026-02-11 Depends on: Doc 2 (Data Model & Entities), Doc 3 (API Surface), Doc 8 (Guilds) Depended on by: Doc 5 (Implementation) Status: Design phase"
status: superseded
tags: [archived]
timestamp: 2026-02-11
---

# Personus.ai — External Discovery & Access

**Version:** 6.0
**Date:** 2026-02-11
**Depends on:** Doc 2 (Data Model & Entities), Doc 3 (API Surface), Doc 8 (Guilds)
**Depended on by:** Doc 5 (Implementation)
**Status:** Design phase

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Network Overview](#agent-network-overview)
3. [Public Web Discovery](#public-web-discovery)
4. [MCP Tools](#mcp-tools)
5. [Workspace Integrations](#workspace-integrations)
6. [Future: Ambient Discovery](#future-ambient-discovery)

---

## Overview {#overview}

This document covers **external-facing agents and surfaces** - how the world discovers and accesses Personus personas. These are primarily **read-focused** systems that help people and AI find relevant personas.

**Out of scope for this document:** Persona creation and management agents (Persona Coach, Recommender Coach, etc.) are covered in Doc 07.

**Three primary access modes:**

1. **Public Web Discovery:** AI-optimized static pages crawled by search engines
2. **MCP Tools:** Programmatic access with tiered authentication
3. **Workspace Integrations:** Slack and Discord bots for team discovery

---

## Agent Network Overview {#agent-network-overview}

Personus provides **three primary access modes** for AI-powered discovery:

## Public Web Discovery {#public-web-discovery}

### Overview

Every public persona has two web-accessible representations optimized for AI consumption:

1. **HTML Page:** `personus.ai/maya-chen` - Human-readable, SEO-optimized
2. **JSON-LD Endpoint:** `personus.ai/api/persona/maya-chen.json` - Machine-readable structured data

These pages are crawled by AI search engines (Perplexity, ChatGPT, Claude) and surfaced in search results when users ask for relevant people or services.

---

### HTML Persona Page Structure

**URL Pattern:** `personus.ai/:handle` or `personus.ai/p/:uri`

**SEO Optimization:**

- Semantic HTML with proper heading hierarchy
- Schema.org markup (JSON-LD embedded)
- Open Graph tags for social sharing
- Clean URLs, descriptive titles
- Fast page load (<1s)
- Mobile responsive

**Example HTML Structure:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Maya Chen - Distributed Systems Engineer | Personus</title>
    <meta
      name="description"
      content="Rust specialist and distributed systems engineer. Open to consulting and technical mentoring. Distinctive strength: explaining complex architecture clearly."
    />

    <!-- Schema.org JSON-LD for AI/SEO -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Maya Chen",
        "jobTitle": "Distributed Systems Engineer",
        "description": "Rust specialist • Technical writing • Open to consulting",
        "hasOccupation": {
          "@type": "Occupation",
          "name": "Software Engineer",
          "skills": ["Rust", "Distributed Systems", "API Design", "Technical Documentation"]
        },
        "knowsAbout": ["Distributed Systems", "Rust Programming", "System Architecture"],
        "seeks": "Consulting opportunities, Technical mentoring, Technical writing projects",
        "areaServed": {
          "@type": "Place",
          "name": "Remote (US hours)"
        },
        "endorsement": [
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Priya Kumar"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5"
            },
            "reviewBody": "Maya's explanations of complex systems are unmatched. She mentored our entire team through a critical architecture migration."
          }
        ]
      }
    </script>

    <!-- Open Graph -->
    <meta property="og:title" content="Maya Chen - Distributed Systems Engineer" />
    <meta
      property="og:description"
      content="Rust specialist open to consulting. Distinctive strength: explaining complex architecture clearly."
    />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="https://personus.ai/maya-chen" />
    <meta property="og:image" content="https://personus.ai/og/maya-chen.png" />

    <link rel="canonical" href="https://personus.ai/maya-chen" />
  </head>
  <body>
    <article itemscope itemtype="https://schema.org/Person">
      <header>
        <h1 itemprop="name">Maya Chen</h1>
        <p itemprop="jobTitle">Distributed Systems Engineer • Rust Specialist</p>
        <p itemprop="address" itemscope itemtype="https://schema.org/Place">
          <span itemprop="name">Remote (US hours)</span>
        </p>
      </header>

      <section aria-label="Skills">
        <h2>Skills</h2>
        <ul>
          <li itemprop="knowsAbout">Rust</li>
          <li itemprop="knowsAbout">Distributed Systems</li>
          <li itemprop="knowsAbout">API Design</li>
          <li itemprop="knowsAbout">Technical Documentation</li>
        </ul>
      </section>

      <section aria-label="Distinctive Strengths">
        <h2>What Makes Maya Different</h2>
        <p>Explaining complex architecture clearly, mentoring junior engineers</p>
      </section>

      <section aria-label="Open To">
        <h2>Open To</h2>
        <ul>
          <li itemprop="seeks">Consulting opportunities</li>
          <li itemprop="seeks">Technical mentoring</li>
          <li itemprop="seeks">Technical writing projects</li>
        </ul>
      </section>

      <section aria-label="Trust Signals">
        <h2>Endorsements (3)</h2>

        <div itemprop="review" itemscope itemtype="https://schema.org/Review">
          <p>
            <strong
              ><span itemprop="author" itemscope itemtype="https://schema.org/Person">
                <span itemprop="name">Priya Kumar</span>
              </span></strong
            >
            (colleague, strong endorsement)
          </p>
          <blockquote itemprop="reviewBody">
            "Maya's explanations of complex systems are unmatched. She mentored our entire team
            through a critical architecture migration."
          </blockquote>
        </div>

        <!-- Additional endorsements... -->
      </section>

      <section aria-label="Contact">
        <h2>Request Introduction</h2>
        <p>Contact is mediated to preserve privacy. Maya decides whether to connect.</p>
        <a href="https://personus.ai/contact/maya-chen" class="cta-button">
          Request Introduction
        </a>
      </section>
    </article>
  </body>
</html>
```

---

### JSON-LD API Endpoint

**URL Pattern:** `personus.ai/api/persona/:handle.json`

**Returns:** Pure JSON-LD structured data for AI consumption

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://personus.ai/maya-chen",
  "identifier": "personus:persona:maya-chen-abc123",

  "name": "Maya Chen",
  "jobTitle": "Distributed Systems Engineer",
  "description": "Rust specialist • Technical writing • Open to consulting",

  "hasOccupation": {
    "@type": "Occupation",
    "name": "Software Engineer",
    "skills": ["Rust", "Distributed Systems", "API Design", "Technical Documentation"],
    "experienceRequirements": "8+ years professional experience"
  },

  "knowsAbout": [
    "Distributed Systems",
    "Rust Programming",
    "System Architecture",
    "API Design",
    "Technical Writing"
  ],

  "knowsLanguage": ["English", "Mandarin"],

  "seeks": ["Consulting opportunities", "Technical mentoring", "Technical writing projects"],

  "areaServed": {
    "@type": "Place",
    "name": "Remote (US hours)",
    "geo": {
      "@type": "GeoCoordinates",
      "addressCountry": "US"
    }
  },

  "brand": [
    {
      "@type": "Brand",
      "name": "Distinctive Strengths",
      "description": "Explaining complex architecture clearly, mentoring junior engineers"
    }
  ],

  "endorsement": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Priya Kumar"
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5",
        "worstRating": "1"
      },
      "reviewBody": "Maya's explanations of complex systems are unmatched...",
      "reviewAspect": ["Distributed Systems", "Mentoring"],
      "datePublished": "2025-12-15"
    }
  ],

  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Mediated Introduction",
    "url": "https://personus.ai/contact/maya-chen"
  },

  "url": "https://personus.ai/maya-chen",
  "sameAs": "https://personus.ai/p/personus:persona:maya-chen-abc123"
}
```

---

### AI Discovery Use Cases

**Scenario 1: ChatGPT with Browsing**

```
User: "Find me a Rust consultant who's good at explaining complex systems"

ChatGPT: [Searches web, finds and fetches personus.ai/maya-chen]

"I found Maya Chen on Personus - she's a distributed systems engineer
specializing in Rust with 8+ years of experience. Her distinctive strength
is 'explaining complex architecture clearly' which matches exactly what
you're looking for. She's explicitly open to consulting and has strong
endorsements from colleagues including Priya Kumar who says her
'explanations of complex systems are unmatched.'

You can request an introduction here: https://personus.ai/contact/maya-chen"
```

**Scenario 2: Perplexity Search**

```
User: "distributed systems consultant rust san francisco"

Perplexity: [Crawled personus.ai pages, indexed structured data]

"Here are distributed systems consultants specializing in Rust:

1. Maya Chen - Remote (US hours)
   • Skills: Rust, Distributed Systems, API Design
   • Open to: Consulting, mentoring
   • Distinctive: Explaining complex architecture clearly
   • 3 endorsements
   Source: personus.ai/maya-chen

2. [Additional results...]"
```

**Scenario 3: Claude with Web Search**

```
User: "I need help with backpressure in a real-time data pipeline"

Claude: [Detects technical need, searches web]
[Finds relevant Personus profiles via web search]

"I found Alex Park on Personus who specializes in distributed systems
and real-time data pipelines. They have specific expertise in backpressure
handling and are open to technical consulting. Would you like me to
summarize their background or provide the introduction link?"
```

---

### Sitemap & Crawling

**Sitemap:** `personus.ai/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://personus.ai/maya-chen</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- All public personas... -->
</urlset>
```

**robots.txt:**

```
User-agent: *
Allow: /
Allow: /api/persona/*.json

Sitemap: https://personus.ai/sitemap.xml
```

**Meta Robots Tags:**

- Public personas: `<meta name="robots" content="index, follow">`
- Private/authenticated personas: `<meta name="robots" content="noindex, nofollow">`
- Shadow personas: `<meta name="robots" content="index, follow">` (discoverable for claiming)

---

### Organization Persona Pages

Organization pages follow the same pattern with adapted schema:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Bay Area Pet Hospital",
  "description": "24/7 emergency vet care • Exotic animal specialists • AAHA accredited",

  "brand": {
    "@type": "Brand",
    "name": "Distinctive Strengths",
    "description": "Only exotic animal specialists in SF with 24/7 emergency care"
  },

  "makesOffer": ["Emergency veterinary care", "Exotic animal medicine", "Surgery", "Dentistry"],

  "areaServed": {
    "@type": "Place",
    "name": "San Francisco + Peninsula"
  },

  "accreditedBy": [
    {
      "@type": "Organization",
      "name": "AAHA",
      "url": "https://aaha.org"
    }
  ],

  "employee": [
    {
      "@type": "Person",
      "name": "Dr. Sarah Chen, DVM",
      "jobTitle": "Founder & Chief Veterinarian",
      "url": "https://personus.ai/dr-sarah-chen"
    }
  ]
}
```

---

_End of Public Web Discovery Section_

---

## MCP Tools (Model Context Protocol) {#mcp-tools}

### Overview

The Personus MCP server provides programmatic access to persona search and discovery for AI assistants (Claude Desktop, ChatGPT, custom agents). Access is **tiered** based on authentication level.

---

### Access Tiers

**Anonymous Tier** (No authentication)

- Search: Public personas only
- Rate limit: 10 requests/minute
- Scope: `scope: "global"` with `visibility: "public"` filter
- Use case: Discovery, trying out Personus

**Authenticated Tier** (User has Personus account)

- Search: Public + authenticated personas + user's network + user's communities
- Rate limit: 100 requests/minute
- Scope: `scope: "my-network"` or `scope: "community"`
- Trust scoring: Endorsement paths from user's personas
- Use case: Personal AI assistant, network discovery

**Enterprise Tier** (Paid API key)

- Search: Full access based on license
- Rate limit: 1000 requests/minute
- Batch operations: Search multiple queries at once
- Analytics: Track search patterns
- Use case: Recruiting/ATS, enterprise search, HR platforms

---

### MCP Tool Definitions

**Tool 1: Search Personas**

```typescript
{
  name: "personus_search",
  description: `Search Personus for people or organizations matching a query.

    Access levels:
    - Anonymous: Public personas only
    - Authenticated: Public + user's network + groups
    - Enterprise: Full access per license

    Returns personas with endorsements, trust signals, affiliations, and
    mediated contact options. Use when user needs someone/something OR
    when you detect implicit needs during conversation.`,

  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language: who/what they need",
        examples: [
          "rust consultant distributed systems",
          "plumber victorian homes SF",
          "emergency vet exotic animals"
        ]
      },
      entityType: {
        type: "string",
        enum: ["person", "organization", "any"],
        description: "Filter by person/org/both (default: any)"
      },
      scope: {
        type: "string",
        enum: ["global", "my-network", "community"],
        description: `Search scope:
          - global: All public personas (works for all tiers)
          - my-network: Endorsed by you or your connections (authenticated only)
          - community: Within specific communities (authenticated only)
        `,
        default: "global"
      },
      communityIds: {
        type: "array",
        items: { type: "string" },
        description: "Limit to specific communities (requires authenticated tier + membership)"
      },
      location: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
          radiusMiles: { type: "number" }
        },
        description: "Filter by geographic proximity"
      },
      context: {
        type: "string",
        description: "Conversation context for better AI summaries (optional)"
      },
      maxResults: {
        type: "number",
        description: "Max results (default 3, max 20)",
        default: 3,
        maximum: 20
      },
    },
    required: ["query"],
  },

  // Authentication passed via MCP server config
  // Server automatically applies tier-based filtering
}
```

**Tool 2: Request Introduction**

```typescript
{
  name: "personus_request_introduction",
  description: `Send mediated introduction request to a persona.
    Recipient decides whether to connect.

    Requires: Authenticated tier (must have Personus account)`,

  inputSchema: {
    type: "object",
    properties: {
      targetPersonaUri: {
        type: "string",
        description: "URI of persona to contact (from search results)"
      },
      fromPersonaUri: {
        type: "string",
        description: "Your persona URI (required for authenticated tier)"
      },
      reason: {
        type: "string",
        description: "Why reaching out (from target's contactReasons if available)"
      },
      message: {
        type: "string",
        description: "Introduction message (2-3 sentences)"
      },
      communityId: {
        type: "string",
        description: "Community context if applicable (optional)"
      },
    },
    required: ["targetPersonaUri", "fromPersonaUri", "reason", "message"],
  },
}
```

**Tool 3: Get Persona Details**

```typescript
{
  name: "personus_get_persona",
  description: `Get full details of a specific persona by URI.

    Access based on tier:
    - Anonymous: Public personas only
    - Authenticated: Public + authenticated (if in your network) + your communities
    - Enterprise: Per license`,

  inputSchema: {
    type: "object",
    properties: {
      personaUri: {
        type: "string",
        description: "Persona URI (from search results or URL)"
      },
      communityId: {
        type: "string",
        description: "Community context for context layer fields (optional)"
      },
    },
    required: ["personaUri"],
  },
}
```

**Tool 4: List My Communities**

```typescript
{
  name: "personus_list_communities",
  description: `List communities the authenticated user is a member of.

    Requires: Authenticated tier`,

  inputSchema: {
    type: "object",
    properties: {},
  },
}
```

**Tool 5: Get Affiliations**

```typescript
{
  name: "personus_get_affiliations",
  description: `Get affiliations for a persona.

    If person: returns orgs they work for/with
    If org: returns people affiliated + other org relationships`,

  inputSchema: {
    type: "object",
    properties: {
      personaUri: { type: "string" },
    },
    required: ["personaUri"],
  },
}
```

---

### MCP Server Configuration

**Anonymous Setup** (No Personus account)

```json
{
  "mcpServers": {
    "personus": {
      "command": "npx",
      "args": ["-y", "@personus/mcp-server"],
      "env": {
        "PERSONUS_API_URL": "https://api.personus.ai"
      }
    }
  }
}
```

**Authenticated Setup** (Has Personus account)

```json
{
  "mcpServers": {
    "personus": {
      "command": "npx",
      "args": ["-y", "@personus/mcp-server"],
      "env": {
        "PERSONUS_API_URL": "https://api.personus.ai",
        "PERSONUS_API_KEY": "pk_user_abc123...",
        "PERSONUS_USER_ID": "user_xyz789"
      }
    }
  }
}
```

**Enterprise Setup** (ATS/Recruiting platform)

```json
{
  "mcpServers": {
    "personus": {
      "command": "npx",
      "args": ["-y", "@personus/mcp-server"],
      "env": {
        "PERSONUS_API_URL": "https://api.personus.ai",
        "PERSONUS_API_KEY": "pk_enterprise_abc123...",
        "PERSONUS_TIER": "enterprise"
      }
    }
  }
}
```

---

### Use Case Examples

**Use Case 1: Work Project Need (Authenticated)**

```
User: "I'm building a real-time data pipeline and stuck on backpressure handling"

Claude: [Detects implicit need]
[Calls: personus_search({
  query: "distributed systems backpressure real-time data",
  scope: "my-network",
  context: "User needs help with backpressure in real-time pipeline",
  maxResults: 3
})]

Response includes trust signals:
- Alex Park (endorsed by user's colleague Sarah - strong)
- Trust chain: You → Sarah → Alex
- Match: "distributed systems, real-time data, backpressure handling"

Claude: "I found Alex Park through your network - they specialize in distributed
systems and real-time data pipelines. Your coworker Sarah gave them a strong
endorsement specifically for system design mentoring. Their distinctive strength
is 'translating complex distributed systems concepts into practical solutions.'

Would you like me to request an introduction?"

User: "Yes"

Claude: [Calls: personus_request_introduction({
  targetPersonaUri: "personus:persona:alex-park",
  fromPersonaUri: "personus:persona:user-123",
  reason: "technical mentoring",
  message: "Hi Alex, I'm working on a real-time data pipeline and struggling
  with backpressure handling. Sarah mentioned you're excellent at system design
  mentoring. Would you be open to a short conversation?"
})]

"Introduction request sent! Alex will review and decide whether to connect."
```

**Use Case 2: Local Service Need (Authenticated, Group Context)**

```
User: "My toilet keeps running, so annoying"

Claude: [Detects home repair need]
[Calls: personus_search({
  query: "plumber residential SF toilet repair",
  scope: "community",
  communityIds: ["sunnyside-neighbors"],
  maxResults: 3
})]

Claude: "I found three plumbers in your Sunnyside Neighbors network:

1. **Marco Silva** - Residential plumber
   • 3 endorsements (all from neighbors)
   • Skills: Pipe repair, Victorian plumbing, toilet/fixture work
   • Sarah K. (strong): 'Saved our 1920s house from pipe disaster'
   • Service area: Inner SF neighborhoods

2. **Carlos M.** - Silva Plumbing
   • 2 endorsements
   • Organization: Licensed & insured
   • Skills: Residential plumbing, emergency service

All are in your neighborhood and have been personally endorsed by neighbors
you share the community with. Want me to request an introduction?"
```

**Use Case 3: Recruiting (Enterprise Tier)**

```
ATS System: [Integrated with Personus MCP]

Recruiter: "Find senior Rust engineers with distributed systems experience
open to opportunities"

System: [Calls: personus_search({
  query: "senior rust engineer distributed systems",
  scope: "global",
  entityType: "person",
  maxResults: 20
})]

Returns 20 candidates with:
- Full profiles
- Skills match breakdown
- Years of experience
- What they're open to
- Endorsements (public only for privacy)
- No PII (privacy-preserved)

Recruiter reviews, selects 5, system sends batch introduction requests.
```

**Use Case 4: Network Discovery (Authenticated)**

```
User: "Who in my network knows Kubernetes?"

Claude: [Calls: personus_search({
  query: "kubernetes",
  scope: "my-network",
  maxResults: 10
})]

Claude: "In your Personus network:

**Direct connections (endorsed by you):**
- Sarah K. - DevOps engineer, Kubernetes expert
- Mike L. - Platform engineer, K8s + Helm

**Extended network (2-hop):**
- Alex P. - SRE, endorsed by Sarah for 'kubernetes architecture'
- Jamie R. - Cloud architect, endorsed by Mike

Would you like details on any of these people?"
```

**Use Case 5: Anonymous Discovery (Trying Personus)**

```
User (no Personus account, using Claude Desktop with Personus MCP anonymous):

"Find me a web3 developer who does smart contract audits"

Claude: [Calls: personus_search({
  query: "web3 developer smart contract audits",
  scope: "global",
  maxResults: 3
})]

Returns: Public personas only (no network/community filtering available)

Claude: "I found these web3 developers on Personus:

1. **Chen L.** - Smart contract security auditor
   • 5 endorsements
   • Skills: Solidity, security auditing, DeFi protocols
   • Open to: Contract audits, security consulting

2. [Additional results...]

Note: I'm searching public Personus profiles only. If you create a Personus
account and connect it, I can search your network and communities for more
personalized results."
```

---

### MCP Response Format

```typescript
interface PersonusSearchResponse {
  results: PersonaResult[];
  queryMeta: {
    tier: 'anonymous' | 'authenticated' | 'enterprise';
    scope: 'global' | 'my-network' | 'community';
    entityTypeFilter?: 'person' | 'organization';
    communityFilter?: string[];
    totalResults: number;
    matchedTerms: string[];
    searchMode: 'explicit' | 'ambient';
  };
}

interface PersonaResult {
  personaType: 'full' | 'shadow';
  entityType: 'person' | 'organization';

  // Core data
  personaUri?: string;
  shadowPersonaId?: string;
  displayName: string;
  headline?: string;
  serviceDescription?: string;
  location?: Location;
  serviceArea?: ServiceArea;

  // Capabilities
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

  // Relationships
  affiliations?: {
    employedAt?: string[]; // Org names (if person)
    staff?: string[]; // Person names (if org)
    parentOrg?: string; // Parent org (if chapter)
  };

  // Trust signals (tier-dependent)
  endorsements: EndorsementSummary[];
  trustSignals?: {
    directEndorsement?: boolean; // User endorsed this person
    endorsedByConnection?: string; // Name of mutual connection
    trustPath?: string[]; // Chain: You → X → Target
    sameCommunity?: string[]; // Shared communities
  };

  // Discovery
  contactMethod: 'mediated' | 'through-endorser';

  // AI-generated (per query)
  contextualSummary: string;
  matchExplanation: {
    matchedTerms: string[];
    matchedFields: string[];
    relevanceScore: number;
    trustScore?: number; // Only for authenticated tier
  };

  // Actions
  actions: {
    requestIntroduction?: string; // Only if can contact
    viewFullPersona: string;
  };
}

interface EndorsementSummary {
  from: string; // Display name
  relationship: string;
  strength: 'strong' | 'standard';
  context: string[];
  testimonial?: string;
  visibility: 'public' | 'authenticated'; // Respects privacy
}
```

---

### Rate Limiting & Pricing

**Anonymous Tier:**

- Free
- 10 requests/minute
- Public personas only
- Use case: Discovery, evaluation

**Authenticated Tier:**

- Free for personal use
- 100 requests/minute
- Network + community access
- Use case: Personal AI assistant

**Enterprise Tier:**

- Paid (pricing TBD)
- 1000 requests/minute
- Batch operations
- Priority support
- Analytics dashboard
- Use case: Recruiting, HR platforms, enterprise search

---

_End of MCP Tools Section_

## Workspace Integrations (Slack & Discord) {#workspace-integrations}

### Overview

Slack and Discord bots provide **community-backed** search and discovery within workspace contexts. These integrations are **workspace-wide** installations that connect to a Personus community.

**Key principle:** Members of the workspace = members of the Personus community

---

### Slack Bot Integration

#### Installation & Setup

**Admin Flow:**

1. Workspace admin installs Personus bot from Slack App Directory
2. OAuth flow: `https://personus.ai/integrations/slack/install`
3. Admin selects or creates Personus community to link
4. Bot joins workspace, members can use immediately

**Community Linking:**

- **New community:** Bot creates `"[Workspace Name] Team"` community in Personus
- **Existing community:** Admin selects from their owned communities
- **Sync:** Bot can optionally sync Slack members → Personus community invites

---

#### Slack Bot Commands

**@Mention Query**

```
User in #tech-help:
@Personus who knows React hooks and testing?

Personus Bot replies (in thread):
┌────────────────────────────────────────────┐
│ 🟢 Found 2 people in your workspace        │
│                                            │
│ Sarah K. - Frontend Engineer               │
│ Skills: React, hooks, performance, testing │
│ Distinctive: Deep understanding of React   │
│   internals                                │
│ Endorsed by: James L. (strong)             │
│ Open to: Mentoring, code reviews           │
│                                            │
│ [Request Introduction] [View Profile]      │
│                                            │
│ ─────────────────────────────────────────  │
│                                            │
│ Mike L. - Senior Developer                 │
│ Skills: React, testing, Jest, CI/CD        │
│ Open to: Pairing, workshops                │
│                                            │
│ [Request Introduction] [View Profile]      │
│                                            │
│ ─────────────────────────────────────────  │
│                                            │
│ 🔒 Privacy: Contacts mediated. They decide.│
└────────────────────────────────────────────┘
```

**Slash Command: /personus**

```
/personus find plumber

Opens modal:
┌────────────────────────────────────────────┐
│ Search Personus                            │
│                                            │
│ Query: [plumber                        ]   │
│                                            │
│ Scope:                                     │
│ ○ This workspace only                      │
│ ● My communities (includes this workspace) │
│ ○ Public personas                          │
│                                            │
│ Show: [3] results                          │
│                                            │
│          [Cancel]  [Search]                │
└────────────────────────────────────────────┘
```

**Slash Command: /personus directory**

```
/personus directory

Returns:
┌────────────────────────────────────────────┐
│ 📁 Workspace Directory                     │
│                                            │
│ 47 members on Personus                     │
│                                            │
│ Filter by skill: [_____________] 🔍        │
│                                            │
│ A                                          │
│ • Alex P. - DevOps Engineer (Kubernetes)   │
│ • Amy C. - Designer (Figma, UX)            │
│                                            │
│ B                                          │
│ • Bob K. - Backend (Python, PostgreSQL)    │
│                                            │
│ [View Full Directory on Personus →]       │
└────────────────────────────────────────────┘
```

**Slash Command: /personus profile**

```
/personus profile

Returns ephemeral message (only user sees):
┌────────────────────────────────────────────┐
│ Your Personus Profile                      │
│                                            │
│ John Smith - Product Manager               │
│ 76% complete                               │
│                                            │
│ What you're known for:                     │
│ • Product strategy                         │
│ • User research                            │
│                                            │
│ [Improve Profile] [View Public Page]       │
└────────────────────────────────────────────┘
```

---

#### Slack Bot Interaction Buttons

**Request Introduction Button:**

Clicks open modal:

```
┌────────────────────────────────────────────┐
│ Request Introduction to Sarah K.           │
│                                            │
│ Why are you reaching out?                  │
│ ○ Code review                              │
│ ○ Mentoring                                │
│ ○ Collaboration                            │
│ ● Other: [React hooks help         ]      │
│                                            │
│ Your message:                              │
│ ┌────────────────────────────────────────┐ │
│ │ Hi Sarah, I saw you're great with     │ │
│ │ React hooks. I'm working on a complex │ │
│ │ state management issue and could use  │ │
│ │ your perspective...                   │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ 🔒 Your Slack handle won't be shared.      │
│                                            │
│          [Cancel]  [Send Request]          │
└────────────────────────────────────────────┘
```

**View Profile Button:**

Opens browser to `personus.ai/sarah-k` with workspace context

---

#### Slack Bot Features

**1. Workspace Member Sync** (Optional)

Admin can enable automatic sync:

- New Slack member → Auto-invited to Personus community
- Left Slack → Community membership deactivated
- Email matching for existing Personus users

**2. Notification Integration**

Bot posts to user's DM when:

- Someone from workspace requests introduction
- Someone in workspace endorses you
- Your profile completeness can be improved

**3. Directory Channel** (Optional)

Admin can set up `#personus-directory` channel:

- Auto-posts when members update profiles
- Weekly digest of new skills added
- Skill gap alerts ("5 searches for 'locksmith' but no matches")

---

### Discord Bot Integration

#### Installation & Setup

Similar to Slack:

1. Server admin installs from Discord Bot Directory
2. OAuth flow: `https://personus.ai/integrations/discord/install`
3. Links to Personus community
4. Bot joins server with read/send permissions

---

#### Discord Bot Commands

**Slash Command: /personus find**

```
/personus find web3 developer

Bot replies with embed:
┌────────────────────────────────────────────┐
│ 🟢 Personus Search Results                 │
├────────────────────────────────────────────┤
│ Alex Chen                                  │
│ Web3 Developer • Solidity • DeFi           │
│                                            │
│ Skills          Trust Signals              │
│ Solidity        3 community endorsements   │
│ Web3.js         Member since 2024          │
│ DeFi protocols                             │
│                                            │
│ Open to: Contract work, security audits    │
│                                            │
│ "Alex delivered a flawless smart contract  │
│ audit for our DAO..." - Maria G.           │
│                                            │
│ [Request Introduction]  [View Profile →]  │
└────────────────────────────────────────────┘
```

**Slash Command: /personus directory**

```
/personus directory

Returns paginated embed with server members:
┌────────────────────────────────────────────┐
│ 📁 Server Directory (Page 1/3)             │
├────────────────────────────────────────────┤
│                                            │
│ Alex C. - Web3 Developer                   │
│ Skills: Solidity, DeFi, auditing           │
│                                            │
│ Jamie R. - Community Manager               │
│ Skills: Discord mgmt, event planning       │
│                                            │
│ Morgan T. - Designer                       │
│ Skills: NFT art, branding, Figma           │
│                                            │
│ [◄ Prev]  [Next ►]                         │
└────────────────────────────────────────────┘
```

**Slash Command: /personus profile**

Shows user's own profile (ephemeral message)

---

#### Discord Bot Features

**1. Role Integration** (Optional)

Map Discord roles to Personus context fields:

- `@Developer` role → Context field: `role: "Developer"`
- `@Moderator` role → Context field: `role: "Moderator"`

**2. Thread Context** (Advanced - Future)

Bot can read thread context and suggest relevant members:

```
In #dev-help thread:
User1: "Need help with PostgreSQL query optimization"
User2: "Yeah this is killing performance"

Bot (in thread):
"💡 I found database experts in this server:
- Maria G. (PostgreSQL performance tuning) - 2 endorsements
React with 👍 to notify them about this thread"
```

**3. Event Integration** (Advanced - Future)

When server creates event:

```
Event: "Game Jam - Feb 20-22"

Bot suggests members to notify:
"These members have relevant skills for your Game Jam:
- Game design: 5 members
- Unity: 3 members
- Music/sound: 2 members

Post to #announcements?"
```

---

### Community-Backed Data Model

**How Workspace Integration Works:**

```typescript
// PlatformIntegration entity (from Doc 2)
interface PlatformIntegration {
  id: string;
  communityId: string;                  // The linked Personus community
  platform: "slack" | "discord";
  status: "active" | "disconnected";

  // Platform-specific IDs
  slackWorkspaceId?: string;
  slackTeamName?: string;
  discordGuildId?: string;
  discordGuildName?: string;

  // OAuth tokens (encrypted)
  accessToken: string;
  refreshToken: string;

  // Configuration
  config: {
    autoSync: boolean;                 // Auto-invite workspace members to community
    notifyChannel?: string;            // Channel for bot posts
    allowPublicSearch: boolean;        // Allow searching beyond workspace
  };

  installed_at: string;
  installed_by: string;                // User who installed
  updated_at: string;
}

// When someone searches in Slack/Discord
// Bot calls Personus API with:
{
  query: "react hooks",
  scope: "community",
  communityIds: [integration.communityId],
  requestingPlatform: "slack",
  workspaceId: integration.slackWorkspaceId
}

// Search results are filtered to:
// 1. Members of the linked community
// 2. Optionally: public personas (if config.allowPublicSearch)
```

---

### Privacy & Permissions

**What Workspace Bots Can See:**

- Community members' public-facing profile data (within community)
- Community context layer data (role, department, etc.)
- Endorsements within the community (respecting visibility settings)

**What Workspace Bots CANNOT See:**

- PII (email, phone, address)
- Private personas outside the community
- Cross-persona connections
- Direct contact information

**Member Consent:**

- Members must claim/create their persona to appear in searches
- Members can control visibility per community
- Members can leave community (removes from workspace searches)

---

### Admin Dashboard

Workspace admins get analytics at `personus.ai/admin/communities/[communityId]/integrations`:

```
Slack Integration: Active
├─ Linked workspace: Acme Corp (#T1234567)
├─ Members synced: 47 of 52
├─ Search queries (30 days): 127
├─ Top searched skills: React (15), Python (12), Design (8)
├─ Skill gaps: Kubernetes (5 searches, 0 results)
└─ [Disconnect] [Settings]

Configuration:
☑ Auto-sync new members
☑ Allow public search (beyond workspace)
☐ Post weekly digest to #personus-directory
Notification channel: #general
```

---

### Implementation Notes

**Slack:**

- Uses Slack Bolt SDK
- Block Kit for rich messages
- Socket mode or Events API for message listening
- Slash commands registered via app manifest

**Discord:**

- Uses discord.js library
- Rich embeds for results
- Slash commands (Discord's native commands)
- Interaction buttons via Action Rows

**Shared Infrastructure:**

- Both bots share same Personus API backend
- Same search/query logic (just different UI rendering)
- Same community-backing model
- Same privacy enforcement

---

_End of Workspace Integrations Section_

---

## Community Coach {#community-coach}

### Purpose

The Community Coach helps users create, configure, and manage communities (neighborhoods, guilds, networks, teams). It serves as the AI-guided flow for everything from "I want to start a neighborhood community" to "I want to create a professional guild with tiered membership."

### When It Activates

- User clicks "Create New" on the Explore page
- User says "I want to start a guild" or "help me create a community" to any coach
- Handed off from Persona Coach when user describes organizational goals
- From the dashboard when user has an org persona but no backing community

### Conversation Flow

```
1. Intent Discovery
   Coach: "What kind of community are you thinking about?"
   → Community (neighborhood, interest group)
   → Guild (skill-based, with vetting and request routing)
   → Network (affinity group, professional network)
   → Team (org-backed employee/staff group)

2. Basic Setup
   Coach: "What should we call it? What's it for?"
   → Extract: name, description, tags
   → Suggest tags based on user's persona skills

3. Type-Specific Configuration
   [Community] → visibility, join policy, context schema fields
   [Guild] → skill taxonomy, tiers, routing mode, offerings
   [Network] → visibility (typically authenticated), join criteria
   [Team] → link to org persona, department schema, role fields

4. Backing Persona (if applicable)
   Coach: "Should this be backed by an organization?"
   → If user has org persona: suggest linking
   → If creating a guild: guide org persona creation first

5. Member Invitation
   Coach: "Who should we invite first?"
   → Suggest from user's endorsement network
   → Generate invite links
   → Set initial admin/steward roles

6. Launch Review
   Coach shows preview of community page
   → Confirm settings
   → Create and publish
```

### Tools

```
community_create
  description: "Create a new community with the specified configuration"
  input: name, description, communityType, visibility, joinPolicy, tags, backingPersonaUri, contextSchema
  output: communityId, slug, status

community_update
  description: "Update community settings"
  input: communityId, fieldsToUpdate
  output: updated community

guild_setup_taxonomy
  description: "Create initial skill taxonomy for a guild"
  input: guildPersonaId, categories (array of {name, skillTags, description})
  output: categoryIds

guild_setup_tiers
  description: "Define membership tiers for a guild"
  input: guildPersonaId, tiers (array of {name, criteria, permissions})
  output: tierIds

suggest_community_tags
  description: "Suggest tags for a community based on description and creator's skills"
  input: description, creatorSkills
  output: suggestedTags
```

---

## Commerce Coach {#commerce-coach}

### Commerce Coach Agent

**Purpose:** Guides users through setting up and managing their Commerce Persona — buyer preferences, sizes, dietary restrictions, brand preferences, and agent authorization rules.

**Capabilities:**
- Walk users through commerce trait setup via conversational flow
- Suggest trait values from taxonomies (dietary restrictions, clothing sizes, style tags, etc.)
- Explain privacy tiers and help users assign appropriate privacy levels
- Configure agent authorization rules (auto-purchase thresholds, delegation scopes)
- Preview what a commerce MCP consumer would see for the user's persona

**Cross-Agent Handoffs:**
- **From Persona Coach:** When a user mentions shopping preferences, sizes, or dietary needs during persona setup, hand off to Commerce Coach for specialized guidance
- **From Discovery Agent:** When semantic search identifies commerce-related communities (e.g., "sustainable shopping group"), Commerce Coach can help configure relevant preferences
- **To MCP endpoint:** Commerce Coach writes traits to the persona's user traits, which are then automatically available via the `personus_get_commerce_persona` MCP tool

**Voice & Tone:** Practical and privacy-conscious. Emphasizes user control ("Only your agent sees your budget — never merchants") and explains the value of each trait ("Your brand size notes help your AI agent pick the right size across all stores").

**Key Conversational Flows:**
1. **Quick Setup:** "Let me help you set up your shopping preferences. Do you have any dietary restrictions or allergens I should know about?"
2. **Privacy Review:** "Here's what your AI agent would share when shopping. Your budget and brand blocklist stay private — they're agent-local."
3. **Agent Rules:** "What's the most your agent should spend without asking? Any stores it should always use or avoid?"

---

## Cross-Agent Patterns {#cross-agent-patterns}

### Cross-Agent Suggestions

Each coach is aware of the user's broader context and can suggest actions handled by other coaches. This creates a seamless experience without requiring the user to know which coach does what.

| Current Coach         | Trigger                                    | Suggestion                                              | Target                            |
| --------------------- | ------------------------------------------ | ------------------------------------------------------- | --------------------------------- |
| **Persona Coach**     | User describes organizational goals        | "Sounds like you might want to create a guild for this" | Community Coach                   |
| **Persona Coach**     | User has rich skills but no endorsements   | "Know someone who'd vouch for your [skill]?"            | Recommender Coach                 |
| **Recommender Coach** | User endorses 3+ people in same skill area | "You could start a guild around [skill]"                | Community Coach                   |
| **Recommender Coach** | User creates a shadow persona              | "Want to invite them to join [community]?"              | Community Coach                   |
| **Community Coach**   | New community has no members               | "Let's find people in your network to invite"           | Recommender Coach                 |
| **Community Coach**   | Guild created but no offerings             | "What services should this guild offer?"                | Community Coach (offerings mode)  |
| **Discovery Agent**   | Search yields guild result                 | "Submit a request to this guild?"                       | Guild Routing Agent               |
| **Persona Coach**     | User mentions shopping, sizes, or dietary needs | "Let me connect you with the Commerce Coach for that"   | Commerce Coach                    |
| **Discovery Agent**   | Search finds commerce-related community    | "Want to set up your shopping preferences for this?"    | Commerce Coach                    |
| **Commerce Coach**    | User's commerce traits are complete        | "Your preferences are set — discoverable via MCP now"   | MCP endpoint                      |

### Handoff Protocol

When one coach hands off to another, it passes context so the receiving coach doesn't start from scratch:

```typescript
interface CoachHandoff {
  fromAgent: string; // "persona-coach"
  toAgent: string; // "community-coach"
  reason: string; // "user wants to create a guild"
  context: {
    userId: string;
    activePersonaUri?: string;
    relevantSkills?: string[];
    suggestedAction?: string;
    conversationSummary?: string;
  };
}
```

The user sees a smooth transition: "Let me hand you over to the Community Coach — I've shared what we've been discussing so you don't have to repeat yourself."

### Community-Aware Tool Additions

Existing coaches gain community awareness via new tools:

**Persona Coach — new tools:**

```
suggest_communities_for_persona
  description: "Suggest communities the user might want to join based on their persona's skills and interests"
  input: personaUri
  output: suggestedCommunities (with match reasons)
```

**Recommender Coach — new tools:**

```
suggest_guild_for_endorsees
  description: "When a user has endorsed multiple people with similar skills, suggest creating a guild"
  input: userId, skillPattern
  output: guildSuggestion (name, skills, potential members)
```

**Discovery Agent — new tools:**

```
personus_list_communities
  description: "List communities matching a query, type, or tags"
  input: query, communityType, tags, location
  output: community summaries with member count, type, tags

personus_submit_guild_request
  description: "Submit a help request to a guild"
  input: guildId, needDescription, urgency, constraints
  output: requestId, estimatedResponseTime
```

---

## Future: Ambient Discovery {#future-ambient-discovery}

**Not in MVP - Design for Future**

Ambient discovery = AI detects implicit needs during conversation and proactively searches Personus.

**Example:**

```
Slack conversation in #engineering:
User1: "This error handling is a mess, we need to refactor"
User2: "Yeah but none of us have deep experience with resilience patterns"

Bot (observes, searches for "error handling resilience patterns" in workspace):
💡 "I noticed you're discussing error handling. Sarah K. in this workspace
has expertise in 'resilience engineering patterns' and is open to mentoring.
Want an introduction?"
```

**Challenges:**

- Privacy: Requires monitoring messages (opt-in only)
- Accuracy: False positives are annoying
- Consent: Must be very clear about what bot is reading

**Implementation Approach:**

1. Opt-in per channel: `#dev-help` enables ambient mode
2. Bot reads messages, detects patterns (keywords: "need", "looking for", "anyone know")
3. Calls Personus search, only suggests if high-confidence match
4. Throttled: Max 1 suggestion per channel per day

---

_End of Agent Architecture & Conversational UX Document_

**Document Status: Ready for implementation**

**Cross-references:**

- Doc 02 §Communities — data model for communities, community types
- Doc 06 §Explore & Discovery — UI for community browse, guild pages
- Doc 08 §AI Agent Integration — guild routing agent, MCP tools
- Doc 09 §AI Agent Authorization — MCP access tiers, agent scoping

**Next additions:**

- Error handling patterns (user confusion, off-topic queries)
- Voice UX details (interruption handling, confirmation patterns)
- Analytics instrumentation for query patterns
