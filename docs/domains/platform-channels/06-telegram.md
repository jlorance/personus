---
type: spec
title: Platform Integrations — Telegram
description: "Telegram is a first-class integration platform for Personus alongside Discord, Slack, and Matrix. Its officially supported Bot API, Mini Apps (embedded web apps), and 900M+ user base make it one…"
status: planned
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — Telegram

> Date: 2026-02-23 (revised 2026-05-11)
> Status: Draft — first-class platform; **deferred behind Discord/Slack** pending `@chat-adapter/telegram` availability
> Depends on: `00-overview.md`, `01-shared-architecture.md`
> Research: `docs/research/telegram_integration.md`
> Tracking: **PER-66** — Telegram is stubbed; ships after Discord (PER-64) and Slack (PER-65)
> Prereq: PER-5 / PER-6 / PER-17 (principal delegation); availability of a Mastra Channels Telegram adapter OR explicit decision to use grammY directly

Telegram is a **first-class integration platform** for Personus alongside Discord, Slack, and Matrix. Its officially supported Bot API, Mini Apps (embedded web apps), and 900M+ user base make it one of the strongest integration targets — particularly for communities outside the US.

---

## 0. Implementation Update — Mastra Channels (2026-05-11)

Discord and Slack are migrating to Mastra Channels (see `03-bot-architecture.md §0`). Telegram's path depends on whether a Mastra-blessed adapter exists.

**Two viable paths for the Tier 1-3 bot layer:**

| Path | When to choose | Notes |
|---|---|---|
| **A. `@chat-adapter/telegram` via Mastra Channels** | If/when this package exists and is stable | Mirrors Discord/Slack — auto-generated webhook, shared principal contract, thread context for free |
| **B. grammY webhook in Next.js** (this spec's original plan) | Default if Channels adapter is missing | Keep `app/api/telegram/route.ts` as designed in §§3-5; wrap tool calls with the same `asAgent()` delegation used by the Channels handlers so the principal contract stays uniform |

**PER-66 is a stub-first ticket.** The spike's job is to determine which path applies. Until then this spec's grammY-based plan remains the fallback.

**Mini Apps (Tier 5) are unaffected** — they are Next.js pages authenticated via Telegram `initData`, not a bot adapter. The Mini App surfaces in §§7-9 of this spec are independent of the Tier 1-3 bot vehicle and can proceed on their own timeline.

**`ChatMemberUpdated` (Tier 4 sync)** — webhook-based, will continue to live in the Telegram webhook route regardless of which path Tier 1-3 takes.

---

## 1. Why Telegram Is First-Class

| Strength | Detail |
|---|---|
| **Official Bot API** | Mature, well-documented, actively developed (Bot API 8.0, Nov 2025). Bots are a first-class Telegram feature. |
| **Mini Apps** | Full HTML5 web apps embedded inside Telegram. No other platform offers this. Personus can embed its entire UI — search, profiles, introductions — inside Telegram. |
| **Zero-friction auth** | Mini App `initData` provides signed user identity with no OAuth flow, no redirects, no password. |
| **Webhook-friendly** | Works with serverless (Vercel). A single `app/api/telegram/route.ts` handles all bot events. |
| **900M+ users** | Especially strong in Europe, CIS, Middle East, Southeast Asia, South America. Complements Discord (US/gaming) and Slack (US/enterprise). |
| **Supergroups + Topics** | Up to 200K members with threaded topic support — maps naturally to Personus communities. |
| **Free** | Bot API is free. No developer account fees. |

---

## 2. Telegram Concepts That Matter

### 2.1 Supergroups (Primary Target)

Supergroups are Telegram's community-grade chat:
- Up to **200,000 members**
- Up to **50 admins**, **20 bots**
- Persistent message history for new members
- **Topics** — threaded sub-conversations (forum-style)
- Fine-grained admin permissions
- Anti-spam, slow mode, member restrictions

Most Telegram communities operate as supergroups. This is where the Personus bot lives.

### 2.2 Privacy Mode

**Privacy mode is ON by default.** This controls what the bot can see.

| Bot Status | What Bot Sees |
|---|---|
| Privacy ON (default) | Commands addressed to bot, replies to bot messages, service messages (join/leave) |
| Privacy OFF | All messages (except from other bots) |
| **Bot is admin** | **All messages** regardless of privacy setting |

**Recommendation:** Request admin privileges when adding the Personus bot. This is natural since admins are the ones adding the bot. Admin access gives full message visibility and group management capabilities.

### 2.3 No Member List Enumeration

The Bot API **cannot list all members** of a group. This is intentional for privacy.

Personus builds its member directory incrementally:
1. Track join/leave events via `ChatMemberUpdated`
2. Register users on first bot interaction (`/link`, `/discover`, etc.)
3. Register users on first Mini App launch (auto-link via `initData`)

This aligns with Personus's opt-in model — members join the intelligence layer by interacting with the bot.

### 2.4 No Message History

Bots only receive messages from the moment they're added. No retroactive analysis. Intelligence gathering begins on day one.

---

## 3. Three-Layer Integration Architecture

### Layer 1: Telegram Bot (grammY)

Slash commands in group chat for quick interactions.

**Proposed commands:**

| Command | Purpose | Example |
|---|---|---|
| `/discover` | Search for members by skill | `/discover TypeScript experts` |
| `/whocando` | Find someone who can help | `/whocando grant writing` |
| `/myskills` | View/update your skills (opens Mini App) | `/myskills` |
| `/intro` | Request an introduction | `/intro @alice` |
| `/profile` | View a member's profile | `/profile @alice` |
| `/community` | Community skill summary | `/community` |
| `/link` | Link your Personus account | `/link` |
| `/help` | Show available commands | `/help` |

**Interaction pattern** — inline keyboards for rich responses:

```
User: /discover TypeScript
Bot responds with message + inline keyboard:

  Found 3 members with TypeScript skills:

  Alice M. — Senior TS Dev (5+ years)
  ⭐ 12 endorsements | Available for mentoring

  Bob K. — Full Stack (TS + React)
  ⭐ 8 endorsements | Open to projects

  [View Details] [Request Intro] [More Results >>]
```

Tapping "View Details" edits the message (stays within rate limits) or opens a Mini App for the full profile.

### Layer 2: Telegram Mini App (Next.js)

Full Personus UI embedded inside Telegram. This is the killer feature — no other platform supports this.

**Mini App surfaces:**

| Surface | Entry Point | What It Does |
|---|---|---|
| **Profile Editor** | `/myskills` command, bot menu button | Edit persona traits directly from Telegram |
| **Skill Search** | `/discover` "Open Full Search" button | Semantic search with filters, results, trust chains |
| **Introduction Request** | "Request Intro" inline button | Full intro flow with message, context, trust signals |
| **Community Dashboard** | `/community` "Open Dashboard" button | Skill heatmap, member directory, recent activity |
| **Onboarding** | First interaction / `/link` command | Link or create Personus account, select persona |

**Authentication flow:**
1. User opens Mini App (from command button, bot menu, or direct link)
2. Telegram passes signed `initData` with user ID, name, username
3. Personus server verifies HMAC-SHA-256 signature
4. If `telegramUserId` is linked to a Personus account → authenticated
5. If not linked → onboarding flow (Clerk auth inside Mini App → link accounts)

**Mini App theming:** Telegram provides CSS variables (`--tg-theme-bg-color`, `--tg-theme-text-color`, etc.) that match the user's Telegram theme. The Personus Mini App should use these for a native feel.

### Layer 3: Telegram Login Widget (Web)

Links Telegram identity to Personus accounts from the personus.ai website.

**Flow:**
1. User logged into Personus via Clerk
2. Settings → "Link Telegram Account"
3. Telegram Login Widget appears (JavaScript embed)
4. User authorizes with Telegram
5. Personus stores `telegramUserId` on the user record
6. Now the bot in Telegram groups can recognize this user

---

## 4. Technical Architecture

### 4.1 Framework: grammY

**Package:** `grammy` — TypeScript-first Telegram bot framework.

Why grammY over alternatives:
- TypeScript-first (built from ground up, not retrofitted)
- Built-in Next.js webhook adapter (`webhookCallback(bot, 'std/http')`)
- Plugin ecosystem: menus, conversations, sessions, auto-retry
- Supports latest Bot API immediately
- Works with Bun

**Packages:**
```bash
bun add grammy @grammyjs/menu @grammyjs/conversations @grammyjs/session @grammyjs/auto-retry
```

### 4.2 Webhook Endpoint

```typescript
// app/api/telegram/route.ts
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN not found');

const bot = new Bot(token);

// Register command handlers (imported from lib/telegram/commands/)
// bot.command('discover', discoverHandler);
// bot.command('myskills', myskillsHandler);
// etc.

export const POST = webhookCallback(bot, 'std/http');
```

**Webhook setup:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://personus.ai/api/telegram"
```

**Constraint:** Webhook handlers must respond within ~10 seconds. For long-running operations (semantic search, AI agents), acknowledge immediately and use `editMessageText` to update with results.

### 4.3 Mini App initData Verification

```typescript
// lib/telegram/verify.ts
import { createHmac } from 'crypto';

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return expectedHash === hash;
}
```

### 4.4 Login Widget Verification

```typescript
// lib/telegram/verify.ts (continued)
import { createHash } from 'crypto';

export function verifyTelegramLogin(
  data: Record<string, string>,
  botToken: string,
): boolean {
  const hash = data.hash;
  const checkString = Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
}
```

### 4.5 File Structure

```
lib/telegram/
  bot.ts                  — grammY bot instance, middleware, command registration
  verify.ts               — initData + Login Widget HMAC verification
  types.ts                — Telegram-specific type definitions
  utils.ts                — Format profile cards, truncate for rate limits
  commands/
    discover.ts           — /discover handler (calls personaSearchTool)
    whocando.ts           — /whocando handler
    myskills.ts           — /myskills handler (opens Mini App)
    intro.ts              — /intro handler (calls requestIntroductionTool)
    profile.ts            — /profile handler (calls getPersonaTool)
    community.ts          — /community handler
    link.ts               — /link handler (account linking)
    help.ts               — /help handler
  middleware/
    auth.ts               — Check if user is linked to Personus account
    rate-limit.ts         — Per-user rate limiting
  menus/
    search-results.ts     — Interactive search result menu (@grammyjs/menu)
    profile-card.ts       — Profile display with action buttons
    intro-request.ts      — Introduction request flow

app/api/telegram/
  route.ts                — Webhook endpoint

app/api/auth/telegram/
  callback/route.ts       — Login Widget callback

app/telegram/
  profile/page.tsx        — Mini App: Profile editor
  search/page.tsx         — Mini App: Skill search
  community/page.tsx      — Mini App: Community dashboard
  layout.tsx              — Mini App layout (Telegram theme, safe areas)
```

---

## 5. Per-Platform Inputs

When a Community Organizer connects Telegram:

| Field | Type | Required | Placeholder | Notes |
|---|---|---|---|---|
| Group/Channel link | url | Either this or username | `https://t.me/mycommunity` | Primary input |
| Group username | text | Either this or link | `@mycommunity` | Public supergroups only |
| Group name | text | No | `My Community` | User-provided label |

**Auto-parse:** `t.me/<username>` or `t.me/+<invite>` → extract username or invite hash.

**Stored as:**
```json
{
  "platform": "telegram",
  "label": "Telegram Community",
  "url": "https://t.me/mycommunity",
  "handle": "@mycommunity"
}
```

For deeper integration (when bot is added), additional fields are populated server-side:
```json
{
  "platform": "telegram",
  "label": "Telegram Community",
  "url": "https://t.me/mycommunity",
  "handle": "@mycommunity",
  "chatId": "-1001234567890",
  "topicsEnabled": true
}
```

---

## 6. Schema Additions

### 6.1 Users Table

```typescript
// Add to lib/db/schema/users.ts
telegramUserId: bigint('telegram_user_id', { mode: 'number' }).unique(),
telegramUsername: text('telegram_username'),
```

### 6.2 Integration Config (Telegram-Specific)

Extends `IntegrationConfig` in `types/index.ts`:

```typescript
// Telegram-specific fields in IntegrationConfig
telegramChatId?: number;         // Supergroup ID (negative number)
telegramBotIsAdmin?: boolean;    // Whether bot has admin privileges
telegramTopicsEnabled?: boolean; // Whether group has Topics
telegramPersonusTopicId?: number; // Dedicated Personus topic ID
telegramPrivacyMode?: boolean;   // Whether privacy mode is on
```

---

## 7. Value Messaging

| Card Headline | Detail |
|---|---|
| "Discover who in your group can help — without leaving Telegram" | "Add the Personus bot to your Telegram group. Members can search for skills, request introductions, and manage their profile — all inside Telegram with Mini Apps." |

**Why this messaging works:** It leads with capability discovery ("who can help"), keeps the experience inside Telegram (Mini Apps are the differentiator), and doesn't require members to leave their platform.

---

## 8. Rate Limits and Design Constraints

| Constraint | Limit | Design Response |
|---|---|---|
| Group messages | 20/minute | Use message editing + inline keyboards, not multiple messages |
| Global messages | 30/second | Queue with `@grammyjs/auto-retry` |
| Callback data | 64 bytes/button | Use lookup keys mapped to server state |
| Webhook timeout | ~10 seconds | Acknowledge fast, edit message with results |
| No member list | — | Build directory from interactions (opt-in) |
| No message history | — | Intelligence starts from bot addition |

---

## 9. Topics Integration

When the Personus bot is added to a supergroup with Topics enabled:

1. Bot detects Topics are enabled via `chat.is_forum` field
2. Optionally creates a dedicated "Personus" topic for bot interactions
3. Skill searches and introduction requests can be directed to this topic, keeping the main chat clean
4. Bot responds in the same topic where a command was issued (via `message_thread_id`)

---

## 10. Account Linking Flows

### 10.1 From Telegram (Bot → Mini App → Clerk)

```
User sends /link in group
  → Bot sends private message with "Link Account" button
  → Button opens Mini App
  → Mini App checks initData (Telegram user ID)
  → If not linked: shows Clerk auth flow
  → On Clerk success: stores telegramUserId on user record
  → User is now linked — all future bot interactions are personalized
```

### 10.2 From Web (Personus → Login Widget)

```
User goes to personus.ai → Settings → "Link Telegram"
  → Telegram Login Widget appears
  → User authorizes with Telegram
  → Server verifies HMAC, stores telegramUserId
  → User is now recognized in Telegram groups
```

### 10.3 Auto-Link on Mini App Launch

When a user opens any Personus Mini App from Telegram:
1. `initData` contains Telegram user ID
2. If user authenticates with Clerk inside the Mini App, link is established automatically
3. No separate "link" step needed

---

## 11. Environment Variables

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyz
TELEGRAM_BOT_USERNAME=PersonusBot
TELEGRAM_WEBHOOK_SECRET=random-secret-for-webhook-verification
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=PersonusBot
```

---

## 12. Implementation Phases

### Phase 1: Foundation
- [ ] Create `@BotFather` bot, obtain token
- [ ] Install `grammy` + plugins
- [ ] Create `app/api/telegram/route.ts` webhook endpoint
- [ ] Create `lib/telegram/bot.ts` with basic command handlers
- [ ] Create `lib/telegram/verify.ts` (initData + Login Widget verification)
- [ ] Add `telegramUserId` / `telegramUsername` to users schema
- [ ] Add `telegram` to `EXTERNAL_PLATFORM_TYPES` and `INTEGRATION_PLATFORMS`
- [ ] Run `db:push`

### Phase 2: Bot Commands
- [ ] Implement `/discover` → calls `personaSearchTool`
- [ ] Implement `/profile` → calls `getPersonaTool`
- [ ] Implement `/intro` → calls `requestIntroductionTool`
- [ ] Implement `/link` → account linking flow
- [ ] Implement `/help`, `/community`
- [ ] Build interactive menus with `@grammyjs/menu`

### Phase 3: Mini Apps
- [ ] Create `app/telegram/layout.tsx` with Telegram theme support
- [ ] Build profile editor Mini App
- [ ] Build skill search Mini App
- [ ] Build community dashboard Mini App
- [ ] Implement Login Widget on personus.ai settings page

### Phase 4: Deep Integration
- [ ] Topics detection and dedicated Personus topic creation
- [ ] Join/leave event tracking for member directory
- [ ] Community analytics (active skills, trending searches)
- [ ] Onboarding wizard Mini App for new members

---

## 13. Telegram Stars / Payments (Future)

Telegram's built-in payment system could enable:
- Premium community features paid via Stars
- Introduction fees for high-demand members
- Sparks credit system interop with Telegram Stars

**Not implementing now** — document for future consideration. Note the 30% Apple/Google cut on Star purchases.

---

## 14. Capability Tier Summary

| Tier | Capability | Telegram Support |
|---|---|---|
| **Tier 1: Link** | Invite URL, platform badge | Yes |
| **Tier 2: Notify** | Webhook events | Yes (via Bot API webhook) |
| **Tier 3: Interact** | Bot commands, skill search, introductions | Yes (slash commands + inline keyboards) |
| **Tier 4: Sync** | Join/leave tracking, identity bridging | Partial (no member list, but ChatMemberUpdated events) |
| **Tier 5: Embed** | Personus UI inside platform | **Yes** (Mini Apps — unique to Telegram) |

Telegram reaches **Tier 5** — the deepest integration level. Only Matrix (via Widget API) comes close.
