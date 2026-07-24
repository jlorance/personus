---
type: foundation
title: Personus.ai — Visual User Interfaces
description: "Version: 6.0 Date: 2026-02-11 Depends on: Doc 2 (Data Model & Entities), Doc 4 (Agent Architecture), Doc 8 (Guilds) Status: Design reference (for future implementation)"
status: superseded
tags: [archived]
timestamp: 2026-02-11
---

# Personus.ai — Visual User Interfaces

**Version:** 6.0
**Date:** 2026-02-11
**Depends on:** Doc 2 (Data Model & Entities), Doc 4 (Agent Architecture), Doc 8 (Guilds)
**Status:** Design reference (for future implementation)

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Entry Point Map](#entry-point-map)
3. [Public Surfaces](#public-surfaces)
4. [Authenticated Dashboard](#authenticated-dashboard)
5. [Explore & Discovery](#explore-discovery)
6. [Coach Interfaces](#coach-interfaces)
7. [Community Admin](#community-admin)
8. [Guild Surfaces](#guild-surfaces)
9. [Embedded Surfaces](#embedded-surfaces)
10. [Component Library](#component-library)
11. [Empty States & Progressive Disclosure](#empty-states)

---

## Design Philosophy {#design-philosophy}

### Core Principles

1. **Capability-first, not social:** No feeds, no likes, no follower counts. Every view centers on what someone can do or what they offer.

2. **Trust signals visible:** Endorsements aren't hidden. They're the primary social proof, displayed prominently with relationship context.

3. **Entity-type aware:** UI adapts based on `entityType`. Person personas show pronouns and personal context. Organization personas show verification badges and certifications.

4. **Privacy-preserving by default:** Contact info never shown directly. All paths lead to mediated contact.

5. **AI-assisted, not AI-replaced:** Coach interfaces feel conversational but users always see what's being written to their profile in real-time.

6. **Cross-persona dashboard:** Users with multiple personas see unified activity feed, can switch contexts easily.

7. **Completeness as motivation:** Progress indicators drive profile completion without being naggy.

### Visual Language

**Colors** (from design tokens):

- Personas (people): Green (#4ade80)
- Organizations: Blue (#60a5fa)
- Shadows: Purple (#818cf8)
- Accent: Gold (#e8a838)

**Typography:**

- Display: Fraunces (serif, for names and headlines)
- Body: Outfit (sans-serif, for all UI text)
- Mono: JetBrains Mono (for URIs, technical)

**Layout:**

- Dark background (#0d1117)
- Card-based elevation (#161b22 cards on dark bg)
- Generous whitespace
- Mobile-first responsive

---

## Entry Point Map {#entry-point-map}

```
UNAUTHENTICATED SURFACES
├── Public Persona Card        personus.ai/:handle
├── Shadow Persona Card        personus.ai/s/:id
├── Shadow Claim Page          personus.ai/claim/:token
├── Community Landing Page     personus.ai/g/:slug (community, team, network, chapter)
├── Guild Public Page          personus.ai/guild/:slug (guild-specific layout)
├── Explore Page               personus.ai/explore (community directory + browse)
└── OG Link Previews           (generated images for social sharing)

AUTHENTICATED WEB APP (Dashboard)
├── Home                       Cross-persona overview, activity feed
├── Inbox                      Unified contact requests, AI triage
├── Explore                    Browse communities, search, filter by type/tags
├── Persona Detail/Edit        Full portrait editor, inline edit
├── Persona Coach              Voice-first portrait builder
├── Recommender Coach          Endorsement/shadow creation flow
├── Community Coach            Help creating and configuring communities
├── Community Admin            Members, schema builder, analytics (all types)
├── Guild Dashboard            Tier progress, requests, offerings (guild members)
├── Guild Steward Dashboard    Applications, routing, taxonomy, analytics
├── Delegation Management      Grant/revoke persona access
└── Account Settings           Auth, subscription, notification prefs

EMBEDDED SURFACES (Distribution Layer)
├── Slack Bot                  @Personus or /personus find [query]
├── Discord Bot                /personus find [query]
├── AI Extension (MCP)         Claude/ChatGPT with Personus tools
├── Email Digest               Weekly community summary
└── OG Cards                   Auto-generated for all shareable links

AI AGENT ACCESS (invisible to users, documented in Doc 3)
├── MCP Server                 personus_search, personus_list_communities, etc.
├── GraphQL API                Full schema for enterprise/developer
└── REST                       Simple endpoints for integrations
```

---

## Public Surfaces {#public-surfaces}

### 3.1 Public Persona Card

**URL:** `personus.ai/:handle` or `personus.ai/p/:uri`  
**Purpose:** The shareable, linkable representation of a persona.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ [Avatar]  Nadia Kovac, RVT                         ⭐   │ ← Verification badge if org
│           Emergency vet tech • Exotic animals           │
│           📍 Mission District, SF                       │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Skills                                           │   │
│ │ • Emergency triage  • Exotic animal handling     │   │
│ │ • Client communication  • Kitten fostering       │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Distinctive Strengths                            │   │
│ │ • Calm under pressure  • Great with scared pets  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Open To                                          │   │
│ │ • Mentoring new vet techs  • Fostering advice    │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Trust Signals                                    │   │
│ │ 🟢 3 endorsements                                │   │
│ │                                                   │   │
│ │ Sarah C. (colleague, strong):                    │   │
│ │ "Nadia's emergency skills saved our parrot..."   │   │
│ │                                                   │   │
│ │ Dr. James P. (supervisor, standard):             │   │
│ │ "Reliable, great with exotic animals"            │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Context (Bay Area Pet Hospital Team)             │   │
│ │ Role: Emergency Specialist                       │   │
│ │ Department: Emergency                            │   │
│ │ Years with practice: 6                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📧 Request Introduction                          │   │ ← Contact CTA
│ │                                                   │   │
│ │ Why are you reaching out?                        │   │
│ │ • Mentoring request                              │   │
│ │ • Fostering advice                               │   │
│ │ • Other: _______________                         │   │
│ │                                                   │   │
│ │ Your message:                                    │   │
│ │ [text area]                                      │   │
│ │                                                   │   │
│ │ 🛡️ Privacy note: Your contact info isn't shared. │   │
│ │    Nadia decides whether to connect.             │   │
│ │                                                   │   │
│ │ [Send Request]                                   │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Variations by Entity Type:**

**Person Persona:**

- Avatar: Initial-based, color: green
- Shows: pronouns (if set), personal skills, distinctive strengths
- Affiliations: "Works at [Org]" with link

**Organization Persona:**

- Avatar: Initial-based, color: blue
- Shows: verification badge (✓, ✓✓, or ⭐)
- Certifications prominently displayed
- Affiliated people: "Meet the team" section with staff personas
- Shows: founded year, size, website link

**Visibility Enforcement:**

- `public` → visible to anyone
- `authenticated` → visible to logged-in users (show login prompt)
- `private` → not shown (404)

---

### 3.2 Shadow Persona Card

**URL:** `personus.ai/s/:id`  
**Purpose:** Discoverable card for people/orgs not yet on Personus. Claim flow conversion.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ [Dashed Avatar]  Marco                             🟣   │ ← Shadow indicator
│                  Residential plumber                    │
│                  📍 Inner SF                            │
│                                                         │
│ ⚠️ This person hasn't claimed their profile yet         │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ What people say                                  │   │
│ │                                                   │   │
│ │ Sarah K. (neighbor):                             │   │
│ │ "Saved our 1920s house from pipe disaster,       │   │
│ │  knows Victorian plumbing inside out"            │   │
│ │                                                   │   │
│ │ James L. (customer):                             │   │
│ │ "Fair pricing, shows up on time, explains         │   │
│ │  all options clearly"                            │   │
│ │                                                   │   │
│ │ Linda M. (neighbor):                             │   │
│ │ "Only plumber who understood our vintage          │   │
│ │  fixtures, super reliable"                       │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Skills (from endorsements)                       │   │
│ │ • Pipe replacement  • Victorian plumbing         │   │
│ │ • Leak detection  • Vintage fixtures             │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📧 Contact through endorser                      │   │
│ │ [Request intro via Sarah K.]                     │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 👋 Is this you?                                  │   │ ← Claim CTA
│ │                                                   │   │
│ │ Claim this profile to:                           │   │
│ │ • See who's recommending you                     │   │
│ │ • Manage contact requests directly               │   │
│ │ • Add more about what you do                     │   │
│ │                                                   │   │
│ │ [Claim Your Profile →]                           │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Visual Distinctions:**

- Dashed border on avatar (unclaimed indicator)
- Purple accent color
- "Unclaimed" badge
- Endorsements shown as social proof
- Prominent claim CTA

---

### 3.3 Shadow Claim Flow

**URL:** `personus.ai/claim/:token`  
**Purpose:** Convert shadow to full persona, transfer endorsements.

**Steps:**

```
STEP 1: Preview
┌─────────────────────────────────────────────┐
│ 🎉 Someone recommended you on Personus!     │
│                                             │
│ [Dashed Avatar]  Marco                      │
│                                             │
│ 3 people have endorsed you:                 │
│ • Sarah K.: "Saved our house..."            │
│ • James L.: "Fair pricing..."               │
│ • Linda M.: "Knows vintage fixtures..."     │
│                                             │
│ [Sign Up to Claim →]                        │
│                                             │
│ Already have an account? [Sign In]          │
└─────────────────────────────────────────────┘

STEP 2: Auth (Clerk)
[Standard Clerk signup flow]

STEP 3: Profile Pre-Fill
┌─────────────────────────────────────────────┐
│ Let's build on what people said about you   │
│                                             │
│ We've pre-filled your profile based on      │
│ endorsements. Review and add more:          │
│                                             │
│ Display Name: Marco [edit]                  │
│ Headline: Residential plumber [edit]        │
│                                             │
│ Skills (from endorsements):                 │
│ ✓ Pipe replacement                          │
│ ✓ Victorian plumbing                        │
│ ✓ Leak detection                            │
│ + Add more skills                           │
│                                             │
│ [Continue]                                  │
└─────────────────────────────────────────────┘

STEP 4: Contact Settings
┌─────────────────────────────────────────────┐
│ How should people reach you?                │
│                                             │
│ Choose your preferred contact method:       │
│ ○ Email relay (most private)                │
│ ○ In-app only                               │
│ ○ Signal (requires setup)                   │
│                                             │
│ Contact policy:                             │
│ ○ Mediated (you approve each request)       │
│ ○ Open (anyone can request)                 │
│                                             │
│ [Save & Continue]                           │
└─────────────────────────────────────────────┘

STEP 5: Persona Coach Offer
┌─────────────────────────────────────────────┐
│ 🎤 Want to add more detail?                 │
│                                             │
│ Talk to Persona Coach to build a richer     │
│ profile in just 5 minutes.                  │
│                                             │
│ [Talk to Coach]  [Skip for now]             │
└─────────────────────────────────────────────┘

STEP 6: Flywheel Prompt
┌─────────────────────────────────────────────┐
│ 🌟 Who would YOU recommend?                 │
│                                             │
│ Help others get discovered like you did.    │
│                                             │
│ [Recommend Someone]  [Maybe Later]          │
└─────────────────────────────────────────────┘
```

**Post-claim:**

- All endorsements transfer to claimed persona
- Shadow marked as `claimed`
- ActivityEvents created for endorsers ("Marco claimed their profile!")

---

### 3.4 Community Landing Page

**URL:** `personus.ai/g/:slug`
**Purpose:** Public face of a community, member directory, join flow.

```
┌───────────────────────────────────────────────────────┐
│ [Icon] Sunnyside Neighbors                           │
│        Neighborhood • San Francisco                   │
│        👥 142 members                                 │
│                                                       │
│ A community-powered network helping neighbors         │
│ discover and support local skills and services.       │
│                                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔍 Search members                                │ │
│ │ [Find plumbers, tutors, pet sitters...]          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ Recent Endorsements                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Sarah → Marco (plumber)                          │ │
│ │ "Saved our 1920s house..."                       │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ James → Lisa (electrician)                       │ │
│ │ "Panel upgrades, explains everything..."         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ Top Skills in This Community                          │
│ Plumbing (12) • Pet care (8) • Tutoring (7)          │
│ Home repair (6) • Gardening (5)                       │
│                                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 👋 Join Sunnyside Neighbors                      │ │
│ │                                                   │ │
│ │ [Join with Email]  [Join with Google]            │ │
│ └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**If community is backed by org:**

```
┌─────────────────────────────────────────────┐
│ Official community of Bay Area Pet Hospital ⭐│
│ [Link to org persona]                       │
└─────────────────────────────────────────────┘
```

---

## Authenticated Dashboard {#authenticated-dashboard}

### 4.1 Home (Cross-Persona Overview)

**Layout:**

```
┌───────────────────────────────────────────────────────────┐
│ Personus                                    [Account ▾]   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Your Personas                                             │
│                                                           │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│ │ [N] Nadia K.    │ │ [S] Silva       │ │ + Add       │ │
│ │ Vet Tech        │ │ Plumbing        │ │   Persona   │ │
│ │                 │ │                 │ │             │ │
│ │ 88% complete    │ │ 92% complete    │ │             │ │
│ │ 🟢 3 endorse.   │ │ 🔵 7 endorse.   │ │             │ │
│ │ 📬 2 pending    │ │ 📬 1 pending    │ │             │ │
│ └─────────────────┘ └─────────────────┘ └─────────────┘ │
│                                                           │
│ Activity Feed                                             │
│ ┌───────────────────────────────────────────────────────┐│
│ │ 2h ago • Nadia K.                                     ││
│ │ Sarah C. endorsed you for "emergency triage"         ││
│ │ [View Endorsement]                                    ││
│ ├───────────────────────────────────────────────────────┤│
│ │ 5h ago • Silva Plumbing                               ││
│ │ New contact request from Maria G.                     ││
│ │ AI: "Matches your openTo for 'commercial work'"      ││
│ │ [Review Request]                                      ││
│ ├───────────────────────────────────────────────────────┤│
│ │ Yesterday • Nadia K.                                  ││
│ │ You endorsed Marco for "residential plumbing"         ││
│ │ Marco claimed their profile!                          ││
│ │ [View Profile]                                        ││
│ └───────────────────────────────────────────────────────┘│
│                                                           │
│ Quick Actions                                             │
│ [🎤 Talk to Coach] [⭐ Recommend Someone] [Share Link]   │
└───────────────────────────────────────────────────────────┘
```

**Persona Cards (condensed):**

- Initial avatar with entity type color (green/blue/purple)
- Display name + headline
- Completeness meter
- Endorsement count
- Pending contact count
- Click → goes to persona detail

---

### 4.2 Inbox (Unified Contact Requests)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Inbox                                    [Filter ▾]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [MG] Maria Garcia             2h ago    Pending     ││ ← List item
│ │ To: Silva Plumbing                                  ││
│ │ Commercial repair consultation                      ││
│ │ "Need help with..."                                 ││
│ │                                                     ││
│ │ AI: 85/100 • Matches "commercial work"              ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│ ← Detail panel
│ │ Request from Maria Garcia                           ││
│ │ To: Silva Plumbing                                  ││
│ │ Reason: Commercial repair consultation              ││
│ │                                                     ││
│ │ Message:                                            ││
│ │ "I manage a 20-unit building in the Mission. We    ││
│ │  need someone who knows old plumbing systems for    ││
│ │  a major pipe replacement project..."              ││
│ │                                                     ││
│ │ ┌─────────────────────────────────────────────────┐││
│ │ │ 🤖 AI Contact Assistant                          │││
│ │ │                                                   │││
│ │ │ Match Analysis: 85/100                           │││
│ │ │                                                   │││
│ │ │ ✓ Matches your "openTo: commercial work"         │││
│ │ │ ✓ Mentions Victorian/old plumbing expertise      │││
│ │ │ ✓ Large project (good fit for your services)    │││
│ │ │                                                   │││
│ │ │ Trust Signals:                                   │││
│ │ │ • Maria is in Sunnyside Neighbors community      │││
│ │ │ • No endorsement path found                      │││
│ │ └─────────────────────────────────────────────────┘││
│ │                                                     ││
│ │ [✓ Approve & Connect]  [✗ Decline]                 ││
│ │                                                     ││
│ │ If you approve, Maria will be able to:             ││
│ │ • Contact you via email relay (your choice)        ││
│ │ • See your full profile                            ││
│ │                                                     ││
│ │ Your contact info stays private.                   ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**List view columns:**

- Requester initial/avatar
- Name
- Target persona
- Reason
- Message preview
- AI triage score badge
- Status badge (pending/approved/declined)

**Detail panel:**

- Full message
- AI Contact Assistant analysis box (match score, what matches, trust signals)
- Approve/Decline buttons
- Privacy note explaining what happens

---

### 4.3 Persona Detail/Edit

**Layout (View Mode):**

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Home                          [Edit] [Share]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [N] Nadia Kovac, RVT                              88%  │ ← Completeness
│     Emergency vet tech • Exotic animals                 │
│     📍 Mission District, SF                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Base                                                 ││
│ │ Headline: Emergency vet tech • Exotic animals        ││
│ │ Location: Mission District, SF                       ││
│ │ Service Area: SF + Peninsula                         ││
│ │ Availability: Weekday evenings, weekends             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Attributes                                           ││
│ │ Skills: Emergency triage • Exotic animal handling    ││
│ │ Distinctive: Calm under pressure • Great with pets   ││
│ │ Open To: Mentoring vet techs • Fostering advice      ││
│ │ Values: Compassionate care • Continuous learning     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Context (Bay Area Pet Hospital Team)                 ││
│ │ Role: Emergency Specialist                           ││
│ │ Department: Emergency                                ││
│ │ Years with practice: 6                               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Endorsements (3)                                     ││
│ │ Sarah C. (colleague, strong): "Saved our parrot..."  ││
│ │ [View all endorsements]                              ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Affiliations                                         ││
│ │ Works at: Bay Area Pet Hospital [org link]           ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Edit Mode:**

- Inline editing (click any field to edit)
- Real-time completeness updates
- Validation feedback
- PII warnings if detected
- Auto-save

---

### 4.4 Commerce Settings

**Route:** `/settings/commerce` (or tab within the existing Settings page)

**Layout:** Organized by commerce trait category with collapsible sections:

1. **Commerce Foundations** — Locale, timezone, age/location verification
2. **Shipping & Delivery** — Address token, carrier preferences, delivery windows
3. **Budget & Spending** — Per-item/transaction limits, price sensitivity, sale preferences (marked as "Agent-Only" with lock icon)
4. **Size & Fit** — Clothing sizes by category, shoe size, fit preference, brand-specific notes
5. **Dietary & Health** — Restrictions, allergens, food preferences, household members (marked as "Sensitive" with shield icon)
6. **Brand & Style** — Favorite/blocked brands, style tags, materials, tech ecosystem
7. **Values & Sustainability** — Sustainability priority, required certifications, packaging, secondhand
8. **Agent Authorization** — Auto-purchase threshold, delegation scope, merchant lists, mandate expiry (marked as "Agent-Only")
9. **Return & Service** — Return policy minimum, dispute handling, review willingness (marked as "Agent-Only")

**Privacy Tier Badges:** Each section displays a privacy tier badge:
- 🌐 **Public** (green) — Always shared
- 🔀 **Selective** (blue) — Per-persona choice
- 🔒 **Gated** (amber) — ZK-provable only
- 🛡️ **Sensitive** (red) — Explicit consent required
- 🤖 **Agent-Only** (purple) — Never leaves your agent

**MCP Preview Panel:** A "Preview what AI agents see" button shows a read-only view of what the `personus_get_commerce_persona` MCP tool would return for the current persona, clearly marking excluded agent-local and sensitive traits.

**Metadata-Driven Rendering:** All commerce traits use the same `displayConfig` and `editConfig` system as professional traits. The settings UI renders each trait's editor based on its `editConfig.type` (tag_input, structured_form, select, etc.) from `trait_metadata`.

---

## Explore & Discovery {#explore-discovery}

### 5.1 Explore Page

**URL:** `personus.ai/explore` (public, enhanced for authenticated users)
**Purpose:** The primary discovery surface for finding communities (neighborhoods, guilds, networks, chapters).

```
┌───────────────────────────────────────────────────────────┐
│ Explore Communities                         [Create New ▾] │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ 🔍 Search communities...                                  │
│ [Find design guilds, neighborhoods, tech networks]        │
│                                                           │
│ Filter: [All Types ▾] [Any Location ▾] [Any Tag ▾]       │
│                                                           │
│ ── Featured ──────────────────────────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐ ┌────────────┐│
│ │ 🎨 Cascade Design│ │ 🔧 Mission Dist. │ │ 🏋️ Iron Oak ││
│ │ Guild            │ │ Trades Guild     │ │ Fitness    ││
│ │                  │ │                  │ │            ││
│ │ 14 members       │ │ 22 members       │ │ 89 members ││
│ │ Design, UX, UI   │ │ Plumbing, Elec.  │ │ Community  ││
│ │ ★ Verified       │ │ ★★ Licensed      │ │            ││
│ │                  │ │                  │ │            ││
│ │ [View Guild →]   │ │ [View Guild →]   │ │ [View →]   ││
│ └──────────────────┘ └──────────────────┘ └────────────┘│
│                                                           │
│ ── Guilds (Skill Communities) ───────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐               │
│ │ 🧠 Bay Area AI/ML│ │ 🎵 SF Producers  │               │
│ │ Mentors Guild    │ │ Collective       │               │
│ │ 35 members       │ │ 18 members       │               │
│ │ ML, AI, Mentoring│ │ Music, Audio     │               │
│ │ [View Guild →]   │ │ [View Guild →]   │               │
│ └──────────────────┘ └──────────────────┘               │
│                                                           │
│ ── Communities ──────────────────────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐               │
│ │ 🏘️ Sunnyside     │ │ 🌏 AAPI Tech     │               │
│ │ Neighbors        │ │ Workers          │               │
│ │ 142 members      │ │ 67 members       │               │
│ │ SF, Neighborhood │ │ Network, Tech    │               │
│ │ [View →]         │ │ [View →]         │               │
│ └──────────────────┘ └──────────────────┘               │
│                                                           │
│ [Load More]                                               │
└───────────────────────────────────────────────────────────┘
```

**Key behaviors:**

- Public visitors see public communities only; authenticated users also see authenticated-visibility communities
- Filter by `communityType` (All / Guilds / Communities / Networks / Teams / Chapters)
- Filter by tags, location/service area
- Search uses semantic matching on name + description + tags
- Cards adapt to community type (guilds show verification + offering count, communities show endorsement count)
- "Create New" dropdown offers: Community, Guild, Network (team/chapter creation flows from within org persona management)

### 5.2 Community Card Component

All community types share a base card component (`CommunityCard`), with type-specific badges and metadata:

```typescript
<CommunityCard
  community={community}
  variant="full" | "compact" | "minimal"
  showBackingOrg={boolean}
  showTags={boolean}
  showStats={boolean}
/>
```

**Variants:**

- `full`: Name, description, stats, tags, backing org badge, CTA
- `compact`: Name, type badge, member count, primary CTA
- `minimal`: Name, type icon only

**Type-specific elements:**

- **Guild:** Tier badge, offering count, "Submit Request" CTA alongside "View"
- **Community:** Endorsement count, "Join" CTA
- **Team:** Org verification badge, "Backed by [Org]" label
- **Chapter:** Parent org badge, delegated verification
- **Network:** Member count, visibility indicator

---

## Coach Interfaces {#coach-interfaces}

### 5.1 Persona Coach (Voice Mode)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Persona Coach                              [✗ End]      │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│ Conversation           │ Live Preview                   │
│                        │                                │
│ 🎤 Coach:              │ [N] Nadia K.            88%   │
│ "What do people come   │                                │
│  to you for?"          │ Headline:                      │
│                        │ Emergency vet tech •           │
│ 👤 You (voice):        │ Exotic animals          NEW   │
│ "Emergency care for    │                                │
│  exotic animals"       │ Skills:                        │
│                        │ • Emergency triage      NEW   │
│ 🎤 Coach:              │ • Exotic animal         NEW   │
│ "Love that! What       │   handling                     │
│  specifically?"        │                                │
│                        │ Completeness:                  │
│ 👤 You:                │ ███████████░░░░░ 88%          │
│ "Triage, handling,     │                                │
│  client communication" │ What's next:                   │
│                        │ □ Distinctive strengths        │
│ [🎤 Hold to talk]      │ □ Values                       │
│                        │ ✓ Headline                     │
│                        │ ✓ Skills                       │
│                        │                                │
└────────────────────────┴────────────────────────────────┘
```

**Features:**

- Split-screen: conversation (left) + live preview (right)
- Voice input: hold-to-talk button or continuous mode
- Text fallback available
- Real-time field updates with "NEW" badges
- Completeness meter updates live
- PII detection: "🛡️ PII blocked" badge if triggered
- Progress checklist shows what's complete/pending

**Voice UI patterns:**

- Visual waveform while speaking
- Transcription shown in real-time
- Coach responses use TTS (can toggle to text-only)
- Can interrupt coach (barge-in)

---

### 5.2 Recommender Coach (Batch Mode)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Recommender Coach                          [✗ End]      │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│ Conversation           │ Recommendations                │
│                        │                                │
│ 🎤 Coach:              │ ┌────────────────────────────┐│
│ "What would you        │ │ [M] Marco                  ││
│  recommend?"           │ │ Plumber                    ││
│                        │ │ ✓ Shadow created           ││
│ 👤 You:                │ │ ✓ Endorsed                 ││
│ [Taps: Plumber]        │ └────────────────────────────┘│
│                        │                                │
│ 🎤 Coach:              │ ┌────────────────────────────┐│
│ "Great! Name and       │ │ [L] Lisa                   ││
│  what makes them good?"│ │ Electrician                ││
│                        │ │ ✓ Shadow created           ││
│ 👤 You:                │ │ ✓ Endorsed                 ││
│ "Marco - saved our     │ └────────────────────────────┘│
│  house from pipe       │                                │
│  disaster, knows old   │ ┌────────────────────────────┐│
│  plumbing"             │ │ + Add another              ││
│                        │ └────────────────────────────┘│
│ 🎤 Coach:              │                                │
│ "Perfect! Anyone else?"│ Send invites?                  │
│                        │ ☑ Marco (copy link)            │
│ [🎤 Hold to talk]      │ ☐ Lisa (skip for now)          │
│                        │                                │
│                        │ [Send Selected Invites]        │
└────────────────────────┴────────────────────────────────┘
```

**Features:**

- Quick category selection (visual grid)
- One-liner capture per person
- Running list of created shadows (right panel)
- Batch invite sending
- Flywheel prompt at end: "Anyone else?"

---

## Community Admin {#community-admin}

**Layout (shared by all community types):**

```
┌─────────────────────────────────────────────────────────┐
│ Sunnyside Neighbors              community [Settings ▾]  │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Members] [Schema] [Analytics]               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Overview Tab                                            │
│                                                         │
│ 👥 142 members  •  🟢 87 active  •  ⭐ 234 endorsements │
│                                                         │
│ Recent Activity                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Sarah K. → Marco (plumber)                          ││
│ │ James L. → Lisa (electrician)                       ││
│ │ New member: Carlos joined                           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Top Skills                                              │
│ Plumbing (12) • Pet care (8) • Tutoring (7)            │
│ Home repair (6) • Gardening (5)                         │
│                                                         │
│ Skill Gaps (people searched but not found)             │
│ Locksmith (5 searches) • Spanish tutor (3)             │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Members Tab                                             │
├─────────────────────────────────────────────────────────┤
│ Search: [________________]        [+ Invite]            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [N] Nadia K.               member  •  3 endorsements ││
│ │     Vet tech                                         ││
│ ├─────────────────────────────────────────────────────┤│
│ │ [C] Carlos M.             member  •  0 endorsements  ││
│ │     Plumber                                          ││
│ ├─────────────────────────────────────────────────────┤│
│ │ [S] Sarah K.               admin  •  8 endorsements  ││
│ │     Community organizer                              ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Schema Tab (Context Layer Builder)                      │
├─────────────────────────────────────────────────────────┤
│ Define fields that members fill in for this community    │
│                                                         │
│ Current Schema v2                                       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 1. Block (select)                            [Edit] ││
│ │    Options: Monterey Blvd, Foerster St, ...         ││
│ │    Required: Yes  •  Display: Grid                  ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 2. Years in Neighborhood (number)            [Edit] ││
│ │    Required: No  •  Display: Inline                 ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 3. Homeowner/Renter (select)                 [Edit] ││
│ │    Options: Homeowner, Renter                       ││
│ │    Required: No  •  Display: Inline                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [+ Add Field]                                           │
│                                                         │
│ Preview:                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Block: [Monterey Blvd ▾]                            ││
│ │ Years in Neighborhood: [8]                          ││
│ │ Homeowner/Renter: [Homeowner ▾]                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Save Schema]                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Analytics Tab                                           │
├─────────────────────────────────────────────────────────┤
│ Last 30 days                                            │
│                                                         │
│ Queries: 127  •  Introductions: 23  •  New members: 8  │
│                                                         │
│ Most Searched Skills                                    │
│ [Bar chart]                                             │
│ Plumbing         ████████████████ 15                    │
│ Pet care         ████████████ 12                        │
│ Tutoring         ██████████ 10                          │
│ Home repair      ████████ 8                             │
│                                                         │
│ Skill Gaps (searched but not found)                     │
│ [Bar chart]                                             │
│ Locksmith        ████ 5                                 │
│ Spanish tutor    ███ 3                                  │
│ AC repair        ██ 2                                   │
│                                                         │
│ Member Activation                                       │
│ 87 active (completed profile + endorsed someone)        │
│ 34 inactive (incomplete profile or no endorsements)     │
│ 21 dormant (joined >90 days ago, no activity)          │
└─────────────────────────────────────────────────────────┘
```

---

## Guild Surfaces {#guild-surfaces}

Guild-specific UI extends the community admin with skill taxonomy, tiered membership, request routing, and community offerings.

### 8.1 Guild Public Page

**URL:** `personus.ai/guild/:slug`
**Purpose:** External-facing discovery surface organized around skills and offerings. Distinct from a standard community landing page.

```
┌───────────────────────────────────────────────────────────┐
│ 🎨 Cascade Design Guild                    ★ Verified     │
│    Vetted product designers • UX, visual, motion          │
│    14 members • 47 peer endorsements • 87 requests done   │
│                                                           │
│    [I Need Help →]                   [Join This Guild]    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ── Skills Directory ─────────────────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐ ┌────────────┐│
│ │ UX Research      │ │ Visual Design    │ │ Motion     ││
│ │ 6 members        │ │ 9 members        │ │ Design     ││
│ │ [S] [M] [A] +3   │ │ [K] [J] [L] +6   │ │ 4 members  ││
│ │ [Browse →]       │ │ [Browse →]       │ │ [Browse →] ││
│ └──────────────────┘ └──────────────────┘ └────────────┘│
│                                                           │
│ ── Offerings ────────────────────────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐               │
│ │ Design Sprint    │ │ UX Audit         │               │
│ │ $2K-$5K/project  │ │ $200-$500        │               │
│ │ 8 designers      │ │ 5 researchers    │               │
│ │ [Request This →] │ │ [Request This →] │               │
│ └──────────────────┘ └──────────────────┘               │
│                                                           │
│ ── Featured Members ─────────────────────────────────── │
│                                                           │
│ ┌──────────────────┐ ┌──────────────────┐               │
│ │ [M] Maya Chen    │ │ [K] Kim Park     │               │
│ │ Senior Member    │ │ Senior Member    │               │
│ │ UX, Visual       │ │ Motion, UI       │               │
│ │ 5 endorsements   │ │ 4 endorsements   │               │
│ │ [View Profile →] │ │ [View Profile →] │               │
│ └──────────────────┘ └──────────────────┘               │
│                                                           │
│ ── Request Help ─────────────────────────────────────── │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Describe what you need:                              │ │
│ │ [                                                  ] │ │
│ │ Urgency: [Normal ▾]  Budget: [Optional         ]    │ │
│ │ Or select an offering: [Choose offering ▾]           │ │
│ │                                                      │ │
│ │ [Submit Request →]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 8.2 Guild Member Dashboard

**URL:** `personus.ai/guild/:slug/dashboard` (authenticated, guild member)

```
┌───────────────────────────────────────────────────────────┐
│ Cascade Design Guild — My Dashboard                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Your Status                                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Tier: Full Member                                    │ │
│ │ ████████████░░░░ Progress to Senior                  │ │
│ │ Need: 3 more endorsements, 6 months tenure           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Requests Routed to You                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔵 "Need UX audit for fintech app" — 2h ago         │ │
│ │    Matched: UX Research • Normal urgency             │ │
│ │    [Accept] [Pass]                                   │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ✅ "Design sprint for mobile banking" — completed    │ │
│ │    Duration: 2 weeks • Client satisfied              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Your Offerings                                            │
│ Design Sprint (active) • UX Audit (active)                │
│                                                           │
│ Guild Activity                                            │
│ • New member: Alex joined as Associate (1h ago)           │
│ • Kim promoted to Senior Member (yesterday)               │
│ • New offering added: Brand Identity (2 days ago)         │
└───────────────────────────────────────────────────────────┘
```

### 8.3 Guild Steward Dashboard

**URL:** `personus.ai/guild/:slug/admin` (steward/admin only)

Extends the standard Community Admin with guild-specific tabs:

```
┌─────────────────────────────────────────────────────────┐
│ Cascade Design Guild — Admin           guild [Settings ▾] │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Members] [Taxonomy] [Offerings] [Routing]   │
│ [Applications] [Analytics]                               │
├─────────────────────────────────────────────────────────┤

Taxonomy Tab:
│ Skill Categories                          [+ Add Category] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ UX Research                                   [Edit] │ │
│ │ Tags: user research, usability testing, interviews   │ │
│ │ 6 members matched                                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Visual Design                                 [Edit] │ │
│ │ Tags: UI design, typography, color theory, Figma     │ │
│ │ 9 members matched                                    │ │
│ └─────────────────────────────────────────────────────┘ │

Routing Tab:
│ Pending Requests                           Mode: Steward  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ "Need UX audit for fintech app"              2h ago  │ │
│ │ AI matched: UX Research • Budget: $300-500           │ │
│ │ Suggested: Maya C. (Senior), Kim P. (Full)           │ │
│ │ [Approve Routing] [Edit Matches] [Decline]           │ │
│ └─────────────────────────────────────────────────────┘ │

Applications Tab:
│ Pending Applications                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [J] Jordan Lee — UX Designer                         │ │
│ │ Skills match: UX Research (4/5 tags), Visual (3/5)   │ │
│ │ Endorsements: 2 from guild members                   │ │
│ │ Tier criteria: ✓ Portfolio ✓ 1 endorsement           │ │
│ │ [Approve → Associate] [Request More Info] [Decline]  │ │
│ └─────────────────────────────────────────────────────┘ │
```

### 8.4 TierBadge Component

```typescript
<TierBadge
  tier={tier}
  size="sm" | "md" | "lg"
  showProgress={boolean}
/>
```

**Visual:** Badge with tier-specific icon, color, and label from `guild_membership_tiers.badgeConfig`.

---

## Embedded Surfaces {#embedded-surfaces}

### 7.1 Slack Bot

**Trigger:** `@Personus` or `/personus find [query]`

**Response (Block Kit):**

```
┌─────────────────────────────────────────────────────────┐
│ 🟢 Personus                                             │
│                                                         │
│ Found 2 people for "plumber old pipes":                 │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Marco Silva • Residential plumber                   ││
│ │ 📍 Inner SF • 3 endorsements                        ││
│ │                                                     ││
│ │ Skills: Pipe replacement, Victorian plumbing        ││
│ │                                                     ││
│ │ Trust: Sarah K. endorsed (strong): "Saved our      ││
│ │ 1920s house from pipe disaster..."                  ││
│ │                                                     ││
│ │ [Request Introduction] [View Full Profile]          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Carlos M. • Plumber                                 ││
│ │ 📍 Mission • 2 endorsements                         ││
│ │                                                     ││
│ │ Skills: Emergency plumbing, old homes               ││
│ │                                                     ││
│ │ [Request Introduction] [View Full Profile]          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ 🔒 Privacy: Contact info not shared. They decide.      │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Rich persona cards with endorsements
- "Request Introduction" button → opens modal
- "View Full Profile" → link to personus.ai
- Privacy footer

---

### 7.2 Discord Bot

**Trigger:** `/personus find plumber`

**Response (Rich Embed):**

```
┌─────────────────────────────────────────────────────────┐
│ 🟢 Personus Search Results                              │
├─────────────────────────────────────────────────────────┤
│ Marco Silva                                             │
│ Residential plumber • Inner SF                          │
│                                                         │
│ Skills                  Trust Signals                   │
│ Pipe replacement        3 endorsements                  │
│ Victorian plumbing      Sarah K. (strong)               │
│ Leak detection                                          │
│                                                         │
│ "Saved our 1920s house from pipe disaster..."           │
│                                                         │
│ [Request Introduction]  [View Profile →]               │
└─────────────────────────────────────────────────────────┘
```

---

### 7.3 Email Digest (Weekly)

**Subject:** Sunnyside Neighbors • Weekly Digest

```
─────────────────────────────────────────────────
SUNNYSIDE NEIGHBORS
Weekly Digest • Feb 1-7, 2026
─────────────────────────────────────────────────

📊 This Week
• 8 new endorsements
• 2 new members joined
• 12 searches

⭐ Recently Endorsed
Marco (plumber) — now has 3 endorsements
Lisa (electrician) — now has 2 endorsements

🔍 Top Searches
1. Plumber (5 searches)
2. Tutor (3 searches)
3. Pet sitter (2 searches)

❗ Skill Gaps
People searched for but we don't have:
• Locksmith (2 searches)
• Spanish tutor (1 search)

Know someone? [Recommend them →]

─────────────────────────────────────────────────

🎯 Improve Your Profile
Sarah K., you're at 76% completeness.
[Talk to Coach] to boost your visibility

─────────────────────────────────────────────────

👋 Help grow the network
[Recommend someone] [Share your profile]

─────────────────────────────────────────────────
```

---

## Component Library {#component-library}

### EntityCard Base Component

All card components (PersonaCard, CommunityCard, EndorsementCard, etc.) share a base `EntityCard` layout pattern:

```typescript
<EntityCard
  entityType="person" | "organization" | "shadow" | "community" | "guild" | "team" | "chapter" | "network"
  variant="full" | "compact" | "minimal"
  color={entityTypeColor}      // auto-derived from entityType
  avatar={avatarConfig}
  title={string}
  subtitle={string}
  badges={Badge[]}             // verification, tier, type
  stats={Stat[]}               // endorsements, members, completeness
  actions={Action[]}           // view, edit, contact, join
  children={ReactNode}         // type-specific content
/>
```

**Color mapping:**

- Person: Green (`--persona-person`)
- Organization: Blue (`--persona-org`)
- Shadow: Purple (`--persona-shadow`)
- Guild: Gold accent (`--accent-gold`)
- Community/Team/Network/Chapter: Blue (`--persona-org`) with type icon

This base pattern ensures visual consistency across all entity types while allowing type-specific content via `children`.

---

### PersonaCard Component

**Usage:** Dashboard, search results, community members

```typescript
<PersonaCard
  persona={persona}
  variant="full" | "compact" | "minimal"
  showEndorsements={boolean}
  showCompleteness={boolean}
  actions={["view", "edit", "share", "contact"]}
/>
```

**Variants:**

- `full`: All details, endorsements, actions
- `compact`: Name, headline, stats, one action
- `minimal`: Avatar, name, headline only

---

### 8.2 EndorsementCard Component

```typescript
<EndorsementCard
  endorsement={endorsement}
  variant="full" | "compact"
  showTestimonial={boolean}
/>
```

**Layout (full):**

```
┌─────────────────────────────────────────┐
│ [Avatar] Sarah Chen                     │
│          Colleague • Strong             │
│                                         │
│ Endorsed for: Emergency triage,         │
│ exotic animal handling                  │
│                                         │
│ "Nadia's emergency skills saved our     │
│  parrot. She stayed calm under pressure │
│  and..."                                │
│                                         │
│ Via: Bay Area Pet Hospital Team         │
│ 2 weeks ago                             │
└─────────────────────────────────────────┘
```

---

### 8.3 ContactRequestCard Component

```typescript
<ContactRequestCard
  request={contactRequest}
  variant="list" | "detail"
  showTriage={boolean}
  onApprove={fn}
  onDecline={fn}
/>
```

---

### 8.4 CompletenessIndicator Component

```typescript
<CompletenessIndicator
  score={number}
  variant="meter" | "badge" | "minimal"
  showBreakdown={boolean}
/>
```

**Variants:**

- `meter`: Progress bar with percentage
- `badge`: Circular badge with score
- `minimal`: Just the number

---

### 8.5 EntityTypeBadge Component

```typescript
<EntityTypeBadge
  entityType="person" | "organization"
  size="sm" | "md" | "lg"
/>
```

**Visual:**

- Person: Green circle
- Organization: Blue square
- Shadow: Purple dashed circle

---

### 8.6 VerificationBadge Component

```typescript
<VerificationBadge
  status="unverified" | "basic" | "verified" | "official"
/>
```

**Visual:**

- `basic`: ✓
- `verified`: ✓✓
- `official`: ⭐

---

## Design System Notes

### Spacing Scale

```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Border Radius

```
sm: 4px   (buttons, badges)
md: 8px   (cards)
lg: 12px  (modals, major containers)
full: 999px (avatars, pills)
```

### Shadows

```
sm:  0 1px 2px rgba(0,0,0,0.1)
md:  0 4px 6px rgba(0,0,0,0.1)
lg:  0 10px 15px rgba(0,0,0,0.1)
xl:  0 20px 25px rgba(0,0,0,0.1)
```

### Typography Scale

```
xs:   12px / 16px line-height
sm:   14px / 20px
base: 16px / 24px
lg:   18px / 28px
xl:   20px / 28px
2xl:  24px / 32px
3xl:  30px / 36px
4xl:  36px / 40px
```

---

## Responsive Breakpoints

```
sm:  640px   (mobile)
md:  768px   (tablet)
lg:  1024px  (desktop)
xl:  1280px  (wide desktop)
2xl: 1536px  (ultra-wide)
```

**Mobile-first approach:**

- Single column layouts on mobile
- Two-column on tablet
- Three-column on desktop
- Coach interfaces: stack conversation/preview vertically on mobile

---

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- ARIA labels on all icons and buttons
- Focus indicators (2px accent color outline)
- Minimum touch target: 44x44px
- Color contrast: 4.5:1 for text, 3:1 for UI components
- Screen reader announcements for dynamic content (endorsements, contact requests)

---

## Empty States & Progressive Disclosure {#empty-states}

Every surface has an empty state that guides users toward the next meaningful action. Empty states are opportunities, not dead ends.

### Empty State Strategy

| Surface                                     | Empty State                                                          | CTA                                      |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Dashboard (no personas)                     | "Start by creating your first persona"                               | [Talk to Coach] or [Create Persona]      |
| Dashboard (no endorsements)                 | "Know someone great? Recommend them."                                | [Recommend Someone]                      |
| Explore (no communities matched)            | "No communities match your search. Try broadening your filters."     | [Clear Filters] or [Create a Community]  |
| Inbox (no requests)                         | "No contact requests yet. Share your persona to get discovered."     | [Share Link]                             |
| Community directory (no members)             | "This community is just getting started. Invite people!"             | [Invite Members]                         |
| Guild requests (no requests)                | "No requests yet. Share your guild page to attract help-seekers."    | [Copy Guild Link]                        |
| Guild member dashboard (no routed requests) | "No requests routed to you yet. Make sure your availability is set." | [Update Availability]                    |

### Progressive Disclosure

The UI progressively reveals features as the user's engagement deepens. This is not enforced gatekeeping — features are available but visually emphasized at the right time.

**Phase 1: Be Found** (new user)

- Create first persona (Coach-guided)
- Set visibility and contact preferences
- Completeness meter drives enrichment
- CTA: "Share your profile link"

**Phase 2: Build Trust** (has persona, < 3 endorsements)

- Recommend someone you trust (shadow creation)
- Accept endorsements
- CTA: "Who would you recommend?"
- Coach suggests: "You've got skills listed but no endorsements yet. Want to recommend someone and start the flywheel?"

**Phase 3: Join & Discover** (has endorsements)

- Explore page becomes prominent in nav
- "Communities you might like" suggestions based on skills/interests
- Join first community
- CTA: "Join a guild to get discovered by outsiders"

**Phase 4: Create & Lead** (active in communities)

- "Create a community" option appears
- Guild creation flow (if user has org persona)
- Steward tools (if promoted)
- CTA: "You've got the skills and trust — start a guild"

Each phase highlights the relevant nav items and surfaces contextual nudges. The Coach agents are aware of the user's phase and tailor suggestions accordingly (see Doc 4 §Community Coach).

---

_End of Visual User Interfaces Document_

**Implementation notes:**

- Built with Next.js 16 + React 19 + Tailwind CSS v4
- Component library: shadcn/ui as base, custom Personus components
- Authorization: CASL `<Can>` component for conditional rendering (Doc 9)
- Responsive: Mobile-first approach
- Dark mode: Default (light mode future consideration)
- Voice interfaces: WebRTC + Mastra STS pipeline

**Future additions:**

- Light mode theme
- Animation patterns (micro-interactions, transitions)
- Loading states & skeletons
- Toast notifications system
- Mobile app considerations (React Native)

**Cross-references:**

- Doc 02 §Communities — data model for communities, community types, tags
- Doc 04 §Community Coach — AI-guided community creation and management
- Doc 08 §Guild Public Page — detailed guild page specification
- Doc 09 §Authorization — visibility rules for all surfaces, `<Can>` rendering pattern
- `docs/patterns/ui-components.md` — metadata-driven trait rendering architecture
