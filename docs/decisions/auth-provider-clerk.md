---
type: decision
title: "Auth Provider: Clerk with Provider Abstraction"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: shared Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Auth Provider: Clerk with Provider Abstraction

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** shared
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus is a b2c social network where identity is the product. Authentication must support email/password, OAuth (Google, GitHub, LinkedIn), and future passwordless flows, while integrating cleanly with Next.js 16 App Router and Server Actions. The codebase already ships Clerk (`@clerk/nextjs`) wired through a provider-abstraction layer in `packages/auth/src/provider.ts` with a `clerk.ts` implementation and a stub `workos.ts`, selectable via `AUTH_PROVIDER` env var. `proxy.ts` (the Next.js 16 replacement for `middleware.ts`) uses Clerk's middleware.

This ADR is retroactive: it documents the decision already in force so future contributors understand the "why" and know what the exit ramp looks like.

## Decision Drivers

1. **Identity is core product** — auth UX regressions are visible to every user; hosted/prebuilt flows reduce surface area.
2. **Next.js 16 App Router + Server Actions compatibility** — must work with RSC, server actions, and the `proxy.ts` middleware pattern.
3. **Time to market** — building auth in-house would delay every other feature by weeks.
4. **Provider lock-in risk** — identity is where lock-in hurts most; a provider abstraction is non-negotiable so we can migrate if pricing, features, or trust posture changes.
5. **GDPR/CCPA posture** — provider must give us data-subject-rights primitives (export, delete) and a DPA.
6. **Webhook lifecycle events** — must emit user.created / updated / deleted so we can sync to the `users` table.

## Decision

We use **Clerk** as the authentication provider, accessed through a thin in-repo abstraction (`packages/auth/src/provider.ts`) that defines the interface and is implemented by `clerk.ts` (primary) and `workos.ts` (stub, exit ramp).

Clerk satisfies drivers 1–3 and 6 fully, driver 5 acceptably (DPA + export/delete primitives), and driver 4 is mitigated by the abstraction layer — consuming code imports from `@personus/auth`, never `@clerk/nextjs` directly (except inside `clerk.ts` itself and the `ClerkProvider` in root layout).

## Alternatives Considered

### Comparison Matrix

| Driver | Clerk (chosen) | WorkOS | Auth.js (NextAuth) | Build in-house |
|---|---|---|---|---|
| Hosted UX quality | Excellent (prebuilt components) | Good (AuthKit) | DIY | DIY |
| Next.js 16 App Router | First-class, `proxy.ts` support | Good | Good, lags on RSC patterns | N/A |
| Server Actions integration | First-class (`auth()` helper) | Good | Workable | N/A |
| Time to market | Days | Days | Weeks | Months |
| GDPR/CCPA tooling | DPA + export/delete | DPA + enterprise focus | DIY | DIY |
| Webhook lifecycle | Yes | Yes | DIY | DIY |
| Pricing model for b2c scale | Per-MAU, free tier | Per-connection (b2b-leaning) | Free | Infra + staff |
| Exit ramp | Abstraction layer mitigates | Target of the exit ramp | Self-hosted | N/A |
| Maturity | High, large b2c adoption | High, b2b-leaning | High, ecosystem-heavy | — |

### Clerk (chosen)
Best hosted UX in the Next.js ecosystem, explicit App Router + `proxy.ts` support, generous b2c free tier, and prebuilt components remove a large class of auth-UI bugs. The abstraction layer neutralizes the lock-in objection.

### WorkOS (rejected, kept as exit ramp)
Excellent product, but its pricing and feature set are b2b-leaning (SSO, directory sync, SAML). Overkill for a b2c social network at current scale. Kept as the stubbed alternative implementation (`workos.ts`) so migration is a swap, not a rewrite.

### Auth.js / NextAuth (rejected)
Free and flexible, but every UX surface is DIY. For a product where identity *is* the product, the ongoing maintenance cost of bespoke sign-in, account management, and MFA flows is higher than Clerk's per-MAU fee. Also lags behind first-party providers on new Next.js patterns.

### Build in-house (rejected)
Months of work, recurring security burden, and no first-mover advantage in what is a commoditized layer. Rejected on time-to-market and risk grounds.

## Consequences

### Positive
- Auth UX ships with prebuilt, accessible, and localized components out of the box.
- Server Actions and RSC integration are first-class; no workaround code in the route layer.
- Webhook lifecycle events (Clerk → `apps/web/app/api/webhooks/clerk`) give us a single sync point to the `users` table.
- Provider abstraction means the decision is reversible without rewriting feature code.

### Negative
- Per-MAU pricing grows with the user base — at scale we may want to renegotiate or migrate.
- Clerk's data residency options are limited compared to enterprise-focused providers.
- The abstraction layer adds a small indirection tax; it must be maintained as Clerk's API evolves.

### Risks
- **Clerk outage = login outage.** Mitigation: status monitoring, clear incident comms, cached sessions where safe.
- **Webhook handler drift.** `CLERK_WEBHOOK_SECRET` is declared in env but the handler route was not present at the time of this ADR — tracked as a P2 gap in the onboarding report.
- **Abstraction rot.** If contributors import `@clerk/nextjs` directly outside `packages/auth`, the exit ramp degrades. Mitigation: lint rule or code review gate.

## Implementation

- Provider interface: `packages/auth/src/provider.ts`
- Clerk implementation: `packages/auth/src/clerk.ts`
- Exit-ramp stub: `packages/auth/src/workos.ts`
- Middleware: `apps/web/proxy.ts` and `apps/admin/proxy.ts`
- Selector env var: `AUTH_PROVIDER` (default `clerk`)
- Webhook handler: **to be created** at `apps/web/app/api/webhooks/clerk/route.ts` (tracked separately)

## References

- `packages/auth/` — abstraction + implementations
- `docs/foundation/authentication.md` — auth validation spec
- Onboarding report `docs/onboarding-2026-04-10.md` — P1 retroactive ADR item
