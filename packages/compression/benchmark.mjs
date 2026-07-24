#!/usr/bin/env bun
/**
 * Compression benchmark harness (PER-17).
 *
 * Measures the two quantities that decide whether compression is worth it —
 * for BOTH cost and time:
 *   1. token reduction     — the cost lever (fewer input tokens billed).
 *   2. compression latency — the time COST you pay up front, per request.
 *
 * The LLM-side time SAVING (shorter prefill) is separate and model/provider
 * specific — see the PER-17 write-up. This harness gives you the left side of
 * that trade (reduction achieved, overhead paid) on realistic Personus payloads.
 *
 * Runs against whatever COMPRESSION_PROVIDER is set:
 *   - noop (default) → baseline: 0 reduction, ~0 overhead; characterizes payload sizes.
 *   - headroom       → real numbers once HEADROOM_PROXY_URL points at a proxy.
 *
 * Usage:
 *   bun run compression:benchmark
 *   COMPRESSION_PROVIDER=headroom HEADROOM_PROXY_URL=… bun run compression:benchmark
 */

import { compression, estimateTokens } from './src/index.ts';

function persona(i) {
  return {
    uri: `ada-lovelace-${i}`,
    displayName: `Persona ${i}`,
    headline: 'Analytical engine pioneer · mathematician · technical writer',
    location: 'London, UK',
    traits: {
      skills: ['mathematics', 'algorithms', 'technical writing', 'systems design'],
      experience: [
        { org: 'Analytical Society', role: 'Collaborator', years: '1842–1843' },
        { org: 'Independent', role: 'Translator & Annotator', years: '1843' },
      ],
      values: ['rigor', 'imagination', 'poetical science'],
      interests: ['computation', 'music', 'metaphysics'],
    },
    endorsements: 12,
    completenessScore: 0.86,
    visibility: 'community',
  };
}

const PAYLOADS = {
  'search (3 results)': { results: Array.from({ length: 3 }, (_, i) => persona(i)) },
  'search (10 results)': { results: Array.from({ length: 10 }, (_, i) => persona(i)) },
  'persona detail': persona(1),
  'community list (8)': {
    communities: Array.from({ length: 8 }, (_, i) => ({
      slug: `guild-${i}`,
      name: `Guild ${i}`,
      type: 'guild',
      memberCount: 40 + i * 7,
      description: 'A capability overlay community for a co-located group of practitioners.',
    })),
  },
};

const MIN_TOKENS = 512; // the gate toolContent uses — below this compression is skipped

console.log(`\nprovider: ${compression.isActive() ? 'ACTIVE' : 'noop (baseline)'}\n`);
const rows = [];
for (const [name, data] of Object.entries(PAYLOADS)) {
  const raw = JSON.stringify(data, null, 2);
  const before = estimateTokens(raw);
  const t0 = performance.now();
  const r = await compression.compress(raw, { kind: 'json', minTokens: MIN_TOKENS });
  const ms = performance.now() - t0;
  rows.push({
    name,
    before,
    after: r.compressedTokens,
    saved: before - r.compressedTokens,
    pct: before ? Math.round((1 - r.compressedTokens / before) * 100) : 0,
    ms: ms.toFixed(1),
    note: before < MIN_TOKENS ? 'below gate — skipped' : r.ref ? 'reversible (ref)' : '',
  });
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log(
  `${pad('payload', 22)}${padL('tok in', 8)}${padL('tok out', 9)}${padL('saved%', 8)}${padL('compress ms', 13)}  note`,
);
console.log('─'.repeat(78));
for (const r of rows) {
  console.log(
    `${pad(r.name, 22)}${padL(r.before, 8)}${padL(r.after, 9)}${padL(`${r.pct}%`, 8)}${padL(r.ms, 13)}  ${r.note}`,
  );
}

const eligible = rows.filter((r) => r.before >= MIN_TOKENS);
const totalIn = rows.reduce((s, r) => s + r.before, 0);
const totalSaved = rows.reduce((s, r) => s + r.saved, 0);
const avgMs = rows.reduce((s, r) => s + Number(r.ms), 0) / rows.length;
console.log('─'.repeat(78));
console.log(
  `\n${eligible.length}/${rows.length} payloads exceed the ${MIN_TOKENS}-token gate. ` +
    `overall token reduction: ${totalIn ? Math.round((totalSaved / totalIn) * 100) : 0}%. ` +
    `avg compression overhead: ${avgMs.toFixed(1)} ms/call.`,
);
console.log(
  'Reminder: reduction = cost saved. Wall-clock saved needs prefill_saved > this overhead — see PER-17.\n',
);
