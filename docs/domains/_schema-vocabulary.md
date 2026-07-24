---
type: guide
title: Schema Spec Vocabulary
description: "Controlled vocabulary for every schema-spec.md in this project. Keep schema specs framework-agnostic — no Drizzle, Prisma, SQL, or ORM-specific terms in the spec itself. The physical…"
status: current
tags: [domains]
---

# Schema Spec Vocabulary

Controlled vocabulary for every `schema-spec.md` in this project. Keep schema specs framework-agnostic — no Drizzle, Prisma, SQL, or ORM-specific terms in the spec itself. The physical implementation in `packages/db/src/schema/*.ts` is truth; the schema spec is the logical contract a PM, engineer, or Claude session can read and approve without committing to a framework.

## Field attributes

| Term | Meaning |
|---|---|
| **`identifier`** | The primary key. Typically `id (uuid)`. One per entity. Not written by users. |
| **`required`** | The field must have a value on write. Default assumption if unspecified. |
| **`optional`** | The field may be null or absent. |
| **`default <value>`** | The field has a default when not specified. |
| **`immutable`** | Once set, the field cannot change. Used for URIs, slugs, and any externally-referenced identifier. |
| **`unique`** | No two rows of this entity may share this value. |
| **`unique within <scope>`** | Composite uniqueness. E.g., "unique within a community" = `(communityId, field)` unique. |
| **`indexed`** | Should be indexed for lookup. Physical kind (btree, hash, gin) is an implementation choice. |
| **`lookup by <field>`** | Shorthand meaning "this field is a common query path — index it for reads." |
| **`generated`** | Value is computed by the system (timestamps, embeddings, URIs, completeness scores). Not user-writable. |
| **`system`** | Field is not writable by users via any surface; only the service layer may set it. |
| **`pii-scanned`** | Free-text field that must run through PII detection on write (per `no-pii-in-personas` principle). |
| **`audit`** | Mutations on this field emit an `activity_events` row (per `audit-all-mutations` principle). Usually applied at the entity level, not field level. |

## Types

Framework-neutral type names. Map to whatever the implementation language offers.

### Primitive
- `string` — text, no length bound unless specified
- `string (<= N chars)` — bounded string
- `integer`
- `decimal` — fixed-point; use for money
- `boolean`
- `timestamp` — ISO 8601 with timezone
- `date` — date without time
- `uuid`
- `enum [a, b, c]` — enumerated values; list them inline

### Composite
- `object` — unstructured JSON-like bag; state its shape in the schema spec if significant
- `array of <type>` — ordered list
- `vector[<dim>]` — embedding vector of specified dimension (e.g., `vector[1536]`)

### Constrained string subtypes
- `slug` — URL-safe string: lowercase letters, digits, hyphens, no spaces
- `email`
- `url`
- `markdown` — free-text markdown; usually pii-scanned
- `html` — rendered HTML; rare, prefer markdown

### Reference
- `reference to <Entity>` — foreign key. Specify the target entity. Combined with `required`/`optional` to indicate nullability and with `indexed` if it's a lookup path.

## Relationships

Stated in `hasOne` / `hasMany` / `belongsTo` / `manyToMany` form. Each side of a relationship should be declared in both entities for clarity.

- **`hasOne <Entity>`** — one-to-one. This entity has exactly one associated target.
- **`hasMany <Entity>`** — one-to-many. This entity has zero or more associated targets.
- **`belongsTo <Entity>`** — the inverse of hasOne or hasMany; this entity holds the foreign key.
- **`manyToMany <Entity> through <JoinEntity>`** — many-to-many with an explicit join entity.
- **`hasMany <Entity> (scoped to <condition>)`** — constrained relationship, e.g., "hasMany Endorsements (scoped to non-deleted)".

State the cardinality in words when it matters:
- "hasMany Endorsements (0+)" — zero or more
- "hasMany Members (1+, founding user is admin)" — at least one
- "hasOne UserTraits (exactly one, created with User)" — exactly one

## Lifecycle

- **`soft delete`** — `deletedAt` timestamp, row preserved. Default for entities with historical references.
- **`hard delete`** — row removed. Use when there's no reason to preserve (e.g., expired shadows).
- **`cascade delete`** — when parent is deleted, children are deleted too. State explicitly.
- **`restrict delete`** — cannot delete parent while children exist. Rare.
- **`status: <enum>`** — explicit state machine. Enumerate the states and the allowed transitions in the entity's Lifecycle section.

Example lifecycle section:
```
**Lifecycle:** `Created → Claimed → (resulting Persona lives on)` or `Created → Expired → hard delete`
```

## Constraints beyond fields

- **`check: <rule>`** — a business rule that must hold. Stated in plain language. Examples:
  - `check: if entityType='organization' then displayName is non-empty`
  - `check: exactly one of (targetPersonaId, targetShadowId) is set`
- **`on create: <action>`** — side effects triggered on creation (e.g., "on create: generate embedding from traits").
- **`on update: <action>`** — side effects on updates (e.g., "on update: regenerate embedding if traits changed").
- **`on delete: <action>`** — side effects on deletion (e.g., "on delete: revoke outstanding claim tokens").

## Section order for a schema spec entity

Every entity in a schema spec follows this order so they're scannable:

1. **Heading** — `### EntityName`
2. **One-line description** — what this entity represents
3. **Fields** — bulleted list, each field with type + attributes + one-line purpose
4. **Relationships** — `hasMany`, `belongsTo`, `hasOne`, `manyToMany`
5. **Lifecycle** — state transitions or "no updates; hard delete only" etc.
6. **Invariants** — numbered list of rules that must hold
7. **Check rules** — business rules that span fields (optional, only if non-trivial)

## Cross-entity content

At the bottom of each schema spec, after all entities:

- **Cross-entity invariants** — rules that span multiple entities in this area
- **Indexes (query patterns)** — a brief list of the read patterns the area supports and the indexes that back them
- **Cross-area references** — foreign keys into other areas' entities, with a pointer to the target area's schema spec

## What is NOT in a schema spec

- ORM-specific syntax (Drizzle `pgTable`, Prisma `@@index`, etc.)
- Migration history
- Column-level SQL types (`VARCHAR(255)` vs `TEXT`)
- Index implementation (btree vs hash vs gin)
- TypeScript type definitions
- Example row data
- Service-layer code or query examples

Those live in `packages/db/src/schema/*.ts`, in migration files, and in feature specs.

---

_2026-04-14 · Controlled vocabulary for schema specs. Applies to every `schema-spec.md` in `docs/specs/<area>/`. Keep it short; when a new term is needed, add it here first._
