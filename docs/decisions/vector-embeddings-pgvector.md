---
type: decision
title: "Vector Embeddings: pgvector In-Database"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Vector Embeddings: pgvector In-Database

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Semantic discovery is a core product loop. Users and AI agents search for personas, communities, and shadow personas by capability — "a Rust engineer in Berlin who has open-source leadership experience" — and expect ranked results. The `personas`, `communities`, and `shadow_personas` tables each carry a 1536-dim vector column populated from OpenAI `text-embedding-3-small` (or equivalent) by code in `apps/web/lib/embeddings/`.

Neon Postgres offers native pgvector, and the prior `database-choice.md` ADR already weighted pgvector support heavily when picking Neon. This ADR covers the **where do embeddings live** question explicitly: in the primary database alongside the rows, not in a separate vector store.

## Decision Drivers

1. **Joinability with structured filters** — semantic search is almost always gated by structured filters: visibility, consent, community membership, verification tier. Vector-only stores force a two-hop fetch.
2. **Transactional consistency** — when a persona is created, its embedding must be written in the same transaction (or compensating flow) so listings and search stay consistent.
3. **Operational simplicity** — one system to back up, monitor, and secure.
4. **Cost at current scale** — vector DBs charge per index; pgvector is free with the Postgres we already run.
5. **Index quality and scale headroom** — must support HNSW or IVFFlat with acceptable recall at our expected row counts (100k–10M range for years).
6. **Privacy and data residency** — embeddings are derivative of user content; keeping them in the primary DB simplifies GDPR export/delete.

## Decision

We store embeddings **in Postgres via pgvector**, colocated with the rows they describe (`personas.embedding`, `communities.embedding`, `shadow_personas.embedding`). We use HNSW indexes for query-time recall and let pgvector do the similarity math (`<=>` cosine distance). Embedding generation lives in `apps/web/lib/embeddings/` and is called from persona/community create/update flows.

Pgvector satisfies drivers 1–4 fully. Driver 5 is satisfied up to the ~10M row range, beyond which we may need to re-evaluate (dedicated vector DB, sharding, or IVFFlat with larger `lists`). Driver 6 is fully satisfied — embeddings follow the same backup, export, and delete paths as the rows.

## Alternatives Considered

### Comparison Matrix

| Driver | pgvector (chosen) | Pinecone | Weaviate | Qdrant |
|---|---|---|---|---|
| Joinable with SQL filters | Yes (SQL JOIN + WHERE) | No (metadata filters only) | Partial (class filters) | Partial (payload filters) |
| Transactional with row write | Yes (same transaction) | No (async) | No | No |
| Operational systems | 1 (Postgres) | 2 | 2 | 2 |
| Cost at current scale | Free (bundled) | Paid per pod/index | Paid or self-host | Paid or self-host |
| Index quality | HNSW / IVFFlat | Excellent | Excellent | Excellent |
| Scale ceiling | ~10M rows comfortable | Very high | Very high | Very high |
| GDPR delete path | Same as row | Separate | Separate | Separate |
| Ecosystem maturity | High | High | Medium | Medium |

### pgvector (chosen)
The joinability advantage alone is decisive: almost every semantic query on Personus is filtered by visibility, consent, and ownership rules. Doing that in a second system means either duplicating the filters or making two round-trips per query. Cost, ops simplicity, and GDPR alignment are bonuses.

### Pinecone (rejected)
Best-in-class vector store, but zero SQL joinability and filters are metadata-only. A "Rust engineer visible to the requesting user's visibility tier" query becomes a two-system dance. Rejected on fit, not quality.

### Weaviate / Qdrant (rejected)
Both strong, both introduce a second system. Weaviate's module system is powerful but overkill; Qdrant is lean but still a separate ops surface. Neither's advantages justify the ops + consistency cost at our scale.

## Consequences

### Positive
- One system to back up, monitor, and secure.
- Semantic search composes naturally with CASL visibility filters and consent checks in a single SQL query.
- Embedding writes are transactional with row writes — no background sync to go stale.
- GDPR export/delete paths are free; deleting a row deletes the embedding.

### Negative
- Postgres is not purpose-built for vector workloads; query plans must be watched as row counts grow.
- HNSW index build and update costs add write latency — may need async regeneration for bulk imports.
- If embedding dimensions change (e.g., model upgrade), we need a migration strategy for the vector column.

### Risks
- **Scale ceiling.** Beyond ~10M rows with heavy query load, pgvector may need tuning or a dedicated replica. Mitigation: monitor `p95` search latency; move to a read replica before a vector-DB migration.
- **Embedding model drift.** If OpenAI deprecates `text-embedding-3-small` or we change models, mixed-dimension vectors would break search. Mitigation: write a re-embed migration script and gate cutover on full reindex.
- **Write amplification.** Every persona/trait edit triggers an embedding regen. Mitigation: debounce in the update path; consider async via a worker when rate becomes a problem.

## Implementation

- Schema: `packages/db/src/schema/personas.ts`, `communities.ts`, `shadow-personas.ts` (1536-dim vector columns, HNSW indexes)
- Embedding generation: `apps/web/lib/embeddings/`
- Query helpers: semantic search functions in `apps/web/lib/embeddings/` (cosine distance via `<=>`)
- Model: OpenAI `text-embedding-3-small` (1536 dims) via `@ai-sdk/openai`

## References

- `docs/decisions/database-choice.md` — Neon + pgvector chosen partly for this use case
- `packages/db/src/schema/` — vector columns and indexes
- Onboarding report `docs/onboarding-2026-04-10.md` — P2 retroactive ADR item
