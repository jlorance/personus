---
type: decision
title: "Authorization: CASL with rbac-with-ownership"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Authorization: CASL with rbac-with-ownership

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Authentication (Clerk) answers "who is this?". Authorization answers "what can they do?". Personus has a rich resource graph (users, traits, personas, shadow personas, contact requests, endorsements, integrations, coach sessions) where most operations are gated by **ownership** — a `User` can only edit their own persona, read their own contact requests, revoke their own integrations — with a second `Admin` role for the control plane. The SPAIDE profile declares `authz.model: rbac-with-ownership`, `engines: [casl]`, `enforcement_layers: [service, route]`, and `principal_pattern: required`.

The baseline also mandates **defense in depth** (`authz-at-service-layer`): every mutation and every read of a sensitive entity must enforce authorization at the service layer, not just the route layer. Service functions take a `principal` parameter — they do not derive `userId` from the request body. The sensitive-entity list is enumerated in CLAUDE.md.

The code already ships `@casl/ability` with `packages/auth/src/abilities.ts` defining abilities from Clerk session data, and `packages/auth/src/permissions.ts` providing multi-step orchestration for complex checks.

## Decision Drivers

1. **Defense in depth** — routes can be bypassed by internal callers, agents, and future MCP tool exposure. Authz must live in the service layer.
2. **Ownership is the primary pattern** — most rules are "actor owns resource". Pure role tables don't express this well.
3. **Composable conditions** — ability rules must compose over resource shape (e.g., "User can read Persona where `Persona.userId = principal.id` AND `Persona.visibility != 'private'` OR `Persona.userId = principal.id`").
4. **AI-agent reuse** — Mastra agents must reuse the same authz checks as human routes (delegated authority). A single source of truth matters.
5. **TypeScript ergonomics** — ability definitions should be type-checked against entity shapes.
6. **404-vs-403 enforcement** — the baseline `sensitive-resource-returns-404` must be implementable without ugly try/catch pyramids.

## Decision

We use **CASL** (`@casl/ability`) as the authorization engine with the `rbac-with-ownership` model. Abilities are defined in `packages/auth/src/abilities.ts` from Clerk session data via `defineAbilitiesFor(principal)`. Multi-step or composite checks use `packages/auth/src/permissions.ts`.

Every service function that touches a sensitive entity **must** accept a `principal` parameter and run a CASL check before the DB operation. Route handlers run the same check as a second line of defense. Unauthorized reads of sensitive entities return 404 (existence-hiding), not 403, per the `sensitive-resource-returns-404` baseline.

CASL satisfies drivers 1–5 fully. Driver 6 is satisfied by wrapping ability failures in a helper that maps `ForbiddenError` → 404 response for sensitive entities.

## Alternatives Considered

### Comparison Matrix

| Driver | CASL (chosen) | Oso | Hand-rolled guards | Postgres RLS |
|---|---|---|---|---|
| Ownership + conditions | Native (`can('read', 'Persona', { userId: principal.id })`) | Native (Polar rules) | Manual | Native (row policies) |
| Service-layer enforcement | Yes | Yes | Yes | DB-layer only |
| Composability | High (rule stacks) | High (Polar) | Low | Medium |
| TypeScript integration | Excellent (generics) | Good | Good | Weak (SQL) |
| AI-agent reuse | Same check in TS | Same check in TS | Same check in TS | Harder (bypass via service role) |
| Learning curve | Low (JS-native) | Medium (Polar DSL) | None | Medium |
| Maturity | High | High | — | High |
| Sensitive-404 mapping | Easy (catch + map) | Easy | Manual | Impossible directly |
| Operational complexity | Low | Medium (policy engine) | Low | High (migrations) |

### CASL (chosen)
Native TypeScript, rule-based with condition support, matches the ownership-first pattern exactly, and composes cleanly with the `principal` parameter. Low operational cost (it's just a library).

### Oso (rejected)
Powerful but introduces Polar — a second language and mental model. The gain over CASL is real for large teams with complex policy hierarchies, but Personus's rules are not complex enough to justify the DSL tax.

### Hand-rolled guards (rejected)
Fast to start, pathological to maintain. Every new resource needs bespoke ownership checks; drift is inevitable. Rejected on maintainability.

### Postgres Row-Level Security (rejected as primary)
Strong defense-in-depth at the DB layer, but doesn't solve the AI-agent reuse problem (agents would need a per-user role or connection). Also hard to express non-row rules (can this principal *create* a resource?). Can be added as a *third* layer later without conflicting with CASL.

## Consequences

### Positive
- Single source of truth for "what can a principal do" in TypeScript.
- Service-layer enforcement means routes, server actions, MCP tools, and Mastra agents all use the same check.
- Condition-based rules naturally express ownership without per-resource guard functions.
- The sensitive-404 pattern is a small helper on top of CASL's `ForbiddenError`.

### Negative
- CASL rules live in code, not in a declarative policy file — policy review requires reading TS.
- Without discipline, ability definitions can sprawl across files. Mitigation: one `defineAbilitiesFor` per role in `abilities.ts`.
- No built-in audit log of authorization decisions; must be layered on.

### Risks
- **Service functions skipping `principal`.** A contributor could add a new service fn that derives `userId` from the request body, bypassing CASL. Mitigation: lint rule or code review; the `audit-security` skill checks this.
- **Ability drift from Clerk role claims.** If Clerk custom claims change, abilities silently break. Mitigation: integration test hitting the real Clerk session shape.

## Implementation

- Abilities: `packages/auth/src/abilities.ts`
- Permissions (composite checks): `packages/auth/src/permissions.ts`
- Principal pattern: every service fn signature is `fn(principal, args)` — no exceptions for sensitive entities.
- Sensitive-404 helper: wrap CASL `ForbiddenError` → 404 response in route handlers.

## References

- `docs/foundation/authorization.md` — authorization model spec
- CLAUDE.md `## SPAIDE Profile` and `authz-at-service-layer`, `sensitive-resource-returns-404` baselines
- Onboarding report `docs/onboarding-2026-04-10.md` — P1 retroactive ADR item
