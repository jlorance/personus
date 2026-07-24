---
type: guide
title: "From Idea to Codebase in 9 Days: Building Personus.ai with Claude"
description: "A solo founder's guide to treating AI as a design partner, not just a code generator."
status: current
tags: [guides]
---

# From Idea to Codebase in 9 Days: Building Personus.ai with Claude

*A solo founder's guide to treating AI as a design partner, not just a code generator.*

---

## Introduction

Personus.ai is an AI-native social network for capability-based discovery. Users build a master collection of their traits -- skills, experience, values, and interests -- then create multiple personas that selectively publish different facets of who they are. The platform enables mediated contact, endorsements, shadow personas, and AI-powered semantic search -- so that when an AI agent needs to find a plumber, a Kubernetes expert, or a doula, it has a structured, trust-backed network to query.

This guide is about how it was built. In nine days, a solo founder went from a loose concept about personal identity in the age of AI agents to a feature-rich, typed, tested codebase: 20 database tables, four AI agents wired to real data, a consumer-grade dashboard, nearly 700KB of specification documents, and a full business model. Not by writing all the code by hand. Not by prompting an AI to "build me an app." By treating Claude as a design partner -- someone who brings breadth, speed, and tireless consistency to a process where the human brings taste, judgment, and conviction.

The thesis is simple: a solo founder can produce work that rivals a small team's output over months, but only if they use AI correctly. That means starting with principles, not prompts. It means writing specs before code. It means knowing when to accept the AI's recommendation and when to override it with your own instinct. This guide walks through the seven phases of the Personus build, what was produced at each stage, and what made the approach work. It is written for solo founders and builders who want to go from concept to working product with AI as a co-pilot -- and who want to understand the method, not just see the result.

---

## Phase 1: Vision and Principles

**Day 1**

The project started not with a feature list or a wireframe, but with a question: what happens to personal identity when AI agents start acting on our behalf? If your assistant is negotiating, shopping, or scheduling for you, what controls exist over what it shares about you? The answer, it turned out, was essentially nothing. That gap became the seed.

The first working session produced a foundation spec: the product vision, core principles, and eight priority use cases. The principles were deliberately abstract -- "privacy-preserving personas," "trust-backed discovery," "user agency over data disclosure" -- because they needed to survive contact with every subsequent decision without becoming stale.

**Produced:** Foundation spec (~30KB), core principles, eight priority use cases, three interconnected product pillars (People Discovery, Commerce Agency, Community Intelligence).

**Artifact:** `docs/foundation/vision.md`, `docs/foundation/principles.md`

**Takeaway:** Start with "why" not "what." The principles become guardrails for every decision that follows. When you later argue about whether a feature should be gated or free, you go back to the principles and the answer is usually already there.

---

## Phase 2: Data Model Design

**Days 1-2**

This was the most consequential phase. The core tension: how do you store something as varied as human identity -- skills, work history, hobbies, languages, values -- in a way that is both queryable by AI and flexible enough to accommodate traits nobody has thought of yet?

The answer was a hybrid approach. Structured columns for the things you always need to query (display name, visibility level, entity type) and a JSONB column for the flexible, evolving attributes (skills, experience, focus areas). On top of that, a metadata-driven rendering system: a `trait_metadata` table that tells the UI how to display and edit each trait type, so adding a new kind of trait never requires a code change.

The persona model took shape as three layers. A base layer (name, headline, avatar). An attribute layer (the JSONB traits selected from the user's master pool). A context layer (community-specific data, like a member's role or contribution history, stored separately). This layered approach meant a single user could present completely different professional identities to different audiences, with privacy isolation baked in at the data level.

The conversations were iterative and occasionally contentious. The AI suggested full normalization at one point; the founder pushed back, arguing that the query patterns did not justify the join complexity. They settled on the hybrid model after working through concrete scenarios: "What happens when a user adds a trait type we haven't anticipated?" and "How does a persona's skill list differ from the master pool's?" Each question refined the schema.

**Produced:** 20 tables across 13 schema files, trait metadata system, three-layer persona model (base, attribute, context), pgvector embeddings for semantic search.

**Artifact:** `docs/foundation/data-model.md`, `lib/db/schema/` (13 files)

**Takeaway:** The data model is your product's skeleton. Spend disproportionate time here. Every shortcut in the schema becomes a tax on every feature built on top of it.

---

## Phase 3: Research and Validation

**Days 2-3**

Before writing a line of implementation code, the project took a deliberate detour into research. The AI was pointed at specific landscapes and asked to survey them exhaustively: the AT Protocol ecosystem (Bluesky, Atmosphere apps, decentralized identity), consumer UX patterns (Apple Music's card-based layouts, SoundCloud's social discovery), professional identity conventions (LinkedIn's attribute taxonomy, Match.com's progressive disclosure), and the emerging agentic commerce space.

The most significant finding was strategic: no professional identity application existed on the AT Protocol. Bluesky had roughly 40 million registered users and a growing developer ecosystem, but every Atmosphere app focused on media or social posting. A structured identity layer was a gap in the market.

Other research informed design decisions directly. Apple Music's immersive card patterns shaped the visual direction. LinkedIn's attribute naming (and its weaknesses) informed the trait taxonomy. The agentic commerce research validated the commerce persona concept.

**Produced:** Eight research documents totaling ~140KB, a naming plan with specific rename decisions, competitive landscape analysis.

**Artifact:** `docs/research/` directory (8 documents)

**Takeaway:** Use AI to survey landscapes exhaustively -- it can synthesize dozens of sources in minutes. But apply your own taste to the synthesis. The AI will give you a balanced overview; you need to decide what matters.

---

## Phase 4: Architecture Decisions

**Days 3-4**

Each architecture decision followed the same pattern: the founder stated the problem, the AI presented three to five options with tradeoffs, and the founder chose -- sometimes following the recommendation, sometimes overriding it.

Authentication landed on Clerk, with an abstraction layer so the provider could be swapped later. Authorization was more interesting: after evaluating Casbin, Cerbos, OpenFGA, and Permit.io, the project chose CASL -- a fully embedded library with no sidecar process, MongoDB-like conditions for attribute-based access control, and isomorphic execution (same rules on server and client). The authorization model split into two layers: CASL ability definitions for the 80% of checks that are straightforward, and a permissions orchestration layer for the 20% that require multi-step reasoning (cross-persona link visibility, compound endorsement checks, contact authorization flows).

The agent architecture chose Mastra, running inside the Next.js process rather than as a separate service. Four agents emerged: Persona Coach (voice-first profile creation), Recommender Coach (endorsements and shadow personas), Discovery Agent (semantic search), and Community Coach (community creation and management). All wired to real database operations, not mocks.

One decision deserves special mention. The original data model used "collective" as the umbrella term for groups, guilds, organizations, and similar entities. During a review session, the founder said something like: "Nobody is going to call their book club a collective. That is internal language." The rename from "collective" to "community" touched every spec doc, every schema file, and every piece of seed data. It was the right call. The AI executed the mechanical rename across hundreds of references; the human caught the conceptual misalignment that triggered it.

**Produced:** Authorization model (CASL + Clerk), agent architecture (four Mastra agents), community abstraction (nine data-driven types), AT Protocol integration design.

**Artifact:** `docs/foundation/authorization.md`, `docs/specs/communities/guilds-prd.md`, `docs/foundation/agents.md`

**Takeaway:** Make architecture decisions as structured conversations. The AI brings breadth -- it knows more options than you do. You bring judgment -- you know which tradeoffs your project can live with.

---

## Phase 5: UX and UI Specification

**Days 4-6**

This phase consumed the most time and produced the most iteration. The AI's instinct was to produce developer-facing interfaces: clean, functional, label-heavy. The founder kept pushing toward a consumer product -- the kind of thing you would enjoy using on your phone at 10pm, not the kind of thing that feels like filling out a form.

The push manifested in specifics. "Traits" became an internal word; users see "Profile Overview." The hero prompt pattern replaced a generic dashboard greeting with a rotating contextual card -- "Who deserves recognition today?" instead of a static welcome message. The "You Card" concept emerged: a compact, portable representation of a persona that could appear anywhere, like an identity business card. Layout presets (five of them: Professional, Creative, Connector, Specialist, Minimal) let users choose a personality for their profile page without touching configuration.

The largest artifact was the visual UI spec at ~83KB -- a comprehensive document covering every screen, every state, every responsive breakpoint. The component guide specified metadata-driven rendering: trait display and editing configured via database records, not hardcoded React components.

**Produced:** 83KB UI spec, layout preset system (five presets), component architecture guide, consumer UX research synthesis.

**Artifact:** `docs/foundation/vision.md` (UX flows), `docs/foundation/architecture.md` (layout strategy), `docs/patterns/ui-components.md`

**Takeaway:** UX is where human taste matters most. The AI will produce something competent and conventional. Your job is to keep redirecting it toward real-user language, toward delight, toward the product you would actually want to use.

---

## Phase 6: Business Model

**Day 7**

With the product fully specified, the conversation turned to how it would sustain itself. The AI surveyed comparable platforms' pricing, modeled unit economics, and proposed several revenue architectures. The founder's values shaped the outcome: Personus would be a Public Benefit Corporation. Discovery would never be gated. Community creation would be unlimited on every tier.

The result was a four-tier model (Solo, Community Organizer, Pathfinder, Enterprise) with a novel "Sparks" credit system -- a generosity engine where users earn and spend credits for endorsements, introductions, and premium features. The competitive landscape analysis positioned Personus against LinkedIn, Polywork, and emerging decentralized identity platforms.

**Produced:** Five business model documents totaling ~75KB, covering executive summary, packaging and pricing, the Sparks system, growth model and unit economics, and competitive positioning.

**Artifact:** `docs/business-model/` (5 documents)

**Takeaway:** Business model design benefits enormously from AI's ability to model scenarios and survey competitors. But pricing instinct and values -- what should be free, what should be gated, what kind of company this should be -- are fundamentally human decisions.

---

## Phase 7: Implementation

**Days 7-9**

Implementation began with a gap analysis: the AI compared every spec document against the existing codebase and produced a prioritized build list. Because the specifications were precise -- down to the component names, prop types, and responsive breakpoints -- the actual coding was closer to translation than invention.

The build proceeded on multiple fronts simultaneously. Dashboard CRUD for personas. Coach chat with persona picker, message history, and completeness sidebar. Inbox with contact request management. Mobile-responsive navigation. Settings pages with import and MCP exposure controls. The persona detail page with endorsement display, shadow persona management, and claim flows.

The database was seeded with realistic data: 32 users, 37 personas, 8 communities, 42 community memberships, 42 endorsements, 6 shadow personas, 8 contact requests, and 15 activity events. This seed data was not an afterthought -- it served as design validation. Realistic data exposes specification gaps that synthetic examples miss. When the seed script populated a persona with seven skills and three focus areas, it became obvious which card layouts worked and which ones broke.

Claude Code's parallel agent capability proved valuable here. Independent work streams -- database seeding, UI components, server actions, test scaffolding -- could proceed concurrently. The CLAUDE.md file and memory documents kept each agent context-aware.

**Produced:** Full application codebase with dashboard, persona CRUD, coach chat, inbox, settings, public persona pages, endorsement and shadow flows. 20 tables pushed and seeded. Tests passing. Zero type errors.

**Artifact:** The entire codebase.

**Takeaway:** Good specifications make implementation almost mechanical. The hard thinking -- the debates about data models, the back-and-forth about naming, the UX iterations -- happened in the earlier phases. By the time code was being written, most decisions were already made.

---

## What Made This Work

**The conversational ratchet.** Each document constrained the next. The foundation principles constrained the data model. The data model constrained the agent architecture. The agent architecture constrained the UI spec. By the time implementation started, the solution space was narrow enough that code almost wrote itself. This compounding constraint is the most powerful aspect of spec-first development with AI.

**CLAUDE.md as living context.** A single markdown file at the project root kept the AI grounded across sessions. It contained the tech stack, the directory layout, the key architectural decisions, and the known gotchas. Every session started with the AI reading this file and understanding where things stood. Without it, each conversation would have started from scratch.

**Memory files for cross-session continuity.** Beyond CLAUDE.md, a project memory file tracked decisions, renamed terms, schema changes, and open questions. When the "collective to community" rename happened, it was logged with the rationale. When a schema field was added, the memory file noted why. This gave each new session a running history of the project's evolution.

**Human taste applied at key moments.** The AI never once suggested renaming "collective" to "community." It never pushed back on developer-facing language in the UI. It never said "this pricing feels wrong." Those interventions came from the founder, and they shaped the product's character. The AI's role was to execute on that taste at scale and with consistency.

**Spec-first, code-second.** Not a single line of application code was written without a spec backing it. This discipline felt slow during the first four days. It paid dividends tenfold during the last three. Developers who skip specs and go straight to code with AI end up with something that works but that nobody thought through -- the AI equivalent of building without blueprints.

**Parallel agents for independent work streams.** Once the specs were solid, multiple Claude Code agents could work on independent features simultaneously. One agent built the inbox while another worked on seed data while a third wired up the coach chat. The specs served as the coordination mechanism -- no standup meetings required.

**Seed data as design validation.** Realistic data is a spec's best critic. Abstract descriptions of "a persona with skills" become concrete when you actually populate 37 personas with real-looking data and see how the UI handles variation. Several specification gaps were caught and fixed during seeding, not during user testing.

---

## What to Read Next

This guide is the first in a five-part series on building with Claude. The subsequent guides go deeper into each aspect of the process:

- **02 - Specification-Driven Development:** How to write specs that an AI can implement faithfully, the conversational ratchet in detail, and when specs need to be rewritten vs. amended.
- **03 - Architecture Decisions with AI:** The structured evaluation pattern, when to override AI recommendations, and how to document decisions for future sessions.
- **04 - UX Iteration and Human Taste:** Where AI-generated design falls short, the specific interventions that shaped Personus's consumer feel, and how to establish a design voice.
- **05 - Implementation and Parallel Agents:** The gap analysis workflow, parallel agent coordination, seed data strategy, and shipping a typed, tested codebase.

---

*Personus.ai is open for early collaborators. The codebase, specifications, and this guide series represent a real product built by a real founder with AI as a genuine partner in the process.*
