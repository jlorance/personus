---
type: spec
title: Platform Integrations — WhatsApp
description: "WhatsApp is the most-used messaging platform globally (2B+ users), and WhatsApp Groups/Communities are how many real-world communities communicate — especially outside the US. But Meta's official…"
status: planned
tags: [integrations]
timestamp: 2026-02-23
---

# Platform Integrations — WhatsApp

> Date: 2026-02-23
> Status: Draft — research complete, stubbed for future build
> Depends on: `00-overview.md`, `01-shared-architecture.md`
> Research: `docs/research/whatsapp_integration.md`

---

## 1. Summary: What's Actually Possible

WhatsApp is the most-used messaging platform globally (2B+ users), and WhatsApp Groups/Communities are how many real-world communities communicate — especially outside the US. But Meta's official APIs are extremely limited for community bridging. Here's the honest picture:

| Path | What it enables | Qualification | Risk | Cost |
|------|----------------|---------------|------|------|
| **WhatsApp Flows** (official) | Mini-app inside WhatsApp: skill search, intro requests, profile builder | BSP account + business verification | Low | ~$50-200/mo BSP + per-message |
| **Whapi.Cloud** (unofficial) | Full group/community bridging: webhooks, member sync, messages | None (just a WhatsApp number) | Medium (ToS, ban risk) | $35/mo per number |
| **Official Groups API** | Programmatic group management | 100K messages/day OR Official Business Account | Low | Per-message |
| **Link-only** (what we build now) | Invite link on community profile | None | Zero | Free |

**The official Groups API is not viable** for Personus. It caps groups at 8 members and requires 100K business-initiated conversations/day to qualify. WhatsApp Communities (the umbrella feature with 5K members, 50 sub-groups) have no Business API at all — consumer-only.

**WhatsApp Flows are the most interesting official path.** They're essentially mini-apps inside WhatsApp — multi-screen interactive forms with real-time backend communication. A "Personus Flow" could let community members search for skills, request introductions, and build their profile without leaving WhatsApp.

**Whapi.Cloud is the only path that bridges actual groups/communities.** It uses the WhatsApp Web linked-device protocol (unofficial, violates Meta's ToS). The risk is manageable with a dedicated number and responsible usage, but it's a conscious trade-off.

---

## 2. What We Build Now (Tier 1: Link)

Already covered by `01-shared-architecture.md`. Community Organizers paste their WhatsApp group/community invite link. Personus displays it on the community profile. Members click to join.

No additional work beyond what's in the shared architecture spec.

---

## 3. WhatsApp Flows — "Personus Inside WhatsApp"

### 3.1 What Flows Are

WhatsApp Flows are structured, multi-screen interactive experiences that run natively inside a WhatsApp conversation. Think of them as forms-on-steroids that can talk to your backend in real-time.

**How they work:**
1. Business sends a message with a Flow button (via template or interactive message)
2. User taps the button → Flow opens as a native UI overlay inside WhatsApp
3. User interacts with screens (inputs, dropdowns, checkboxes, etc.)
4. Each screen can call your backend endpoint for real-time data
5. User completes the Flow → response sent back to the conversation

**UI components available:**
- Text headings, body text, images, embedded links
- Single-choice (radio), multi-choice (checkbox), toggle switches
- Short text, long text, date picker
- Dropdown menus, action buttons
- Up to 50 components per screen, multiple screens per Flow

### 3.2 Personus Flows We Could Build

#### Flow 1: Skill Search

A community member wants to find someone with a specific skill. They type a message to the Personus business number (or tap a button), and a Flow opens:

```
Screen 1: "Find Someone in [Community Name]"
  ┌─────────────────────────────────┐
  │  What are you looking for?      │
  │  ┌───────────────────────────┐  │
  │  │ e.g., video editing       │  │
  │  └───────────────────────────┘  │
  │                                 │
  │  Search in:                     │
  │  (●) This community only        │
  │  ( ) All of Personus            │
  │                                 │
  │  [Search]                       │
  └─────────────────────────────────┘
          ↓ calls your endpoint
          ↓ runs personaSearchTool
Screen 2: "Results"
  ┌─────────────────────────────────┐
  │  3 people match "video editing" │
  │                                 │
  │  ┌───────────────────────────┐  │
  │  │ Alex Chen                 │  │
  │  │ Video editing, After      │  │
  │  │ Effects, color grading    │  │
  │  │ 2 endorsements            │  │
  │  │ [Request Introduction]    │  │
  │  └───────────────────────────┘  │
  │  ┌───────────────────────────┐  │
  │  │ Maria Santos              │  │
  │  │ Video editing, YouTube    │  │
  │  │ 5 endorsements            │  │
  │  │ [Request Introduction]    │  │
  │  └───────────────────────────┘  │
  └─────────────────────────────────┘
```

**Backend endpoint:** `POST /api/whatsapp/flows/search`
- Receives: `{ query, communityId, scope }`
- Calls: `personaSearchTool` from `lib/mastra/tools.ts`
- Returns: formatted results with persona summaries (MCP-filtered for privacy)

#### Flow 2: Request Introduction

After finding someone via search, the member requests an introduction:

```
Screen 1: "Request Introduction to Alex Chen"
  ┌─────────────────────────────────┐
  │  Why do you want to connect?    │
  │  ┌───────────────────────────┐  │
  │  │ I'm working on a short    │  │
  │  │ film and need help with   │  │
  │  │ color grading...          │  │
  │  └───────────────────────────┘  │
  │                                 │
  │  Your Personus profile will be  │
  │  shared with Alex.              │
  │                                 │
  │  [Send Request]                 │
  └─────────────────────────────────┘
          ↓ calls your endpoint
          ↓ runs requestIntroductionTool
Screen 2: "Request Sent"
  ┌─────────────────────────────────┐
  │  ✓ Introduction requested       │
  │                                 │
  │  Alex will be notified and can  │
  │  choose to connect with you.    │
  │  You'll hear back in Personus.  │
  │                                 │
  │  [Done]                         │
  └─────────────────────────────────┘
```

**Backend endpoint:** `POST /api/whatsapp/flows/introduce`
- Receives: `{ targetPersonaId, message, requesterUserId }`
- Calls: `requestIntroductionTool` (same mediated contact flow as web)
- Returns: confirmation

#### Flow 3: Profile Builder / Trait Collector

Onboarding flow for new community members to share their skills and interests:

```
Screen 1: "Tell us about yourself"
  ┌─────────────────────────────────┐
  │  What skills do you have?       │
  │  (Select all that apply)        │
  │                                 │
  │  ☑ Video editing                │
  │  ☐ Photography                  │
  │  ☑ Graphic design               │
  │  ☐ Writing                      │
  │  ☐ Event planning               │
  │  ☐ Marketing                    │
  │                                 │
  │  Other skills:                  │
  │  ┌───────────────────────────┐  │
  │  │ color grading, After FX   │  │
  │  └───────────────────────────┘  │
  │                                 │
  │  [Next]                         │
  └─────────────────────────────────┘

Screen 2: "What are you looking for?"
  ┌─────────────────────────────────┐
  │  ☐ Collaboration                │
  │  ☑ Mentoring                    │
  │  ☐ Freelance work               │
  │  ☑ Learning opportunities       │
  │                                 │
  │  [Save Profile]                 │
  └─────────────────────────────────┘
```

**Backend endpoint:** `POST /api/whatsapp/flows/profile`
- Receives: `{ skills, seekingOpportunities, communityId }`
- Creates or updates persona traits in Personus DB
- Returns: confirmation + completeness score

#### Flow 4: Community Discovery

For people who don't know which community to join:

```
Screen 1: "Find Your Community"
  ┌─────────────────────────────────┐
  │  What are you interested in?    │
  │  ┌───────────────────────────┐  │
  │  │ e.g., Rust programming    │  │
  │  └───────────────────────────┘  │
  │                                 │
  │  [Find Communities]             │
  └─────────────────────────────────┘
          ↓ semantic search
Screen 2: "Communities for you"
  ┌─────────────────────────────────┐
  │  Portland Rust Guild (47 mbrs)  │
  │  "Skill-centric community..."   │
  │  On: Matrix, Discord            │
  │  [View on Personus]             │
  │                                 │
  │  WebAssembly Builders (23 mbrs) │
  │  "WASM enthusiasts..."          │
  │  On: Discord                    │
  │  [View on Personus]             │
  └─────────────────────────────────┘
```

### 3.3 Technical Architecture for Flows

```
┌──────────────────────────┐     ┌──────────────────────────────────┐
│  WhatsApp (user's phone) │     │  Personus (Next.js + Vercel)     │
│                          │     │                                  │
│  Flow UI renders         │     │  API Routes:                     │
│  natively in WhatsApp    │────▶│  /api/whatsapp/flows/search      │
│                          │     │  /api/whatsapp/flows/introduce   │
│  User taps, types,       │◀────│  /api/whatsapp/flows/profile     │
│  selects options         │     │  /api/whatsapp/flows/discover    │
│                          │     │                                  │
│  Results render in-app   │     │  Each endpoint calls existing:   │
│                          │     │  - personaSearchTool             │
│                          │     │  - requestIntroductionTool       │
│                          │     │  - persona CRUD actions          │
│                          │     │  - MCP visibility filtering      │
└──────────────────────────┘     └──────────────────────────────────┘
         │                                      │
         │  WhatsApp Cloud API                  │
         │  (via BSP: Wati, Respond.io, etc.)   │
         └──────────────────────────────────────┘
```

**Key design constraint:** Flows must be **task-specific**, not general-purpose AI chat. Meta's January 2026 policy bans general-purpose chatbots from WhatsApp Business. "Search for a skill" and "request an introduction" are concrete tasks — compliant. "Chat with a Personus AI coach" is not — banned.

### 3.4 Requirements for WhatsApp Flows

| Requirement | Detail |
|-------------|--------|
| **BSP account** | Sign up with a Business Solution Provider (Wati, Respond.io, etc.) |
| **Business verification** | Facebook Business Manager + domain verification (~1 week) |
| **WhatsApp Business number** | Dedicated phone number not used on personal WhatsApp |
| **Flow definition** | JSON-based Flow definition uploaded via API or BSP dashboard |
| **Endpoint** | HTTPS endpoint that handles Flow data exchange requests |
| **Template approval** | Business-initiated Flows require a pre-approved message template |
| **Cost** | BSP subscription ($50-200/mo) + Meta per-message fees (pennies for utility messages, free for customer-initiated replies within 24 hours) |

### 3.5 What Flows Cannot Do

- No persistent state between sessions (each Flow invocation is standalone)
- No push — Flows must be initiated within an existing conversation
- No file uploads from the user (text and selections only)
- No maps, no custom styling, no animations
- Max 10 screens per Flow (enough for all our use cases)
- If your endpoint goes unhealthy, Meta throttles and eventually blocks the Flow

---

## 4. Whapi.Cloud — Community Bridging (Experimental)

### 4.1 What It Enables

Whapi.Cloud connects to WhatsApp via the linked-device protocol and exposes a REST API with webhooks. It's the only path that can actually bridge WhatsApp Groups and Communities to Personus.

**Group capabilities:**
- Create groups, manage members (add/remove)
- Send and receive messages in groups
- Webhooks for join/leave events, new messages
- No 8-member limit (uses regular WhatsApp's 1,024-member groups)

**Community capabilities:**
- Manage WhatsApp Communities (the umbrella of sub-groups)
- Send announcements to the Community's Announcement group
- Manage sub-groups within the Community
- Webhooks for community-level events

**What this means for Personus:**
- A Personus bot number joins a WhatsApp group as a regular participant
- Receives webhook when new members join → can prompt them to set up a Personus profile
- Receives webhook when messages mention skills/needs → can suggest relevant members
- Can post community digest messages ("This week: 3 new members, 2 endorsements, trending skill: Rust")

### 4.2 Architecture

```
┌──────────────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  WhatsApp Group          │     │  Whapi.Cloud         │     │  Personus            │
│  (1,024 members)         │     │  ($35/mo)            │     │  (Next.js)           │
│                          │     │                      │     │                      │
│  Member sends message ──▶│────▶│  Webhook POST ──────▶│────▶│  /api/whatsapp/hook  │
│                          │     │                      │     │  Process event       │
│  Bot posts response   ◀──│◀────│  REST API call ◀─────│◀────│  Call Personus tools │
│                          │     │                      │     │  Format response     │
└──────────────────────────┘     └─────────────────────┘     └──────────────────────┘
```

### 4.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Account ban | Medium | Lose bridge number (not user data) | Dedicated number, warm-up, responsible usage |
| Meta ToS enforcement | Low-Medium | Must stop using unofficial API | Treat as experimental/beta; have link-only fallback |
| Supply chain attack | Low | Compromised integration | Use Whapi.Cloud managed service, not raw Baileys |
| Rate limiting | Medium | Messages delayed or dropped | Respect rate limits, batch notifications |

**Recommendation:** Label this as "Beta" in the UI. Use a dedicated WhatsApp number. Don't make it a load-bearing integration — always have the Tier 1 invite link as fallback.

### 4.4 What We'd Build

**API route:** `app/api/whatsapp/webhook/route.ts`
- Receives Whapi.Cloud webhook events (group join/leave, messages)
- Processes events and updates Personus DB (activity_events, community_members)

**Service:** `lib/whatsapp/bridge.ts`
- `sendGroupMessage(groupId, text)` — posts to WhatsApp group via Whapi REST API
- `processGroupEvent(event)` — handles join/leave/message events
- `sendDigest(groupId, digest)` — posts community digest

**Integration config extension:**
```json
{
  "config": {
    "whapiInstanceId": "...",
    "whapiToken": "...",
    "groupId": "...",
    "webhookEnabled": true,
    "digestEnabled": true,
    "digestSchedule": "weekly"
  }
}
```

**Environment variables:**
```env
WHAPI_API_TOKEN=...              # Whapi.Cloud API token
WHAPI_INSTANCE_ID=...            # Whapi.Cloud instance ID
WHATSAPP_WEBHOOK_SECRET=...      # webhook signature verification
```

---

## 5. wa.me Deep Links for Onboarding

Even without Flows or Whapi, we can use `wa.me` deep links to create a lightweight onboarding bridge:

**On a Personus community page:**
```
[Chat with us on WhatsApp]
→ https://wa.me/15551234567?text=Hi!%20I%20found%20your%20community%20on%20Personus.%20I'd%20like%20to%20join!
```

**On a Personus persona page:**
```
[Message on WhatsApp]
→ https://wa.me/15551234567?text=Hi%20Alex!%20I%20found%20you%20on%20Personus%20and%20I'm%20interested%20in%20your%20video%20editing%20skills.
```

**Cost:** Free. No API needed. Just a formatted URL.

**Limitation:** User must manually tap "Send." No tracking or confirmation.

---

## 6. Implementation Phases

### Phase 0: Link-only (build now, with shared architecture)
- WhatsApp invite link stored in `externalPlatforms` JSONB
- Displayed on community profile with WhatsApp badge
- wa.me deep link with pre-filled message on persona pages
- **Cost: $0. Effort: already in shared architecture spec.**

### Phase 1: WhatsApp Flows (next sprint, after BSP setup)
- Sign up with BSP (Wati or Respond.io recommended)
- Build Skill Search Flow and Introduction Request Flow
- Create API routes for Flow data exchange endpoints
- Build Flow definitions (JSON)
- **Cost: ~$100-200/mo. Effort: ~2-3 weeks.**

### Phase 2: Whapi.Cloud bridge (experimental, after Flows prove value)
- Set up Whapi.Cloud instance with dedicated WhatsApp number
- Build webhook receiver + event processor
- Build group message sender for digests and responses
- Label as "Beta" in UI
- **Cost: ~$35/mo + dedicated number. Effort: ~2 weeks.**

### Phase 3: Profile Builder Flow + Community Discovery Flow (after Phase 1)
- Extend Flow library with profile builder and community discovery
- Integrate with traits CRUD and semantic search
- **Cost: same BSP subscription. Effort: ~1 week each.**

---

## 7. WhatsApp Usernames (June 2026 — Track This)

Meta is introducing WhatsApp usernames to replace phone numbers as identifiers. A new **Business-Scoped User ID (BSUID)** will replace phone numbers in API interactions.

**Impact on Personus:**
- Usernames become another linkable identity (like Matrix ID, Discord username)
- BSUID means we can identify returning users without their phone number
- Trait metadata could gain a `whatsappUsername` field alongside `matrixId`
- Better privacy story — no phone numbers in Personus DB

**Timeline:** Test countries starting June 2026, gradual global rollout.

---

## 8. Compliance Notes

### Meta's AI Chatbot Policy (January 2026)

Meta banned general-purpose AI chatbots from WhatsApp Business. Only task-specific bots are allowed.

**Compliant (what we'd build):**
- Skill search (specific query → specific results)
- Introduction request (concrete action with defined outcome)
- Profile builder (structured data collection)
- Community discovery (search → results)

**Not compliant (what we'd avoid):**
- Open-ended AI coach ("Tell me about my career options")
- General-purpose assistant ("Help me with anything")
- ChatGPT-style conversational AI

**Rule of thumb:** If the interaction has a specific input and a specific output, it's a task. If it's an open-ended conversation, it's a general-purpose chatbot. Personus Flows are tasks.

---

## 9. Open Questions

1. **Is WhatsApp Flows worth the BSP setup cost for our current stage?** Flows are powerful but require business verification and BSP subscription. May be premature before we have significant WhatsApp-using communities.

2. **Should Whapi.Cloud bridging be offered to Community Organizers, or only used internally?** The risk profile is manageable but non-zero. Organizers should understand the "Beta" nature.

3. **Which BSP?** Wati and Respond.io are both good. Wati has better WhatsApp-specific features; Respond.io is more multi-channel. Evaluate when we're ready to build Phase 1.

4. **Should we wait for WhatsApp usernames (June 2026) before building identity linking?** Phone-number-based identity is a privacy concern. Usernames would be cleaner. May be worth waiting.
