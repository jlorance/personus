---
type: guide
title: "Conventions and Patterns: Reusable Techniques from Building with AI"
description: "Technical and process patterns that emerged from the Personus.ai build, generalized for any AI-assisted product."
status: current
tags: [guides]
---

# Conventions and Patterns: Reusable Techniques from Building with AI

*Technical and process patterns that emerged from the Personus.ai build, generalized for any AI-assisted product.*

---

## Introduction

None of the patterns in this guide were planned on day one. They emerged through iteration -- through hitting a problem, solving it, and then noticing that the solution was general enough to use again. Some came from the founder's instincts. Some came from the AI's suggestions. Most came from the collision between the two.

These patterns are not specific to Personus. They apply to any product built with AI assistance: a SaaS app, a marketplace, an internal tool, a consumer product. Each one solved a real problem encountered during a nine-day build that produced 20 database tables, four AI agents, a consumer-grade dashboard, and ~700KB of specification documents. They are organized by when you are most likely to need them: project setup, design, development, and AI collaboration.

---

## Part 1: Project Setup Patterns

### CLAUDE.md as Living Context

The most impactful single file in the Personus project was not a schema definition or a React component. It was a markdown file at the repository root named `CLAUDE.md`. AI coding tools read this file automatically at the start of every session, which makes it the most reliable way to establish context without repeating yourself.

**What to put in it:**

- Project overview (2-3 sentences -- what the product does, who it is for)
- Commands (build, test, lint, dev server, database operations)
- Tech stack with exact versions (not "React" -- "React 19.2")
- Directory layout with one-line descriptions of each directory's purpose
- Key architectural patterns (3-5 that affect every file touched)
- Terminology glossary (what internal terms mean, what user-facing terms replace them)
- Configuration gotchas (things that will trip up any agent not warned about them)
- Development conventions (validation, constants, error handling patterns)

**What NOT to put in it:** Session-specific context ("we are currently working on the inbox"), in-progress decisions ("we might switch from Clerk to Auth0"), speculative conclusions ("this approach should scale to 1M users"). Anything uncertain or ephemeral pollutes the context and misleads future sessions.

**How it evolves:** Start minimal -- just commands and a project overview. After each major architectural decision, add the pattern. After each painful debugging session, add the gotcha. After each convention is established, document the expected usage. Remove outdated information actively; stale guidance is worse than no guidance.

The Personus CLAUDE.md grew from 20 lines to over 200 lines across nine days, accumulating architectural knowledge that made every subsequent session more productive than the last.

### Memory Files for Cross-Session Continuity

CLAUDE.md captures stable facts. Memory files capture evolving state. Claude Code supports a memory directory that persists across conversations, and it serves a different purpose: tracking what has happened, what was decided, and what is planned.

**What belongs in memory:**

- Project state (what is built, what is next)
- Key decisions with rationale ("chose CASL over Casbin because no sidecar, ABAC support, isomorphic")
- Gotchas discovered during debugging
- File structure changes and why they happened
- Naming renames and the reasoning behind them

**The critical discipline:** Memory files must be curated, not dumped. Outdated memories are worse than no memories -- they send future sessions down dead-end paths with confidence. When a decision is reversed, update the memory. When a planned feature is dropped, remove it. Treat memory files like a living changelog, not an append-only log.

### Spec Doc Numbering and Cross-Referencing

With eleven specification documents and growing, organization is load-bearing infrastructure, not a nice-to-have.

**The pattern:**

- Number docs sequentially: `01-vision-and-principles.md` through `12-persona-layout.md` (in `docs/foundation/`)
- Use titles that describe scope, not topic: "Foundation and Principles" is clearer than "Overview"
- Cross-reference by doc number in other documents: "See Doc 09, Authorization Model"
- Maintain a manifest (`MANIFEST.md`) listing every doc with a one-line description
- Group related docs into subdirectories: core specs, research, business model, guides

What this enables: any agent, in any session, can navigate the full specification set without asking "where is the auth spec?" The numbering creates a shared coordinate system between human and AI.

---

## Part 2: Design Patterns

### Metadata-Driven Rendering

Instead of writing a custom component for every data type, define rendering behavior in a metadata table.

```typescript
// trait_metadata row:
{ key: "skills", displayConfig: { type: "tag_list", badgeColor: "blue" },
  editConfig: { type: "multi_item_form", fields: ["name", "level"] } }
```

A dispatcher component reads the metadata and routes to the appropriate renderer. Adding a new trait type means adding a row to the seed table. No code changes, no new components, no deployment.

This pattern works anywhere you have a finite set of types that may grow: form fields, dashboard widgets, notification types, permission rules, community configurations. The key question is: "Will we add more of these?" If the answer is yes, make them data-driven.

**Why it matters for AI-assisted builds:** When types are data-driven, the AI can add new ones by modifying data rather than code. This eliminates the risk of AI-generated components conflicting with existing ones and keeps the codebase architecturally stable as features expand.

### Hybrid JSONB Storage

The choice between structured columns and flexible JSONB does not have to be all-or-nothing.

**The pattern:** Structured columns for queryable, filterable fields (name, type, visibility, dates). A single JSONB column for flexible, type-varying attributes (traits, preferences, settings).

```sql
-- Structured: always queried, always the same shape
display_name TEXT NOT NULL,
entity_type TEXT NOT NULL,
visibility TEXT DEFAULT 'connections',
-- Flexible: varies by persona type, grows over time
traits JSONB DEFAULT '{}'
```

This gives you fast database queries on structured fields, no schema migrations for new attribute types, GIN indexes for JSONB containment queries, and TypeScript interfaces defining the JSONB shape for app-layer type safety. The hybrid approach avoids both over-normalization (a separate table for every attribute type) and schema chaos (everything in one JSON blob with no structure at all).

### Seed Data as Design Validation

Seed data is not just for testing. It is a design tool.

**What good seed data reveals:**

- Layout issues (does a 200-character headline break the card component?)
- Search quality (do embedding-based queries find relevant results?)
- Empty state gaps (what does the UI look like with 1 persona vs. 37?)
- Permission edge cases (can a visitor see what they should not?)
- Data model gaps (does the schema support all realistic scenarios?)

**What good seed data looks like:**

Base it on real-world examples. Research actual people, companies, and organizations in your target domain rather than generating "Test User 1" with skill "Programming." Include variety: different entity types, visibility levels, community configurations. Include sparse data: not every record should be complete. Some should have only a name and headline, because that is what most real users look like on day one. Include relationships: endorsements between personas, community memberships, pending contact requests. These relationships are where most bugs hide.

The Personus seed dataset -- 32 users, 37 personas, 8 communities, 42 memberships, 42 endorsements, 6 shadow personas, 8 contact requests, 15 activity events -- caught more specification gaps during seeding than any other phase of the build.

### Data-Driven Configuration

When you find yourself reaching for a hardcoded enum or a switch statement with more than three cases, consider making it data-driven.

**The pattern:** Define types as data (a seed table or a configuration object). Define behavior as metadata on those types. Write generic code that dispatches on the metadata.

```typescript
// Instead of:
switch (communityType) {
  case 'guild': return <GuildLayout />;
  case 'club': return <ClubLayout />;
  // ... 7 more cases
}

// Do this:
const typeConfig = await getCommunityType(community.communityType);
return <CommunityLayout config={typeConfig} />;
```

Personus applied this to community types (9 types defined in a seed table with trait schemas, feature flags, and defaults), trait types (13 types in a metadata table with display and edit configurations), and layout presets (5 presets defined as configuration objects). In every case, the generic dispatcher was simpler than the switch statement it replaced, and adding new types required zero code changes.

---

## Part 3: Development Patterns

### Validation at the Boundary

Use Zod schemas as the single source of truth for input validation. The same schema validates server action inputs (prevents bad data in the database), form inputs via resolver (prevents bad UX), and API inputs (prevents bad external data).

```typescript
// lib/validations/personas.ts — single source of truth
export const createPersonaSchema = z.object({
  displayName: z.string().min(1).max(100),
  entityType: z.enum(ENTITY_TYPES),
  visibility: z.enum(VISIBILITY_LEVELS),
});

// Server action: validates before DB write
const data = createPersonaSchema.parse(raw);

// Form component: validates before submission
const form = useForm({ resolver: zodResolver(createPersonaSchema) });
```

One file per domain in `lib/validations/`. Barrel export. Import in both server actions and form components. When the schema changes, both validation layers update simultaneously.

### Constants, Not String Literals

Never hardcode repeated string values. Export typed constants from a single file.

```typescript
export const ENTITY_TYPES = ['person', 'organization'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
```

Three lines give you runtime iteration (for dropdowns and validation), TypeScript narrowing (the compiler knows the exact values), and a single place to update when types change. The alternative -- string literals scattered across server actions, components, and schema files -- guarantees that a rename will miss at least one location.

### Auth Abstraction Layer

Even if you are committed to one auth provider today, put a thin abstraction in front of it.

```
lib/auth/provider.ts  — the interface (getCurrentUser, requireAuth, etc.)
lib/auth/clerk.ts     — the Clerk implementation
lib/auth/index.ts     — re-exports the configured provider
```

The cost is roughly 50 lines. The benefit is that switching providers -- or testing without a provider -- never requires touching server actions, components, or API routes. Every consumer imports from `@/lib/auth` and does not know or care which implementation is behind it.

### Error Boundaries at Route Group Level

A single global error boundary is not enough. Add `error.tsx` and `loading.tsx` at each route group.

```
app/error.tsx                — global fallback
app/(dashboard)/error.tsx    — dashboard-specific errors (auth failures, data issues)
app/(dashboard)/loading.tsx  — dashboard streaming skeleton
```

Dashboard errors can show "Sign in again" with a redirect. Global errors can show a generic fallback. Loading states can display layout-appropriate skeletons rather than a full-page spinner. The granularity costs minutes to set up and prevents the "white screen of death" that sends users away permanently.

---

## Part 4: AI Collaboration Patterns

### The Conversational Ratchet

Each artifact constrains the next conversation. This is the fundamental pattern of spec-driven AI development.

1. Vision doc establishes principles. Principles constrain data model decisions.
2. Data model establishes entities. Entities constrain UI views and server actions.
3. UI spec establishes flows. Flows constrain implementation tasks.
4. Implementation reveals gaps. Gaps feed back into specs.

The ratchet only works if you reference earlier documents in later prompts. "Looking at the principles in doc 01, how should we handle visibility for this feature?" forces the AI to maintain coherence across sessions and across weeks. Without explicit references, the AI treats each conversation as independent, and decisions drift.

### Parallel Agent Strategy

Not everything needs to be sequential. Independent work streams can and should be parallelized.

**Safe to parallelize:**

- Different UI pages that do not share components
- Server actions for different domains (personas vs. communities vs. endorsements)
- Research on unrelated topics
- Schema files for unrelated tables

**Must be sequential:**

- Shared component library, then pages that consume those components
- Schema definition, then seed data, then queries that depend on both
- Validation schemas, then server actions that import them

The specs are the coordination mechanism. Each agent reads the relevant spec and builds to it. If the specs are precise enough -- down to component names, data shapes, and edge cases -- parallel agents produce code that integrates cleanly without a human wiring session in between.

### The Three-Pass Pattern

For complex features, use three passes rather than trying to get everything right in one prompt.

1. **Spec pass:** Define what it does. Write or refine the specification. Do not touch code.
2. **Build pass:** Implement the spec. Follow it faithfully. Do not redesign mid-implementation.
3. **Polish pass:** Review against consumer UX standards. Mobile responsiveness, empty states, loading skeletons, hover states, transitions.

Attempting all three in one prompt produces mediocre results across the board. The AI optimizes for the most concrete instruction, which is usually the implementation, and gives the spec and polish work superficial attention. Three focused passes produce better outcomes than one ambitious pass.

### Periodic Consolidation

After three or four sessions of building, stop and consolidate.

- Update CLAUDE.md with patterns that have stabilized
- Review spec docs for terminology inconsistencies (the "collective vs. community" problem)
- Run type-check, linting, and tests -- fix what has drifted
- Update memory files with decisions made and questions resolved
- Do a cross-document terminology audit

This prevents drift. Without periodic consolidation, each session makes locally correct decisions that globally contradict each other. The cost is 30-60 minutes every few days. The alternative is a multi-hour reconciliation session when the inconsistencies become impossible to ignore.

---

## Closing

These patterns share a common trait: they create structure that makes both human and AI work more effective. CLAUDE.md keeps context stable across sessions. Metadata-driven rendering keeps the codebase stable across feature additions. The conversational ratchet keeps design decisions stable across weeks. Periodic consolidation keeps everything aligned as the project grows.

The next guide in this series covers implementation and parallel agents -- taking these patterns from convention into working, tested code.

---

*This is Part 4 of the Building with Claude series. [Part 1: From Idea to Codebase in 9 Days](/guides/01-journey-overview.md) tells the full narrative. [Part 2: The Prompting Playbook](/guides/02-prompting-playbook.md) provides annotated real prompts. [Part 3: The Phase Guide](/guides/03-phase-guide.md) walks through the repeatable methodology.*
