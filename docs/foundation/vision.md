---
type: foundation
title: Personus.ai — Vision
description: Enabling personal agency in the agentic era. Your data. Your personas. Your terms. A personal data control plane for the AI age.
status: current
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Vision

> **This is the canonical library vision document.** Downstream skills (`/plan-prd`, `/plan-spec`, `/plan-messaging`, `/arch-review`) read this file. Positioning, jobs-to-be-done, personas, 8 worked core use cases, progressive onboarding, time horizons, and non-negotiables all live inline. The legacy source (`01-vision-and-principles.md`, Feb 2026) was fully ported in and archived at [`_archive/legacy-2026-02-24/`](_archive/legacy-2026-02-24/) — this file supersedes it.

## Positioning Statement

**Enabling personal agency in the agentic era.** Your data. Your personas. Your terms. A personal data control plane for the AI age.

For **people and organizations who are invisible to AI agents** (plumbers, consultants, specialists, communities) who want to be discoverable on their own terms, **Personus** is a personal data control plane that makes every person and organization a semantic API endpoint — discoverable by AI agents, queryable by systems, and owned entirely by the individual or entity.

Unlike **professional directories** (LinkedIn, Angi) that sell exposure rather than discovery and assume a single public identity, or **social networks** that demand content production and algorithmic feeds, Personus treats discovery as a privacy-preserving, AI-native query surface with no feed, no algorithm, no follower count, and no advertising.

## The Problem

1. **People and organizations are invisible to AI.** Word-of-mouth is unstructured and ephemeral. Professional directories sell exposure, not discovery. When an AI assistant needs to find a plumber, a Kubernetes expert, or a doula, it has nothing structured to query.
2. **Recommendations have no structured channel.** When you want to recommend someone you trust, there's no queryable way to share that endorsement so an AI agent can understand it.
3. **AI agents carry personal data into every transaction with no user control.** Shopping, scheduling, negotiating — each interaction is all-or-nothing: share everything, or participate in nothing.
4. **Social web participation is a privacy tradeoff.** Decentralized protocols (AT Protocol, ActivityPub) are public-by-default. Users who want open-web discoverability also lose the ability to maintain unlinkable identities.

## The Solution

Privacy-preserving personas + trust graph + AI-native discovery + personal agency, applied to three interconnected use cases on one architecture:

1. **People Discovery** — Find trusted people and organizations through endorsement-backed semantic search.
2. **Commerce Agency** — Control what personal data AI agents share during transactions via commerce personas aligned with the Agentic Commerce Protocol (ACP).
3. **Open Social Web** — Participate in the decentralized social web via AT Protocol integration with privacy-preserving multi-persona identity.

### Core loop

```
User creates persona → User endorses trusted people/orgs (creates shadows if not on Personus) →
Shadows become discoverable → AI agent finds match for a query →
Mediated introduction → Shadow person/org claims persona → They endorse THEIR network →
Network grows
```

### Value tiers

- **Baseline value (no groups required):** comprehensive profile, purpose-specific personas, per-persona visibility + contact preferences, general endorsements, AI-agent discoverability, mediated contact requests.
- **Enhanced value (with communities):** community context layers, scoped directories, guild request routing, community analytics, same-community ranking boost.
- **Agentic value (with AI agents):** commerce personas, per-transaction disclosure control, ACP participation, endorsement-network-backed AI discovery.

## Jobs to be Done

| Job | Functional | Emotional | Social |
|---|---|---|---|
| **Help me be discovered for the work I actually do** | Build a queryable profile AI agents and humans can find me through, per capability, per context | I want to feel valued for specific things, not judged by a single all-purpose profile | I want peers who know me to vouch for specific capabilities, not write generic reviews |
| **Help me recommend people I trust** | Create a structured, AI-queryable endorsement in under 30 seconds with no sign-up friction for the recommended person | I want to help my network without writing essays or gatekeeping introductions | I want my trust to compound — each recommendation makes the next one easier and more valuable |
| **Help me find trusted people through my AI agent** | AI agent queries my network and surfaces endorsement-backed matches with clear trust paths | I want confidence that the match comes from people I trust, not an opaque algorithm | I want to route the introduction through the person who knows us both — mediated, not cold |
| **Help me control what my AI agent shares when it acts for me** | Per-persona consent categories (Discovery, Contact, Data Sharing, Communication) that AI agents respect in every transaction | I want peace of mind that my agent isn't leaking my address, email, or purchase history | I want to participate in agent-mediated commerce without surrendering my identity to every vendor's marketing database |
| **Help me participate in the open social web without losing privacy** | Sync public personas to AT Protocol via `ai.personus.*` lexicons; keep private personas off the firehose | I want open-web reach for my professional identity, not for every part of me | I want my neighborhood persona invisible to the global network — DID-based identity portability without universal visibility |

## Personas

### Maya — The Multi-Context Professional

Software engineer by day, neighborhood organizer by evening, AAPI Tech Workers mentor by weekend. Maintains one master trait pool and three unlinkable personas for each context. The core job: **"Let me be discovered for each facet without collapsing them into one all-purpose profile that nobody reads correctly."**

Primary value: profile-is-master, personas-are-lenses. Secondary value: unlinkability — sharing attributes across personas doesn't create automatic connections.

### Marco — The Service Provider (Shadow → Claimed)

Victorian-home plumber with no online presence. Three neighbors independently recommend him via Recommender Coach, creating a shadow persona assembled from their endorsements. An AI agent discovers him through someone else's query. Marco receives a claim invite, converts the shadow to a full persona, and inherits all three endorsements. The core job: **"Let me get found for work I'm good at without having to build a personal brand."**

Primary value: zero-friction discovery via endorsements from others. Secondary value: the network grows faster than it otherwise could because shadow personas make pre-acquisition discovery real.

### Dana — The Commerce-Delegator

Busy professional using an AI assistant for home renovation shopping. Has a dedicated commerce persona with minimal-disclosure settings: shipping region, budget, style — no name, address, or purchase history. Her AI agent uses the commerce persona to drive ACP-compliant vendor interactions. The core job: **"Let me delegate transactions to my AI agent without the vendors collecting me as a customer record."**

Primary value: per-persona consent categories that agents honor at every disclosure step. Secondary value: participation in agentic commerce without the exposure tradeoff.

## Core Use Cases

The product surface covers three interconnected use cases on one architecture. Each of the 8 scenarios below illustrates how a real user — or their AI agent — experiences the loop.

### Use Case 1 — The Multi-Context Professional

**Maya Chen** is a software engineer, a neighborhood organizer, and an AAPI tech mentor. She maintains one master trait pool and three unlinkable personas.

**Maya's profile (master attribute pool)** includes: Rust, distributed systems, API design, technical writing, event planning, grant writing, community organizing, DEI consulting, conference organizing, plus values (open-source, mentoring, equity), qualities (explaining complex concepts, building consensus, facilitating difficult conversations), and languages (English, Mandarin).

**Persona A — "Maya Chen, Senior Engineer"** (person, public)
- Selected traits: Rust, distributed systems, API design, technical writing, open-source, mentoring
- Headline: "Distributed systems engineer • Rust specialist • Technical writing"
- Purpose: professional discoverability, consulting opportunities, peer recognition

**Persona B — "Maya C."** (person, authenticated, member of Sunnyside Neighbors community)
- Selected traits: event planning, grant writing, community organizing, building consensus
- Context data: block captain, 8 years in neighborhood, Garden Club lead
- Purpose: neighborhood engagement, local connections, community leadership

**Persona C — "M.C."** (person, private, member of AAPI Tech Workers community)
- Selected traits: DEI consulting, conference organizing, mentoring, facilitating difficult conversations, equity
- Context data: 5 years in tech, leadership track focus
- Purpose: community-specific identity, selective professional engagement

Key properties:
- One profile (master attribute pool), three distinct discoverable identities
- **Unlinkable without Maya's consent** — sharing attributes doesn't create automatic links
- Independent visibility controls per persona
- When joining a new community, Maya builds a persona by selecting from existing attributes — no repetition

### Use Case 2 — The Service Provider (Shadow → Claimed)

**Marco Silva** is a plumber with no online presence. Three neighbors independently recommend him.

**Phase 1 — Shadow persona created.** Sarah, James, and Linda each use Recommender Coach: category=plumber, one-liner endorsement each. The system assembles a shadow persona from their inputs:
- Entity type: person
- Service: "Residential plumber"
- Skills: pipe replacement, leak detection, Victorian plumbing, vintage fixtures (AI-extracted)
- Qualities: Victorian plumbing expertise, clear communication, reliability
- Service area: Inner SF neighborhoods (inferred from endorser locations)
- Endorsements: 3 visible to searchers
- Contact method: through endorsers only

**Phase 2 — Discovery.** Someone searches "plumber old pipes SF." Marco's shadow ranks high due to multiple independent endorsements, skill match, and location match. The requester contacts through Sarah, who mediates the introduction and includes a claim link.

**Phase 3 — Claim & full persona.** Marco receives the invite, creates an account, and the shadow converts into a full persona. All 3 endorsements transfer. He can now receive direct contact requests, endorse others, and join communities.

**Flywheel effect:** Persona Coach prompts Marco — "Who would you recommend?" Marco endorses his suppliers and fellow tradespeople. The network grows.

### Use Case 3 — Solo Business Owner, Dual Personas

**Carlos Silva** maintains two personas for different discovery paths.

**Personal persona — "Carlos M."** (person, public)
- Headline: "Residential plumber • Victorian home specialist • Emergency calls welcome"
- Offerings: emergency calls, weekend work, consultations, mentoring apprentices
- Service area: SF inner neighborhoods, 5-mile radius from Mission
- Purpose: personal professional identity, peer recommendations, neighborhood trust

**Business persona — "Silva Plumbing"** (organization, public)
- Headline: "Licensed residential & commercial plumbing • Serving SF since 2018"
- Org metadata: type business, size solo, certifications [CA License C-36, Insured & bonded, BBB A+], website silvaplumbing.com, verification: basic (domain verified)
- Offerings: residential plumbing, emergency repairs, bathroom remodels
- Service area: All SF + Oakland + Berkeley
- Purpose: professional credibility, commercial work, contractor partnerships

**Affiliation:** Carlos M. → Silva Plumbing (owner, "Owner & Lead Plumber").

Discovery outcomes:
- Neighbor searching casually → finds Carlos M.
- Property manager searching formally → finds Silva Plumbing
- Both paths lead to the same human through different presentation contexts

### Use Case 4 — Organization with Staff

**Bay Area Pet Hospital** is an organization persona owned by Dr. Sarah Chen's user account.

**Org persona metadata:** 24/7 emergency vet care, exotic animal specialists, AAHA accredited, Fear Free certified, CA Veterinary Medical Board licensed. Founded 2010, 8 staff, verified (business license + AAHA accreditation confirmed).

**Affiliated person personas:**
- **Dr. Sarah Chen, DVM** — owner, "Founder & Chief Veterinarian." Exotic animals, avian, reptile medicine, emergency surgery.
- **Nadia Kovac, RVT** — employee, "Emergency Specialist & Overnight Lead." Also maintains a separate neighborhood persona for kitten fostering advice.
- **Dr. James Park, DVM** — employee, "Staff Veterinarian." Surgery, dentistry, internal medicine.

Discovery outcomes:
- "emergency vet exotic animals SF" → org persona; result shows affiliated practitioners
- "avian veterinarian" → Dr. Chen's person persona; result shows org affiliation
- "vet tech fostering help" → Nadia's neighborhood persona, not her hospital role

**Community connection:** BAPH also has an employee community ("BAPH Team") backed by the org persona. Community schema: role, department, years with practice. Community inherits org verification status.

### Use Case 5 — Professional Chapter Organization

**Rotary International — District 5150** (parent org persona, verification: official, can delegate) sits above **Rotary Club of Oakland** (chapter org persona, verification: verified via delegation from parent, relationship: member-of).

**Community "Oakland Rotary Members"** is backed by the chapter's org persona. Schema includes: member since, classification (profession), committees, attendance record.

Individual members have their own person personas with Rotary affiliations. Discovery surfaces include:
- "Rotary club near me" → finds local chapter org
- "accountant involved in community service Oakland" → finds members with accounting skills plus Rotary affiliation
- Chapter verification inherited from parent org = trust signal

### Use Case 6 — AI Agent Ambient Discovery

**Sam** is a product manager using Claude with Personus MCP tools enabled. He's in sprint planning.

**Sam:** "I need to revamp our error handling this quarter but the team lacks deep systems knowledge."

**Claude** (internal reasoning): detects implicit need for systems engineering expertise. User's tone suggests pain. Calls `personus_search({ query: "distributed systems error handling mentoring", scope: "my-network", context: "Sam is a PM needing to upskill their team" })`.

**Personus returns:** Alex Park (person persona). Skills: distributed systems, error handling patterns, resilience engineering. Offerings: technical mentoring, architecture reviews. **Endorsed by Priya Kumar** (Sam's coworker) with a strong endorsement for "systems design mentoring, explains complex concepts clearly." Trust chain: Sam → Priya → Alex.

**Claude:** "I found Alex Park through your network — they specialize in error handling patterns in distributed systems. Your coworker Priya gave them a strong endorsement and called out their ability to explain complex concepts clearly. Would you like an introduction?"

**Sam:** "Yes."

**Claude:** Calls `personus_request_introduction(...)`. Alex receives the request with AI-triage note: "Matches your offerings (mentoring). Referred by Priya Kumar (strong endorsement). Request is specific and aligned with your expertise."

Key properties: discovery happened ambiently during a normal conversation. No explicit "search Personus" command. Trust path made clear. Mediated contact preserved privacy.

### Use Case 7 — Commerce Persona (AI Agent Shopping)

**Dana** uses Claude as her personal assistant with Personus MCP tools connected. She maintains a dedicated commerce persona.

**Dana's commerce persona — "Dana R. — Shopper"** (person, private)
- Focus areas: home renovation (active), holiday gift shopping (seasonal)
- Contact preferences:
  - Discovery: OFF (not discoverable)
  - Contact: agent-mediated only
  - Data sharing: minimal — shipping region only, no address until purchase confirmed
  - Communication: transaction receipts only, no marketing

**Scenario:** Dana chats with Claude about her kitchen renovation.

**Dana:** "I need a pendant light for over the island, something vintage, maybe Art Deco brass. Under $300."

**Claude** (with Personus + ACP integration):
1. Reads Dana's commerce persona → disclosure level: minimal
2. Searches ACP-enabled vendors for "Art Deco brass pendant light"
3. Shares only: shipping region (SF Bay Area), budget range, style preferences
4. Does NOT share: full name, address, purchase history, email

Vendors return options. Claude presents top 3. Dana picks one. Claude initiates ACP checkout with a scoped, amount-limited payment token. Shipping address releases only to fulfillment, not to the vendor's marketing database.

Key properties: same profile → persona → selective disclosure architecture applied to commerce. GDPR-inspired contact preferences control data flow per transaction category. The AI agent acts within the boundaries Dana set.

### Use Case 8 — AT Protocol (Open Social Web)

**Kai** wants their professional persona discoverable on the decentralized social web while keeping their neighborhood persona private.

**Integration:** Kai's Personus account links to their DID (`did:plc:kai123...`). Public personas sync to Kai's AT Protocol repository via the `ai.personus.persona` lexicon. Private and group personas stay in Personus only — AT Protocol repositories are public.

**Persona A — "Kai Nakamura, Designer"** (public, synced)
- Published as `ai.personus.persona` record in Kai's atproto repo
- Discoverable by any AT Protocol App View, not just Personus
- Endorsements published as `ai.personus.endorsement` records
- Anyone on the AT Protocol network can discover Kai's professional identity

**Persona B — "K.N."** (community visibility, NOT synced)
- Stays in Personus database only
- Only visible within Kai's neighborhood community
- AT Protocol users cannot see this persona

Key properties: Personus respects AT Protocol's public-by-default model by syncing only public personas. Private data never touches the firehose. DID-based identity means Kai owns their identifier across both systems. Endorsements become portable trust signals on the open social web.

---

## Progressive Onboarding

Personus uses progressive revelation to guide users from first sign-up through becoming active community leaders. Each phase provides standalone value while naturally leading to the next. **This is not enforced gatekeeping** — all features are available — but the UI, Coach agents, and empty states emphasize the right actions at the right time.

The 4 phases are the vision-level complement to the activation funnel in [`metrics.md`](/foundation/metrics.md#activation-funnel). The metrics doc measures whether users are moving through the phases; this doc describes what the phases *mean*.

### Phase 1 — Be Found

**Trigger:** new user, no personas yet.
**Goal:** create a rich, discoverable persona.

- Persona Coach guides first persona creation (voice or text)
- Completeness meter drives enrichment ("You're at 65% — add your experience to reach 80%")
- Contact preferences set with privacy-first defaults
- Share link generated immediately

**Value delivered:** the user has a persona AI agents can discover. Even without endorsements or community membership, they are now a semantic API endpoint.

### Phase 2 — Build Trust

**Trigger:** has persona, fewer than 3 endorsements.
**Goal:** start the endorsement flywheel.

- Coach suggests: "Know someone great at [skill]? Recommend them."
- Recommender Coach guides shadow creation and endorsement
- When user receives an endorsement, celebration + "endorse them back?" prompt
- Dashboard highlights endorsement milestones

**Value delivered:** the user has trust signals. Their persona ranks higher in searches. They have brought new people into the network via shadows.

### Phase 3 — Join & Discover

**Trigger:** has endorsements, active persona.
**Goal:** join communities for scoped discovery and connection.

- Explore page becomes prominent in navigation
- "Communities you might like" suggestions based on skills, interests, endorsees' communities
- Coach suggests relevant communities: "Your design skills match the Cascade Design Guild"
- First community join flow with context data setup

**Value delivered:** the user is discoverable within communities. They benefit from community-scoped search, directories, and features. Guild members get request routing.

### Phase 4 — Create & Lead

**Trigger:** active in communities, strong endorsement network.
**Goal:** create and lead communities.

- "Create a community" becomes visible
- Community Coach guides creation flow (community, guild, network)
- For guilds: taxonomy, tiers, offerings setup
- Steward tools available if promoted within existing guilds
- Coach: "You've got the skills and trust — start a guild around [common skill among your endorsees]"

**Value delivered:** the user creates community infrastructure. Guilds generate ongoing value through request routing and community offerings.

### Phase Awareness in AI Agents

All coach agents are aware of the user's current phase and tailor their suggestions. **The phase is derived, not stored** — it's a function of:

```
phase = derive(
  hasPersonas:            boolean,
  endorsementCount:       number,
  communityMembershipCount: number,
  isCommunityAdmin:       boolean
)
```

Coaches never say "you're in Phase 2." Instead they naturally focus on the most valuable next action: "You've been endorsing great designers. Want to create a guild so they can get discovered together?"

---

## Time Horizons

### 10-Year Horizon — The AI-Native Social Layer

Personus is the interoperable layer where AI agents discover people and organizations across the open web. Every professional, community, and service provider has a queryable, owner-controlled endpoint. Discovery is structured, trust-weighted, and privacy-preserving. Commerce flows through scoped consent, not bulk data transfer. The ActivityPub + AT Protocol + MCP + ACP ecosystem has converged on a shared pattern: **capability-based discovery with mediated contact**, and Personus is one of its primary surfaces.

### 3-Year Horizon — Three Wedges

1. **People-discovery for skilled trades and specialists.** Network density concentrated in specific verticals (plumbers, doulas, Kubernetes experts, DEI consultants) where word-of-mouth is the dominant discovery channel and the structured alternative (LinkedIn, Angi) is failing users.
2. **Community infrastructure for guilds and professional networks.** Skill-taxonomy-backed directories, tiered membership, offering routing. Communities adopt Personus as their "members page" because it's AI-native by default.
3. **Commerce-persona primitives.** ACP adoption drives demand for per-transaction disclosure control. Personus provides the persona + consent primitives that AI-agent commerce needs.

### 1-Year Horizon — Product-Market Fit in One Wedge

Pick one vertical (likely skilled-trades or a specific professional community), drive density to the point where **an AI agent query returns a trust-backed match more often than not**, and close the loop: persona → endorsement → shadow → claim → re-endorse. PMF is the Sean Ellis "very disappointed" >40% threshold plus measurable endorsement network growth without paid acquisition.

## Non-Negotiables

The following are architectural constraints, not product choices. They are listed here as the vision-level statement of intent; the enforcement rules and waiver conditions live in [`principles.md`](/foundation/principles.md).

1. **No PII in personas, ever.** Personas expose capabilities, skills, interests, availability — never email, phone, address, or other direct identifiers. PII detection runs on all free-text input. This is the architectural privacy guarantee. See [`principles.md#no-pii-in-personas`](/foundation/principles.md#no-pii-in-personas).
2. **Masked, mediated contact only.** Contact flows through privacy-preserving channels via a `ContactRelay` abstraction. Raw contact details are never surfaced to the requesting party. See [`principles.md#masked-contact`](/foundation/principles.md#masked-contact).
3. **Profile is master, personas are lenses.** Users maintain one comprehensive master trait pool; personas are selective views. Sharing attributes across personas must not create implicit links between them (unlinkability). See [`principles.md#profile-is-master-personas-are-lenses`](/foundation/principles.md#profile-is-master-personas-are-lenses).
4. **AI-native discoverability.** Every persona and community is a machine-readable endpoint (JSON-LD, schema.org, MCP tools, GraphQL). Human UI is secondary. A silent HTML-only surface regresses the core value proposition. See [`principles.md#ai-native-discoverability`](/foundation/principles.md#ai-native-discoverability).
5. **Consent is declared, not derived.** Contact, discovery, data-sharing, and communication preferences follow structured consent categories with privacy-preserving defaults. See [`principles.md#consent-by-default`](/foundation/principles.md#consent-by-default).
6. **Trust through endorsements, not reviews.** Endorsements are positive-only, context-tagged, and grounded in declared relationship types. No ratings. No reviews. No follower counts.
7. **Personal agency, not platform lock-in.** Users own their data, their DID-based identity, and their personas. Personus is a control plane, not a walled garden. Data portability and protocol interoperability are architectural requirements.

## What Personus Is Not

- **Not a job board.** No job postings, no applications, no recruiter surface area.
- **Not a CRM.** No customer pipelines, no deal stages, no lead scoring.
- **Not a review platform.** No star ratings, no complaint channels, no anonymous feedback.
- **Not a feed-based social network.** No algorithm. No follower count. No content production pressure.
- **Not an advertising surface.** No sponsored results. No promoted personas. No pay-to-rank.
- **Not a universal identity provider.** DIDs and AT Protocol do that. Personus is a control plane on top.

## Cross-References

- Principles (enforcement rules): [`principles.md`](/foundation/principles.md)
- Strategy (tradeoffs): [`strategy.md`](/foundation/strategy.md)
- Architecture topology: [`architecture.md`](/foundation/architecture.md)
- Data model: [`data-model.md`](/foundation/data-model.md)
- API surface (GraphQL / MCP / REST): [`api-surface.md`](/foundation/api-surface.md)
- Agent architecture: [`agents.md`](/foundation/agents.md)
- Authentication: [`authentication.md`](/foundation/authentication.md)
- Authorization: [`authorization.md`](/foundation/authorization.md)
- Business model: [`business.md`](/foundation/business.md)
- Metrics framework: [`metrics.md`](/foundation/metrics.md)
- Deployment: [`deployment.md`](/foundation/deployment.md)
- AT Protocol integration: [`at-protocol.md`](/foundation/at-protocol.md) (ecosystem survey in [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md))

_Last updated 2026-04-12 by `/plan-foundation` (extracted from the legacy `01-vision-and-principles.md`; use cases and progressive onboarding ported inline; legacy file archived)._
