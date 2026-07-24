# @personus/compression

Vendor-neutral **token-compression seam** — sits in front of the LLM the way `@personus/flags` and `@personus/auth` sit in front of their vendors. Call sites use `compression.compress()` / `compression.retrieve()` and never touch a vendor SDK; the backend is a one-env-var swap.

Motivation: Personus is AI-native with hard LLM cost caps (`per_request_usd`, `per_user_daily_usd`, `per_agent_run_usd`). Compressing tool outputs / RAG chunks / prose before they reach the model directly serves those caps.

## Providers

| `COMPRESSION_PROVIDER` | Behavior |
| --- | --- |
| `noop` (default) | Passthrough. The seam is a zero-behavior-change no-op. |
| `headroom` | HTTP adapter to a self-hosted [Headroom](https://github.com/headroomlabs-ai/headroom) proxy. Requires `HEADROOM_PROXY_URL`. |

The Headroom provider **delegates compression and the reversible (CCR) store to the proxy** — no compressor binary or local state lives in our (serverless) request path. `compress()` **fails open**: any proxy error returns the input unchanged, so a compressor outage never breaks an agent turn.

## Usage

```ts
import { compression } from '@personus/compression';

const { content, ref, originalTokens, compressedTokens } = await compression.compress(payload, {
  kind: 'json',
  minTokens: 512,
});
// send `content` to the model; if `ref` is set, the original is retrievable via
// compression.retrieve(ref) — only meaningful when a retrieve tool is exposed.
```

## ⚠️ Gate: Headroom stays OFF until vetted

A compressor in the request path is a **latency + security surface**, and Headroom's accuracy claims need independent verification. Turning `headroom` on in any live path is gated on the vetting spike (see Linear, Personus MVP). Until then the default is `noop`, and the one wired call site (`apps/web/app/api/mcp/route.ts` outbound payloads) is a passthrough.

Current integration is conservative: external MCP clients are never sent a reversible `ref` they can't reverse — if the provider returns one, the original text is sent instead. Exposing a `retrieve` tool (so reversible CCR mode can be used) is follow-up work.
