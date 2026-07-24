/**
 * Token-compression seam types.
 *
 * The seam sits in front of the LLM the same way the flags/auth seams sit in
 * front of their vendors: call sites talk to `compression`, never to a vendor
 * SDK, so the backend is a one-env-var swap. The default provider is a no-op
 * passthrough — turning on a real compressor (e.g. Headroom) is opt-in and
 * gated on the vetting spike, because a compressor in the request path is a
 * latency + security surface (see the package README / Linear spike).
 */

/** What kind of payload is being compressed — lets a provider pick a strategy. */
export type CompressionKind = 'auto' | 'json' | 'code' | 'prose';

export interface CompressionOptions {
  /** Content hint; providers may ignore it and auto-detect. */
  kind?: CompressionKind;
  /** Skip compression when the estimated token count is below this. */
  minTokens?: number;
}

export interface CompressionResult {
  /** The (possibly) compressed text to hand to the model. */
  content: string;
  /** Rough token estimate of the original input. */
  originalTokens: number;
  /** Rough token estimate of `content`. */
  compressedTokens: number;
  /**
   * Opaque handle for reversible (CCR) retrieval, when the provider stored the
   * original. `undefined` means the result is self-contained (e.g. no-op, or a
   * lossless-prose compression that needs no retrieval).
   */
  ref?: string;
  /** Which provider produced this result. */
  provider: string;
}

export interface CompressionProvider {
  readonly name: string;
  /** Compress `text`. Must never throw for ordinary input — fail open to passthrough. */
  compress(text: string, opts?: CompressionOptions): Promise<CompressionResult>;
  /** Reverse a `ref` produced by `compress`. Throws if the provider is stateless. */
  retrieve(ref: string): Promise<string>;
}

/** Cheap, dependency-free token estimate (~4 chars/token). Good enough for gating. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
