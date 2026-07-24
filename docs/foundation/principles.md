---
type: foundation
title: Personus.ai — Principles
description: "Domains: Privacy, Security & AuthZ, Accessibility, Mobile UX, Performance, AI Safety, Trust & Verification, Data Sovereignty, Growth-Surface Discipline."
status: current
tags: [foundation]
timestamp: 2026-04-12
---


# Personus.ai — Principles

> **This is the canonical library principles document.** Every PRD, Feature Spec, Schema Spec, ADR, and Pull Request must be checkable against this file. Downstream skills (`/plan-prd`, `/plan-spec`, `/plan-schema`, `/improve`, `/bug`, `/review`, `/check-alignment`, `/check-compliance`) read this file.
>
> **Two tiers:**
> 1. **Gate principles** (spec-gating) — checked by `/plan-foundation check <spec>` and `/review`. Each has a **Check** and **Waiver** field. Violating one blocks the spec.
> 2. **Vision principles** (design philosophy) — listed in [§Vision Principles](#vision-principles) as a reference. Inform product reasoning but are not spec gates.
>
> The gate tier was historically stored as `## Project Baseline` in [`CLAUDE.md`](../../CLAUDE.md). It has been promoted to this canonical location. CLAUDE.md now points here.

## Conventions

- **id**: lowercase-kebab-case, stable, referenced from specs and PRs
- **Principle**: the rule, one sentence
- **Why**: the reason the principle exists — historical incident, architectural property, legal/compliance driver
- **Check**: what a spec or PR must demonstrate to satisfy the rule
- **Waiver**: when the rule can be bent and by whose authority; `None` if non-negotiable

Domains: **Privacy**, **Security & AuthZ**, **Accessibility**, **Mobile UX**, **Performance**, **AI Safety**, **Trust & Verification**, **Data Sovereignty**, **Growth-Surface Discipline**.

---

# Gate Principles

## Privacy

### no-pii-in-personas

**Principle**: Personas expose capabilities, skills, interests, availability — never email, phone, address, or other direct PII. PII detection runs on all free-text input.

**Why**: Architectural privacy guarantee. Personas are AI-discoverable endpoints; leaking PII would undermine the entire product promise.

**Check**: Spec must identify every free-text field and declare PII-scan behavior. Any field that could hold direct identifiers must be justified.

**Waiver**: None — non-negotiable. Authenticated contact channels are separate (see `masked-contact`).

---

### masked-contact

**Principle**: Contact between users flows through privacy-preserving channels (email relay, Signal, in-app) via a `ContactRelay` abstraction. Raw contact details are never surfaced to the requesting party.

**Why**: Core trust model — mediated contact is the alternative to exposing PII for discovery to work.

**Check**: Spec must route any contact flow through `ContactRelay`. Any new channel must be declared as an adapter, not a direct integration.

**Waiver**: Organization personas may expose public channels (support email) when the owner explicitly opts in.

---

### consent-by-default

**Principle**: Contact, discovery, data-sharing, and communication preferences follow structured consent categories with privacy-preserving defaults. Defaults set at profile level, overridable per persona.

**Why**: GDPR/CCPA compliance + product ethos. Consent is declared state, not derived state.

**Check**: Spec must enumerate which consent categories gate the feature and what the default is. Any change in defaults requires explicit migration notes.

**Waiver**: None for sensitive flows (contact, data sharing). Discovery defaults can be tuned for specific surfaces with product approval.

---

### profile-is-master-personas-are-lenses

**Principle**: Users maintain one comprehensive profile (master attribute pool). Personas are selective views over that pool — they do not duplicate source-of-truth data ambiguously. Sharing attributes across personas must not create implicit links between them (unlinkability).

**Why**: Privacy + ergonomics. Eliminates repetition while preserving persona isolation.

**Check**: Spec must show how new persona-scoped data relates to the profile pool. If it introduces duplication, the dedup / linkability trade-off must be documented.

**Waiver**: Persona-specific context that has no profile-level analog is acceptable (e.g., community-scoped fields).

---

## AI Discoverability

### ai-native-discoverability

**Principle**: Every persona and community is a machine-readable endpoint. JSON-LD, schema.org, MCP tools, and structured query surfaces must be maintained alongside human UI.

**Why**: The product's primary consumer is AI agents; human UI is secondary. Silent HTML-only surfaces regress the core value prop.

**Check**: Spec must identify how the feature exposes structured data (JSON-LD on the page, MCP tool, GraphQL field, or explicit justification for internal-only).

**Waiver**: Internal admin tools and purely operational UI are exempt.

---

## Security & Authorization

### authz-at-service-layer

**Principle**: Every mutation and every read of a sensitive entity enforces authorization at the service layer, not just the route layer. Service functions take a `principal` parameter (required pattern).

**Why**: Defense in depth — routes can be bypassed by internal callers, agents, and future MCP tool exposure. Aligns with Solution Profile `authz.principal_pattern: required`.

**Check**: Spec must identify the service function signature(s) and the CASL ability check. No service function may derive `userId` from request body.

**Waiver**: None for sensitive entities (`users`, `user_traits`, `personas`, `shadow_personas`, `contact_requests`, `endorsements`, `platform_channel_bindings`, `coach_sessions`). Read-only public endpoints may skip the principal parameter when the data is fully public.

---

### sensitive-resource-returns-404

**Principle**: When an unauthorized actor attempts to access a sensitive resource, return 404 (existence-hiding), not 403.

**Why**: Enumeration resistance — 403 leaks existence; 404 preserves privacy of persona graphs and membership.

**Check**: Spec must declare the response code for the unauthorized case on any sensitive-entity endpoint.

**Waiver**: Public personas may return 403 when the resource is known-public but action-restricted.

---

### audit-all-mutations

**Principle**: Every state-changing operation on user data emits an `activity_events` row with actor, action, target, timestamp, and source.

**Why**: GDPR/CCPA audit trail, security forensics, user-facing activity feeds.

**Check**: Spec must list which activity events the feature emits and confirm the writer path goes through the shared events helper.

**Waiver**: None. Read operations are exempt unless the read itself is sensitive (e.g., exporting trait data).

---

## Accessibility

### accessibility-wcag-2-1-aa

**Principle**: Every customer-facing feature meets WCAG 2.1 AA: keyboard-only navigation, screen-reader labels, 4.5:1 contrast, focus management.

**Why**: Legal compliance (ADA, EAA) + inclusive product values. Social networks without accessibility exclude the users we most want to discover.

**Check**: Spec must include a keyboard navigation path, screen reader behavior for interactive elements, and contrast notes for any custom color use.

**Waiver**: Internal admin (`apps/admin`) can be AA-best-effort with documented gaps.

---

## Mobile UX

### mobile-first-ui

**Principle**: Every customer-facing UI surface must work on mobile before it works on desktop. Touch targets ≥44×44pt, minimal horizontal scrolling, fast load times on throttled 4G, no interaction patterns that require hover.

**Why**: The primary acquisition path for Personus is "someone in a Discord/Telegram/WhatsApp chat taps a link to a persona or community." That tap happens on a phone. A desktop-first surface that degrades on mobile regresses the core acquisition loop. The existing Communities PRD named this as a cross-cutting concern; promoting it to a principle gates every new UI spec.

**Check**: Spec must demonstrate the mobile layout before the desktop layout, specify minimum touch target sizes, and identify any interaction that relies on hover or precise pointer input. Lighthouse mobile score ≥ 90 for public-facing pages.

**Waiver**: Internal admin (`apps/admin`) can be desktop-first. Platform-ops tools for operators are exempt. Any other waiver requires explicit justification citing the specific user surface being exempted and why the mobile path is not load-bearing.

---

## Performance

### latency-p95-500-1000

**Principle**: Customer-facing reads respond in p95 < 500ms; writes p95 < 1s. Agent-mediated operations (coach chat, semantic search) have separate declared budgets.

**Why**: Social discovery depends on snappiness; slow search kills the core loop.

**Check**: Spec must declare expected latency target and identify any operation likely to exceed it (with caching, background processing, or streaming plan).

**Waiver**: Bulk operations, profile imports, and embedding regeneration may exceed the budget if they run async and show progress.

---

## AI Safety

### ai-cost-and-loop-caps

**Principle**: Every LLM call respects cost caps from the Solution Profile. Every agent loop has a max-iteration cap and a max-cost cap with a killswitch.

**Why**: Agent loops without caps are a runaway-cost and runaway-tool-use risk. This is the single most common AI production incident.

**Check**: Spec must declare `max_iterations`, `max_cost_usd`, and the killswitch behavior for any new agent loop. Tool definitions must document side-effect classification (read / mutate / external).

**Waiver**: None — caps are required for any Mastra agent or AI SDK loop that reaches production.

---

## Trust & Verification

### verification-is-explicit

**Principle**: Persona/community verification is explicit (domain verification, business license, or delegation). Verified, official, and basic tiers are visually and structurally distinct.

**Why**: Trust graph integrity. Implicit verification would create silent credential inflation.

**Check**: Spec must identify which verification tier applies, how it is displayed, and what the fallback is for unverified actors.

**Waiver**: None for the tier display itself; the verification pathways themselves can vary per entity type.

---

### trust-through-endorsements-not-reviews

**Principle**: Trust signals are expressed as **endorsements** — positive-only, context-tagged, grounded in declared relationship types. No star ratings, no numeric reviews, no anonymous feedback, no complaint channels.

**Why**: Review systems produce adversarial dynamics (review bombing, retaliation, gaming) that destroy the trust graph. Endorsements-only is the core differentiator from LinkedIn recommendations, Angi reviews, and Google ratings. Promoted from vision principle 7.

**Check**: Spec must not introduce any rating, score, review, complaint, or negative-signal surface on personas or communities. Endorsements must be explicitly scoped to a declared relationship type. New trust signals must be justified against this principle before merge.

**Waiver**: None. Moderation-facing internal tools (e.g., admin flagging of abusive personas) are not "reviews" and are out of scope for this principle.

---

### unified-entity-model-for-people-and-orgs

**Principle**: People and organizations are both stored as `personas` rows differentiated by `entityType`. The same endorsement system, the same search, the same discovery surface. Never create a separate `organizations` table or a parallel entity type with its own endorsement schema.

**Why**: The unified model is a core architectural decision. Duplicating the entity model for orgs was explicitly rejected during data-model design — it would fragment search, halve network effects, and create a second-class citizen problem where organizations get less discovery quality than people.

**Check**: Any spec introducing a new entity type or discovery-eligible concept must show how it fits into the `personas` table with `entityType`, or justify a net-new table with an ADR.

**Waiver**: Context Layer data (community-scoped fields on `community_members`) is exempt — that's per-membership state, not a separate entity type. Shadow personas stay in `shadow_personas` by design.

---

## Data Sovereignty

### personal-agency-not-platform-lockin

**Principle**: Users own their data, their DID-based identity, and their personas. Any feature that stores user data must have a documented export path; any identity feature must work with an externally-issued DID. Personus is a control plane, not a walled garden.

**Why**: Data portability is an architectural requirement, not a feature. Without it, the "personal agency in the agentic era" promise collapses. Also: GDPR Article 20 (right to data portability) and the AT Protocol ecosystem both require it.

**Check**: Spec must identify what data the feature stores, how it can be exported (GraphQL, JSON dump, AT Protocol sync), and what happens to the data on account deletion. Any lock-in (proprietary format, un-exportable state) is an explicit spec gate failure.

**Waiver**: Derived state (embeddings, cached query results, activity-feed denormalizations) is exempt — it can be regenerated. Only source-of-truth data is gated.

---

## Growth-Surface Discipline

### every-public-surface-has-a-claim-path

**Principle**: Every public persona, public community, and shared-link surface must include a path to claim, endorse, or join. No dead-end public pages.

**Why**: Shadow personas + endorsement flywheel only work if every public touchpoint pushes the viewer into the network. A public persona page without a claim link leaks traffic and breaks the growth loop. Promoted from vision principle 14.

**Check**: Any spec that adds a public (unauthenticated) surface must identify the CTA (claim-this-persona, endorse-this-person, join-this-community) and confirm it's above the fold.

**Waiver**: `StatusPage`, `DocsSite`, and other non-persona public surfaces are exempt. The principle applies specifically to persona/community/endorsement pages.

---

# Vision Principles

These are the 20 foundational principles originally numbered in `01-vision-and-principles.md` (now archived) §Foundational Principles. They inform product reasoning and architectural decisions but are **not** spec-gating. The subset that rose to spec gates is listed above.

1. **No PII, ever.** → promoted to [`no-pii-in-personas`](#no-pii-in-personas)
2. **Masked contactability.** → promoted to [`masked-contact`](#masked-contact)
3. **Every persona is an addressable endpoint.** Unique URI, queryable via MCP/GraphQL/NLP. *(Design philosophy — architecture-level, not spec-gated.)*
4. **Dual query interface.** NLP Gateway for AI agents and humans, GraphQL for enterprise and developers. *(Architecture-level.)*
5. **AI-native.** → promoted to [`ai-native-discoverability`](#ai-native-discoverability)
6. **Voice-first persona creation.** Persona Coach builds rich portraits through conversation. *(UX philosophy — feature-level.)*
7. **Trust through endorsements, not reviews.** → promoted to [`trust-through-endorsements-not-reviews`](#trust-through-endorsements-not-reviews)
8. **Profile is everything, personas are lenses.** → promoted to [`profile-is-master-personas-are-lenses`](#profile-is-master-personas-are-lenses)
9. **Communities are optional, context is powerful.** *(Product-shape decision — see the archived `08-guilds.md` at [`_archive/legacy-2026-02-24/08-guilds.md`](/archive/legacy/foundation/_archive/legacy-2026-02-24/08-guilds.md); a future spec migration will port this into `docs/specs/communities/`.)*
10. **General endorsements with discovery context.** *(Endorsement model — see [`../specs/personas/schema-spec.md`](/domains/personas/schema-spec.md) §Endorsement.)*
11. **Unified model for people and organizations.** → promoted to [`unified-entity-model-for-people-and-orgs`](#unified-entity-model-for-people-and-orgs)
12. **Communities own schema, individuals own data.** *(Authz decision — see [`authorization.md`](/foundation/authorization.md) + archived [`_archive/legacy-2026-02-24/08-guilds.md`](/archive/legacy/foundation/_archive/legacy-2026-02-24/08-guilds.md).)*
13. **Delegated control without ownership transfer.** *(Authz decision — see [`authorization.md`](/foundation/authorization.md).)*
14. **Every surface is a growth surface.** → promoted to [`every-public-surface-has-a-claim-path`](#every-public-surface-has-a-claim-path)
15. **Lightweight recommendation capture.** *(UX philosophy — feature-level.)*
16. **Verification builds trust.** → already covered by [`verification-is-explicit`](#verification-is-explicit)
17. **GDPR-inspired consent by default.** → already covered by [`consent-by-default`](#consent-by-default)
18. **Commerce personas control agent behavior.** *(Feature-level — gated indirectly by [`consent-by-default`](#consent-by-default) for commerce disclosure categories. When commerce ships, consider promoting to its own gate.)*
19. **Open social web citizen.** *(Architecture-level — see [`at-protocol.md`](/foundation/at-protocol.md). Ecosystem survey in [`../research/at_protocol_integration.md`](/research/at_protocol_integration.md).)*
20. **Personal agency, not platform lock-in.** → promoted to [`personal-agency-not-platform-lockin`](#personal-agency-not-platform-lockin)

---

# How Skills Use This File

| Skill | What it reads | What it does |
|---|---|---|
| `/plan-prd` | All gate principles | Ensures PRD opening reflects relevant gates; prompts for waiver if violated |
| `/plan-spec` | All gate principles | Injects **Check** items into the spec's Verification section |
| `/plan-schema` | Privacy + AuthZ gates | Flags sensitive entities missing RLS; requires principal parameter |
| `/improve`, `/bug` | All gate principles | Injects gate items into AR (Authorization) and DR (Data Governance) sections |
| `/review` | All gate principles | AR-by-AR evidence mapping; blocks merge on unwaived violations |
| `/check-alignment` | All gate principles | Drift report: which specs/PRs name a gate vs. silently violate one |
| `/check-compliance` | Privacy + AuthZ + Audit gates | Generates GDPR/CCPA evidence pack |
| `/audit-security` | Security & AuthZ gates | Service-layer principal check, RLS check, 404-not-403 check |
| `/audit-data-governance` | Privacy + Audit gates | PII scan behavior, activity_events coverage, consent defaults |
| `/plan-foundation check <spec>` | All gate principles | Classifies each principle as Satisfied / Waived / Silent / Violated / NA |

---

# Maintenance

- **New gate principles** go in the appropriate domain section above and get ids in lowercase-kebab-case.
- **Retiring a principle** requires an ADR explaining why it's no longer load-bearing.
- **Changes to a gate's Check or Waiver** should be reviewed as carefully as an ADR — they shift what every spec has to prove.
- **The 20 vision principles** are stable; they change only when the product thesis shifts.

_Last updated 2026-04-12 by `/plan-foundation` (extracted from `CLAUDE.md §Project Baseline` + the archived `01-vision-and-principles.md §Foundational Principles`, with 4 vision principles promoted to gates)._
