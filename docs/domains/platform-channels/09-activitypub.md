---
type: spec
title: Platform Integrations — ActivityPub / Fediverse
description: "ActivityPub is the W3C federation protocol that powers Mastodon, Lemmy, PeerTube, Pixelfed, and (partially) Threads. This spec documents what ActivityPub can do for Personus — and what it can't."
status: planned
tags: [platform-channels]
timestamp: 2026-02-23
---

# Platform Integrations — ActivityPub / Fediverse

> Date: 2026-02-23
> Status: Draft — strategic opportunity
> Depends on: `00-overview.md`, `01-shared-architecture.md`
> Research: `docs/research/at_protocol_integration.md`

ActivityPub is the W3C federation protocol that powers Mastodon, Lemmy, PeerTube, Pixelfed, and (partially) Threads. This spec documents what ActivityPub can do for Personus — and what it can't.

---

## 1. Why ActivityPub Matters for Personus

Personus's core thesis is that communities are **intelligence layers** — structured capability networks that live on top of communication platforms. ActivityPub extends this to the open web.

| Opportunity | What It Means |
|-------------|--------------|
| **Communities as federated actors** | A Personus community becomes a `Group` actor that other fediverse servers can follow. When the Portland Rust Guild gains a WebAssembly expert, that capability is announced to followers across the fediverse. |
| **WebFinger discovery** | `@portlandrustguild@personus.ai` resolves to a machine-readable community profile. Anyone on Mastodon, Lemmy, or any ActivityPub client can look up a Personus community by handle. |
| **Capability announcements** | No one else publishes aggregated, anonymized capability data to the fediverse. "3 new members with Kubernetes expertise joined this week" is a signal that helps people find the right community. |
| **Decentralized reputation** | Endorsements, trust signals, and community activity can be expressed as ActivityPub activities. A Mastodon user can see "this community has 47 members and 120 endorsements" without visiting personus.ai. |
| **Open web alignment** | Personus already plans AT Protocol integration. Adding ActivityPub means Personus communities are discoverable from both the Bluesky ecosystem and the Mastodon/fediverse ecosystem — covering the two major open social web protocols. |

### 1.1 What ActivityPub Does NOT Do

- **Not a replacement for platform bots.** ActivityPub is a federation protocol, not a real-time chat protocol. It doesn't give us bot access to Mastodon instances.
- **Not a way to read private conversations.** All ActivityPub content is either public or followers-only. We can't see DMs or private group conversations.
- **Not a reliable bridge to Threads.** Meta's Threads federation is opt-in and limited — only ~25K users (out of 300M+) have enabled it. Don't build strategy around Threads federation.
- **Not a high-traffic channel.** The fediverse has ~13M total users (Mastodon ~8.7M registered, ~1.8M active). It's a quality audience (tech-savvy, community-oriented), not a mass-market channel.

---

## 2. Core Concepts

### 2.1 Actors

In ActivityPub, everything that can send or receive messages is an **Actor**. Actors have inboxes, outboxes, and followers.

Personus maps communities to `Group` actors:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Group",
  "id": "https://personus.ai/ap/communities/portland-rust-guild",
  "preferredUsername": "portlandrustguild",
  "name": "Portland Rust Guild",
  "summary": "120 software developers sharing Rust expertise in Portland, OR. Skills: systems programming, WebAssembly, async Rust, embedded. Open for mentoring and contract work.",
  "url": "https://personus.ai/communities/portland-rust-guild",
  "inbox": "https://personus.ai/ap/communities/portland-rust-guild/inbox",
  "outbox": "https://personus.ai/ap/communities/portland-rust-guild/outbox",
  "followers": "https://personus.ai/ap/communities/portland-rust-guild/followers",
  "icon": {
    "type": "Image",
    "url": "https://personus.ai/communities/portland-rust-guild/avatar.png"
  },
  "publicKey": {
    "id": "https://personus.ai/ap/communities/portland-rust-guild#main-key",
    "owner": "https://personus.ai/ap/communities/portland-rust-guild",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
  }
}
```

### 2.2 Activities

Activities are the verbs of ActivityPub. Personus communities publish:

| Activity | When | Example |
|----------|------|---------|
| `Create` + `Note` | Capability announcement | "3 new members with Kubernetes expertise joined this week" |
| `Create` + `Note` | Community milestone | "Portland Rust Guild now has 120 members across 47 skill areas" |
| `Create` + `Note` | Event/offering | "The guild is offering free code review sessions this month" |
| `Update` + `Group` | Community profile changes | Updated summary, new skill areas, member count |
| `Accept` + `Follow` | Someone follows the community | Auto-accept (public communities) or manual (private) |

**What we do NOT publish:**
- Individual member identities or profiles (privacy)
- Specific endorsement details
- Contact requests or introductions
- Any data from platform integrations (Discord messages, Slack conversations, etc.)

### 2.3 WebFinger

WebFinger (RFC 7033) is how the fediverse resolves `@user@domain` handles to actor URLs.

```
GET /.well-known/webfinger?resource=acct:portlandrustguild@personus.ai

{
  "subject": "acct:portlandrustguild@personus.ai",
  "aliases": [
    "https://personus.ai/ap/communities/portland-rust-guild"
  ],
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://personus.ai/ap/communities/portland-rust-guild"
    },
    {
      "rel": "http://webfinger.net/rel/profile-page",
      "type": "text/html",
      "href": "https://personus.ai/communities/portland-rust-guild"
    }
  ]
}
```

This means anyone on Mastodon can search `@portlandrustguild@personus.ai` and find the community.

### 2.4 NodeInfo

NodeInfo (RFC-like convention) advertises server metadata so fediverse crawlers and dashboards know what Personus is:

```
GET /.well-known/nodeinfo → links to /nodeinfo/2.1

{
  "version": "2.1",
  "software": {
    "name": "personus",
    "version": "1.0.0"
  },
  "protocols": ["activitypub"],
  "usage": {
    "users": { "total": 1200, "activeMonth": 450 },
    "localPosts": 89
  },
  "openRegistrations": true,
  "metadata": {
    "description": "AI-native social network for capability-based community discovery"
  }
}
```

---

## 3. Technical Architecture

### 3.1 Framework: Fedify

**Package:** `@fedify/fedify` with `@fedify/next` (Next.js adapter)

Fedify is a TypeScript-first ActivityPub server framework:
- Built for Next.js (first-class `@fedify/next` adapter)
- Handles HTTP signatures, WebFinger, actor dispatch, inbox routing
- Active development, well-documented
- Supports Bun runtime
- Much lighter than running a full Mastodon/Pleroma instance

```bash
bun add @fedify/fedify @fedify/next
```

### 3.2 Why Fedify Over Alternatives

| Option | Verdict |
|--------|---------|
| **Fedify** | TypeScript-first, Next.js adapter, handles signatures/WebFinger/inbox. Ideal. |
| **Raw ActivityPub** | Massive implementation burden — HTTP signatures, content negotiation, WebFinger, inbox forwarding, key management. Not worth building from scratch. |
| **activitypub-express** | Express-only, less maintained, no Next.js adapter. |
| **Mastodon API compatibility** | Would mean implementing Mastodon's REST API — enormous scope, not what we need. |

### 3.3 File Structure

```
lib/activitypub/
  federation.ts          — Fedify Federation instance, actor dispatch
  actors.ts              — Community → Group actor conversion
  activities.ts          — Capability announcements, milestones
  keys.ts                — RSA key pair management (per community)
  privacy.ts             — What data is safe to federate

app/ap/
  [...catchall]/route.ts — Fedify request handler (actor profiles, inboxes, outboxes)

app/.well-known/
  webfinger/route.ts     — WebFinger endpoint
  nodeinfo/route.ts      — NodeInfo discovery
  host-meta/route.ts     — Host-meta (legacy, some implementations need it)

app/nodeinfo/
  2.1/route.ts           — NodeInfo 2.1 response
```

### 3.4 Federation Instance

```typescript
// lib/activitypub/federation.ts
import { createFederation, Person, Group, Note } from '@fedify/fedify';

export const federation = createFederation({
  kv: new DenoKvStore(), // or PostgresKvStore using existing Neon DB
});

// Actor dispatch — resolve handle to community
federation.setActorDispatcher('/ap/communities/{handle}', async (ctx, handle) => {
  const community = await getCommunityBySlug(handle);
  if (!community) return null;

  return new Group({
    id: ctx.getActorUri(handle),
    preferredUsername: handle,
    name: community.name,
    summary: buildCommunitySummary(community),
    url: new URL(`/communities/${community.uri}`, process.env.NEXT_PUBLIC_APP_URL),
    inbox: ctx.getInboxUri(handle),
    outbox: ctx.getOutboxUri(handle),
    followers: ctx.getFollowersUri(handle),
    publicKey: await ctx.getActorKeyPairs(handle),
  });
});

// Inbox — handle Follow requests
federation.setInboxListeners('/ap/communities/{handle}/inbox')
  .on(Follow, async (ctx, follow) => {
    // Auto-accept follows for public communities
    const handle = ctx.getHandle();
    const community = await getCommunityBySlug(handle);
    if (!community) return;

    // Record the follower
    await recordFollower(community.id, follow.actorId);

    // Send Accept
    await ctx.sendActivity(
      { handle },
      follow.actorId,
      new Accept({ actor: ctx.getActorUri(handle), object: follow }),
    );
  });
```

### 3.5 Next.js Integration

```typescript
// app/ap/[...catchall]/route.ts
import { federation } from '@/lib/activitypub/federation';
import { integrateFederation } from '@fedify/next';

export const { GET, POST } = integrateFederation(federation, (req) => undefined);
```

```typescript
// app/.well-known/webfinger/route.ts
import { federation } from '@/lib/activitypub/federation';

export async function GET(request: Request) {
  return federation.handleWebFinger(request);
}
```

---

## 4. Capability Announcements

This is the **killer feature** — the thing no one else does on the fediverse. Personus communities publish aggregated, anonymized capability updates.

### 4.1 What Gets Published

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "actor": "https://personus.ai/ap/communities/portland-rust-guild",
  "published": "2026-02-23T12:00:00Z",
  "object": {
    "type": "Note",
    "id": "https://personus.ai/ap/communities/portland-rust-guild/notes/2026-02-23-weekly",
    "content": "<p><strong>Portland Rust Guild</strong> — Weekly capability update</p><ul><li>3 new members with WebAssembly expertise</li><li>2 members now offering code review sessions</li><li>Guild strength: 120 members across 47 skill areas</li><li>Top skills: Systems Programming, Async Rust, Web APIs, CLI Tools, Embedded</li></ul><p>Looking for Rust expertise? <a href=\"https://personus.ai/communities/portland-rust-guild\">Explore the guild →</a></p>",
    "attributedTo": "https://personus.ai/ap/communities/portland-rust-guild",
    "to": ["https://www.w3.org/ns/activitystreams#Public"],
    "cc": ["https://personus.ai/ap/communities/portland-rust-guild/followers"]
  }
}
```

### 4.2 What NEVER Gets Published

- Individual member names, handles, or identities
- Specific endorsement text or subjects
- Contact information or introduction details
- Platform-specific data (Discord messages, Slack conversations)
- Member counts by specific skill (too identifying in small communities)
- Any data from private personas or private traits

### 4.3 Announcement Types

| Type | Frequency | Content |
|------|-----------|---------|
| **Weekly capability digest** | Weekly (configurable) | Aggregated new skills, offerings, member growth |
| **Community milestone** | On event | "Reached 100 members", "50th endorsement" |
| **New offering** | On creation | "The guild is now offering free mentoring sessions" (if offering is public) |
| **Event announcement** | On creation | Community events published to followers |

### 4.4 Organizer Controls

Community Organizers control what gets federated:

```
Settings → Federation
  │
  ├─ Enable ActivityPub federation     [toggle]
  ├─ Publish weekly capability digests [toggle]
  ├─ Publish milestone announcements   [toggle]
  ├─ Publish new offerings            [toggle]
  ├─ Fediverse handle: @slug@personus.ai (read-only)
  └─ Followers: 23 fediverse accounts
```

Federation is **opt-in**. Communities are not published to the fediverse unless the organizer enables it.

---

## 5. Privacy Model

ActivityPub federation introduces a new data boundary. The privacy model is conservative:

### 5.1 What Federates (Public Data Only)

| Data | Federates? | Notes |
|------|-----------|-------|
| Community name | Yes | Public by definition |
| Community description/summary | Yes | Organizer-written, public |
| Community avatar | Yes | Public |
| Aggregated skill areas | Yes | "Top skills: Rust, WebAssembly, Embedded" — no individual attribution |
| Total member count | Yes | Public stat |
| Public offerings | Yes | Only if offering visibility is public |
| Community events | Yes | Only if event is public |
| Endorsement count (aggregate) | Yes | "120 endorsements" — not who endorsed whom |

### 5.2 What Never Federates

| Data | Why Not |
|------|---------|
| Individual member profiles | Privacy — members control their own visibility |
| Member names or handles | Privacy — membership is not inherently public |
| Specific endorsements | Privacy — endorsement details are between members |
| Trait details by member | Privacy — traits are persona-controlled |
| Platform integration data | Privacy — what happens on Discord/Slack stays there |
| Contact requests | Privacy — mediated contact is confidential |
| Member skill counts by category | Privacy — "1 member knows X" is identifying |

### 5.3 Minimum Anonymity Threshold

For aggregated data, apply a minimum threshold to prevent de-anonymization:

- Don't publish "3 new members with WebAssembly expertise" if the community has <20 members
- Don't publish skill area counts if any category has <5 members
- For small communities (<20 members), only publish: name, description, total member count, public offerings

---

## 6. Schema Additions

### 6.1 Communities Table

```typescript
// Add to lib/db/schema/communities.ts
activityPubEnabled: boolean('activitypub_enabled').default(false),
activityPubKeyPair: jsonb('activitypub_key_pair'), // { publicKey: string, privateKey: string }
activityPubFollowerCount: integer('activitypub_follower_count').default(0),
```

### 6.2 ActivityPub Followers Table

```typescript
// lib/db/schema/activitypub.ts (new file)
export const activityPubFollowers = pgTable('activitypub_followers', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  actorUri: text('actor_uri').notNull(),        // e.g., "https://mastodon.social/users/alice"
  inboxUri: text('inbox_uri').notNull(),         // Where to deliver activities
  sharedInboxUri: text('shared_inbox_uri'),      // For batch delivery
  followedAt: timestamp('followed_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('activitypub_followers_unique').on(table.communityId, table.actorUri),
]);

export const activityPubOutbox = pgTable('activitypub_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(), // 'Create', 'Update', etc.
  activityJson: jsonb('activity_json').notNull(),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  deliveredTo: integer('delivered_to').default(0), // Count of successful deliveries
});
```

---

## 7. Threads and Mastodon Specifics

### 7.1 Mastodon

Mastodon is the largest ActivityPub implementation. Personus communities will appear as `Group` actors that Mastodon users can follow.

**How it works for a Mastodon user:**
1. Search `@portlandrustguild@personus.ai` in Mastodon
2. Mastodon resolves via WebFinger → finds the Group actor
3. User clicks Follow
4. Personus sends `Accept` to Mastodon's inbox
5. Mastodon user sees capability announcements in their home timeline

**Limitations:**
- Mastodon renders `Group` actors differently from `Person` actors — may show as a "bot" or group account
- Reply handling is limited — Mastodon users can reply to announcements, but Personus doesn't need to handle replies (community discussion happens on the community's platforms)

### 7.2 Threads

Meta's Threads has ActivityPub federation, but it's limited:
- **Opt-in:** Only ~25K out of 300M+ users have enabled fediverse sharing
- **One-way (mostly):** Threads users can be followed from the fediverse, but interaction is limited
- **No Group actors:** Threads doesn't have community/group features that map to ActivityPub Groups
- **EU exclusion:** Federation not available in the EU (Digital Markets Act compliance)

**Recommendation:** Don't build specifically for Threads. If Threads users discover Personus communities via standard ActivityPub (WebFinger, follows), great. But the audience is too small and the integration too limited to prioritize.

### 7.3 Lemmy

Lemmy (Reddit-like fediverse platform) uses `Group` actors for communities — the same pattern Personus uses. This means Lemmy communities can discover and follow Personus communities natively.

**Interesting synergy:** A Lemmy community about Rust programming could follow the Portland Rust Guild on Personus. Capability announcements appear as posts in the Lemmy community. Members discover that structured identity and skill search exist via Personus.

---

## 8. Integration with AT Protocol

Personus plans both AT Protocol (Bluesky) and ActivityPub (Mastodon) support. These are complementary, not competing:

| Aspect | AT Protocol | ActivityPub |
|--------|-------------|-------------|
| **Identity** | DID-based (persistent, portable) | Domain-based (`@user@domain`) |
| **Data model** | Lexicon schemas, repo-based | JSON-LD activities, inbox/outbox |
| **Discovery** | Relay network, feed generators | WebFinger, instance crawling |
| **Audience** | Bluesky (~40M registered) | Mastodon/fediverse (~13M total) |
| **Personus use** | Personal identity, DID linking | Community federation, capability announcements |

**Key difference:** AT Protocol is used for individual identity (linking a user's DID to their Personus account). ActivityPub is used for community presence (publishing community capabilities to the fediverse).

They share the same philosophical alignment — open protocols, user-owned identity, decentralized discovery — but serve different functions in the Personus architecture.

---

## 9. Implementation Phases

### Phase 1: WebFinger + Actor Profiles (2-3 weeks)

- [ ] Install `@fedify/fedify` and `@fedify/next`
- [ ] Create `lib/activitypub/federation.ts` with Federation instance
- [ ] Implement WebFinger endpoint (`/.well-known/webfinger`)
- [ ] Implement NodeInfo endpoints (`/.well-known/nodeinfo`, `/nodeinfo/2.1`)
- [ ] Implement Group actor profiles for communities
- [ ] RSA key pair generation per community
- [ ] Handle incoming `Follow` requests (auto-accept for public communities)
- [ ] Add `activityPubEnabled` toggle to community settings
- [ ] Schema additions: `activitypub_followers`, `activitypub_outbox` tables
- [ ] Add `activityPubEnabled`, `activityPubKeyPair`, `activityPubFollowerCount` to communities

### Phase 2: Capability Announcements (1-2 weeks)

- [ ] Build announcement generator (aggregated, anonymized)
- [ ] Weekly digest cron job (Vercel Cron or similar)
- [ ] Milestone detection and announcement
- [ ] Activity delivery to followers (HTTP Signatures)
- [ ] Outbox pagination for public outbox endpoint
- [ ] Organizer controls (enable/disable announcement types)

### Phase 3: Discovery Enhancement (1 week)

- [ ] Host-meta endpoint (legacy compatibility)
- [ ] Structured community summary in actor profile (skills, offerings, member count)
- [ ] Fediverse handle display on community profiles
- [ ] "Follow on Mastodon" button on community pages

### Phase 4: Bidirectional (Future)

- [ ] Handle replies to announcements (route to community organizer?)
- [ ] Cross-community follows (Personus community follows another Personus community)
- [ ] Relay support for broader discovery
- [ ] Bridging with AT Protocol (community exists on both protocols)

---

## 10. Per-Platform Inputs

When a Community Organizer connects Mastodon or Threads (link-only), the per-platform inputs remain as defined in `00-overview.md` Section 6.10-6.11.

ActivityPub federation is **not** about linking to a Mastodon account — it's about making the Personus community itself a fediverse actor. This is configured in community settings, not in the platform connection wizard.

---

## 11. Environment Variables

```env
# ActivityPub (all optional — federation is opt-in)
ACTIVITYPUB_ENABLED=true                    # Global kill switch
NEXT_PUBLIC_APP_URL=https://personus.ai     # Used as the federation domain
```

No platform-specific tokens needed — ActivityPub is a protocol, not a platform. The federation domain is the app's public URL.

---

## 12. Value Assessment

### What's Unique

No one else publishes aggregated community capabilities to the fediverse. LinkedIn has professional data but is closed. Mastodon has social graphs but no structured capabilities. Lemmy has communities but no skill/capability layer.

Personus can be the first platform where you search `@community@personus.ai` on Mastodon and see: "This community has 120 members with expertise in Rust, WebAssembly, and embedded systems. 15 members are offering mentoring. 7 are available for contract work."

### What's Modest

- The fediverse audience is small (~13M total, ~1.8M active on Mastodon)
- Threads federation is disappointing and unreliable
- ActivityPub complexity is real — HTTP Signatures, content negotiation, delivery retries
- Group actor support varies across implementations

### Net Assessment

**Worth building, but not urgent.** Phase 1 (WebFinger + actor profiles) is low-cost and provides discoverable community presence. Phase 2 (capability announcements) is the differentiated value. Phase 3-4 are nice-to-haves.

Build after the core platform integrations (Discord, Slack, Telegram) are working. The fediverse audience is the right audience for Personus (tech-savvy, community-oriented, open-web believers), but it's not large enough to prioritize over platforms with 200M-900M users.

---

## 13. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Communities as `Group` actors | Proven pattern (Lemmy). Communities are the natural federation unit — not individual users. |
| 2 | Fedify framework | TypeScript-first, Next.js adapter, handles HTTP Signatures/WebFinger. Much less work than raw implementation. |
| 3 | Capability announcements as the killer feature | No one else does this. Aggregated, anonymized capability data is unique to Personus. |
| 4 | Conservative privacy model | Only public, aggregated data federates. No individual member data, no platform integration data. Minimum anonymity thresholds for small communities. |
| 5 | Don't build for Threads specifically | ~25K opt-ins out of 300M users. Standard ActivityPub support covers the few who do federate. |
| 6 | Federation is opt-in | Communities are not published unless the organizer enables it. Respects organizer control. |
| 7 | Build after core integrations | Discord/Slack/Telegram serve larger audiences. Fediverse is the right audience but small. |
