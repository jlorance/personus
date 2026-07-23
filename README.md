# Personus

AI-native capability-discovery network — a fresh monorepo foundation.

> Your value is what you can **do**, not what you post.

## Stack

| Concern            | Choice                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Monorepo           | Turborepo + Bun workspaces                                             |
| Web / UI           | Next.js 16, React 19, Tailwind v4                                      |
| Agentic UI         | **CopilotKit** (via the AG-UI protocol)                               |
| Agents             | **Mastra 1.51** (in-process)                                          |
| Database           | Neon Postgres + **Drizzle V1** (pgvector)                             |
| AuthN              | Pluggable provider seam — **Clerk** default, WorkOS stub               |
| AuthZ              | **CASL** (`@personus/authz`)                                          |
| Feature flags      | **OpenFeature** — DB-backed default, PostHog/LaunchDarkly stubs        |
| Load testing       | **Artillery**                                                         |
| Lint/format        | Biome                                                                 |

## Layout

```
apps/web            Next.js app — CopilotKit sidebar → Persona Coach (Mastra)
packages/
  db                Drizzle schema (inherited), migrations, seed, settings cache
  authz             CASL abilities + DB-backed permission checks
  auth              AuthN provider seam (Clerk/WorkOS), Principal, system actors
  flags             OpenFeature feature-flag seam (DbProvider default)
  ai                Mastra instance + Persona Coach agent + PlatformChannels seam
  contact           ContactRelay — privacy-mediated contact delivery
  notifications     NotificationTransport — in-app/email/digest
  constants types validations logger timeout typescript-config
test/artillery      Smoke load test
```

## The three "channel" concepts (deliberately de-conflated)

The prior codebase overloaded the word *channel* three ways. Here they are separate and never share a name:

1. **PlatformChannels** (`@personus/ai`) — bot surfaces on Slack/Discord/Telegram, built on Mastra's first-class `channels` primitive. Persisted as the lean `platform_channel_bindings` table (replaces the old `integrations` table).
2. **ContactRelay** (`@personus/contact`) — privacy-mediated contact delivery (formerly `ContactChannelAdapter`). Requests never store raw contact details.
3. **NotificationTransport** (`@personus/notifications`) — ordinary in-app/email/digest notifications.

## Getting started

```bash
bun install
cp .env.example .env            # fill in DATABASE_URL (Neon) + OPENAI_API_KEY

bun run db:generate             # generate the initial migration
bun run db:migrate              # apply it
bun run db:seed                 # reference data + feature flags

bun run dev                     # http://localhost:3000 — open the coach sidebar
```

Quality gates:

```bash
bun run type-check
bun run lint
bun run test                    # vitest (CASL + flags + timeout)
bun run test:load               # artillery smoke (dev server must be running)
```

> Note on versions: Drizzle V1 is currently published as `1.0.0-rc.4` (release
> candidate — a final `1.0.0` is not on npm yet); we track the V1 line at that
> RC. Mastra is pinned to `1.51.0`, Next.js to `16.2.11`, Bun to `1.3.14`.
