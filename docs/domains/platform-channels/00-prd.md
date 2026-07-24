---
type: prd
title: Platform Integrations — Overview Spec
description: "Communities already live somewhere — a Discord server, a WhatsApp group, a Slack workspace, a creator's Instagram following. People in those communities have skills, experience, offerings, and…"
status: current
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — Overview Spec

> **Reconciliation note (2026-07-24):** The shipped build replaced the heavyweight `integrations` table with the lean `platform_channel_bindings` table (community_id, platform, external ref, installed_by, status, tokens). Mastra's first-class Channels own routing / threading / memory. `integrations`-table references below have been renamed; some surrounding prose still describes the pre-reconciliation design and is superseded by `packages/db/src/schema/platform-channels.ts`.

> Date: 2026-02-23
> Status: Draft — awaiting review
> Related: `01-shared-architecture.md`, `02-matrix.md`, `03-bot-architecture.md`, `04-whatsapp.md`, `05-signal.md`, `06-telegram.md`, `07-discord.md`, `08-slack.md`, `09-activitypub.md`, `10-activity-tracking.md`

---

## 1. Why Integrations Exist

Communities already live somewhere — a Discord server, a WhatsApp group, a Slack workspace, a creator's Instagram following. People in those communities have skills, experience, offerings, and values, but that information is invisible. The community organizer can't answer "who here knows grant writing?" The members can't find each other by capability. An AI agent can't tell you "three people in this group are Kubernetes experts."

Personus is the **intelligence layer** that makes those communities self-aware. When a Community Organizer connects their platform to Personus, their community gains:

- **Capability discovery** — find out who knows what, who can help with what, who values what
- **AI-powered introductions** — "I need someone who speaks Mandarin and knows event planning" → Personus finds the right person and mediates the introduction
- **Trust signals** — endorsements from real community members, not follower counts
- **Structured identity** — members aren't just usernames; they're multi-dimensional personas with skills, experience, and offerings

Personus doesn't replace where communities communicate. It makes those communities smarter.

---

## 2. Platform Landscape

Communities live across three categories of platforms. Each serves a different purpose, and Personus augments all of them differently.

### 2.1 Communication Platforms

Where communities have real-time conversations. These are the primary integration targets because this is where people ask "does anyone here know...?" — and Personus can answer that question.

| Platform | What it is | Integration depth | Notes |
|----------|-----------|-------------------|-------|
| **Matrix / Element** | Open, federated messaging protocol | Deep (Tier 1-5) | Open protocol, Appservice API, Widget API. First-class integration. See `02-matrix.md` |
| **Discord** | Community servers with voice/text channels | Deep (Tier 1-4) | Bot API, slash commands, rich embeds, HTTP Interactions (serverless). ~200M MAU. See `07-discord.md` |
| **Slack** | Workspace messaging for teams | Deep (Tier 1-4) | Events API, Block Kit, App Home, modals (all serverless). Dominant in professional/workplace communities. See `08-slack.md` |
| **Telegram** | Supergroups, channels, Mini Apps | Deep (Tier 1-5) | Official Bot API, Mini Apps (embedded web UI), 900M+ users. Slash commands, inline keyboards, zero-friction auth. See `06-telegram.md` |
| **WhatsApp** | Encrypted group messaging | Limited (Tier 1-2) | 2B+ users globally. Groups (256 members), Communities (5,000 members, 50 sub-groups). No official group API for most developers. Invite links are the primary integration. |
| **Signal** | Privacy-first encrypted messaging | Link only (Tier 1) | No API, no bots, no third-party integration by design. Can link to group invite URLs. Privacy stance is a feature, not a limitation — Personus respects it. See `05-signal.md` |

### 2.2 Social / Public Platforms

Where communities have a public or semi-public presence. These platforms are about **discovery and credibility** — they tell the outside world "this community exists and here's who's behind it."

| Platform | What it is | Integration depth | Notes |
|----------|-----------|-------------------|-------|
| **Bluesky** | Decentralized social network (AT Protocol) | Medium (Tier 1-3) | Open protocol, DID-based identity. Strategic alignment with Personus's AT Protocol roadmap. Handle verification, public discovery. |
| **Instagram** | Visual social platform (Meta) | Link only (Tier 1) | Broadcast Channels (10K+ followers, no API). Graph API for verification. Creator-focused. |
| **YouTube** | Video platform with community features | Link only (Tier 1) | Community tab, memberships, @handles. Data API for channel verification. |
| **Threads** | Text-based social (Meta, ActivityPub) | Link only (Tier 1) | Shared Instagram identity. Threads API available. Fediverse federation (ActivityPub). |
| **Mastodon** | Federated microblogging (ActivityPub) | Link only (Tier 1) | Open protocol. Handle verification. Fediverse native. |

### 2.3 Web Presence

The catch-all for any URL-based community presence.

| Platform | What it is | Integration depth | Notes |
|----------|-----------|-------------------|-------|
| **Website** | Community's own web presence | Link only (Tier 1) | Forum, wiki, documentation site, etc. |
| **Other** | Any platform not listed above | Link only (Tier 1) | Meetup, Eventbrite, GitHub org, Patreon, etc. |

---

## 3. What Connecting a Platform Enables

### 3.1 The Core Value (All Platforms)

Every platform connection, even a simple link, enables the same core value:

**For the Community Organizer:**
- "Who in my community can help with X?" becomes an answerable question
- Members' skills, experience, and offerings are structured and searchable — not buried in chat history
- AI agents can recommend the community to people looking for these capabilities
- The community appears richer and more discoverable — it's not just a chat room, it's a network of capabilities

**For Community Members:**
- Discover what other members can do, value, and offer — beyond their username
- Get introduced to the right people through Personus's mediated contact, not by scrolling channels
- Their skills and endorsements carry across communities — build reputation once, benefit everywhere
- Control exactly what they share via persona visibility settings

**For AI Agents and External Discovery:**
- "Find me a community of Rust developers that has an active Matrix Space" → Personus can answer this
- "Who in the Portland Rust Guild knows WebAssembly?" → scoped capability search
- Platform presence signals that a community is active and real, not abandoned

### 3.2 Platform-Specific Capabilities

Beyond the universal value, each platform category unlocks different depth:

**Communication platforms (Matrix, Discord, Slack, Telegram):**
- Personus bot can operate inside the platform — members ask "who knows X?" right where they chat
- Bot facilitates introductions without leaving the conversation
- Membership can sync between platform and Personus
- Activity signals (who's active, what topics trend) feed the recommendation engine
- Telegram adds Mini Apps — Personus's full UI embedded directly inside Telegram (unique capability)

**Messaging platforms (WhatsApp, Signal):**
- Link to group invite so community members can join the conversation
- WhatsApp Communities (with sub-groups) map to Personus's community model
- Signal's privacy-first stance aligns with Personus's consent model — we link, we don't extract

**Social / public platforms (Bluesky, Instagram, YouTube, Threads, Mastodon):**
- Public credibility signal — "this community has a real presence"
- For creators: your followers aren't just a number. Connecting your social presence to Personus lets you understand who your followers are, what they can do, and how they can help each other
- Handle verification — confirm the community's social accounts are real
- Bluesky/Mastodon: AT Protocol and ActivityPub alignment for open web discovery

### 3.3 Use Cases

These scenarios illustrate how different kinds of communities use Personus integrations. Each shows who the organizer is, what platforms they connect, and what Personus makes possible that wasn't possible before.

---

#### 3.3.1 The Creator / Influencer

**Who:** A lifestyle creator with 50K Instagram followers and a growing YouTube channel. They want to turn a passive audience into an active community.

```
Platforms connected:
  Instagram (50K followers)  → Public credibility signal
  YouTube (@creator)         → Video content presence
  Discord (fan server)       → Where the community chats
  Telegram (supergroup)      → Where the global community chats
  Threads (@creator)         → Public conversation

What Personus enables:
  ├─ Fans join the Personus community and share their skills/interests
  ├─ Creator can see: "42 members know video editing, 18 speak Spanish, 7 do event planning"
  ├─ Fan asks in Discord: "!personus who knows video editing?" → instant answer
  ├─ Creator routes a collaboration opportunity to the right fan
  ├─ Fans endorse each other's capabilities → trust network emerges
  └─ The community becomes a capability network, not just a fan club
```

**The value message:** "Your followers are more than a number. Personus helps you discover what your community members can actually do — and helps them find each other."

---

#### 3.3.2 The Professional Guild

**Who:** The organizer of the Portland Rust Guild — a skill-centric community of 120 software developers who share expertise, mentor each other, and route freelance work.

```
Platforms connected:
  Matrix Space (#portland-rust:matrix.org)  → Primary chat, open protocol
  Discord (backup server)                   → Some members prefer Discord
  Bluesky (@portlandrust.dev)               → Public presence, job postings
  Website (portland-rust.dev)               → Landing page, event calendar
  YouTube (@portland-rust)                  → Talk recordings

What Personus enables:
  ├─ "Who in the guild knows WebAssembly?" → 4 members, ranked by endorsements
  ├─ A company posts a contract need → guild routes it to qualified members automatically
  ├─ Junior devs find mentors by specific technology ("I need help with async Rust")
  ├─ Tiered membership: Apprentice → Journeyman → Master, each with different offerings
  ├─ Members list their offerings: "Code review ($75/hr)", "Mentoring (free, 2h/week)"
  ├─ Guild skill heatmap shows: "Strong in systems, web; weak in embedded, ML"
  ├─ New member joins Matrix → bot greets: "Welcome! Link your Personus profile to be discoverable"
  └─ External query via MCP: "Find Rust communities in Portland" → guild surfaces with capabilities
```

**The value message:** "Your guild members have deep expertise. Personus makes it findable — by each other, by companies looking for talent, and by AI agents searching for capabilities."

---

#### 3.3.3 The Trades Guild

**Who:** The business agent of Tri-County Electrical Workers Guild — 95 licensed electricians in the greater Nashville area. Mix of journeymen, master electricians, and apprentices. They share job leads, coordinate on large projects that need extra hands, and mentor apprentices through licensure.

```
Platforms connected:
  WhatsApp (main group, 88 members)            → Job leads, "need 2 guys tomorrow" posts
  Telegram (apprentice channel, 22 members)    → Study groups, exam prep, mentor Q&A
  Facebook Group (public-facing, 340 followers) → Community presence, customer referrals
  Website (tricountyelectrical.org)            → Member directory, license verification

What Personus enables:
  ├─ "I need two commercial electricians with conduit bending experience for a 3-week hospital
  │   job starting Monday" → 7 qualified members, 3 available this month, sorted by endorsements
  ├─ "Who has experience with solar panel installation?" → 12 members, 4 are NABCEP certified
  ├─ "Anyone licensed in Kentucky? I have overflow work in Bowling Green" → 3 members with
  │   KY reciprocal licenses
  ├─ Members list specialties: residential, commercial, industrial, low-voltage, fire alarm,
  │   generator install, EV charger, solar, controls/PLC
  ├─ Members list certifications: Master Electrician, Journeyman, OSHA-30, NABCEP,
  │   confined space, bucket truck certified
  ├─ Apprentices find mentors: "I need help understanding 3-phase motor theory" → 5 masters
  │   who listed "apprentice mentoring" as an offering
  ├─ General contractor searches via MCP: "Find licensed electricians in Nashville who do
  │   commercial tenant buildouts" → guild surfaces ranked members with that specialty
  ├─ Tiered membership maps to trade reality: Apprentice → Journeyman → Master,
  │   each tier has different offerings and hourly rates
  ├─ "Who owns a trencher?" "Who has a boom lift?" → equipment sharing and subcontracting
  ├─ Job completion endorsements: "Mike did the panel upgrade at the Vanderbilt project —
  │   clean work, on time" → trust signals that matter more than a Yelp review
  └─ The guild becomes a dispatch network — the right person for the right job,
     found in minutes instead of a dozen phone calls
```

**The value message:** "Your members' licenses, specialties, and reputations are their livelihood. Personus makes it easy to find the right person for the job — and for the right jobs to find your members."

---

#### 3.3.4 The Company Fan Community

**Who:** The community manager at Rivian (electric vehicle maker). They want to connect the most passionate Rivian owners — people who organize meetups, create content, and help new owners.

```
Platforms connected:
  Discord (Rivian Owners Club, 8,500 members)  → Primary community hub
  Instagram (@rivianownersclub)                → Photos, adventure content
  YouTube (@rivianowners)                      → Reviews, how-to videos
  Website (rivianownersclub.com)               → Forum, event calendar

What Personus enables:
  ├─ "Who near Denver has experience with off-road mods?" → 3 members, one has 6 endorsements
  ├─ New owner asks: "Anyone done the R1S camping setup?" → Personus finds members who listed
  │   camping, overlanding, or vehicle mods as skills/interests
  ├─ Community manager can see: "47 members in Pacific Northwest, 23 are content creators,
  │   12 have offered to host local meetups"
  ├─ Members endorse each other: "Alex really knows the electrical system" → trust signals
  ├─ Rivian's marketing team asks via MCP: "Find owners who do YouTube reviews" → instant list
  ├─ Regional meetup organizers find co-hosts by capability and location
  └─ Community becomes a structured resource — not just a chat room where knowledge scrolls away
```

**The value message:** "Your most passionate customers are a goldmine of knowledge. Personus helps them find each other and helps you understand what they bring to the community."

---

#### 3.3.5 The Photography Club

**Who:** The president of the Bay Area Photography Collective — 85 members, from hobbyists to working professionals, meeting monthly in person and chatting online between meetups.

```
Platforms connected:
  Slack (photography-collective.slack.com)  → Daily chat, critique channels
  Instagram (@bayareaphotocollective)       → Member spotlights, group exhibitions
  Website (bayareaphoto.club)               → Gallery, meeting schedule, resources

What Personus enables:
  ├─ "Who shoots medium format?" → 6 members, 2 available for workshop teaching
  ├─ "Anyone know Capture One well enough to help me migrate from Lightroom?" → 3 members
  ├─ Members list specialties: portrait, landscape, street, architectural, astrophotography
  ├─ Members list gear they're willing to lend: "Sigma 85mm f/1.4", "Godox AD600"
  ├─ Club plans a group show → organizer searches: "members with exhibition experience" → 8 found
  ├─ New member joins Slack → bot: "Welcome! Let us know your style and what gear you shoot with"
  ├─ Endorsements reveal hidden gems: "Maria's darkroom printing is incredible" — she never mentioned it
  └─ Annual skill survey replaced by living, always-current member capability map
```

**The value message:** "Your members have an incredible range of skills and gear. Personus surfaces who knows what — so the right people connect for critiques, loans, collaborations, and learning."

---

#### 3.3.6 The Underground Music Friends Group

**Who:** A loose network of 40 friends and friends-of-friends in Austin who share an obsession with underground electronic music — DJs, producers, promoters, visual artists, and dedicated fans.

```
Platforms connected:
  WhatsApp (group chat, 38 members)          → Where they actually talk
  Signal (smaller inner circle, 12 members)  → Private planning
  Instagram (@austinundergroundsound)        → Event flyers, DJ mixes
  Bluesky (@undergroundatx.bsky.social)      → Scene commentary

What Personus enables:
  ├─ "Who can DJ a techno set this Friday? Our headliner dropped out" → 4 members tagged as DJs,
  │   2 with techno listed, 1 available this weekend
  ├─ "Anyone know a good sound engineer for a warehouse party?" → 2 members, both endorsed by 3+ people
  ├─ Members share what they bring: "I have a PA system", "I do live visuals (TouchDesigner)",
  │   "I know warehouse venues", "I design flyers"
  ├─ No formal org — just friends helping friends. Personus works because there's no hierarchy to manage
  ├─ Promoter visiting from Berlin: "Who should I connect with in the Austin scene?" →
  │   Personus surfaces the right people via MCP, respecting each member's visibility settings
  ├─ Trust is everything — endorsements from people you know carry real weight
  └─ The group stays informal; Personus just makes the informal knowledge network visible
```

**The value message:** "Your crew has an incredible mix of talents. Personus helps you tap the network when you need something — without formalizing the vibe."

---

#### 3.3.7 The Non-Profit Membership Organization

**Who:** The executive director of Cascadia Watershed Alliance — a mid-tier environmental non-profit with 340 members, 12 staff, and a mission to protect Pacific Northwest watersheds through science, policy, and community action.

```
Platforms connected:
  Slack (staff + volunteer coordinators, 45 people)   → Internal operations
  Discord (public community, 280 members)             → Member discussions, working groups
  Telegram (field volunteers group, 60 members)        → Real-time field coordination
  Instagram (@cascadiawatershed)                       → Public outreach, event photos
  YouTube (@cascadia-watershed)                        → Educational content, policy explainers
  Website (cascadiawatershed.org)                      → Membership, donations, resources
  Bluesky (@cascadiawatershed.bsky.social)             → Policy commentary, network building

What Personus enables:
  ├─ "Who has GIS experience for our habitat mapping project?" → 6 members, 2 are professionals
  ├─ "We need a grant writer for a NOAA proposal due in 3 weeks" → 4 members with grant writing
  │   skills, 1 has specific federal grant experience and is available
  ├─ Board member asks: "Do we have anyone with water law expertise?" → 2 members, one is a
  │   retired EPA attorney who joined as a volunteer
  ├─ Members share: "bilingual Spanish/English", "drone pilot (Part 107 licensed)",
  │   "experienced canoe guide", "water quality testing certified"
  ├─ Volunteer coordinator can see: "38 members available for Saturday stream cleanups,
  │   12 have first aid training, 7 have truck access"
  ├─ New member onboards with Personus persona → instantly discoverable by what they can contribute
  ├─ Annual report: "Our members collectively bring 4,200 hours of professional expertise
  │   across 47 distinct skill areas" — generated from Personus data
  ├─ Coalition building: partner org asks via MCP "environmental groups with policy expertise
  │   in Oregon" → Cascadia surfaces with structured capabilities
  └─ The membership becomes more than a donor list — it's a structured capability network
     that makes the mission more achievable
```

**The value message:** "Your members joined because they care. Personus helps you discover what they can actually contribute — and helps them find the projects and people that match their skills."

---

#### 3.3.8 The Bicycle Club

**Who:** The ride captain of Emerald City Cyclists — a 200-member recreational cycling club in Seattle. Mix of weekend warriors, commuters, racers, and touring cyclists. They organize group rides, maintenance workshops, and social events.

```
Platforms connected:
  Discord (main community, 175 members)     → Ride planning, route sharing, gear talk
  WhatsApp (ride-day coordination, 90)       → "Running 10 min late", "Flat at mile 12"
  Strava Club (linked via Website)           → Ride tracking, segment leaderboards
  Instagram (@emeraldcitycyclists)           → Ride photos, new member welcome
  Website (emeraldcitycyclists.org)          → Ride calendar, membership, routes

What Personus enables:
  ├─ "Who's a good bike mechanic? My derailleur is acting up" → 8 members, 3 are professional
  │   mechanics, 5 are experienced home wrenchers. Best match: "Jake — 15 endorsements,
  │   specializes in Shimano groupsets"
  ├─ "Anyone done the Olympic Discovery Trail?" → 4 members who listed touring as an interest
  │   and have that specific route in their experience
  ├─ Ride captain planning a century: "I need sweep riders with first aid training" → 6 found
  ├─ Members share: "bike fit certified", "Zwift coach", "former Cat 2 racer",
  │   "commutes year-round (rain gear advice)", "built my own wheels"
  ├─ New member: "I'm new to clipless pedals" → Personus connects them with 3 members who
  │   listed "helping new riders" as an offering
  ├─ Club needs a route with <3% grade for beginners → "Who knows gentle routes on the east side?"
  │   → 5 members who ride that area regularly
  ├─ Gear swap: "Looking for a size 54 road frame" → members who listed selling/swapping gear
  ├─ Endorsement culture: "Sarah is the best wheel builder in the club" — visible, carries weight
  └─ The club directory goes from a spreadsheet with names and emails to a living map of
     who knows what, who has what, and who can help with what
```

**The value message:** "Your club members bring incredible knowledge — routes, mechanical skills, gear expertise, local riding conditions. Personus makes it all findable, so members help each other ride better."

---

## 4. Value Messaging by Platform

When a Community Organizer connects a platform, the UI communicates what it enables — not technical plumbing. The message leads with the human outcome.

### Communication Platforms

| Platform | Card Headline | Detail |
|----------|--------------|--------|
| **Matrix / Element** | "Discover who in your community can help — right where you chat" | "Connect your Matrix Space and members can search for skills, get introductions, and find the right person for any question — all inside your rooms." |
| **Discord** | "Turn your server into a capability network" | "Connect your Discord server. Members can find who knows what, get AI-powered introductions, and discover each other's skills without leaving Discord." |
| **Slack** | "Know who on your team can help before you ask the channel" | "Connect your Slack workspace. Instead of 'does anyone know X?' in #general, Personus finds the right person instantly." |
| **Telegram** | "Discover who in your group can help — without leaving Telegram" | "Add the Personus bot to your Telegram group. Members can search for skills, request introductions, and manage their profile — all inside Telegram." |
| **WhatsApp** | "Help your group members find each other's strengths" | "Link your WhatsApp group or Community. Members can see who knows what and connect with the right person." |
| **Signal** | "Link your private group for members to find" | "Add your Signal group link so community members know where to join the conversation. Your group stays private — Personus just points the way." |

### Social / Public Platforms

| Platform | Card Headline | Detail |
|----------|--------------|--------|
| **Bluesky** | "Make your community discoverable on the open social web" | "Connect your Bluesky presence. People searching on the decentralized web can find your community and what your members are capable of." |
| **Instagram** | "Show the world who's behind your community" | "Link your Instagram so members and prospects see the real people and presence behind this community." |
| **YouTube** | "Connect your channel to your community of creators" | "Link your YouTube channel. Members who follow your content can discover each other and collaborate." |
| **Threads** | "Extend your community's conversations to the open web" | "Link your Threads presence. Your community's public voice reaches the fediverse and beyond." |
| **Mastodon** | "Join the fediverse with your community's identity" | "Link your Mastodon account for decentralized discovery across the open social web." |

### Web Presence

| Platform | Card Headline | Detail |
|----------|--------------|--------|
| **Website / Other** | "Point members to your community's home base" | "Add your website, forum, wiki, or any other link where your community lives." |

---

## 5. Integration Workflows

### 5.1 Community Organizer: Connect a Platform

**Entry points (two paths, same outcome):**
1. Community creation wizard — Step 3 "Connect Platforms" (skippable)
2. Settings → Connections tab (anytime after creation)

**Flow:**

```
Organizer opens platform connection UI
  │
  ├─ Sees platform cards organized by category:
  │  "Where does your community communicate?"
  │    Matrix, Discord, Slack, Telegram, WhatsApp, Signal
  │  "Where does your community have a public presence?"
  │    Bluesky, Instagram, YouTube, Threads, Mastodon
  │  "Other"
  │    Website / Other
  │
  ├─ Each card: icon + name + value headline + expand chevron
  │
  ├─ Clicks a platform card to expand
  │  Card expands to show platform-specific inputs
  │  (see Section 6 for per-platform input details)
  │
  ├─ Fills in platform-specific fields
  │  Auto-parse where possible (matrix.to URLs, discord.gg links)
  │  Validate in real-time (format checks, regex)
  │
  ├─ [Save] or [Save & Next] (wizard) or [Skip] (wizard only)
  │
  └─ Result:
     ├─ ExternalPlatformLink added to communities.externalPlatforms JSONB
     ├─ (For deeper integrations) Integration row created in platform_channel_bindings table
     └─ Toast: "Connected to Matrix / Element"
```

### 5.2 Community Organizer: Manage Connections

**Path:** Settings → Connections

```
Organizer sees their communities
  │
  ├─ Each community card shows:
  │  ├─ Connected platforms with status badges (● Connected / ○ Not connected)
  │  ├─ Platform details (room alias, invite link, handle, etc.)
  │  └─ Actions: [Configure] [Disconnect]
  │
  ├─ [Configure] expands inline settings (for platforms with Tier 2+ integration):
  │  ├─ Auto-sync membership (on/off)
  │  ├─ Notification channel (webhook URL for Hookshot-style integrations)
  │  ├─ Allow public search via bot (on/off)
  │  └─ Platform-specific settings
  │
  ├─ [Disconnect] with confirmation dialog:
  │  "This will remove the integration. The platform link on your
  │   community profile will remain unless you also remove it."
  │  Removes integrations row, optionally removes externalPlatforms entry
  │
  └─ [Connect a Platform] for communities with no connections
     Opens same platform card UI as wizard step
```

### 5.3 Member: Link Platform Identity

**Path:** Settings → Profile, or persona edit page

Members can optionally link their platform identities to their Personus persona. Stored as traits, governed by the same visibility controls as any other trait.

```
Member opens persona edit or profile settings
  │
  ├─ "Connected Identities" section
  │  ├─ Matrix ID: @user:matrix.org     [linked] [remove]
  │  ├─ Discord: username#1234          [link]
  │  ├─ Bluesky: @user.bsky.social     [linked] [remove]
  │  ├─ Instagram: @username            [link]
  │  └─ YouTube: @channel               [link]
  │
  ├─ Linking adds the ID to their traits
  │  Visibility controlled per-persona (public / authenticated / private)
  │
  └─ Within a community context, linked identities enable:
     ├─ Bot can map platform user → Personus persona
     ├─ "Who is @alice in Matrix?" → shows Personus profile
     └─ Introduction facilitation across platforms
```

### 5.4 External Discovery: AI Agent Queries

AI agents querying Personus via MCP or the discovery API receive platform information as part of community responses:

```json
{
  "community": {
    "name": "Portland Rust Guild",
    "type": "guild",
    "memberCount": 47,
    "externalPlatforms": [
      { "platform": "matrix", "roomAlias": "#portland-rust:matrix.org" },
      { "platform": "discord", "url": "https://discord.gg/abc123" },
      { "platform": "youtube", "handle": "@portland-rust" },
      { "platform": "website", "url": "https://portland-rust.dev" }
    ]
  }
}
```

Agent response: *"The Portland Rust Guild has 47 members. They're active on Matrix (#portland-rust:matrix.org) and Discord, and have a YouTube channel. Three members have WebAssembly expertise."*

---

## 6. Per-Platform Input Specifications

Each platform has its own set of inputs and auto-parse logic. The UI uses a `PlatformCard` pattern — one card per platform, each with its own form layout.

### Communication Platforms

#### 6.1 Matrix / Element

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| matrix.to URL | url | Either this or alias | `https://matrix.to/#/#room:server` | Primary input, auto-parsed |
| Room alias | text | Either this or URL | `#community:matrix.org` | Auto-populated from URL |
| Space ID | text | No | `!abc123:matrix.org` | Advanced, collapsible |
| Homeserver | text | No | `matrix.org` | Auto-populated from URL/alias |

**Auto-parse:** `matrix.to` URL → extracts room alias (or Space ID) + homeserver.

**Stored as:**
```json
{ "platform": "matrix", "label": "Matrix (matrix.org)", "url": "https://matrix.to/#/#community:matrix.org", "roomAlias": "#community:matrix.org", "homeserver": "matrix.org", "spaceId": "!abc123:matrix.org" }
```

#### 6.2 Discord

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Invite link | url | Either this or server ID | `https://discord.gg/abc123` | Primary input |
| Server ID | text | Either this or link | `123456789012345678` | Advanced |

**Auto-parse:** `discord.gg/<code>` → extracts invite code.

**Stored as:**
```json
{ "platform": "discord", "label": "Discord", "url": "https://discord.gg/abc123", "inviteCode": "abc123", "guildId": "123456789012345678" }
```

#### 6.3 Slack

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Workspace URL | url | Either this or ID | `https://team.slack.com` | Primary input |
| Workspace ID | text | Either this or URL | `T0123456789` | Advanced |

**Auto-parse:** `<team>.slack.com` → extracts workspace slug.

**Stored as:**
```json
{ "platform": "slack", "label": "Slack (team)", "url": "https://team.slack.com", "workspaceId": "T0123456789" }
```

#### 6.4 Telegram

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Group/Channel link | url | Either this or username | `https://t.me/mycommunity` | Primary input |
| Group username | text | Either this or link | `@mycommunity` | Public supergroups only |
| Group name | text | No | `My Community` | User-provided label |

**Auto-parse:** `t.me/<username>` or `t.me/+<invite>` → extracts username or invite hash.

**Stored as:**
```json
{ "platform": "telegram", "label": "Telegram Community", "url": "https://t.me/mycommunity", "handle": "@mycommunity" }
```

#### 6.5 WhatsApp

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Group/Community invite link | url | Yes | `https://chat.whatsapp.com/...` | Primary input |
| Group name | text | No | `My Community Group` | User-provided label |

**Notes:** WhatsApp invite links are the only reliable integration point. No API for reading group data. WhatsApp Communities (umbrella of up to 50 groups, 5,000 members) use the same `chat.whatsapp.com` invite link format.

**Stored as:**
```json
{ "platform": "whatsapp", "label": "WhatsApp Community", "url": "https://chat.whatsapp.com/abc123" }
```

#### 6.6 Signal

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Group invite link | url | Yes | `https://signal.group/#...` | Primary input |
| Group name | text | No | `Our Private Group` | User-provided label |

**Notes:** Signal has no API, no bots, no third-party integration by design. We store the invite link and display it — nothing more. This is intentional: Personus respects Signal's privacy-first philosophy. Groups support up to 1,000 members with optional admin approval for joins.

**Stored as:**
```json
{ "platform": "signal", "label": "Signal Group", "url": "https://signal.group/#CjQKILx8..." }
```

### Social / Public Platforms

#### 6.7 Bluesky

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Handle | text | Yes | `@community.bsky.social` | Primary input |
| DID | text | No | `did:plc:...` | Auto-resolved later via AT Protocol |

**Notes:** Bluesky is a strategic platform for Personus given the AT Protocol alignment. Handle verification can be done via DID resolution. Future: deeper integration via AT Protocol labelers and feed generators.

**Stored as:**
```json
{ "platform": "bluesky", "label": "Bluesky", "handle": "@community.bsky.social", "url": "https://bsky.app/profile/community.bsky.social" }
```

#### 6.8 Instagram

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Username | text | Yes | `@mycommunity` | Primary input |
| Profile URL | url | No | `https://instagram.com/mycommunity` | Auto-generated from username |

**Notes:** No deep integration — Instagram's Broadcast Channels have no API, and Graph API requires business account OAuth. For now, we store the handle for display and credibility. Particularly relevant for creator communities where the Instagram following IS the community base.

**Stored as:**
```json
{ "platform": "instagram", "label": "Instagram", "handle": "@mycommunity", "url": "https://instagram.com/mycommunity" }
```

#### 6.9 YouTube

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Channel handle | text | Yes | `@mychannel` | Primary input (YouTube @handle) |
| Channel URL | url | No | `https://youtube.com/@mychannel` | Auto-generated from handle |

**Notes:** YouTube Data API can verify channel existence and fetch public stats (subscribers, videos). Channel memberships have an API but require creator OAuth. Relevant for creator communities built around a YouTube channel.

**Stored as:**
```json
{ "platform": "youtube", "label": "YouTube", "handle": "@mychannel", "url": "https://youtube.com/@mychannel" }
```

#### 6.10 Threads

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Username | text | Yes | `@mycommunity` | Primary input (shared with Instagram) |

**Notes:** Threads shares identity with Instagram. Threads API is available for posting and reading. ActivityPub/fediverse federation is live (outside EU). Future opportunity for federated community discovery.

**Stored as:**
```json
{ "platform": "threads", "label": "Threads", "handle": "@mycommunity", "url": "https://threads.net/@mycommunity" }
```

#### 6.11 Mastodon

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Full handle | text | Yes | `@community@mastodon.social` | Includes instance domain |
| Profile URL | url | No | `https://mastodon.social/@community` | Auto-generated |

**Notes:** Federated — handle includes the instance domain. ActivityPub native. Natural fit for open web discovery alongside Bluesky.

**Stored as:**
```json
{ "platform": "mastodon", "label": "Mastodon", "handle": "@community@mastodon.social", "url": "https://mastodon.social/@community" }
```

### Web Presence

#### 6.12 Website / Other

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| URL | url | Yes | `https://mycommunity.org` | |
| Label | text | No | `Our Forum`, `Wiki`, `Meetup`, etc. | |
| Description | text | No | `Community discussion forum` | |

**Stored as:**
```json
{ "platform": "website", "label": "Community Forum", "url": "https://forum.mycommunity.org", "description": "Main discussion forum" }
```

---

## 7. Platform Capability Tiers

This matrix shows current and planned capability depth across all platforms:

| Capability | Matrix | Discord | Slack | Telegram | WhatsApp | Signal | Bluesky | Insta | YT | Threads | Mastodon | Website |
|------------|--------|---------|-------|----------|----------|--------|---------|-------|----|---------|----------|---------|
| **Tier 1: Link** | | | | | | | | | | | | |
| Invite/join URL | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Platform badge | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| AI reports presence | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| **Tier 2: Notify** | | | | | | | | | | | | |
| Push notifications | Hookshot | Webhook | Webhook | Bot API | 3rd party* | — | — | — | — | — | — | — |
| **Tier 3: Interact** | | | | | | | | | | | | |
| Bot commands | Y | Y | Y | Y | — | — | — | — | — | — | — | — |
| Skill search | Y | Y | Y | Y | — | — | — | — | — | — | — | — |
| Introductions | Y | Y | Y | Y | — | — | — | — | — | — | — | — |
| **Tier 4: Sync** | | | | | | | | | | | | |
| Membership sync | AS API | Bot API | API | Partial** | — | — | — | — | — | — | — | — |
| Activity signals | AS events | Gateway | Events | Webhook | — | — | — | — | — | — | — | — |
| Identity bridging | MXID | Discord ID | Slack ID | TG User ID | — | — | DID | — | — | — | — | — |
| **Tier 5: Embed** | | | | | | | | | | | | |
| Personus UI in platform | Widget | — | — | Mini Apps | — | — | — | — | — | — | — | Embed |

\** Telegram: no member list enumeration, but join/leave events tracked via `ChatMemberUpdated`.

\* WhatsApp notifications possible via third-party API providers (Whapi.Cloud, Maytapi), not Meta's official API. Official Groups API requires 100K+ business conversations/day. WhatsApp Communities Business API not yet released.

**What we're building now:** Tier 1 for all platforms. Tier 2 for Matrix (Hookshot webhooks). Telegram is architected for Tier 1-5 from day one (Bot API + Mini Apps). Architecture supports progression to higher tiers without rework.

---

## 8. Two-Layer Data Model

Platform connections use two complementary storage layers:

### Layer 1: External Platform Links (`communities.externalPlatforms` JSONB)

**Lightweight, declarative, always present.** Stored directly on the community as a JSONB array. Represents "this community has a presence on these platforms." No tokens, no sync state, no operational data.

- Created when: Organizer connects any platform (wizard or settings)
- Used for: Display on community profiles, AI agent responses, member discovery
- Cost: Zero — just a JSONB field on an existing table
- **All platforms get this layer** — including Signal, Instagram, YouTube

### Layer 2: Integration Records (`platform_channel_bindings` table)

**Operational, stateful, for deeper integrations.** Separate table row with status, config, tokens, sync timestamps. Represents "Personus has an active operational connection to this platform."

- Created when: Platform supports deeper integration AND organizer opts in
- Used for: Bot connections, webhook delivery, membership sync, activity observation
- Cost: Requires monitoring, token management, error handling
- **Only platforms with Tier 2+ capabilities get this layer** (Matrix, Discord, Slack today)

**Relationship:** A community may have an `externalPlatforms` entry without an `platform_channel_bindings` row (link only, no active integration). An `platform_channel_bindings` row should always have a corresponding `externalPlatforms` entry.

---

## 9. Integration Constraints by Platform

### Platforms with no API (link-only)

**Signal:** No API, no bots, no third-party integration by design. Unofficial bots are technically possible via `signal-cli` but carry high risk of account bans and ToS violation. Signal's privacy stance means we link to group invite URLs only. This is the right approach — Personus respects platforms that prioritize privacy by not attempting to extract data from them. See `05-signal.md`.

**Instagram (community features):** Broadcast Channels have no API. Graph API covers analytics and content management for business accounts, but not community-specific features. Link to profile only.

### Platforms with limited API

**WhatsApp:** Meta's official Groups API requires 100K+ business conversations/day and caps groups at 8 members — not viable for community bridging. However, two paths exist beyond link-only:
- **WhatsApp Flows** (official): Mini-app-like interactive experiences inside WhatsApp. Skill search, introduction requests, and profile building are all feasible as task-specific Flows. Requires BSP account + business verification. See `04-whatsapp.md`.
- **Whapi.Cloud** (unofficial, $35/mo): Full group/community bridging via linked-device protocol. Webhooks for join/leave events, message sending, digest posts. Risk: Meta ToS violation, possible account ban. Manageable with dedicated number and responsible usage.
- WhatsApp Communities (5K members, 50 sub-groups) have no official Business API yet. Whapi.Cloud can bridge them today; Meta's official support is expected 2026-2027.
- **Meta's AI policy** (Jan 2026): General-purpose chatbots banned. Task-specific bots (skill search, intro requests) are compliant.
- **WhatsApp usernames** (June 2026): Will replace phone numbers as identifiers. Track for future identity linking.

**YouTube:** Data API is read-only. Community tab has no write API. Memberships API is available but requires channel-owner OAuth. **Link-only for now; handle verification is feasible.**

### Platforms with official bot/app support

**Telegram:** Officially supported, mature Bot API (v8.0). Mini Apps enable embedding Personus's full UI inside Telegram — the only platform where this is possible. grammY framework integrates directly with Next.js via webhook adapter. 900M+ users globally. Key limitation: no member list enumeration (build directory from interactions). No message history access. 20 messages/minute rate limit per group. See `06-telegram.md`.

### Platforms with open protocols

**Matrix:** Fully open protocol. Appservice API, Widget API, and bot SDKs provide deep integration. First-class support. See `02-matrix.md`.

**Bluesky / AT Protocol:** Open protocol with DID-based identity. Handle verification, labelers, and feed generators provide meaningful integration paths. Strategic alignment with Personus's AT Protocol roadmap. See `docs/research/at_protocol_integration.md`.

**Mastodon / ActivityPub:** Open federation protocol. Handle verification and federated discovery. Natural complement to Bluesky for open web presence. Personus communities can become `Group` actors on the fediverse — publishing aggregated capability announcements to followers across Mastodon, Lemmy, and other ActivityPub implementations. See `09-activitypub.md`.

**Threads (partial):** ActivityPub federation is live (outside EU). Threads API available for content. Meta controls the platform, but the ActivityPub support creates an open bridge. Note: only ~25K Threads users have enabled federation — don't build strategy around this.

---

## 10. Spec Index

| Spec | Contents |
|------|----------|
| **`00-overview.md`** (this file) | Vision, platform landscape, value messaging, workflows, per-platform inputs, capability tiers |
| **`01-shared-architecture.md`** | Constants, types, schema, validations, server actions, UI components — shared across all platforms |
| **`02-matrix.md`** | Matrix-specific: `matrix.to` parsing, Hookshot webhooks, Matrix ID trait, appservice architecture (future) |
| **`03-bot-architecture.md`** | Cross-platform bot hosting: Fly.io for persistent processes (Matrix, Discord Gateway), serverless for everything else, monorepo strategy, shared command interface |
| **`04-whatsapp.md`** | WhatsApp-specific: Flows (mini-app inside WhatsApp), Whapi.Cloud community bridge, wa.me deep links, compliance |
| **`05-signal.md`** | Signal-specific: what's technically possible, risk assessment, why link-only is correct — **not implementing** |
| **`06-telegram.md`** | Telegram-specific: grammY bot, Mini Apps (embedded UI), Login Widget, slash commands, account linking — **first-class platform** |
| **`07-discord.md`** | Discord-specific: HTTP Interactions Endpoint, slash commands, rich embeds, role mapping, OAuth2, Ed25519 verification — **first-class platform** |
| **`08-slack.md`** | Slack-specific: Events API, slash commands, Block Kit, App Home, modals, OAuth2 install, HMAC-SHA256 verification — **first-class platform** |
| **`09-activitypub.md`** | ActivityPub / Fediverse: communities as `Group` actors, WebFinger discovery, capability announcements, Fedify framework, privacy model — **strategic, build after core integrations** |
| **`10-activity-tracking.md`** | Privacy-preserving activity tracking: aggregate daily counters, integration health, organizer dashboard, retention policy — **ships with first bot** |

### Implementation Order

1. **`01-shared-architecture.md`** — Build the shared foundation (constants, types, schema, actions, wizard, settings tab). Must accommodate all 13 platforms in the `EXTERNAL_PLATFORM_TYPES` constant.
2. **`02-matrix.md`** — Matrix-specific capabilities (URL parsing, webhooks, Matrix ID trait)
3. **`07-discord.md`** — Discord via **Mastra Channels** (`@chat-adapter/discord`), Tier 1-3 serverless. See `03-bot-architecture.md §0`. Tracked as **PER-64**.
4. **`08-slack.md`** — Slack via **Mastra Channels** (`@chat-adapter/slack`), Tier 1-4 serverless. App Home tab is a separate work item (not covered by Channels). Tracked as **PER-65**.
5. **`06-telegram.md`** — Telegram bot + Mini Apps + Login Widget. Tier 1-3 path TBD: Mastra Channels if `@chat-adapter/telegram` exists, otherwise grammY webhooks. Stub-first. Tracked as **PER-66**.
6. **`03-bot-architecture.md`** — Fly.io process for **Matrix Appservice only** (Mastra Channels does not cover Matrix). Discord Gateway (Tier 4) deferred. Telegram, Slack, and Discord Tier 1-3 all run in Next.js via Mastra Channels.
7. **`10-activity-tracking.md`** — Ships with the first bot. Aggregate counters, integration health, organizer dashboard.
8. **`09-activitypub.md`** — After core integrations are working. WebFinger, Group actors, capability announcements.

---

## 11. Decisions Log

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
| 1 | Wizard platform step is skippable | 2026-02-23 | Settings → Connections is the alternative path |
| 2 | Parse `matrix.to` URLs | 2026-02-23 | Users paste share links; auto-extract alias + homeserver |
| 3 | All platforms in wizard, each with own inputs | 2026-02-23 | Architecture must accommodate platform-specific validation |
| 4 | Fly.io for persistent bot processes | 2026-02-23 | Vercel has no WebSocket support (max 800s execution). Matrix Appservice and Discord Gateway need always-on connections. ~$3/month. |
| 5 | Use `db:push` for schema changes | 2026-02-23 | Pre-production, no data to preserve |
| 6 | Two-layer data model (JSONB links + integration rows) | 2026-02-23 | Lightweight links for all, operational records only where needed |
| 7 | Signal is link-only by design | 2026-02-23 | No API exists; respecting Signal's privacy stance is the right message |
| 8 | WhatsApp is link-only for now | 2026-02-23 | Official API unrealistic (100K threshold); Communities API not released. Revisit 2026-2027. |
| 9 | Instagram, YouTube, Threads are link + handle | 2026-02-23 | No community-specific APIs; handle verification feasible for credibility |
| 10 | Creator use case is first-class | 2026-02-23 | Influencers connecting social platforms is a key growth vector |
| 11 | Signal is documented but not implemented | 2026-02-23 | High ban risk, no official API, ToS violation. Link-only respects Signal's philosophy. |
| 12 | Telegram is first-class (Tier 1-5) | 2026-02-23 | Official Bot API, Mini Apps (embedded UI unique to Telegram), webhook-friendly (runs in Next.js), 900M+ users, grammY framework |
| 13 | Same monorepo for bot process | 2026-02-23 | Bot shares tools, types, schema, and database with main app. `services/bot/` directory deployed separately to Fly.io. |
| 14 | Serverless bots first, persistent second | 2026-02-23 | Discord HTTP, Slack Events API, Telegram grammY all run in Next.js. Build these before Fly.io process. |
| 15 | ActivityPub via Fedify framework | 2026-02-23 | TypeScript-first, Next.js adapter, handles HTTP Signatures/WebFinger. Communities as `Group` actors. Build after core integrations. |
| 16 | Capability announcements are the fediverse differentiator | 2026-02-23 | No one else publishes aggregated community capabilities to ActivityPub. Unique to Personus. |
| 17 | Privacy-preserving activity tracking | 2026-02-23 | Aggregate daily counters only — no conversation content, no individual event logs, no search queries. Ships with first bot. |
| 18 | Activity data is deletable by organizer | 2026-02-23 | GDPR-aligned. Community organizer controls their activity data. 90-day daily / 2-year monthly retention. |
| 19 | Adopt Mastra Channels for Discord/Slack/Telegram Tier 1-3 | 2026-05-11 | Mastra 1.26 ships `channels` as a first-class agent primitive (auto-generated webhooks, DM/mention/thread routing, dedup, per-thread memory). Subsumes ~60% of hand-rolled bot infrastructure in `03-bot-architecture.md §§4-8`. Personus retains the `platform_channel_bindings` table, community resolution, principal delegation (PER-6/17), and visibility filtering. Matrix is unaffected (no Channels adapter; Appservice still required). Tracked as PER-64 (Discord), PER-65 (Slack), PER-66 (Telegram stub). |
