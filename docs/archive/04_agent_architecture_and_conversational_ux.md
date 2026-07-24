---
type: foundation
title: "Personus.ai — Agent Architecture & Conversational UX"
description: "Stale v5 monolithic agent spec (2026-02-08); superseded by foundation/agents.md."
status: superseded
tags: [archived]
timestamp: 2026-02-08
---

# Personus.ai — Agent Architecture & Conversational UX

**Version:** 5.0  
**Date:** 2026-02-08  
**Depends on:** Doc 2 (Data Model & Entities), Doc 3 (API Surface)  
**Depended on by:** Doc 5 (Implementation)  
**Status:** Design phase (next focus area)

---

## Table of Contents

1. [Agent Network Overview](#agent-network-overview)
2. [Agent Definitions](#agent-definitions)
3. [Persona Coach](#persona-coach)
4. [Recommender Coach](#recommender-coach)
5. [Contact Mediation Agent](#contact-mediation-agent)
6. [Value Conveyance Agent](#value-conveyance-agent)

---

## Agent Network Overview {#agent-network-overview}

Personus provides **three primary access modes** for AI-powered discovery:

### 1. Public Web Discovery (Universal Access)
- **SEO-optimized HTML pages:** `personus.ai/maya-chen`
- **Structured JSON-LD endpoints:** `personus.ai/api/persona/maya-chen.json`
- **AI crawlable:** Perplexity, ChatGPT browsing, Claude web search
- **Access level:** Public personas only
- **Authentication:** None required

### 2. MCP Server (Tiered Access)
- **Anonymous tier:** Public persona search only
- **Authenticated tier:** User's network + groups (requires Personus account)
- **Enterprise tier:** Full API access, higher rate limits, batch operations
- **Use cases:** Recruiting/ATS integration, personal AI assistants, enterprise search

### 3. Workspace Integrations (Group-Backed)
- **Slack workspace bot:** Tied to group membership
- **Discord server bot:** Tied to group membership
- **Access model:** Members search within their group + public personas
- **Setup:** Workspace admin installs, links to Personus group

---

### Agent Architecture Diagram

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
        │ Persona Coach │  │ Recommender Coach │
        │   (voice)     │  │     (voice)       │
        └───────────────┘  └───────────────────┘

        ┌───────────────────┐
        │ Contact Mediation │ → AI triage of requests
        │      Agent        │
        └───────────────────┘
```

---

## Agent Definitions {#agent-definitions}

Built with Mastra.ai. Each agent is a specialized LLM with specific instructions and tools.

### NLP Gateway (Router)

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const gatewayAgent = new Agent({
  name: "gateway",
  model: openai("gpt-4o"),
  instructions: `You are the Personus query router. Parse natural language queries
    about finding people or organizations.
    
    Extract:
    - Intent: discovery/referral/availability/collaboration
    - Entity type preference: person/org/either
    - Skills/capabilities needed
    - Location constraints
    - Group context
    - Trust requirements
    
    Route to Query Planner for search structuring.`,
  tools: [queryPlannerTool, personaSearchTool, trustGraphTool],
});
```

### Value Conveyance Agent

```typescript
const valueConveyanceAgent = new Agent({
  name: "value-conveyance",
  model: openai("gpt-4o-mini"),         // Fast + cheap — runs per result
  instructions: `Generate a 2-4 sentence contextual summary explaining why this
    persona (person or organization) matches the user's query.
    
    Be specific about:
    - Which skills, strengths, or certifications are relevant
    - For orgs: mention verification status if official/verified
    - For people: highlight distinctive strengths
    - Reference query terms directly
    
    Write for conversational AI context — this text will be read aloud or
    displayed inline in chat.`,
});
```

### Contact Mediation Agent

```typescript
const contactMediationAgent = new Agent({
  name: "contact-mediation",
  model: openai("gpt-4o-mini"),
  instructions: `You triage inbound contact requests. For each request, generate:
    
    1. Triage note explaining relevance
       - Which openTo fields match
       - Sender context (endorsement path, group membership)
    
    2. Triage score (0-100)
       - 80-100: Highly relevant, matches multiple criteria
       - 50-79: Relevant, matches some criteria
       - 0-49: Weak match, may be spam
    
    3. Trust chain (if sender connected via endorsements)
       - Format: "Requester → [Person A] → You"
    
    For organizations, consider if request matches their services/openTo.
    For people, match against their skills/openTo.
    
    Be concise and factual. No marketing language.`,
});
```

---

## Persona Coach {#persona-coach}

Voice-first conversational interface for creating/improving personas. Adapts to person vs. organization entity type.

### Agent Definition

```typescript
const personaCoachAgent = new Agent({
  name: "persona-coach",
  model: openai("gpt-4o"),
  instructions: `You are the Personus Persona Coach. Guide users through creating
    rich persona portraits (person OR organization) through natural conversation.
    
    FOR PEOPLE:
    Draw out: headline, skills, distinctive strengths, values, openTo,
    currentFocus, location/service area, optional group context.
    
    FOR ORGANIZATIONS:
    Draw out: name, headline, services/skills, certifications, location,
    what makes them distinctive, what they're open to.
    
    TONE:
    - Warm, specific, encouraging
    - Ask one question at a time
    - Build on previous answers
    - Celebrate wins ("Love that!")
    
    PII GUARDRAILS:
    - Catch PII (phone, email, address with house number)
    - Never echo back PII
    - Redirect: "Let's save contact info for the contact settings"
    - Use "tell a friend" framing: "How would you describe yourself to a friend?"
    
    Adapt questions based on entity type.`,
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
```

### Conversation Arc (Person Persona)

**~7 turns, ~5 minutes, target: 85-88% completeness without group**

| Turn | Intent | Target Field | Layer |
|------|--------|--------------|-------|
| 1 | Welcome + entity type | — | — |
| 2 | "Describe yourself in one sentence" | headline | Base |
| 3 | "What do people come to you for?" | skills | Attribute |
| 4 | "What are you good at that wouldn't go on a resume?" | distinctiveStrengths | Attribute |
| 5 | "What matters to you in your work?" | values | Attribute |
| 6 | "What kinds of connections are you open to?" | openTo | Attribute |
| 7 | "Where do you operate / offer services?" | location, serviceArea | Base |
| 8 | "What are you focused on right now?" | currentFocus | Attribute |
| 9 | Wrap-up + optional group context prompt | — | — |

**Example conversation (person):**

```
Coach: Hi! Let's build your Personus profile. First — are we creating a 
       profile for you as a person, or for an organization you own?

User: For me as a person.

Coach: Perfect. Let's start simple — how would you describe yourself to 
       a friend in one sentence? What do you do?

User: I'm a software engineer who loves working on distributed systems.

Coach: Love that! [Headline set: "Software engineer • Distributed systems"]
       
       What do people come to you for? What skills or expertise do others 
       rely on you for?

User: I do a lot of Rust development, API design, and I help teams think 
      through distributed systems architecture.

Coach: Great! [Skills added: Rust, API design, distributed systems architecture]
       
       What are you good at that wouldn't necessarily show up on your resume?

User: I'm really good at explaining complex technical concepts in simple terms.

Coach: That's such a valuable skill. [Distinctive strength added]
       
       What matters to you in your work? What values guide how you approach things?

User: Open source, craftsmanship, and I care a lot about mentoring.

Coach: Beautiful. [Values added: open-source, craftsmanship, mentoring]
       
       What kinds of professional connections are you open to right now?

User: I'm interested in consulting opportunities and technical mentoring.

Coach: Perfect. [OpenTo added: consulting, technical mentoring]
       
       Where do you work from or offer your services?

User: I'm remote but based in the Bay Area. I work mostly with US-based 
      companies during US hours.

Coach: Got it. [Location: Bay Area, Service area: Remote (US hours)]
       
       Last one — what are you focused on right now? Any current projects 
       or initiatives?

User: Building a Rust-based game engine as a side project.

Coach: That's awesome! [Current focus added]
       
       You're at 85% completeness — really strong profile! Want to add 
       group-specific info like which neighborhood you're in or what 
       communities you're part of?

[User can continue or finish]
```

### Conversation Arc (Organization Persona)

**Adapts questions for organization context:**

```
Coach: Hi! Let's build your organization's Personus profile. What's the 
       name of your organization?

User: Silva Plumbing.

Coach: Great! How would you describe Silva Plumbing in one sentence?

User: We're a licensed residential and commercial plumbing service 
      serving San Francisco since 2018.

Coach: Perfect. [Headline set]
       
       What services does Silva Plumbing offer?

User: Residential plumbing, commercial repairs, bathroom remodels, 
      water heater installation.

Coach: Excellent. [Skills added]
       
       What makes Silva Plumbing different from other plumbing services?

User: We specialize in Victorian homes and offer same-day emergency service 
      with flat-rate pricing.

Coach: That Victorian home specialty is distinctive. [Distinctive strengths added]
       
       What kinds of opportunities is Silva Plumbing open to?

User: New clients, contractor partnerships, property management contracts.

Coach: Got it. [OpenTo added]
       
       Do you have any certifications or licenses you want to mention?

User: CA License C-36, insured and bonded, BBB A+ rated.

Coach: Wonderful, that builds trust. [Organization metadata: certifications added]
```

### Tools Used by Persona Coach

```typescript
const updatePersonaFieldTool = createTool({
  id: "update-persona-field",
  description: "Update a field on the persona being built",
  inputSchema: z.object({
    personaUri: z.string(),
    field: z.string(),
    layer: z.enum(["base", "attribute", "context"]),
    value: z.any(),
    groupId: z.string().optional(),
  }),
  execute: async ({ personaUri, field, layer, value, groupId }) => {
    // Update persona or membership depending on layer
    // Recompute embedding if embedded field changed
    // Recompute completeness score
    // Return updated completeness
  },
});

const checkPIITool = createTool({
  id: "check-pii",
  description: "Check text for PII. Returns boolean + detected types.",
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => {
    const patterns = {
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      email: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/,
      ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/,
      streetAddress: /\b\d{1,5}\s+\w+\s+(St|Ave|Blvd|Dr|Rd|Ln|Ct)\b/i,
    };
    
    const detected = Object.entries(patterns)
      .filter(([_, pattern]) => pattern.test(text))
      .map(([type]) => type);
    
    return {
      hasPII: detected.length > 0,
      detectedTypes: detected,
    };
  },
});

const getCompletenessTool = createTool({
  id: "get-completeness",
  description: "Get current completeness score for persona",
  inputSchema: z.object({
    personaUri: z.string(),
    groupId: z.string().optional(),
  }),
  execute: async ({ personaUri, groupId }) => {
    // Fetch persona, membership (if groupId), endorsement count
    // Run completeness algorithm from Doc 2
    // Return score + breakdown
  },
});
```

---

## Recommender Coach {#recommender-coach}

Voice-first conversational interface for creating endorsements and shadow personas. Lightweight by default, optional enrichment.

### Agent Definition

```typescript
const recommenderCoachAgent = new Agent({
  name: "recommender-coach",
  model: openai("gpt-4o"),
  instructions: `You are the Personus Recommender Coach. Help users quickly
    endorse people or organizations they trust.
    
    LIGHTWEIGHT FLOW (default):
    1. "What would you recommend?" → Multi-select categories OR custom
    2. For each: "Name and what makes them good?" → Quick one-liner
    3. Create shadow persona + endorsement immediately
    4. Offer batch mode: "Anyone else?"
    
    ENRICHMENT FLOW (optional, user-initiated):
    Use "tell a friend" framing for deeper testimonials.
    Extract: service description, distinctive strengths, relationship context.
    
    Works for PEOPLE and ORGANIZATIONS. Adapt questions accordingly.
    
    TONE:
    - Quick and encouraging
    - Don't labor on each recommendation
    - Make it feel easy to add multiple people
    - Celebrate network growth`,
  tools: [
    createShadowPersonaTool,
    enrichShadowPersonaTool,
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
```

### Lightweight Flow

**Target: Create shadow + endorsement in ~30 seconds**

```
Coach: Who do you know that you'd recommend? I can give you some 
       categories or you can tell me.
       
       [Shows categories: Plumber, Electrician, Accountant, Therapist, 
        Vet, Lawyer, + Add custom]

User: [Selects] Plumber

Coach: Great! What's their first name and what makes them good?

User: Marco — he saved our 1920s house from a pipe disaster, really 
      knows Victorian plumbing.

Coach: Perfect, Marco's added! [Shadow persona + endorsement created]
       
       Anyone else you'd recommend?

User: Yeah, an electrician — Lisa. Panel upgrades, explains everything, 
      fair pricing.

Coach: Awesome, Lisa's in! [Shadow + endorsement created]
       
       Anyone else?

User: I'm good for now.

Coach: You just helped two people get discovered by AI. Marco and Lisa 
       can claim these profiles anytime. Want to send them invite links?

User: Sure, send to Marco.

Coach: How should I reach Marco? Text, email, or just copy a link?

User: Just give me the link, I'll text him.

Coach: [Provides link] Done! Marco can claim his profile anytime.
```

### Batch Mode Implementation

```typescript
// Recommender Coach internal state
interface BatchState {
  categories: string[];
  shadows: {
    category: string;
    name: string;
    quickEndorsement: string;
    shadowId: string;
    endorsementId: string;
  }[];
}

// After each quick recommendation:
1. Extract: name, category (from context), one-liner
2. Call createShadowPersonaTool with entityType="person"
3. Call createEndorsementTool linking to shadow
4. Add to BatchState.shadows[]
5. Prompt: "Anyone else?"

// When user says "done" / "that's it":
6. Summary: "You just added [count] people!"
7. Offer invite sends (batch or individual)
```

### Enrichment Flow (Optional)

**User explicitly asks to add more detail to an existing shadow**

```
User: I want to add more detail about Marco.

Coach: Sure! Let's dig deeper on Marco. If a neighbor asked "should I 
       hire Marco?", what would you say?

User: Absolutely. He's not just good at plumbing — he really understands 
      these old SF houses. He took time to explain all our options, didn't 
      upsell us, and his pricing was totally fair. He's also just a really 
      trustworthy person.

Coach: That's a great testimonial. [Testimonial added to endorsement]
       
       What specifically has Marco worked on? Any particular skills?

User: Galvanized pipe replacement, leak detection, he's great with vintage 
      fixtures.

Coach: Perfect. [Skills enriched on shadow]
       
       What makes Marco different from other plumbers?

User: He's one of the few who really gets Victorian plumbing systems. And 
      he's bilingual — English and Spanish.

Coach: Excellent. [Distinctive strengths added]
       
       Marco's profile is now detailed! This'll help him get discovered for 
       exactly the right projects.
```

### Tools Used by Recommender Coach

```typescript
const createShadowPersonaTool = createTool({
  id: "create-shadow-persona",
  description: "Create shadow persona from quick capture",
  inputSchema: z.object({
    entityType: z.enum(["person", "organization"]),
    createdByPersonaUri: z.string(),
    serviceCategory: z.string().optional(),
    quickEndorsement: z.string(),      // The one-liner
    discoveryNote: z.string().optional(),
  }),
  execute: async (input) => {
    // AI extraction from quickEndorsement (see below)
    const extracted = await extractFromQuickEndorsement(
      input.quickEndorsement, 
      input.entityType
    );
    
    const shadow = await db.shadowPersonas.create({
      ...input,
      serviceDescription: extracted.serviceDescription,
      skills: extracted.skills,
      distinctiveStrengths: extracted.distinctiveStrengths,
      enrichmentStatus: "minimal",
      expiresAt: addDays(new Date(), 90),
    });
    
    // Generate embedding
    const embeddingText = buildShadowEmbeddingText(shadow);
    const embedding = await generateEmbedding(embeddingText);
    await db.shadowPersonas.update(shadow.id, { embedding });
    
    return shadow;
  },
});

const enrichShadowPersonaTool = createTool({
  id: "enrich-shadow-persona",
  description: "Add detailed information to existing shadow",
  inputSchema: z.object({
    shadowId: z.string(),
    serviceDescription: z.string().optional(),
    skills: z.array(z.string()).optional(),
    distinctiveStrengths: z.array(z.string()).optional(),
    serviceArea: z.any().optional(),
  }),
  execute: async (input) => {
    const { shadowId, ...updates } = input;
    
    const shadow = await db.shadowPersonas.update(shadowId, {
      ...updates,
      enrichmentStatus: "detailed",
    });
    
    // Regenerate embedding
    const embeddingText = buildShadowEmbeddingText(shadow);
    const embedding = await generateEmbedding(embeddingText);
    await db.shadowPersonas.update(shadowId, { embedding });
    
    return shadow;
  },
});

const createEndorsementTool = createTool({
  id: "create-endorsement",
  description: "Create endorsement for persona or shadow",
  inputSchema: z.object({
    fromPersonaUri: z.string(),
    toPersonaUri: z.string().optional(),
    toShadowPersonaId: z.string().optional(),
    relationshipType: z.string(),
    endorsementContext: z.array(z.string()),
    strength: z.enum(["strong", "standard"]),
    testimonial: z.string().optional(),
    discoveryContext: z.object({
      groupId: z.string().optional(),
      note: z.string().optional(),
    }).optional(),
  }),
  execute: async (input) => {
    // Create endorsement
    const endorsement = await db.endorsements.create(input);
    
    // Update endorsement count on target
    if (input.toShadowPersonaId) {
      await db.shadowPersonas.increment(input.toShadowPersonaId, "endorsementCount");
    }
    
    // Create ActivityEvent
    await db.activityEvents.create({
      userId: /* get from fromPersonaUri */,
      personaUri: input.fromPersonaUri,
      type: "endorsement_given",
      summary: `You endorsed ${/* target name */}`,
      payload: { endorsementId: endorsement.id },
    });
    
    return endorsement;
  },
});
```

### AI Extraction from Quick Endorsement

```typescript
async function extractFromQuickEndorsement(
  quickEndorsement: string,
  entityType: "person" | "organization"
): Promise<{
  serviceDescription: string;
  skills: string[];
  distinctiveStrengths: string[];
}> {
  const prompt = entityType === "person"
    ? `Extract from this quick recommendation about a PERSON:
       "${quickEndorsement}"
       
       Return JSON:
       {
         "serviceDescription": "brief role/service (e.g., 'Residential plumber')",
         "skills": ["skill1", "skill2", "skill3"],
         "distinctiveStrengths": ["what makes them special"]
       }
       
       Be concise. Extract only what's explicitly mentioned.`
    : `Extract from this recommendation about an ORGANIZATION:
       "${quickEndorsement}"
       
       Return JSON:
       {
         "serviceDescription": "what they do (e.g., 'Emergency vet clinic')",
         "skills": ["service1", "service2", "service3"],
         "distinctiveStrengths": ["what makes them stand out"]
       }`;
       
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Example extraction:**

Input: `"Marco — saved our 1920s house from pipe disaster, knows Victorian plumbing"`

Output:
```json
{
  "serviceDescription": "Residential plumber",
  "skills": ["pipe repair", "Victorian plumbing", "emergency service"],
  "distinctiveStrengths": ["Victorian home expertise", "emergency response"]
}
```

---

## Contact Mediation Agent {#contact-mediation-agent}

Generates AI triage for incoming contact requests.

### Implementation

```typescript
async function triageContactRequest(request: ContactRequest): Promise<{
  triageNote: string;
  triageScore: number;
  matchedOpenTo: string[];
  trustChain: string[];
}> {
  const targetPersona = await db.personas.get(request.toPersonaUri);
  const fromPersona = request.fromPersonaUri 
    ? await db.personas.get(request.fromPersonaUri)
    : null;
  
  const prompt = `Triage this contact request:
    
    TO: ${targetPersona.displayName} (${targetPersona.entityType})
    - Open to: ${targetPersona.openTo?.join(", ")}
    - Skills: ${targetPersona.skills?.map(s => s.name).join(", ")}
    
    FROM: ${fromPersona?.displayName || request.fromAnonymous?.displayName || "Anonymous"}
    ${fromPersona ? `- Skills: ${fromPersona.skills?.map(s => s.name).join(", ")}` : ""}
    
    REQUEST:
    - Reason: ${request.reason}
    - Message: ${request.message}
    
    Generate:
    1. Triage note (2-3 sentences explaining relevance)
    2. Triage score (0-100)
    3. Matched "open to" fields
    
    Be concise and factual.`;
  
  const response = await contactMediationAgent.generate(prompt);
  
  // Also compute trust chain
  const trustChain = fromPersona 
    ? await computeTrustChain(request.fromPersonaUri!, request.toPersonaUri)
    : [];
  
  return {
    triageNote: response.triageNote,
    triageScore: response.triageScore,
    matchedOpenTo: response.matchedOpenTo,
    trustChain,
  };
}
```

---

## Value Conveyance Agent {#value-conveyance-agent}

Generates contextual summaries for search results.

### Implementation

```typescript
async function generateContextualSummary(
  persona: Persona | ShadowPersona,
  query: string,
  matchExplanation: MatchExplanation,
  endorsements: Endorsement[]
): Promise<string> {
  const isOrg = persona.entityType === "organization";
  const verificationBadge = isOrg && persona.organizationMetadata?.verificationStatus !== "unverified"
    ? `(${persona.organizationMetadata.verificationStatus} verified)`
    : "";
  
  const prompt = `Generate a 2-4 sentence summary explaining why this ${isOrg ? "organization" : "person"} 
    matches the query "${query}".
    
    PERSONA:
    - Name: ${persona.displayName} ${verificationBadge}
    - Headline: ${persona.headline}
    - Skills: ${persona.skills?.join(", ")}
    - Distinctive: ${persona.distinctiveStrengths?.join(", ")}
    ${isOrg ? `- Certifications: ${persona.organizationMetadata?.certifications?.join(", ")}` : ""}
    
    MATCH:
    - Matched terms: ${matchExplanation.matchedTerms.join(", ")}
    - Matched fields: ${matchExplanation.matchedFields.join(", ")}
    
    ENDORSEMENTS:
    ${endorsements.map(e => `- ${e.from}: "${e.testimonial?.substring(0, 100) || e.endorsementContext.join(", ")}"`).join("\n")}
    
    Write conversationally. Be specific about WHY they match. Reference the query.`;
  
  const response = await valueConveyanceAgent.generate(prompt);
  return response.summary;
}
```

**Example output (person):**

Query: `"distributed systems engineer for consulting"`

Summary: `"Alex specializes in distributed systems architecture with deep Rust expertise. They're explicitly open to consulting and technical mentoring. Your coworker Priya gave them a strong endorsement specifically for 'explaining complex systems concepts clearly' — exactly what you'd want in a consultant."`

**Example output (organization):**

Query: `"emergency vet exotic animals SF"`

Summary: `"Bay Area Pet Hospital is a verified AAHA-accredited clinic specializing in exotic animal emergency care. They're one of the few SF clinics with 24/7 exotic specialists on staff. Three pet owners have endorsed them specifically for avian and reptile emergencies."`

---

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
  <meta name="description" content="Rust specialist and distributed systems engineer. Open to consulting and technical mentoring. Distinctive strength: explaining complex architecture clearly.">
  
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
  <meta property="og:title" content="Maya Chen - Distributed Systems Engineer">
  <meta property="og:description" content="Rust specialist open to consulting. Distinctive strength: explaining complex architecture clearly.">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://personus.ai/maya-chen">
  <meta property="og:image" content="https://personus.ai/og/maya-chen.png">
  
  <link rel="canonical" href="https://personus.ai/maya-chen">
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
          <strong><span itemprop="author" itemscope itemtype="https://schema.org/Person">
            <span itemprop="name">Priya Kumar</span>
          </span></strong> (colleague, strong endorsement)
        </p>
        <blockquote itemprop="reviewBody">
          "Maya's explanations of complex systems are unmatched. She mentored our 
          entire team through a critical architecture migration."
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
  
  "seeks": [
    "Consulting opportunities",
    "Technical mentoring",
    "Technical writing projects"
  ],
  
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
  
  "makesOffer": [
    "Emergency veterinary care",
    "Exotic animal medicine",
    "Surgery",
    "Dentistry"
  ],
  
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

*End of Public Web Discovery Section*

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
- Search: Public + authenticated personas + user's network + user's groups
- Rate limit: 100 requests/minute
- Scope: `scope: "my-network"` or `scope: "group"`
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
        enum: ["global", "my-network", "group"],
        description: `Search scope:
          - global: All public personas (works for all tiers)
          - my-network: Endorsed by you or your connections (authenticated only)
          - group: Within specific groups (authenticated only)
        `,
        default: "global"
      },
      groupIds: { 
        type: "array", 
        items: { type: "string" },
        description: "Limit to specific groups (requires authenticated tier + membership)"
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
      groupId: { 
        type: "string", 
        description: "Group context if applicable (optional)" 
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
    - Authenticated: Public + authenticated (if in your network) + your groups
    - Enterprise: Per license`,
    
  inputSchema: {
    type: "object",
    properties: {
      personaUri: { 
        type: "string",
        description: "Persona URI (from search results or URL)" 
      },
      groupId: { 
        type: "string", 
        description: "Group context for context layer fields (optional)" 
      },
    },
    required: ["personaUri"],
  },
}
```

**Tool 4: List My Groups**

```typescript
{
  name: "personus_list_groups",
  description: `List groups the authenticated user is a member of.
    
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
  scope: "group",
  groupIds: ["sunnyside-neighbors"],
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
you share the group with. Want me to request an introduction?"
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

Returns: Public personas only (no network/group filtering available)

Claude: "I found these web3 developers on Personus:

1. **Chen L.** - Smart contract security auditor
   • 5 endorsements
   • Skills: Solidity, security auditing, DeFi protocols
   • Open to: Contract audits, security consulting

2. [Additional results...]

Note: I'm searching public Personus profiles only. If you create a Personus 
account and connect it, I can search your network and groups for more 
personalized results."
```

---

### MCP Response Format

```typescript
interface PersonusSearchResponse {
  results: PersonaResult[];
  queryMeta: {
    tier: "anonymous" | "authenticated" | "enterprise";
    scope: "global" | "my-network" | "group";
    entityTypeFilter?: "person" | "organization";
    groupFilter?: string[];
    totalResults: number;
    matchedTerms: string[];
    searchMode: "explicit" | "ambient";
  };
}

interface PersonaResult {
  personaType: "full" | "shadow";
  entityType: "person" | "organization";
  
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
    employedAt?: string[];           // Org names (if person)
    staff?: string[];                // Person names (if org)
    parentOrg?: string;              // Parent org (if chapter)
  };
  
  // Trust signals (tier-dependent)
  endorsements: EndorsementSummary[];
  trustSignals?: {
    directEndorsement?: boolean;      // User endorsed this person
    endorsedByConnection?: string;    // Name of mutual connection
    trustPath?: string[];             // Chain: You → X → Target
    sameGroup?: string[];             // Shared groups
  };
  
  // Discovery
  contactMethod: "mediated" | "through-endorser";
  
  // AI-generated (per query)
  contextualSummary: string;
  matchExplanation: {
    matchedTerms: string[];
    matchedFields: string[];
    relevanceScore: number;
    trustScore?: number;              // Only for authenticated tier
  };
  
  // Actions
  actions: {
    requestIntroduction?: string;     // Only if can contact
    viewFullPersona: string;
  };
}

interface EndorsementSummary {
  from: string;                         // Display name
  relationship: string;
  strength: "strong" | "standard";
  context: string[];
  testimonial?: string;
  visibility: "public" | "authenticated";  // Respects privacy
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
- Network + group access
- Use case: Personal AI assistant

**Enterprise Tier:**
- Paid (pricing TBD)
- 1000 requests/minute
- Batch operations
- Priority support
- Analytics dashboard
- Use case: Recruiting, HR platforms, enterprise search

---

*End of MCP Tools Section*
## Workspace Integrations (Slack & Discord) {#workspace-integrations}

### Overview

Slack and Discord bots provide **group-backed** search and discovery within workspace contexts. These integrations are **workspace-wide** installations that connect to a Personus group.

**Key principle:** Members of the workspace = members of the Personus group

---

### Slack Bot Integration

#### Installation & Setup

**Admin Flow:**
1. Workspace admin installs Personus bot from Slack App Directory
2. OAuth flow: `https://personus.ai/integrations/slack/install`
3. Admin selects or creates Personus group to link
4. Bot joins workspace, members can use immediately

**Group Linking:**
- **New group:** Bot creates `"[Workspace Name] Team"` group in Personus
- **Existing group:** Admin selects from their owned groups
- **Sync:** Bot can optionally sync Slack members → Personus group invites

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
│ ● My groups (includes this workspace)      │
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
- New Slack member → Auto-invited to Personus group
- Left Slack → Group membership deactivated
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
3. Links to Personus group
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

### Group-Backed Data Model

**How Workspace Integration Works:**

```typescript
// PlatformIntegration entity (from Doc 2)
interface PlatformIntegration {
  id: string;
  groupId: string;                      // The linked Personus group
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
    autoSync: boolean;                 // Auto-invite workspace members to group
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
  scope: "group",
  groupIds: [integration.groupId],
  requestingPlatform: "slack",
  workspaceId: integration.slackWorkspaceId
}

// Search results are filtered to:
// 1. Members of the linked group
// 2. Optionally: public personas (if config.allowPublicSearch)
```

---

### Privacy & Permissions

**What Workspace Bots Can See:**
- Group members' public-facing profile data (within group)
- Group context layer data (role, department, etc.)
- Endorsements within the group (respecting visibility settings)

**What Workspace Bots CANNOT See:**
- PII (email, phone, address)
- Private personas outside the group
- Cross-persona connections
- Direct contact information

**Member Consent:**
- Members must claim/create their persona to appear in searches
- Members can control visibility per group
- Members can leave group (removes from workspace searches)

---

### Admin Dashboard

Workspace admins get analytics at `personus.ai/admin/groups/[groupId]/integrations`:

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
- Same group-backing model
- Same privacy enforcement

---

*End of Workspace Integrations Section*

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

*End of Agent Architecture & Conversational UX Document*

**Document Status: Ready for implementation**

**Next additions:**
- Error handling patterns (user confusion, off-topic queries)
- Agent handoff patterns (Coach → Recommender flywheel)
- Voice UX details (interruption handling, confirmation patterns)
- Analytics instrumentation for query patterns
