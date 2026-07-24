/**
 * Headroom provider — an HTTP adapter to a self-hosted Headroom proxy
 * (https://github.com/headroomlabs-ai/headroom). Headroom compresses tool
 * outputs / RAG chunks / prose before they reach the LLM and stores originals
 * for reversible (CCR) retrieval, so this adapter delegates both compression
 * and the reversible store to the proxy — no compressor binary or local state
 * lives in our (serverless) request path.
 *
 * OFF BY DEFAULT. Selected only when `COMPRESSION_PROVIDER=headroom` AND
 * `HEADROOM_PROXY_URL` is set. Turning it on is gated on the vetting spike
 * (latency + security of a compressor in the request path, and verifying the
 * accuracy claims). `compress` fails OPEN — any proxy error returns the input
 * unchanged so a compressor outage never breaks an agent turn.
 */

import { logger } from '@personus/logger';
import {
  type CompressionOptions,
  type CompressionProvider,
  type CompressionResult,
  estimateTokens,
} from '../types';

const TIMEOUT_MS = 2000;

export class HeadroomProvider implements CompressionProvider {
  readonly name = 'headroom';
  #baseUrl: string;
  #apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.#baseUrl = baseUrl.replace(/\/$/, '');
    this.#apiKey = apiKey;
  }

  #headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.#apiKey) h.authorization = `Bearer ${this.#apiKey}`;
    return h;
  }

  async compress(text: string, opts?: CompressionOptions): Promise<CompressionResult> {
    const originalTokens = estimateTokens(text);
    if (opts?.minTokens && originalTokens < opts.minTokens) {
      return {
        content: text,
        originalTokens,
        compressedTokens: originalTokens,
        provider: this.name,
      };
    }
    try {
      const res = await fetch(`${this.#baseUrl}/compress`, {
        method: 'POST',
        headers: this.#headers(),
        body: JSON.stringify({ text, kind: opts?.kind ?? 'auto' }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`headroom /compress ${res.status}`);
      const data = (await res.json()) as { content?: string; ref?: string };
      const content = typeof data.content === 'string' ? data.content : text;
      return {
        content,
        originalTokens,
        compressedTokens: estimateTokens(content),
        ref: data.ref,
        provider: this.name,
      };
    } catch (err) {
      // Fail open: never let a compressor outage break the turn.
      logger.warn({ err: String(err) }, 'headroom compress failed — passing through uncompressed');
      return {
        content: text,
        originalTokens,
        compressedTokens: originalTokens,
        provider: this.name,
      };
    }
  }

  async retrieve(ref: string): Promise<string> {
    const res = await fetch(`${this.#baseUrl}/retrieve`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({ ref }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`headroom /retrieve ${res.status}`);
    const data = (await res.json()) as { text?: string };
    if (typeof data.text !== 'string') throw new Error('headroom /retrieve returned no text');
    return data.text;
  }
}
