---
type: guide
title: "The Prompting Playbook: Real Prompts from Building a Product with Claude"
description: "Annotated prompts from building Personus.ai, organized by phase. Not templates -- actual conversation fragments that worked, and why."
status: current
tags: [guides]
---

# The Prompting Playbook: Real Prompts from Building a Product with Claude

*Annotated prompts from building Personus.ai, organized by phase. Not templates -- actual conversation fragments that worked, and why.*

---

## Introduction

Most prompting guides give you templates. Fill in the blanks, get decent output. That works for one-off tasks. It does not work when you are building a product over days and weeks, making hundreds of compounding decisions across vision, architecture, research, UX, business model, and implementation.

This guide contains real prompts from building Personus.ai -- a solo founder went from concept to feature-rich codebase in nine days with Claude as design partner. These are not polished after the fact. They are the actual words that produced a 20-table schema, four AI agents, a consumer-grade dashboard, and a five-document business model. Each one is annotated with what made it effective and what pattern you can steal.

Prompts are organized by build phase. If you are in the early vision stage, start with Part 1. Deep in implementation, skip to Part 7. The meta-patterns in Part 8 apply everywhere.

---

## How to Read This Guide

- Each prompt is shown in a **blockquote**
- Annotations explain the technique being used
- **Why it works** callouts explain the underlying principle
- ***Technique:*** one-line takeaways you can apply immediately

The prompts are lightly edited for length but preserve the original phrasing, including the rough edges. That is the point -- these are working prompts, not showpieces.

---

## Part 1: Vision and Foundation Prompts

### Prompt: Setting Up for Parallel Agents

> "I'm trying to setup this code repository and project planning such that I can create parallel Claude Code agents to render my vision. Can you examine this project setup, and tell me a) what is missing that you need to be successful, create clean code, using well-named identifiers for things, following DRY patterns, and maintainable coding conventions, b) what user interface designs and descriptions do you need to establish layouts, components, and views? c) based upon the current scope, what do you suggest are the order of the tasks, what should be parallelized vs. waiting for a human in the loop to review and advise."

**Why it works:** Three things at once: (1) states the goal (parallel agents), (2) sets quality standards (DRY, clean code, well-named identifiers), and (3) asks the AI to identify its own gaps rather than assuming you know what it needs. The a/b/c structure prevents a vague response -- the AI has to address each point.

***Technique: Ask the AI what IT needs.*** Instead of dictating requirements, ask "what do you need to be successful?" This surfaces gaps you did not know existed and gives the AI ownership over its own working conditions.

### Prompt: Vision with Taste

> "I like 'Personal Data Control Plane for the Agentic Era' as a core description of platform, but the core value proposition is more human facing like: 'Enabling personal agency at the edge/for AI/etc'"

**Why it works:** The founder accepts the technical description but redirects toward human-facing language. This is the "yes, and..." pattern -- acknowledge the AI's contribution while steering toward your taste. The AI learns that technical precision is valued but user-facing warmth matters more.

***Technique: Accept and redirect.*** Do not reject AI output wholesale. Accept the kernel, then push it in your direction. This maintains collaborative momentum while asserting creative control.

---

## Part 2: Data Model Prompts

### Prompt: Deep Dive with Specific Questions

> "Let's do a little more detailed planning on the datamodel/schema. So, 1) What does 'persona_community_memberships' do? Specifically, can you present to me, how a Personus user related to their groups from a data model point of view, I want to make sure that's super clear, 2) Communities do have a 'founding user' but they may be managed by more than one person. Communities may also have a 'billing user' if they are at a scale that needs that, 3) Use of the word 'attributes' may have a programmatic 'reserved word' collision..."

**Why it works:** Mixes questions with assertions. Point 1 asks for clarification. Points 2 and 3 provide new requirements and catch a naming risk. This dual-mode approach validates understanding AND expands scope in one turn. It tells the AI: I am paying attention, I have opinions, show your work.

***Technique: Questions + requirements in one prompt.*** Do not separate "do you understand?" from "here's what I want." Blend them to move faster.

### Prompt: Data-Driven Thinking

> "The groupTypes should generally be defined by data, we can create seed data to represent. This way when a user creates/designates a new community, the app can just pull the group types from database, no code changes needed."

**Why it works:** One sentence that saved massive future work. Hardcoding an enum would mean a code deployment every time a new community type was needed. Instead, seed-data-driven types -- nine community types, each with trait schemas and feature flags, all configurable without touching code.

***Technique: State the architectural principle, not just the feature.*** "Defined by data" is more powerful than "add these 9 types." The principle scales; the feature list does not.

### Prompt: The Intelligence Layer Concept

> "We want Personus to be a kind of 'intelligence layer' that people add to the communities that may exist elsewhere like Facebook, Discord, Slack, we're not replicating what those platforms do, but rather augment the value of those message/content-based communities."

**Why it works:** This reframing changed the entire product architecture. Instead of competing with Slack and Discord for daily engagement, Personus became a complementary layer -- structured identity, trust signals, and AI-discoverable capabilities on top of where communities already live. One prompt eliminated months of feature competition.

***Technique: Reframe scope through analogy.*** "Intelligence layer" instantly communicated what Personus is AND is not. Find a two-word framing that draws a clear boundary.

---

## Part 3: Research Prompts

### Prompt: Backtesting Decisions

> "Now that we have a foundational codebase, basic design docs, and a good outline of user workflows. I want to 'backtest'/validate some of our naming and design choices. 1) How well can Personus be used as an extended profile for BlueSky users, anything we should consider to leverage, 2) How does Match.com and related dating sites describe/name the kinds of user attributes we're calling traits."

**Why it works:** Research AFTER initial design, not before. The term "backtest" is intentional -- you have a hypothesis (your naming choices), and you are validating against external evidence. Without something concrete to test against, research becomes procrastination.

***Technique: Backtest, do not front-load research.*** Design first with your instincts, then validate with research. This prevents analysis paralysis and gives research a clear purpose.

### Prompt: Ecosystem Survey

> "Take a moment to survey the current state of ATProtocol apps that have some kind of integration with BlueSky's user base. It would be good to understand what's possible and how there's a mutual benefit story with Personus."

**Why it works:** "Mutual benefit story" frames research around partnership, not competition. This steered the AI toward integration opportunities rather than a dry feature comparison.

***Technique: Frame research around your strategic intent.*** "Survey the landscape" produces a Wikipedia article. "Survey for mutual benefit stories" produces actionable strategy.

### Prompt: Consumer Friendliness Research

> "Please review the UX for very consumer-friendly applications like Apple Music and SoundCloud, figure out what makes them more 'consumer-friendly' come back to me with your insights, likely we'll want to learn from them, they are masters."

**Why it works:** Names specific best-in-class examples rather than asking generically. "They are masters" tells the AI to treat these as aspirational targets, not just catalog features. This produced research on immersive cards, soft shadows, consumer spacing, and personality-rich copy that became the design foundation.

***Technique: Name your aspirational references.*** Do not ask "what makes good UX?" Ask "what makes Apple Music's UX great?" Specificity produces insight; generality produces platitudes.

---

## Part 4: Architecture Decision Prompts

### Prompt: Triggering a Decision Record

> "Do we need a spec that models permissions? I think all this goes beyond simple RLS so the data authorization scheme should be well understood from the start and we should see how it relates clearly to the data models."

**Why it works:** The founder identifies a gap and frames it as a question, not a command. "Do we need?" made the AI justify the need before building the solution. The result was a 30KB authorization spec covering CASL abilities, Clerk integration, cross-persona linking, and compound visibility. A command like "write an auth spec" would have been less thorough -- the AI would not have first reasoned about why one was needed.

***Technique: Ask "do we need X?" to trigger thorough analysis.*** The question format produces better specs than the command format because the AI must first justify the work.

### Prompt: Library Selection

> "Fantastic. Now, are there existing NodeJS libraries that should be considered to implement such a system."

**Why it works:** Deceptively simple -- the power is in the sequencing. By asking AFTER the auth model was spec'd, the AI evaluated libraries against specific requirements (ABAC, isomorphic, no sidecar) rather than generic feature lists. The recommendation (CASL) was backed by concrete alignment with the spec.

***Technique: Spec first, then shop for tools.*** Requirements before recommendations. The same question asked before the spec would have produced a different, less useful answer.

### Prompt: Cross-Spec Consistency Check

> "Please review the design docs now. Look across the specs and suggest revising any of them keeping an eye toward: a) is there a better abstraction for groups, communities, organizations, guilds, b) Do we need to revise use cases to incorporate directories, marketplaces, c) From a UI design point-of-view, does the current layout strategy still hold up, d) Any revision needed for our Coach specs?"

**Why it works:** A meta-prompt -- asking the AI to audit its own earlier work. After several days, terminology had drifted: "groups" in one doc, "communities" in another, "collectives" in a third. This review caught the inconsistency and triggered a major rename across the entire codebase. The four-part structure ensured comprehensiveness.

***Technique: Periodic cross-spec reviews.*** Every 3-4 major conversations, ask the AI to look for contradictions and drift across all existing documents. Terminology debt compounds just like technical debt.

---

## Part 5: UX/UI Prompts

### Prompt: Rejecting Internal Terminology

> "'Traits' are an internally used word, for users, these are just aspects of their Profile, so 'Trait Pool Overview', not very user friendly, it should be something like: 'Profile Overview'. Why does this matter? I want to make sure the component/card/etc identifiers are labeled well."

**Why it works:** Catches a universal AI tendency -- using internal terminology on user-facing surfaces. The AI had access to the schema (where "traits" is correct) and naturally surfaced it in the UI. The "Why does this matter?" addendum forces the AI to internalize the principle, not just fix this instance. Every subsequent UI output in the session used consumer-friendly language.

***Technique: Correct specific instances AND state the principle.*** Fixing one label teaches nothing. Explaining why it matters prevents the same mistake in all future outputs.

### Prompt: The "You Card" Concept

> "There should be a card, spans width of the page that is the 'You' card, its your profile picture, name, and an AI generated self-supporting summary of your profile. If you haven't built one yet, there should be a CTA in that space that's a friendly way to get people to engage."

**Why it works:** Visual specificity at the right level. "Spans width of the page" is a concrete layout directive. "AI generated self-supporting summary" is a feature spec in one phrase. "Friendly way to engage" sets tone without prescribing copy. Enough for the AI to build something real while leaving room for good design decisions.

***Technique: Be visually specific about layout, loose about content.*** Specify structure ("full-width card") and behavior ("CTA if empty"), but let the AI handle the details.

### Prompt: Layout Strategy

> "Assume that a user may want different 'themed' personas, so visually Personal, Professional, Community X, could have different visual themes the user can control (but start from defaults), and each persona type 'kind' has different layouts stressing different things."

**Why it works:** One prompt spawned the entire five-preset layout system (Professional, Personal, Community, Service, Creative). It communicated the user's mental model without dictating implementation. The parenthetical "(but start from defaults)" is excellent product instinct in five words: customization that never burdens new users.

***Technique: Describe the user's mental model.*** "Different themes stressing different things" communicates the need without prescribing the solution. Let the AI figure out the implementation from the intent.

---

## Part 6: Business Model Prompts

### Prompt: Starting from Principles, Not Pricing

> "I would like your help with researching the ideal business model for Personus. In a world where 'agency is moving to the ends of the network' and platforms like Personus help dis-intermediate human to human connection and value creation, help me figure out the best business model for this."

**Why it works:** Starts with philosophy, not spreadsheets. "Agency moving to the ends" frames the business model as a values decision -- what kind of company should this be? This produced a PBC (Public Benefit Corporation) structured model with "discovery never gated" baked in from the start, not bolted on as an afterthought.

***Technique: Lead with values, follow with mechanics.*** The AI generates a more coherent business model if it understands your philosophical commitments first. Pricing tiers flow from principles; principles do not flow from pricing tiers.

### Prompt: Tier Refinement with Constraints

> "There should never be a limit on the number of communities someone can create. Unlimiting this creates a demand signal in the app for PLG expansion. Let's refine tiers... I also want to add a layer that can add fuel to the network growth where we can gameify credits for 'being generous'..."

**Why it works:** Mixes a hard constraint ("never limit communities") with its justification ("demand signal for PLG") and a creative direction ("gamify generosity"). The justification tells the AI this is strategic, not arbitrary. The result: the Sparks credit system, where users earn credits for endorsements, introductions, and contributions.

***Technique: State constraints with their business rationale.*** "Never limit X because Y" is dramatically more useful than just "never limit X." The rationale lets the AI make consistent decisions in adjacent areas.

### Prompt: Capture and Package

> "Please capture all this into a set of documents (no more than 5) that logically create the business model description that I can review with my stakeholders. I would also like to add a 'B Corp' / Social Benefit Corporation flavor to the plan language."

**Why it works:** Three precise constraints: document count (no more than 5), audience (stakeholder review), and tone (PBC flavor). Left unconstrained, AI produces too many thin documents. Five forced consolidation into dense, standalone pieces: executive summary, packaging and pricing, Sparks engine, growth model, and competitive landscape.

***Technique: Constrain document count explicitly.*** If you need a business plan, say "in no more than 5 documents." If you need a spec, say "one document, no more than 40 pages." Constraints produce density.

---

## Part 7: Implementation Prompts

### Prompt: The Green Light

> "Please implement all phases, no need to preserve anything for backwards compatibility, assume you can delete all database objects, recreate schema, ENUMs, whatever you need, re-seed from empty which also validates your seed files and scripts work as expected. No need to stop and ask me for any permissions."

**Why it works:** Removes every friction point in one sentence. No backwards compatibility, no permission gates, clean-slate authority. Careful AI assistants will ask before destructive operations -- dropping tables, deleting enums, resetting seeds. Pre-authorizing enabled a full schema rebuild (20 tables, 52 indexes, 36 foreign keys, pgvector, complete seed validation) in one uninterrupted run.

***Technique: Remove blockers proactively.*** If you know the AI will ask permission for destructive actions, pre-authorize them. Interruptions kill flow for both you and the AI.

### Prompt: Gap Analysis

> "I know we created a set of priority use-cases before, we should revisit, enhance that then review what UI views and workflows still need to be created. Please do that gap analysis."

**Why it works:** References earlier work ("priority use cases") and asks for a structured comparison between spec and implementation. This became the tiered build plan -- done, partially done, not started. The word "gap" does heavy lifting; it implies an accountable comparison, not a vague status update.

***Technique: Ask for gap analysis between artifacts.*** "What does the spec say vs. what is built?" is one of the most powerful implementation planning prompts available. It turns vague uncertainty into a concrete punch list.

### Prompt: Realistic Seed Data

> "We need a good wide-variety of seed data, 'fake' users with fake personas. Perhaps use real world examples such as 'Charlotte De Witte' techno DJ, you could find out a lot researching the web to make better than totally fake data by finding people like that."

**Why it works:** "Better than totally fake" is the key insight. Generic dummy data (John Smith, Acme Corp, skill: "Programming") does not stress-test UI layouts, search quality, or demo impressions. Real-world-inspired data -- a techno DJ with actual skills, labels, and genre expertise -- tests all of these. The resulting seed: 32 users, 37 personas across diverse professions, each with realistic trait depth.

***Technique: Seed data should be realistic, not random.*** Reference real people, organizations, and professions as templates. The AI can research them and create richer fake data than it would ever generate from scratch.

---

## Part 8: Meta-Patterns

These are not individual prompts but patterns that appeared across every phase of the build. They are the habits that separate productive AI collaboration from prompt-and-pray.

### The Numbered List

Almost every effective prompt in this guide used numbered or lettered lists. This is not a stylistic preference -- it is a structural guarantee. A numbered list forces the AI to address each point individually. Without it, the AI will cherry-pick the most interesting or easiest question and give the others a sentence or two. With a three-part list, you get three substantive responses.

### The "Why This Matters" Addendum

Several prompts include an explanation of why the directive matters -- "Why does this matter? I want to make sure the component identifiers are labeled well" or "Unlimiting this creates a demand signal for PLG expansion." This teaches the AI the principle behind the specific correction. The AI then applies that principle to future outputs in the same session without being told again.

### Accept and Redirect

The pattern of "This is good, but..." or "I like X as a description, but the value prop is more like Y" appeared repeatedly. It keeps collaborative momentum while steering direction. Wholesale rejection ("no, that's wrong, do it differently") wastes the AI's work and resets context. Partial acceptance ("the technical framing is right, but the user-facing language should feel more like...") preserves what works and corrects what does not.

### Periodic Consolidation

Every 3-4 major conversations, the founder asked Claude to review all existing documents for consistency, contradictions, and drift. This caught the "collective vs. community" naming inconsistency, surfaced redundant sections across specs, and kept the growing document set coherent. Without these periodic reviews, terminology and assumptions diverge silently until they become expensive to fix.

### State the Negative

"We're not replicating what those platforms do." "There should never be a limit on communities." "No need to stop and ask me for any permissions." Negative constraints -- what the product is NOT, what should NEVER happen, what NOT to worry about -- were as important as positive requirements. The AI is good at building what you ask for. It is less good at knowing what to leave out. Negative constraints draw the boundary.

---

## Closing

Every prompt in this guide shares one trait: it respects the AI's intelligence while asserting the founder's judgment. None of them are "write me a social network." None of them are 2,000-word specifications that leave no room for the AI to contribute. They live in the productive middle -- enough direction to prevent drift, enough space for the AI to bring its strengths.

The patterns are learnable: numbered lists, principles alongside corrections, research after designing, pre-authorized destructive actions, aspirational references, constrained document counts, periodic cross-spec reviews.

These are habits of clear communication that happen to work exceptionally well with AI. They would also work with a human collaborator. That is probably the most useful insight in this entire guide: the prompts that worked best were the ones that would have worked in a conversation with a talented colleague. Be specific. Be honest about what you do not know. Explain your reasoning. Accept good ideas from wherever they come. Override when your taste says otherwise.

The prompts built Personus. The patterns can build whatever you are working on next.
