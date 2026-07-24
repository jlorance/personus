---
type: spec
title: Product Area Decomposition — Discipline
description: "A growing product has dozens of features. The naive way to organize specs is \"one doc per feature\" — which works for 10 features and collapses by 30. The slightly-less-naive way is \"one folder per…"
status: superseded
tags: [archived]
timestamp: 2026-04-13
---


# Product Area Decomposition — The Discipline

> **Why this document exists.** When a product is young, everyone knows what it does without writing it down. When it matures, different people draw the boundary lines differently, specs start overlapping, PRDs contradict each other, and engineers lose track of which feature belongs to which initiative. The decomposition discipline is a set of 5 rules you apply consistently to decide: **how many product areas does this product have, and what goes in each one?**
>
> This file is the answer for Personus.ai, written up generically enough that a product leader on a different project could apply the same 5 rules and reach a defensible answer for their product. The concrete result for Personus lives in [`_areas.md`](_areas.md).

## The problem decomposition solves

A growing product has dozens of features. The naive way to organize specs is "one doc per feature" — which works for 10 features and collapses by 30. The slightly-less-naive way is "one folder per table in the database" — which reflects implementation, not user value, so feature conversations keep crossing folder boundaries.

The right unit is the **product area**: a coherent bundle of user value, owned by a single PRD, decomposed into feature specs. A product area answers the question "what is this initiative trying to accomplish for users?" not "what tables does this touch?"

Too few areas and each PRD becomes a 3,000-line monster nobody reads. Too many areas and every feature straddles three PRDs with no clear owner. The target for a mid-complexity product is **6–8 areas**. Fewer for simple products, more for suites-of-products, but most SaaS and b2c products land in that band when decomposed correctly.

## The 5 rules

Apply them in order. Each rule either confirms a candidate area, collapses it into another, or defers it.

---

### Rule 1 — Areas are shaped by user value delivered together

**An area is a coherent chunk of value a user receives as a bundle.** If you could ship a feature without the rest of the area's features existing and the user would still get meaningful value, the feature is probably its own area (or belongs to a different area). If the feature is meaningless in isolation — it only makes sense as part of a bigger story — then it's a subsection, not an area.

**The test:** *"Can I describe what this area delivers to a user in one sentence without mentioning another area?"*

If the sentence has to say "…and then Communities does X with it" or "…and the AI Coach helps them with Y," the candidate isn't a standalone area.

**Applied to Personus:**

- ✅ **Personas** delivers "one user can maintain a master trait pool and publish selective views of themselves to different audiences." Self-contained. Passes Rule 1.
- ✅ **Discovery** delivers "AI agents and humans can find trust-backed matches to queries about people." Self-contained. Passes Rule 1.
- ❌ **Shadow Personas** delivers "non-users become discoverable via other users' endorsements." Can't describe this without invoking Personas (the shadow becomes a persona on claim), the Trust Graph (endorsements are the discovery signal), and Discovery (AI agents find the shadow). Fails Rule 1 — it's a subsection of one of those three areas, not standalone.
- ❌ **Endorsements** delivers "users can endorse each other." Also fails Rule 1 because the value lives entirely in how endorsements feed Discovery ranking and how they live on Personas. Not standalone.

**Rule 1 catches feature-shaped candidates that masquerade as areas.** Shadow personas, endorsements, and contact requests are all features the codebase treats as first-class (dedicated tables, dedicated surfaces) but they don't deliver standalone user value. They're the plumbing inside the Personas area.

---

### Rule 2 — Areas are shaped by architectural boundaries that already exist

**If a concept has its own service layer, its own routes, its own dedicated UI surface, and its own independent release path, it's almost certainly an area.** If it's invoked through another area's service layer or rendered inside another area's surface, it's a subsection.

**The test:** *"Does this have its own service-layer API, or is it invoked through some other area's service layer? Does it have its own routes at the URL level, or does it render inside another area's route tree?"*

**Applied to Personus:**

- ✅ **Communities** has `lib/db/schema/communities.ts`, `app/(dashboard)/communities/`, `app/actions/communities.ts`, its own tables (`communities`, `community_members`, `community_types`). Distinct service layer, distinct routes. Passes Rule 2.
- ✅ **AI Coaches** has `lib/mastra/agents/*.ts`, `coach_sessions` table, `app/(dashboard)/coach/`, `components/coach-chat.tsx`, `app/actions/agents.ts`, `app/actions/coach.ts`. Distinct service layer (Mastra agent runtime), distinct route. Passes Rule 2.
- ❌ **Endorsements** has an `endorsements` table but no dedicated service-layer API — every call site is persona-scoped (`GET persona → include endorsement count`, `POST endorse persona → write endorsement row`). No dedicated route. Fails Rule 2 — it's a subsection of Personas.
- ❌ **Profile Import** has `lib/import/` code and `app/actions/import.ts` but the surface is "seed user traits from LinkedIn/URL" — the result lives in `user_traits`, there's no dedicated import UI, the only consumer is persona creation. Fails Rule 2 — subsection of Personas.

**Rule 2 resolves Rule 1 ambiguities.** Sometimes a candidate passes Rule 1 (delivers standalone value in principle) but fails Rule 2 (has no independent architectural expression). Conversely, a candidate might fail Rule 1 ("just a feature") but pass Rule 2 ("has its own service layer and surface") — in which case it's probably an area anyway, because real architectural separation means real team cognitive overhead, and a dedicated PRD reduces that overhead.

---

### Rule 3 — Cross-cutting concerns are not areas

**Things that touch every area (notifications, audit logs, activity feeds, permissions, PII scanning, accessibility, cost caps) are cross-cutting.** They do not become product areas. They live in principles, foundation architecture documents, or a single "platform operations" area — never in multiple competing PRDs.

**The test:** *"Does every other area have to think about this when it ships a feature?"*

If yes, it's cross-cutting. If no, it's an area.

**Applied to Personus:**

- ❌ **Notifications** — every area emits notifications. Communities posts notices, Personas notifies on endorsement, Discovery notifies on match, Coaches notify on milestone. There is no "Notifications area" — there is a notification delivery mechanism, owned by `platform-ops` or the shared infrastructure layer, and every area's PRD specifies its own notification triggers.
- ❌ **Authentication** — one-time integration (Clerk). Every area consumes it identically. Lives in `authentication.md` foundation doc + a cross-cutting principles gate. Not an area.
- ❌ **Audit logs (`activity_events`)** — every mutation emits one, enforced by the `audit-all-mutations` principle. Not an area.
- ❌ **PII detection** — every free-text input gets scanned, enforced by the `no-pii-in-personas` principle. Not an area.
- ❌ **Accessibility** — every UI surface must meet WCAG 2.1 AA, enforced by the `accessibility-wcag-2-1-aa` principle. Not an area.
- ❌ **Cost caps on LLM calls** — every agent loop respects the caps in `ai.cost_caps`, enforced by the `ai-cost-and-loop-caps` principle. Not an area.
- ⚠️ **Platform Operations** — the exception. Admin surfaces (taxonomy admin, system settings, user ops) are cross-cutting in the sense that they affect all areas, but they have their own UI surface (`apps/admin/`) and their own user (operator), so Rule 2 overrides Rule 3 here. Platform ops is an area.

**Rule 3 is the one most product leaders get wrong.** The failure mode is creating a "Notifications PRD" or an "Auth PRD" because the concern is real and important. It IS real and important — but it's cross-cutting, which means it belongs at a higher abstraction level (principles, architecture, shared infrastructure) than PRDs. A PRD is a product initiative. Notifications isn't an initiative — it's a constraint every initiative must honor.

---

### Rule 4 — Future areas get named, scoped, and deferred — not ignored

**If a candidate area exists in design (vision, business model, foundation docs, research) but has zero code, it still counts as an area.** It gets named, it gets a stub PRD, and it lives in the inventory. But it does NOT get full PRD authoring until the team activates it.

**The test:** *"Does the codebase demonstrate this area today?"*

- **Active** — code exists, features are live or in-progress. Full PRD authoring when the area is picked up.
- **Dormant** — design is complete (documented in vision/foundation/business), zero code, activation timeline unclear. **Stub PRD** (named, scoped, linked to design material) with `status: dormant`. No feature spec authoring.
- **Deferred** — concept exists but even the design isn't firm. Listed in `_areas.md` as a candidate with `status: deferred`, no stub file, no PRD. Revisit later.

**Applied to Personus:**

- ✅ **Commerce Personas & ACP** — fully designed in vision (use case 7) + `data-model.md` commerce traits section, zero code. → `dormant`, stub PRD at `docs/specs/commerce/00-prd.md`.
- ✅ **Sparks (Generosity Engine)** — fully designed in `docs/business-model/03_sparks_generosity_engine.md`, zero code. → `dormant`, stub PRD at `docs/specs/sparks/00-prd.md`.
- ❌ **Billing & Subscriptions** — designed in business model (4 pricing tiers), zero code, commercial necessity but not a user-value-delivering product area. → `deferred`, no stub. Revisit when it moves from commercial plan to product work.

**Rule 4 solves the "everything is a PRD" failure mode.** Without it, product leaders either (a) write full PRDs for features 18 months out, which is expensive and wrong-timed, or (b) ignore dormant areas entirely, which means they fall off the map. The stub PRD is the middle path: the area is visible in the inventory, the seed material is linked, but no authoring happens until activation.

---

### Rule 5 — Target 6–8 areas for a mid-complexity product

**Decomposition is a cap-and-floor exercise, not a greedy-count one.** If you end up with 12 areas, you're splitting too fine and your PRDs will micro-duplicate each other. If you end up with 4, you're grouping too coarse and your PRDs will be so large nobody reads them.

**The test:** *"If I pick up any area's PRD, can I skim it in under 20 minutes and understand the bundle?"*

If no → the area is too big, split.
If "I have 14 of these" → too small, collapse.

**The math:** a typical PRD is 300–800 lines. 6 × 800 = 4,800 lines of PRD cascade; 8 × 500 = 4,000. Either way the product leader reads the whole cascade in a few focused afternoons. With 14 areas × 300 lines = 4,200 lines but with 14 different context switches, which is much worse for retention.

Applied to Personus: the rubric + Rules 1-4 collapsed ~18 candidate areas into **8 final areas**: Personas, Communities, Discovery, AI Coaches, Integrations, Commerce (dormant), Sparks (dormant), Platform Ops. See [`_areas.md`](_areas.md) for the full mapping.

**Rule 5 is the feedback rule.** If Rules 1-4 don't land you in the 6-8 band, revisit. Either you're over-splitting (look for candidates that share service layers and collapse them via Rule 2), or you're under-splitting (look for areas whose one-sentence scope mentions another area's concerns and split them via Rule 1).

---

## The procedure

This is the step-by-step you'd hand to another product leader:

### Step 1 — List every candidate area, no filtering

For each of: existing product surfaces, codebase directories, foundation docs, vision use cases, business model docs, research docs — write down every "thing" that could be an area. Don't pre-filter. A messy list of 15-25 candidates is correct.

**Sources for Personus were:** the 4 existing spec suites, the 10 foundation topic files, the 5 business model files, the 8 use cases in `vision.md`, the 20 principles in `principles.md`, the route groups in `apps/web/app/`, the schema files in `packages/db/src/schema/`, the 3 archived UX/feature spec files.

### Step 2 — Apply Rule 1 (user-value test)

For each candidate, write the one-sentence scope: "X delivers Y to users." If the sentence requires naming another candidate, flag it as "absorbable" and note which other candidate absorbs it. Don't collapse yet — just mark the relationships.

### Step 3 — Apply Rule 2 (architectural-boundary test)

For each candidate that survived Rule 1, verify it has its own service layer, own routes, own surface. If it doesn't, that's additional evidence it should collapse into a parent. If it does but Rule 1 said it absorbs into another, reconsider — sometimes Rule 2 overrides Rule 1.

### Step 4 — Apply Rule 3 (cross-cutting filter)

For each surviving candidate, ask: "does every other area have to think about this?" If yes, move it out of the area list into principles, architecture, or a shared-infrastructure section. Accept one exception for a dedicated operator surface (Platform Ops).

### Step 5 — Apply Rule 4 (dormant/deferred triage)

For each surviving candidate, check activation state. Active → full area. Dormant → area with stub PRD. Deferred → candidate, no file.

### Step 6 — Apply Rule 5 (cardinality check)

Count the result. If >8, find the two areas with the weakest independence and collapse. If <6, find the area whose one-sentence scope sprawls across multiple user-value bundles and split. Iterate until you're in the 6-8 band.

### Step 7 — Write `_areas.md`

One row per final area. For each: name, one-sentence scope, status, PRD path, seed material (existing specs, foundation docs, archive files, code paths), known features, open questions. This is the inventory you hand to the PRD authoring process.

### Step 8 — Hand to `/plan-prd` one area at a time

Active areas get full PRDs via `/plan-prd <area>`. Dormant areas get stub PRDs (hand-authored or via `/plan-prd --stub`). Deferred candidates wait.

---

## Anti-patterns to avoid

Things that look like good decomposition but aren't:

### "One area per database table"

**Why it fails:** reflects implementation, not user value. Users don't think in tables. Features routinely span tables. A "Users area" + "Personas area" + "Traits area" would split up what should obviously be one Personas PRD.

**What to do instead:** apply Rule 1 first and let tables group themselves.

### "One area per team / org chart line"

**Why it fails:** team structure shifts. The decomposition should survive re-orgs. Also: teams often own features across multiple product areas (a platform team might own both notifications and audit logs across all user-facing areas).

**What to do instead:** decompose by user value, then assign teams to areas.

### "One area per top-level route"

**Why it fails:** route structure is a UX decision, not a product decision. `/(dashboard)/explore` and `/(dashboard)/recommend` are two routes but one product area (Discovery). Conversely `/(dashboard)/coach` and `/(dashboard)/dashboard` are two routes that might be the same area (Onboarding via Coaches) or different areas, depending on scope.

**What to do instead:** use routes as a Rule-2 signal (does this concept have a dedicated route? might be an area), not as the primary decomposition tool.

### "One area per buzzword in the pitch"

**Why it fails:** "AI-native," "privacy-first," "trust-backed" are marketing claims, not product areas. A "Privacy area" is wrong because privacy is cross-cutting (Rule 3).

**What to do instead:** buzzwords belong in `vision.md` and `principles.md`, not in the spec cascade.

### "Future features get a PRD now so we don't forget them"

**Why it fails:** violates Rule 4. Authoring a full PRD for a feature 18 months out wastes time (requirements will change), creates decision fatigue (you're making commitments without information), and dilutes the PRD cascade (readers can't tell active from speculative).

**What to do instead:** stub PRDs for dormant work, `_areas.md` row for deferred candidates, nothing at all for pure speculation.

### "One big PRD that covers everything"

**Why it fails:** violates Rule 5 on the low end. An 8,000-line mega-PRD is nobody's working document — it becomes a reference artifact that nobody reads and nobody updates. Feature specs have no clear parent. Changes require coordinating across the whole document.

**What to do instead:** decompose. Rule 5 forces you to.

---

## The discipline, in one paragraph

**A product area is a coherent bundle of user value (Rule 1) with its own architectural footprint (Rule 2), separate from cross-cutting concerns that every area must honor (Rule 3). Dormant areas get stub PRDs and live in the inventory; deferred candidates wait (Rule 4). The total count lands at 6–8 for a mid-complexity product, more or less by enforcement (Rule 5). The output is `_areas.md`, the input to the PRD cascade.**

If you can hold that paragraph in your head, you can decompose any product.

---

## Cross-references

- Personus's applied result: [`_areas.md`](_areas.md)
- ABL PRD template: [`../../.claude/skills/abl/plan-prd/prd-template.md`](../../.claude/skills/abl/plan-prd/prd-template.md)
- Principles (cross-cutting concerns that are NOT areas): [`../foundation/principles.md`](../foundation/principles.md)
- Architecture (where cross-cutting concerns do live): [`../foundation/architecture.md`](../foundation/architecture.md)
- Vision (source of user-value framing): [`../foundation/vision.md`](../foundation/vision.md)

_Authored 2026-04-13 by `/plan-foundation` as part of the pre-ABL spec migration — written generically enough to serve as a transferable decomposition discipline for other products._
