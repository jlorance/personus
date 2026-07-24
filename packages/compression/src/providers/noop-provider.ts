/**
 * Default provider: passthrough. Returns the input unchanged so the seam is a
 * zero-behavior-change no-op until a real compressor is explicitly configured.
 */

import { type CompressionProvider, type CompressionResult, estimateTokens } from '../types';

export class NoopProvider implements CompressionProvider {
  readonly name = 'noop';

  async compress(text: string): Promise<CompressionResult> {
    const tokens = estimateTokens(text);
    return {
      content: text,
      originalTokens: tokens,
      compressedTokens: tokens,
      provider: this.name,
    };
  }

  async retrieve(_ref: string): Promise<string> {
    // The no-op provider never mints refs, so nothing is ever retrievable.
    throw new Error('noop compression provider has no retrievable refs');
  }
}
