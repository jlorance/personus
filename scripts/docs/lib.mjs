/**
 * Shared helpers for the docs OKF tooling (port + validate).
 *
 * OKF frontmatter is a leading `---` YAML block. We only need a tiny subset of
 * YAML here (scalar strings/numbers and simple inline `[a, b]` arrays), so we
 * parse and emit it directly rather than pulling in a YAML dependency — the
 * bundle stays dependency-free and the format stays deliberately simple.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Reserved OKF filenames that are NOT concept files (no frontmatter required). */
export const RESERVED = new Set(['index.md', 'log.md']);

/** Allowed values for our two enum fields. `type` is OKF-required. */
export const TYPES = new Set(['foundation', 'spec', 'decision', 'guide', 'research', 'prd']);
export const STATUSES = new Set(['current', 'planned', 'dormant', 'stub', 'superseded']);

/**
 * Split a markdown string into `{ data, body }`. `data` is the parsed
 * frontmatter (empty object when absent). Only the leading `---`…`---` block is
 * treated as frontmatter.
 */
export function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end);
  // Body starts after the closing `---` line's newline.
  const afterClose = text.indexOf('\n', end + 1);
  const body = afterClose === -1 ? '' : text.slice(afterClose + 1);
  const data = {};
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    data[key] = value;
  }
  return { data, body };
}

/** Quote a scalar for YAML only when it could otherwise be misparsed. */
function yamlScalar(v) {
  const s = String(v);
  if (s === '') return "''";
  if (/^[\w .@/()+—-]+$/u.test(s) && !/^[[{>|]/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

/**
 * Emit an OKF frontmatter block from an ordered field object. Array values
 * become inline `[a, b]`. Keys with null/undefined/empty values are skipped.
 */
export function stringifyFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}: [${value.map(yamlScalar).join(', ')}]`);
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/** Recursively list every `.md` file under `dir` (absolute paths). */
export function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}
