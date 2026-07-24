---
type: spec
title: Platform Integrations — Slack
description: "Slack is a first-class integration platform for Personus. Its official Bolt SDK, Block Kit interactive components, Events API, and dominance in professional/workplace communities make it essential…"
status: planned
tags: [integrations]
timestamp: 2026-02-23
---

# Platform Integrations — Slack

> Date: 2026-02-23 (revised 2026-05-11)
> Status: Draft — first-class platform; **implementation vehicle is Mastra Channels** (see §0)
> Depends on: `00-overview.md`, `01-shared-architecture.md`, `03-bot-architecture.md`
> Tracking: **PER-65** — Slack is the second Mastra Channels adapter (ships after PER-64 Discord)
> Prereq: PER-5 / PER-6 / PER-17 (principal delegation contract); PER-64 (proves the Channels pattern)

Slack is a **first-class integration platform** for Personus. Its official Bolt SDK, Block Kit interactive components, Events API, and dominance in professional/workplace communities make it essential for Personus's intelligence layer — especially for workplace, organization, and guild community types.

---

## 0. Implementation Update — Mastra Channels (2026-05-11)

This spec was originally written around `@slack/bolt` + hand-rolled `app/api/slack/*/route.ts` endpoints (signing secret verification, events router, slash command handler, interactivity handler). As of Mastra 1.26 we are **using `@chat-adapter/slack` + Mastra Channels** for the messaging surface. See `03-bot-architecture.md §0` for the full rationale.

**What changes:**

- Mastra auto-generates `/api/agents/{agentId}/channels/slack/webhook`. We point Slack's Events Request URL and Interactivity Request URL at it; we do not write Bolt receivers.
- HMAC-SHA256 signing-secret verification, event dedup, retry handling, thread context, DM vs. mention routing — all owned by `@chat-adapter/slack`.
- Mention/DM-driven conversation flows run through the agent's tool loop. The seven slash commands described in §6 still live in the Slack app manifest, but their handlers are agent tool calls.

**What stays in this spec:**

- §§1-3 (strategic position, platform fundamentals, per-platform inputs) — unchanged.
- §§4-5 (OAuth install, `platform_channel_bindings` table, workspace identity linking) — unchanged.
- §6 (command surface, Block Kit response shapes) — descriptions still drive the slash command manifest and agent tool descriptions.
- **App Home tab** — Mastra Channels does **not** currently model App Home (`app_home_opened` event + Block Kit view publishing). Keep the App Home design in §§7-8 as a separate Tier 3+ work item; implement directly against the Slack Web API with the same principal contract.
- **Modals** — modal submission events may or may not be routed through Channels; verify during PER-65 spike. If not, modals stay on a hand-rolled `app/api/slack/interactions/route.ts`.
- §§9+ (rate limits, observability, Slack Connect, Enterprise Grid) — unchanged.

**Tier 4 (member sync via Events API) is fully serverless and likely covered by Channels** — `member_joined_channel` / `team_join` events flow through the same webhook. Confirm in the PER-65 spike.

---

## 1. Strategic Position

### 1.1 Why Slack Is First-Class

| Strength | Detail |
|---|---|
| **Official Bolt SDK** | `@slack/bolt` — mature, TypeScript-first, actively maintained by Slack. |
| **Block Kit** | Rich interactive messages: buttons, select menus, date pickers, overflow menus, modals, multi-step workflows. The most structured message format of any chat platform. |
| **Events API** | HTTP webhook-based — fully serverless-compatible. Runs in Next.js. |
| **Member list access** | `users.list` API — can enumerate all workspace members. |
| **Message history** | `conversations.history` — can read channel history for retroactive analysis. |
| **App Home** | Dedicated tab in Slack for the Personus app — persistent UI, not just commands. |
| **65M+ daily users** | Dominant in enterprise, professional, and workplace communities. |

### 1.2 Risk & Compliance

| Factor | Assessment |
|---|---|
| API stability | Excellent — versioned API, Slack invests heavily in developer experience |
| ToS alignment | Apps/bots are officially supported and encouraged via Slack Marketplace |
| Data privacy | Enterprise Grid customers control data retention; bot receives user display name, avatar, email (if workspace allows) |
| Rate limits | Tiered — well-documented, can be restrictive for large workspaces |

### 1.3 What We're Building

| Tier | Scope | Hosting |
|---|---|---|
| **Tier 1: Link** | Workspace URL parsing, community badge | Shared architecture (01) |
| **Tier 2: Notify** | Outbound Slack Incoming Webhooks | Next.js server action (HTTP POST) |
| **Tier 3: Interact** | Slash commands, Block Kit messages, modals, App Home | Next.js API route (Events API + Interactivity) |
| **Tier 4: Sync** | Member sync, channel join/leave, activity signals | Next.js API route (Events API — no separate process needed) |

**Key insight:** Unlike Discord (which needs a Gateway for Tier 4), Slack's Events API is entirely HTTP webhook-based. **All tiers (1-4) can run in Next.js** — no separate bot process required.

---

## 2. Platform Fundamentals

### 2.1 Slack Concepts

| Concept | Personus Mapping |
|---|---|
| **Workspace** | Maps to one Personus community (typically) |
| **Channels** | Where slash commands are used; specific channels for bot notifications |
| **App Home** | Dedicated Personus tab in Slack — persistent member directory, profile editor |
| **User Groups** | Could map to Personus community roles or guild tiers |
| **Threads** | Conversation context for introductions or detailed search results |
| **Slack Connect** | Cross-workspace channels — potential for cross-community discovery |

### 2.2 App Configuration

Slack apps are configured in the [Slack API Dashboard](https://api.slack.com/apps). Key settings:

**Bot Token Scopes (OAuth):**

| Scope | Why |
|---|---|
| `commands` | Register and receive slash commands |
| `chat:write` | Send messages in channels |
| `users:read` | Read workspace member profiles |
| `users:read.email` | Read member emails (for identity linking) |
| `channels:read` | List public channels |
| `groups:read` | List private channels bot is in |
| `app_mentions:read` | Respond when @mentioned |
| `im:write` | Send DMs to users |

**Event Subscriptions:**

| Event | Why |
|---|---|
| `app_home_opened` | Render App Home tab |
| `member_joined_channel` | Track join events (Tier 4) |
| `member_left_channel` | Track leave events (Tier 4) |
| `app_mention` | Respond to @Personus mentions |
| `team_join` | New workspace member (Tier 4) |

### 2.3 Key Differences from Other Platforms

| Feature | Slack | Discord | Telegram | Matrix |
|---|---|---|---|---|
| Member list enumeration | **Yes** (`users.list`) | **Yes** | No | Via Appservice |
| Message history access | **Yes** (`conversations.history`) | **Yes** | No | Via Appservice |
| Embedded web app | No | No | Mini Apps | Widget API |
| App Home (persistent tab) | **Yes** (unique) | No | No | No |
| Block Kit (structured UI) | **Yes** (richest) | Embeds + buttons | Inline keyboards | Plain text/HTML |
| Serverless all tiers | **Yes** (Events API) | Tier 1-3 only | **Yes** (webhooks) | No (needs Appservice) |
| Modals (multi-step forms) | **Yes** | **Yes** | No (Mini Apps instead) | No |
| Slash command params | Basic (free text) | **Typed + autocomplete** | Basic | N/A |

---

## 3. Per-Platform Inputs

When a Community Organizer connects Slack:

| Field | Type | Required | Placeholder | Notes |
|---|---|---|---|---|
| Workspace URL | url | Either this or ID | `https://team.slack.com` | Primary input |
| Workspace ID | text | Either this or URL | `T0123456789` | Advanced, collapsible |

**Auto-parse:** `<team>.slack.com` → extract workspace slug.

**Parser function:**

```typescript
const SLACK_WORKSPACE_REGEX = /^https?:\/\/([a-zA-Z0-9\-]+)\.slack\.com\/?$/;

export function parseSlackWorkspaceUrl(url: string): { workspaceSlug: string } | null {
  const match = url.match(SLACK_WORKSPACE_REGEX);
  if (!match) return null;
  return { workspaceSlug: match[1] };
}
```

**Validation schemas:**

```typescript
export const slackWorkspaceIdSchema = z.string().regex(/^T[A-Z0-9]{8,}$/, 'Invalid Slack workspace ID');

export const connectSlackSchema = z
  .object({
    communityId: z.string().uuid(),
    workspaceUrl: z.string().url().optional(),
    workspaceId: z.string().optional(),
    workspaceSlug: z.string().optional(),
  })
  .refine(
    (data) => !!(data.workspaceUrl || data.workspaceId),
    { message: 'Provide a Slack workspace URL or workspace ID' },
  )
  .transform((data) => {
    if (data.workspaceUrl && !data.workspaceSlug) {
      const parsed = parseSlackWorkspaceUrl(data.workspaceUrl);
      if (parsed) data.workspaceSlug = parsed.workspaceSlug;
    }
    return data;
  });

export type ConnectSlackInput = z.infer<typeof connectSlackSchema>;
```

**Stored as:**
```json
{
  "platform": "slack",
  "label": "Slack (team-name)",
  "url": "https://team-name.slack.com",
  "workspaceId": "T0123456789"
}
```

---

## 4. Integration Architecture by Tier

### 4.1 Tier 1: Link (Shared Architecture)

Handled by `01-shared-architecture.md`. Workspace URL stored in `communities.externalPlatforms` JSONB. Badge displayed on community profile.

### 4.2 Tier 2: Notify (Slack Incoming Webhooks)

Slack has native Incoming Webhooks — the simplest outbound notification mechanism.

**Webhook helper:**

```typescript
// lib/slack/webhooks.ts

export async function sendSlackWebhook(
  webhookUrl: string,
  message: SlackMessage,
) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return { success: response.ok, status: response.status };
  } catch (error) {
    console.error('Slack webhook failed:', error);
    return { success: false, error: String(error) };
  }
}

interface SlackMessage {
  text: string;                    // Fallback plain text
  blocks?: SlackBlock[];           // Block Kit blocks (rich formatting)
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'context' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
  fields?: { type: 'mrkdwn' | 'plain_text'; text: string }[];
  accessory?: unknown;
  elements?: unknown[];
}
```

**Notification events:**

| Event | Block Kit Format |
|---|---|
| New member joins | Section block: bold name, skill tags as context. Accessory: avatar. |
| Endorsement given | Section: "*Bob* endorsed *Alice* for API design". Context: endorsement count. |
| Contact request | Section: "New introduction request in the community". (No names — privacy.) |

**Setup flow:**
1. Organizer creates an Incoming Webhook in Slack App settings (or via Slack's Workflow Builder)
2. Copies the webhook URL
3. Pastes into Personus Settings → Connections → Slack → Configure → Notification webhook

### 4.3 Tier 3: Interact (Slash Commands + Block Kit)

Slack delivers slash commands and interactivity events via HTTP POST to configured URLs.

**Webhook endpoints:**

```typescript
// app/api/slack/commands/route.ts — receives slash command invocations
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);

  // Verify Slack signature
  if (!verifySlackRequest(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const command = payload.command as string;    // '/personus'
  const text = payload.text as string;          // 'discover TypeScript'
  const triggerId = payload.trigger_id as string;
  const userId = payload.user_id as string;
  const channelId = payload.channel_id as string;
  const teamId = payload.team_id as string;

  const [subcommand, ...args] = text.split(' ');

  switch (subcommand) {
    case 'discover':
      return handleDiscover(args.join(' '), channelId, userId, teamId);
    case 'who-knows':
      return handleWhoKnows(args.join(' '), channelId, userId, teamId);
    case 'profile':
      return handleProfile(args[0], channelId, userId, teamId);
    case 'intro':
      return handleIntro(triggerId, args, userId, teamId); // Opens modal
    case 'community':
      return handleCommunity(channelId, teamId);
    case 'link':
      return handleLink(userId, teamId);
    case 'help':
      return handleHelp();
    default:
      return handleHelp();
  }
}
```

```typescript
// app/api/slack/interactions/route.ts — receives button clicks, modal submissions
export async function POST(request: Request) {
  const formData = await request.formData();
  const payloadStr = formData.get('payload') as string;
  const payload = JSON.parse(payloadStr);

  if (!verifySlackRequest(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  switch (payload.type) {
    case 'block_actions':
      return handleBlockAction(payload);
    case 'view_submission':
      return handleModalSubmission(payload);
    case 'shortcut':
      return handleShortcut(payload);
    default:
      return new Response('', { status: 200 });
  }
}
```

```typescript
// app/api/slack/events/route.ts — receives Events API events
export async function POST(request: Request) {
  const body = await request.json();

  // Slack URL verification challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  if (!verifySlackRequest(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = body.event;

  switch (event.type) {
    case 'app_home_opened':
      return handleAppHomeOpened(event);
    case 'app_mention':
      return handleAppMention(event);
    case 'member_joined_channel':
      return handleMemberJoined(event);
    case 'member_left_channel':
      return handleMemberLeft(event);
    case 'team_join':
      return handleTeamJoin(event);
    default:
      return new Response('', { status: 200 });
  }
}
```

**Signature verification:**

```typescript
// lib/slack/verify.ts
import { createHmac, timingSafeEqual } from 'crypto';

export function verifySlackRequest(request: Request): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  const signature = request.headers.get('X-Slack-Signature');

  if (!timestamp || !signature) return false;

  // Prevent replay attacks (5 min window)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${/* request body */}`;
  const mySignature = 'v0=' + createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  return timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}
```

**Note:** Slack verification needs the raw request body. In Next.js App Router, read the body once and pass it to both verification and parsing. Consider using `@slack/bolt`'s built-in verification if using the framework directly.

**Proposed commands:**

| Command | Usage | Response |
|---|---|---|
| `/personus discover [query]` | `/personus discover TypeScript` | Block Kit message with matching members |
| `/personus who-knows [skill]` | `/personus who-knows grant writing` | Block Kit message with skill holders |
| `/personus profile [@user]` | `/personus profile @alice` | Block Kit persona card |
| `/personus intro [@user]` | `/personus intro @alice` | Opens modal for intro message |
| `/personus community` | `/personus community` | Community skill summary |
| `/personus link` | `/personus link` | Ephemeral message with link to Personus |
| `/personus help` | `/personus help` | Ephemeral command reference |

**Block Kit interaction pattern:**

```
User: /personus discover TypeScript

Personus responds with Block Kit message:
  ┌─────────────────────────────────────────┐
  │ 🔍 Found 3 members with TypeScript      │
  │                                          │
  │ *Alice Martinez*                         │
  │ Senior TS Dev · 5+ years · ⭐ 12        │
  │ [View Profile] [Request Intro]           │
  │ ──────────────────────────────           │
  │ *Bob Kim*                                │
  │ Full Stack · TS + React · ⭐ 8          │
  │ [View Profile] [Request Intro]           │
  │ ──────────────────────────────           │
  │ *Carol Santos*                           │
  │ TypeScript + Node.js · ⭐ 5             │
  │ [View Profile] [Request Intro]           │
  │                                          │
  │ [Show More Results]                      │
  └─────────────────────────────────────────┘

User clicks [Request Intro]:
  Modal opens:
  ┌─────────────────────────────────────────┐
  │ Request Introduction to Alice            │
  │                                          │
  │ Why do you want to connect?              │
  │ ┌─────────────────────────────────────┐  │
  │ │ I'm working on a TS migration and   │  │
  │ │ could use some guidance...           │  │
  │ └─────────────────────────────────────┘  │
  │                                          │
  │                    [Cancel] [Send Request]│
  └─────────────────────────────────────────┘
```

### 4.4 Tier 3.5: App Home

Slack's **App Home** is a dedicated tab that appears when users click on the Personus app in their sidebar. This is persistent UI — not a command response.

**What App Home shows:**

```
┌─ Personus ─────────────────────────────────┐
│                                             │
│  Your Profile                               │
│  Alice Martinez · Senior Software Engineer  │
│  Skills: TypeScript, React, Node.js, AWS    │
│  [Edit Profile on Personus]                 │
│                                             │
│  ─────────────────────────────              │
│                                             │
│  Your Community: Portland Devs              │
│  47 members · 12 skills tracked             │
│                                             │
│  Recent Activity                            │
│  • Bob endorsed you for API Design          │
│  • New member: Carol Santos (Rust, Go)      │
│  • Introduction request from Dave (pending) │
│                                             │
│  Quick Actions                              │
│  [Search Members] [View Community] [Help]   │
│                                             │
└─────────────────────────────────────────────┘
```

The App Home is rendered by handling the `app_home_opened` event and calling `views.publish`.

### 4.5 Tier 4: Sync (Events API — No Separate Process)

Unlike Discord, Slack's Events API delivers everything via HTTP webhooks. Member sync runs in Next.js.

**What Tier 4 enables:**
- `users.list` → enumerate all workspace members, match to Personus accounts
- `member_joined_channel` / `member_left_channel` → track community membership
- `team_join` → new workspace member → prompt to link Personus account
- `conversations.history` → retroactive channel analysis (with consent)

---

## 5. Identity & Account Linking

### 5.1 Slack ID as a Persona Trait

**Trait metadata seed entry:**

```typescript
{
  traitKey: 'slackId',
  displayName: 'Slack',
  description: 'Your Slack workspace identity',
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
    placeholder: 'Display name or member ID',
  },
  searchable: true,
  defaultVisibility: 'authenticated',
}
```

### 5.2 Schema Additions

```typescript
// Add to lib/db/schema/users.ts
slackUserId: text('slack_user_id').unique(),    // Slack member ID (U...)
slackTeamId: text('slack_team_id'),             // Workspace ID (T...)
```

### 5.3 Account Linking Flows

**From Slack (slash command → web auth):**
```
User: /personus link
Bot responds (ephemeral): "Link your Personus account"
  → Button URL: https://personus.ai/link/slack?state={encrypted_slack_user_id+team_id}
  → User authenticates with Clerk on personus.ai
  → Stores slackUserId + slackTeamId on user record
```

**From Personus (settings → Slack OAuth — "Sign in with Slack"):**
```
User goes to Settings → "Link Slack Account"
  → Slack OAuth2 flow (identity.basic scope)
  → Returns Slack user ID, team ID, display name, avatar
  → Stores slackUserId + slackTeamId on user record
```

**Auto-link on App Home open:**
When a user opens the Personus App Home, the event payload includes their Slack user ID. If they've previously linked, the App Home shows their Personus profile. If not, it shows a "Link your account" prompt.

---

## 6. Technical Implementation

### 6.1 File Structure

```
lib/slack/
  verify.ts               — HMAC-SHA256 request signature verification
  webhooks.ts             — Outbound Incoming Webhook helper (Tier 2)
  blocks/
    search-results.ts     — Format search results as Block Kit
    profile-card.ts       — Format persona as Block Kit sections
    intro-modal.ts        — Introduction request modal view
    app-home.ts           — App Home view blocks
    community-summary.ts  — Community skill summary blocks
  commands/
    discover.ts           — /personus discover handler
    who-knows.ts          — /personus who-knows handler
    profile.ts            — /personus profile handler
    intro.ts              — /personus intro handler (opens modal)
    community.ts          — /personus community handler
    link.ts               — /personus link handler
    help.ts               — /personus help handler
  events/
    app-home.ts           — app_home_opened handler
    member-joined.ts      — member_joined_channel handler
    member-left.ts        — member_left_channel handler
    team-join.ts          — team_join handler
  types.ts                — Slack-specific type definitions
  api-client.ts           — Slack Web API wrapper (chat.postMessage, views.publish, etc.)

app/api/slack/
  commands/route.ts       — Slash command endpoint
  interactions/route.ts   — Block Kit interactivity endpoint
  events/route.ts         — Events API endpoint

app/api/auth/slack/
  callback/route.ts       — OAuth2 callback for account linking
  install/route.ts        — App installation OAuth2 flow
```

### 6.2 SDK / Dependencies

**Option A: Lightweight (recommended for Next.js):**

No heavy SDK. Use Slack's REST API directly with `fetch`. Verify signatures manually.

```bash
# No additional packages needed — just fetch + crypto (built-in)
```

**Option B: Bolt SDK (if we want the full framework):**

```bash
bun add @slack/bolt @slack/web-api
```

Bolt provides middleware, signature verification, and event routing. However, it assumes a single-process Express-like app. For Next.js App Router, the lightweight approach is simpler.

**Recommendation:** Start lightweight (Option A). Migrate to Bolt only if the command/event routing becomes complex enough to warrant a framework.

### 6.3 Integration Config (Slack-Specific)

Extends `IntegrationConfig` in `types/index.ts`:

```typescript
// Slack-specific fields in IntegrationConfig
slackTeamId?: string;              // Workspace ID (T...)
slackTeamName?: string;            // Human-readable workspace name
slackBotUserId?: string;           // Bot's user ID in the workspace (U...)
slackBotChannelId?: string;        // Default channel for bot messages
slackAppHomeEnabled?: boolean;     // Whether App Home is set up
```

### 6.4 Environment Variables

```env
SLACK_BOT_TOKEN=xoxb-...           # Bot User OAuth Token
SLACK_SIGNING_SECRET=...           # For verifying request signatures
SLACK_CLIENT_ID=...                # For OAuth2 app installation
SLACK_CLIENT_SECRET=...            # For OAuth2 app installation
SLACK_APP_TOKEN=xapp-...           # For Socket Mode (development only)
```

---

## 7. Value Messaging

| Card Headline | Detail |
|---|---|
| "Know who on your team can help before you ask the channel" | "Connect your Slack workspace. Instead of 'does anyone know X?' in #general, Personus finds the right person instantly." |

---

## 8. Rate Limits & Design Constraints

| Constraint | Limit | Design Response |
|---|---|---|
| Slash command response | 3 seconds | Acknowledge immediately, post follow-up via `response_url` or `chat.postMessage` |
| `chat.postMessage` | 1 message/second per channel | Queue messages, batch notifications |
| `users.list` | Tier 2: 20 req/min, Tier 3: 50 req/min, Tier 4: 100 req/min | Cache member list, refresh periodically |
| `conversations.history` | Tier 3: 50 req/min | Only fetch on demand (Tier 4), not proactively |
| Modal payload | 50 blocks per view | Paginate complex views |
| Block Kit message | 50 blocks per message | Show top 5 results, "Show more" button |
| `response_url` | 5 follow-ups, 30 min window | Complete all operations within window |
| App Home | Updated per-user on `app_home_opened` | Cache and diff to minimize API calls |

**Slack rate tiers** are based on the app's activity level. New apps start at Tier 1 (lowest). Limits increase as the app serves more active workspaces.

---

## 9. Testing Strategy

### 9.1 Unit Tests: `lib/slack/verify.test.ts`

```typescript
describe('verifySlackRequest', () => {
  it('accepts valid HMAC-SHA256 signatures', () => { /* mock */ });
  it('rejects invalid signatures', () => { /* mock */ });
  it('rejects expired timestamps (>5 min)', () => { /* mock */ });
  it('rejects missing headers', () => { /* mock */ });
});
```

### 9.2 Unit Tests: URL Parsing

```typescript
describe('parseSlackWorkspaceUrl', () => {
  it('parses team.slack.com URL', () => {
    expect(parseSlackWorkspaceUrl('https://myteam.slack.com'))
      .toEqual({ workspaceSlug: 'myteam' });
  });
  it('handles trailing slash', () => {
    expect(parseSlackWorkspaceUrl('https://myteam.slack.com/'))
      .toEqual({ workspaceSlug: 'myteam' });
  });
  it('returns null for non-Slack URLs', () => {
    expect(parseSlackWorkspaceUrl('https://discord.gg/abc')).toBeNull();
  });
});

describe('connectSlackSchema', () => {
  it('auto-parses workspace URL into slug', () => {
    const result = connectSlackSchema.parse({
      communityId: '00000000-0000-0000-0000-000000000001',
      workspaceUrl: 'https://portland-devs.slack.com',
    });
    expect(result.workspaceSlug).toBe('portland-devs');
  });
  it('requires workspace URL or ID', () => {
    expect(() => connectSlackSchema.parse({
      communityId: '00000000-0000-0000-0000-000000000001',
    })).toThrow();
  });
});
```

### 9.3 Unit Tests: Block Kit Formatting

```typescript
describe('formatSearchResultsBlocks', () => {
  it('formats personas as Block Kit sections', () => {
    const blocks = formatSearchResultsBlocks([
      { name: 'Alice', skills: ['TypeScript'], endorsements: 12 },
    ]);
    expect(blocks[0].type).toBe('section');
    expect(blocks[0].text.text).toContain('Alice');
  });
  it('adds action buttons for each result', () => {
    const blocks = formatSearchResultsBlocks([/* ... */]);
    const actionBlock = blocks.find(b => b.type === 'actions');
    expect(actionBlock).toBeDefined();
  });
  it('paginates beyond 5 results', () => {
    const blocks = formatSearchResultsBlocks(Array(8).fill(mockPersona));
    const showMore = blocks.find(b =>
      b.type === 'actions' && JSON.stringify(b).includes('show_more')
    );
    expect(showMore).toBeDefined();
  });
});
```

### 9.4 Integration Tests

```
1. POST to /api/slack/events with url_verification → verify challenge response
2. POST to /api/slack/commands with valid signature → verify Block Kit response
3. POST with invalid signature → verify 401
4. POST slash command → verify 200 within 3 seconds
5. Webhook POST to Slack channel → verify message appears
6. OAuth2 install flow → verify bot token stored
7. app_home_opened event → verify views.publish called with correct blocks
```

### 9.5 Manual Testing

1. Create a test Slack workspace (free tier)
2. Create a Slack App at api.slack.com/apps
3. Configure Request URL for slash commands: `https://{domain}/api/slack/commands`
4. Configure Interactivity URL: `https://{domain}/api/slack/interactions`
5. Configure Events URL: `https://{domain}/api/slack/events`
6. Install app to workspace
7. Test `/personus help` in a channel
8. Test App Home by clicking the Personus app in sidebar
9. Use ngrok or Cloudflare Tunnel for local development

---

## 10. Implementation Phases

### Phase 1: Foundation
- [ ] Create Slack App at api.slack.com
- [ ] Create `lib/slack/verify.ts` (HMAC-SHA256 signature verification)
- [ ] Create `app/api/slack/events/route.ts` (url_verification challenge)
- [ ] Create `app/api/slack/commands/route.ts` (slash command routing)
- [ ] Add `slackUserId` / `slackTeamId` to users schema
- [ ] Add `slackId` trait metadata seed entry
- [ ] Add env vars to `.env.example`
- [ ] Run `db:push`

### Phase 2: Webhooks (Tier 2)
- [ ] Create `lib/slack/webhooks.ts` (outbound Incoming Webhook helper)
- [ ] Add webhook calls to endorsement/contact/community actions
- [ ] Add webhook URL field to Slack integration config UI

### Phase 3: Slash Commands (Tier 3)
- [ ] Implement `/personus discover` → Block Kit search results
- [ ] Implement `/personus profile` → Block Kit persona card
- [ ] Implement `/personus intro` → modal → mediated contact
- [ ] Implement `/personus who-knows`, `/personus community`, `/personus help`
- [ ] Implement `/personus link` → account linking
- [ ] Create `app/api/slack/interactions/route.ts` (button/modal handlers)
- [ ] Build Block Kit formatters (`lib/slack/blocks/`)

### Phase 4: App Home
- [ ] Handle `app_home_opened` event
- [ ] Build App Home view: profile summary, recent activity, quick actions
- [ ] Update App Home when user links account or receives endorsement

### Phase 5: Account Linking
- [ ] Create `app/api/auth/slack/callback/route.ts` (OAuth2)
- [ ] Add "Link Slack" to Personus settings page
- [ ] Implement `/personus link` → web auth flow
- [ ] Auto-resolve Slack user → Personus persona on commands

### Phase 6: Sync (Tier 4)
- [ ] Handle `member_joined_channel` / `member_left_channel` events
- [ ] Handle `team_join` event → prompt account linking
- [ ] Periodic `users.list` sync for member directory
- [ ] Periodic `conversations.history` for activity signals (with consent)

---

## 11. Capability Tier Summary

| Tier | Capability | Supported | Hosting | Notes |
|---|---|---|---|---|
| **Tier 1: Link** | Workspace URL, platform badge | Yes | Shared architecture | Workspace URL parsing |
| **Tier 2: Notify** | Outbound Incoming Webhooks | Yes | Next.js (HTTP POST) | Slack native webhooks |
| **Tier 3: Interact** | Slash commands, Block Kit, modals | Yes | Next.js (Events API) | No separate process needed |
| **Tier 3.5: App Home** | Persistent Personus tab in Slack | Yes | Next.js (Events API) | Unique to Slack |
| **Tier 4: Sync** | Member list, join/leave, activity | Yes | Next.js (Events API) | All serverless — no Gateway needed |
| **Tier 5: Embed** | Personus UI inside Slack | No | — | Slack has no embedded web app capability |

---

## 12. Slack-Specific Considerations

### 12.1 App Installation Flow (OAuth2)

When a Community Organizer wants to connect their Slack workspace:

```
1. Organizer clicks "Connect Slack" in Personus
2. Redirect to Slack OAuth2 authorization URL
3. Organizer approves scopes in their workspace
4. Slack redirects back with authorization code
5. Personus exchanges code for bot token + team info
6. Stores bot token in integrations.accessToken (encrypted)
7. Integration record created with status: 'active'
```

This is more seamless than Matrix (manual webhook setup) — the entire connection happens via OAuth with no copy-pasting of URLs.

### 12.2 Ephemeral Responses

Commands that show personal data respond ephemerally:
- `/personus link` — account linking (only visible to invoker)
- `/personus help` — command reference

Skill searches respond publicly — visibility is the point.

### 12.3 Thread-Based Introductions

When `/personus intro @alice` is submitted (via modal), the bot can create a **thread** on its response message for the introduction conversation. This keeps the mediation visible to the parties without cluttering the channel.

### 12.4 Slack Connect (Future)

Slack Connect allows shared channels across workspaces. This could enable cross-community discovery: "Find a TypeScript expert in any community that shares a Slack Connect channel with us." Defer to future exploration.

### 12.5 Slack Marketplace

Once the Personus Slack app is stable, it can be listed on the Slack App Directory for organic discovery. This is a growth channel — community organizers searching for "community management" or "skill discovery" apps find Personus directly in Slack.
