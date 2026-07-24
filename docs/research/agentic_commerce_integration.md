---
type: research
title: "Research: Agentic Commerce Protocol (ACP) & Commerce Personas"
description: "The Agentic Commerce Protocol (ACP), launched Sept 2025 by OpenAI + Stripe, enables AI agents to discover products, initiate checkout, delegate payment, and track fulfillment on behalf of users.…"
status: current
tags: [research]
timestamp: 2026-02-10
---

# Research: Agentic Commerce Protocol (ACP) & Commerce Personas

> Date: 2026-02-10
> Status: Research complete, design implications identified

## Summary

The Agentic Commerce Protocol (ACP), launched Sept 2025 by OpenAI + Stripe, enables AI agents to discover products, initiate checkout, delegate payment, and track fulfillment on behalf of users. Personus's existing architecture (user traits → selective persona projection → group-level context) maps remarkably well onto this use case. A "Commerce Persona" would let users control exactly what PII flows to merchants through their AI agent, using the same selective disclosure model we already have.

**Key insight:** Personus is not just a professional networking tool — it's a **personal data control plane**. The same architecture that lets you show different skills to different professional audiences can let you share different PII with different merchants, with your AI agent as the intermediary.

---

## ACP Technical Overview

### What It Is

An open standard (Apache 2.0) with three specs:

| Spec                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| **Product Feed**      | Structured catalog data merchants provide for AI discovery |
| **Agentic Checkout**  | REST API for checkout session lifecycle                    |
| **Delegated Payment** | Tokenized payment credential transfer via PSP              |

### Transaction Flow

```
User → AI Agent → Merchant API → PSP (Stripe/PayPal/Adyen)
         ↓              ↓              ↓
    Carries user     Validates      Processes
    preferences,     inventory,     tokenized
    never raw PII    calculates     payment
                     tax/shipping
```

The agent creates a checkout session, the merchant responds with options (shipping, pricing), the user confirms in the agent UI, and payment is processed via a one-time scoped token. The merchant never sees raw card numbers.

### Buyer Data Required by ACP

Minimal by design:

- `name` (max 256 chars)
- `email` (max 256 chars)
- `phone_number` (optional, E.164)
- `address` object (for shipping: line_one, city, state, country, postal_code)
- Payment via tokenized vault reference (`vt_*` or `spt_*`)

### Payment Authorization Model

ACP uses **scoped, time-boxed permission tokens**:

```json
{
  "allowance": {
    "reason": "one_time",
    "max_amount": 5999,
    "currency": "usd",
    "checkout_session_id": "cs_abc123",
    "merchant_id": "merchant_xyz",
    "expires_at": "2026-02-10T23:59:59Z"
  }
}
```

The token is single-use, capped, expired, and scoped to one merchant + session. This is analogous to how Personus personas scope data exposure.

### Ecosystem Status

- **Live:** Shopify (1M+ merchants), Etsy, ChatGPT
- **Announced:** Walmart, Instacart, PayPal, Salesforce, commercetools
- **Competing protocol:** Google's UCP (Universal Commerce Protocol) with Shopify, Best Buy, Target, Mastercard, Visa — broader scope, includes A2A and MCP

---

## Related Standards & Protocols

### AP2: Agent Payments Protocol (Google)

Introduces **Mandates** — cryptographic proof of user intent:

- Intent Mandates: "Buy concert tickets when available, max $200"
- Cart Mandates: "I approve this specific cart"
- Payment Mandates: "I authorize $X to merchant Y"

User's cryptographic signature provides non-repudiable proof. PayPal has endorsed AP2. Mandates are essentially **scoped capability delegations** — the same pattern as Personus personas.

### W3C Verifiable Credentials 2.0 (May 2025)

Standard for selective disclosure of claims. A holder presents a subset of credential claims without revealing the full document. Combined with SD-JWT (RFC 9901), enables proving "I am over 21" without revealing name/DOB/address.

### eIDAS 2.0 / EUDI Wallet (Mandatory Dec 2026)

Every EU member state must offer a digital identity wallet supporting selective disclosure. This is regulatory reality, not speculation. The wallet supports Electronic Attestations of Attributes — cryptographic proofs of age, qualifications, payment capability.

### Solid Pods (Tim Berners-Lee / Inrupt)

Personal data stores where users control access granularly. Architecturally equivalent to Personus user traits — master collection, selective projection, per-application access grants. Inrupt is already building AI applications that read from user pods with permission.

---

## Privacy-Preserving Commerce Patterns

### Disclosure Tiers

| Tier            | What                                | Disclosure Method           | Example                        |
| --------------- | ----------------------------------- | --------------------------- | ------------------------------ |
| **Public**      | Display name, locale, currency      | Always shared               | "en-US, USD"                   |
| **Selective**   | Shipping prefs, size, style         | SD-JWT / persona projection | "Size M, prefer cotton"        |
| **Gated**       | Age, location zone, membership      | Zero-knowledge proof        | "Over 21 = true"               |
| **Sensitive**   | Dietary, allergens, exact address   | Explicit consent, encrypted | "Peanut allergy" (GDPR Art. 9) |
| **Agent-local** | Budget, blocklists, standing orders | Never leaves user's control | "$50/item max"                 |

### Current E-Commerce Privacy State

| Data Type         | Current Practice                        | Privacy-Preserving Pattern                     |
| ----------------- | --------------------------------------- | ---------------------------------------------- |
| Shipping address  | Shared with merchant in full            | Tokenized address reference, proxy fulfillment |
| Payment           | Tokenization mature (Apple Pay, Stripe) | Already good via ACP vault tokens              |
| Purchase history  | Merchant-owned, siloed                  | User-owned, shared selectively                 |
| Size/fit          | Re-entered per merchant                 | Stored in user's profile, shared via SD-JWT    |
| Dietary/allergies | Rarely captured, re-entered             | Special category data, ZKP-provable            |
| Brand preferences | Inferred by merchant algorithms         | User-stated, agent-carried                     |

---

## Commerce Persona: Profile Attributes

### What a Commerce Persona Would Contain

Organized by our existing category grouping:

#### Foundations (identity layer)

| Attribute                | Type     | Privacy Tier | Notes                                         |
| ------------------------ | -------- | ------------ | --------------------------------------------- |
| Display name / pseudonym | `string` | Public       | Can be a pseudonym                            |
| Verified age bracket     | `string` | Gated (ZKP)  | "18+", "21+" — provable without revealing DOB |
| Verified location zone   | `string` | Gated        | "US-West", "EU" — not exact address           |
| Locale / currency        | `string` | Public       | "en-US", "USD"                                |
| Timezone                 | `string` | Selective    | For delivery windows                          |

#### Shipping & Delivery

| Attribute             | Type       | Privacy Tier | Notes                                |
| --------------------- | ---------- | ------------ | ------------------------------------ |
| Address token         | `string`   | Sensitive    | Encrypted reference, not raw address |
| Delivery instructions | `string`   | Selective    | "Leave at door"                      |
| Preferred carriers    | `string[]` | Selective    | ["USPS", "FedEx"]                    |
| Speed preference      | `enum`     | Selective    | fastest / cheapest / sustainable     |
| Delivery windows      | `object[]` | Selective    | Weekday 9-5, etc.                    |

#### Budget & Financial

| Attribute              | Type       | Privacy Tier | Notes                             |
| ---------------------- | ---------- | ------------ | --------------------------------- |
| Per-item max           | `number`   | Agent-local  | Hard constraint, never shared     |
| Per-transaction max    | `number`   | Agent-local  | AP2 mandate limit                 |
| Price sensitivity      | `enum`     | Agent-local  | budget / value / premium / luxury |
| Sale preference        | `enum`     | Agent-local  | wait / buy now / notify           |
| Subscription tolerance | `enum`     | Agent-local  | prefer / accept / avoid           |
| Payment method tokens  | `string[]` | Sensitive    | Tokenized refs only               |
| Loyalty programs       | `object[]` | Selective    | Program + tier                    |

#### Size & Fit

| Attribute         | Type     | Privacy Tier | Notes                        |
| ----------------- | -------- | ------------ | ---------------------------- |
| Clothing sizes    | `object` | Selective    | Per-category (tops, bottoms) |
| Shoe size + width | `string` | Selective    | "10 US Wide"                 |
| Fit preference    | `enum`   | Selective    | slim / regular / relaxed     |
| Brand size notes  | `object` | Selective    | { "Nike": "size up" }        |

#### Dietary & Health (GDPR Article 9 — special category)

| Attribute         | Type       | Privacy Tier | Notes                      |
| ----------------- | ---------- | ------------ | -------------------------- |
| Restrictions      | `string[]` | Sensitive    | vegetarian, gluten-free    |
| Allergens         | `string[]` | Sensitive    | peanuts, shellfish         |
| Preferences       | `string[]` | Selective    | organic, non-GMO           |
| Household dietary | `object[]` | Sensitive    | Family member restrictions |

#### Brand & Style Preferences

| Attribute            | Type       | Privacy Tier | Notes                     |
| -------------------- | ---------- | ------------ | ------------------------- |
| Favorite brands      | `string[]` | Selective    |                           |
| Blocked brands       | `string[]` | Agent-local  | Boycotts, bad experiences |
| Style tags           | `string[]` | Selective    | minimalist, streetwear    |
| Material preferences | `string[]` | Selective    | cotton, no-synthetic      |
| Tech ecosystem       | `string`   | Selective    | apple / android / mixed   |

#### Values & Sustainability

| Attribute                | Type       | Privacy Tier | Notes                       |
| ------------------------ | ---------- | ------------ | --------------------------- |
| Sustainability priority  | `enum`     | Selective    | critical / prefer / neutral |
| Required certifications  | `string[]` | Selective    | fair-trade, B-corp          |
| Packaging preference     | `enum`     | Selective    | minimal / recyclable        |
| Secondhand OK            | `boolean`  | Selective    |                             |
| Country-of-origin blocks | `string[]` | Agent-local  | Countries to avoid          |

#### Agent Authorization (AP2-aligned)

| Attribute               | Type       | Privacy Tier | Notes                                 |
| ----------------------- | ---------- | ------------ | ------------------------------------- |
| Auto-purchase threshold | `number`   | Agent-local  | Below this, agent buys without asking |
| Confirmation threshold  | `number`   | Agent-local  | Above this, always ask                |
| Delegation scope        | `string[]` | Agent-local  | ["groceries", "household"]            |
| Merchant allowlist      | `string[]` | Agent-local  | Only shop here                        |
| Merchant blocklist      | `string[]` | Agent-local  | Never shop here                       |
| Mandate expiry          | `string`   | Agent-local  | How long authorizations last          |

#### Return & Service Expectations

| Attribute             | Type     | Privacy Tier | Notes                                |
| --------------------- | -------- | ------------ | ------------------------------------ |
| Return policy minimum | `string` | Agent-local  | 30 days, 60 days                     |
| Dispute preference    | `enum`   | Agent-local  | agent handles / notify me / I handle |
| Review willingness    | `enum`   | Selective    | always / sometimes / never           |

---

## How This Maps to Personus Architecture

### The Architectural Alignment

| Personus Concept         | Commerce Mapping                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **User Traits (Profile)** | All commerce attributes above — the exhaustive master set                                             |
| **Persona**              | A selective projection for a specific context ("Grocery Persona" shares dietary but not clothing size) |
| **Group Membership**     | Merchant-specific context (loyalty tier, account references, delivery preferences for that merchant)   |
| **Contact Preferences**  | Agent authorization levels — what the agent can do, what requires confirmation                         |
| **Visibility controls**  | Privacy tiers — which attributes are public vs. selective vs. agent-local                              |
| **Trait metadata**       | Display/edit configs for commerce attribute types                                                      |
| **Endorsements**         | Verifiable credentials — merchant-attested claims ("verified buyer", "loyalty gold")                   |
| **Shadow Personas**      | Merchant-created profiles of a customer, claimable and correctable                                     |
| **Vector embedding**     | Semantic matching for product recommendations based on preferences                                     |

### Why This Works

Personus already has:

1. **Selective disclosure built in.** Personas project a subset of traits. A commerce persona projects only the attributes needed for shopping — dietary for grocery, sizes for fashion, budget constraints for the agent only.

2. **Per-group context.** `persona_group_memberships.contextData` JSONB can hold merchant-specific data (loyalty numbers, delivery preferences for that merchant) without polluting the main persona.

3. **Metadata-driven rendering.** Adding new commerce trait types (shipping prefs, dietary restrictions, size charts) requires only new `trait_metadata` rows, not code changes.

4. **GDPR-aligned contact preferences.** Our proposed consent model (discovery, contact, data sharing, communication categories) maps directly to commerce consent needs.

5. **The traits / persona mental model.** "Your Profile is everything about you. Personas are what you choose to share." This is exactly the commerce privacy pitch: your AI agent knows everything, but each merchant sees only what you allow.

---

## GDPR Considerations for Agentic Commerce

### ICO Jan 2026 Report Highlights

The UK ICO identified key challenges:

- Who is the data controller when agent-to-agent interactions occur?
- Consent scope creep: agent's purpose may broaden over time
- Purpose limitation per GDPR Article 5(1)(b)
- When agents process special category data (dietary = health), Article 9 applies

### Personus's Advantage

Our per-persona, per-purpose consent model directly addresses these:

- Each commerce persona has explicit, granular consent settings
- Agent authorization is scoped (mandate model)
- Special category data (dietary/allergens) gets a higher privacy tier
- Audit trail of consent changes is built into the system
- User can revoke any consent at any time, per-persona

---

## Strategic Positioning

Personus can be positioned as the **personal data control plane** for the agentic era:

1. **Professional discovery** — personas for career, community, collaboration (current focus)
2. **Commerce agent identity** — personas for shopping, with privacy-preserving selective disclosure (this doc)
3. **Open social web** — AT Protocol integration for portable identity (docs/foundation/at-protocol.md)

All three use cases share the same architecture: user-owned data pool → selective persona projection → context-specific sharing → consent management.

---

## Landscape Update (February 2026)

Since our initial research (Feb 10), the agentic commerce landscape has accelerated dramatically. Multiple competing protocols have launched, AI-powered shopping is mainstream, and the regulatory environment is catching up.

### Platform Comparison

| Platform | Protocol | Commerce Model | Payment | Status (Feb 2026) |
|----------|----------|---------------|---------|-------------------|
| ChatGPT (OpenAI) | ACP | Product feeds + checkout sessions | Stripe vault tokens | Live — 1M+ Shopify merchants |
| Google Shopping | UCP | Universal Commerce Protocol | Visa/Mastercard tokenization | Public beta — Best Buy, Target |
| Amazon Rufus | Proprietary | Conversational shopping + auto-buy | Amazon Pay | Live — Prime members |
| Perplexity | ACP-compatible | "Buy with Pro" one-click | Stripe | Live — US Pro users |
| Phia (by eBay) | Custom | Fashion-focused AI agent | eBay checkout | Beta — fashion vertical |
| OneOff | ACP | Agent-native brand storefronts | Stripe | Early access |
| Shopify | ACP + UCP (dual) | Agentic Storefronts API | Shop Pay | Live — all Shopify stores |
| commercetools | MCP server | Composable commerce backend | Multiple PSPs | GA — enterprise merchants |

### Market Numbers

- **McKinsey (Jan 2026):** Agentic commerce represents a $3-5 trillion opportunity by 2030
- **Morgan Stanley (Dec 2025):** US AI-influenced commerce projected at $190-385 billion by 2028
- **Adobe Analytics (Q4 2025):** 805% YoY increase in AI agent-referred traffic to retail sites
- **Salesforce (Jan 2026):** 45% of online shoppers have used an AI shopping agent at least once
- **Stripe (Feb 2026):** ACP checkout sessions processing $2B+ monthly across all merchants

---

## The Two Protocol Wars

### ACP vs UCP

| Dimension | ACP (OpenAI + Stripe) | UCP (Google + Shopify) |
|-----------|----------------------|----------------------|
| **Backers** | OpenAI, Stripe, PayPal, Shopify, Etsy, Walmart | Google, Shopify, Best Buy, Target, Visa, Mastercard |
| **Scope** | Checkout + payment only | Full lifecycle (discovery → checkout → fulfillment → returns) |
| **Payment** | Stripe vault tokens (SPT) | Any PSP via tokenization standards |
| **Agent model** | Single agent ↔ merchant | Agent-to-agent (A2A) + MCP integration |
| **Discovery** | Product feeds (merchant-provided) | Shopping Graph + merchant feeds |
| **Open source** | Apache 2.0 | Apache 2.0 |
| **Key difference** | Simpler, checkout-focused | Broader, includes MCP for context |

### The MCP Connection

Google's UCP explicitly incorporates MCP (Model Context Protocol) as the mechanism for agents to access user context. This creates a natural integration point for Personus:

- **Personus MCP server** = "who am I as a buyer" (preferences, sizes, dietary, budget)
- **Commerce MCP server** = "what can I buy" (product catalogs, inventory, pricing)
- **Agent combines both** to make personalized purchasing decisions

This is exactly the architecture Personus was built for — the agent reads from the user's Commerce Persona via MCP, then shops on their behalf.

---

## The Preference Gap

Every major platform silos user preferences:

| Platform | What They Know | Portable? | User Controls? |
|----------|---------------|-----------|---------------|
| Amazon | Purchase history, sizes, dietary | No — locked in | Minimal |
| Instacart | Grocery preferences, allergens | No | Limited |
| Nike | Shoe size, style, fit notes | No | None |
| Shopify | Per-store purchase history | No | Per-merchant |
| Apple | Payment + basic prefs | Partially (Wallet) | Good |

**Nobody owns portable buyer identity.** Each platform rebuilds a shadow profile of the user from purchase signals. Users re-enter sizes, dietary restrictions, and brand preferences at every new merchant.

**Personus fills this gap:** A user-owned, privacy-preserving Commerce Persona that any AI agent can read (with permission) via MCP. The user states their preferences once, controls who sees what, and their agent carries this context to any merchant.

---

## MCP as the Integration Mechanism

The key architectural insight: Personus doesn't need to integrate directly with ACP or UCP. Instead, it serves as the **user context layer** that any commerce agent reads via MCP.

### Flow: "My AI agent shops for me"

```
User's AI Agent (ChatGPT, Gemini, Claude, etc.)
    ├── Reads: Personus MCP → Commerce Persona (sizes, dietary, budget, brands)
    ├── Reads: Merchant MCP → Product catalog, pricing, inventory
    ├── Decides: Best match given preferences + constraints
    ├── Checkout: ACP or UCP → Creates session, applies preferences
    └── Payment: Scoped token (SPT or mandate) → PSP processes
```

### Privacy Model

The Commerce Persona uses the same privacy-tier system as professional personas:

- **Public traits** (locale, currency) → always available
- **Selective traits** (sizes, brands, style) → per-persona opt-in
- **Gated traits** (age verification, location zone) → ZK-provable attestation only
- **Sensitive traits** (dietary, allergens, payment tokens) → explicit consent required
- **Agent-local traits** (budget, blocklists, auto-buy rules) → **never leave the user's agent**

Agent-local traits are the critical differentiator. A user's budget ceiling, brand blocklist, and auto-purchase thresholds are instructions for their own agent — never shared with merchants or other agents.

---

## Top Use Cases

### 1. "My AI agent shops for me"
The agent reads the full Commerce Persona via MCP, browses merchants, applies preferences (size, brand, budget), and presents top options. For items under the auto-purchase threshold, it buys directly. Above the threshold, it asks for confirmation.

### 2. Privacy-preserving grocery shopping
A dietary-focused persona shares only food preferences (vegetarian, nut allergy, organic preference) without revealing name, address, or payment details. The agent applies these filters across Instacart, Amazon Fresh, and local co-ops.

### 3. Fashion agent with brand intelligence
The persona includes clothing sizes, fit preferences, brand-specific sizing notes ("Nike runs small, size up"), and style tags. The agent shops across multiple merchants with this context, avoiding the "re-enter your size at every store" problem.

### 4. Budget-aware autonomous purchasing
Agent-local budget constraints (per-item max, per-transaction max, price sensitivity) guide the agent's decisions. It can auto-buy household staples under $30 but must confirm electronics over $100. The merchant never knows the user's budget ceiling.

### 5. Sustainable shopping filter
Values-based filtering: the persona specifies sustainability priority, required certifications (Fair Trade, B Corp, organic), and packaging preferences. The agent pre-filters products before presenting them, removing options that don't meet the user's values.

### 6. Merchant-specific context
Community membership traits store per-merchant data: loyalty program numbers, delivery preferences for that merchant, return history. When the agent shops at a specific merchant, it includes this context for personalized service.

---

## Regulatory & Standards Update

### ICO Agentic AI Report (January 2026)

The UK Information Commissioner's Office published guidance on AI agents and data protection:

- **Controller determination:** When an agent processes personal data for commerce, the user (or their delegated agent) is typically the controller, not the merchant
- **Purpose limitation:** Agent's processing scope must match the user's stated purpose — no scope creep
- **Special category data:** Dietary restrictions and allergens are health data under GDPR Article 9, requiring explicit consent
- **Consent granularity:** Blanket "I consent to AI shopping" is insufficient — consent must be per-category, revocable

**Personus alignment:** Our per-trait privacy tiers and per-persona consent model directly address every ICO concern. Commerce traits marked as `sensitive` require explicit consent before sharing.

### eIDAS 2.0 Timeline

EU Digital Identity Wallet mandated by December 2026. Every EU citizen will have access to a wallet supporting selective disclosure of attributes. Personus Commerce Personas are architecturally compatible — our gated privacy tier maps to EUDI attestations.

---

## Sources

### ACP / Commerce Protocols

- [OpenAI ACP Documentation](https://developers.openai.com/commerce/)
- [ACP GitHub](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [ACP Checkout Spec](https://developers.openai.com/commerce/specs/checkout)
- [ACP Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment/)
- [Stripe: Open Standard for Agentic Commerce](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce)
- [Stripe Shared Payment Tokens](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens)
- [AP2 Protocol](https://ap2-protocol.org/)
- [Google AP2 Announcement](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [PayPal AP2 Endorsement](https://developer.paypal.com/community/blog/PayPal-Agent-Payments-Protocol/)
- [OpenAI: Buy it in ChatGPT](https://openai.com/index/buy-it-in-chatgpt/)
- [PayPal + OpenAI Partnership](https://newsroom.paypal-corp.com/2025-10-28-OpenAI-and-PayPal-Team-Up-to-Power-Instant-Checkout-and-Agentic-Commerce-in-ChatGPT)

### Privacy & Identity Standards

- [W3C Verifiable Credentials 2.0](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0/)
- [SD-JWT (RFC 9901)](https://datatracker.ietf.org/doc/rfc9901/)
- [W3C DIDs v1.1](https://www.w3.org/TR/did-1.1/)
- [eIDAS 2.0 / EUDI Wallet](https://www.partisia.com/blog/eudi-wallet-2026-what-it-means-for-eu-digital-identity)
- [Solid Project](https://solidproject.org/about)
- [Inrupt AI + Solid Pods](https://ai.northeastern.edu/news/inrupt-ai-in-a-world-of-user-owned-data)
- [Kantara Consent Receipt / ISO 27560](https://kantara.atlassian.net/wiki/spaces/CRWG/overview)

### Agentic Commerce Industry Analysis

- [McKinsey: Agentic Commerce Opportunity](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants)
- [BCG: Agentic Commerce Redefining Retail](https://www.bcg.com/publications/2025/agentic-commerce-redefining-retail-how-to-respond)
- [ICO Agentic AI Report (Jan 2026)](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/01/ai-ll-get-that/)
- [IAPP: GDPR Engineering for Agentic AI](https://iapp.org/news/a/engineering-gdpr-compliance-in-the-age-of-agentic-ai/)

### Payment & Tokenization

- [Mastercard Tokenization](https://www.mastercard.com/us/en/news-and-trends/stories/2025/what-is-tokenization.html)
- [Apple Pay Privacy](https://www.apple.com/legal/privacy/data/en/apple-pay/)
- [EMV Tokenization Trends](https://intellipay.com/under-the-hood-with-emv-tokenization/)

### Agentic Commerce — 2026 Updates

- [Google Universal Commerce Protocol](https://developers.google.com/commerce/ucp)
- [Shopify Agentic Storefronts](https://shopify.dev/docs/api/agentic-storefronts)
- [commercetools MCP Server](https://docs.commercetools.com/mcp)
- [Perplexity Buy with Pro](https://www.perplexity.ai/hub/blog/buy-with-pro)
- [Amazon Rufus AI Shopping](https://www.aboutamazon.com/news/retail/amazon-rufus)
- [McKinsey: Agentic Commerce Opportunity 2026](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity)
- [Salesforce State of Commerce 2026](https://www.salesforce.com/resources/research-reports/state-of-commerce/)
- [Adobe Digital Economy Index Q4 2025](https://business.adobe.com/resources/digital-economy-index.html)
- [ICO: AI Agents and Data Protection](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/01/ai-ll-get-that/)
- [eIDAS 2.0 Implementation Timeline](https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation)
