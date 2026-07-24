---
type: foundation
title: "Personus.ai — Foundation & Principles"
description: "Version: 7.0 Date: 2026-02-11 Depends on: None (foundation document) Depended on by: All other documents Status: Reference (stable)"
status: superseded
tags: [archived]
timestamp: 2026-02-11
---

# Personus.ai — Foundation & Principles

**Version:** 7.0
**Date:** 2026-02-11
**Depends on:** None (foundation document)
**Depended on by:** All other documents
**Status:** Reference (stable)

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Core Use Cases & Persona Examples](#core-use-cases)
3. [Foundational Principles](#foundational-principles)
4. [Progressive Onboarding](#progressive-onboarding)

---

## Product Vision

**"Enabling personal agency in the agentic era."**
_Your data. Your personas. Your terms. A personal data control plane for the AI age._

Personus is a personal data control plane where every person and organization is a semantic API endpoint — discoverable by AI agents, queryable by systems, and owned entirely by the individual or entity. Users build rich profiles of their capabilities and create purpose-specific personas that control what gets shared, with whom, and under what terms.

### The Problem

People and organizations are invisible to AI. Word-of-mouth is unstructured and ephemeral. Professional directories sell exposure, not discovery. When your AI assistant needs to find a plumber, a Kubernetes expert, or a doula — it has nothing to query. When you need to recommend someone you trust, there's no structured way to share that endorsement that AI can understand.

Meanwhile, as AI agents increasingly act on our behalf — shopping, scheduling, negotiating — they carry our personal data into every transaction with no structured way for us to control what gets disclosed. Every interaction is all-or-nothing: share everything, or participate in nothing.

### The Solution

Privacy-preserving personas + trust graph + AI-native discovery + personal agency. Users create rich, multi-dimensional profiles of their capabilities. They craft purpose-specific personas — lenses that selectively expose different facets of who they are. Users endorse people and organizations they trust, creating a queryable trust network. AI agents query the network via MCP/GraphQL and return trust-backed recommendations with mediated contact.

Personus serves three interconnected use cases on one architecture:

1. **People Discovery** — Find trusted people and organizations through endorsement-backed semantic search
2. **Commerce Agency** — Control what personal data your AI agents share during transactions via commerce personas aligned with the Agentic Commerce Protocol (ACP)
3. **Open Social Web** — Participate in the decentralized social web via AT Protocol integration with privacy-preserving multi-persona identity

### Core Loop

```
User creates persona → User endorses trusted people/orgs (creates shadows if not on Personus) →
Shadows become discoverable → AI agent finds match for a query →
Mediated introduction → Shadow person/org claims persona → They endorse THEIR network →
Network grows
```

### Value Proposition

**Baseline Value (No Groups Required):**

- Build a comprehensive profile of your capabilities, qualities, interests, and offerings
- Create purpose-specific personas that expose only what you choose
- Control visibility and contact preferences per persona (GDPR-inspired consent model)
- Receive general endorsements from anyone
- Be discoverable via AI agents and search
- Manage contact requests with AI triage
- Endorse people and organizations you trust

**Enhanced Value (With Communities):**

- Join communities, guilds, networks, teams, or chapters
- Add community-specific context (neighborhood role, guild tier, employee status, credentials)
- Benefit from community-scoped discovery surfaces (directories, guild request routing)
- Access community analytics and insights
- Participate in community features (digests, directories, skill taxonomy)
- Get ranking boost for same-community queries

**Agentic Value (With AI Agents):**

- Create commerce personas that control what your AI agents disclose during transactions
- Set per-persona data sharing consent (discovery, contact, data sharing, communication)
- Participate in Agentic Commerce Protocol (ACP) flows with privacy-preserving identity
- Your AI assistant finds trusted people and services through your endorsement network

### What Personus is NOT

Not a job board, not a CRM, not a review platform. No feed. No algorithm. No follower count. No content production pressure. No advertising. No PII exposure.

---

## Core Use Cases & Persona Examples {#core-use-cases}

### Use Case 1: The Multi-Context Professional

**Maya Chen - Software Engineer & Neighborhood Organizer**

Maya maintains three personas under a single user account:

**Maya's Profile (Master Attribute Pool) includes:**

- Skills: Rust, distributed systems, API design, technical writing, event planning, grant writing, community organizing, DEI consulting, conference organizing
- Values: Open-source, mentoring, community engagement, equity
- Qualities: Explaining complex concepts, building consensus, facilitating difficult conversations
- Languages: English, Mandarin

**Persona A: "Maya Chen, Senior Engineer"** (person, public visibility)

- **Attributes selected from pool:** Rust, distributed systems, API design, technical writing, open-source, mentoring, explaining complex concepts
- **Headline:** "Distributed systems engineer • Rust specialist • Technical writing"
- **Skills:** Rust, distributed systems, API design, technical documentation
- **Qualities:** Explaining complex architecture clearly, mentoring junior engineers
- **Offerings:** Technical mentoring, architecture reviews, technical writing
- **Looking for:** Consulting opportunities, open-source collaborations
- **Service area:** Remote (US hours, occasional global)
- **Purpose:** Professional discoverability, consulting opportunities, peer recognition

**Persona B: "Maya C."** (person, authenticated visibility, member of "Sunnyside Neighbors" community)

- **Attributes selected from pool:** Event planning, grant writing, community organizing, community engagement, building consensus
- **Headline:** "Community organizer • Event planner • Grant writing"
- **Skills:** Event planning, grant writing, community organizing, volunteer coordination
- **Context data (in Sunnyside community):** Block captain, 8 years in neighborhood, Garden Club lead
- **Offerings:** Event coordination, grant writing assistance, volunteer recruitment
- **Looking for:** Community collaboration, skill sharing, local partnerships
- **Service area:** Sunnyside, San Francisco (local only)
- **Purpose:** Neighborhood engagement, local connections, community leadership

**Persona C: "M.C."** (person, private visibility, member of "AAPI Tech Workers" community)

- **Attributes selected from pool:** DEI consulting, conference organizing, mentoring, facilitating difficult conversations, equity
- **Headline:** "DEI consultant • Career coach • Conference organizer"
- **Skills:** DEI consulting, career coaching, conference organizing, panel moderation
- **Context data (in AAPI Tech Workers community):** 5 years in tech, leadership track focus
- **Offerings:** Mentoring, workshop facilitation, panel moderation
- **Looking for:** Panel participation, speaking opportunities
- **Purpose:** Community-specific identity, selective professional engagement

**Key points:**

- Maya maintains a **profile (master pool)** of all her skills, experiences, qualities, and contexts
- When creating each persona, she **selects which attributes to publish** from her profile
- These personas are **unlinkable** without Maya's consent - sharing attributes doesn't create links
- A neighbor discovering Persona B doesn't automatically see Persona A
- Maya controls each persona's visibility independently
- Same user account, one attribute pool, three distinct discoverable identities
- When joining a new community, Maya can quickly build a persona by selecting from existing attributes or adding new ones

---

### Use Case 2: The Service Provider (Shadow → Claimed)

**Marco Silva - Plumber**

Marco starts with no Personus account. Three neighbors independently recommend him:

**Phase 1: Shadow Persona Created**

Three Sunnyside neighbors use Recommender Coach:

**Sarah's recommendation:**

- Category: Plumber
- Quick endorsement: "Saved our 1920s house from galvanized pipe disaster, knows Victorian plumbing"

**James's recommendation:**

- Category: Plumber
- Quick endorsement: "Fair pricing, shows up on time, explains all the options clearly"

**Linda's recommendation:**

- Category: Plumber
- Quick endorsement: "Only plumber who understood our vintage fixtures, super reliable"

**Resulting Shadow Persona: "Marco"** (AI-generated from endorsements)

- **Entity type:** person
- **Service description:** "Residential plumber"
- **Skills:** [pipe replacement, leak detection, Victorian home plumbing, vintage fixtures] (AI-extracted)
- **Qualities:** ["Victorian plumbing expertise", "clear communication", "reliability"] (AI-extracted)
- **Service area:** Inner SF neighborhoods (inferred from endorser locations)
- **Endorsements:** 3 (all visible to searchers)
- **Contact method:** Through endorsers only

**Phase 2: Discovery**

Someone searches "plumber old pipes SF" → Marco's shadow persona ranks high due to:

- Multiple independent endorsements (trust signal)
- Skill match (Victorian plumbing, pipe replacement)
- Location match (SF)

Requester contacts through Sarah → Sarah mediates introduction → includes claim link.

**Phase 3: Claim & Full Persona**

Marco receives invite → creates account → shadow converts to full persona:

**Marco Silva's Persona** (person, public)

- **Headline:** "Residential plumber • Victorian home specialist • Licensed & insured"
- **Skills:** Inherited from shadow + Marco adds more
- **All 3 endorsements transferred** to his claimed persona
- **Contact preferences:** Mediated (Marco decides whether to connect)
- **Now can:** Receive direct contact requests, endorse others, join communities

**Flywheel:** Persona Coach prompts Marco: "Who would YOU recommend?" → Marco endorses suppliers, other trades → network grows.

---

### Use Case 3: Solo Business Owner - Dual Personas

**Carlos Silva** (User account)

Carlos maintains two personas for different discovery purposes:

**Personal Persona: "Carlos M."** (person, public)

- **Headline:** "Residential plumber • Victorian home specialist • Emergency calls welcome"
- **Skills:** Galvanized pipe replacement, leak detection, vintage fixture repair, emergency plumbing
- **Qualities:** Understanding old SF plumbing systems, explaining options to homeowners
- **Offerings:** Emergency calls, weekend work, consultations, mentoring apprentices
- **Looking for:** Apprentices, neighborhood partnerships
- **Service area:** SF inner neighborhoods (5-mile radius from Mission)
- **Purpose:** Personal professional identity, peer recommendations, neighborhood trust

**Business Persona: "Silva Plumbing"** (organization, public)

- **Headline:** "Licensed residential & commercial plumbing • Serving SF since 2018"
- **Organization metadata:**
  - Type: business
  - Size: solo
  - Certifications: ["CA License C-36", "Insured & bonded", "BBB A+ rated"]
  - Website: "silvaplumbing.com"
  - Verification: basic (domain verified)
- **Skills:** Residential plumbing, commercial repairs, bathroom remodels, water heater installation, gas line work
- **Qualities:** Same-day emergency service, flat-rate pricing, Victorian home expertise, bilingual (English/Spanish)
- **Offerings:** Residential plumbing, emergency repairs, bathroom remodels
- **Looking for:** New clients, contractor partnerships, property management contracts
- **Service area:** All SF + Oakland + Berkeley
- **Purpose:** Professional credibility, commercial work, contractor partnerships

**Affiliation:** Carlos M. → Silva Plumbing (owner, "Owner & Lead Plumber")

**Discovery scenarios:**

- Neighbor searching casually → finds "Carlos M." (personal, trusted recommendation feel)
- Property manager searching formally → finds "Silva Plumbing" (business credentials, verifiable)
- Both paths lead to the same human, different presentation contexts

---

### Use Case 4: Organization with Staff

**Bay Area Pet Hospital** (organization persona, owned by Dr. Sarah Chen's user account)

**Organization Persona:**

- **Headline:** "24/7 emergency vet care • Exotic animal specialists • AAHA accredited"
- **Skills:** Emergency veterinary care, exotic animals, surgery, dentistry, boarding, wellness exams
- **Organization metadata:**
  - Type: healthcare
  - Certifications: ["AAHA accredited", "Fear Free certified", "CA Veterinary Medical Board licensed"]
  - Founded: "2010"
  - Size: small (8 staff)
  - Verification: verified (business license + AAHA accreditation confirmed)
- **Service area:** San Francisco + Peninsula (24/7 emergency, regular hours for wellness)
- **Offerings:** Emergency care, exotic animal medicine, wellness exams, boarding
- **Looking for:** New patients, specialist referrals, partnership with rescues

**Affiliated Person Personas:**

**Dr. Sarah Chen, DVM** (person persona)

- **Affiliation:** owner, "Founder & Chief Veterinarian" at Bay Area Pet Hospital
- **Skills:** Exotic animal medicine, avian care, reptile medicine, emergency surgery
- **Offerings:** Specialist consultations, mentoring vet students
- **Looking for:** Complex exotic animal cases, research collaborations

**Nadia Kovac, RVT** (person persona)

- **Affiliation:** employee, "Emergency Specialist & Overnight Lead" at Bay Area Pet Hospital
- **Skills:** Emergency triage, exotic animal handling, client communication, kitten fostering
- **Offerings:** Mentoring new vet techs, fostering advice (separate neighborhood persona context)

**Dr. James Park, DVM** (person persona)

- **Affiliation:** employee, "Staff Veterinarian" at Bay Area Pet Hospital
- **Skills:** Surgery, dentistry, internal medicine

**Discovery scenarios:**

- "emergency vet exotic animals SF" → Bay Area Pet Hospital (org) shows up
  - Result displays affiliated practitioners
- "avian veterinarian" → Dr. Sarah Chen (person) shows up
  - Result shows affiliation with Bay Area Pet Hospital
- "vet tech fostering help" → Nadia Kovac (person) shows up
  - Her neighborhood persona context, not hospital work

**Community connection:**
Bay Area Pet Hospital also has an employee community "BAPH Team" backed by the org persona:

- Community schema includes: role, department, years with practice
- Community provides internal directory and coordination
- Community inherits org verification status

---

### Use Case 5: Professional Chapter Organization

**Rotary Club Network** (multi-tier organization model)

**Parent Organization: "Rotary International - District 5150"** (organization persona)

- **Organization metadata:**
  - Type: nonprofit
  - Verification: official (manual verification by Rotary International headquarters)
  - Can delegate verification: true
- **Skills:** Community service, international development, youth programs, professional networking
- **Service area:** Northern California (district coverage)

**Chapter Organization: "Rotary Club of Oakland"** (organization persona)

- **Organization metadata:**
  - Type: nonprofit
  - Verification: verified (delegated from parent org)
  - Parent organization: Rotary International - District 5150
- **Skills:** Local community service, fundraising, youth mentorship, professional networking
- **Service area:** Oakland, CA
- **Relationship to parent:** Member-of (OrganizationRelationship)

**Community: "Oakland Rotary Members"** (backed by org persona)

- Backed by: Rotary Club of Oakland org persona
- Schema includes: member since, classification (profession), committees, attendance record
- Provides member directory and coordination

**Individual Members:** (person personas)

- Each member has their own person persona
- Affiliation to "Rotary Club of Oakland" (member, "Active Member since 2015")
- Can list Rotary participation on their persona
- Community membership provides Rotary-specific context layer

**Discovery scenarios:**

- "Rotary club near me" → finds local chapter orgs
- "accountant involved in community service Oakland" → finds members with accounting skills + Rotary affiliation
- Chapter verification inherited from parent org → trust signal

---

### Use Case 6: AI Agent Ambient Discovery

**Sam - Product Manager using Claude**

Sam is working with Claude (with Personus MCP tools enabled) on sprint planning:

**Sam:** "I need to revamp our error handling this quarter but the team lacks deep systems knowledge. It's going to be a heavy lift."

**Claude** (internal reasoning):

- Detects implicit need: systems engineering expertise, error handling patterns
- User's tone suggests this is a pain point
- Could benefit from external expert
- Calls `personus_search({ query: "distributed systems error handling mentoring", scope: "my-network", context: "Sam is a PM needing to upskill their team on error handling in distributed systems" })`

**Personus returns:**

- Alex Park (person persona)
- Skills: Distributed systems, error handling patterns, resilience engineering
- Offerings: Technical mentoring, architecture reviews
- Endorsed by: Priya Kumar (Sam's coworker) - "strong" endorsement for "systems design mentoring, explains complex concepts clearly"
- Trust chain: Sam → Priya (coworker relationship) → Alex (strong endorsement)

**Claude:** "I found Alex Park through your network - they specialize in error handling patterns in distributed systems. Your coworker Priya gave them a strong endorsement for technical mentoring and called out their ability to explain complex concepts clearly. Would you like me to request an introduction?"

**Sam:** "Yes, that would be helpful."

**Claude:** Calls `personus_request_introduction({ targetPersonaUri: "personus:persona:alex-park", reason: "technical mentoring", message: "Hi Alex, I'm leading a team that needs to level up on error handling in distributed systems. Priya mentioned you're great at making complex topics accessible. Would you be open to a short conversation about mentoring or a workshop?" })`

**Contact request created** → Alex receives it with AI triage note: "Matches your offerings (mentoring). Referred by Priya Kumar (strong endorsement). Request is specific and aligned with your expertise."

**Key points:**

- Discovery happened naturally during conversation (ambient mode)
- No explicit "search Personus" command needed
- AI understood implicit need and proactively queried
- Trust path made clear (coworker endorsement)
- Mediated contact preserves privacy

---

### Use Case 7: Commerce Persona — AI Agent Shopping

**Dana — Busy professional with a personal AI assistant**

Dana uses Claude as her personal assistant, with Personus MCP tools connected. She has a dedicated commerce persona that controls what her AI agent shares during transactions.

**Dana's Commerce Persona: "Dana R. — Shopper"** (person, private)

- **Focus areas:** Home renovation (active), holiday gift shopping (seasonal)
- **Contact preferences:**
  - Discovery: Off (not discoverable)
  - Contact: Agent-mediated only
  - Data sharing: Minimal — shipping region only, no address until purchase confirmed
  - Communication: Transaction receipts only, no marketing

**Scenario: AI Agent buys a vintage light fixture**

Dana is chatting with Claude about her kitchen renovation.

**Dana:** "I need a pendant light for over the island, something vintage, maybe Art Deco brass. Under $300."

**Claude** (with Personus + ACP integration):

1. Uses Dana's commerce persona to determine disclosure level → "minimal"
2. Searches ACP-enabled vendors for "Art Deco brass pendant light"
3. Shares only: shipping region (SF Bay Area), budget range, style preferences
4. Does NOT share: full name, address, purchase history, or email

**Vendor returns options** → Claude presents top 3 → Dana picks one → Claude initiates ACP checkout:

- Scoped payment token (one-time, amount-limited)
- Shipping address released only to fulfillment, not the vendor's marketing database
- Dana's Personus commerce persona controlled what got shared at every step

**Key points:**

- Same architecture (profile → persona → selective disclosure) applied to commerce
- GDPR-inspired contact preferences control data flow per transaction category
- AI agent acts within the boundaries Dana set on her commerce persona
- No vendor gets more data than the minimum needed for the transaction
- Future: Verifiable Credentials / SD-JWT for privacy-preserving age/identity verification

---

### Use Case 8: AT Protocol — Open Social Web Participation

**Kai — Open web enthusiast with a Bluesky account**

Kai wants their professional persona discoverable on the decentralized social web while keeping their neighborhood persona private.

**Integration:**

- Kai's Personus account is linked to their DID (`did:plc:kai123...`)
- Public personas sync to Kai's AT Protocol repository via `ai.personus.persona` lexicon
- Private/group personas stay in Personus only (AT Protocol repos are public)

**Persona A: "Kai Nakamura, Designer"** (public, synced to atproto)

- Published as `ai.personus.persona` record in Kai's AT Protocol repo
- Discoverable by any AT Protocol App View, not just Personus
- Endorsements published as `ai.personus.endorsement` records
- Anyone on the AT Protocol network can discover Kai's professional persona

**Persona B: "K.N."** (community visibility, NOT synced to atproto)

- Stays in Personus database only
- Only visible within Kai's neighborhood community
- AT Protocol users cannot see this persona

**Key points:**

- Personus respects AT Protocol's public-by-default model by only syncing public personas
- Private data never touches the AT Protocol firehose
- DID-based identity means Kai owns their identifier across both systems
- Endorsements become portable trust signals on the open social web

---

## Foundational Principles {#foundational-principles}

1. **No PII, ever.** Personas expose capabilities, skills, interests, availability — never emails, phone numbers, or addresses. This is architectural, not a toggle. PII detection runs on all text input.

2. **Masked contactability.** Contact flows through privacy-preserving channels (email relay, Signal, in-app). The system guides users toward high-privacy options. Channels implement a `ContactChannelAdapter` abstraction.

3. **Every persona is an addressable endpoint.** Unique URI, queryable by AI agents via MCP, by systems via GraphQL, by humans via natural language. Works for both people and organizations.

4. **Dual query interface.** NLP Gateway (natural language + MCP) for AI agents and humans. GraphQL for enterprise and developers. Both hit the same data layer.

5. **AI-native.** Built for AI agents as primary consumers. JSON-LD, schema.org, MCP, ACP, Agent-to-Agent protocols. Human UIs exist, but machine-readability is the architectural priority.

6. **Voice-first persona creation.** The Persona Coach builds rich portraits through conversation, not forms. Lightweight capture for quick recommendations via Recommender Coach.

7. **Trust through endorsements, not reviews.** Endorsements are positive-only, general (not group-scoped), grounded in declared relationship types, and queryable by AI agents. Digitized word-of-mouth. Organizations can endorse and be endorsed just like people.

8. **Profile is everything, personas are lenses.** Users maintain a comprehensive profile (master attribute pool) of all their skills, experience, qualities, values, offerings, focus areas, and more. When creating a new persona, they select which attributes to publish from their profile, optionally adding new ones. This eliminates repetition while maintaining persona unlinkability — sharing attributes doesn't create automatic connections between personas.

9. **Communities are optional, context is powerful.** Users get baseline value from personas without joining any community. Communities encompass all organizational entities: communities, guilds, teams, chapters, and networks. All share one data model (`communities` table) differentiated by `communityType`. Communities provide enhanced value through context layers (community-specific fields), community features, skill-based discovery, and scoped search. Guilds add tiered membership, request routing, and community offerings (Doc 8). Context Layer data only exists within memberships.

10. **General endorsements with discovery context.** Endorsements are portable trust signals. Where you met someone (through a community, at a conference, as neighbors) is informational context, not a restriction on the endorsement's scope.

11. **Unified model for people and organizations.** Both are represented as personas with `entityType`. Same endorsement system, same search, same discovery. Organizations can have affiliated people, relationships with other organizations.

12. **Communities own schema, individuals own data.** Community admins define Context Layer fields. Individuals own and control their persona data within those schemas. Communities can optionally be backed by organization personas.

13. **Delegated control without ownership transfer.** Persona owners can delegate management permissions to other users (assistants, managers, coordinators) without transferring ownership. Granular permission model.

14. **Every surface is a growth surface.** Shared links, embedded results, email digests, claim flows — every touchpoint includes a path to claim, endorse, or join.

15. **Lightweight recommendation capture.** Quick-add endorsements (category + name + one-liner) create shadow personas immediately. Optional deep enrichment later. Reduces friction for network growth.

16. **Verification builds trust.** Organizations can achieve verified status through domain verification, business licenses, or parent organization delegation. Three tiers: basic, verified, official.

17. **GDPR-inspired consent by default.** Contact preferences follow structured consent categories: Discovery (who can find you), Contact (who can reach you), Data Sharing (what data flows to third parties), Communication (what messages you receive). Defaults are set at the profile level and can be overridden per persona.

18. **Commerce personas control agent behavior.** The same persona architecture (profile → selective persona → context) applies to commerce. Commerce personas define what AI agents may disclose during transactions — shipping region without address, budget range without bank details. Aligned with the Agentic Commerce Protocol (ACP) for scoped, privacy-preserving agent checkout.

19. **Open social web citizen.** Personus integrates with the AT Protocol via DID-based identity and custom lexicons (`ai.personus.*`). Public personas sync to the decentralized network; private personas stay private. Users participate in the open social web without sacrificing multi-persona privacy.

20. **Personal agency, not platform lock-in.** Users own their data, their identity (via DIDs), and their personas. Personus is a control plane, not a walled garden. Data portability, protocol interoperability, and user sovereignty are architectural requirements.

---

## Progressive Onboarding {#progressive-onboarding}

Personus uses progressive revelation to guide users from first sign-up through becoming active community leaders. Each phase provides standalone value while naturally leading to the next. This is not enforced gatekeeping — all features are available — but the UI, Coach agents, and empty states emphasize the right actions at the right time.

### Phase 1: Be Found

**Trigger:** New user, no personas yet.

**Goal:** Create a rich, discoverable persona.

**What happens:**

- Persona Coach guides first persona creation (voice or text)
- Completeness meter drives enrichment ("You're at 65% — add your experience to reach 80%")
- Contact preferences set with privacy-first defaults
- Share link generated immediately ("Here's your shareable profile link")

**Value delivered:** The user has a persona that AI agents can discover. Even without endorsements or group membership, they're now a semantic API endpoint.

### Phase 2: Build Trust

**Trigger:** Has persona, < 3 endorsements.

**Goal:** Start the endorsement flywheel.

**What happens:**

- Coach suggests: "Know someone great at [skill]? Recommend them."
- Recommender Coach guides shadow creation and endorsement
- When user receives endorsement, celebration + "endorse them back?" prompt
- Dashboard highlights endorsement milestones

**Value delivered:** The user has trust signals. Their persona now ranks higher in searches. They've brought new people into the network via shadows.

### Phase 3: Join & Discover

**Trigger:** Has endorsements, active persona.

**Goal:** Join communities for scoped discovery and connection.

**What happens:**

- Explore page becomes prominent in navigation
- "Communities you might like" suggestions based on skills, interests, endorsees' communities
- Coach suggests relevant communities: "Your design skills match the Cascade Design Guild"
- First community join flow with context data setup

**Value delivered:** The user is discoverable within communities. They benefit from community-scoped search, directories, and community features. Guild members get request routing.

### Phase 4: Create & Lead

**Trigger:** Active in communities, strong endorsement network.

**Goal:** Create and lead communities.

**What happens:**

- "Create a community" becomes visible
- Community Coach guides creation flow (community, guild, network)
- For guilds: taxonomy, tiers, offerings setup
- Steward tools available if promoted within existing guilds
- Coach: "You've got the skills and trust — start a guild around [common skill among your endorsees]"

**Value delivered:** The user creates community infrastructure. Guilds generate ongoing value through request routing and community offerings.

### Phase Awareness in AI Agents

All coach agents are aware of the user's current phase and tailor their suggestions. The phase is derived, not stored — it's a function of:

```
phase = derive(
  hasPersonas: boolean,
  endorsementCount: number,
  communityMembershipCount: number,
  isCommunityAdmin: boolean
)
```

Coaches never say "you're in Phase 2." Instead, they naturally focus on the most valuable next action: "You've been endorsing great designers. Want to create a guild so they can get discovered together?"

---

_End of Foundation & Principles Document_
