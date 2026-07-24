---
type: foundation
title: AT Protocol Design Specification
description: "This document specifies how Personus integrates with the AT Protocol to participate in the Open Social Web. The goal is to make Personus data portable, interoperable, and aligned with atproto's…"
status: superseded
tags: [archived]
timestamp: 2026-02-10
---

# AT Protocol Design Specification

> Status: Draft
> Date: 2026-02-10
> Depends on: 01-vision-and-principles.md, 02-data-model.md

## Purpose

This document specifies how Personus integrates with the AT Protocol to participate in the Open Social Web. The goal is to make Personus data portable, interoperable, and aligned with atproto's decentralized architecture — so that BlueSky's ~25M+ users represent an instant addressable audience.

## Design Principles

1. **User-owned data.** Persona records live in the user's AT Protocol repository whenever possible. Personus indexes them, but the user controls the source of truth.
2. **Public by default, private by choice.** Public personas are stored in atproto repos for maximum discoverability. Private/restricted data stays server-side until atproto ships private namespaces.
3. **Additive, not duplicative.** Personus enriches atproto identity — it doesn't replace BlueSky profiles or compete with them.
4. **Lexicon-first data modeling.** Our data model should be expressible as atproto lexicons even before we ship the integration, ensuring we don't paint ourselves into a corner.
5. **Graceful degradation.** The app works fully without atproto. AT Protocol is an optional identity and portability layer, not a hard dependency.

---

## 1. Identity Integration

### 1.1 DID as Identity Anchor

Add an optional `did` field to the `users` table:

```sql
ALTER TABLE users ADD COLUMN did TEXT UNIQUE;
-- e.g., 'did:plc:abc123...'
```

When a user connects their AT Protocol identity:

- Store their `did:plc` (or `did:web`) as canonical portable identity
- Resolve their handle for display (e.g., `@alice.bsky.social`)
- Import their BlueSky display name and avatar as profile seed data

### 1.2 Authentication Flow

Use AT Protocol OAuth (ATPROTO scope-based auth):

1. User clicks "Connect BlueSky" in settings
2. Redirect to PDS authorization endpoint
3. Request scopes: `repo:ai.personus.*` (read/write our collections only)
4. Store OAuth tokens server-side, associated with Clerk user ID
5. User's Personus account is now linked to their DID

This is additive — Clerk remains the primary auth. AT Protocol is a linked identity.

### 1.3 Handle as Vanity URL

Once linked, Personus can resolve a user's AT Protocol handle:

```
personus.ai/@alice.bsky.social → user's public persona directory
```

This provides BlueSky users a familiar addressing pattern.

---

## 2. Lexicon Design

### 2.1 Namespace

All Personus lexicons live under `ai.personus.*`:

```
ai.personus.actor.profile      — extended profile (traits summary)
ai.personus.persona.record      — individual persona
ai.personus.trait.entry          — single trait in the pool
ai.personus.endorsement.record   — endorsement of a trait
ai.personus.contact.request      — mediated contact request
```

### 2.2 Core Lexicons

#### `ai.personus.actor.profile` (Singleton)

The user's public Personus profile — a summary of their traits. One per DID (record key: `self`).

```json
{
  "lexicon": 1,
  "id": "ai.personus.actor.profile",
  "defs": {
    "main": {
      "type": "record",
      "key": "literal:self",
      "record": {
        "type": "object",
        "required": ["createdAt"],
        "properties": {
          "displayName": { "type": "string", "maxGraphemes": 64 },
          "headline": { "type": "string", "maxGraphemes": 256 },
          "location": { "type": "string", "maxGraphemes": 128 },
          "personaCount": { "type": "integer", "minimum": 0 },
          "profileCompleteness": { "type": "integer", "minimum": 0, "maximum": 100 },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

#### `ai.personus.persona.record` (Multiple per DID)

Each persona is a separate record. Record key is a TID (timestamp-based ID).

```json
{
  "lexicon": 1,
  "id": "ai.personus.persona.record",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["displayName", "personaType", "visibility", "createdAt"],
        "properties": {
          "displayName": { "type": "string", "maxGraphemes": 64 },
          "headline": { "type": "string", "maxGraphemes": 256 },
          "personaType": {
            "type": "string",
            "knownValues": ["person", "organization", "shadow"]
          },
          "visibility": {
            "type": "string",
            "knownValues": ["public", "connections", "group"]
          },
          "contactPreference": {
            "type": "string",
            "knownValues": ["open", "mediated", "closed"]
          },
          "traits": {
            "type": "array",
            "items": { "type": "ref", "ref": "#traitRef" }
          },
          "location": { "type": "string", "maxGraphemes": 128 },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    },
    "traitRef": {
      "type": "object",
      "required": ["traitType"],
      "properties": {
        "traitType": { "type": "string" },
        "data": { "type": "unknown" }
      }
    }
  }
}
```

The `traits` array contains inline trait data (denormalized from the pool, matching our existing persona model). The `traitType` discriminator + `unknown` data preserves our metadata-driven flexibility.

#### `ai.personus.trait.entry` (Multiple per DID)

Individual trait records in the master pool. These are the source of truth; persona records contain copies.

```json
{
  "lexicon": 1,
  "id": "ai.personus.trait.entry",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["traitType", "data", "createdAt"],
        "properties": {
          "traitType": {
            "type": "string",
            "description": "Discriminator matching trait_metadata.key",
            "knownValues": [
              "skills",
              "employment",
              "education",
              "certifications",
              "interests",
              "values",
              "openTo",
              "strengths",
              "languages"
            ]
          },
          "data": {
            "type": "unknown",
            "description": "Trait-specific payload, schema defined by trait_metadata"
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

#### `ai.personus.endorsement.record`

```json
{
  "lexicon": 1,
  "id": "ai.personus.endorsement.record",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["subject", "traitType", "createdAt"],
        "properties": {
          "subject": { "type": "string", "format": "did" },
          "persona": { "type": "string", "format": "at-uri" },
          "traitType": { "type": "string" },
          "traitValue": { "type": "string", "maxGraphemes": 256 },
          "endorsementText": { "type": "string", "maxGraphemes": 1024 },
          "relationship": {
            "type": "string",
            "knownValues": ["colleague", "manager", "report", "client", "peer", "other"]
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

### 2.3 Data Flow: Dual Storage Model

```
User edits trait in Personus UI
        │
        ├──► Neon DB (full data, including private fields)
        │       ├── user_traits.traits (JSONB, master collection)
        │       ├── personas.traits (JSONB, denormalized copy)
        │       └── personas.embedding (vector, for search)
        │
        └──► AT Protocol Repo (public data only, if linked)
                ├── ai.personus.trait.entry/[tid] (pool entry)
                └── ai.personus.persona.record/[tid] (persona snapshot)
```

**Rules:**

- Only traits marked with `visibility: "public"` are written to the atproto repo
- Private personas (visibility `connections` or `group`) stay in Neon only
- Vector embeddings are never written to repos (computed server-side)
- Neon DB is always the authoritative source; repo is a public projection
- When atproto private namespaces ship, restricted data can migrate to repos

### 2.4 Schema Evolution

Lexicon rules require backward compatibility:

- New optional fields can be added to any record type
- Field types cannot change
- Fields cannot be removed or renamed
- Breaking changes require a new NSID

Our `data: unknown` pattern on trait entries provides forward compatibility — new trait types are new values of `traitType`, not new lexicon fields.

---

## 3. App View Architecture

### 3.1 Firehose Consumer

```
AT Protocol Relay (firehose)
        │
        │ filter: ai.personus.*
        │
        ▼
Personus Indexer Service
        │
        ├── Parse persona records
        ├── Generate text for embedding
        ├── Compute 1536-dim vector via OpenAI
        ├── Upsert into Neon (personas + pgvector)
        └── Update search index
```

Use `filterCollections` parameter when subscribing to receive only `ai.personus.*` events.

### 3.2 XRPC Endpoints

Personus exposes discovery as standard XRPC queries:

```
ai.personus.discovery.search
  params: { q: string, personaType?: string, limit?: int }
  output: { personas: PersonaView[], cursor?: string }

ai.personus.discovery.suggest
  params: { did: string, limit?: int }
  output: { personas: PersonaView[] }

ai.personus.actor.getProfile
  params: { did: string }
  output: { profile: ProfileView, personas: PersonaView[] }
```

Any AT Protocol client can call these endpoints to query Personus's semantic search.

### 3.3 Labeler (Optional, Tier 3)

Personus could act as an atproto labeler, adding structured labels to DIDs:

```
Label: { src: "did:plc:personus", uri: "did:plc:user123", val: "skill:python" }
Label: { src: "did:plc:personus", uri: "did:plc:user123", val: "endorsed:3" }
```

These labels would be visible in BlueSky and other clients that subscribe to the Personus labeler. This is a powerful discovery mechanism but requires Tier 3 investment.

---

## 4. Social Graph Integration

### 4.1 Import BlueSky Connections

Read the user's `app.bsky.graph.follow` records to:

- Suggest existing BlueSky connections as endorsers
- Pre-populate group memberships from BlueSky lists
- Use mutual follow count as a trust signal in search ranking

### 4.2 BlueSky List ↔ Personus Group Mapping

BlueSky lists (`app.bsky.graph.list`) map conceptually to Personus groups:

- Import: "Add members of my BlueSky list 'Design Team' to this Personus group"
- Export: "Create a BlueSky list from this Personus group's members"

### 4.3 Cross-Protocol Contact Requests

When a Personus user initiates a mediated contact request with someone who has a linked BlueSky account, optionally send a BlueSky DM or mention as a notification channel.

---

## 5. Implementation Phases

### Phase A: Foundation (Align Now, Build Later)

**No AT Protocol code yet.** Ensure our data model doesn't diverge:

- [ ] Add optional `did` column to `users` schema
- [ ] Ensure all trait types are expressible as `traitType` + JSON `data`
- [ ] Use `contactPreference` instead of `contactPolicy` in user-facing code
- [ ] Ensure persona `visibility` enum values match lexicon (`public`, `connections`, `group`)
- [ ] Keep trait data flat enough to serialize as CBOR (no deeply nested structures)
- [ ] Document lexicon NSIDs in this spec (done above)

### Phase B: Identity Link (Tier 1)

- [ ] Add "Connect BlueSky" flow in settings
- [ ] Implement AT Protocol OAuth with `repo:ai.personus.*` scopes
- [ ] Store DID in users table, resolve handle for display
- [ ] Import BlueSky profile (name, avatar) as seed data
- [ ] Add `@handle.bsky.social` display on persona cards

### Phase C: Repo Storage (Tier 2)

- [ ] Publish `ai.personus.*` lexicon JSON files
- [ ] Write public persona records to user repos on create/update
- [ ] Write public trait entries to user repos
- [ ] Build firehose consumer filtered for `ai.personus.*`
- [ ] Index incoming records into Neon + pgvector
- [ ] Expose XRPC discovery endpoints

### Phase D: Ecosystem (Tier 3)

- [ ] Implement Personus labeler for BlueSky profile enrichment
- [ ] Social graph import/export (follows, lists)
- [ ] Cross-app discovery via XRPC
- [ ] Shadow persona claiming via DID linking
- [ ] Migrate to atproto private namespaces when available

---

## 6. Privacy Architecture

### What Goes in the Repo (Public)

- Persona records with `visibility: "public"`
- Trait entries that appear in at least one public persona
- Endorsements on public traits
- The `ai.personus.actor.profile` summary record

### What Stays in Neon Only (Private)

- Persona records with `visibility: "connections"` or `"group"`
- Trait entries that only appear in private personas
- Vector embeddings (1536-dim, computed server-side)
- Contact request details and messages
- Activity events and analytics
- Group membership details
- OAuth tokens and session data

### Future: Private Namespaces

When AT Protocol ships private namespaces (collection-level access gating):

- Migrate `connections`-visibility personas to private namespace in repo
- Implement authentication-based access for restricted records
- Maintain Neon as the index/search layer, repo as portable storage

---

## 7. Compatibility Checklist

Items to validate as we build features:

| Feature                   | atproto Compatible? | Notes                                                               |
| ------------------------- | ------------------- | ------------------------------------------------------------------- |
| User traits (JSONB)       | Yes                 | `traitType` + `data: unknown` pattern                               |
| Multiple personas         | Yes                 | Multiple records in same collection                                 |
| Persona visibility        | Partial             | Public only in repo today                                           |
| Vector search             | N/A                 | Server-side only, not in repo                                       |
| Endorsements              | Yes                 | Cross-DID references supported                                      |
| Shadow personas           | Partial             | Store server-side until claimed                                     |
| Group memberships         | No                  | Server-side only (access control)                                   |
| Mediated contact          | Partial             | Request record in repo, messages server-side                        |
| Completeness scoring      | N/A                 | Computed server-side                                                |
| Metadata-driven rendering | Yes                 | `traitType` discriminator is lexicon-safe                           |
| Commerce persona traits   | Yes                 | Same `traitType` + `data` pattern for shipping, dietary, budget     |
| Agent authorization       | Partial             | Mandates/tokens stay server-side; public persona exposes capability |
| Offerings                 | Yes                 | Standard trait record type                                          |

---

## 8. Commerce & Agentic Protocol Alignment

Personus personas extend naturally to commerce contexts where an AI agent acts on the user's behalf. The same selective disclosure model applies: the agent carries a persona that reveals only what each merchant needs.

### Relevant Protocols

- **ACP (Agentic Commerce Protocol)** — OpenAI + Stripe, for checkout/payment delegation
- **AP2 (Agent Payments Protocol)** — Google, for cryptographic mandates of user intent
- **UCP (Universal Commerce Protocol)** — Google + Shopify, full commerce journey

### How AT Protocol + Commerce Intersect

A user's AT Protocol repo could contain:

- `ai.personus.persona.record` with `personaType: "commerce"` — public shopping preferences
- Public traits like sustainability values, style preferences, review willingness
- Endorsements from merchants ("verified buyer", "loyalty gold")

Private commerce data (budget, exact address, allergens, agent authorization) stays server-side per the dual-storage model in Section 6.

### Commerce-Specific Lexicon Extension (Future)

```
ai.personus.commerce.preference    — shopping preferences, style, sustainability
ai.personus.commerce.offering      — what the user offers (for peer-to-peer commerce)
ai.personus.commerce.mandate       — AP2-aligned authorization records (private namespace)
```

These would use the same `traitType` + `data: unknown` pattern, keeping the generic trait architecture while enabling commerce-specific App Views.

See `docs/research/agentic_commerce_integration.md` for the full analysis.
