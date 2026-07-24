---
type: research
title: Telegram Integration Research for Personus.ai
description: "Official docs: https://core.telegram.org/bots/api"
status: current
tags: [research]
timestamp: 2026-02-23
---

# Telegram Integration Research for Personus.ai

> **Date:** 2026-02-23
> **Purpose:** Comprehensive analysis of Telegram's bot API, Mini Apps, and community features to evaluate Telegram as a first-class platform option for Personus.ai's intelligence layer alongside Discord, Slack, Matrix, and WhatsApp.

---

## Table of Contents

1. [Telegram Bot API — Full Capabilities](#1-telegram-bot-api--full-capabilities)
2. [Group Types — Groups vs Supergroups vs Channels vs Topics](#2-group-types--groups-vs-supergroups-vs-channels-vs-topics)
3. [Bot Capabilities in Groups](#3-bot-capabilities-in-groups)
4. [Telegram Mini Apps (Web Apps)](#4-telegram-mini-apps-web-apps)
5. [Telegram Login Widget](#5-telegram-login-widget)
6. [Webhooks vs Long Polling](#6-webhooks-vs-long-polling)
7. [Bot API Rate Limits](#7-bot-api-rate-limits)
8. [Telegram Communities — Topics Feature](#8-telegram-communities--topics-feature)
9. [User Identification and Account Linking](#9-user-identification-and-account-linking)
10. [Bot Payments API](#10-bot-payments-api)
11. [File Sharing Capabilities](#11-file-sharing-capabilities)
12. [Telegram's Stance on Bots](#12-telegrams-stance-on-bots)
13. [Bot Frameworks — grammY vs Telegraf vs node-telegram-bot-api](#13-bot-frameworks--grammy-vs-telegraf-vs-node-telegram-bot-api)
14. [Privacy and Data](#14-privacy-and-data)
15. [Comparison with Discord and Slack](#15-comparison-with-discord-and-slack)
16. [Personus Integration Architecture](#16-personus-integration-architecture)

---

## 1. Telegram Bot API -- Full Capabilities

**Official docs:** https://core.telegram.org/bots/api

### Overview

The Telegram Bot API is an HTTP-based interface for building bots on Telegram. Bots are special accounts that do not require a phone number to set up. They run server-side code and communicate with Telegram through HTTPS requests. The API is mature, well-documented, and under active development (Bot API 8.0 shipped November 2025).

### Creating a Bot

1. Message `@BotFather` on Telegram
2. Send `/newbot` command
3. Choose a display name and username (must end in `bot`)
4. Receive your **bot token** (format: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyz`)
5. Configure with `/setdescription`, `/setabouttext`, `/setuserpic`, `/setcommands`

### Core Capabilities

| Capability | Description |
|---|---|
| **Messaging** | Send/receive text, photos, videos, documents, audio, voice notes, stickers, polls, locations, contacts, dice, animations |
| **Inline mode** | Users type `@botname query` in any chat; bot returns results displayed as cards |
| **Inline keyboards** | Interactive buttons attached to messages (callback buttons, URL buttons, switch-to-inline buttons, Mini App buttons) |
| **Custom reply keyboards** | Replacement keyboards shown to the user in chat |
| **Commands** | `/command` style interactions with autocomplete |
| **Payments** | Accept payments via Telegram Stars (digital goods) or third-party providers (physical goods) |
| **Mini Apps** | Full HTML5 web apps embedded in the Telegram interface |
| **File handling** | Upload up to 50MB, download up to 20MB (standard API) |
| **Group management** | Get member info, admin lists, member counts, ban/unban, promote/demote |
| **Chat administration** | Pin messages, delete messages, set chat photo/title/description |
| **Sticker management** | Create, edit, delete sticker packs and custom emoji packs |
| **Games** | HTML5 games playable solo or competitively |
| **Web Login** | Authenticate users on external websites via Telegram account |
| **Business features** | (Bot API 8.0) Manage Business Account branding, gift Premium subscriptions, native checklists |

### Bot API Updates (2025)

- **Bot API 8.0 (November 2025):** Added adaptive retry hints in 429 responses, paid broadcast for higher rate limits (up to 1000 msg/sec), native checklists, enhanced business account management, up to 12 poll options
- **Telegram Stars** matured as the standard payment method for digital goods/services
- **Mini Apps** gained fullscreen mode, device sensors (accelerometer, gyroscope, orientation), location services, device storage (5MB), secure storage (10 encrypted items), home screen shortcuts

---

## 2. Group Types -- Groups vs Supergroups vs Channels vs Topics

**Official docs:** https://core.telegram.org/api/channel

### Basic Groups

- Up to **200 members**
- Simple chat with no persistent message history for new members
- No topics support
- Limited admin controls
- **Relevance to Personus:** Too small and limited. Not useful for communities.

### Supergroups

- Up to **200,000 members**
- Persistent message history visible to new members
- Up to **50 administrators**
- Up to **20 bots** per group
- Fine-grained admin permissions (pin messages, delete messages, ban users, invite via link, manage topics, etc.)
- Support **Topics** (threaded sub-conversations)
- Anti-spam features, slow mode, member restrictions
- **Relevance to Personus:** The primary target. Most Telegram communities operate as supergroups. This is where Personus bot integration should focus.

### Channels

- **Unlimited subscribers**
- One-way broadcast (only admins post by default)
- Subscribers cannot see each other
- Can have linked discussion group (a supergroup for comments)
- Reactions and comments supported
- **Relevance to Personus:** Less relevant for community intelligence since members cannot interact with each other. However, a channel's linked discussion group (supergroup) is a valid Personus target.

### Gigagroups (Broadcast Groups)

- Converted from supergroups via `channels.convertToGigagroup`
- Hybrid between channel and supergroup
- Only admins can post, but members can see each other
- **Relevance to Personus:** Niche. Not a primary integration target.

### Summary for Personus

**Supergroups with Topics enabled** are the most relevant Telegram entity for Personus communities. They support large membership, bots, threaded discussions, and rich admin controls. The Personus `externalPlatforms` JSONB should store:

```json
{
  "platform": "telegram",
  "type": "supergroup",
  "chatId": -1001234567890,
  "botAdded": true,
  "topicsEnabled": true,
  "inviteLink": "https://t.me/+abc123..."
}
```

---

## 3. Bot Capabilities in Groups

### Message Visibility — Privacy Mode

**Official docs:** https://core.telegram.org/bots/features#privacy-mode

**Privacy mode is ON by default.** This is a critical design consideration.

| Bot Status | What the Bot Sees |
|---|---|
| **Privacy ON (default)** | Commands explicitly addressed to the bot (`/cmd@botname`), general commands (if bot was last to message), messages sent via the bot (inline), replies to bot messages, service messages (member join/leave), messages in private chats |
| **Privacy OFF** | All messages in the group except messages from other bots |
| **Bot is admin** | All messages regardless of privacy setting (except messages from other bots) |

**Implication for Personus:** For a community intelligence layer that needs to understand member skills and conversations:
- **Option A (Recommended):** Make the Personus bot a group admin. This gives full message visibility without requiring users to disable privacy mode. Admins typically add the bot, so requesting admin privileges is natural.
- **Option B:** Keep privacy mode on and rely entirely on explicit commands (`/whocando`, `/findexpert`, `/myskills`). Simpler from a privacy perspective but limits intelligence gathering.
- **Option C:** Disable privacy mode via BotFather. The bot sees all messages but cannot act on them with admin powers. Less control.

**Important:** Bots can never see messages from other bots, regardless of any settings. This prevents bot-to-bot loops.

### Slash Commands

**Registration:** Via `@BotFather` using `/setcommands` or programmatically via `bot.api.setMyCommands()`.

**Format:** `/command` — up to 32 characters, lowercase Latin letters, numbers, underscores.

**Command scopes** allow different command lists for different contexts:
- Default commands (all chats)
- Commands for all group chats
- Commands for all private chats
- Commands for specific groups
- Commands for specific users in specific groups

**Autocomplete:** Once registered with BotFather, commands appear as autocomplete suggestions when users type `/` in the chat.

**Proposed Personus commands for groups:**

```
/discover - Search for members with specific skills
/whocando - Find someone who can help with a task
/myskills - View/update your shared skills
/intro - Request an introduction to another member
/profile - View a member's Personus profile
/community - View community skill summary
/help - Show available commands
```

### Inline Keyboards and Callback Queries

Inline keyboards are buttons attached to messages. When pressed, they trigger a **callback query** instead of sending a message to the chat. This enables rich interactive UIs without cluttering the conversation.

**Button types:**
- **Callback buttons** — send data to bot, bot can update message or show alert
- **URL buttons** — open a web link
- **Mini App buttons** — open a Mini App (web_app type)
- **Switch-to-inline buttons** — insert the bot's inline mode into another chat
- **Login URL buttons** — authenticate users on external websites

**Callback data** is limited to **64 bytes** per button. For complex data, use a lookup key that maps to server-side state.

**Example interaction flow for Personus:**

```
User types: /discover TypeScript
Bot responds with message + inline keyboard:
  [Alice - Senior TS Dev] [Bob - TS + React]
  [Carol - Full Stack TS] [More Results >>]

User taps "Alice" button
Bot responds (or edits message):
  Alice Martinez
  Skills: TypeScript, React, Node.js
  Endorsements: 12
  [View Full Profile] [Request Intro] [Back to Results]
```

### Member Management

| Method | Description | Limitations |
|---|---|---|
| `getChatMemberCount` | Returns total member count | Count only, no member list |
| `getChatMember(chatId, userId)` | Get info about a specific member | Must know the userId in advance; only guaranteed to work for other users if bot is admin |
| `getChatAdministrators` | Returns list of all admins | Does not include other bots |
| `banChatMember` | Ban a user | Requires admin privileges |
| `unbanChatMember` | Unban a user | Requires admin privileges |
| `restrictChatMember` | Restrict user permissions | Requires admin privileges |
| `promoteChatMember` | Promote to admin | Requires admin privileges with sufficient permissions |

**Critical limitation: There is no API method to enumerate all members of a group.** The Bot API intentionally restricts this for privacy. To build a member directory, Personus must:

1. **Track join/leave events** via `ChatMemberUpdated` updates (configure `allowed_updates` to include `chat_member`)
2. **Register users on first interaction** — when a user first uses a `/command` or interacts with the bot
3. **Maintain a local member database** that maps Telegram user IDs to Personus accounts

This is actually architecturally aligned with Personus's model: members opt into the intelligence layer by interacting with the bot and linking their Personus persona.

### Message History Access

**Bots cannot access historical message history.** They only receive messages from the moment they are added to a group (or from the moment privacy mode is changed). There is no API to retrieve past messages.

This means Personus cannot retroactively analyze a community's conversation history. Integration begins from the moment the bot is added.

---

## 4. Telegram Mini Apps (Web Apps)

**Official docs:** https://core.telegram.org/bots/webapps | https://docs.telegram-mini-apps.com

**This is the most strategically important Telegram feature for Personus.** Mini Apps allow embedding a full web application inside the Telegram client, with native-feeling UI and seamless Telegram authentication.

### What Are Mini Apps?

Telegram Mini Apps (TMAs) are web applications built with standard web technologies (HTML, CSS, JavaScript/TypeScript) that run inside the Telegram client. They render in a webview that has access to Telegram-specific JavaScript APIs for authentication, payments, device features, and theming.

### Launch Methods (7 ways)

| Method | How It Works | Personus Use Case |
|---|---|---|
| **Bot menu button** | Persistent button in 1:1 bot chat; customizable text | "Open Personus" button in private bot chat |
| **Keyboard button** | `web_app` type keyboard button in chat | Quick access from group chat |
| **Inline keyboard button** | Button attached to a bot message | "View Full Profile" button on search results |
| **Inline mode** | Via `InlineQueryResultsButton` | Not primary for Personus |
| **Direct link** | `https://t.me/botusername/appname` | Shareable link to Personus app |
| **Attachment menu** | Quick access from any chat | "Search Personus" from attachment menu |
| **Profile button** | Main Mini App from bot profile | Primary entry point |

### Authentication — initData

When a Mini App launches, Telegram passes **signed initialization data** that the server can verify. This is zero-friction authentication — no login required.

**Data passed to the Mini App (`initDataUnsafe`):**

```typescript
interface WebAppInitData {
  query_id?: string;       // Unique session ID (for answering web app queries)
  user?: {
    id: number;            // Telegram user ID
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  receiver?: WebAppUser;   // Chat partner info (in attachment menu context)
  chat?: {
    id: number;
    type: string;          // "group", "supergroup", "channel"
    title: string;
    username?: string;
    photo_url?: string;
  };
  chat_type?: string;
  chat_instance?: string;  // Unique per-chat session identifier
  start_param?: string;    // Deep link parameter
  auth_date: number;       // Unix timestamp
  hash: string;            // HMAC-SHA-256 verification hash
  signature?: string;      // Ed25519 signature (for third-party verification)
}
```

### Server-Side Verification

The `hash` field allows your server to verify the data was genuinely issued by Telegram:

```typescript
import { createHmac, createHash } from 'crypto';

function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // Sort parameters alphabetically and join with newlines
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Create secret key from bot token
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Compute expected hash
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return expectedHash === hash;
}
```

### JavaScript API Highlights

The `window.Telegram.WebApp` object provides:

**UI Controls:**
- `MainButton` — primary action button at bottom of screen
- `SecondaryButton` — secondary action button
- `BackButton` — header back button
- `SettingsButton` — settings item in context menu
- `expand()` — maximize visible height
- `requestFullscreen()` / `exitFullscreen()` — fullscreen mode (Bot API 8.0+)
- `setHeaderColor()`, `setBackgroundColor()`, `setBottomBarColor()` — theming

**Dialogs and Interactions:**
- `showPopup()`, `showAlert()`, `showConfirm()` — native dialogs
- `showScanQrPopup()` — QR code scanner
- `requestContact()` — request user's phone number
- `shareMessage()` — share prepared inline messages

**Storage:**
- `CloudStorage` — up to 1024 items per user, 4KB each, synced across devices
- `DeviceStorage` — 5MB local persistent storage (Bot API 8.0+)
- `SecureStorage` — 10 encrypted items using Keychain/Keystore

**Device Features (Bot API 8.0+):**
- `Accelerometer`, `Gyroscope`, `DeviceOrientation`
- `LocationManager` — GPS location access
- `BiometricManager` — fingerprint/face authentication

**Theming:**
- `themeParams` object with dynamic colors matching user's Telegram theme
- CSS variables: `var(--tg-theme-bg-color)`, `var(--tg-theme-text-color)`, etc.
- `themeChanged` event for real-time updates

**Safe Area Management:**
- `SafeAreaInset` — system safe area (notches, status bars)
- `ContentSafeAreaInset` — Telegram UI safe area
- Available as CSS variables: `var(--tg-safe-area-inset-top)`, etc.

### Strategic Value for Personus

Mini Apps are a game-changer for Personus's Telegram integration. Instead of forcing users to leave Telegram to manage their profile or search for members, Personus can embed its **entire profile editor, search interface, and community dashboard** inside Telegram.

**Potential Mini App surfaces for Personus:**
1. **Member Directory** — searchable, filterable list of community members with skill tags
2. **Persona Editor** — edit your persona traits directly from Telegram
3. **Skill Search** — semantic search for "who can help with X"
4. **Introduction Request Flow** — request an intro, view trust chains, send messages
5. **Community Dashboard** — community skill heatmaps, recent activity, endorsement leaderboard
6. **Onboarding Wizard** — link/create Personus account, select which persona to share

---

## 5. Telegram Login Widget

**Official docs:** https://core.telegram.org/widgets/login

### Overview

The Telegram Login Widget allows external websites to authenticate users via their Telegram account. This is a lightweight OAuth-like flow that does not require Telegram Premium or any special user setup.

### Setup

1. Create a bot via `@BotFather`
2. Run `/setdomain` to link your website's domain to the bot
3. Embed the widget JavaScript on your site

### Widget HTML

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YourBotUsername"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write">
</script>
<script>
function onTelegramAuth(user) {
  // user = { id, first_name, last_name, username, photo_url, auth_date, hash }
}
</script>
```

Or redirect mode:
```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YourBotUsername"
  data-size="large"
  data-auth-url="https://personus.ai/api/auth/telegram/callback"
  data-request-access="write">
</script>
```

### Data Returned

```typescript
interface TelegramLoginData {
  id: number;           // Permanent Telegram user ID
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;    // Unix timestamp
  hash: string;         // Verification hash
}
```

**Note:** The user's phone number is NOT returned. Only the Telegram user ID, name, username, and photo.

### Server-Side Verification

```typescript
import { createHash, createHmac } from 'crypto';

function verifyTelegramLogin(data: Record<string, string>, botToken: string): boolean {
  const hash = data.hash;
  const checkArr = Object.keys(data)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${data[k]}`);
  const checkString = checkArr.join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
}
```

### Personus Integration

The Login Widget can serve as a Telegram identity linking mechanism for Personus:

1. User is logged into Personus via Clerk (primary auth)
2. In Settings, user clicks "Link Telegram Account"
3. Telegram Login Widget appears
4. User authorizes with Telegram
5. Personus stores `telegramUserId` in the `users` table
6. Now the Personus bot in Telegram groups can recognize this user and link interactions to their Personus account

This complements the planned AT Protocol linking (`atprotoHandle` field on users table).

---

## 6. Webhooks vs Long Polling

**Official docs:** https://core.telegram.org/bots/api#getting-updates

### Long Polling

The bot calls `getUpdates` repeatedly. Telegram holds the connection open until new updates arrive or the timeout expires.

```typescript
import { Bot } from 'grammy';
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
bot.start(); // Starts long polling
```

**Pros:** Simple setup, no public URL needed, great for development.
**Cons:** Resource-intensive, slight latency, cannot run on serverless platforms.

### Webhooks

Telegram POSTs updates to a URL you specify. Requires HTTPS with a valid certificate.

```typescript
import { Bot, webhookCallback } from 'grammy';
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Next.js App Router: app/api/telegram/route.ts
export const POST = webhookCallback(bot, 'std/http');
```

**Set the webhook:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://personus.ai/api/telegram"
```

**Pros:** Efficient, scales to zero, works with serverless (Vercel, etc.), real-time.
**Cons:** Requires public HTTPS URL, must respond within ~10 seconds, limited to ports 443, 80, 88, 8443.

**Allowed ports for webhooks:** 443, 80, 88, 8443 only.

### Recommendation for Personus

**Use webhooks in production.** Personus is already a Next.js app deployed on Vercel. A webhook endpoint at `/api/telegram` integrates naturally into the existing architecture. Use long polling only for local development (or a tool like ngrok to test webhooks locally).

**Critical constraint:** Webhook handlers must respond within approximately 10 seconds. For long-running operations (semantic search, AI agent calls), acknowledge the webhook immediately and process asynchronously. grammY provides the `webhookCallback` adapter for this.

---

## 7. Bot API Rate Limits

**Official docs:** https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this

### Standard Limits

| Scope | Limit |
|---|---|
| **Global** | ~30 messages per second per bot token |
| **Per private chat** | ~1 message per second |
| **Per group/channel** | 20 messages per minute (~1 every 3 seconds) |
| **Inline query results** | ~30 answers per second |
| **Bulk notifications** | ~30 messages per second total |

### Paid Broadcast (Bot API 8.0)

Bots can pay Telegram Stars to temporarily increase limits:
- Up to **1000 messages per second**
- Cost: 0.1 Stars per message above the free threshold
- Requirements: 100,000+ Stars balance, 100,000+ monthly active users

### Adaptive Retry (Bot API 8.0)

429 (Too Many Requests) responses now include an `adaptive_retry` field — a recommended sleep duration in milliseconds before retrying. This replaces the older `retry_after` seconds field.

### Practical Implications for Personus

The 20 messages/minute limit per group means the bot cannot spam results. Design interactions to:
- Use **message editing** (update existing messages) instead of sending new ones
- Use **inline keyboards** to paginate results within a single message
- Batch notifications and use queuing for multi-group operations
- For heavy operations (community-wide announcements), consider the paid broadcast API

---

## 8. Telegram Communities -- Topics Feature

**Official docs:** https://telegram.org/blog/topics-in-groups-collectible-usernames

### What Are Topics?

Topics are threaded sub-conversations within a supergroup. They function as individual mini-chats within the group, each with their own:
- Message history
- Pinned messages
- Shared media
- Notification settings

### Requirements

- Group must be a **supergroup** (basic groups do not support topics)
- Only group owners and admins with appropriate permissions can enable topics
- Originally required hundreds of members, but now available **for groups of any size**

### How They Work

- Each topic has a name, icon (emoji), and color
- Topics appear as a list in the group, similar to a forum layout
- Members can mute individual topics
- Bots receive a `message_thread_id` field in updates, indicating which topic a message belongs to
- Bots can send messages to specific topics by including `message_thread_id` in `sendMessage`

### Bot Interaction with Topics

```typescript
// Send a message to a specific topic
await bot.api.sendMessage(chatId, "Search results for 'TypeScript':", {
  message_thread_id: topicId,
});
```

The bot receives the `message_thread_id` for incoming messages, allowing it to respond in the correct topic.

### Personus Integration Opportunity

Topics map naturally to Personus community organization:
- A community could have a **"Personus"** or **"Member Directory"** topic dedicated to skill searches and introductions
- Bot interactions stay in the designated topic, keeping the main chat clean
- The bot can create and manage topics programmatically (e.g., auto-create an "Introductions" topic when added to a group)

**Suggested topic structure for a Personus-enabled community:**
- General (default)
- Skill Search (Personus bot interactions here)
- Introductions (meeting new members)
- [Other community-specific topics]

---

## 9. User Identification and Account Linking

### Telegram User IDs

Every Telegram user has a **permanent numerical user ID** (e.g., `123456789`). This ID:
- Never changes, even if the user changes their username or display name
- Is unique across all of Telegram
- Is included in every bot update (`from.id` field)
- Is an integer (not a string)

### Usernames

- Format: `@username` (alphanumeric + underscores, 5-32 characters)
- Optional — not all users have one
- Can be changed at any time
- Not suitable as a persistent identifier
- Can be resolved to a user ID via `contacts.resolveUsername` (MTProto only, not Bot API)

### What the Bot Receives About a User

```typescript
interface TelegramUser {
  id: number;                    // Permanent unique ID
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;             // May be absent
  language_code?: string;        // IETF language tag
  is_premium?: boolean;          // Telegram Premium subscriber
  added_to_attachment_menu?: boolean;
}
```

### Linking Strategy for Personus

**Approach: Store `telegramUserId` on the Personus users table.**

```sql
ALTER TABLE users ADD COLUMN telegram_user_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN telegram_username TEXT;
```

**Linking flows:**

1. **Bot-initiated (in Telegram):** User interacts with Personus bot in a group --> bot sends a private message with a "Link your Personus account" button --> button opens Mini App --> Mini App prompts Clerk auth --> on success, stores `telegram_user_id` on the user record.

2. **Web-initiated (on personus.ai):** User goes to Settings --> "Link Telegram" --> Telegram Login Widget --> on auth, stores `telegram_user_id` on the user record.

3. **Auto-link on first Mini App use:** When a user opens the Personus Mini App from a group, the initData contains their Telegram user ID. If they authenticate with Personus inside the Mini App, the link is established automatically.

### Anonymous Admins

Telegram allows admins to post anonymously (messages appear under the group name). However, **this has no effect on bots** — the bot still receives the actual `from.id` of the sender, even when the admin is posting anonymously. The `sender_chat` field indicates when a message is sent "on behalf of" a channel or group.

---

## 10. Bot Payments API

**Official docs:** https://core.telegram.org/bots/payments-stars (digital goods) | https://core.telegram.org/bots/payments (physical goods)

### Telegram Stars (Digital Goods)

Telegram Stars (`XTR`) are an in-app virtual currency:
- Users buy Stars via Apple/Google in-app purchases or `@PremiumBot`
- Developers receive Stars when users pay for digital goods/services
- Developers can withdraw Stars as Toncoins via [Fragment](https://fragment.com)

### Payment Flow

1. Bot sends an invoice (via `sendInvoice` or inline keyboard)
2. User sees a native payment UI (no personal info required for digital goods)
3. Telegram processes the payment
4. Bot receives a `SuccessfulPayment` update

### Subscription Billing

Telegram supports **Star subscriptions** — recurring payments where users are charged monthly in Stars. The bot receives notifications when subscriptions are created, renewed, or cancelled.

### Invoices in Groups

Invoices can be sent to groups and channels. Multiple users can pay the same invoice independently.

### Personus Relevance

This could enable:
- **Premium community features** paid via Stars (advanced analytics, unlimited searches)
- **Introduction fees** — a small Star fee to request an intro to a high-demand member
- **Sparks integration** — Personus's own credit system could interoperate with Telegram Stars

However, the 30% Apple/Google cut on Star purchases and Telegram's own commission should be factored into economics.

---

## 11. File Sharing Capabilities

### Standard Bot API Limits

| Operation | Limit |
|---|---|
| **Upload (bot sending files)** | 50 MB max |
| **Download (bot receiving files)** | 20 MB max |
| **File ID persistence** | File IDs are persistent and can be reused |

### Local Bot API Server (Self-Hosted)

For larger files, Telegram offers an [open-source Bot API server](https://github.com/tdlib/telegram-bot-api) that can be self-hosted:
- Uploads up to **2000 MB** (2 GB)
- Downloads without size limit (up to 2 GB)
- HTTP webhooks on any port
- Up to 100,000 webhook connections

### Supported File Types

Bots can send/receive: photos, videos, documents (any type), audio, voice notes, video notes (round videos), stickers, animations (GIF/MP4).

### Personus Relevance

File sharing is less critical for Personus's core use case (skill discovery, introductions). However, it could be useful for:
- Sharing profile cards as images
- Exporting community skill reports as PDFs
- Receiving portfolio samples or certifications

---

## 12. Telegram's Stance on Bots

### Official Support

Bots are a **first-class, officially supported** feature of Telegram. They have:
- Dedicated documentation at https://core.telegram.org/bots
- A dedicated creation tool (`@BotFather`)
- Regular API updates (multiple major versions per year)
- A news channel (`@BotNews`) for API updates
- Official support for Mini Apps, Payments, Games, and Business features
- A test environment for development

### Guidelines and Restrictions

- Bots must not be used for spam
- Bots must respect rate limits
- Bots must not collect or share user data without consent
- Digital goods/services must use Telegram Stars (no external payment for digital goods)
- Bots processing payments must comply with relevant regulations
- Bots can be reported by users and may be banned for policy violations

### Bot Verification

Telegram offers bot verification badges for established bots, increasing user trust.

### Ecosystem Maturity

Telegram's bot ecosystem is mature and growing. Major companies (banks, airlines, e-commerce) run production bots. The Mini Apps platform is increasingly used for full applications (crypto wallets, games, SaaS tools). The platform is significantly more open than WhatsApp's Business API and more accessible than Discord's developer portal.

---

## 13. Bot Frameworks -- grammY vs Telegraf vs node-telegram-bot-api

**Comparison:** https://grammy.dev/resources/comparison

### grammY (Recommended)

**Package:** `grammy` | **NPM:** ~137K weekly downloads | **GitHub:** https://github.com/grammyjs/grammY

- **TypeScript-first** — built from the ground up with TypeScript, types are clean and correct
- **Modern middleware system** — composer pattern, similar to Koa
- **Plugin ecosystem** — official plugins for conversations, menus, i18n, rate limiting, sessions, router, auto-retry, transformer throttler
- **Performance** — can handle ~100M updates/day
- **Documentation** — comprehensive, with inline Bot API reference hints
- **Always current** — supports the latest Bot API version immediately
- **Multi-runtime** — works in Node.js, Deno, Bun, Cloudflare Workers, browsers
- **Webhook support** — built-in adapters for Express, Fastify, Next.js, Hono, Koa, AWS Lambda, Cloudflare, and more
- **VS Code extension** available

**Next.js App Router integration:**

```typescript
// app/api/telegram/route.ts
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN not found');

const bot = new Bot(token);

bot.command('discover', async (ctx) => {
  const query = ctx.match; // text after the command
  // Call Personus semantic search...
  await ctx.reply(`Searching for members with skills in: ${query}`);
});

bot.command('myskills', async (ctx) => {
  // Open Mini App for profile editing
  await ctx.reply('Manage your skills:', {
    reply_markup: {
      inline_keyboard: [[
        { text: 'Open Profile Editor', web_app: { url: 'https://personus.ai/telegram/profile' } }
      ]]
    }
  });
});

export const POST = webhookCallback(bot, 'std/http');
```

**next.config.ts addition:**
```typescript
const nextConfig = {
  serverExternalPackages: ['grammy'],
};
```

### Telegraf

**Package:** `telegraf` | **NPM:** ~138K weekly downloads

- TypeScript support added in v4, but types are overly complex and hard to understand
- Middleware-based (similar to Express)
- Larger community but less actively maintained
- Often lags behind latest Bot API versions
- Less comprehensive documentation (generated API reference only)
- Plugin ecosystem has largely migrated to grammY

### node-telegram-bot-api (NTBA)

**Package:** `node-telegram-bot-api` | **NPM:** ~158K weekly downloads

- **No TypeScript support** — plain JavaScript, no type annotations
- EventEmitter-based architecture — does not scale well past ~50 lines
- Simplest API but leads to "spaghetti code" in larger projects
- Community-maintained types (`@types/node-telegram-bot-api`) but not first-class
- Still the most downloaded due to age and simplicity for small scripts

### Recommendation for Personus

**Use grammY.** It aligns with Personus's TypeScript-first architecture, has excellent Next.js integration, supports webhooks out of the box with the `std/http` adapter, and provides plugins for common needs (sessions, menus, conversations, rate limiting). The migration path from grammY is also the simplest if the project ever needs to scale to a separate service.

**Key grammY plugins to install:**

```bash
bun add grammy @grammyjs/menu @grammyjs/conversations @grammyjs/session @grammyjs/auto-retry
```

| Plugin | Purpose |
|---|---|
| `@grammyjs/menu` | Interactive inline keyboard menus with state |
| `@grammyjs/conversations` | Multi-step conversation flows (wizard pattern) |
| `@grammyjs/session` | Session management (per-user/per-chat state) |
| `@grammyjs/auto-retry` | Automatic retry on 429 errors with backoff |
| `@grammyjs/router` | Route updates based on custom logic |
| `@grammyjs/transformer-throttler` | Outgoing API call rate limiting |

---

## 14. Privacy and Data

### What User Data Does a Bot Receive?

| Data | When Received | Privacy Consideration |
|---|---|---|
| User ID (numeric) | Every update | Permanent identifier |
| First name | Every update | Required by Telegram |
| Last name | Every update | Optional, may be absent |
| Username | Every update | Optional, may be absent, can change |
| Language code | Every update | IETF tag (e.g., "en") |
| Is Premium | Every update | Boolean flag |
| Phone number | Only if user explicitly shares via `requestContact()` | Requires explicit user action |
| Photo URL | Login Widget and Mini App only | Not in regular bot updates |

### What a Bot Does NOT Receive

- Phone number (unless explicitly shared)
- Email address
- Last seen / online status
- Profile bio
- Contacts list
- Other group memberships
- Message read receipts
- Location (unless user explicitly sends it or Mini App requests it)

### Anonymous Users in Groups

- Users can set their privacy to hide their phone number from everyone
- Users can hide their profile photo from non-contacts
- Users can hide their "last seen" timestamp
- Admins can enable "Remain Anonymous" to post as the group name
- **None of these affect what the bot sees** — the bot always receives the user's ID, name, and username (if set)

### GDPR Considerations

- Personus should maintain a clear privacy policy for its Telegram bot
- Users should be able to opt out and have their data deleted
- The bot should only store data necessary for its function
- Consider implementing a `/deletemydata` command
- Mini App should display privacy policy and data handling information

---

## 15. Comparison with Discord and Slack

### Feature Comparison

| Feature | Telegram | Discord | Slack |
|---|---|---|---|
| **Max group size** | 200K (supergroup) | 500K (server) | Unlimited (workspace) |
| **Bot API maturity** | Very mature, well-documented | Mature, well-documented | Very mature, enterprise-grade |
| **Rich interactive UI** | Inline keyboards, Mini Apps | Buttons, modals, slash commands | Block Kit, modals, workflows |
| **Embedded web apps** | Mini Apps (full HTML5) | None (limited embeds) | None (limited unfurling) |
| **Authentication** | Login Widget + Mini App initData | OAuth2 | OAuth2 |
| **File upload limit (bot)** | 50 MB (2 GB self-hosted) | 25 MB (free) / 100 MB (Nitro) | Varies by plan |
| **Message history access** | No (bot sees only new messages) | Yes (read channel history) | Yes (conversations.history) |
| **Member list enumeration** | No (track joins only) | Yes (list guild members) | Yes (users.list) |
| **Threaded conversations** | Topics (forum-style) | Threads + Forum channels | Threads |
| **Payment integration** | Telegram Stars (built-in) | None built-in | None built-in |
| **Voice/video** | Voice chats in groups | Voice channels, streaming | Huddles, clips |
| **E2E encryption** | Secret chats only (not groups) | None | None (EKM for Enterprise) |
| **Slash commands** | `/command` with autocomplete | `/command` with options, subcommands, autocomplete | `/command` with dialog forms |
| **Rate limits** | 30 msg/sec global, 20/min per group | 50 req/sec per route | Tiered (1 req/sec to 100/min) |
| **Platform openness** | Very open, self-hostable API | Open API, restricted to their infra | Open API, restricted to their infra |
| **Privacy controls** | Strong user-level privacy | Limited | Employer controls workspace data |
| **Cost to deploy** | Free (bot API is free) | Free tier + Nitro | Free tier + paid plans |
| **Global reach** | 900M+ users, strong in CIS/Asia/Europe | 200M+ users, strong in gaming/tech | 65M+ users, strong in enterprise |

### Where Telegram Is Better for Personus

1. **Mini Apps** — No other platform offers anything comparable. Personus can embed its full UI inside Telegram. Discord has nothing similar. Slack has no embedded web app capability.

2. **Zero-friction auth** — Mini App initData provides authenticated user identity with no OAuth flow, no redirects, no password entry. Discord and Slack require OAuth2 consent screens.

3. **Payment integration** — Telegram Stars enables in-app payments for premium features. Discord and Slack have no built-in payment system.

4. **Privacy-first design** — Telegram's privacy mode gives users control over what the bot sees. Discord bots see everything by default with the Message Content intent.

5. **Global reach** — 900M+ users, especially strong outside the US (Europe, CIS, Middle East, Southeast Asia, South America). This complements Discord (US/gaming) and Slack (US/enterprise).

6. **Self-hostable Bot API** — The API server is open source. Personus could self-host for higher limits if needed.

### Where Telegram Is Worse for Personus

1. **No member list enumeration** — Cannot get all members of a group. Discord and Slack both allow this. Personus must build its member directory incrementally from interactions.

2. **No message history access** — Cannot read past messages. Discord's `messages.list` and Slack's `conversations.history` allow retroactive analysis. Personus cannot analyze existing conversations when first added.

3. **Weaker slash command system** — Telegram commands are simple strings. Discord slash commands support typed options, subcommands, autocomplete, and rich parameter types. Slack commands support dialog forms.

4. **Group message rate limiting** — 20 messages/minute per group is restrictive. Discord allows 5 messages/5 seconds per channel. Slack allows ~1 message/second per channel.

5. **Less structured group management** — Telegram's roles are simpler (member/admin/creator). Discord has a full role hierarchy with per-channel permissions. Slack has workspace/channel-level permissions.

6. **No role system** — Telegram has admin/member only. Discord has arbitrary custom roles with color, permissions, hierarchy. This limits how Personus can map community roles.

---

## 16. Personus Integration Architecture

### Recommended Approach

Build a **three-layer integration:**

1. **Telegram Bot (grammY)** — handles commands, manages group interactions, sends/receives messages
2. **Telegram Mini App (Next.js)** — embeds Personus UI inside Telegram for rich interactions (profile editing, search, introductions)
3. **Telegram Login Widget** — links Telegram identity to Personus account from the web app

### File Structure (Proposed)

```
lib/telegram/
  bot.ts                  — grammY bot instance, command handlers
  commands/
    discover.ts           — /discover command handler
    myskills.ts           — /myskills command handler
    intro.ts              — /intro command handler
    profile.ts            — /profile command handler
    community.ts          — /community command handler
    help.ts               — /help command handler
    link.ts               — /link command handler (link Personus account)
  middleware/
    auth.ts               — Verify user is linked to Personus account
    rate-limit.ts         — Per-user rate limiting
    logging.ts            — Log bot interactions
  menus/
    search-results.ts     — Interactive search result menu
    profile-card.ts       — Profile display with action buttons
    intro-request.ts      — Introduction request flow
  mini-app/
    verify.ts             — Verify Mini App initData
    routes.ts             — Mini App API routes
  webhook.ts              — Webhook setup and management
  types.ts                — Telegram-specific type definitions
  utils.ts                — Helpers (format profile cards, etc.)

app/api/telegram/
  route.ts                — Webhook endpoint (grammY webhookCallback)

app/api/auth/telegram/
  callback/route.ts       — Login Widget callback

app/telegram/
  profile/page.tsx        — Mini App: Profile editor
  search/page.tsx         — Mini App: Skill search
  community/page.tsx      — Mini App: Community dashboard
  layout.tsx              — Mini App layout (Telegram theme, safe areas)
```

### External Platform Schema Update

The existing `externalPlatforms` JSONB on the `communities` table should support:

```typescript
interface TelegramPlatformConfig {
  platform: 'telegram';
  chatId: number;              // Supergroup ID (negative number)
  chatTitle: string;
  chatUsername?: string;        // @username if public
  botAdded: boolean;
  botIsAdmin: boolean;
  privacyMode: boolean;        // Whether privacy mode is on
  topicsEnabled: boolean;
  personusTopicId?: number;    // ID of the dedicated Personus topic
  inviteLink?: string;
  linkedAt: string;            // ISO timestamp
  memberCount?: number;
  syncStatus: 'active' | 'paused' | 'disconnected';
}
```

### User Table Schema Update

```sql
ALTER TABLE users ADD COLUMN telegram_user_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN telegram_username TEXT;
ALTER TABLE users ADD COLUMN telegram_linked_at TIMESTAMPTZ;
```

### Environment Variables

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyz
TELEGRAM_BOT_USERNAME=PersonusBot
TELEGRAM_WEBHOOK_SECRET=random-secret-for-webhook-verification
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=PersonusBot
```

### User Journey: Adding Personus to a Telegram Community

1. Community admin adds `@PersonusBot` to their supergroup
2. Bot sends a welcome message explaining what it does
3. Admin grants bot admin privileges (recommended for full functionality)
4. Bot registers itself and creates a "Personus" topic (if topics are enabled)
5. Members use `/link` to connect their Personus accounts (opens Mini App)
6. Linked members can use `/discover`, `/intro`, `/myskills`, and the Mini App
7. Community admin configures integration settings via Mini App dashboard

### Interaction Examples

**Skill discovery in group:**
```
User: /discover TypeScript experts
Bot: Found 3 members with TypeScript skills:

  Alice M. — Senior TS Dev (5+ years)
  ⭐ 12 endorsements | Available for mentoring

  Bob K. — Full Stack (TS + React)
  ⭐ 8 endorsements | Open to projects

  Carol S. — TypeScript + Node.js
  ⭐ 5 endorsements | Available now

  [View Details] [Request Intro] [Search Again]
```

**Profile card in group:**
```
User: /profile @alice
Bot:
  Alice Martinez
  Senior Software Engineer

  Skills: TypeScript, React, Node.js, PostgreSQL, AWS
  Offerings: Mentoring (2h/week), Code Review
  Endorsements: 12

  [Full Profile] [Request Intro] [Endorse]
```

### Packages to Add

```bash
bun add grammy @grammyjs/menu @grammyjs/conversations @grammyjs/session @grammyjs/auto-retry
```

### Next Steps for Implementation

1. **Phase 1: Bot Foundation** — Create grammY bot, webhook endpoint, basic commands, account linking
2. **Phase 2: Mini App** — Build profile editor, search UI, and community dashboard as Mini App pages
3. **Phase 3: Intelligence Layer** — Connect to Personus semantic search, endorsements, recommendations
4. **Phase 4: Deep Integration** — Topic management, automated onboarding, community analytics

---

## References

### Official Telegram Documentation
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Bot Features](https://core.telegram.org/bots/features)
- [Telegram Bots FAQ](https://core.telegram.org/bots/faq)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [Bot Payments API (Stars)](https://core.telegram.org/bots/payments-stars)
- [Bot Payments API (General)](https://core.telegram.org/bots/payments)
- [Channels, Supergroups, Gigagroups, Basic Groups](https://core.telegram.org/api/channel)
- [Bot API Changelog](https://core.telegram.org/bots/api-changelog)
- [Telegram Bot API Server (self-hosted)](https://github.com/tdlib/telegram-bot-api)

### Community Resources
- [grammY — The Telegram Bot Framework](https://grammy.dev/)
- [grammY Framework Comparison](https://grammy.dev/resources/comparison)
- [grammY Deployment Types (Webhooks vs Polling)](https://grammy.dev/guide/deployment-types)
- [grammY GitHub](https://github.com/grammyjs/grammY)
- [Telegram Mini Apps Documentation](https://docs.telegram-mini-apps.com)
- [Awesome Telegram Mini Apps](https://github.com/telegram-mini-apps-dev/awesome-telegram-mini-apps)

### Guides and Tutorials
- [Create a Telegram Bot in Next.js App Router](https://www.launchfa.st/blog/telegram-nextjs-app-router)
- [Telegram Bot Development Guide 2025](https://wnexus.io/the-complete-guide-to-telegram-bot-development-in-2025/)
- [Everything You Need to Know About Telegram Mini Apps -- 2026 Guide](https://magnetto.com/blog/everything-you-need-to-know-about-telegram-mini-apps)
- [Telegram Topics Guide](https://blog.invitemember.com/telegram-topics/)
- [grammY Flood Limits Guide](https://grammy.dev/advanced/flood)

### Platform Comparison
- [Telegram vs Discord: Which Is Better in 2025?](https://mymembers.io/blog/telegram-vs-discord)
- [Slack vs Discord vs Telegram in 2025](https://ts2.tech/en/slack-vs-discord-vs-telegram-in-2025-which-one-is-really-best-for-you/)
