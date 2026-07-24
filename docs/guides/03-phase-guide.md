---
type: guide
title: "The Phase Guide: A Step-by-Step Walkthrough for Building a Product with AI"
description: "A repeatable methodology for solo founders, distilled from the Personus.ai build. What to do in each phase, in what order, and what pitfalls to avoid."
status: current
tags: [guides]
---

# The Phase Guide: A Step-by-Step Walkthrough for Building a Product with AI

*A repeatable methodology for solo founders, distilled from the Personus.ai build. What to do in each phase, in what order, and what pitfalls to avoid.*

---

## Introduction

Building a product with AI is not a single activity. It is seven distinct phases, each with different inputs, different modes of thinking, and different failure modes. The most common mistake solo founders make with AI tools is collapsing these phases -- jumping from a rough idea to "build me this feature" and wondering why the output feels generic, inconsistent, or wrong in ways that are hard to articulate.

This guide distills the Personus.ai build process into a repeatable methodology. Personus went from concept to feature-rich codebase in nine days: 20 database tables, four AI agents, a consumer-grade dashboard, ~700KB of specs, and a full business model. Not because the founder typed fast, but because each phase produced artifacts that constrained and accelerated the next. The conversational ratchet -- where each document narrows the solution space for everything downstream -- is the core mechanism. Without it, you get speed without direction.

You do not need to follow this exactly. Your product is not Personus, and your instincts will lead you to different emphases. But having the phases in mind prevents the most expensive failure mode in AI-assisted development: writing code before the design is solid, then paying for it in rewrites, inconsistency, and a product that works but that nobody thought through.

---

## Before You Start: Prerequisites

Before Phase 1, you need five things in place. None of them need to be perfect.

- **A clear problem statement**, even if rough. "I want to build a social network for professional identity in the age of AI agents" is sufficient. "I want to build an app" is not.
- **A chosen tech stack**, or willingness to let the AI recommend one. If you have preferences (Next.js, Rails, whatever), state them early. If you do not, the AI will recommend something reasonable and you can adjust.
- **Claude Code (or a similar AI coding tool) set up and working.** Ensure you can start a session, that the tool can read and write files, and that your development environment runs.
- **A CLAUDE.md file with project context**, even a stub. This file is the AI's memory. Start with your project name, your tech stack, and a one-paragraph description. You will expand it continuously. Without it, every session starts from zero.
- **Willingness to iterate.** The first version of every spec will be wrong. The first schema will need revision. The first UI will feel too developer-facing. This is not failure -- it is the process working correctly. Iteration is the mechanism, not a sign of problems.

---

## Phase 1: Vision and Principles

**Goal:** Establish the "why" before the "what."

**Time:** Half a day to a full day.

**Inputs:** Your idea, your instincts about the problem space, reference products you admire, any notes or sketches you have accumulated.

**Activities:**

- Write or dictate your product vision to the AI. Do not worry about structure -- let it organize your thoughts. A stream-of-consciousness dump produces better foundation documents than a carefully outlined brief, because the AI can extract structure from chaos but cannot inject insight into a sterile outline.
- Ask the AI to identify the core principles (usually 5-8) that should guide every decision. Then push back on them. Generic principles like "user-first" and "scalable" are useless. Good principles are specific enough to settle arguments. "Discovery is never gated" settled a dozen pricing and feature decisions during the Personus build without further discussion.
- Define 6-10 priority use cases as user stories. Be specific -- name the user, describe their situation, and walk through what happens. "A freelance plumber wants to be discoverable to AI agents looking for local services without publishing personal contact information" is a use case. "Users can create profiles" is a feature label.
- Ask the AI to challenge your assumptions. "What am I missing?" and "What use case would break this model?" are powerful prompts. The AI will not volunteer criticism unless you ask for it.

**Outputs:** A foundation document (10-30KB) covering vision, principles, use cases, and terminology. This becomes the document that every subsequent decision references.

**Pitfalls to avoid:**

- **Skipping this phase.** Jumping to data model or UI without principles leads to incoherent products. You will spend more time fixing inconsistencies later than you would have spent writing a foundation doc.
- **Accepting generic principles.** If your principles could apply to any product, they are not principles -- they are platitudes. Push the AI until the principles feel like actual constraints on what your product will and will not do.
- **Trying to be comprehensive.** You will refine the foundation doc as you go. Aim for directionally correct, not complete. Version one is meant to be version one.

**When to move on:** When you can explain your product's "why" in two sentences and your principles feel like constraints that would cause you to reject certain feature requests.

---

## Phase 2: Data Model Design

**Goal:** Design the data structures that represent your product's core concepts.

**Time:** One to two days. This is worth the investment.

**Inputs:** Foundation document, use cases, initial terminology.

**Activities:**

- Start with entities, not tables. Ask "what are the nouns in this product?" Each noun is a candidate entity. A user, a persona, a community, an endorsement, a contact request -- these are the building blocks.
- For each entity, decide: structured columns vs. flexible JSONB vs. hybrid. This is the most consequential choice in your schema. Structured columns are queryable and type-safe but rigid. JSONB is flexible but opaque to the database. Hybrid (structured for queryable fields, JSONB for flexible attributes) is often the right answer for products where user-generated content varies in shape.
- Design the relationships. Describe (or ask the AI to diagram) the entity-relationship model. Every foreign key is an assertion about how your product works. Review them carefully.
- Consider extensibility: will new types be added by code changes or by data? Data-driven is almost always better. Personus made community types a seed table rather than an enum, which meant adding a tenth community type required zero code changes. Hardcoded enums become refactoring nightmares.
- Ask the AI to generate the schema files. Review them carefully -- the AI tends to over-normalize (a separate table for everything) and under-index (missing the queries your product will actually run).
- Create seed data early. Even placeholder seed data forces you to think concretely about what your entities look like with real content. "A persona with skills" is abstract. A persona named "Charlotte De Witte" with skills in "DJ performance, techno production, label management" is concrete and reveals whether your schema handles real-world variation.

**Outputs:** Complete schema (typed ORM definitions), seed data, and a data model specification document.

**Pitfalls to avoid:**

- **Over-normalization.** Do not create a separate table for something that could be a JSONB field. If you will never query it independently, it does not need its own table.
- **Under-thinking indexes.** Ask the AI "what queries will this product need?" and index accordingly. An unindexed query on a table with 100K rows will feel fast in development and unusable in production.
- **Skipping metadata.** If your product has a concept like "trait types" or "community types" or "content categories," make them data-driven from the start. A metadata table with display and edit configuration costs hours now and saves weeks later.
- **Generic seed data.** "Test User 1" with skill "Programming" will not reveal layout issues, search quality problems, or demo readiness gaps. Use realistic data -- research real people in your target domain and create inspired-by-real personas.

**When to move on:** When you can describe every entity, its fields, and its relationships without hedging. When seed data creates realistic-looking content that you would not be embarrassed to show someone.

---

## Phase 3: Research and Validation

**Goal:** Validate (or adjust) your design against the real world.

**Time:** One to two days.

**Inputs:** Your spec documents so far, a list of competitor and reference products, emerging tech you want to integrate with.

**Activities:**

- Ask the AI to survey your competitive landscape. Name specific products -- "How does LinkedIn handle attribute taxonomies?" is more useful than "What do competitors do?"
- Backtest your naming choices: ask how similar products name the same concepts. If every competitor calls something a "profile" and you call it a "persona," you need a good reason.
- Research integration opportunities (APIs, protocols, ecosystems). The AI can survey a technology landscape in minutes and identify gaps that represent strategic opportunities.
- Ask the AI to find gaps: "What use case is no existing product serving?" This is where differentiation lives.
- Consumer UX research: name two or three best-in-class consumer apps and ask what makes them feel polished. "What makes Apple Music feel like a consumer product and not a developer tool?" produced insights that shaped the entire Personus visual direction.

**Outputs:** Research documents (one per topic), revised terminology if needed, integration roadmap.

**Pitfalls to avoid:**

- **Research before design.** If you research before you have your own design, you will unconsciously copy incumbents. Design with your instincts first, then validate with research. Backtesting is more valuable than front-loading.
- **Scope creep.** Research will reveal twenty interesting directions. You can only pursue two or three. Be disciplined about what enters the spec and what goes into a "future considerations" section.
- **Trusting AI research uncritically.** The AI may cite outdated statistics, miss niche competitors, or mischaracterize a product it has not used. Cross-check important findings, especially market size numbers and product capabilities.

**When to move on:** When research confirms your direction or causes a specific, bounded pivot. Not when you feel you have "covered everything" -- you never will.

---

## Phase 4: Architecture Decisions

**Goal:** Lock in the technical choices that are expensive to change later.

**Time:** One to two days.

**Inputs:** Data model, research findings, tech stack preferences, team size and constraints.

**Activities:**

- For each major technical choice (authentication, authorization, database, AI framework, deployment), ask the AI to present three to four options with tradeoffs. Do not ask "what should I use?" Ask "what are my options, what are the tradeoffs, and which would you recommend for a solo founder building X?"
- Evaluate against YOUR constraints: team size (solo now, but will you hire?), budget, time horizon, desired simplicity. A tool that is perfect for a five-person team may be overkill for a solo founder.
- Make the decision and document **why**, not just **what**. "We chose CASL because it is embedded (no sidecar), supports attribute-based access control, and runs isomorphically on server and client" is useful six months from now. "We are using CASL" is not.
- Ask the AI to check for conflicts between decisions. "Do these choices work together? Are there known incompatibilities?"
- Write the authorization model before implementation. Permission logic is the hardest thing to retrofit. Define who can do what, under what conditions, before writing the first server action.

**Outputs:** Architecture decision records (can be sections in existing docs or standalone documents), library and package selections with rationale, authorization specification.

**Pitfalls to avoid:**

- **Choosing tools before defining requirements.** Spec the authorization model, then pick the library. Spec the data access patterns, then pick the ORM. Requirements before recommendations, always.
- **Ignoring the AI's recommendation without cause.** If the AI strongly recommends something, understand why before overriding. You may have information it does not (team preferences, past bad experiences), but make sure that is actually the case.
- **Optimizing for today's team.** Solo founder today does not mean solo forever. Choose tools that a future teammate can understand without a three-hour onboarding call. Clever solutions create bus-factor risk.

**When to move on:** When every major technical decision is documented with rationale. When the authorization model covers your priority use cases without hand-waving.

---

## Phase 5: UX/UI Specification

**Goal:** Define every screen, interaction, and flow before writing UI code.

**Time:** Two to three days. This is the longest phase for most products, and it should be.

**Inputs:** Use cases, data model, architecture decisions, research on consumer UX patterns.

**Activities:**

- Start with user flows, not screens. "New user arrives. What happens?" Walk through each use case from first interaction to completion. This reveals what screens you actually need rather than what screens you think you need.
- Define each view: what data it shows, what actions are available, what the empty state looks like, what the error state looks like, what the loading state looks like. Empty and error states are not afterthoughts -- they are the first thing most users see.
- Establish design tokens: colors, typography, spacing philosophy. Let the AI propose a system, then apply your taste. "This feels too enterprise" or "I want this to feel like opening a favorite app, not logging into a dashboard" are legitimate and useful feedback.
- Push hard on terminology. Every label visible to users should be reviewed for consumer-friendliness. If your schema calls something "user traits," your UI should call it "Profile Overview." Internal language on user-facing surfaces is the most reliable indicator of a developer-built product.
- Define layout presets or templates if your product has configurable views. Let users choose a personality for their page without touching configuration.
- Ask "what does this look like on a phone?" for every view. If users will arrive via shared links, mobile is not secondary -- it is primary.
- Create a component guide listing reusable patterns, shared components, and the metadata-driven rendering approach if applicable.

**Outputs:** UI specification document (can be large -- 50KB+ is normal for a thorough spec), design tokens, component guide, layout system.

**Pitfalls to avoid:**

- **Technical terminology on user-facing surfaces.** Internal terms like "User Traits" mean nothing to a user. "Profile" does. Review every label.
- **Designing only the happy path.** Empty states, error states, and loading states account for the majority of a new user's experience. Specify them.
- **Over-designing before code exists.** Spec the important views, then build and iterate. The spec does not need to be pixel-perfect -- it needs to capture intent, data, and interaction clearly enough that implementation is translation, not invention.
- **Ignoring progressive onboarding.** A new user with zero data and a power user with 37 personas have entirely different experiences. Both need to be designed.

**When to move on:** When you can walk through every priority use case from first screen to last without hand-waving. When you have defined what happens for new users with no data.

---

## Phase 6: Business Model

**Goal:** Define how the product sustains itself, aligned with your values.

**Time:** One day. This is faster than you expect because the product is already well-defined.

**Inputs:** Product vision, competitive landscape research, your personal values about access and pricing.

**Activities:**

- Start with principles: what should always be free? What creates enough value to charge for? What actions do you want to incentivize? These are values decisions disguised as business decisions.
- Ask the AI to model three or four business model archetypes (freemium, usage-based, marketplace cut, flat subscription) against your product's specific characteristics. Generic models are useless; models evaluated against your use cases are actionable.
- Define tiers. Be specific about feature differentiation. Each tier should be describable in one sentence. If you need a paragraph to explain what a tier includes, it is too complex.
- Model unit economics: what does it cost to serve a free user? A paid user? Where are the cost centers (AI inference, database, storage)? Even rough estimates prevent pricing surprises.
- Consider network effects: what actions should you incentivize to grow the network? Personus made community creation unlimited on every tier because limiting it would suppress the demand signal that drives growth.
- Package it for stakeholder review. Even if the stakeholder is just you in three months, a structured document forces rigor that scattered notes do not.

**Outputs:** Business model document(s), tier definitions, pricing framework, unit economics estimate.

**Pitfalls to avoid:**

- **Gating discovery or core value.** If people cannot experience the product's value for free, growth stalls. The free tier should demonstrate the product's worth, not merely tease it.
- **Overcomplicating tiers.** Three to four tiers maximum. If a potential customer cannot figure out which tier they need in thirty seconds, you have too many tiers or the differentiation is unclear.
- **Ignoring the business model until launch.** It affects product design -- what gets metered, what gets gated, what features are premium. Designing the business model after the product is built means retrofitting gates and meters into flows that were not designed for them.

**When to move on:** When you can explain each tier in one sentence and the unit economics do not make you flinch.

---

## Phase 7: Implementation

**Goal:** Turn specs into working, tested code.

**Time:** Two to four days, depending on product complexity. This is where good specs pay dividends.

**Inputs:** All of the above -- foundation, data model, research, architecture decisions, UX spec, business model, CLAUDE.md with full context.

**Activities:**

- Start with a gap analysis: ask the AI to compare every spec document against the existing codebase and produce a prioritized build list. "What does the spec say should exist vs. what is built?" turns vague uncertainty into a concrete punch list.
- Build shared infrastructure first: reusable components, utility functions, server actions that multiple features depend on. If three pages need a persona card, build the persona card before building any of the pages.
- Use parallel agents for independent work streams. Two pages that do not share components can be built simultaneously. The specs serve as the coordination mechanism -- each agent reads the spec and builds to it. No standup meetings required.
- Test with seed data continuously. Realistic data reveals issues that empty states hide. When a persona card renders with seven skills and a three-line headline, you learn whether your layout actually works.
- Run type-check and tests after each feature. Do not accumulate type errors across features -- they compound fast and become much harder to diagnose in bulk.
- Do a consumer polish pass: hover states, transitions, loading skeletons, mobile responsiveness. The difference between "works" and "feels good" is in these details.

**Outputs:** Working, typed, tested codebase. All priority use cases functional end-to-end.

**Pitfalls to avoid:**

- **Building without specs.** Every implementation session should reference a spec document. If you find yourself describing a feature from memory, stop and write the spec first. Memory is lossy; documents are not.
- **Letting the AI "improve" things you did not ask for.** Be specific about scope. "Build the inbox page per the UI spec" is better than "build the inbox page and make it great." The latter invites scope creep and divergence from the spec.
- **Skipping type-check between features.** TypeScript errors compound. Fixing five errors after one feature is easy. Fixing forty-five errors after nine features is a debugging session, not a quick fix.
- **Treating mobile as an afterthought.** If users arrive via shared links (and they will), mobile is the primary platform. Test on a narrow viewport for every view, not as a final pass.

**When to move on:** When all priority use cases work end-to-end with seed data. When type-check shows zero errors and tests pass. When you can demo the product to someone without apologizing for rough edges.

---

## The Feedback Loop

After completing all seven phases, you will cycle back. Implementation reveals spec gaps. Showing the product to someone changes priorities. Research findings become outdated as ecosystems evolve. This is expected and healthy.

The key insight: these phases are not sequential -- they are a spiral. Each cycle gets tighter. The first pass through all seven phases took nine days for Personus. The next cycle -- adding features, refining UX, expanding the data model -- will be faster because the foundation is solid. The specs are written, the patterns are established, the CLAUDE.md file contains the full context. Each subsequent cycle is refinement, not reinvention.

The phases also do not need equal weight on every cycle. Your first pass through Phase 2 (data model) might take two days. Your second pass, adding three tables for a new feature, might take two hours. The methodology scales down as the foundation scales up.

---

## Quick-Reference Checklist

Use this to track where you are and whether you are ready to move forward.

**Phase 1: Vision and Principles**
- [ ] Foundation document written (vision, principles, use cases, terminology)
- [ ] Can explain the product's "why" in two sentences
- [ ] Principles feel like constraints, not platitudes
- [ ] 6-10 priority use cases defined with specific users and scenarios

**Phase 2: Data Model Design**
- [ ] Every entity identified with fields and relationships defined
- [ ] Structured vs. JSONB vs. hybrid decided for each entity
- [ ] Indexes designed for expected query patterns
- [ ] Metadata-driven approach considered for extensible types
- [ ] Seed data creates realistic-looking content

**Phase 3: Research and Validation**
- [ ] Competitive landscape surveyed with specific products named
- [ ] Naming choices backtested against industry conventions
- [ ] Integration opportunities identified and prioritized
- [ ] Consumer UX research completed with aspirational references
- [ ] Direction confirmed or specific pivot identified

**Phase 4: Architecture Decisions**
- [ ] Every major technical choice documented with rationale
- [ ] Authorization model specified before implementation
- [ ] Library selections evaluated against YOUR constraints
- [ ] Cross-decision compatibility verified

**Phase 5: UX/UI Specification**
- [ ] Every priority use case has a complete user flow
- [ ] Empty, error, and loading states defined for every view
- [ ] Design tokens established (colors, typography, spacing)
- [ ] All user-facing terminology reviewed for consumer-friendliness
- [ ] Mobile layout considered for every view
- [ ] Component guide listing reusable patterns

**Phase 6: Business Model**
- [ ] Each tier describable in one sentence
- [ ] Free tier demonstrates core value
- [ ] Unit economics estimated (even roughly)
- [ ] Network growth incentives identified
- [ ] Document ready for stakeholder review

**Phase 7: Implementation**
- [ ] Gap analysis completed (spec vs. built)
- [ ] Shared infrastructure built before page-level features
- [ ] Type-check passing with zero errors
- [ ] Tests passing
- [ ] Seed data renders correctly across all views
- [ ] Mobile responsive for all priority views

---

*This is Part 3 of the Building with Claude series. [Part 1: From Idea to Codebase in 9 Days](/guides/01-journey-overview.md) tells the full narrative. [Part 2: The Prompting Playbook](/guides/02-prompting-playbook.md) provides annotated real prompts from each phase.*
