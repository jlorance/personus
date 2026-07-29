---
type: spec
title: Platform Integrations — Bot Architecture
description: "Mastra 1.26 ships a first-class channels primitive that subsumes ~60% of what Sections 4-8 of this spec describe: webhook routing, DM/mention/thread handling, deduplication, and per-thread memory.…"
status: current
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — Bot Architecture

> **Reconciliation note (2026-07-29):** Section 7 (Community Mapping) has been rewritten to match the shipped `resolveBoundCommunity` function. The `integrations` table no longer exists. The community resolver now queries `platformChannelBindings` using `externalRef` (not `platformEntityId`). The webhook route is the unified `/api/channels/[platform]/webhook` — not the per-platform routes described in the architecture diagram in §2.2 (which remains an accurate description of the *design intent* but the routes that shipped differ; see `apps/web/app/api/channels/[platform]/webhook/route.ts`). Sections §§4-6 and §§8-13 describe future infrastructure work (Fly.io, Matrix Appservice, rate limiting, health monitoring) that has not yet shipped.

> Date: 2026-02-23 (revised 2026-05-11)
> Status: Draft — hosting decision made; **Mastra Channels adopted as implementation vehicle for Tier 1-3**
> Depends on: `00-overview.md`, `01-shared-architecture.md`, `02-matrix.md`, `06-telegram.md`, `07-discord.md`, `08-slack.md`
> Prereq: PER-6 / PER-17 (MCP OAuth + principal delegation) must ship before any channel adapter goes live — channel handlers resolve a Personus principal via `asAgent()` before invoking agent tools.

---

## 0. Implementation Update — Mastra Channels (2026-05-11)

Mastra 1.26 ships a first-class `channels` primitive that subsumes ~60% of what Sections 4-8 of this spec describe: webhook routing, DM/mention/thread handling, deduplication, and per-thread memory. We are **adopting Mastra Channels as the implementation vehicle** for the "thin adapter" layer described in §1.

```typescript
// apps/web/lib/mastra/agents/discovery.ts (illustrative)
import { Agent } from '@mastra/core/agent';
import { createDiscordAdapter } from '@chat-adapter/discord';
import { createSlackAdapter } from '@chat-adapter/slack';

export const discoveryAgent = new Agent({
  id: 'discovery-agent',
  name: 'Personus Discovery',
  model: 'openai/gpt-4o',
  instructions: '…',
  channels: {
    adapters: {
      discord: createDiscordAdapter(),
      slack: createSlackAdapter(),
    },
    handlers: {
      // Resolve Personus principal from platform user before tool invocation.
      // See PER-6 / PER-17 for asAgent() delegation contract.
      onMention: async (ctx, next) => {
        const principal = await resolvePlatformPrincipal(ctx);
        return next({ runtimeContext: { principal } });
      },
    },
  },
});
```

### What Mastra Channels owns (delete from our scope)

| Concern | Old plan (this spec) | New: Mastra Channels |
|---|---|---|
| Webhook endpoint per platform | Hand-rolled `app/api/discord/interactions/route.ts`, `app/api/slack/*/route.ts`, `app/api/telegram/route.ts` | Auto-generated at `/api/agents/{agentId}/channels/{platform}/webhook` |
| DM / @mention / thread routing | `BotCommand` parser per adapter (§6) | Built into Channels handlers |
| Thread context | Hand-built history fetch | `threadContext: { maxMessages: N }` — fetches platform history on first mention, then subscribes via Mastra memory |
| Deduplication | Not designed | `dedupeTtlMs` in `chatOptions` |
| Bot identity | Per-adapter | `userName` (defaults to agent's `name`) |
| Channel-specific tools (reactions) | Not designed | `add_reaction` / `remove_reaction` provided by adapter |
| Inline media handling | Not designed | `inlineMedia` / `inlineLinks` config |
| State persistence (subscriptions) | Not designed | `MastraStateAdapter` backed by Mastra storage |

### What stays Personus's responsibility

| Concern | Why we still own it |
|---|---|
| `platform_channel_bindings` table | Operational records: tokens, community→platform mapping, status, organizer-visible UI. Mastra Channels does not model "which community is this channel?" |
| Community connection wizard UI | Personus-specific (`docs/specs/integrations/09-integrations-ui.md`) |
| Platform user → Personus principal resolution | `asAgent()` delegation (PER-6 / PER-17). Channels gives us the platform user; we must map to a Personus `userId` and load CASL abilities. |
| Visibility / `networkDepth` filtering on results | Personus's MCP visibility model lives in `apps/web/lib/mcp/tools.ts`. The channel handler calls those tools with the resolved principal; Mastra Channels itself has no concept of trust depth. |
| Slash command registration | Discord application manifest, Slack app manifest. Channels handles incoming events; command *definitions* still live with each platform's developer portal. |
| Telegram Mini Apps (Tier 5 embedded UI) | Out of scope for Channels — pure Next.js pages with `initData` auth. |
| Matrix Appservice (persistent process) | Out of scope for Channels — Mastra Channels is webhook-oriented; Matrix needs a long-running Appservice. Keep the Fly.io deployment plan in §3-5 for Matrix only. |

### Revised Two-Process Model

| Platform | Tier 1-3 | Tier 4 (Sync) | Tier 5 (Embed) | Process |
|----------|----------|---------------|----------------|---------|
| **Discord** | **Mastra Channels** (Next.js) | Gateway WebSocket (deferred) | — | Next.js + Fly.io (deferred) |
| **Slack** | **Mastra Channels** (Next.js) | Mastra Channels Events API (Next.js) | — | **Next.js only** |
| **Telegram** | **Mastra Channels when `@chat-adapter/telegram` ships** (Next.js); grammY fallback if needed | `ChatMemberUpdated` webhook | Mini Apps (Next.js pages) | **Next.js only** |
| **Matrix** | — | Appservice HTTP callbacks (persistent) | Widget API (Next.js pages) | **Fly.io** — unchanged |

§§3-5 (Vercel Fluid Compute, Fly.io deployment, Dockerfile/fly.toml) remain relevant **only for Matrix**. For Discord/Slack/Telegram Tier 1-3, Mastra Channels webhooks run in Next.js with no separate process.

### Prerequisites and sequencing

1. **PER-6 / PER-17 (MCP OAuth + principal delegation)** must ship first. The `onMention` / `onMessage` Channels handlers need a resolved `Principal` to call agent tools — the same delegation contract used by the MCP endpoint.
2. **Discord first** (PER-64 — see §18). Highest-value community surface, mature `@chat-adapter/discord`.
3. **Slack second** (PER-65). Most documented adapter; fully serverless.
4. **Telegram stubbed** (PER-66). File the work but gate on `@chat-adapter/telegram` availability; until then keep the existing grammY plan from §6-telegram.md viable.

### Risk: Mastra is beta (1.26)

Per CLAUDE.md, Mastra is pinned exactly (no `^`) for beta-stage stability. Channels is a newer surface. Mitigation: spike Slack first (smallest surface, fully serverless), validate behavior against the existing `DiscoveryAgent`, then promote.

---

## 1. Design Principle: One Brain, Many Mouths

> **Implementation update**: Mastra Channels (see §0) is the framework-level expression of this principle. The "thin adapter" below is now a `createXAdapter()` factory wired into the agent's `channels.adapters` map. The §1 narrative remains correct as the *design rationale*; the mechanical adapter described in §§4-8 is superseded by Channels for Discord/Slack/Telegram.


All platform bots share the same backend intelligence. Each bot is a **thin adapter** that translates platform-specific message formats into Personus tool calls and formats the responses back.

```
Matrix room → !personus search rust ─┐
                                      ├─→ Personus tools (lib/mastra/tools.ts) ─→ Results
Discord channel → /personus discover ─┤                                             │
                                      ├─→ Format for platform ◄────────────────────┘
Slack channel → /personus search ─────┤
                                      │
Telegram group → /discover rust ──────┘
```

**No bot should contain business logic.** All search, discovery, privacy enforcement, and introduction mediation lives in the existing Personus tools (`lib/mastra/tools.ts`, `lib/mcp/tools.ts`). Bots call these tools and format the response.

---

## 2. The Two-Process Model

A critical architectural insight emerged from the platform-specific specs: **most bot integrations don't need a separate process at all.**

### 2.1 What Runs Where

| Platform | Tier 1-3 (Commands) | Tier 4 (Sync) | Tier 5 (Embed) | Process Needed |
|----------|-------------------|---------------|-----------------|----------------|
| **Discord** | HTTP Interactions Endpoint (serverless) | Gateway WebSocket (persistent) | — | Next.js for Tier 1-3; Fly.io for Tier 4 |
| **Slack** | Events API + slash commands (serverless) | Events API (serverless) | — | **Next.js only** — all tiers serverless |
| **Telegram** | grammY webhook (serverless) | `ChatMemberUpdated` webhook (serverless) | Mini Apps (Next.js pages) | **Next.js only** — all tiers serverless |
| **Matrix** | — (no serverless path for commands) | Appservice HTTP callbacks (persistent) | Widget API (Next.js pages) | **Fly.io** — Appservice needs persistent registration |

**Result: Only Matrix and Discord Tier 4 require a separate long-running process.** Everything else runs in Next.js API routes on Vercel.

### 2.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│  Vercel (Next.js App)                                    │
│                                                          │
│  Web UI                                                  │
│  Server Actions                                          │
│  MCP Endpoint                                            │
│                                                          │
│  ┌─────────────────────────────┐                         │
│  │  Serverless Bot Endpoints   │                         │
│  │                             │                         │
│  │  POST /api/discord/interactions  ← Discord HTTP API   │
│  │  POST /api/slack/commands        ← Slack commands     │
│  │  POST /api/slack/interactions    ← Slack modals       │
│  │  POST /api/slack/events          ← Slack events       │
│  │  POST /api/telegram              ← Telegram webhook   │
│  └─────────────┬───────────────┘                         │
│                │                                         │
│  ┌─────────────▼───────────────┐                         │
│  │  Shared Personus Tools      │                         │
│  │  lib/mastra/tools.ts        │◄────────────────────┐   │
│  │  lib/mcp/tools.ts           │                     │   │
│  │  lib/db/queries.ts          │                     │   │
│  └─────────────────────────────┘                     │   │
│                                                      │   │
│  ┌─────────────────────────────┐                     │   │
│  │  Mini Apps / Widgets        │                     │   │
│  │  /telegram/profile          │                     │   │
│  │  /telegram/search           │                     │   │
│  │  /widgets/matrix/*          │                     │   │
│  └─────────────────────────────┘                     │   │
└──────────────────────────────────────────────────────┘   │
                                                           │
┌──────────────────────────────────────────────────────┐   │
│  Fly.io (Bot Process)                                │   │
│                                                      │   │
│  ┌──────────────────┐  ┌──────────────────────────┐  │   │
│  │  Matrix Appservice│  │  Discord Gateway         │  │   │
│  │  (matrix-bot-sdk) │  │  (discord.js, optional)  │  │   │
│  │                   │  │                          │  │   │
│  │  /sync polling    │  │  WebSocket → intents     │  │   │
│  │  !personus cmds   │  │  member join/leave       │  │   │
│  │  room events      │  │  presence updates        │  │   │
│  └────────┬──────────┘  └───────────┬──────────────┘  │   │
│           │                         │                 │   │
│           └─────────┬───────────────┘                 │   │
│                     │ HTTP calls                      │   │
│                     ▼                                 │   │
│           Personus API (Vercel) ──────────────────────┘   │
│           or direct DB access (same DATABASE_URL)         │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Vercel Fluid Compute vs. Fly.io

### 3.1 Why Not Vercel Fluid Compute

Vercel Fluid Compute was evaluated as a potential host for the persistent bot process. It does not work for this use case:

| Constraint | Vercel Fluid Compute | Requirement |
|-----------|---------------------|-------------|
| **WebSocket support** | Not supported | Matrix `/sync` and Discord Gateway require persistent WebSocket connections |
| **Max execution time** | 800 seconds (streaming) | Matrix Appservice and Discord Gateway run indefinitely |
| **Connection model** | Request/response (HTTP) | Bot processes maintain persistent bidirectional connections |
| **Process lifecycle** | Scales to zero between requests | Bot must be always-on to receive events |

Vercel Fluid Compute is excellent for what it does — long-running HTTP requests with smart queuing. But it is fundamentally a serverless compute model. Persistent WebSocket connections are outside its design.

**Vercel is perfect for Tier 1-3** (HTTP-based bot endpoints for Discord, Slack, Telegram). The serverless model aligns exactly with webhook-based bot architectures.

### 3.2 Why Fly.io

Fly.io is the right host for the persistent bot process:

| Feature | Why It Matters |
|---------|---------------|
| **Persistent processes** | VMs run indefinitely — no timeout. Matrix `/sync` and Discord Gateway stay connected. |
| **Affordable** | `shared-cpu-1x` with 256MB RAM: ~$3/month. Sufficient for a single bot process serving dozens of communities. |
| **Docker-based** | Same Node.js/Bun runtime as the main app. `Dockerfile` is the deployment unit. |
| **Global edge** | Deploy close to Vercel's edge for low-latency API calls. |
| **Fly Machines API** | Programmatic VM management — can scale bot processes per community if needed later. |
| **Zero-downtime deploys** | `fly deploy` does blue-green with health checks. |
| **Built-in secrets** | `fly secrets set` for tokens — no separate secrets manager. |
| **Volumes** | Optional persistent storage for Matrix sync tokens (though DB is preferred). |

### 3.3 Alternatives Considered

| Option | Verdict |
|--------|---------|
| **Railway** | Good DX, but more expensive at scale. Fly.io's pricing is better for always-on small processes. |
| **Render** | Background workers have cold starts. Not ideal for persistent connections. |
| **AWS ECS/Fargate** | Overkill for a single small process. Complex setup. |
| **Self-hosted VPS** | More ops burden, no auto-deploy from git. |
| **Vercel Cron** | Polling pattern — wasteful, high latency, doesn't work for WebSocket protocols. |

---

## 4. Codebase Strategy: Monorepo, Not Separate Service

### 4.1 Decision: Same Repository

The bot process lives in the **same Personus monorepo**, not a separate NitroJS/Hono/Express service. Reasons:

1. **Shared code** — The bot calls the same Personus tools (`lib/mastra/tools.ts`), queries (`lib/db/queries.ts`), and schemas (`lib/db/schema/`) as the main app. A separate repo means duplicating or publishing these as packages.

2. **Shared types** — `types/index.ts`, `lib/constants.ts`, and Drizzle schema types are used by both the web app and the bot. Keeping them in one repo means a single source of truth.

3. **Shared database** — Both processes connect to the same Neon Postgres database. Schema changes (via `db:push` or migrations) apply to both at once.

4. **Simpler CI/CD** — One repo, two deploy targets. A change to `lib/mastra/tools.ts` triggers both Vercel and Fly.io deploys.

5. **Consistent versions** — No version drift between the API the bot calls and the API the web app exposes.

### 4.2 Why Not NitroJS / Hono / Express

A lightweight server framework was considered for the bot process. The tradeoffs don't favor it:

| Concern | Monorepo | Separate Service |
|---------|----------|-----------------|
| **Code sharing** | Direct imports (`@/lib/...`) | Publish shared packages or duplicate code |
| **Type safety** | End-to-end, one `tsconfig.json` | Separate type definitions, possible drift |
| **Deploy complexity** | One repo, two targets | Two repos, two CI pipelines, version coordination |
| **Database schema** | One Drizzle config, one `db:push` | Must sync schema definitions separately |
| **Dev experience** | `bun run dev:bot` alongside `bun run dev` | Separate terminal, separate deps, separate config |
| **Testing** | Shared test infrastructure (Vitest) | Duplicate test setup |

**The bot is not a microservice.** It's a thin adapter that calls the same tools the web app uses. Splitting it into a separate service introduces coordination costs without meaningful isolation benefits.

### 4.3 Directory Structure

```
services/
  bot/
    index.ts              — Entry point: starts all bot adapters
    Dockerfile            — Docker image for Fly.io deployment
    fly.toml              — Fly.io configuration
    adapters/
      matrix/
        appservice.ts     — Matrix Appservice registration + event handling
        commands.ts       — !personus command parser + handlers
        formatter.ts      — Matrix HTML message formatting
        registration.yaml — Appservice registration file
      discord/
        gateway.ts        — Discord.js gateway client (optional, Tier 4 only)
        events.ts         — Member join/leave, presence updates
    shared/
      command-router.ts   — Routes parsed commands to Personus tools
      formatter.ts        — Platform-neutral result formatting
      health.ts           — Health check endpoint (Fly.io monitoring)
      logger.ts           — Structured logging (pino)

lib/                      — Shared with main Next.js app (imported directly)
  mastra/tools.ts         — Personus tools (search, profile, introduction)
  mcp/tools.ts            — MCP visibility filtering
  db/schema/              — Drizzle schema
  db/queries.ts           — Reusable query helpers
  constants.ts            — Shared constants
  utils.ts                — Shared utilities

types/                    — Shared TypeScript types
```

### 4.4 Entry Point

```typescript
// services/bot/index.ts
import { startMatrixAppservice } from './adapters/matrix/appservice';
import { startDiscordGateway } from './adapters/discord/gateway';
import { startHealthServer } from './shared/health';

async function main() {
  // Health check endpoint for Fly.io monitoring
  await startHealthServer(Number(process.env.PORT) || 8080);

  // Start platform adapters based on configured tokens
  if (process.env.MATRIX_BOT_ACCESS_TOKEN) {
    await startMatrixAppservice();
    console.log('[bot] Matrix Appservice started');
  }

  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_USE_GATEWAY === 'true') {
    await startDiscordGateway();
    console.log('[bot] Discord Gateway started');
  }

  console.log('[bot] All adapters running');
}

main().catch((err) => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
```

---

## 5. Fly.io Deployment

### 5.1 Dockerfile

```dockerfile
# services/bot/Dockerfile
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies (uses root package.json)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source (shared libs + bot service)
COPY lib/ ./lib/
COPY types/ ./types/
COPY services/bot/ ./services/bot/
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Build (if using TypeScript compilation; Bun can also run .ts directly)
# RUN bun build services/bot/index.ts --outdir=dist --target=bun

EXPOSE 8080
CMD ["bun", "run", "services/bot/index.ts"]
```

### 5.2 fly.toml

```toml
# services/bot/fly.toml
app = "personus-bot"
primary_region = "iad"  # US East — close to Vercel and Neon

[build]
  dockerfile = "services/bot/Dockerfile"
  # Docker context is the repo root (for lib/ imports)

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false    # Always on — bots need persistent connections
  auto_start_machines = true
  min_machines_running = 1      # At least one bot instance always running

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "30s"
    timeout = "5s"
    path = "/health"
```

### 5.3 Environment Variables

```bash
# Set via: fly secrets set KEY=VALUE
fly secrets set DATABASE_URL="postgres://..."
fly secrets set OPENAI_API_KEY="sk-..."
fly secrets set MATRIX_HOMESERVER_URL="https://matrix.org"
fly secrets set MATRIX_BOT_ACCESS_TOKEN="syt_..."
fly secrets set MATRIX_BOT_USER_ID="@personus-bot:matrix.org"
fly secrets set DISCORD_BOT_TOKEN="..."
fly secrets set DISCORD_APPLICATION_ID="..."
fly secrets set DISCORD_USE_GATEWAY="true"
```

### 5.4 Deploy Commands

```bash
# First deploy
cd services/bot
fly launch --name personus-bot --region iad --no-deploy
fly secrets set DATABASE_URL="..." OPENAI_API_KEY="..." # etc.
fly deploy --dockerfile services/bot/Dockerfile --build-arg ROOT=../..

# Subsequent deploys (from repo root)
fly deploy -a personus-bot --dockerfile services/bot/Dockerfile

# Monitor
fly logs -a personus-bot
fly status -a personus-bot
fly ssh console -a personus-bot
```

### 5.5 CI/CD Integration

```yaml
# .github/workflows/deploy-bot.yml (example)
name: Deploy Bot
on:
  push:
    branches: [main]
    paths:
      - 'services/bot/**'
      - 'lib/**'
      - 'types/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy -a personus-bot --dockerfile services/bot/Dockerfile
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Note: Changes to `lib/` trigger both Vercel (auto) and Fly.io deploys — this is intentional because both processes share the code.

---

## 6. Shared Command Interface

All platform adapters convert platform-native input into a common `BotCommand`, call the shared command router, and convert the `BotResponse` into platform-native output.

```typescript
// services/bot/shared/command-router.ts

interface BotCommand {
  name: 'search' | 'who-knows' | 'profile' | 'introduce' | 'help' | 'status';
  args: string[];
  communityId: string;     // Resolved from room/channel → integration mapping
  requesterId: string;     // Personus userId (resolved from platform identity)
  platform: 'matrix' | 'discord' | 'telegram' | 'slack';
}

interface BotResponse {
  text: string;            // Plain text fallback
  results?: SearchResult[];// Structured results for rich formatting
  ephemeral?: boolean;     // Only visible to requester (Discord/Slack)
  error?: string;          // Error message if command failed
}

interface SearchResult {
  personaId: string;
  displayName: string;
  headline: string;
  matchingTraits: string[];
  endorsementCount: number;
  score: number;
}

async function routeCommand(command: BotCommand): Promise<BotResponse> {
  switch (command.name) {
    case 'search':
    case 'who-knows':
      return handleSearch(command);
    case 'profile':
      return handleProfile(command);
    case 'introduce':
      return handleIntroduce(command);
    case 'status':
      return handleStatus(command);
    case 'help':
      return handleHelp(command);
  }
}
```

Each platform adapter is responsible only for:
1. Verifying the request signature (platform-specific)
2. Parsing platform-native input into `BotCommand`
3. Resolving the platform user ID to a Personus user ID
4. Formatting `BotResponse` into platform-native output (HTML for Matrix, embeds for Discord, Block Kit for Slack, inline keyboards for Telegram)

---

## 7. Room/Channel → Community Mapping

The bot needs to know which Personus community a platform room/channel belongs to. This is resolved via `resolveBoundCommunity` in `packages/db/src/services/platform-channels.ts` — the shipped function, not a hand-rolled query.

```typescript
// The shipped entry point (packages/db/src/services/platform-channels.ts)
export async function resolveBoundCommunity(
  platform: string,
  externalRef: string,
): Promise<{ communityId: string } | null> {
  const [b] = await db
    .select({ communityId: platformChannelBindings.communityId })
    .from(platformChannelBindings)
    .where(
      and(
        eq(platformChannelBindings.platform, platform),
        eq(platformChannelBindings.externalRef, externalRef),
        eq(platformChannelBindings.status, 'active'),
        isNull(platformChannelBindings.deletedAt),
      ),
    )
    .limit(1);
  return b ? { communityId: String(b.communityId) } : null;
}
```

**Key differences from the earlier design:**

- Query target: `platformChannelBindings` (not `integrations`)
- Lookup key: `externalRef` (not `platformEntityId` / `platformEntityName`)
- Filter: `status = 'active'` **and** `deleted_at IS NULL` — non-active and soft-deleted bindings are invisible to the webhook
- Return type: `{ communityId: string } | null` — returns the stringified bigint community id or null

The webhook route (`apps/web/app/api/channels/[platform]/webhook/route.ts`) calls `handlePlatformMessage` from `@personus/ai`, which in turn calls `resolveBoundCommunity`. Channel adapters do not need to perform the lookup directly.

**Matrix** does not use this resolver — Matrix community links are stored in `communities.externalPlatforms` JSONB, not in `platform_channel_bindings`. The Matrix Appservice (if/when built) would implement its own room→community lookup against that JSONB column.

> **Do not reference** `integrations.platformEntityId`, `integrations.config`, or the old `getCommunityForPlatformEntity` helper — the `integrations` table no longer exists.

---

## 8. Identity Resolution

When a bot receives a command, it needs to map the platform user to a Personus user. This uses the platform-specific ID columns on the `users` table.

```typescript
// lib/integrations/identity.ts (shared between serverless endpoints and bot process)
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type PlatformIdColumn = 'matrixUserId' | 'discordUserId' | 'slackUserId' | 'telegramUserId';

const PLATFORM_ID_COLUMNS: Record<string, PlatformIdColumn> = {
  matrix: 'matrixUserId',
  discord: 'discordUserId',
  slack: 'slackUserId',
  telegram: 'telegramUserId',
};

export async function resolvePersonusUser(
  platform: string,
  platformUserId: string,
): Promise<{ userId: string; linked: true } | { userId: null; linked: false }> {
  const column = PLATFORM_ID_COLUMNS[platform];
  if (!column) return { userId: null, linked: false };

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users[column], platformUserId))
    .limit(1);

  if (user) return { userId: user.id, linked: true };
  return { userId: null, linked: false };
}
```

**Unlinked users** can still use some bot commands (e.g., `/help`, `/status`). Commands that require a Personus identity (e.g., `/intro`) prompt the user to link their account first.

---

## 9. Privacy Enforcement

All bot responses respect Personus privacy settings. The same MCP visibility layer used by the web app applies to bot responses.

1. Bot receives command with `communityId` (derived from room/channel → integration lookup)
2. Search is scoped to community members only (unless `config.allowPublicSearch` is true)
3. Results filtered through `filterTraitsByVisibility()` from `lib/mcp/tools.ts`
4. No PII exposed that the user hasn't made visible at the appropriate level
5. Contact requests go through mediated flow — bot sends the request, never reveals contact info
6. Ephemeral responses used where supported (Discord, Slack) for sensitive queries

---

## 10. Rate Limiting

Each platform has its own rate limits. The bot process respects all of them:

| Platform | Limit | Strategy |
|----------|-------|----------|
| **Matrix** | ~10 messages/second per homeserver | Queue with backpressure |
| **Discord (HTTP)** | Global: 50 req/sec; Per-route limits | `discord-interactions` handles this |
| **Discord (Gateway)** | 120 events/minute | Rate-limit outgoing events |
| **Slack** | 1 message/sec per channel; bursts of ~10 | `@grammyjs/auto-retry` pattern |
| **Telegram** | 20 messages/min per group; 30/sec global | `@grammyjs/auto-retry` plugin |

**User-side rate limiting** (independent of platform limits): Each user is limited to 10 commands per minute per community to prevent abuse. Tracked in-memory (bot process) or via short-lived cache key (serverless).

---

## 11. Health Monitoring

The Fly.io bot process exposes a health endpoint:

```typescript
// services/bot/shared/health.ts
import { serve } from 'bun';

interface AdapterStatus {
  name: string;
  connected: boolean;
  lastEvent?: Date;
  communities: number;
}

let adapterStatuses: AdapterStatus[] = [];

export function registerAdapter(status: AdapterStatus) {
  adapterStatuses.push(status);
}

export async function startHealthServer(port: number) {
  serve({
    port,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/health') {
        const healthy = adapterStatuses.every((a) => a.connected);
        return Response.json(
          {
            status: healthy ? 'ok' : 'degraded',
            adapters: adapterStatuses,
            uptime: process.uptime(),
          },
          { status: healthy ? 200 : 503 },
        );
      }

      return new Response('Not found', { status: 404 });
    },
  });
}
```

Fly.io's health checks ping `/health` every 30 seconds. If the bot is degraded (a connection dropped), Fly.io can restart the VM.

---

## 12. Scaling Strategy

### Phase 1: Single Process (Now → Hundreds of Communities)

One Fly.io VM running all adapters. Sufficient for:
- ~100 Matrix communities (Appservice handles multiple rooms in one process)
- ~100 Discord servers (one Gateway connection handles all guilds)
- Total: hundreds of communities, thousands of users

Cost: ~$3/month.

### Phase 2: Per-Platform Scaling (Hundreds → Thousands)

If one platform's load exceeds a single process:
- Split adapters into separate Fly.io apps (`personus-bot-matrix`, `personus-bot-discord`)
- Each scales independently
- Shared code still imported from the same monorepo

### Phase 3: Per-Shard Scaling (Thousands → Tens of Thousands)

Discord Gateway supports sharding natively. Matrix can use multiple Appservice registrations. At this scale:
- Discord: multiple shards across multiple VMs (discord.js handles this)
- Matrix: multiple Appservice instances with namespace partitioning
- Each shard is a separate Fly.io Machine

**We don't need to build Phase 2-3 now.** The architecture supports it without rework.

---

## 13. Local Development

```bash
# Start the bot process locally
bun run services/bot/index.ts

# Or with hot reload
bun --watch services/bot/index.ts

# Add to package.json scripts
"dev:bot": "bun --watch services/bot/index.ts"
```

For Matrix development, use a local homeserver (Synapse via Docker) or a test account on matrix.org.

For Discord development, create a test bot application at discord.com/developers with a test server.

**Ngrok/Cloudflare Tunnel** — Not needed for the bot process (it initiates outbound connections). Only needed for testing the serverless webhook endpoints (Discord HTTP, Slack, Telegram) which need a public URL.

---

## 14. Environment Variables Summary

### Vercel (Next.js — serverless bot endpoints)

```env
# Discord HTTP Interactions
DISCORD_APPLICATION_ID=...
DISCORD_PUBLIC_KEY=...           # Ed25519 verification
DISCORD_BOT_TOKEN=...            # For deferred response follow-ups

# Slack
SLACK_SIGNING_SECRET=...         # HMAC-SHA256 verification
SLACK_BOT_TOKEN=xoxb-...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...

# Shared
DATABASE_URL=...
OPENAI_API_KEY=...
```

### Fly.io (Bot process — persistent connections)

```env
# Matrix
MATRIX_HOMESERVER_URL=https://matrix.org
MATRIX_BOT_ACCESS_TOKEN=syt_...
MATRIX_BOT_USER_ID=@personus-bot:matrix.org
MATRIX_APPSERVICE_TOKEN=...

# Discord Gateway (optional — only if using Gateway for Tier 4)
DISCORD_BOT_TOKEN=...
DISCORD_APPLICATION_ID=...
DISCORD_USE_GATEWAY=true

# Shared (same values as Vercel)
DATABASE_URL=...
OPENAI_API_KEY=...
```

---

## 15. Implementation Phases

> **Revised 2026-05-11** to reflect Mastra Channels adoption (see §0).

### Phase 0: Prerequisites
- [ ] PER-6 — Mastra agents act on behalf of authenticated users via `asAgent()` (merged)
- [ ] PER-17 — Logger + restricted-tier audit emission (merged)
- [ ] PER-5 — MCP OAuth principal delegation (in flight; channel handlers reuse this contract)

### Phase 1: Shared Channel Foundation
- [ ] `apps/web/lib/integrations/identity.ts` — platform user → Personus `userId` resolution (Discord, Slack first; Telegram, Matrix to follow)
- [ ] `apps/web/lib/integrations/community-resolver.ts` — channel/guild → `platform_channel_bindings` row → community
- [ ] `apps/web/lib/integrations/channels-principal.ts` — Mastra Channels `onMention`/`onMessage` handler that resolves a `Principal` and wraps tool calls with `asAgent()`
- [ ] Validation: anonymous (unlinked) users get a "link your Personus account" CTA; linked users get full-depth results scoped to `networkDepth`

### Phase 2: Discord via Mastra Channels (PER-64)
- [ ] Install `@chat-adapter/discord`
- [ ] Wire `createDiscordAdapter()` into the agent that will field channel messages (likely `DiscoveryAgent` or a new `CommunityCoachAgent`)
- [ ] Register Discord application + slash commands; point HTTP Interactions Endpoint at `/api/agents/{agentId}/channels/discord/webhook`
- [ ] Storage: confirm Mastra storage is configured for `MastraStateAdapter` (required by Channels)
- [ ] QA in a test Discord guild

### Phase 3: Slack via Mastra Channels (PER-65)
- [ ] Install `@chat-adapter/slack`
- [ ] Add `slack: createSlackAdapter()` to the same agent's `channels.adapters`
- [ ] Register Slack app + Events subscription; point at `/api/agents/{agentId}/channels/slack/webhook`
- [ ] App Home tab — out of scope for Mastra Channels; keep Block Kit App Home in `08-slack.md` as a separate Tier 3+ work item

### Phase 4: Telegram stub (PER-66)
- [ ] Confirm whether `@chat-adapter/telegram` exists; if yes, mirror Slack; if no, leave the grammY plan in `06-telegram.md` as the fallback and keep this ticket open
- [ ] Mini Apps (Tier 5) remain a separate Next.js pages work item — not blocked on Channels

### Phase 5: Persistent Bot (Fly.io) — Matrix only
- [ ] Create `services/bot/` directory structure (Matrix Appservice only — Discord/Slack/Telegram do not need it)
- [ ] Dockerfile, fly.toml
- [ ] Matrix Appservice adapter (matrix-bot-sdk)
- [ ] Health monitoring

### Phase 6: Discord Gateway (Optional, deferred)
- [ ] Tier 4 member sync / presence — only if a community demands it. Mastra Channels does not currently cover Gateway intents.

---

## 16. Cost Projection

| Component | Cost | Notes |
|-----------|------|-------|
| **Vercel** (serverless endpoints) | Included in existing plan | Webhook requests are lightweight |
| **Fly.io** (bot process) | ~$3/month | `shared-cpu-1x`, 256MB RAM, one region |
| **Fly.io** (scaled, Phase 2) | ~$6-12/month | 2-4 small VMs if splitting by platform |
| **Neon** (database) | Unchanged | Same database, marginal additional queries |

**Total additional infrastructure cost for bot support: ~$3/month.**

---

## 17. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Fly.io for persistent processes, not Vercel | Vercel has no WebSocket support and max 800s execution. Matrix Appservice and Discord Gateway need always-on connections. |
| 2 | Same monorepo, not separate service | Bot shares tools, types, schema, and database with the main app. A separate service means duplication or package publishing. |
| 3 | Serverless first, persistent second | Discord (HTTP), Slack (Events API), and Telegram (grammY) all run in Next.js. Build these first. Fly.io only needed for Matrix and Discord Tier 4. |
| 4 | Single bot process initially | One Fly.io VM runs all persistent adapters. Split by platform later if needed. ~$3/month. |
| 5 | Shared `BotCommand`/`BotResponse` interface | Thin adapters per platform, shared business logic. No bot contains business logic. |
| 6 | `services/bot/` directory (not `lib/bots/`) | Clarifies that this is a separately deployed service, not a library. Keeps `lib/` for shared code only. |
| 7 (2026-05-11) | **Adopt Mastra Channels for Discord/Slack/Telegram Tier 1-3** | Mastra 1.26 ships `channels` as a first-class agent primitive: auto-generated webhooks, DM/mention/thread routing, dedup, per-thread memory. Subsumes ~60% of §§4-8 hand-rolled infrastructure. Personus retains the `platform_channel_bindings` table, community resolution, principal delegation (PER-6/17), and visibility filtering. Matrix is unaffected (no Channels adapter; Appservice still required). |

---

## 18. Linked Tickets

| Ticket | Scope | Sequencing |
|---|---|---|
| PER-5 | MCP OAuth principal delegation | **Prereq** — channel handlers reuse the `asAgent()` contract |
| PER-6 | Mastra agent delegated authority (merged) | **Prereq** |
| PER-17 | Logger + restricted-tier audit (merged) | **Prereq** |
| PER-64 | Discord via Mastra Channels | First (this initiative) |
| PER-65 | Slack via Mastra Channels | Second |
| PER-66 | Telegram via Mastra Channels (stub) | Third, gated on `@chat-adapter/telegram` |
