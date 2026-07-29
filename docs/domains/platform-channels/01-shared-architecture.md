---
type: spec
title: Platform Integrations — Shared Architecture
description: This spec contains everything that is platform-agnostic — the shared foundation that all platform integrations build on.
status: current
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — Shared Architecture

> **Reconciliation note (2026-07-29):** Sections 1–5 of this spec have been rewritten to match the shipped code. The old `integrations` table and its associated constants (`INTEGRATION_PLATFORMS`, `INTEGRATION_STATUSES`), types (`IntegrationConfig`), and server actions no longer exist. The canonical sources of truth are `packages/constants/src/index.ts`, `packages/db/src/schema/platform-channels.ts`, and `packages/db/src/services/platform-channels.ts`. Sections 6–8 describe future UI, MCP, and testing work that has not yet shipped. Section 9 describes the shipped security model. Section 10 is the implementation checklist: Phase A items are shipped; Phases B–E remain future work.

> Date: 2026-02-23
> Status: Draft — awaiting review
> Depends on: `00-overview.md`
> Implements: Constants, types, schema, validations, server actions, UI components shared across all platforms

This spec contains everything that is **platform-agnostic** — the shared foundation that all platform integrations build on.

---

## 1. Constants

### File: `packages/constants/src/index.ts` (shipped)

The three bot-surface platforms are declared in the shared constants package. "Channel" concepts are deliberately namespaced — see CLAUDE.md.

```typescript
/** PlatformChannels — Mastra `channels` primitive targets (bot surfaces). */
export const PLATFORM_CHANNELS = ['slack', 'discord', 'telegram'] as const;
export type PlatformChannel = (typeof PLATFORM_CHANNELS)[number];
```

**Matrix is not in `PLATFORM_CHANNELS`.** Mastra Channels has no Matrix adapter; Matrix bots run via a separate Appservice process (see `03-bot-architecture.md §5`). Matrix community links are stored as `externalPlatforms` JSONB on the community record but do not create a `platform_channel_bindings` row.

The AI package re-exports the canonical type as `PlatformChannelName`:

```typescript
// packages/ai/src/platform-channels.ts
export type PlatformChannelName = 'slack' | 'discord' | 'telegram';
```

**Binding statuses** (stored as plain `text` in the schema):

```
'pending'   — installed, awaiting first successful message round-trip
'active'    — bot is connected and responding
'revoked'   — community admin revoked the binding (soft-deleted)
```

> Note: `'disconnected'` and `'error'` from the earlier design are not used. A binding is pending, active, or revoked; transient connection errors are not persisted to the binding row.

---

## 2. Types

### Adapter config (shipped)

The shipped schema stores adapter credentials and config in a single opaque `adapterConfig` JSONB column rather than a typed `IntegrationConfig` interface. The shape is whatever the chosen Mastra chat-adapter needs — no schema churn when a new adapter is wired.

The service layer view type for a bound channel is:

```typescript
// packages/db/src/services/platform-channels.ts
export interface BindingView {
  publicId: string;    // pcb_<nanoid17>
  communityId: string; // stringified bigint
  platform: string;    // 'slack' | 'discord' | 'telegram'
  externalRef: string; // platform-native container id
  status: string;      // 'pending' | 'active' | 'revoked'
}
```

### External Platform Link (future — `communities.externalPlatforms` JSONB)

A separate, lighter JSON structure covers platforms that are linked but not bot-enabled (Matrix, WhatsApp, Signal, Bluesky, Instagram, YouTube, Threads, Mastodon, Website). This is future UI work; no schema change is needed — `communities.externalPlatforms` is already a JSONB column.

```typescript
// Proposed shape — not yet enforced by a schema type
export interface ExternalPlatformLink {
  platform: string;        // any of the 13 platform slugs from 00-prd §6
  label?: string;
  url?: string;
  handle?: string;         // @user, @user:server, @user@instance
  description?: string;
  // Matrix-specific
  spaceId?: string; roomId?: string; homeserver?: string; roomAlias?: string;
  // Discord-specific
  guildId?: string; inviteCode?: string;
  // Slack-specific
  workspaceId?: string; channelId?: string;
  // Telegram-specific
  chatId?: string;
  // AT Protocol
  did?: string;
}
```

> `IntegrationConfig` (the old complex type with `autoSync`, `allowPublicSearch`, `matrixBotUserId`, etc.) has been replaced by the opaque `adapterConfig` JSONB. Do not reintroduce the old type.

---

## 3. Database Schema

### File: `packages/db/src/schema/platform-channels.ts` (shipped)

The old `integrations` table is gone. The shipped table is lean: Mastra owns routing / threading / memory, so we only persist the binding + adapter config handle.

```typescript
import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { baseFields } from './_factory';
import { communities } from './communities';

/**
 * PlatformChannelBindings — the lean binding record for the PlatformChannels
 * concept (one of the three de-conflated "channel" ideas; see the founding plan).
 * Replaces the old heavyweight `integrations` table.
 *
 * Mastra's first-class `channels` primitive (@mastra/core ≥1.22) owns webhook
 * routing, threading, dedup, and per-thread memory for Slack / Discord / Telegram
 * bots. We no longer hand-roll that plumbing, so all we need to persist is which
 * community is bound to which platform channel and the minimal install/credential
 * metadata. Mastra owns the rest.
 *
 * public_id `pcb_<nanoid17>`. CASCADE on communityId.
 */
export const platformChannelBindings = pgTable(
  'platform_channel_bindings',
  {
    ...baseFields('pcb'),
    communityId: bigint('community_id', { mode: 'bigint' })
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    // 'slack' | 'discord' | 'telegram' — see PLATFORM_CHANNELS in @personus/constants.
    platform: text('platform').notNull(),
    // Platform-native container id the bot is bound to (Slack channel id,
    // Discord guild/channel id, Telegram chat id). What Mastra's adapter keys on.
    externalRef: text('external_ref').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'revoked'
    // Opaque adapter config / credential handle. Kept as JSONB so the shape can
    // follow whatever the chosen Mastra chat-adapter needs, without schema churn.
    adapterConfig: jsonb('adapter_config').notNull().default(sql`'{}'::jsonb`),
    installedBy: text('installed_by').notNull(), // 'user:<userId>' tag — not a FK
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    // Not a partial index — covers revoked and soft-deleted rows too. Re-binding
    // after revocation works by updating the existing row, not inserting (see §4).
    unique('uq_platform_channel_bindings_platform_ref').on(table.platform, table.externalRef),
    index('idx_platform_channel_bindings_community')
      .on(table.communityId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type PlatformChannelBinding = typeof platformChannelBindings.$inferSelect;
export type NewPlatformChannelBinding = typeof platformChannelBindings.$inferInsert;
```

**Key differences from the old `integrations` design:**

| Old | Shipped |
|-----|---------|
| `uuid` PK | `baseFields('pcb')` — bigint PK + `publicId` (`pcb_<nanoid17>`) + soft-delete fields |
| `platformEntityId` + `platformEntityName` | Single `externalRef` (platform-native container id) |
| `config` JSONB + `accessToken` + `refreshToken` + `botUserId` | Single `adapterConfig` JSONB (opaque) |
| `updatedAt` + `lastSyncAt` + `errorMessage` | `revokedAt` only (baseFields carries `updatedAt`) |
| `installedBy uuid → users.id` (FK) | `installedBy text` — `'user:<userId>'` tag, no FK |
| Status: `pending\|active\|disconnected\|error` | Status: `pending\|active\|revoked` |
| Indexes on `communityId`, `platform`, `status` | Unique on `(platform, externalRef)`; partial index on `communityId` where `deleted_at IS NULL` |
| `'matrix'` in platform list | Matrix not in `PLATFORM_CHANNELS` — no Mastra Channels adapter for Matrix |

---

## 4. Validation Schemas

The shipped service layer (`packages/db/src/services/platform-channels.ts`) validates inputs in TypeScript via function signatures rather than a separate Zod schema file. The key service input shape for binding a channel:

```typescript
// packages/db/src/services/platform-channels.ts — bindPlatformChannel input
{
  communityId: string;           // public community id (stringified bigint)
  platform: 'slack' | 'discord' | 'telegram';
  externalRef: string;           // platform-native container id
  adapterConfig?: Record<string, unknown>; // opaque — whatever the adapter needs
}
```

The service enforces:
- CASL `can('manage', 'PlatformChannel')` ability
- Community admin membership
- Idempotency per `(platform, externalRef)` — a second call re-activates rather than errors
- No stealing a channel that's already `active` for a different community

**External platform links** (for the `communities.externalPlatforms` JSONB — future UI work) will need a Zod schema when that UI ships. The proposed shape is in §2 above. Do not use `INTEGRATION_PLATFORMS`, `INTEGRATION_STATUSES`, `createIntegrationSchema`, or `updateIntegrationSchema` — those constants and types were removed with the `integrations` table.

---

## 5. Service Layer

### File: `packages/db/src/services/platform-channels.ts` (shipped)

The old `app/actions/integrations.ts` server actions do not exist. Binding operations are in the service layer, protected by CASL + community-admin membership (not just `serverAuth`).

```typescript
// packages/db/src/services/platform-channels.ts — key function signatures

/** Bind a community to a platform channel (community admin only). Idempotent per (platform, externalRef). */
export async function bindPlatformChannel(
  principal: ServicePrincipal,
  input: {
    communityId: string;
    platform: 'slack' | 'discord' | 'telegram';
    externalRef: string;
    adapterConfig?: Record<string, unknown>;
  },
): Promise<typeof platformChannelBindings.$inferSelect>

/** List a community's active bindings — visible to members of that community only. */
export async function listPlatformChannels(
  principal: ServicePrincipal,
  communityId: string,
): Promise<BindingView[]>

/** Revoke a binding (community admin only). Sets status='revoked', fills revokedAt, soft-deletes. */
export async function revokePlatformChannel(
  principal: ServicePrincipal,
  bindingPublicId: string,
): Promise<boolean>

/** List ALL active bindings across every community — platform superuser only. */
export async function listAllPlatformChannelBindings(
  principal: ServicePrincipal,
): Promise<BindingView[]>

/** Resolve the community bound to a platform channel (used by the inbound webhook route). */
export async function resolveBoundCommunity(
  platform: string,
  externalRef: string,
): Promise<{ communityId: string } | null>
```

**Auth model:** `bindPlatformChannel` requires BOTH:
1. `principal.ability.can('manage', 'PlatformChannel')` — CASL ability
2. Community admin membership (checked via `memberRole()`)

A platform superuser (`isPlatformAdmin(principal)`) bypasses the membership check for support/moderation.

**Idempotency:** `bindPlatformChannel` is idempotent per `(platform, externalRef)`. A second call re-activates an existing binding rather than inserting a duplicate (the unique constraint on those two columns enforces this at the DB level).

**Revocation:** `revokePlatformChannel` sets `status='revoked'`, fills `revokedAt`, and soft-deletes the row (`deletedAt`). The unique constraint means the channel is free to be bound to another community after revocation (or re-bound to the same one).

**Webhook resolution:** `resolveBoundCommunity(platform, externalRef)` is the entry point for the inbound webhook route. It returns `{ communityId }` for active, non-deleted bindings only.

**Do not use** `createIntegration`, `updateIntegration`, `disconnectIntegration`, or `listIntegrations` — those functions and the `integrations` table they targeted no longer exist.

---

## 6. UI Components

### 6.1 Platform Icons

**File:** `components/platform-icons.tsx`

Reusable icon component for all platform types. Uses simple SVG glyphs for Matrix, Discord, Slack, Bluesky. Falls back to `Link` icon from lucide for unknown platforms.

```typescript
export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  switch (platform) {
    case 'matrix':    return <MatrixIcon className={className} />;
    case 'discord':   return <DiscordIcon className={className} />;
    case 'slack':     return <SlackIcon className={className} />;
    case 'telegram':  return <TelegramIcon className={className} />;
    case 'bluesky':   return <BlueskyIcon className={className} />;
    default:          return <LinkIcon className={className} />;
  }
}
```

### 6.2 Platform Connection Step (Wizard + Settings)

**File:** `components/platform-connection-step.tsx`

Shared between the community creation wizard (Step 3) and Settings → Connections. Renders expandable platform cards with per-platform input forms.

**Component hierarchy:**
```
PlatformConnectionStep
  ├── PlatformCard (Matrix)
  │   └── MatrixInputs (matrix.to URL, alias, Space ID)
  ├── PlatformCard (Discord)
  │   └── DiscordInputs (invite link, server ID)
  ├── PlatformCard (Slack)
  │   └── SlackInputs (workspace URL, workspace ID)
  ├── PlatformCard (Telegram)
  │   └── TelegramInputs (group link, username, group name)
  ├── PlatformCard (Bluesky)
  │   └── BlueskyInputs (handle)
  └── PlatformCard (Website / Other)
      └── WebsiteInputs (URL, label, description)
```

**Props:**
```typescript
interface PlatformConnectionStepProps {
  communityId?: string;           // set when editing existing community
  onSave: (platforms: ExternalPlatformLink[]) => void | Promise<void>;
  onSkip?: () => void;            // only in wizard mode
  existingPlatforms?: ExternalPlatformLink[];  // pre-populate in settings
  mode: 'wizard' | 'settings';
}
```

**Each PlatformCard:**
- Collapsed state: `PlatformIcon` + label + value headline (from `00-overview.md` Section 2.3) + chevron
- Expanded state: Platform-specific input fields + validation feedback
- State: managed via `useReducer` or form library per-card

### 6.3 Community Creation Wizard — Step Insertion

**File:** `app/(dashboard)/communities/new/wizard-client.tsx`

Current wizard steps: **Step 1** (Choose Type) → **Step 2** (Details) → **Step 3** (Success)

New wizard steps: **Step 1** (Choose Type) → **Step 2** (Details) → **Step 3** (Connect Platforms) → **Step 4** (Success)

Step 3 renders `<PlatformConnectionStep mode="wizard" />`.

### 6.4 Settings — Connections Tab

**File:** `app/(dashboard)/settings/integration-settings.tsx`

Shows the organizer's communities with their connected platforms. For communities they own (`foundingUserId = currentUser`), they can add/remove/configure connections.

**Data fetching:** `settings/page.tsx` fetches:
1. User's owned communities (where `foundingUserId = userId`)
2. Each community's `externalPlatforms` JSONB
3. Each community's `platform_channel_bindings` rows

Passes as props to `IntegrationSettings`.

**Layout:** One card per community. Within each card, connected platforms with status + actions.

Add as 4th tab in `settings-tabs.tsx` (icon: `Link2` from lucide).

---

## 7. MCP Extensions

### 7.1 Extend community list response

**File:** `lib/mcp/tools.ts`

`mcpListCommunities()` should include `externalPlatforms` in its response so AI agents can report where communities communicate:

```typescript
// Add to SELECT:
externalPlatforms: communities.externalPlatforms,

// Response shape becomes:
{ id, name, description, type, memberCount, visibility, externalPlatforms }
```

### 7.2 New MCP tool (Phase 2): `personus_community_platforms`

```typescript
{
  name: 'personus_community_platforms',
  description: 'Get external platform connections for a community',
  inputSchema: { communityId: z.string().uuid() },
}
```

Returns the `externalPlatforms` array for a given community.

---

## 8. Testing

### Unit tests
- `lib/validations/integrations.test.ts` — per-platform refinement rules, required field logic

### Integration tests (Playwright)
1. Create community → Step 3 shows all platform cards
2. Expand Matrix card → enter room alias → Save → appears in community profile
3. Skip → community created without platforms
4. Settings → Connections → shows community with connected platform
5. Disconnect → integration removed, toast shown

---

## 9. Security

1. **Community admin check** on all binding mutations — `bindPlatformChannel` and `revokePlatformChannel` require both the CASL `manage PlatformChannel` ability and community-admin membership (`memberRole() === 'admin'`). A platform superuser (`isPlatformAdmin`) bypasses the membership check for support/moderation.
2. **Signature verification required in production** — the webhook route (`/api/channels/[platform]/webhook`) enforces platform signature verification whenever a secret is configured, and in production an unconfigured endpoint is refused rather than left open (a missing secret means all requests fail verification). See `packages/ai/src/platform-verify.ts` for Slack HMAC-SHA256, Discord Ed25519, and Telegram token verification.
3. **Adapter config is opaque JSONB** — `adapterConfig` stores whatever the Mastra chat-adapter needs (tokens, workspace IDs, etc.). It is not encrypted at rest. Bot credentials stored here are a production risk; add a KMS-backed secret-reference seam before storing any production tokens.
4. **Platform identities are member-controlled** — stored as traits with per-persona visibility settings.

---

## 10. Implementation Checklist

Ordered for incremental shippability. Phase A is **shipped**; Phases B–E remain future work.

### Phase A: Constants + Schema + Service layer (shipped ✓)
- [x] `PLATFORM_CHANNELS = ['slack', 'discord', 'telegram']` in `packages/constants/src/index.ts`
- [x] `platform_channel_bindings` table in `packages/db/src/schema/platform-channels.ts`
- [x] Service functions in `packages/db/src/services/platform-channels.ts`
  - `bindPlatformChannel`, `listPlatformChannels`, `revokePlatformChannel`
  - `listAllPlatformChannelBindings`, `resolveBoundCommunity`
- [x] Webhook route `apps/web/app/api/channels/[platform]/webhook/route.ts`
- [x] Signature verification `packages/ai/src/platform-verify.ts` (Slack/Discord/Telegram)
- [x] `handlePlatformMessage` + `resolvePlatformChannels` in `packages/ai/src/platform-channels.ts`

### Phase B: External platform links UI (future)
- [ ] Zod schema for `ExternalPlatformLink` (shape in §2 above; do NOT use `IntegrationConfig`)
- [ ] Server actions for adding/removing `externalPlatforms` JSONB entries
- [ ] `components/platform-icons.tsx`
- [ ] `components/platform-connection-step.tsx`
- [ ] Add Step 3 to community creation wizard
- [ ] `integration-settings.tsx` + Connections tab in settings

### Phase C: MCP extensions (future)
- [ ] Extend `mcpListCommunities` with `externalPlatforms`
