---
type: foundation
title: Authentication — System Overview
description: "Personus uses Clerk today but authentication is not hard-wired to Clerk. A thin provider abstraction sits between the app and the auth provider, defined in packages/auth/src/provider.ts. Switching…"
status: current
tags: [foundation]
timestamp: 2026-04-14
---

# Authentication — System Overview

> 2026-04-14 · Architectural decisions about user authentication. Implementation lives in `packages/auth/` — **the code is truth**.
>
> **Where to find what:**
> - **Auth provider abstraction**: `packages/auth/src/provider.ts` (interface), `packages/auth/src/clerk.ts` (implementation)
> - **Principal resolution**: `packages/auth/src/permissions.ts` — `getPrincipal()` called by every server action
> - **Authorization layer** (who can do what): [`authorization.md`](/foundation/authorization.md)
> - **ADR**: [`../decisions/auth-provider-clerk.md`](/decisions/auth-provider-clerk.md)
> - **Pre-trim implementation detail** (Clerk dashboard steps, DPoP, webhook sync, token encryption): archived at [`_archive/authentication.2026-04-12.md`](/archive/legacy/foundation/_archive/authentication.2026-04-12.md)

## The core decision — auth provider abstraction

Personus uses **Clerk** today but authentication is **not hard-wired** to Clerk. A thin provider abstraction sits between the app and the auth provider, defined in `packages/auth/src/provider.ts`. Switching providers is one env var plus a new adapter implementation — no changes to server actions, route handlers, or feature specs.

**Why abstract:**
1. Clerk is great for shipping fast but may not be right at scale (pricing, data residency, DID support, enterprise SSO flexibility)
2. The project integrates with the AT Protocol ecosystem, which has its own OAuth and identity graph (DIDs). A single auth provider cannot serve both worlds equally well
3. Auth is one of the features most likely to change when enterprise customers arrive with SAML/SCIM requirements

**What the abstraction provides:**
- `Principal` type — the authenticated identity passed to every service-layer function
- `getPrincipal()` — server-side current-user resolution
- `requireAuth()` — redirect/throw if unauthenticated
- `ServerAuth` interface — the contract provider adapters implement

**What it does not provide:**
- UI components (sign-in, sign-up, user button) — those use Clerk's components directly. A provider swap would touch these specific components.
- Webhook handlers — each provider has its own webhook shape; the handler is provider-specific and lives in `apps/web/app/api/webhooks/`.

## The three identity modes

A User can authenticate via different methods, each producing the same `Principal` but with different underlying credentials. This is captured in the `users` table via two fields:

- `clerkUserId` — Clerk's user ID (required for Clerk-backed users; unique)
- `did` — DID (Decentralized Identifier), optional, unique when set — for AT Protocol users

**Mode 1 — Email / password or social login** (the default path)
- Provider: Clerk
- Identity: `clerkUserId`
- User experience: sign up with email, phone, Apple, or Google via Clerk's hosted UI
- Principal resolution: Clerk session cookie → `clerkUserId` → User row

**Mode 2 — AT Protocol / Bluesky OAuth** (planned, partially designed)
- Provider: AT Protocol OAuth 2.1 with DPoP
- Identity: `did` (e.g., `did:plc:abc123...`)
- User experience: "Connect Bluesky" → redirect to user's PDS → OAuth consent → DPoP-signed access token
- Principal resolution: DPoP-signed token → DID → User row (created if missing, linked to existing Clerk user if already signed in)

**Mode 3 — Enterprise SSO** (future, not designed)
- Provider: WorkOS or similar via Clerk (Clerk supports enterprise connections)
- Identity: `clerkUserId` with enterprise connection metadata
- User experience: SAML/OIDC from the customer's IdP
- Principal resolution: same as Mode 1 via Clerk

**Invariant:** a User row can have both `clerkUserId` AND `did`. Linking them is an explicit user action ("Connect Bluesky") after initial authentication. Neither field alone is sufficient — both identify the same User from different provider worldviews.

## Principal resolution

Every request that needs an authenticated identity goes through one function:

```typescript
// packages/auth/src/permissions.ts
async function getPrincipal(): Promise<Principal | null>
```

The function:
1. Reads the Clerk session from request headers (or the DPoP token for AT Proto requests, when that path is implemented)
2. Looks up the User row via `clerkUserId` or `did`
3. Constructs a `Principal` containing the User ID, email, active persona URI (if any), default contact preferences, MCP preferences
4. Returns the Principal or `null` for unauthenticated requests

Every server action starts with:

```typescript
export async function updatePersona(personaUri: string, patch: PersonaPatch) {
  const principal = await getPrincipal();
  if (!principal) throw new UnauthorizedError();
  return personaService.update(principal, personaUri, patch);  // service layer enforces authz
}
```

**Never** derive `userId` from the request body, route params, or query string. The principal parameter is the only trusted source of identity. This is the `authz-at-service-layer` gate in [`principles.md`](/foundation/principles.md).

## Cross-surface authentication

Each of the three API surfaces (see [`api-surface.md`](/foundation/api-surface.md)) has its own authentication path but resolves to the same `Principal`:

| Surface | Auth path | Principal source |
|---|---|---|
| **Server actions** | Clerk session cookie | `clerkUserId` → User row |
| **External MCP endpoint** | API token (future; currently unauthenticated) | Token → User row + tier |
| **GraphQL** (future) | Enterprise API key | Key → tenant → User |

A single user who hits their cost cap via server actions cannot escape by switching to MCP — cost accounting is at the Principal level, not the surface level.

## AT Protocol OAuth — the designed second provider

The pre-trim version of this file contains a detailed design for adding AT Protocol OAuth as a second authentication provider. Key decisions:

1. **DPoP-bound access tokens** — AT Proto mandates demonstrating proof-of-possession; the implementation uses a client-side keypair with rotation
2. **Client ID registration** — Personus registers as an OAuth client with its own `client_id` URL served at `personus.ai/oauth/client-metadata.json`
3. **Scope request** — `atproto transition:generic` minimally; additional scopes for reading public records and publishing `ai.personus.*` lexicon records
4. **Provider abstraction extension** — `ServerAuth` interface gets an optional `getDidFromPrincipal()` method; Clerk implementation returns `undefined`, AT Proto implementation returns the DID
5. **Link-after-sign-in flow** — users sign up via Clerk, then "Connect Bluesky" links the DID to the existing User row (not a separate account)

Full design at [`_archive/authentication.2026-04-12.md`](/archive/legacy/foundation/_archive/authentication.2026-04-12.md) §4 Bluesky / AT Protocol OAuth and §5 Auth Provider Abstraction Updates. When AT Proto auth is prioritized, that design is the starting point.

## What's NOT in this file

- **Clerk dashboard setup steps** — one-time configuration, belongs in an onboarding guide or the `README.md`, not a foundation doc
- **Webhook handler implementation** — code + JSDoc in `apps/web/app/api/webhooks/` (when it exists)
- **Token encryption specifics** — security implementation detail; belongs in a security ADR when written
- **Validation / test plan** — per-feature concern; lives in the Personas feature specs that exercise auth
- **Custom sign-in page implementation** — Clerk's `<SignIn>` component is the current UI; if a custom page is built, the feature spec lives in `docs/specs/personas/` or a new auth suite
- **Who can do what** — that's authorization, not authentication. See [`authorization.md`](/foundation/authorization.md).

## Forward references

| Topic | Where it lives |
|---|---|
| Principal-based authz | [`authorization.md`](/foundation/authorization.md) §Principal pattern |
| User and Principal data shape | [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §User |
| AT Protocol integration (public persona sync, lexicon) | [`at-protocol.md`](/foundation/at-protocol.md) (separate from auth) |
| Enterprise SSO (future) | No spec yet; future work when enterprise customers arrive |
| Sign-in / sign-up UI | Clerk's hosted components; a custom page is future work |

## History

- **2026-02-12** — Original 624-line `11-authentication.md` authored as Clerk + AT Protocol integration validation spec
- **2026-04-12** — Renamed to `authentication.md` during foundation reorganization
- **2026-04-14** — Trimmed to ~130 lines. Clerk dashboard steps, webhook handler details, DPoP specifics, and the validation plan moved to archive. Trimmed file focuses on the auth-provider-abstraction pattern and the three identity modes.
