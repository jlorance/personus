---
type: guide
title: Personus.ai Documentation
description: "Legacy hand-written nav index; superseded by the generated index.md."
status: superseded
tags: [archived]
---

# Personus.ai Documentation

## Foundation

The product bible — vision, data model, and system design. Stable, rarely changes.

| Doc | What it covers |
|-----|---------------|
| [Vision](foundation/vision.md) | Positioning, JTBD, personas, core use cases, time horizons |
| [Strategy](foundation/strategy.md) | Playing to Win strategy stack (stub — requires authoring) |
| [Principles](foundation/principles.md) | Spec-gating principles + 20 vision principles |
| [Data Model](foundation/data-model.md) | Entities, hybrid JSONB approach, cross-area invariants |
| [Architecture](foundation/architecture.md) | System topology, component map, package structure |
| [API Surface](foundation/api-surface.md) | Server actions, MCP endpoint, GraphQL (future) |
| [Agents](foundation/agents.md) | Mastra agents, cost caps, tool design |
| [Authorization](foundation/authorization.md) | CASL + Clerk model, principal pattern, sensitive entities |
| [Authentication](foundation/authentication.md) | Clerk, phone, Apple, Google, Bluesky OAuth |
| [AT Protocol](foundation/at-protocol.md) | Bluesky/AT Protocol integration design |
| [Deployment](foundation/deployment.md) | Vercel, Neon, environment config |
| [Business](foundation/business.md) | Lean Canvas, TAM/SAM/SOM, unit economics |
| [Metrics](foundation/metrics.md) | North Star, input metrics, counter-metrics, activation funnel |
| [Master Spec](foundation/master-spec.md) | Foundation index with line counts and status |

## Specs

Implementation-level specs organized by domain. Each suite has a PRD (00) followed by feature specs. Stories map 1:1 to Linear issues.

| Suite | Specs | Focus |
|-------|-------|-------|
| [Personas](specs/personas/) | 10 (00-09) | Persona lifecycle, profile, traits, visibility, layout, public pages, shadows, cross-persona linking, editing patterns |
| [Communities](specs/communities/) | 12 (00-12) | Lifecycle, membership, directory, discovery, invitations, analytics, moderation, notifications, integrations, notices, closure, relationships |
| [Integrations](specs/integrations/) | 11 (00-10) | Shared architecture, Matrix, bots, WhatsApp, Signal, Telegram, Discord, Slack, ActivityPub, activity tracking |
| [Platform Ops](specs/platform-ops/) | 6 (00-05) | Monorepo migration, taxonomy admin, trait metadata admin, system settings, user & community ops |
| [Discovery](specs/discovery/) | pending | AI-powered capability matching, MCP auth, trust-backed scoring |
| [AI Coaches](specs/coaches/) | pending | Persona coach, recommender, community coach, progressive onboarding |
| [Commerce](specs/commerce/) | dormant | Commerce personas, agentic commerce protocol |
| [Sparks](specs/sparks/) | dormant | Generosity engine credit system |

Templates: [Spec Template](specs/_templates/SPEC_TEMPLATE.md) | [Story Template](specs/_templates/STORY_TEMPLATE.md)

Area inventory and decomposition: [Areas](specs/_areas.md) | [Decomposition](specs/_decomposition.md) | [PRD Shape](specs/_prd-shape.md) | [Schema Vocabulary](specs/_schema-vocabulary.md)

## Patterns

Cross-cutting design patterns that prescribe how to build. Referenced by multiple spec suites.

| Pattern | What it covers |
|---------|---------------|
| [UI Components](patterns/ui-components.md) | Component architecture, metadata-driven rendering, shadcn/ui usage |
| [Consumer UX](patterns/consumer-ux.md) | Hero prompts, immersive cards, spacing, tone, no internal jargon |
| [Profile Page Design](patterns/profile-page-design.md) | Profile page patterns from LinkedIn, Behance, about.me, etc. |
| [Apple Music UX](patterns/apple-music-ux.md) | Apple Music spatial/editorial patterns adapted for identity |

## Business Model

| Doc | What it covers |
|-----|---------------|
| [01 Executive Summary](business-model/01_executive_summary.md) | PBC mission, principles, revenue architecture |
| [02 Packaging & Pricing](business-model/02_packaging_and_pricing.md) | Solo / Community Organizer / Pathfinder / Enterprise tiers |
| [03 Sparks Engine](business-model/03_sparks_generosity_engine.md) | Sparks credit system design |
| [04 Growth & Economics](business-model/04_growth_model_and_economics.md) | Network flywheel, unit economics, projections |
| [05 Competitive Landscape](business-model/05_competitive_landscape.md) | Incumbent analysis, market positioning |

## Decisions

Architecture Decision Records — what was decided and why.

| Decision | Summary |
|----------|---------|
| [Database Choice](decisions/database-choice.md) | Why Neon Postgres + pgvector |
| [Single Codebase](decisions/single-codebase.md) | Why Mastra agents live inside Next.js |
| [Package Summary v2](decisions/package-summary-v2.md) | Dependency inventory and rationale |

## Research

Exploratory analysis that fed into decisions and patterns. Input, not prescription.

| Topic | What it covers |
|-------|---------------|
| [Agentic Commerce](research/agentic_commerce_integration.md) | AI shopping agent integration patterns |
| [AT Protocol](research/at_protocol_integration.md) | Bluesky/AT Protocol technical deep-dive |
| [Attribute Naming](research/attribute_naming_patterns.md) | How other platforms name profile fields |
| [Digital Identity Landscape](research/digital_identity_landscape.md) | Market survey of identity platforms |
| [Matrix Protocol](research/matrix_protocol_integration.md) | Matrix/Element integration feasibility |
| [Naming Plan](research/naming_plan.md) | Field rename decisions (implemented) |
| [Taxonomy Curation](research/taxonomy_curation_guide.md) | How to curate taxonomy values |
| [Telegram](research/telegram_integration.md) | Telegram bot integration |
| [WhatsApp](research/whatsapp_integration.md) | WhatsApp Business API integration |
| [WhatsApp Summary](research/whatsapp_integration_summary.md) | WhatsApp integration executive summary |

## Guides

How-to docs for contributors and AI agents working on this codebase.

| Guide | What it covers |
|-------|---------------|
| [Journey Overview](guides/01-journey-overview.md) | How this project was built with Claude Code |
| [Prompting Playbook](guides/02-prompting-playbook.md) | Effective prompts for AI-assisted development |
| [Phase Guide](guides/03-phase-guide.md) | Development phases and milestones |
| [Conventions & Patterns](guides/04-conventions-and-patterns.md) | Code conventions for contributors |
| [Lessons Learned](guides/05-lessons-learned.md) | What worked, what didn't |
| [MCP Testing](guides/mcp-testing-guide.md) | How to test the MCP endpoint |
