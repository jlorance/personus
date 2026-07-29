---
type: foundation
title: Personas — Domain Model
description: "User ─1─── 1 ── UserTraits (exactly one; created with User) User ─1─── ── Persona (zero or more) Persona ─1── ── Endorsement (as target; 0+) Persona ─1── ── Endorsement (as writer; 0+) Persona…"
status: current
tags: [personas]
timestamp: 2026-04-14
---

# Personas — Domain Model

> 2026-04-14 · Conceptual ER for the Personas area. For field-level detail see [`schema-spec.md`](/domains/personas/schema-spec.md). For the physical implementation see `packages/db/src/schema/*.ts`.

## Entities

- **User** — Authenticated account. One per human. Holds auth state, default contact preferences, MCP preferences, and optionally a decentralized identifier (DID).
- **UserTraits** — The user's master trait pool. Exactly one per User. The source of truth for every Persona's published traits. Never read directly by public surfaces.
- **TraitMetadata** — Data-driven definition of a trait type (its key, category, display rules, edit rules, searchability). Seed data. Every trait in a UserTraits or Persona snapshot must correspond to a TraitMetadata row.
- **TraitTaxonomy** — Suggested values for a trait type (e.g., skill names, interest categories). Seed data; user-extensible.
- **Persona** — A selective published view of a User's traits. Each Persona has its own visibility, layout, theme, URI, contact preferences, embedding, and MCP exposure settings.
- **ShadowPersona** — A Persona-like placeholder created *for* a non-user, built within a community context from endorsements. Claimable via token. Converts to a real Persona on claim.
- **Endorsement** — A positive trust signal written by one Persona (not User) about another Persona or ShadowPersona, always within a community context. Never a review; no ratings.
- **ContactRequest** — A mediated introduction request to a Persona. Can originate from another Persona, an AI agent, or an anonymous visitor. Never stores raw contact details — the `ContactRelay` resolves delivery.

## Relationships

```
User ─1─── 1 ── UserTraits           (exactly one; created with User)
User ─1─── * ── Persona               (zero or more)
Persona ─1── * ── Endorsement         (as target; 0+)
Persona ─1── * ── Endorsement         (as writer; 0+)
Persona ─1── * ── ContactRequest      (as target; 0+)
Persona ─1── * ── ContactRequest      (as sender; 0+)
Persona ─1── * ── ShadowPersona       (as creator; 0+)
ShadowPersona ─── 1─1 ── Persona      (on claim; shadow converts to persona)
Community ─1── * ── ShadowPersona     (each shadow is community-scoped)
Community ─1── * ── Endorsement       (each endorsement is community-scoped)
```

Cross-area references: Persona belongs to User (auth), Endorsement belongs to Community (Communities area), ShadowPersona belongs to Community, ContactRequest may belong to Community.

## Lifecycle

**Persona**
```
Draft (created) → Published (visibility set) → Soft-deleted (deletePersona) or Hard-deleted (purgePersona / GDPR)
```
No archive state — visibility=`private` serves as "hidden but preserved." Regular deletion (`deletePersona`) soft-deletes the row and declines pending contact requests; it does NOT cascade to endorsements or community memberships in the shipped service layer (see Reconciliation note). GDPR purge (`purgePersona`) hard-deletes the row; FK CASCADE then removes received endorsements and contact requests from the database. Endorsements **written** by the persona persist in both deletion paths (FK has no cascade on the writer side).

> **Reconciliation note (PER-12):** `01-persona-lifecycle.md` §5 describes a 10-step deletion cascade (endorsement deactivation, community membership deletion, shadow persona nulling, etc.). The shipped `deletePersona` service (`packages/db/src/services/personas.ts`) implements only two atomic steps: soft-delete the persona (nulling the embedding) and decline pending contact requests. The full cascade from §5 is unbuilt detail; each unimplemented step is a planned enhancement.

**ShadowPersona**
```
Unclaimed → Invited → Claimed (→ resulting Persona lives on)
      ↓                  ↑
   Expired ──────────────┘ (token revoked, shadow preserved briefly, then hard-deleted)
```
The `claimStatus` enum tracks state. On claim, the shadow's endorsements transfer atomically to the resulting Persona and the claim token is revoked.

**Endorsement**
No update lifecycle. `active: false` is the deactivation mechanism (soft revoke). Writers can revoke; targets cannot.

**ContactRequest**
```
pending → responded (accepted|declined) or expired
```
`respondedAt` is set on response; the request is never updated beyond that. Expiry is enforced by a separate `expiresAt` timestamp.

## Invariants

1. **Unlinkability is the default.** Two Personas owned by the same User must not be automatically linkable by any query surface. The `User → Persona` foreign key exists but is never exposed outside the service layer. Any linking between personas requires explicit opt-in and is community-scoped (see [`08-cross-persona-linking.md`](/domains/personas/08-cross-persona-linking.md)).

2. **Traits are copied, not referenced.** When a Persona is created or its traits are edited, the relevant fields are *copied* from UserTraits into `Persona.traits`. Editing UserTraits does NOT automatically update existing Personas. Deleting a Persona never affects UserTraits or other Personas.

3. **Endorsements identify writers by persona, not by user.** `Endorsement.fromPersonaUri` points at a Persona, not a User. This preserves unlinkability: a User who endorses from their Professional persona cannot be cross-referenced to their Neighborhood persona by looking at their endorsement history.

4. **ShadowPersonas are community-scoped; Endorsement community context is optional.** Every ShadowPersona has a non-null `communityId` — there is no such thing as an "unscoped" shadow. Endorsements record the community context where they were given, but `communityId` is nullable (SET NULL when a community is deleted). The endorsement survives community closure; the trust signal is preserved even without the originating community.

> **Reconciliation note (PER-12):** The original text of invariant 4 stated "every Endorsement has a non-null communityId". The shipped schema (`packages/db/src/schema/endorsements.ts`) has `communityId` nullable with SET NULL. The `createEndorsement()` service does not require or accept a community context at the call site.

5. **ContactRequest has three sender modes.** The sender is exactly one of: `fromPersonaUri` (another Persona), `fromAgentId` (an AI agent acting for a user), or `fromAnonymous` (a visitor who hasn't signed up yet, storing their identification in a JSON blob). Never more than one; never none.

6. **PII never appears in Persona.traits or UserTraits.traits.** Free-text trait values are scanned at write. Detected PII is rejected. Raw contact details are stored only in User-level contact preferences, never in persona-level trait snapshots.

7. **Endorsements are positive-only.** The schema has no `rating`, `score`, `negative`, or `complaint` field. The shape itself enforces that endorsements cannot become reviews.

## Ubiquitous language

| Use | Avoid | Why |
|---|---|---|
| **Persona** | Profile | LinkedIn has profiles; Personus has personas. The lens metaphor is load-bearing. |
| **User** (auth) / **Persona** (published) | Treating them interchangeably | A User has one account and many Personas. A public surface shows a Persona; authentication acts on a User. |
| **Trait** | Field, attribute, property | "Trait" is canonical across UserTraits, Persona.traits, and TraitMetadata. |
| **Master trait pool** | User data, account | The pool is the user-owned source of truth; User is just the auth record. |
| **Shadow persona** | Pre-registration, ghost, stub | "Shadow" carries the claim-flow connotation. |
| **Endorsement** | Recommendation, review, rating, testimonial | Endorsements are positive-only, context-tagged, community-scoped. Never conflate with reviews. |
| **Writer / Target** (endorsements) | Sender / receiver, from / to | "Writer" and "Target" express the trust direction clearly. |
| **Visibility** | Privacy setting, access level | "Visibility" is a declared state with four values (`public`, `authenticated`, `community`, `private`). |
| **Community-scoped** | Local, private, internal | The phrase "community-scoped" is the canonical way to describe an entity tied to a specific community. |
| **Claim** | Activate, register, sign up | "Claim" is the shadow-persona-specific term for the conversion from shadow to owned persona. |
