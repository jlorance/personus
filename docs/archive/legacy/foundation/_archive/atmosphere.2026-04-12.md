---
type: foundation
title: "Atmosphere Landscape & AT Protocol Opportunity"
description: "This document surveys the AT Protocol (\"Atmosphere\") ecosystem as of early 2026, articulates the strategic opportunity for Personus, and defines the integration roadmap. It complements the…"
status: superseded
tags: [archived]
timestamp: 2026-02-12
---

# Atmosphere Landscape & AT Protocol Opportunity

> Status: v1
> Date: 2026-02-12
> Depends on: 07-at-protocol.md, 01-vision-and-principles.md

## Purpose

This document surveys the AT Protocol ("Atmosphere") ecosystem as of early 2026, articulates the strategic opportunity for Personus, and defines the integration roadmap. It complements the technical design in Doc 07 with market context and competitive positioning.

---

## 1. The Atmosphere Ecosystem

### 1.1 What Is the Atmosphere?

"Atmosphere" is the collective term for all applications built on the AT Protocol beyond Bluesky itself. Every Atmosphere app shares a common foundation:

- **Portable identity** via DIDs (Decentralized Identifiers) and human-readable handles
- **User-owned data** stored in Personal Data Servers (PDSes) — records migrate with the user
- **Custom data schemas** (Lexicons) that apps define under their own namespace
- **A shared firehose** that broadcasts all record creates/updates/deletes across the network
- **OAuth-based authentication** — "Log in with Bluesky" works for any Atmosphere app, no new account required

The first ATmosphereConf took place in Seattle (March 2025, 179 in-person / 186 livestream). The next is scheduled for Vancouver, March 26-29, 2026.

### 1.2 Bluesky User Base

| Metric             | Value         | Notes                                                          |
| ------------------ | ------------- | -------------------------------------------------------------- |
| Registered users   | ~40.2M        | As of late 2025                                                |
| Daily active users | ~3.5-4.1M     | Fluctuates; recovered from a September 2025 dip                |
| Growth rate        | ~1.4M/month   | Decelerating from peak (5.4 users/sec during migration events) |
| Demographics       | 62%+ under 35 | Skews younger than LinkedIn, older than TikTok                 |
| Avg session        | 10 min 35 sec | ~8 pages per session                                           |

Bluesky's **2026 roadmap** explicitly prioritizes Atmosphere interoperability and "Log in with Bluesky" as a web standard. They want third-party apps to "not just plug in, but enhance the core Bluesky experience."

### 1.3 Production Atmosphere Apps

| App              | Category  | What It Does                            | Traction / Notes                              |
| ---------------- | --------- | --------------------------------------- | --------------------------------------------- |
| **Skylight**     | Video     | Short-form video (TikTok alternative)   | 380K+ users, Mark Cuban-backed pre-seed       |
| **Flashes**      | Photos    | Photo sharing (Instagram alternative)   | 30K downloads in first 24 hours               |
| **Frontpage**    | Links     | Link aggregator (HN/Reddit alternative) | Federated, upvoting, comments                 |
| **WhiteWind**    | Blogging  | Markdown blog platform                  | All data (posts, images) stored in user's PDS |
| **Smoke Signal** | Events    | Event management & RSVP                 | OAuth, community discovery                    |
| **Linkat**       | Identity  | Link-in-bio service                     | Links saved directly in user's PDS            |
| **Skylights**    | Reviews   | Reviews for books, movies, TV           | Expanding to papers and URLs                  |
| **Cred.blue**    | Identity  | Credibility scoring from public data    | Passive analysis, not user-curated            |
| **Germ**         | Messaging | Secure chat with Bluesky friends        | Stanford lecturer + ex-Apple privacy engineer |
| **Roomy**        | Messaging | Chat + local-first P2P                  | Automerge, Jazz, Keyhive integration          |
| **Pinksky**      | Photos    | Classic Instagram-style photo sharing   | iOS + Android                                 |
| **SkyMuseum**    | Social    | 3D art gallery walkthroughs             | Up to 32 concurrent viewers                   |

**Common patterns across successful Atmosphere apps:**

- All use AT Protocol OAuth for authentication (zero-friction onboarding)
- Most store app-specific records in the user's PDS (true data ownership)
- All follow the AppView architecture (firehose subscription → custom index → app API)
- Cross-app content visibility is emerging (Skylight videos appear in Bluesky feeds)

### 1.4 Technical Infrastructure Available

| Component           | Purpose                                                       | Personus Relevance                                         |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **Relay/Firehose**  | Aggregates all PDS events                                     | Subscribe filtered for `ai.personus.*` records             |
| **Jetstream**       | Lightweight filtered JSON stream (~25 GB/mo vs 3.2 TB/mo raw) | Production-ready consumption option                        |
| **Tap**             | Go-based repo sync with cryptographic verification            | Higher assurance option for indexing                       |
| **Feed Generators** | Algorithmic feed curation                                     | Could power a "discover by capabilities" Bluesky feed      |
| **Labelers**        | Structured annotations on DIDs/content                        | Protocol-level skill/capability labels on Bluesky profiles |
| **OAuth**           | Scoped auth against user's PDS                                | Live, deployed, working in production apps                 |

### 1.5 IETF Standardization

The AT Protocol is being standardized through the IETF. An Internet Draft was published September 2025, and a formal working group charter was published January 2026. This adds long-term credibility and reduces single-vendor platform risk.

---

## 2. The Gap: No Professional Identity Layer

### 2.1 What's Missing

Every category of social application is being addressed in the Atmosphere — _except professional identity and capability-based discovery._

- No structured skills, experience, or capability profiles
- No endorsement systems
- No professional networking or matching
- No portfolio or credential management
- No mediated contact for professional contexts

Bluesky's own profile is deliberately minimal: `displayName` (64 chars), `description` (256 chars), `pronouns`, `website`, `avatar`, `banner`. That's it. No structured fields for anything professional.

### 2.2 Bluesky Acknowledges This Gap

In the [AT Protocol Call for Developer Projects](https://github.com/bluesky-social/atproto/discussions/3049), the Bluesky team explicitly identified **job boards and portfolios** as projects that "would be good fits for the protocol, and could be built by independent teams today" — covering both employer-side (position listings) and employee-side (skills, looking for work).

### 2.3 The Closest Things Today

| App                 | What It Does                                           | Why It's Not Personus                                                    |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Cred.blue**       | Generates a credibility score from public Bluesky data | Passive analysis, not user-curated; no skills, endorsements, or personas |
| **Linkat**          | Link-in-bio                                            | Flat list of links, not structured identity                              |
| **Bluesky profile** | Name + bio + avatar                                    | 256-char description, no structured capabilities                         |

The whitespace is wide open.

---

## 3. The Mutual Benefit Story

### 3.1 What Personus Gets from the Atmosphere

**Instant addressable identity pool.** 40M+ Bluesky users can authenticate with Personus via "Log in with Bluesky" — zero account creation friction. The DID they already have _is_ their Personus identity anchor.

**Social graph as trust signal.** Bluesky's `app.bsky.graph.follow` records provide:

- Endorsement candidates ("your Bluesky connections who also use Personus")
- Trust signals for search ranking (mutual follow count, shared communities)
- Warm introduction paths for mediated contact

**Distribution through interoperability.** Persona data stored in atproto repos is visible to any Atmosphere app. A Personus persona becomes a structured identity layer available across the entire open social web — not locked inside a single app.

**Infrastructure subsidy.** The relay/firehose infrastructure syncs data across the network. Personus doesn't need to build its own real-time distribution system.

### 3.2 What Bluesky Gets from Personus

**Structured professional identity.** Bluesky's minimal profile is intentional — they want the Atmosphere to fill the gaps. Personus provides the "who is this person, what can they do, what have others endorsed" layer that Bluesky deliberately omitted.

**Ecosystem value and DID stickiness.** Every app that makes a Bluesky DID more useful increases the switching cost away from the protocol. If your DID carries your professional identity, your skill endorsements, and your reputation — you're deeply invested.

**Richer profile surfaces.** Bluesky's 2026 roadmap mentions enriching profiles with data from Atmosphere apps (e.g., Twitch LIVE badges). Personus could surface:

- Top skills and endorsement counts
- "Open to opportunities" signals
- Capability summary cards

**Discovery feed.** A Personus-powered feed generator could create a "Discover by Capability" feed on Bluesky itself — surfacing interesting people based on what they can do, not just what they post.

### 3.3 The Flywheel

```
Bluesky user links DID to Personus
    → Builds structured persona (skills, experience, endorsements)
    → Public persona records stored in atproto repo
    → Other Atmosphere apps surface Personus data
    → User's DID becomes more valuable
    → More users link their DIDs
    → Richer discovery network
    → More endorsement activity
    → Personus becomes the professional identity layer for the open social web
```

---

## 4. Strategic Positioning

### 4.1 Personus as "The Professional Identity App" for AT Protocol

The positioning is clear: **Personus is to professional identity what WhiteWind is to blogging and Skylight is to short video** — the definitive Atmosphere app for its category.

Key differentiators vs. building yet another LinkedIn competitor:

- **User-owned data** — personas live in the user's atproto repo, not in Personus's database
- **Portable identity** — DIDs and credentials survive if Personus disappears
- **Multi-persona model** — one identity, many faces (professional, community, guild)
- **AI-native** — semantic search, persona coach, endorsement recommendations
- **Open discovery** — any AT Protocol app can query Personus's XRPC endpoints

### 4.2 Risks

| Risk                                                | Severity   | Mitigation                                                                      |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Bluesky DAU volatility (40M registered, ~4M active) | Medium     | Personus works standalone; AT Protocol is additive, not required                |
| Privacy model incomplete (repos are public-only)    | High       | Dual storage model (Doc 07 §6); public personas in repo, private in Neon        |
| OAuth still "Developer Preview"                     | Low        | Stable enough for production apps (Skylight, Smoke Signal use it)               |
| Protocol governance centralized at Bluesky PBC      | Medium     | IETF standardization underway; protocol is open-source                          |
| Demographics skew young (62%+ under 35)             | Low-Medium | Early-career professionals are a strong initial segment for capability building |
| Lexicon schema rigidity vs. metadata-driven traits  | Low        | Solved by `traitType` + `data: unknown` pattern (Doc 07 §2.2)                   |

### 4.3 Why Now

1. **Ecosystem momentum.** Production apps with real users prove the pattern works. Skylight hit 380K users — this isn't theoretical.
2. **Bluesky is actively recruiting Atmosphere developers.** Their 2026 roadmap, developer grants, and conference investment signal commitment.
3. **First-mover advantage in the gap.** No professional identity app exists yet. The first credible entrant claims the category.
4. **Early-career demographic alignment.** 62%+ under 35 = people actively building their professional identity, exactly who benefits most from structured capability profiles.
5. **IETF standardization.** The protocol is being formalized, reducing long-term platform risk.

---

## 5. Integration Roadmap

This roadmap complements the technical phasing in Doc 07 §5 with strategic context.

### Phase A: Foundation Alignment (Now — Weeks 1-2)

**Goal:** Validate that our auth and data model support AT Protocol integration without rework later.

- Validate multi-provider auth plumbing (Phone, Apple, Google via Clerk + Bluesky OAuth) — see Doc 11
- Confirm `did` field on users table works end-to-end
- Ensure trait data serializes cleanly as CBOR (no deeply nested structures)
- Ensure persona `visibility` enum values match planned lexicon (`public`, `connections`, `group`)
- No AT Protocol code yet — just alignment

**Success criteria:** A user can sign up via phone/Apple/Google, and the user model has a clear slot for a future DID link. Auth provider abstraction proven across multiple methods.

### Phase B: Identity Link (Phase 1 Weeks 5-8)

**Goal:** Bluesky users can link their DID to Personus and get value immediately.

- "Connect Bluesky" flow in Settings
- AT Protocol OAuth implementation (`repo:ai.personus.*` scopes)
- Store DID in users table, resolve handle for display
- Import Bluesky display name + avatar as profile seed data
- Show `@handle.bsky.social` on persona cards
- Import Bluesky social graph as endorsement candidates

**Success criteria:** A Bluesky user links their account in under 30 seconds and sees their Bluesky identity reflected in Personus.

### Phase C: Repo Storage & AppView (Phase 2)

**Goal:** Public personas become first-class atproto records, discoverable across the Atmosphere.

- Publish `ai.personus.*` lexicon JSON files
- Write public persona records to user repos on create/update
- Build firehose consumer (Jetstream) filtered for `ai.personus.*`
- Index incoming records into Neon + pgvector
- Expose XRPC discovery endpoints (`ai.personus.discovery.search`, etc.)

**Success criteria:** A persona created in Personus is readable at `at://did:plc:xyz/ai.personus.persona.record/tid123` and discoverable via XRPC.

### Phase D: Ecosystem Play (Phase 3)

**Goal:** Personus becomes the professional identity layer for the open social web.

- Implement Personus labeler (skill labels on Bluesky profiles)
- Feed generator ("Discover by Capability" feed on Bluesky)
- Cross-app discovery via XRPC (other Atmosphere apps query Personus)
- Endorsements as portable credentials in user repos
- Shadow persona claiming via DID linking
- Migrate to private namespaces when AT Protocol ships them

**Success criteria:** A Bluesky user sees skill labels on profiles without ever visiting Personus directly.

---

## 6. Competitive Moat

If Personus establishes itself as the professional identity layer for AT Protocol:

1. **Data network effect.** Every endorsement, every skill label, every trust signal makes the network more valuable. This data doesn't exist elsewhere on the protocol.
2. **Semantic search advantage.** pgvector embeddings + AI-native discovery are hard to replicate. The AppView pattern means Personus controls the intelligence layer even though users own the raw data.
3. **Protocol-level presence.** Labeler integration means Personus data appears in Bluesky clients by default — not just in the Personus app.
4. **First-mover in a recognized gap.** Bluesky's own team identified this category as needed. Being first with a credible product creates strong positioning.

---

## References

- [AT Protocol Specification](https://atproto.com/specs/atp)
- [Bluesky 2026 Roadmap](https://bsky.social/about/blog/01-26-2026-whats-next-at-bluesky)
- [ATmosphereConf 2025](https://atprotocol.dev/atmosphereconf-seattle-2025/)
- [Call for Developer Projects](https://github.com/bluesky-social/atproto/discussions/3049)
- [Beyond Bluesky: Apps Building on AT Protocol (TechCrunch)](https://techcrunch.com/2025/06/13/beyond-bluesky-these-are-the-apps-building-social-experiences-on-the-at-protocol/)
- [Mark Cuban Backs Skylight (TechCrunch)](https://techcrunch.com/2025/04/01/mark-cuban-backs-skylight-a-tiktok-alternative-built-on-blueskys-underlying-technology/)
- [AT Protocol OAuth Specification](https://atproto.com/specs/oauth)
- [Jetstream: Shrinking the Firehose](https://jazco.dev/2024/09/24/jetstream/)
- [Private Data Working Group](https://atproto.wiki/en/working-groups/private-data)
- [IETF AT Protocol Internet Draft](https://datatracker.ietf.org/doc/draft-atproto/)
- [Bluesky Statistics (Backlinko)](https://backlinko.com/bluesky-statistics)
- Personus Doc 07: AT Protocol Design Specification
- Personus Doc 09: Authorization and Permissions
