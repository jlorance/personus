---
type: research
title: "WhatsApp Integration: Quick Reference (2025-2026)"
description: "Official WhatsApp Business API has limited group support. Realistic Personus integration requires third-party providers (Whapi.Cloud, Maytapi) or manual link sharing."
status: current
tags: [research]
---

# WhatsApp Integration: Quick Reference (2025-2026)

## One-Page Summary

### Key Finding
**Official WhatsApp Business API has limited group support.** Realistic Personus integration requires third-party providers (Whapi.Cloud, Maytapi) or manual link sharing.

---

## Feature Matrix

| Feature | Status | Details |
|---------|--------|---------|
| **Groups** | ✅ Supported (Oct 2025) | Official Cloud API; 8-member limit; 100K+ conversation threshold to qualify |
| **Channels** | ⚠️ Third-party only | Broadcast feature; no official API; Whapi.Cloud provides coverage |
| **Communities** | ❌ Not for Business API | Consumer-only; 50 sub-groups, 5,000 members; no programmatic access yet |
| **Bot creation** | ⚠️ Restricted (Jan 2026) | Task-specific bots OK; general-purpose AI banned; no auto-add to groups |
| **Webhooks** | ⚠️ Third-party only | Official API has no webhooks; use Whapi/Maytapi for event listening |
| **Link sharing** | ✅ Free | Manual: copy/paste invite links into Personus community settings |

---

## Integration Tiers (Effort vs. Value)

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 5: Full Two-Way Sync (❌ NOT FEASIBLE YET)             │
│ • Auto-create Communities                                   │
│ • Bidirectional member/message sync                         │
│ • Blocker: Communities Business API not released            │
├─────────────────────────────────────────────────────────────┤
│ Tier 4: Member Trait Sync (⚠️ ADVANCED)                     │
│ • Sync Personus traits → WhatsApp member descriptions       │
│ • Requires: Whapi API, template profiles, sync job          │
│ • Cost: Moderate ($20-100/mo); Effort: 40h                 │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Activity Webhook Sync (✅ RECOMMENDED PHASE 2)      │
│ • Log WhatsApp events → Personus activity_events            │
│ • Show "joined via WhatsApp" on community timeline          │
│ • Requires: Whapi API, webhook handler, error handling      │
│ • Cost: Low ($10-30/mo); Effort: 30h                        │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: One-Way Notifications (✅ RECOMMENDED PHASE 1)      │
│ • Send community updates → WhatsApp group                   │
│ • "New member joined", "Endorsement received", etc.         │
│ • Requires: Whapi API + bot number account                  │
│ • Cost: Low ($5-20/mo); Effort: 20h                         │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Link Sharing (✅ RECOMMENDED MVP)                   │
│ • Display "Join on WhatsApp" button on community page       │
│ • Manual: organizer copies/pastes invite link               │
│ • Cost: Free; Effort: 4h                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Realistic Architecture for Tier 1-3

### Tier 1: Link Sharing (Phase 0)
```
┌──────────────┐
│  Community   │
│  Organizer   │
└──────┬───────┘
       │ 1. Create group in WhatsApp app
       │ 2. Copy invite link
       ▼
┌──────────────────────────────────────┐
│  Personus Community Page             │
│  ┌────────────────────────────────┐  │
│  │ Join on WhatsApp               │  │◄─ Link shared from organizer
│  │ [Open in WhatsApp] ────────────────► WhatsApp group
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Tier 2: One-Way Notifications (Phase 1)
```
┌──────────────────┐
│  Personus DB     │
│  (new activity)  │
└────────┬─────────┘
         │ Server action triggered
         ▼
┌──────────────────────────────────────┐
│  app/actions/whatsapp.ts             │
│  sendWhatsAppNotification()           │
└────────┬─────────────────────────────┘
         │ API call
         ▼
┌──────────────────────────────────────┐
│  Whapi.Cloud API                     │
│  POST /messages (to group_id)         │
└────────┬─────────────────────────────┘
         │ Forward to WhatsApp
         ▼
┌──────────────────────────────────────┐
│  WhatsApp Group                      │
│  "📢 New member: Alice (Skills: X)"  │
└──────────────────────────────────────┘
```

### Tier 3: Activity Webhook Sync (Phase 2)
```
┌──────────────────────────────────────────┐
│  WhatsApp Group                          │
│  (member joins, sends message, etc.)     │
└──────────────────┬───────────────────────┘
                   │ Webhook event
                   ▼
┌──────────────────────────────────────────┐
│  app/api/whatsapp/webhook/route.ts       │
│  POST handler (receives from Whapi)      │
│  • Verify signature                      │
│  • Parse event type                      │
└──────────────────┬───────────────────────┘
                   │ Process event
                   ▼
┌──────────────────────────────────────────┐
│  lib/whatsapp/webhook-handler.ts         │
│  handleWhatsAppEvent()                   │
│  • Find integration record               │
│  • Log to activity_events                │
└──────────────────┬───────────────────────┘
                   │ Store in DB
                   ▼
┌──────────────────────────────────────────┐
│  Personus Community Page                 │
│  Activity Feed:                          │
│  ┌────────────────────────────────────┐  │
│  │ 📲 Alice joined via WhatsApp       │  │
│  │ 📲 Bob sent message in WhatsApp    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Third-Party Provider Comparison

| Aspect | Whapi.Cloud | Maytapi | Wassenger |
|--------|-------------|---------|-----------|
| **Setup Time** | 15 min | 20 min | 25 min |
| **Groups** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Channels** | ✅ Yes | ✅ Yes | ❌ No |
| **Communities** | ✅ Beta | ❌ No | ❌ No |
| **Webhooks** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Free Tier** | 5 days trial | 500 msgs/mo | Limited |
| **REST API** | ✅ Yes | ✅ Yes | ✅ Yes |
| **No-code** | ✅ (Make.com) | ⚠️ Limited | ✅ (Make.com) |
| **Docs Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Community** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**Recommendation**: Start with **Whapi.Cloud** (best docs, active development, Communities support).

---

## January 2026 AI Policy Impact

### Still Allowed ✅
- Customer support bots (FAQs, ticket routing)
- Booking/order bots (reservations, tracking)
- Notification bots (shipment, order status)
- Survey/feedback collection
- AI-enhanced service (smart routing, not replacement)

### Now Banned ❌
- General-purpose chatbots (ChatGPT-like)
- Open-ended AI assistants
- Bots that train on user data
- Broad conversation bots

### For Personus
A **discovery bot** ("Find me a skills consultant") walks the line. Safer: **notification bot** ("New opportunity in your network") or **pure link sharing** (no bot).

---

## Roadmap Recommendation

| Phase | Timeline | Work | Value | Cost |
|-------|----------|------|-------|------|
| **Phase 0** | Now | Add WhatsApp link field to communities; UI button | High (easy win) | $0 |
| **Phase 1** | 3-6mo | Integrate Whapi; send notifications | Medium (engagement) | $200-500 |
| **Phase 2** | 6-12mo | Webhook sync; activity feed | Medium (visibility) | $500-1000 |
| **Phase 3** | 12mo+ | Wait for Communities API; reassess | TBD | TBD |
| **⚠️ Don't** | Never | Full bidirectional sync; member scraping | Risk (terms violation) | Compliance |

---

## Key Constraints & Gotchas

1. **100K conversation threshold**: Official API requires massive volume to access Groups API; only realistic for enterprise customers
2. **8-member group limit**: Personal WhatsApp = 256; official API = 8 (significant mismatch)
3. **No auto-add**: Members must click invite link; can't force-join
4. **Communities not ready**: Consumer-only; no Business API support yet (likely 2026-2027)
5. **Webhooks are third-party only**: Use Whapi/Maytapi; official API doesn't expose events
6. **AI chatbot ban (Jan 2026)**: General-purpose bots prohibited; task-specific only
7. **Rate limiting**: Whapi/Maytapi have limits; implement backoff/retry logic

---

## Implementation Checklist (Tier 1)

- [ ] Add `whatsapp` to `externalPlatforms` enum in `communities` schema JSONB
- [ ] Add UI field on community settings page to paste WhatsApp invite link
- [ ] Add "Join on WhatsApp" button to community page (components/share-persona-dialog.tsx or new component)
- [ ] Test link sharing end-to-end
- [ ] Document for Community Organizers in help center

**Estimated effort**: 4 hours
**Estimated cost**: $0
**Expected launch**: This sprint or next

---

## Next Steps

1. **Get stakeholder sign-off** on Tier 1 MVP (link sharing)
2. **Create Linear issues** for Phase 0-2 roadmap
3. **Set up Whapi.Cloud sandbox account** (for Phase 1 prototype)
4. **Document WhatsApp API key rotation** process (security)
5. **Review GDPR/privacy implications** of webhook logging

---

**Full Research**: See `docs/research/whatsapp_integration.md`
