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
 *   - broken intra-bundle markdown links, or links that escape the bundle
 *
 * Usage: `bun run docs:validate`
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { DOCS, isReserved, parseFrontmatter, STATUSES, TYPES, walkMarkdown } from './lib.mjs';

if (!existsSync(DOCS)) {
  console.error(`docs:validate — no docs bundle at ${DOCS}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const files = walkMarkdown(DOCS);

/** Resolve a markdown doc-link target to an absolute path, or null if not a local doc link. */
function resolveLink(target, fromFile) {
  const clean = target.split('#')[0].trim();
  if (!clean || /^[a-z]+:/i.test(clean) || clean.startsWith('//')) return null; // external / anchor-only
  if (!clean.endsWith('.md')) return null; // only check doc links
  if (clean.startsWith('/')) return resolve(DOCS, `.${clean}`); // bundle-relative
  return resolve(dirname(fromFile), clean); // relative
}

for (const file of files) {
  const rel = relative(DOCS, file);
  const text = readFileSync(file, 'utf8');
  const { data } = parseFrontmatter(text);

  if (!isReserved(rel)) {
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
    const prefix = `${DOCS}/`;
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const abs = resolveLink(m[1], file);
      if (!abs) continue;
      // Clamp to the bundle: a resolved path outside DOCS is out-of-bundle
      // regardless of whether it happens to exist on this machine.
      if (!abs.startsWith(prefix)) warnings.push(`${rel}: link outside bundle → ${m[1]}`);
      else if (!existsSync(abs)) warnings.push(`${rel}: broken link → ${m[1]}`);
    }
  }
}

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(
  `\ndocs:validate — ${files.length} files, ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);
