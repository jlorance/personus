---
type: foundation
title: Authentication Validation Specification
description: "This document specifies the early validation of Personus's authentication plumbing across all planned identity methods. The goal is to prove — before building further features — that our user…"
status: superseded
tags: [archived]
timestamp: 2026-02-12
---

# Authentication Validation Specification

> Status: v1
> Date: 2026-02-12
> Depends on: 09-authorization.md, 10-atmosphere.md

## Purpose

This document specifies the early validation of Personus's authentication plumbing across all planned identity methods. The goal is to prove — before building further features — that our user model, auth provider abstraction, and database schema cleanly support:

1. **Phone number** (SMS confirmation) via Clerk
2. **Apple Sign-In** via Clerk
3. **Google Sign-In** via Clerk
4. **Bluesky / AT Protocol OAuth** (custom integration alongside Clerk)

Validating this now prevents costly rework later when AT Protocol integration becomes a priority.

---

## 1. Current State

### 1.1 What Exists

| Component                 | Status                            | Location                                                                              |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| Clerk integration         | Working                           | `@clerk/nextjs` v6.37.3                                                               |
| Auth provider abstraction | Complete                          | `lib/auth/provider.ts` (interface), `lib/auth/clerk.ts` (implementation)              |
| Route protection          | Working                           | `proxy.ts` — protects /dashboard, /personas, /groups, /settings, /coach, /inbox       |
| Users table               | Has `clerkUserId` + `did`         | `lib/db/schema/users.ts`                                                              |
| ClerkProvider             | Conditional (builds without keys) | `app/layout.tsx`                                                                      |
| Sign-in UI                | Clerk hosted pages                | No custom sign-in routes                                                              |
| Webhook handling          | Implemented (has a bug)           | `lib/auth/clerk.ts` — Svix signature verification passes same value for all 3 headers |

### 1.2 What's Missing

| Gap                               | Impact                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| Phone auth not enabled in Clerk   | Can't sign up via SMS                                           |
| Apple/Google OAuth not configured | Only email/password available                                   |
| No `phone` field on users table   | Can't store verified phone for non-Clerk contexts               |
| No `authMethods` tracking         | Can't know which methods a user has connected                   |
| No Bluesky OAuth flow             | No AT Protocol identity linking                                 |
| No "Connect Bluesky" UI           | No way for users to link DIDs                                   |
| Webhook signature bug             | Verification passes same header value 3 times                   |
| No custom sign-in page            | Using Clerk's default; can't customize auth method presentation |

---

## 2. User Model Updates

### 2.1 Schema Changes

Add fields to the `users` table to track authentication methods and Bluesky identity:

```typescript
// lib/db/schema/users.ts — additions to users table

// AT Protocol identity (already exists)
did: text('did').unique(),

// New fields
phone: text('phone'),                              // Verified phone number (E.164 format)
atprotoHandle: text('atproto_handle'),              // e.g., 'alice.bsky.social'
atprotoTokens: jsonb('atproto_tokens'),             // Encrypted OAuth tokens for AT Protocol
authMethods: text('auth_methods').array()            // ['clerk:phone', 'clerk:google', 'clerk:apple', 'atproto']
  .notNull()
  .default(sql`ARRAY[]::text[]`),
```

**Field details:**

| Field           | Type   | Purpose                  | Notes                                                                  |
| --------------- | ------ | ------------------------ | ---------------------------------------------------------------------- |
| `phone`         | text   | Verified phone (E.164)   | Synced from Clerk on verification; nullable                            |
| `atprotoHandle` | text   | Bluesky handle           | Resolved from DID; display purposes                                    |
| `atprotoTokens` | jsonb  | AT Protocol OAuth tokens | Encrypted at rest; `{ accessToken, refreshToken, dpopKey, expiresAt }` |
| `authMethods`   | text[] | Connected auth methods   | Tracks which providers user has used; audit trail                      |

### 2.2 Why Track `authMethods`?

- **UX:** Settings page shows "Connected accounts" with connect/disconnect options
- **Security:** Prevent users from disconnecting their last auth method
- **Analytics:** Understand which onboarding paths users prefer
- **AT Protocol:** Know if a user has linked their DID (to show/hide Bluesky features)

### 2.3 Token Encryption

AT Protocol OAuth tokens stored in `atprotoTokens` must be encrypted at rest. Use a server-side encryption key (`ATPROTO_TOKEN_ENCRYPTION_KEY` env var) with AES-256-GCM:

```typescript
// lib/auth/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ATPROTO_TOKEN_ENCRYPTION_KEY!, 'hex');

export function encryptTokens(tokens: object): string {
  /* ... */
}
export function decryptTokens(encrypted: string): object {
  /* ... */
}
```

---

## 3. Clerk Configuration

### 3.1 Authentication Methods

Clerk supports all three target methods (phone, Apple, Google) via dashboard configuration. No code changes are needed to _enable_ them — Clerk's `<SignIn />` component automatically renders available methods.

**Clerk Dashboard settings required:**

| Method      | Clerk Setting                 | Notes                                                                 |
| ----------- | ----------------------------- | --------------------------------------------------------------------- |
| Phone (SMS) | Authentication → Phone number | Enable SMS verification; set as primary or secondary identifier       |
| Apple       | Social Connections → Apple    | Requires Apple Developer account; configure Services ID + private key |
| Google      | Social Connections → Google   | Configure OAuth consent screen in Google Cloud Console                |

### 3.2 Clerk Dashboard Configuration Steps

#### Phone Number Authentication

1. Clerk Dashboard → User & Authentication → Email, Phone, Username
2. Enable "Phone number" as a sign-up/sign-in option
3. Choose: primary identifier, or secondary (alongside email)
4. Enable SMS verification (Clerk handles OTP delivery)
5. Optionally enable "Phone number as username" for phone-first flow

#### Apple Sign-In

1. Clerk Dashboard → User & Authentication → Social Connections → Apple
2. In Apple Developer Portal:
   - Create a Services ID (e.g., `ai.personus.auth`)
   - Register the return URL from Clerk's Apple configuration page
   - Generate a private key for Sign in with Apple
3. Enter in Clerk: Services ID, Team ID, Key ID, Private Key

#### Google Sign-In

1. Clerk Dashboard → User & Authentication → Social Connections → Google
2. In Google Cloud Console:
   - Create OAuth 2.0 Client ID (Web application type)
   - Add Clerk's redirect URI to Authorized redirect URIs
3. Enter in Clerk: Client ID, Client Secret

### 3.3 Custom Sign-In Page (Recommended)

Replace Clerk's hosted sign-in with an embedded component for better UX control:

```
app/(auth)/sign-in/[[...sign-in]]/page.tsx    — Custom sign-in route
app/(auth)/sign-up/[[...sign-up]]/page.tsx    — Custom sign-up route
```

```typescript
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-none border border-border',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
```

**Environment variables for custom routes:**

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 3.4 Webhook Sync

When a user signs up via any Clerk method, sync to our users table via webhook:

```typescript
// Webhook event: user.created
// Extract: clerkUserId, email, phone, authMethod
// Insert into users table with appropriate authMethods array entry
```

**Bug fix needed:** `lib/auth/clerk.ts` lines ~218-230 — the webhook verification currently passes the same `signature` value for all three Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`). Each header should receive its corresponding value from the request headers.

---

## 4. Bluesky / AT Protocol OAuth

### 4.1 How It Differs from Clerk Auth

Bluesky OAuth is **not a replacement** for Clerk. It's an additive identity link:

| Aspect             | Clerk                           | Bluesky OAuth                          |
| ------------------ | ------------------------------- | -------------------------------------- |
| Purpose            | Authentication ("who is this?") | Identity linking ("what's their DID?") |
| When               | Sign-up / sign-in               | Post-auth, in Settings                 |
| Required           | Yes                             | No (optional)                          |
| Session management | Clerk manages                   | Personus manages tokens                |
| User creation      | Creates user in DB              | Updates existing user with DID         |

Flow: User signs up with Clerk (phone/Apple/Google) → Uses the app → Optionally links Bluesky identity in Settings.

### 4.2 AT Protocol OAuth Flow

AT Protocol OAuth uses a PDS-based authorization model. The user's PDS acts as the authorization server.

```
1. User enters handle (e.g., "alice.bsky.social")
          │
2. Resolve handle → DID → DID Document → PDS endpoint
          │
3. Fetch PDS authorization server metadata
   GET {pds}/.well-known/oauth-authorization-server
          │
4. Push Authorization Request (PAR) to PDS
   POST {pds}/oauth/par
   Body: { client_id, redirect_uri, scope, code_challenge, ... }
          │
5. Redirect user to PDS authorization page
   {pds}/oauth/authorize?request_uri={from PAR}&client_id={...}
          │
6. User approves on PDS
          │
7. PDS redirects back to Personus with auth code
          │
8. Exchange code for tokens
   POST {pds}/oauth/token
   Body: { grant_type: 'authorization_code', code, redirect_uri, code_verifier }
          │
9. Store tokens + DID in users table
```

### 4.3 Client ID Registration

AT Protocol OAuth does not require a central developer dashboard. Instead, apps host a **Client ID Metadata Document** at a public URL:

```json
// https://personus.ai/.well-known/oauth-client-metadata
// OR: https://personus.ai/oauth/client-metadata.json
{
  "client_id": "https://personus.ai/oauth/client-metadata.json",
  "client_name": "Personus",
  "client_uri": "https://personus.ai",
  "logo_uri": "https://personus.ai/logo.png",
  "tos_uri": "https://personus.ai/terms",
  "policy_uri": "https://personus.ai/privacy",
  "redirect_uris": ["https://personus.ai/api/auth/atproto/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

**Key detail:** `dpop_bound_access_tokens: true` — AT Protocol OAuth requires DPoP (Demonstration of Proof-of-Possession). The client generates a key pair and includes a DPoP proof header with each token request and API call. This prevents token theft/replay.

### 4.4 Scopes

Request the minimum scopes needed:

```
atproto                    — Basic AT Protocol access
transition:generic         — Transition scope (required during OAuth preview)
```

For later phases (writing persona records to repos), request:

```
repo:ai.personus.*         — Read/write Personus collections in user's repo
```

### 4.5 Implementation: Key Files

```
lib/auth/atproto.ts                          — AT Protocol OAuth client
  ├── resolveIdentity(handle) → { did, pds }
  ├── startAuth(pds) → { authUrl, state, codeVerifier, dpopKey }
  ├── handleCallback(code, state) → { did, handle, tokens }
  ├── refreshTokens(did) → { tokens }
  └── revokeTokens(did) → void

app/api/auth/atproto/route.ts                — Initiate OAuth flow (redirect)
app/api/auth/atproto/callback/route.ts       — Handle OAuth callback
app/api/.well-known/oauth-client-metadata/route.ts  — Client metadata endpoint

app/(dashboard)/settings/connections/page.tsx — "Connect Bluesky" UI
```

### 4.6 DPoP Implementation

AT Protocol OAuth requires DPoP (RFC 9449). Each request includes a proof JWT:

```typescript
// lib/auth/dpop.ts
import { SignJWT, generateKeyPair } from 'jose';

export async function createDPoPKeyPair() {
  return await generateKeyPair('ES256');
}

export async function createDPoPProof(
  privateKey: CryptoKey,
  method: string,
  url: string,
  accessToken?: string,
): Promise<string> {
  const builder = new SignJWT({
    htm: method,
    htu: url,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    ...(accessToken ? { ath: await sha256base64url(accessToken) } : {}),
  }).setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: await exportPublicKey(privateKey) });

  return await builder.sign(privateKey);
}
```

The DPoP private key must be stored alongside tokens in `atprotoTokens` (serialized JWK, encrypted).

### 4.7 Packages Needed

```bash
bun add @atproto/oauth-client-node @atproto/api jose
```

| Package                      | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `@atproto/oauth-client-node` | Official AT Protocol OAuth client for Node.js               |
| `@atproto/api`               | AT Protocol API client (handle resolution, repo operations) |
| `jose`                       | JWT/JWK operations for DPoP proofs                          |

**Note:** The official `@atproto/oauth-client-node` handles much of the DPoP complexity internally. Evaluate whether it meets our needs before implementing custom DPoP logic.

---

## 5. Auth Provider Abstraction Updates

### 5.1 Current Architecture

```
lib/auth/provider.ts    → AuthProvider interface
lib/auth/clerk.ts       → Clerk implementation
lib/auth/workos.ts      → WorkOS stub (future)
lib/auth/index.ts       → Factory + exports
```

### 5.2 How Bluesky OAuth Fits

Bluesky OAuth is **not** a replacement for the AuthProvider — it's a supplementary identity link. The architecture becomes:

```
Primary Auth (Clerk)                    Linked Identity (AT Protocol)
├── Phone + SMS verification            ├── DID
├── Apple Sign-In                       ├── Handle
├── Google Sign-In                      ├── OAuth tokens
└── Email + Password                    └── Repo access

     lib/auth/clerk.ts                       lib/auth/atproto.ts
     (AuthProvider implementation)           (Identity link, not AuthProvider)
```

**Clerk owns the session.** AT Protocol tokens are stored server-side and used for background operations (writing persona records to repos, reading social graph).

### 5.3 `ServerAuth` Extension

Update the `ServerAuth` interface to expose linked identity:

```typescript
// lib/auth/provider.ts — additions to ServerAuth
export interface ServerAuth {
  userId(): Promise<string | null>;
  user(): Promise<User | null>;
  protect(): Promise<void>;
  orgId(): Promise<string | null>;

  // New: linked identity
  linkedDid(): Promise<string | null>;
  hasLinkedBluesky(): Promise<boolean>;
}
```

Implementation reads from the users table (`did` field) for the current Clerk session user.

---

## 6. "Connect Bluesky" UI

### 6.1 Location

Settings → Connections (new settings sub-page).

### 6.2 User Flow

```
Settings → Connections
    │
    ├── Connected Accounts
    │   ├── Phone: +1 (555) 123-4567 ✓ (managed by Clerk)
    │   ├── Google: alice@gmail.com ✓ (managed by Clerk)
    │   └── Apple: Connected ✓ (managed by Clerk)
    │
    └── Linked Identities
        └── Bluesky: [Connect Bluesky] button
                │
                ├── Click → Enter handle → OAuth redirect to PDS → Approve → Callback
                │
                └── After linking:
                    ├── Shows: @alice.bsky.social ✓
                    ├── Option: Import Bluesky profile (name, avatar) as seed data
                    ├── Option: Import social graph (for endorsement suggestions)
                    └── [Disconnect] button
```

### 6.3 Post-Link Import Options

After linking Bluesky, offer optional imports:

| Import         | What It Does                                  | Implementation                         |
| -------------- | --------------------------------------------- | -------------------------------------- |
| Profile seed   | Copy Bluesky displayName + avatar to Personus | Read `app.bsky.actor.profile` from PDS |
| Social graph   | Import follows as endorsement candidates      | Read `app.bsky.graph.follow` records   |
| Handle display | Show `@handle.bsky.social` on persona cards   | Store in `atprotoHandle` field         |

All imports are opt-in with clear explanations.

---

## 7. Validation Plan

### 7.1 What "Validated" Means

The auth plumbing is validated when:

1. A new user can sign up via phone number (SMS OTP), complete the flow, and land on the dashboard
2. A new user can sign up via Apple Sign-In, complete the flow, and land on the dashboard
3. A new user can sign up via Google Sign-In, complete the flow, and land on the dashboard
4. An existing user can go to Settings → Connections and link their Bluesky account
5. After linking, the user's DID and handle are stored in the users table
6. The `authMethods` array correctly reflects which methods the user has connected
7. Protected routes remain protected; unauthenticated users are redirected
8. Webhook sync correctly creates/updates users table rows for all Clerk auth methods

### 7.2 Implementation Sequence

```
Step 1: Schema migration
  ├── Add phone, atprotoHandle, atprotoTokens, authMethods to users table
  └── Run db:push

Step 2: Fix webhook bug
  └── Correct Svix header mapping in lib/auth/clerk.ts

Step 3: Enable Clerk auth methods
  ├── Configure Phone in Clerk Dashboard
  ├── Configure Apple in Clerk Dashboard
  ├── Configure Google in Clerk Dashboard
  └── Add custom sign-in/sign-up pages

Step 4: Update webhook handler
  ├── Sync phone number from Clerk user.created / user.updated events
  ├── Track auth method in authMethods array
  └── Handle phone/OAuth-specific webhook events

Step 5: Implement Bluesky OAuth
  ├── Create lib/auth/atproto.ts (OAuth client)
  ├── Create lib/auth/dpop.ts (DPoP proof generation)
  ├── Create lib/auth/crypto.ts (token encryption)
  ├── Create API routes (initiate, callback, client-metadata)
  ├── Create Settings → Connections page
  └── Wire up DID + handle storage

Step 6: End-to-end validation
  ├── Manual test: phone sign-up flow
  ├── Manual test: Apple sign-up flow
  ├── Manual test: Google sign-up flow
  ├── Manual test: Bluesky link flow
  ├── Verify users table state after each flow
  └── Verify protected route behavior
```

### 7.3 Environment Variables (New)

```bash
# Custom sign-in routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# AT Protocol OAuth (for Bluesky linking)
ATPROTO_TOKEN_ENCRYPTION_KEY=<64-char hex string>  # openssl rand -hex 32

# Apple Sign-In (configured in Clerk Dashboard, listed here for reference)
# No app-level env vars needed — Clerk handles Apple OAuth internally

# Google Sign-In (configured in Clerk Dashboard, listed here for reference)
# No app-level env vars needed — Clerk handles Google OAuth internally
```

---

## 8. Security Considerations

### 8.1 Token Storage

| Token Type                | Storage                       | Encryption          | Lifetime                        |
| ------------------------- | ----------------------------- | ------------------- | ------------------------------- |
| Clerk session             | Clerk-managed cookie          | Clerk handles       | Configurable in Clerk Dashboard |
| AT Protocol access token  | `users.atprotoTokens` (JSONB) | AES-256-GCM at rest | Short-lived (varies by PDS)     |
| AT Protocol refresh token | `users.atprotoTokens` (JSONB) | AES-256-GCM at rest | Long-lived                      |
| DPoP private key          | `users.atprotoTokens` (JSONB) | AES-256-GCM at rest | Rotated with token refresh      |

### 8.2 Auth Method Disconnection

Prevent users from disconnecting their last authentication method:

```typescript
// Before allowing disconnect
const methods = user.authMethods;
if (methods.length <= 1) {
  throw new Error('Cannot disconnect your only authentication method');
}
```

### 8.3 DID Verification

When linking a Bluesky account, verify the DID is legitimate:

1. Resolve the handle to a DID
2. Resolve the DID to a DID Document
3. Verify the DID Document claims the handle (bidirectional verification)
4. Complete OAuth flow against the PDS listed in the DID Document
5. Store the verified DID

A user cannot claim a DID they don't control because the OAuth flow authenticates against the DID's PDS.

### 8.4 Phone Number Verification

Clerk handles SMS OTP delivery and verification. Personus stores the verified phone number after Clerk confirms it. The phone number in our `users` table is always Clerk-verified — never user-input.

---

## 9. Testing Strategy

No test framework is configured yet. For this validation sprint, use manual testing with a checklist:

### 9.1 Manual Test Matrix

| #   | Scenario                   | Auth Method       | Expected Result                                         |
| --- | -------------------------- | ----------------- | ------------------------------------------------------- |
| 1   | New user sign-up           | Phone (SMS)       | OTP sent, verified, user created in Clerk + users table |
| 2   | New user sign-up           | Apple             | Apple auth popup, user created in Clerk + users table   |
| 3   | New user sign-up           | Google            | Google auth popup, user created in Clerk + users table  |
| 4   | Existing user sign-in      | Phone             | OTP sent, verified, session created                     |
| 5   | Existing user sign-in      | Apple             | Apple auth, session created                             |
| 6   | Existing user sign-in      | Google            | Google auth, session created                            |
| 7   | Link Bluesky               | AT Protocol OAuth | Handle entered, OAuth flow, DID stored in users table   |
| 8   | Unlink Bluesky             | Settings          | DID + tokens removed from users table                   |
| 9   | Protected route (unauthed) | None              | Redirect to sign-in                                     |
| 10  | Protected route (authed)   | Any               | Page renders normally                                   |
| 11  | Webhook: user.created      | Any               | Row created in users table with correct authMethods     |
| 12  | Webhook: user.updated      | Phone added       | Phone number + authMethods updated                      |
| 13  | Disconnect last method     | Any               | Blocked with error message                              |

### 9.2 Database Verification Queries

```sql
-- After phone sign-up
SELECT id, clerk_user_id, email, phone, auth_methods FROM users
WHERE clerk_user_id = 'user_xxx';
-- Expected: phone set, auth_methods includes 'clerk:phone'

-- After Bluesky link
SELECT id, did, atproto_handle, auth_methods FROM users
WHERE clerk_user_id = 'user_xxx';
-- Expected: did set, atproto_handle set, auth_methods includes 'atproto'
```

---

## 10. Open Questions

1. **Phone as primary identifier?** Should phone number be a primary sign-up method (replacing email), or secondary? Recommendation: offer both, let user choose.

2. **Bluesky-first sign-up?** Should users be able to sign up with _only_ their Bluesky identity (no Clerk at all)? This would require AT Protocol as a primary auth provider, not just an identity link. Recommendation: defer — Clerk-first is simpler and Bluesky OAuth is still in Developer Preview.

3. **Multiple Bluesky accounts?** Can a user link more than one DID? The current schema assumes one `did` per user. Recommendation: one DID per user for now; multiple DIDs could map to the multi-persona model later.

4. **Token refresh strategy?** AT Protocol access tokens are short-lived. Should we refresh proactively (background job) or lazily (on next API call)? Recommendation: lazy refresh — only needed when we actually write to repos in Phase C.

---

## References

- [Clerk Phone Authentication Docs](https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options#phone-numbers)
- [Clerk Social Connections (Apple)](https://clerk.com/docs/authentication/social-connections/apple)
- [Clerk Social Connections (Google)](https://clerk.com/docs/authentication/social-connections/google)
- [AT Protocol OAuth Specification](https://atproto.com/specs/oauth)
- [AT Protocol OAuth Guide](https://atproto.com/guides/oauth)
- [@atproto/oauth-client-node (npm)](https://www.npmjs.com/package/@atproto/oauth-client-node)
- [DPoP RFC 9449](https://www.rfc-editor.org/rfc/rfc9449)
- [Statusphere Example App (OAuth reference)](https://github.com/bluesky-social/statusphere-example-app)
- Personus Doc 07: AT Protocol Design Specification
- Personus Doc 09: Authorization and Permissions
- Personus Doc 10: Atmosphere Landscape and Opportunity
