---
type: spec
title: Platform Integrations — Matrix
description: This spec covers everything specific to Matrix that builds on top of the shared architecture.
status: planned
tags: [integrations]
timestamp: 2026-02-23
---

# Platform Integrations — Matrix

> Date: 2026-02-23
> Status: Draft — awaiting review
> Depends on: `00-overview.md`, `01-shared-architecture.md`
> Research: `docs/research/matrix_protocol_integration.md`

This spec covers everything **specific to Matrix** that builds on top of the shared architecture.

---

## 1. What Matrix Adds Beyond the Shared Architecture

The shared architecture (spec 01) gives us Tier 1 (link) for all platforms. Matrix goes further because the protocol supports it:

| Tier | Capability | What it requires |
|------|-----------|-----------------|
| **Tier 1** | Link to Matrix Space on community profile | Shared architecture (done by spec 01) |
| **Tier 2** | Push notifications via Hookshot webhooks | `lib/matrix/webhooks.ts` + webhook URL in config |
| **Tier 3** | Bot commands in Matrix rooms | `matrix-bot-sdk` standalone process (deferred to spec 03) |
| **Tier 4** | Membership sync, activity observation | Matrix Appservice API (future) |

**This spec delivers Tier 2** and the Matrix-specific pieces of Tier 1.

---

## 2. matrix.to URL Parsing

Users share Matrix rooms/spaces as `matrix.to` URLs. We auto-parse these so organizers don't need to know internal Matrix identifiers.

### URL Formats

```
https://matrix.to/#/#room:server              → room alias
https://matrix.to/#/!roomid:server            → room/space ID
https://matrix.to/#/@user:server              → user MXID
https://matrix.to/#/#room:server?via=server1  → with routing hints
```

### Parser Function

**File:** `lib/validations/integrations.ts` (added alongside shared schemas)

```typescript
// ─── matrix.to URL parser ────────────────────────────────────────────
const MATRIX_TO_REGEX = /^https:\/\/matrix\.to\/#\/([#!@][^?]+)(\?.*)?$/;

export function parseMatrixToUrl(url: string): {
  identifier: string;     // #room:server, !id:server, or @user:server
  sigil: '#' | '!' | '@'; // alias, room ID, or user
  localpart: string;      // the part before :server
  homeserver: string;     // server domain
  viaServers: string[];   // ?via= routing hints
} | null {
  const match = url.match(MATRIX_TO_REGEX);
  if (!match) return null;

  const identifier = decodeURIComponent(match[1]);
  const sigil = identifier[0] as '#' | '!' | '@';
  const colonIdx = identifier.indexOf(':');
  if (colonIdx === -1) return null;

  const localpart = identifier.slice(1, colonIdx);
  const homeserver = identifier.slice(colonIdx + 1);

  const viaServers: string[] = [];
  if (match[2]) {
    const params = new URLSearchParams(match[2]);
    params.getAll('via').forEach((v) => viaServers.push(v));
  }

  return { identifier, sigil, localpart, homeserver, viaServers };
}
```

### Matrix-Specific Validation Regexes

```typescript
const matrixIdRegex = /^@[a-zA-Z0-9._=/\-]+:[a-zA-Z0-9.\-]+$/;
const matrixRoomIdRegex = /^![a-zA-Z0-9]+:[a-zA-Z0-9.\-]+$/;
const matrixAliasRegex = /^#[a-zA-Z0-9._=/\-]+:[a-zA-Z0-9.\-]+$/;

export const matrixIdSchema = z.string().regex(matrixIdRegex, 'Invalid Matrix ID (expected @user:server)');
export const matrixRoomIdSchema = z.string().regex(matrixRoomIdRegex, 'Invalid room ID (expected !id:server)');
export const matrixAliasSchema = z.string().regex(matrixAliasRegex, 'Invalid room alias (expected #room:server)');
```

### Connect Matrix Schema (Convenience)

A combined schema that accepts any Matrix input (URL, alias, Space ID), auto-parses, and produces structured data:

```typescript
export const connectMatrixSchema = z
  .object({
    communityId: z.string().uuid(),
    spaceId: z.string().optional(),       // !abc:matrix.org
    roomAlias: z.string().optional(),     // #community:matrix.org
    homeserver: z.string().optional(),    // matrix.org
    inviteUrl: z.string().url().optional(), // https://matrix.to/#/#room:server
    autoSync: z.boolean().default(false),
    syncMembership: z.boolean().default(false),
  })
  .refine(
    (data) => !!(data.spaceId || data.roomAlias || data.inviteUrl),
    { message: 'Provide a Space ID, room alias, or invite URL' },
  )
  .transform((data) => {
    // Auto-parse matrix.to URL into structured fields
    if (data.inviteUrl && !data.roomAlias && !data.spaceId) {
      const parsed = parseMatrixToUrl(data.inviteUrl);
      if (parsed) {
        if (parsed.sigil === '#' && !data.roomAlias) {
          data.roomAlias = parsed.identifier;
        }
        if (parsed.sigil === '!' && !data.spaceId) {
          data.spaceId = parsed.identifier;
        }
        if (!data.homeserver) {
          data.homeserver = parsed.homeserver;
        }
      }
    }
    return data;
  });

export type ConnectMatrixInput = z.infer<typeof connectMatrixSchema>;
```

---

## 3. Connect Matrix Server Action

**File:** `app/actions/integrations.ts` (addition)

A convenience action that creates both the ExternalPlatformLink (Layer 1) and Integration record (Layer 2) in one call:

```typescript
export async function connectMatrix(raw: ConnectMatrixInput) {
  const session = await serverAuth.protect();
  const data = connectMatrixSchema.parse(raw);

  await ensureCommunityAdmin(session.userId, data.communityId);

  // Derive homeserver if not explicitly provided
  let homeserver = data.homeserver;
  if (!homeserver) {
    if (data.spaceId) homeserver = data.spaceId.split(':').slice(1).join(':');
    else if (data.roomAlias) homeserver = data.roomAlias.split(':').slice(1).join(':');
  }

  const spaceId = data.spaceId || null;

  // Layer 1: Add external platform link
  await addExternalPlatform({
    communityId: data.communityId,
    platform: {
      platform: 'matrix',
      label: `Matrix${homeserver ? ` (${homeserver})` : ''}`,
      url: data.inviteUrl,
      spaceId: spaceId || undefined,
      roomAlias: data.roomAlias,
      homeserver,
    },
  });

  // Layer 2: Create integration record
  const [integration] = await db
    .insert(integrations)
    .values({
      communityId: data.communityId,
      platform: 'matrix',
      platformEntityId: spaceId || data.roomAlias || data.inviteUrl || '',
      platformEntityName: data.roomAlias || spaceId,
      config: {
        autoSync: data.autoSync,
        allowPublicSearch: false,
        syncMembership: data.syncMembership,
      },
      status: 'pending',
      installedBy: session.userId,
    })
    .returning();

  return { success: true, integration };
}
```

---

## 4. Matrix ID as a Persona Trait

Members can link their Matrix ID (`@user:server`) to their traits, then selectively publish it on personas.

### Trait Metadata Seed Entry

**File:** `lib/db/seed/trait-metadata.ts` (addition)

```typescript
{
  traitKey: 'matrixId',
  displayName: 'Matrix ID',
  description: 'Your Matrix messaging identity (e.g., @you:matrix.org)',
  category: 'foundations',
  dataType: 'text',
  isArray: false,
  displayConfig: {
    type: 'text',
    icon: 'message-circle',
    prefix: '',
  },
  editConfig: {
    type: 'text_input',
    placeholder: '@you:matrix.org',
    validation: {
      pattern: '^@[a-zA-Z0-9._=/\\-]+:[a-zA-Z0-9.\\-]+$',
      message: 'Must be a valid Matrix ID (@user:server)',
    },
  },
  searchable: true,
  defaultVisibility: 'authenticated',
}
```

This follows the existing metadata-driven rendering pattern. The trait appears in persona edit forms automatically. Visibility is controlled per-persona (public / authenticated / private).

---

## 5. Outbound Webhooks (Tier 2: Notify)

### Architecture

Personus pushes formatted notifications to Matrix rooms via **Hookshot** generic webhooks. This is outbound-only — no bot deployment, no persistent connections, no new dependencies.

**Hookshot** is a Matrix bridge that accepts HTTP POST webhooks and forwards them as messages in Matrix rooms. Community Organizers configure this on their Matrix server, then give Personus the webhook URL.

### Webhook Helper

**File:** `lib/matrix/webhooks.ts`

```typescript
export async function sendMatrixWebhook(
  webhookUrl: string,
  message: { text: string; html?: string },
) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.text,
        html: message.html || message.text,
      }),
    });
    return { success: response.ok, status: response.status };
  } catch (error) {
    // Webhook failures should not block the primary action
    console.error('Matrix webhook failed:', error);
    return { success: false, error: String(error) };
  }
}
```

**Design decision:** Webhook failures are logged but never block the primary action (creating an endorsement, sending a contact request, etc.). Fire-and-forget with error logging.

### Notification Events

Add webhook calls to these existing server actions (only when the community has a Matrix integration with `config.notifyChannel` set):

| Event | Action file | Message |
|-------|-------------|---------|
| New member joins community | `app/actions/communities.ts` | "**Alice Chen** joined the community with skills in Rust, distributed systems" |
| Endorsement given | `app/actions/endorsements.ts` | "**Bob** endorsed **Alice** for API design" |
| Contact request sent | `app/actions/contacts.ts` | "New introduction request in the community" (no names — privacy) |

### Webhook URL Configuration

The webhook URL is stored in `integrations.config.notifyChannel`. The Settings → Connections UI includes an optional "Notification webhook URL" field for Matrix integrations.

**Setup flow for Organizers:**
1. Set up Hookshot on their Matrix homeserver (or use a managed instance)
2. In the Matrix room, create a generic webhook: `!hookshot webhook personus`
3. Hookshot returns a webhook URL
4. Paste the URL into Personus Settings → Connections → Matrix → Configure → Notification webhook

---

## 6. Matrix UI Inputs

The Matrix card in `PlatformConnectionStep` has unique input behavior described here. See `00-overview.md` Section 4.1 for the field table.

### Auto-Parse UX Flow

```
1. User pastes: https://matrix.to/#/#portland-rust:matrix.org
                     ↓ onPaste / onChange
2. parseMatrixToUrl() extracts:
   - roomAlias: "#portland-rust:matrix.org"
   - homeserver: "matrix.org"
                     ↓ auto-populate
3. Fields update:
   - Room alias field shows: #portland-rust:matrix.org  (editable)
   - Homeserver field shows: matrix.org  (editable)
   - URL field retains original URL
                     ↓ user can edit
4. User optionally adds Space ID: !abc123:matrix.org
```

The auto-populated fields are editable — the user can override them if the parser got something wrong (e.g., unusual URL formats).

### "Or enter manually" Collapsible

Below the primary URL input, a collapsible section labeled "or enter manually" shows the Room alias and Space ID fields. This collapses when the URL input is filled (auto-parse handles it), and stays open when empty (for users who know their alias/Space ID directly).

---

## 7. Environment Variables

```env
# Matrix — not required for Phase 1 (webhook-only)
# Required for Phase 2 (bot) and Phase 3+ (appservice)
MATRIX_HOMESERVER_URL=https://matrix.org
MATRIX_BOT_ACCESS_TOKEN=syt_...
MATRIX_BOT_USER_ID=@personus-bot:matrix.org
```

Add to `.env.example` with comments. Phase 1 needs zero Matrix-specific env vars.

---

## 8. Testing

### Unit tests: `lib/validations/integrations.test.ts`

```typescript
describe('parseMatrixToUrl', () => {
  it('parses room alias URL', () => {
    const result = parseMatrixToUrl('https://matrix.to/#/#room:matrix.org');
    expect(result).toEqual({
      identifier: '#room:matrix.org',
      sigil: '#',
      localpart: 'room',
      homeserver: 'matrix.org',
      viaServers: [],
    });
  });

  it('parses space ID URL', () => {
    const result = parseMatrixToUrl('https://matrix.to/#/!abc123:matrix.org');
    expect(result).toEqual({
      identifier: '!abc123:matrix.org',
      sigil: '!',
      localpart: 'abc123',
      homeserver: 'matrix.org',
      viaServers: [],
    });
  });

  it('extracts via servers', () => {
    const result = parseMatrixToUrl('https://matrix.to/#/#room:matrix.org?via=server1.com&via=server2.com');
    expect(result?.viaServers).toEqual(['server1.com', 'server2.com']);
  });

  it('returns null for non-matrix.to URLs', () => {
    expect(parseMatrixToUrl('https://discord.gg/abc')).toBeNull();
    expect(parseMatrixToUrl('not a url')).toBeNull();
  });

  it('handles URL-encoded identifiers', () => {
    const result = parseMatrixToUrl('https://matrix.to/#/%23room%3Amatrix.org');
    expect(result?.identifier).toBe('#room:matrix.org');
  });
});

describe('matrixIdSchema', () => {
  it('accepts valid MXIDs', () => {
    expect(() => matrixIdSchema.parse('@alice:matrix.org')).not.toThrow();
    expect(() => matrixIdSchema.parse('@bob_123:my-server.com')).not.toThrow();
  });

  it('rejects invalid MXIDs', () => {
    expect(() => matrixIdSchema.parse('alice:matrix.org')).toThrow(); // missing @
    expect(() => matrixIdSchema.parse('@alice')).toThrow(); // missing :server
    expect(() => matrixIdSchema.parse('not-a-mxid')).toThrow();
  });
});

describe('connectMatrixSchema', () => {
  it('auto-parses matrix.to URL into alias + homeserver', () => {
    const result = connectMatrixSchema.parse({
      communityId: '00000000-0000-0000-0000-000000000001',
      inviteUrl: 'https://matrix.to/#/#rust:matrix.org',
    });
    expect(result.roomAlias).toBe('#rust:matrix.org');
    expect(result.homeserver).toBe('matrix.org');
  });

  it('requires at least one identifier', () => {
    expect(() => connectMatrixSchema.parse({
      communityId: '00000000-0000-0000-0000-000000000001',
    })).toThrow();
  });
});
```

### Webhook tests: `lib/matrix/webhooks.test.ts`

```typescript
describe('sendMatrixWebhook', () => {
  it('sends formatted message to webhook URL', async () => {
    // Mock fetch
    const result = await sendMatrixWebhook('https://hookshot.example.com/webhook/123', {
      text: 'Alice joined the community',
      html: '<b>Alice</b> joined the community',
    });
    expect(result.success).toBe(true);
  });

  it('does not throw on failure', async () => {
    // Mock fetch to fail
    const result = await sendMatrixWebhook('https://invalid.example.com/404', {
      text: 'test',
    });
    expect(result.success).toBe(false);
  });
});
```

---

## 9. Implementation Checklist (Matrix-Specific Only)

These are additions on top of the shared architecture checklist in spec 01:

- [ ] Add `parseMatrixToUrl()` to `lib/validations/integrations.ts`
- [ ] Add Matrix regex schemas (`matrixIdSchema`, `matrixRoomIdSchema`, `matrixAliasSchema`)
- [ ] Add `connectMatrixSchema` with `.transform()` auto-parse
- [ ] Add `connectMatrix` server action to `app/actions/integrations.ts`
- [ ] Add `matrixId` trait metadata seed entry
- [ ] Create `lib/matrix/webhooks.ts`
- [ ] Add webhook calls to endorsement/contact/community actions (when `notifyChannel` is set)
- [ ] Add Matrix ID env vars to `.env.example` (commented out)
- [ ] Write tests for `parseMatrixToUrl` and `connectMatrixSchema`
- [ ] Re-seed trait metadata
