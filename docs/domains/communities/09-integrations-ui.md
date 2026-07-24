---
type: spec
title: Communities — Integrations UI Reference
description: "This is a reference document, not a standalone spec. All integration UI — wireframes, components, server actions, workflows, and schemas — is defined in the integrations spec suite…"
status: planned
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Integrations UI Reference

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`, `01-community-lifecycle.md`
> Primary actor: Community Organizer (CO)

**This is a reference document, not a standalone spec.** All integration UI — wireframes, components, server actions, workflows, and schemas — is defined in the integrations spec suite (`docs/specs/integrations/`). This document maps where those specs surface in the community dashboard and captures the few community-specific concerns that aren't covered there.

---

## 1. Where Integrations Appear in the Community Dashboard

| Location | What's Shown | Defined In |
|----------|-------------|------------|
| **Creation wizard → Step 3** | `<PlatformConnectionStep mode="wizard" />` | `01-shared-architecture.md` §6.2–6.3 |
| **Dashboard → Overview → Quick Actions** | "Connect a platform" shortcut (opens same wizard component) | Community-specific (not in integrations suite) |
| **Dashboard → Settings → Connections** | `<PlatformConnectionStep mode="settings" />` + connected platform list | `01-shared-architecture.md` §6.4, `00-overview.md` §5.2 |
| **Dashboard → Overview** | Aggregate integration health badge | `10-activity-tracking.md` §4 |
| **Dashboard → Settings → Connections** | Per-platform health cards with activity metrics | `10-activity-tracking.md` §4.1 |

---

## 2. Spec Cross-Reference

These are the integrations specs that define the UI:

| What | Spec | Section |
|------|------|---------|
| Connect workflow (entry points, flow, UX copy) | `00-overview.md` | §5.1 |
| Manage/disconnect workflow | `00-overview.md` | §5.2 |
| Platform card component, props, hierarchy | `01-shared-architecture.md` | §6.2 |
| Wizard step insertion | `01-shared-architecture.md` | §6.3 |
| Settings → Connections tab | `01-shared-architecture.md` | §6.4 |
| Platform icons component | `01-shared-architecture.md` | §6.1 |
| Server actions (connect, disconnect, configure, list) | `01-shared-architecture.md` | §5 |
| Matrix auto-parse UX | `02-matrix.md` | §6 |
| Integration health dashboard wireframe | `10-activity-tracking.md` | §4 |
| Per-platform activity metrics | `10-activity-tracking.md` | §4.1 |

---

## 3. Community-Specific Additions

These concerns are scoped to the community dashboard and not covered in the integrations suite.

### 3.1 Connection State Display

The community dashboard maps `integration_health` status (from `10-activity-tracking.md` §3.2) to user-friendly badges:

| UI State | Badge | Source | Meaning |
|----------|-------|--------|---------|
| **Connected** | green | `integration_health.status = 'healthy'` | Active integration with bot/webhook |
| **Linked** | blue | Layer 1 only (no `platform_channel_bindings` row) | Link-only (Instagram, YouTube, Signal, etc.) |
| **Warning** | yellow | `integration_health.status = 'warning'` | No events in 24-72 hours |
| **Error** | red | `integration_health.status = 'unhealthy'` | Integration failing |

### 3.2 Permission Model

- **Admin** role required to connect/disconnect platforms and edit integration config
- **Steward** can view connection status and integration activity but cannot mutate
- **Member** sees platform links on community profile but no integration management UI

See `01-shared-architecture.md` §9 for the `ensureCommunityAdmin()` check.

### 3.3 Terminology

- **"Notifications"** in the communities spec suite (`08-notifications.md`) = in-app bell icon + email to Personus users
- **"Bot messages"** / **"notify channel"** in the integrations suite = messages sent by the Personus bot *back into* the platform (Slack channel, Telegram topic, Matrix room via Hookshot)

These are different systems. A CO configuring "notification channel" in integration settings is choosing where bot messages appear in Discord/Slack/etc., not configuring Personus notification preferences.

### 3.4 Overview Quick Action

The community dashboard Overview tab includes a "Connect a platform" quick action card. This is an additional entry point not described in the integrations suite (which only covers the wizard and settings paths). It renders the same `<PlatformConnectionStep mode="settings" />` component in a dialog or inline expansion.

---

## 4. Test Criteria

Community-specific integration UI tests (functional tests for the underlying actions are in the integrations specs):

- Quick Actions → "Connect a platform" opens the platform connection UI
- Connection state badges correctly reflect `integration_health` status
- Admin sees [Configure] and [Disconnect] buttons; steward does not
- Member sees platform links on community profile but no management UI
- Integration health badge appears on dashboard Overview when any platform is connected
