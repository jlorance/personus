/**
 * Token compression — the vendor-neutral seam that sits in front of the LLM.
 *
 * `COMPRESSION_PROVIDER` selects the backend (noop | headroom). The no-op
 * provider is the default: the seam is a zero-behavior-change passthrough until
 * a real compressor is explicitly configured. Call sites use the thin
 * `compression.compress()` / `compression.retrieve()` helpers and never touch a
 * vendor SDK — swapping providers is a one-env-var change, exactly like
 * `@personus/flags` and `@personus/auth`.
 *
 * Why gated: a compressor in the request path is a latency + security surface,
 * and the accuracy claims need verification. So `headroom` requires both
 * `COMPRESSION_PROVIDER=headroom` and `HEADROOM_PROXY_URL`, and stays off until
 * the vetting spike clears it. `compress` fails open to passthrough.
 */

import { env } from '@personus/env';
import { logger } from '@personus/logger';
import { HeadroomProvider } from './providers/headroom-provider';
import { NoopProvider } from './providers/noop-provider';
import type { CompressionOptions, CompressionProvider, CompressionResult } from './types';

let provider: CompressionProvider | undefined;

function selectProvider(): CompressionProvider {
  const name = (env.COMPRESSION_PROVIDER ?? 'noop').toLowerCase();
  switch (name) {
    case 'noop':
      return new NoopProvider();
    case 'headroom': {
      const url = env.HEADROOM_PROXY_URL;
      if (!url) {
        logger.warn(
          'COMPRESSION_PROVIDER=headroom but HEADROOM_PROXY_URL is unset — falling back to noop',
        );
        return new NoopProvider();
      }
      return new HeadroomProvider(url, env.HEADROOM_API_KEY);
    }
    default:
      logger.warn({ provider: name }, 'Unknown COMPRESSION_PROVIDER — falling back to noop');
      return new NoopProvider();
  }
}

/** The active provider (memoized). */
export function getProvider(): CompressionProvider {
  if (!provider) provider = selectProvider();
  return provider;
}

/** Reset the memoized provider — test seam only. */
export function resetProvider(): void {
  provider = undefined;
}

/** Thin, ergonomic facade over the active provider. */
export const compression = {
  /** True when a non-passthrough compressor is active. */
  isActive(): boolean {
    return getProvider().name !== 'noop';
  },
  /** Compress text for the model. Fails open to passthrough — safe to call unconditionally. */
  compress(text: string, opts?: CompressionOptions): Promise<CompressionResult> {
    return getProvider().compress(text, opts);
  },
  /** Reverse a ref minted by `compress`. Throws under the no-op provider (no refs exist). */
  retrieve(ref: string): Promise<string> {
    return getProvider().retrieve(ref);
  },
};

export { HeadroomProvider, NoopProvider } from './providers';
export type {
  CompressionKind,
  CompressionOptions,
  CompressionProvider,
  CompressionResult,
} from './types';
export { estimateTokens } from './types';
