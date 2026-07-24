---
type: spec
title: Communities — Content To Reintegrate
description: "Holding-pen scraps; real backlog tracked in Linear (Personus MVP). Not a live doc."
status: superseded
tags: [archived]
timestamp: 2026-04-13
---


# Communities — Content To Reintegrate

> **This file is a holding pen.** It contains content from the pre-library Communities PRD that did not have an obvious rightful home when the PRD was rewritten into canonical library shape on 2026-04-13. Nothing here is deleted — it's preserved for a future integration pass.
>
> **Two kinds of content live here:**
> 1. **Tracker-status content** — "what's built, what's partial, what's planned" — which belongs in Linear issues, milestone planning, or Feature Spec status fields, not in a stable PRD. When you next plan a cycle, fold these into Linear.
> 2. **Implementation sequencing** — wave-based priority ordering — which belongs in cycle/milestone planning, not in a stable PRD.
>
> Every time you do a cycle-planning session, walk this file and promote rows into Linear issues, then delete those rows from here. When the file is empty, delete it.

---

## From pre-library §2 — What Already Exists (status snapshot as of 2026-02-23)

The original PRD encoded which pieces of the Communities area were built, partial, or gaps. This is **tracker-status** content — it changes weekly. Preserving here for the next cycle-planning session so the state is not lost, but it should be promoted to Linear issues and tracked there.

### 2.1 Fully Built (as of 2026-02-23)

| Component | Status | Location |
|-----------|--------|----------|
| Database schema | Complete | `packages/db/src/schema/communities.ts`, `community-types.ts` |
| 9 community types (seed data) | Complete | `packages/db/src/seed/community-types.ts` (~795 lines) |
| Guild tables (5) | Complete | `packages/db/src/schema/guilds.ts` |
| `createCommunity` server action | Complete | `apps/web/app/actions/communities.ts` |
| `listCommunityTypes` server action | Complete | `apps/web/app/actions/communities.ts` |
| Community creation wizard (3-step) | Complete | `apps/web/app/(dashboard)/communities/new/wizard-client.tsx` |
| Zod validation schemas | Complete | `packages/validations/communities.ts` |
| Authorization model (CASL) | Complete | `packages/auth/src/abilities.ts`, `packages/auth/src/permissions.ts` |
| Guild spec (full) | Complete | `docs/foundation/_archive/legacy-2026-02-24/08-guilds.md` (~1,100 lines, archived pending `/plan-prd guilds`) |
| Business model / pricing | Complete | `docs/business-model/02_packaging_and_pricing.md` |
| Integration platform specs | Complete | `docs/specs/integrations/` (11 files) |

### 2.2 Partially Built (as of 2026-02-23)

| Component | What Exists | What's Missing |
|-----------|------------|----------------|
| Explore page | Wireframe | No implementation, no server actions |
| Community admin dashboard | Wireframe | No implementation |
| Community public page | Route placeholder | No implementation |
| Member management | Schema supports it | No server actions, no UI |
| Analytics | Wireframe | No schema, no tracking, no UI |

### 2.3 Not Built — Gaps the PRD Addressed (as of 2026-02-23)

Each of these should become a Linear issue when the corresponding feature spec is picked up for implementation. Many already map to existing feature spec files in `docs/specs/communities/`.

| Gap | Why it matters | Maps to feature spec |
|-----|---------------|---------------------|
| Community listing / "My Communities" | COs and CMs can't see their communities | `01-community-lifecycle.md` |
| Community detail / public page | Communities have no visible presence | `01-community-lifecycle.md` + `04-discovery.md` |
| Community settings / configuration | COs can't edit anything after creation | `01-community-lifecycle.md` |
| Member lifecycle (join, approve, leave, remove) | Members can't join communities | `02-membership.md` |
| Member directory with search | The core value prop has no UI | `03-member-directory.md` |
| Invitations | COs can't grow their community | `05-invitations.md` |
| Community traits editor | COs can't fill in community-level traits | `01-community-lifecycle.md` |
| Member traits editor | CMs can't fill in context-specific traits | `02-membership.md` |
| Context schema builder | COs can't customize what members share | `01-community-lifecycle.md` |
| Role management | COs can't promote/demote members | `02-membership.md` |
| Community discovery / Explore page | People can't find communities | `04-discovery.md` |
| Activity feed / recent activity | No one knows what's happening | `06-activity-and-analytics.md` |
| Community-scoped search | The core "who knows X?" capability has no UI | `03-member-directory.md` |
| Moderation (member removal, content policy) | COs can't manage bad actors | `07-moderation.md` |
| Notifications | No one gets told about anything | `08-notifications.md` |
| Integration connections UI | COs can't connect platforms from the UI | `09-integrations-ui.md` |
| Community profile (aggregate "who's here") | No way to see what the community collectively offers without searching | `03-member-directory.md` |
| Notices (community bulletin board) | Members can't broadcast time-bound asks/offers to the community | `10-notices.md` |
| Similar communities (community-to-community discovery) | Members can't discover related communities from one they're in | `04-discovery.md` |
| Public community directory | No way for non-members to browse/search opted-in members ("Find a Plumber" page) | `03-member-directory.md` |

---

## From pre-library §7 — Implementation Priority (wave-based)

The original PRD grouped feature specs into three waves. This is **cycle/milestone planning content** — it belongs in Linear milestones, not in a stable PRD. When next doing cycle planning, use this as the starting order and adjust to current priorities.

### Wave 1 — Core Loop (must have)

1. `01-community-lifecycle.md` — Can't do anything without a configurable community with a profile
2. `02-membership.md` — Can't do anything without members
3. `03-member-directory.md` — The core value prop: "who knows X?" + aggregate "who's here" view

### Wave 2 — Growth + Engagement (should have)

4. `04-discovery.md` — How humans and AI agents find communities (Explore, SEO, AIO, recommendations)
5. `05-invitations.md` — How COs grow their communities
6. `10-notices.md` — Members post time-bound asks/offers to the community

### Wave 3 — Operations (nice to have for launch)

7. `06-activity-and-analytics.md` — COs need feedback on whether it's working
8. `07-moderation.md` — COs need tools to handle problems
9. `08-notifications.md` — People need to know things happened
10. `09-integrations-ui.md` — COs need to connect platforms from the UI
11. `11-community-closure.md` — COs need a safe, multi-step way to sunset a community
12. `12-community-relationships.md` — Communities need explicit connections (chapters, affiliations, referrals)

### Dependency notes

- 01 → 02 → 03 form the core loop.
- 04 and 05 extend reach.
- 06-09 are operational concerns that can be built in parallel after the core.
- 10 is independent and can be built anytime after 02.
- 11 depends on 01 and 08 (notifications).
- 12 depends on 01 and optionally 03 (for referral routing).

---

## Reintegration checklist

When you're ready to do the next cycle-planning session:

- [ ] Promote the "Not Built" gaps (§2.3 above) into Linear issues under the `area:communities` label
- [ ] Use the wave-based priority (Wave 1-3) to populate the next 1-2 milestones
- [ ] Update the feature spec status fields in each `docs/specs/communities/*.md` to reflect current build state
- [ ] Once each row is promoted, delete it from this file
- [ ] When this file is empty, delete it — it exists only as a holding pen

_Created 2026-04-13 as part of the ABL PRD rewrite. The original content came from the pre-ABL `00-prd.md` authored 2026-02-23. That original is archived at `_archive/00-prd.2026-02-23.md`._
