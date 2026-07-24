---
type: spec
title: Platform Integrations — Signal
description: "This spec documents Signal's integration landscape for Personus. Signal is intentionally link-only — we document what's technically possible, why it's risky, and why link-only is the right approach."
status: planned
tags: [integrations]
timestamp: 2026-02-23
---

# Platform Integrations — Signal

> Date: 2026-02-23
> Status: Documented — **not implementing**
> Depends on: `00-overview.md`, `01-shared-architecture.md`

This spec documents Signal's integration landscape for Personus. Signal is intentionally **link-only** — we document what's technically possible, why it's risky, and why link-only is the right approach.

---

## 1. Signal's Position

Signal is a privacy-first encrypted messaging platform. It has:

- **No official API** — no bot API, no developer portal, no webhooks, no OAuth
- **No third-party client support** — actively discouraged
- **No bot accounts** — only regular accounts (requires a phone number)
- **No plans to change** — Signal's leadership has consistently prioritized privacy over extensibility

This is not a gap to be filled. It's a design philosophy that Personus respects.

---

## 2. What's Technically Possible (Unofficial)

### 2.1 signal-cli

**Repository:** [github.com/AsamK/signal-cli](https://github.com/AsamK/signal-cli)

A Java-based unofficial CLI that implements the Signal protocol. The most mature third-party Signal client.

**Capabilities:**
- Register/verify a Signal account (requires a real phone number)
- Send and receive messages (individual and group)
- Join groups via invite link
- Manage groups (add/remove members, change name/avatar — if admin)
- JSON-RPC daemon mode for programmatic control

**How a bot would work:**
```
Dedicated phone number → signal-cli daemon → parses text commands → calls Personus API → responds
```

The bot appears as a normal Signal user. There are no slash commands, inline keyboards, or rich UI — just plain text parsing.

### 2.2 signal-cli-rest-api

**Repository:** [github.com/bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api)

Docker container wrapping signal-cli with a REST API. Simplest path for building a bot.

### 2.3 signald

**Status: Deprecated.** Previously used by mautrix-signal bridge; community has migrated to signal-cli.

### 2.4 Real-World Examples

- **mautrix-signal** ([github.com/mautrix/signal](https://github.com/mautrix/signal)) — Matrix-Signal bridge, used by Beeper (now Automattic). Battle-tested.
- **Home Assistant** — Uses signal-cli-rest-api for notifications.
- Various hobbyist reminder bots, poll bots, alerting bots.

### 2.5 What a Bot Could Do

| Capability | Works? | Notes |
|---|---|---|
| Receive group messages | Yes | Must be a member |
| Respond to text commands | Yes | Parse `!personus search X` yourself |
| Send text + attachments | Yes | |
| Manage group members (if admin) | Yes | |
| Read message history | **No** | Only sees messages while daemon runs |
| Buttons, cards, rich UI | **No** | Text only, no bot framework |
| Voice/video calls | **No** | |

---

## 3. Why We're Not Implementing This

### 3.1 Risk Assessment

| Risk | Severity | Detail |
|---|---|---|
| **Account ban** | High | Signal can ban the bot's phone number with no recourse and no appeal process |
| **Protocol breakage** | Medium-High | Signal pushes mandatory client updates that break third-party clients regularly |
| **ToS violation** | High | Automated usage likely violates Signal's Terms of Service |
| **Phone number management** | Medium | Requires a real SIM card; VoIP numbers are usually blocked |
| **No official support** | High | Zero guarantee of continued functionality |
| **No rich UX** | Medium | Text-only interaction limits what Personus can offer |

### 3.2 The Right Message

Signal's privacy stance is a feature, not a limitation. Personus's approach to Signal should be:

> "Your Signal group stays private. Personus points members to where the conversation happens — we don't try to reach inside."

This is consistent with Personus being an intelligence layer that **augments** platforms rather than extracting from them. For platforms that are fundamentally about privacy, the right augmentation is: link to it, respect it, move on.

---

## 4. What We Do Instead (Link-Only)

### 4.1 Community Organizer Flow

When connecting Signal to a Personus community:

1. Organizer enters a Signal group invite link (`https://signal.group/#...`)
2. Optionally provides a label ("Our Private Group")
3. Stored in `communities.externalPlatforms` JSONB
4. Displayed as a badge on the community profile with a "Join on Signal" button

### 4.2 Per-Platform Inputs

| Field | Type | Required | Placeholder |
|---|---|---|---|
| Group invite link | url | Yes | `https://signal.group/#...` |
| Group name | text | No | `Our Private Group` |

### 4.3 Stored As

```json
{
  "platform": "signal",
  "label": "Signal Group",
  "url": "https://signal.group/#CjQKILx8..."
}
```

### 4.4 Value Messaging

| Card Headline | Detail |
|---|---|
| "Link your private group for members to find" | "Add your Signal group link so community members know where to join the conversation. Your group stays private — Personus just points the way." |

### 4.5 Validation

```typescript
// Signal invite links follow this pattern
const SIGNAL_GROUP_REGEX = /^https:\/\/signal\.group\/#.+$/;
```

---

## 5. If We Ever Reconsider

If Signal ever releases an official API or bot framework, revisit this spec. The conditions for reconsidering:

1. Signal announces an official Bot API or developer program
2. Signal provides a mechanism for third-party apps that doesn't require a phone number
3. Signal supports some form of rich interaction (inline buttons, structured responses)

Until then, link-only is the correct and respectful approach.

---

## 6. Signal Group Capabilities (Reference)

For context on what Signal groups support natively:

- **Group size:** Up to 1,000 members
- **Admin approval:** Optional — admins can require approval for new joins
- **Disappearing messages:** Configurable timer per group
- **Group invite links:** Shareable, revocable
- **Admin roles:** Creator + admins + members
- **End-to-end encrypted:** Always, including group metadata
- **No message history for new members** — by design
