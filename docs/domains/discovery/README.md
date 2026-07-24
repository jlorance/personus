---
type: spec
title: Discovery — Spec Suite
description: "This suite covers the Discovery product area: AI agents, humans in-app, and external MCP clients finding trust-backed matches to capability-based queries about people, organizations, and…"
status: planned
tags: [discovery]
timestamp: 2026-04-13
---

# Discovery — Spec Suite

This suite covers the **Discovery** product area: AI agents, humans in-app, and external MCP clients finding trust-backed matches to capability-based queries about people, organizations, and communities. Owns the [North Star metric](/foundation/metrics.md#north-star-metric) — "trust-backed matches delivered per week."

## Status

**No PRD exists yet.** This suite was created on 2026-04-13 as part of the product area decomposition (see [`../_areas.md`](/domains/_areas.md) §Area-3-Discovery).

**Next action:** run `/plan-prd discovery` to author `00-prd.md` using the seed material listed in [`../_areas.md`](/domains/_areas.md) §Area-3-Discovery §Seed-material.

## Spec layout

Once the PRD lands, feature specs live alongside it numbered `01-…`, `02-…`, etc.

Expected feature specs (from the area inventory):
- `00-prd.md` — Discovery PRD (to be authored)
- `01-mcp-endpoint-auth.md` — MCP endpoint authentication (blocks production launch)
- `02-trust-backed-match-scoring.md` — endorsement-path weighting
- `03-ambient-discovery.md` — the Sam+Claude use case (vision.md §UC6)
- `04-query-logs-and-analytics.md` — `query_logs` surfaces
- `05-contact-request-from-match.md` — mediated introduction flow
- `06-cross-community-filtering.md` — endorsees' communities as ranking signal

## Cross-references

- Product area inventory: [`../_areas.md`](/domains/_areas.md) §Area-3-Discovery
- Decomposition rubric: [`../_decomposition.md`](/domains/_decomposition.md)
- Vision §Use Case 6: [`../../foundation/vision.md`](/foundation/vision.md)
- API surface: [`../../foundation/api-surface.md`](/foundation/api-surface.md)
- Agent architecture: [`../../foundation/agents.md`](/foundation/agents.md)
- North Star metric: [`../../foundation/metrics.md`](/foundation/metrics.md)
