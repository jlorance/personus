---
type: foundation
title: Personus.ai — Business Model
description: "Public Benefit Corporation (PBC). The legally binding public benefit purpose:"
status: current
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Business Model

> **This is the canonical library business document.** It's a Lean Canvas plus summary tables — dense by design. The long-form business narrative (revenue rationale, scenario deep-dives, competitor profiles, Sparks mechanics) lives in the five files under [`docs/business-model/`](../business-model/), which remain the reference. This file is the compressed canonical version downstream skills (`/plan-prd`, `/plan-messaging`) read.

## Corporate Structure

**Public Benefit Corporation (PBC).** The legally binding public benefit purpose:

> To advance personal agency and economic dignity by ensuring that every person controls their own professional identity, reputation, and data — free from platform extraction, surveillance advertising, and algorithmic manipulation.

This is not marketing — it is governance structure. Every design decision is evaluated against its impact on the health of the trust network, not just revenue potential. See [`01_executive_summary.md`](/business-model/01_executive_summary.md) §Public Benefit Corporation.

## Lean Canvas

### Problem

1. **People and organizations are invisible to AI.** Word-of-mouth is unstructured and ephemeral. Professional directories sell exposure, not discovery.
2. **The extraction economy.** Incumbent platforms (LinkedIn, Thumbtack, Angi, ZipRecruiter) monetize user-generated profiles by charging others to access them. LinkedIn earns $17.1B/year largely by charging recruiters to search profiles users built for free.
3. **Agentic disruption breaks extraction.** AI agents route around paywalls. Incumbents respond with more aggressive gating, accelerating user frustration and agent circumvention.
4. **Agents carry personal data into every transaction with no user control.** Every AI-mediated interaction is all-or-nothing.

**Existing alternatives:** LinkedIn (extraction), Thumbtack/Angi (lead-selling), Upwork/Fiverr (transaction tax), ZipRecruiter (resume database), Nextdoor (advertising), Bluesky (pre-revenue, no professional discovery), Circle/Mighty Networks (community only, no AI-native discovery).

### Customer Segments

Four archetypes, each with Base and Pro levels:

| Segment | Who | Entry tier | Earlybird/adopter wedge |
|---|---|---|---|
| **Solo** | Individuals building personas and discovering people | Free | Multi-context professionals (Maya archetype) who need multiple unlinkable personas |
| **Community Organizer (CO)** | Leaders of guilds, chapters, professional networks, neighborhood groups | $99/yr | Guild stewards and chapter leaders whose current tools (Slack + Google Sheets) are failing them |
| **Pathfinder** | Recruiters, talent scouts, BD, anyone doing systematic people discovery | $49/mo | Recruiters priced out of LinkedIn Recruiter ($835+/mo) |
| **Enterprise** | Organizations wanting internal talent intelligence + external discovery | $499/mo | Early ACP adopters needing an identity/consent layer |

### Unique Value Proposition

**Trust-backed, AI-native people discovery that cannot be paywalled.** Every persona — free or paid — is equally discoverable by AI agents. Revenue comes from services around the data (matching, privacy mediation, analytics, infrastructure) — never from the data itself. Mediated contact, privacy-by-default consent categories, and a unified model for people and organizations differentiate Personus from every incumbent.

**High-concept pitch:** "LinkedIn for the agentic era, except nobody's selling you."

### Solution

1. Master trait pool + selective persona lenses (unlinkable profiles from one source of truth)
2. Endorsement-backed trust graph (positive-only, no reviews, no ratings)
3. Shadow personas for network pre-acquisition (endorse non-users → they become discoverable → AI agents find them → claim invite sent)
4. MCP + GraphQL dual query interface (AI agents and human UIs consume the same data)
5. Communities as Context Layers — each membership adds a scoped field set without breaking persona unlinkability
6. Commerce personas with per-transaction consent (ACP-aligned)
7. Sparks — a generosity-credit system that rewards network-growing behaviors (endorsing, recommending, welcoming newcomers); see [`03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md)

### Unfair Advantage

1. **Trust network as moat.** Copying the features is easy; copying the trust graph is not. The endorsement flywheel compounds over time and cannot be bought.
2. **MCP-native from day one.** Architecturally designed for AI-agent consumption (JSON-LD, schema.org, MCP tools, structured query surfaces) instead of bolting AI onto a human-first UX. Enforced by [`principles.md#ai-native-discoverability`](/foundation/principles.md#ai-native-discoverability).
3. **Community sovereignty.** Communities own their data and schema. Facebook Groups (Meta owns the data) and LinkedIn Groups (Microsoft controls visibility) cannot match this without breaking their business model.
4. **Regulatory tailwinds.** GDPR, CCPA, EU AI Act, FTC non-compete rule, and the emerging data-portability regulatory consensus all favor a platform architecturally designed around consent, portability, and user ownership.
5. **Generosity flywheel + PBC governance.** Incumbents cannot credibly adopt a "revenue shared with community leaders" + "free tier never degrades" posture without destroying their P&L.

### Channels

**Year 1 — high-touch, community-led:**
1. **Guild and community seeding.** Recruit 20-50 "lighthouse" communities (trades guilds, tech meetups, professional associations) as design partners. Each imports member rosters, runs an endorsement drive, and becomes the anchor for local network density.
2. **Content-led SEO around specific verticals.** Publish "How [vertical] professionals use endorsement-based discovery" playbooks. Target long-tail queries where incumbents rank poorly.
3. **Product-led referral via Sparks.** Users earn Sparks for endorsing, recommending, welcoming newcomers. Sparks unlock features — the referral loop is built into the core product, not a bolt-on.
4. **Direct outreach to priced-out Pathfinder prospects.** LinkedIn Recruiter is $835+/mo; Pathfinder is $49/mo. This is a ~94% price delta, large enough that even a small feature set wins on TCO alone.

**Year 2+ — AI-agent-driven acquisition:**
- External MCP clients (Claude, ChatGPT, Gemini) will start surfacing Personus matches in their native chat surfaces. Every surfaced match is both a value moment (the user sees trust-backed discovery) and an acquisition channel (the discovered person gets a claim invite).

### Revenue Streams

Revenue flows from three sources — never from user data:

1. **Services around data** — AI coaching (Persona Coach, Recommender Coach), analytics (community intelligence, skill market insights), privacy mediation (masked contact channels, contact triage).
2. **Mediation of value exchange** — Fees on structured professional engagements (guild request routing), commerce transactions (Agentic Commerce Protocol flows), guild offerings.
3. **Infrastructure access** — MCP/API query metering by AI agents, enterprise integrations, community management tools.

### Cost Structure

See [§Unit Economics](#unit-economics) below.

### Key Metrics

Full framework in [`metrics.md`](/foundation/metrics.md). Top-level indicators: active trait-backed personas, endorsement velocity, shadow claim rate, MCP query volume, free-to-paid conversion, net revenue retention.

---

## Packaging & Pricing

Detail: [`02_packaging_and_pricing.md`](/business-model/02_packaging_and_pricing.md).

| Tier | Base price | Pro price | Billing | Target user |
|---|---|---|---|---|
| **Solo** | Free | $12/mo | Monthly | Individuals |
| **Community Organizer** | $99/year | $199/mo | Annual / Monthly | Guild + community leaders |
| **Pathfinder** | $49/mo | $149/mo (5 seats) | Monthly | Recruiters, BD, talent scouts |
| **Enterprise** | $499/mo | Custom | Monthly / Annual | Organizations |

**Six pricing principles** (PBC commitments — see [`02_packaging_and_pricing.md`](/business-model/02_packaging_and_pricing.md) §Pricing Principles):

1. Never charge for basic discovery. Free users are equally discoverable by AI agents.
2. Never sell user data. Not to advertisers, brokers, enterprises, or in aggregate.
3. Never use opaque algorithmic pricing. Every price is published.
4. Never lock users into annual contracts with termination penalties.
5. Never degrade the free tier to force upgrades.
6. Share revenue with community leaders. Guild stewards participate in the economics they help create.

### Communities — per-tier capability boundaries

The Communities area has the most detailed tier-gated mechanics of any product area. These boundaries are canonical and referenced from [`docs/specs/communities/00-prd.md`](/domains/communities/00-prd.md) §Tier Boundaries (which points here).

| Capability | Solo Free | Solo Pro | CO Base ($99/yr) | CO Pro ($199/mo) |
|-----------|-----------|---------|-----------------|-----------------|
| Communities created | Unlimited | Unlimited | Unlimited | Unlimited |
| Members per community | 200 | 200 | 1,000 | 10,000 |
| Context schema fields | 5 | 5 | 10 | Unlimited |
| Steward seats | 2 | 2 | 5 | 20 |
| Community types | All | All | All | All + network |
| Guild features | — | — | Yes | Yes |
| **Appearance: basics** (profile image, banner, tagline, accent color) | Yes | Yes | Yes | Yes |
| **Appearance: theme** (primary + secondary colors, light/dark) | — | — | Yes | Yes |
| **Appearance: gallery** (featured media on public page) | — | — | Up to 6 images | Up to 12 images |
| **Appearance: custom sections** (CO-authored markdown blocks) | — | — | — | Up to 5 |
| **Appearance: member badges** (visual flair on member cards) | — | — | — | Up to 10 |
| **Relationships** (active community-to-community connections) | 1 (accept only) | 1 (accept only) | Up to 5 | Unlimited |
| **Referral routing** (cross-community request routing) | — | — | — | Yes |
| **Schema inheritance** (parent → chapter trait schema sharing) | — | — | Yes | Yes |
| Analytics | Basic | Basic | Standard | Advanced |
| Integration APIs | — | — | — | Yes |

**Key principle applied in this table:** discovery is never gated. Community creation is never throttled. Limits exist for infrastructure (member count, schema fields) and advanced features (analytics, branding), not for core value. This is the PBC commitment "free tiers are generous" made concrete.

---

## Sparks — The Generosity Engine

Detail: [`03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md).

Sparks are a credit system that rewards the network-growing behaviors (endorsing, recommending non-users, responding to introductions, welcoming newcomers, guild contribution). **Earned through generosity, never purchased with money.** Spent on temporary premium features, visible badges, and community-facing boosts.

Sparks make generosity visible and recognized — they are the mechanism by which the PBC commitment to "free tiers are generous" becomes compatible with the growth model. Users who contribute to the network are rewarded; users who freeload don't earn Sparks but are never penalized.

Key design properties:
- Anti-gaming: diminishing returns, cooldowns, endorsement-quality checks via the trait taxonomy
- Tier-scaled multipliers (higher-tier users earn Sparks faster, but cannot buy them)
- UX integration: Sparks surface on the dashboard, in coach suggestions, in notification moments

---

## Market Sizing

Detail: [`05_competitive_landscape.md`](/business-model/05_competitive_landscape.md) §Market Sizing.

### Total Addressable Market (TAM)

| Market | Size | Personus's slice |
|---|---|---|
| Professional networking | $20B+ (LinkedIn alone is $17B) | Trust-backed, privacy-preserving alternative |
| Service marketplace | $5B+ (Thumbtack, Angi, Bark) | Guild-based discovery, no lead selling |
| Freelancer marketplace | $3B+ (Upwork, Fiverr) | Trust-backed introductions, not transaction tax |
| Community platform | $500M+ (Circle, Mighty, Guild.co) | AI-native, cross-community discovery |
| Verified credentials | $50B+ by 2026 | Endorsement-as-credential |
| AI agent tools/infrastructure | $52B by 2030 (46.3% CAGR) | MCP endpoint for capability discovery |

**Total TAM: ~$130B+** across the intersecting markets.

### Serviceable Addressable Market (SAM)

Year 3 target: **2M users, 12K communities, 3.5K Pathfinder subscribers, 200 Enterprise customers → $18.5M ARR.** This is 0.2% of LinkedIn's 1B users and a tiny fraction of TAM — significant growth runway remains.

### Serviceable Obtainable Market (SOM)

Year 1 target (PMF wedge): **100K free users, 5K paid subscribers across all tiers → $1.08M ARR.** Concentration strategy: drive network density in 3-5 specific verticals until AI-agent queries return trust-backed matches more often than not, then expand.

---

## Go-to-Market Strategy

### Sales Motion

| Tier | Motion | ACV | CAC target |
|---|---|---|---|
| **Solo Free / Solo Pro** | Product-led growth, self-serve | $0 / $144 | $2-5 blended |
| **Community Organizer** | Community-led (lighthouse communities) + self-serve | $99-2,388 | $10-30 |
| **Pathfinder** | Direct outreach to priced-out LinkedIn Recruiter prospects + content marketing | $588-1,788 | $50-100 |
| **Enterprise** | Founder-led sales for Year 1, AE-assisted Year 2+ | $6,000-24,000+ | $500-2,000 |

### Year 1 Priorities

1. Ship the core loop (persona → endorsement → shadow → claim → re-endorse) at quality
2. Recruit 20-50 lighthouse communities as design partners
3. Drive 100K free users with $2-5 blended CAC
4. Convert 5% of free users to Solo Pro within 12 months
5. Achieve Sean Ellis "very disappointed" >40% threshold in at least one wedge
6. Establish baseline unit economics and publish the first annual PBC report

---

## Competitive Landscape

Detail: [`05_competitive_landscape.md`](/business-model/05_competitive_landscape.md).

| Incumbent | Model | Vulnerability Personus exploits |
|---|---|---|
| **LinkedIn** | Extraction (charge recruiters to search profiles users built for free) | AI agents route around paywalls; recruiters priced out at $835+/mo; no privacy primitives |
| **Thumbtack / Angi / Bark** | Lead selling ($15-200/lead, 80% of contractors lose money) | Service providers hate the model; endorsement-backed discovery is structurally cheaper |
| **Upwork / Fiverr** | Transaction tax (15-20%) | No support for delegated agent commerce; trust signals are reviews, not endorsements |
| **ZipRecruiter** | Resume database (charge employers) | Single-identity model; no privacy-per-persona |
| **Nextdoor** | Hyperlocal advertising | Business model fundamentally incompatible with "no advertising" |
| **Bluesky / AT Protocol** | Decentralized social (pre-revenue) | No professional discovery; no endorsement primitives — **potential integration partner, not competitor** |
| **Circle / Mighty Networks** | Community infrastructure (community-scoped only) | No cross-community discovery; no AI-native query surface |

**Emerging landscape (no direct competitors yet):** MCP economy, Agentic Commerce Protocols (Stripe/OpenAI ACP, Visa TAP, Mastercard Agent Pay), verified credentials, trust economics. Personus is positioned to become the identity/discovery layer these ecosystems need.

---

## Unit Economics

Detail: [`04_growth_model_and_economics.md`](/business-model/04_growth_model_and_economics.md) §Unit Economics.

### Cost Structure Per User

| Component | Cost driver | Per-user/month |
|---|---|---|
| LLM inference (Coach) | GPT-4o: ~$0.05-0.10/session | Free: $0.50-1.00 (10 sessions); Pro: $2.50-5.00 (50 sessions) |
| LLM inference (triage/routing) | GPT-4o: ~$0.01-0.10/decision | $0.05-0.20 |
| Embedding generation | text-embedding-3-small | ~$0.001 (negligible) |
| Database (Neon + pgvector) | Compute + storage | ~$0.02-0.10 at scale |
| MCP/API serving | Vercel serverless | ~$0.001-0.01/query |
| Email/notifications | Transactional email | ~$0.01-0.05 |

**Key insight:** MCP queries are the highest-margin revenue line. When Claude or ChatGPT calls the Personus MCP endpoint, the caller's LLM pays for its own inference. Personus serves structured data from Postgres. Cost per MCP query is ~$0.001-0.005. Gross margin on a Pathfinder user making 200 queries/day: **~95%**.

### Margin by Tier

| Tier | Price | Cost/mo | Gross margin |
|---|---|---|---|
| Solo Free | $0 | $0.50-1.10 | -100% (investment) |
| Solo Pro | $12/mo | $2.50-5.50 | 54-79% |
| CO Base | $8.25/mo ($99/yr) | $5-15 | Breakeven to slight loss |
| CO Pro | $199/mo | $20-40 | 80-90% |
| Pathfinder | $49/mo | $2-5 | 90-96% |
| Pathfinder Team | $149/mo | $5-15 | 90-97% |
| Enterprise Base | $499/mo | $50-100 | 80-90% |
| Enterprise Pro | $2,000+/mo | $200-400 | 80-90% |

### Blended Gross Margin Trajectory

| Year | Revenue | COGS | Gross margin |
|---|---|---|---|
| Year 1 | $1.08M | $350K | 68% |
| Year 2 | $5.4M | $1.2M | 78% |
| Year 3 | $18.5M | $3.5M | 81% |

**LLM cost trajectory** works in our favor: GPT-4 pricing has dropped ~80% since launch (March 2023 → April 2026). Projected 2027 inference costs: $2-5 per 1M output tokens. Per-user Coach cost will decline 50-80% over the next 2 years, making the free tier cheaper to support over time — not more expensive.

### Free Users Are an Investment, Not a Cost

A free user costs $0.50-1.10/month in Coach LLM inference. In return, they contribute:
- A discoverable persona (improves search quality for everyone)
- 3+ endorsements on average (trust signals)
- 2+ shadow personas on average ($0-CAC user acquisition)
- Data that makes the network more valuable to paying users and AI agents

At 5% free-to-paid conversion with 18-month Solo Pro retention, the average free user's "revenue contribution" is ~$10.80 in LTV against $6-13.20 in 12-month cost. **Positive ROI before counting indirect network contributions.**

---

## Revenue Projections

Detail: [`04_growth_model_and_economics.md`](/business-model/04_growth_model_and_economics.md) §Revenue Projections.

| Year | Free users | Solo Pro | Pathfinder | Enterprise | Total ARR |
|---|---|---|---|---|---|
| **Year 1** (Foundation) | 100K | 5K | 230 | 13 | **$1.08M** |
| **Year 2** (Growth) | 500K | 25K | 1,150 | 65 | **$5.4M** |
| **Year 3** (Scale) | 2M | 75K | 3,500 | 200 | **$18.5M** |

**Key assumptions:**
- 5% free-to-paid conversion (industry benchmark: 2-5%)
- 18-month average Solo Pro retention
- 24-month average Pathfinder retention
- 36-month average Enterprise retention
- MCP queries growing 10-20× annually as AI-agent adoption accelerates
- Network effects improve conversion rates over time (more personas → better search → higher conversion)

---

## Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Chicken-and-egg network density.** Discovery only works if there's enough network; network only grows if discovery works. | High | Shadow personas (endorse non-users into existence); lighthouse communities for vertical density; Sparks rewarding generosity behaviors. |
| **LLM cost trajectory reverses.** Free tier depends on declining inference costs. | Medium | Swap-ready via `@ai-sdk/*` multi-provider; embed-once-use-many architecture; hard cost caps per `principles.md#ai-cost-and-loop-caps`. |
| **Clerk or Neon lock-in on P0 dependencies.** | Medium | `auth_provider` abstraction layer already in place; Neon is swappable to any Postgres + pgvector host. |
| **AT Protocol integration stalls.** | Low | AT Protocol is a feature-level dependency, not architectural. Public personas can sync to any open protocol. |
| **MCP standardization fragments.** | Medium | Build against the canonical MCP spec; maintain parallel GraphQL surface as a hedge. |
| **PBC revenue-sharing commitments constrain margin.** | Low | Structured as a percentage of overage, not a percentage of revenue. |
| **Regulatory shift away from data-portability tailwind.** | Low | Regulatory trend is globally consistent (GDPR, CCPA, AI Act, FTC). Reversal would affect the whole ecosystem, not Personus alone. |
| **A large incumbent (LinkedIn, Bluesky) copies the model.** | Low | Trust graph is the moat; incumbents cannot credibly adopt "free tier never degrades" without destroying their P&L. |

---

## Cross-References

- Executive summary: [`01_executive_summary.md`](/business-model/01_executive_summary.md)
- Packaging & pricing detail: [`02_packaging_and_pricing.md`](/business-model/02_packaging_and_pricing.md)
- Sparks generosity engine: [`03_sparks_generosity_engine.md`](/business-model/03_sparks_generosity_engine.md)
- Growth model & unit economics: [`04_growth_model_and_economics.md`](/business-model/04_growth_model_and_economics.md)
- Competitive landscape: [`05_competitive_landscape.md`](/business-model/05_competitive_landscape.md)
- Metrics framework: [`metrics.md`](/foundation/metrics.md)
- Vision: [`vision.md`](/foundation/vision.md)
- Principles: [`principles.md`](/foundation/principles.md)

_Last updated 2026-04-12 by `/plan-foundation` (Phase 1e — extracted from `docs/business-model/` 5-file suite)._
