---
type: research
title: "Research: AT Protocol Integration for Personus"
description: "AT Protocol (atproto) is the decentralized social protocol behind BlueSky. This document evaluates how Personus could integrate with it as an \"extended profile\" layer for capability-based discovery."
status: current
tags: [research]
timestamp: 2026-02-10
---

# Research: AT Protocol Integration for Personus

> Date: 2026-02-10
> Status: Research complete, design doc drafted

## Summary

AT Protocol (atproto) is the decentralized social protocol behind BlueSky. This document evaluates how Personus could integrate with it as an "extended profile" layer for capability-based discovery.

**Verdict:** Strong fit for public-facing discovery. Personus maps naturally onto the App View pattern, and custom lexicons (`ai.personus.*`) are fully supported. The main gap is privacy — atproto repos are public-only today.

---

## AT Protocol Architecture (Relevant Parts)

### Identity: DIDs + Handles

- Every user has a **DID** (Decentralized Identifier), typically `did:plc:*`
- **Handles** are DNS names (e.g., `alice.bsky.social`) that resolve to DIDs
- DID documents contain: signing key, PDS endpoint, handle
- Key rotation supported with 72-hour recovery window
- Creating a `did:plc` is free and requires no authentication

### Profile Record (`app.bsky.actor.profile`)

Deliberately minimal:

| Field           | Constraints       |
| --------------- | ----------------- |
| displayName     | max 64 graphemes  |
| description     | max 256 graphemes |
| pronouns        | max 20 graphemes  |
| website         | URI               |
| avatar / banner | image, max 1MB    |
| labels          | self-labels       |
| pinnedPost      | post reference    |

**One profile per account** (record key is `literal:self`). No structured fields for skills, experience, capabilities. This is the gap Personus fills.

### Custom Lexicons

Any developer can define record types under a domain they control using reverse-DNS naming (NSIDs):

```
ai.personus.persona.profile
ai.personus.trait.entry
ai.personus.endorsement
```

**BlueSky's hosted PDS accepts and stores unknown record types without modification.** Records live alongside native BlueSky data in the user's repository.

Records stored at: `at://[DID]/[collection-NSID]/[record-key]`

Constraints:

- Record size: ~1 MiB CBOR / ~2 MiB JSON
- Blob size: 1MB on hosted PDS
- Schema evolution: new fields must be optional, types can't change

### App Views

An App View subscribes to the firehose, filters for relevant record types, indexes them, and serves its own API. This is how all non-BlueSky apps on atproto work (Frontpage, WhiteWind, Smoke Signal).

Personus would:

1. Subscribe to firehose filtered for `ai.personus.*` collections
2. Index persona records into Neon Postgres + pgvector
3. Generate vector embeddings for semantic search
4. Serve XRPC query endpoints for discovery

### Data Portability

User repos export as CAR (Content Addressable aRchive) files. Users can migrate PDSes while keeping their DID stable. All Personus records would migrate automatically.

---

## Key Findings

### Multi-Persona Mapping

atproto has 1:1 DID-to-account mapping. Options for our multi-persona model:

| Approach                                         | Pros                                            | Cons                                              |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------- |
| **Multiple records under one DID** (recommended) | Single identity, single auth, portable together | No protocol-level isolation between personas      |
| Separate DID per persona                         | True isolation                                  | Operational complexity, breaks unified user traits |
| Hybrid                                           | Best of both                                    | Implementation complexity                         |

Recommended: multiple records under one DID for most cases, separate DIDs only for shadow personas needing strong isolation.

### Privacy Gap (Critical)

**All data in AT Protocol repos is public.** Synced to relays, broadcast on firehose, readable by anyone.

This conflicts with Personus's visibility controls (per-persona, per-group access).

Mitigation: **dual storage** — public personas in atproto repos, private/restricted data in our Neon DB. AT Protocol's Private Data Working Group is designing non-public namespaces but hasn't shipped yet.

### JSONB Flexibility vs. Lexicon Rigidity

Our `trait_metadata`-driven system adds trait types at runtime. Lexicons require predefined schemas.

Solution: generic trait record with `traitType: string` + `data: unknown`, preserving runtime flexibility within a stable lexicon definition.

### Vector Embeddings

1536-dim embeddings (~6KB each) serve no purpose in repos and would bloat the firehose. Keep server-side in pgvector. Source text goes in repo; computed embeddings do not.

---

## Integration Opportunities

### Tier 1: Low Effort, High Value (Weeks)

- **OAuth via atproto DID** — sign up/login with AT Protocol identity
- **Import BlueSky social graph** — read `app.bsky.graph.follow` records
- **Link personas to BlueSky profiles** — "View on BlueSky" links
- Store `did:plc` as optional identity field in `users` table

### Tier 2: Deep Integration (Months)

- **Define `ai.personus.*` lexicons** — persona profiles, trait entries, endorsements
- **Write persona records to user repos** via OAuth
- **Build App View** — firehose subscription, indexing, XRPC endpoints
- **Labeler integration** — add capability labels to BlueSky profiles

### Tier 3: Ecosystem Play (Long-term)

- Position as the "professional identity layer" for the open social web
- Endorsements as portable credentials stored in repos
- Cross-app discovery (other atproto apps query Personus for capability matching)
- Shadow persona claiming via DID linking

---

## Technical Considerations

| Dimension             | Alignment | Notes                                                 |
| --------------------- | --------- | ----------------------------------------------------- |
| Identity model        | High      | DID-based identity maps well; OAuth supported         |
| Lexicon extensibility | Very High | Custom `ai.personus.*` fully supported                |
| Multi-persona         | Medium    | Multiple records per DID works; no protocol isolation |
| Data portability      | High      | Repos + CAR export = full portability                 |
| App View model        | Very High | Personus fits this pattern perfectly                  |
| Privacy/visibility    | Low       | Public-only repos conflict with visibility controls   |
| Semantic search       | High      | App View builds pgvector index from firehose          |

---

## Sources

- [AT Protocol Specification](https://atproto.com/specs/atp)
- [Lexicon Specification](https://atproto.com/specs/lexicon)
- [Repository Specification](https://atproto.com/specs/repository)
- [Custom Schemas Guide](https://docs.bsky.app/docs/advanced-guides/custom-schemas)
- [Building Applications on AT Protocol](https://atproto.com/guides/applications)
- [DID Specification](https://atproto.com/specs/did)
- [Private Data Discussion #3363](https://github.com/bluesky-social/atproto/discussions/3363)
- [Federation Architecture](https://docs.bsky.app/docs/advanced-guides/federation-architecture)
- [Awesome Lexicons (Community)](https://github.com/lexicon-community/awesome-lexicons)
