---
type: spec
title: Platform Integrations — Shared Architecture
description: This spec contains everything that is platform-agnostic — the shared foundation that all platform integrations build on.
status: current
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — Shared Architecture

> **Reconciliation note (2026-07-24):** The shipped build replaced the heavyweight `integrations` table with the lean `platform_channel_bindings` table (community_id, platform, external ref, installed_by, status, tokens). Mastra's first-class Channels own routing / threading / memory. `integrations`-table references below have been renamed; some surrounding prose still describes the pre-reconciliation design and is superseded by `packages/db/src/schema/platform-channels.ts`.

> Date: 2026-02-23
> Status: Draft — awaiting review
> Depends on: `00-overview.md`
> Implements: Constants, types, schema, validations, server actions, UI components shared across all platforms

This spec contains everything that is **platform-agnostic** — the shared foundation that all platform integrations build on.

---

## 1. Constants

### File: `lib/constants.ts`

```typescript
// ─── Integration Platforms (platforms with operational integrations) ──
export const INTEGRATION_PLATFORMS = ['slack', 'discord', 'matrix', 'telegram'] as const;
export type IntegrationPlatform = (typeof INTEGRATION_PLATFORMS)[number];

export const INTEGRATION_PLATFORM_LABELS: Record<IntegrationPlatform, string> = {
  slack: 'Slack',
  discord: 'Discord',
  matrix: 'Matrix / Element',
  telegram: 'Telegram',
};

// ─── Integration Statuses ────────────────────────────────────────────
export const INTEGRATION_STATUSES = ['pending', 'active', 'disconnected', 'error'] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

// ─── External Platform Types (all linkable platforms) ────────────────
export const EXTERNAL_PLATFORM_TYPES = [
  // Communication
  'matrix', 'discord', 'slack', 'telegram', 'whatsapp', 'signal',
  // Social / Public
  'bluesky', 'instagram', 'youtube', 'threads', 'mastodon',
  // Web
  'website', 'other',
] as const;
export type ExternalPlatformType = (typeof EXTERNAL_PLATFORM_TYPES)[number];

export const EXTERNAL_PLATFORM_LABELS: Record<ExternalPlatformType, string> = {
  matrix: 'Matrix / Element',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  bluesky: 'Bluesky',
  instagram: 'Instagram',
  youtube: 'YouTube',
  threads: 'Threads',
  mastodon: 'Mastodon',
  telegram: 'Telegram',
  website: 'Website',
  other: 'Other',
};
```

Also fix the stale `COMMUNITY_TYPES` constant to match the 9 seed slugs:

```typescript
// REPLACE the existing COMMUNITY_TYPES
export const COMMUNITY_TYPES = [
  'club', 'organization', 'friends', 'guild', 'workplace',
  'customer', 'neighborhood', 'event', 'educational',
] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];
```

---

## 2. Types

### File: `types/index.ts` (additions)

```typescript
import type { ExternalPlatformType } from '@/lib/constants';

// ─── External Platform Link (stored in communities.externalPlatforms JSONB) ─
// Generic enough for all 12 platform types. Platform-specific fields are optional;
// only the relevant ones are populated per platform.
export interface ExternalPlatformLink {
  platform: ExternalPlatformType;
  label?: string;              // user-facing name, e.g. "Our Matrix Space"
  url?: string;                // public link (joinable URL, profile URL, invite URL)
  handle?: string;             // username/handle (@user, @user:server, @user@instance)
  description?: string;        // free text description

  // Matrix-specific
  spaceId?: string;            // Matrix Space room ID (!...:server)
  roomId?: string;             // Matrix room ID (!...:server)
  homeserver?: string;         // homeserver domain (matrix.org, etc.)
  roomAlias?: string;          // human-readable alias (#room:server)

  // Discord-specific
  guildId?: string;            // Discord guild/server ID
  inviteCode?: string;         // Discord invite code

  // Slack-specific
  workspaceId?: string;        // Slack workspace ID (T...)
  channelId?: string;          // Slack channel ID (C...)

  // Telegram-specific
  chatId?: string;             // Supergroup ID (negative number, stored as string)

  // AT Protocol (Bluesky, future)
  did?: string;                // did:plc:...
}

// ─── Integration Config (stored in integrations.config JSONB) ───────
export interface IntegrationConfig {
  // Shared across all platforms
  autoSync: boolean;           // auto-sync membership changes
  allowPublicSearch: boolean;  // allow non-members to search via bot
  notifyChannel?: string;      // channel/room for bot notifications (webhook URL for Hookshot)

  // Matrix-specific
  matrixBotUserId?: string;    // @personus-bot:server MXID after join
  monitoredRoomIds?: string[]; // specific rooms to observe (default: all in Space)
  syncMembership?: boolean;    // sync Matrix room members to Personus community

  // Slack-specific
  slackTeamName?: string;

  // Discord-specific
  discordGuildName?: string;

  // Telegram-specific
  telegramChatId?: number;         // Supergroup ID (negative number)
  telegramBotIsAdmin?: boolean;    // Whether bot has admin privileges
  telegramTopicsEnabled?: boolean; // Whether group has Topics
  telegramPersonusTopicId?: number; // Dedicated Personus topic ID
}
```

---

## 3. Database Schema

### File: `lib/db/schema/integrations.ts` (refactor)

The current table has platform-specific columns (`slackWorkspaceId`, `discordGuildId`). Refactor to a generic model with `platformEntityId` + `config` JSONB.

```typescript
import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { users } from './users';

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .references(() => communities.id)
      .notNull(),
    platform: text('platform').notNull(),          // 'slack' | 'discord' | 'matrix'
    status: text('status').notNull().default('pending'), // pending | active | disconnected | error
    platformEntityId: text('platform_entity_id'),  // primary platform identifier
    //   Slack: workspace ID (T...)
    //   Discord: guild ID
    //   Matrix: Space room ID (!...:server) or room alias
    platformEntityName: text('platform_entity_name'), // human-readable name
    config: jsonb('config').notNull().default('{}'),   // IntegrationConfig
    accessToken: text('access_token'),             // encrypted at rest (TODO: implement encryption)
    refreshToken: text('refresh_token'),
    botUserId: text('bot_user_id'),                // platform-specific bot identity
    //   Slack: bot user ID (U...)
    //   Discord: bot user ID
    //   Matrix: bot MXID (@personus-bot:server)
    installedBy: uuid('installed_by')
      .references(() => users.id)
      .notNull(),
    installedAt: timestamp('installed_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastSyncAt: timestamp('last_sync_at'),         // last successful membership/activity sync
    errorMessage: text('error_message'),           // populated when status = 'error'
  },
  (table) => [
    index('idx_integrations_community').on(table.communityId),
    index('idx_integrations_platform').on(table.platform),
    index('idx_integrations_status').on(table.status),
  ],
);

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
```

**Also remove** from this file (if present): `queryLogs` table. Verify it's re-homed or still needed.

**Migration:** `bun run db:push` (pre-production, no data to preserve).

---

## 4. Validation Schemas

### File: `lib/validations/integrations.ts` (new)

```typescript
import { z } from 'zod';
import { EXTERNAL_PLATFORM_TYPES, INTEGRATION_PLATFORMS, INTEGRATION_STATUSES } from '@/lib/constants';

// ─── External Platform Link ─────────────────────────────────────────
export const externalPlatformLinkSchema = z
  .object({
    platform: z.enum(EXTERNAL_PLATFORM_TYPES),
    label: z.string().max(100).optional(),
    url: z.string().url().optional(),
    // Slack
    workspaceId: z.string().optional(),
    channelId: z.string().optional(),
    // Discord
    guildId: z.string().optional(),
    inviteCode: z.string().optional(),
    // Matrix
    spaceId: z.string().optional(),
    roomId: z.string().optional(),
    homeserver: z.string().optional(),
    roomAlias: z.string().optional(),
    // Telegram
    chatId: z.string().optional(),
    // AT Protocol
    handle: z.string().optional(),
    did: z.string().optional(),
    // Generic
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // Each platform should have at least one meaningful identifier
      switch (data.platform) {
        case 'matrix':
          return !!(data.spaceId || data.roomId || data.roomAlias || data.url);
        case 'discord':
          return !!(data.guildId || data.inviteCode || data.url);
        case 'slack':
          return !!(data.workspaceId || data.url);
        case 'telegram':
          return !!(data.handle || data.url || data.chatId);
        case 'whatsapp':
        case 'signal':
          return !!data.url; // invite link required
        case 'bluesky':
        case 'instagram':
        case 'youtube':
        case 'threads':
        case 'mastodon':
          return !!(data.handle || data.url);
        case 'website':
        case 'other':
          return !!data.url;
        default:
          return !!(data.url || data.handle || data.label);
      }
    },
    { message: 'Platform link requires at least one identifier (URL, handle, ID, etc.)' },
  );

// ─── Add External Platform to Community ──────────────────────────────
export const addExternalPlatformSchema = z.object({
  communityId: z.string().uuid(),
  platform: externalPlatformLinkSchema,
});

export type AddExternalPlatformInput = z.infer<typeof addExternalPlatformSchema>;

// ─── Remove External Platform from Community ─────────────────────────
export const removeExternalPlatformSchema = z.object({
  communityId: z.string().uuid(),
  platformIndex: z.number().int().min(0),
});

export type RemoveExternalPlatformInput = z.infer<typeof removeExternalPlatformSchema>;

// ─── Integration Config ──────────────────────────────────────────────
export const integrationConfigSchema = z.object({
  autoSync: z.boolean().default(false),
  allowPublicSearch: z.boolean().default(false),
  notifyChannel: z.string().optional(),
  // Matrix
  matrixBotUserId: z.string().optional(),
  monitoredRoomIds: z.array(z.string()).optional(),
  syncMembership: z.boolean().default(false),
  // Slack
  slackTeamName: z.string().optional(),
  // Discord
  discordGuildName: z.string().optional(),
  // Telegram
  telegramChatId: z.number().optional(),
  telegramBotIsAdmin: z.boolean().optional(),
  telegramTopicsEnabled: z.boolean().optional(),
  telegramPersonusTopicId: z.number().optional(),
});

// ─── Create Integration ──────────────────────────────────────────────
export const createIntegrationSchema = z.object({
  communityId: z.string().uuid(),
  platform: z.enum(INTEGRATION_PLATFORMS),
  platformEntityId: z.string().min(1),
  platformEntityName: z.string().max(200).optional(),
  config: integrationConfigSchema.optional(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;

// ─── Update Integration ──────────────────────────────────────────────
export const updateIntegrationSchema = z.object({
  integrationId: z.string().uuid(),
  status: z.enum(INTEGRATION_STATUSES).optional(),
  config: integrationConfigSchema.partial().optional(),
  platformEntityName: z.string().max(200).optional(),
});

export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
```

### Update barrel: `lib/validations/index.ts`

```typescript
export * from './integrations';
```

---

## 5. Server Actions

### File: `app/actions/integrations.ts` (new)

```typescript
'use server';

import { db } from '@/lib/db';
import { integrations, communities } from '@/lib/db/schema';
import { serverAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import {
  addExternalPlatformSchema,
  removeExternalPlatformSchema,
  createIntegrationSchema,
  updateIntegrationSchema,
  type AddExternalPlatformInput,
  type RemoveExternalPlatformInput,
  type CreateIntegrationInput,
  type UpdateIntegrationInput,
} from '@/lib/validations';
import type { ExternalPlatformLink } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────

async function ensureCommunityAdmin(userId: string, communityId: string) {
  const [membership] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) throw new Error('Community not found or not a member');
  if (membership.role !== 'admin') {
    throw new Error('Only community admins can manage integrations');
  }
  return membership;
}

// ─── External Platform Links (Layer 1: JSONB on communities) ─────────

export async function addExternalPlatform(raw: AddExternalPlatformInput) {
  const session = await serverAuth.protect();
  const data = addExternalPlatformSchema.parse(raw);

  await ensureCommunityAdmin(session.userId, data.communityId);

  const [community] = await db
    .select({ externalPlatforms: communities.externalPlatforms })
    .from(communities)
    .where(eq(communities.id, data.communityId))
    .limit(1);

  const platforms = (community.externalPlatforms as ExternalPlatformLink[]) || [];
  platforms.push(data.platform);

  await db
    .update(communities)
    .set({ externalPlatforms: platforms })
    .where(eq(communities.id, data.communityId));

  return { success: true };
}

export async function removeExternalPlatform(raw: RemoveExternalPlatformInput) {
  const session = await serverAuth.protect();
  const data = removeExternalPlatformSchema.parse(raw);

  await ensureCommunityAdmin(session.userId, data.communityId);

  const [community] = await db
    .select({ externalPlatforms: communities.externalPlatforms })
    .from(communities)
    .where(eq(communities.id, data.communityId))
    .limit(1);

  const platforms = (community.externalPlatforms as ExternalPlatformLink[]) || [];
  if (data.platformIndex < 0 || data.platformIndex >= platforms.length) {
    throw new Error('Invalid platform index');
  }
  platforms.splice(data.platformIndex, 1);

  await db
    .update(communities)
    .set({ externalPlatforms: platforms })
    .where(eq(communities.id, data.communityId));

  return { success: true };
}

export async function getExternalPlatforms(communityId: string) {
  const [community] = await db
    .select({ externalPlatforms: communities.externalPlatforms })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  if (!community) throw new Error('Community not found');
  return (community.externalPlatforms as ExternalPlatformLink[]) || [];
}

// ─── Integrations (Layer 2: operational records) ─────────────────────

export async function createIntegration(raw: CreateIntegrationInput) {
  const session = await serverAuth.protect();
  const data = createIntegrationSchema.parse(raw);

  await ensureCommunityAdmin(session.userId, data.communityId);

  // Prevent duplicates: same community + platform + entity
  const existing = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.communityId, data.communityId),
        eq(integrations.platform, data.platform),
        eq(integrations.platformEntityId, data.platformEntityId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`This ${data.platform} connection already exists for this community`);
  }

  const [integration] = await db
    .insert(integrations)
    .values({
      communityId: data.communityId,
      platform: data.platform,
      platformEntityId: data.platformEntityId,
      platformEntityName: data.platformEntityName || null,
      config: data.config || { autoSync: false, allowPublicSearch: false },
      status: 'pending',
      installedBy: session.userId,
    })
    .returning();

  return { success: true, integration };
}

export async function updateIntegration(raw: UpdateIntegrationInput) {
  const session = await serverAuth.protect();
  const data = updateIntegrationSchema.parse(raw);

  const [existing] = await db
    .select({
      communityId: integrations.communityId,
      config: integrations.config,
    })
    .from(integrations)
    .where(eq(integrations.id, data.integrationId))
    .limit(1);

  if (!existing) throw new Error('Integration not found');
  await ensureCommunityAdmin(session.userId, existing.communityId);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status) updates.status = data.status;
  if (data.platformEntityName) updates.platformEntityName = data.platformEntityName;
  if (data.config) {
    updates.config = { ...(existing.config as object), ...data.config };
  }

  await db
    .update(integrations)
    .set(updates)
    .where(eq(integrations.id, data.integrationId));

  return { success: true };
}

export async function disconnectIntegration(integrationId: string) {
  const session = await serverAuth.protect();

  const [existing] = await db
    .select({ communityId: integrations.communityId })
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!existing) throw new Error('Integration not found');
  await ensureCommunityAdmin(session.userId, existing.communityId);

  await db
    .update(integrations)
    .set({ status: 'disconnected', updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));

  return { success: true };
}

export async function listIntegrations(communityId: string) {
  return db
    .select()
    .from(integrations)
    .where(eq(integrations.communityId, communityId));
}
```

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

1. **Community admin check** on all integration mutations (admin role required via `ensureCommunityAdmin`; founding user is always admin). Stewards can view integration status and activity but cannot connect/disconnect platforms.
2. **No tokens stored for Tier 1/2.** Hookshot webhooks are outbound-only
3. **Webhook URLs in config JSONB** — could be abused if DB is compromised; document that webhook URLs should use Hookshot's built-in HMAC authentication
4. **Platform identities are member-controlled** — stored as traits with per-persona visibility settings

---

## 10. Implementation Checklist

Ordered for incremental shippability:

### Phase A: Foundation
- [ ] Add constants to `lib/constants.ts` (platforms, statuses, platform types)
- [ ] Fix stale `COMMUNITY_TYPES` constant
- [ ] Add types to `types/index.ts` (ExternalPlatformLink, IntegrationConfig)
- [ ] Create `lib/validations/integrations.ts`
- [ ] Update `lib/validations/index.ts` barrel

### Phase B: Schema
- [ ] Refactor `lib/db/schema/integrations.ts` (generic columns + config JSONB + indexes)
- [ ] Run `db:push`

### Phase C: Server Actions
- [ ] Create `app/actions/integrations.ts` (6 actions)

### Phase D: UI
- [ ] Create `components/platform-icons.tsx`
- [ ] Create `components/platform-connection-step.tsx`
- [ ] Add Step 3 to community creation wizard
- [ ] Create `integration-settings.tsx`
- [ ] Add Connections tab to settings

### Phase E: MCP
- [ ] Extend `mcpListCommunities` with `externalPlatforms`
