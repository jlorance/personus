#!/usr/bin/env bun
/**
 * OKF validator for the `docs/` knowledge bundle.
 *
 * Errors (exit 1):
 *   - a concept file (any `.md` that isn't a reserved index.md/log.md) has no
 *     parseable frontmatter, or an empty/missing `type`
 *   - `type` or `status` outside the allowed sets
 *
 * Warnings (never fail — OKF is deliberately permissive/tolerant):
 *   - broken bundle-relative or relative markdown links to other docs
 *
 * Usage: `bun run docs:validate`
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, RESERVED, STATUSES, TYPES, walkMarkdown } from './lib.mjs';

const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs');

if (!existsSync(DOCS)) {
  console.error(`docs:validate — no docs bundle at ${DOCS}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const files = walkMarkdown(DOCS);

/** Resolve a markdown link target to an absolute path within the bundle, or null if not a local doc link. */
function resolveLink(target, fromFile) {
  const clean = target.split('#')[0].trim();
  if (!clean || /^[a-z]+:/i.test(clean) || clean.startsWith('//')) return null; // external / anchor-only
  if (!/\.mds?$/.test(clean) && !clean.endsWith('.md')) return null; // only check doc links
  if (clean.startsWith('/')) return resolve(DOCS, `.${clean}`); // bundle-relative
  return resolve(dirname(fromFile), clean); // relative
}

for (const file of files) {
  const rel = relative(DOCS, file);
  const base = rel.split('/').pop();
  const text = readFileSync(file, 'utf8');
  const { data } = parseFrontmatter(text);

  if (!RESERVED.has(base)) {
    if (!data.type || String(data.type).trim() === '') {
      errors.push(`${rel}: missing required frontmatter field \`type\``);
    } else if (!TYPES.has(data.type)) {
      errors.push(`${rel}: type "${data.type}" not in {${[...TYPES].join(', ')}}`);
    }
    if (data.status && !STATUSES.has(data.status)) {
      errors.push(`${rel}: status "${data.status}" not in {${[...STATUSES].join(', ')}}`);
    }
  }

  // Link check (warn only). Archived docs are frozen historical artifacts whose
  // links legitimately point at the old structure — validate their frontmatter
  // but don't nag about their links.
  if (!rel.startsWith('archive/')) {
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const abs = resolveLink(m[1], file);
      if (abs && !existsSync(abs)) warnings.push(`${rel}: broken link → ${m[1]}`);
    }
  }
}

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(
  `\ndocs:validate — ${files.length} files, ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);
