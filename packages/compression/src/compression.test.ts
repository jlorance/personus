import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The seam reads env at provider-selection time; mock it per-test.
// `vi.hoisted` so the mock factory (hoisted above imports) can see envMock.
const { envMock } = vi.hoisted(() => ({ envMock: {} as Record<string, string | undefined> }));
vi.mock('@personus/env', () => ({ env: envMock }));
vi.mock('@personus/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import {
  compression,
  estimateTokens,
  getProvider,
  HeadroomProvider,
  NoopProvider,
  resetProvider,
} from './index';

beforeEach(() => {
  for (const k of Object.keys(envMock)) delete envMock[k];
  resetProvider();
});
afterEach(() => vi.restoreAllMocks());

describe('provider selection', () => {
  it('defaults to the no-op passthrough', () => {
    expect(getProvider().name).toBe('noop');
    expect(compression.isActive()).toBe(false);
  });

  it('falls back to noop for an unknown provider', () => {
    envMock.COMPRESSION_PROVIDER = 'wat';
    expect(getProvider().name).toBe('noop');
  });

  it('falls back to noop when headroom is selected without a proxy URL', () => {
    envMock.COMPRESSION_PROVIDER = 'headroom';
    expect(getProvider().name).toBe('noop');
  });

  it('selects headroom when configured with a proxy URL', () => {
    envMock.COMPRESSION_PROVIDER = 'headroom';
    envMock.HEADROOM_PROXY_URL = 'https://headroom.internal';
    expect(getProvider()).toBeInstanceOf(HeadroomProvider);
    expect(compression.isActive()).toBe(true);
  });
});

describe('NoopProvider', () => {
  it('returns input unchanged with equal token counts and no ref', async () => {
    const p = new NoopProvider();
    const r = await p.compress('hello world '.repeat(10));
    expect(r.content).toBe('hello world '.repeat(10));
    expect(r.originalTokens).toBe(r.compressedTokens);
    expect(r.ref).toBeUndefined();
  });

  it('has no retrievable refs', async () => {
    await expect(new NoopProvider().retrieve('x')).rejects.toThrow(/no retrievable refs/);
  });
});

describe('estimateTokens', () => {
  it('approximates ~4 chars per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('HeadroomProvider', () => {
  it('skips compression below minTokens without calling the proxy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const p = new HeadroomProvider('https://headroom.internal');
    const r = await p.compress('tiny', { minTokens: 100 });
    expect(r.content).toBe('tiny');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns compressed content and ref from the proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: 'small', ref: 'ccr_1' }), { status: 200 }),
    );
    const p = new HeadroomProvider('https://headroom.internal/');
    const r = await p.compress('a very large payload '.repeat(50));
    expect(r.content).toBe('small');
    expect(r.ref).toBe('ccr_1');
    expect(r.compressedTokens).toBeLessThan(r.originalTokens);
  });

  it('fails open to passthrough when the proxy errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const p = new HeadroomProvider('https://headroom.internal');
    const input = 'keep me intact '.repeat(20);
    const r = await p.compress(input);
    expect(r.content).toBe(input);
    expect(r.compressedTokens).toBe(r.originalTokens);
  });

  it('retrieve returns the original text for a ref', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'the original' }), { status: 200 }),
    );
    const p = new HeadroomProvider('https://headroom.internal');
    await expect(p.retrieve('ccr_1')).resolves.toBe('the original');
  });

  it('retrieve throws when the proxy errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }));
    const p = new HeadroomProvider('https://headroom.internal');
    await expect(p.retrieve('missing')).rejects.toThrow(/retrieve 404/);
  });
});
