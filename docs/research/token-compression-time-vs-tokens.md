---
type: research
title: Token compression — time vs. tokens (PER-17 spike)
description: Does compressing LLM input save wall-clock time, or only tokens/cost? Analysis + Personus-specific recommendation.
status: current
tags: [research, compression, ai]
timestamp: 2026-07-24
---

# Token compression — time vs. tokens (PER-17 spike)

**Question:** does the compression layer (`@personus/compression` / Headroom) make things *faster* for the LLM, or does it only save *tokens* (cost)?

**Short answer:** primarily **tokens/cost**. Wall-clock time savings are real only in a narrow regime — very long inputs, or cache-aligned repeats — and at our payload sizes are offset by the compression step's own latency. Treat compression as a **cost-cap lever, not a speed lever.**

## Why — LLM latency = prefill + decode

An LLM request splits into two phases:

- **Prefill** — process all *input* tokens. Parallel, compute-bound, fast per token. Sets **time-to-first-token (TTFT)** and scales with input length.
- **Decode** — generate *output* tokens one at a time. Sequential, memory-bandwidth-bound. **Dominates total latency** for normal-length answers.

Compression shrinks the **input** → shorter prefill → lower TTFT and lower input cost. It does **not** change the output → **decode time is unchanged** → total generation time is roughly unchanged. So:

> Compression **always** reduces input-token cost. It reduces **time** only to the extent prefill is a meaningful share of total latency.

## The overhead you pay

Compression isn't free. Headroom runs an ONNX model, and our adapter adds a proxy round-trip (2 s timeout) **on every request, before the LLM call**. Net effect:

```
Δ wall-clock  =  prefill_time_saved  −  compression_overhead  (± cache effects)
```

- **Large input, small output** → prefill share high → can be net faster *if* overhead < prefill saved.
- **Small / typical payloads** → prefill share low → overhead dominates → **net slower**.

## Measured reality (this repo)

`bun run compression:benchmark` on realistic MCP outbound payloads:

| payload | tokens | clears 512 gate? |
| --- | --- | --- |
| persona detail | ~200 | no |
| community list (8) | ~419 | no |
| search (3 results) | ~722 | yes |
| search (10 results) | ~2,393 | yes |

Most payloads are a few hundred tokens; only large result sets clear the gate. Prefill for a few hundred–few thousand tokens is **tens of milliseconds** on current models — smaller than a proxy round-trip. So at the **MCP boundary today, compression saves ~0 wall-clock** (often negative once overhead is counted); its value there is purely token/cost, and only on the large-result tail.

## Where time savings ARE real

1. **Very long contexts** (tens of thousands of tokens) where prefill is *seconds* — compressing 50k→10k shaves real TTFT.
2. **Cache alignment** (Headroom's `CacheAligner`): stabilizing prefixes so the provider **KV cache hits** → a cached prefix skips prefill entirely on repeats. This saves time *and* cost and is largely independent of compression ratio — the strongest time lever, but it needs repeated, stable, large prefixes.
3. **Avoiding truncation / fewer round-trips** — if compression lets one call do what otherwise took two.

## For Personus specifically

- **MCP outbound** (where the seam is wired): we compress what we send to an *external* agent → that reduces **their** input tokens/prefill, not our latency. Benefit accrues to the caller's cost; marginal to us.
- **Our own Mastra agents** (multi-turn, tool outputs re-entering context): the real candidate — accumulated tool context across turns is where prefill grows. Compression there could help cost and, on long contexts, time — but only if payloads are large and the overhead is beaten. **Not yet measured.**

## Recommendation

- **Keep Headroom OFF (`noop`).** The measured addressable surface at the MCP boundary is small and time-neutral; enabling it there is cost-only and marginal.
- **Reconsider at the agent-context path**, not the MCP boundary — and only after measuring real agent-turn payload sizes.
- **If the goal is latency, compression is the wrong tool.** Higher-leverage moves: provider prompt/prefix caching (e.g. Anthropic prompt caching), context trimming, streaming, and routing cheap sub-tasks to smaller/faster models.
- **Verify before trusting.** Headroom makes *no* latency claims and its accuracy benchmarks are self-reported — validate "same answers" on our own payloads (the accuracy criterion in PER-17) before enabling anywhere.

See also: `packages/compression/README.md`, PER-17, and the cost-cap discipline in the AI area.
