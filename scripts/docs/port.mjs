#!/usr/bin/env bun
/**
 * Port the legacy Personus docs into the new OKF knowledge bundle.
 *
 * For each legacy `.md`: strip any old YAML frontmatter, inject a normalized OKF
 * frontmatter block (type/title/description/status/tags/timestamp), run the
 * "reconcile to shipped code" replacements on the body, and write it to its new
 * home under `docs/`. Stale / point-in-time files are quarantined under
 * `docs/archive/` (preserved verbatim, status: superseded — no reconciliation).
 *
 * Read-only against the legacy source; only writes under `docs/`. Idempotent.
 *
 * Usage: `bun scripts/docs/port.mjs`
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, stringifyFrontmatter, walkMarkdown } from './lib.mjs';

const SRC = '/Users/jlorance/Code/current/personus/docs';
const DST = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs');

// ── Reconciliation: legacy names → shipped-code names (body only, ported files) ──
const RECONCILE = [
  [/ContactChannelAdapter/g, 'ContactRelay'],
  [/`integrations`/g, '`platform_channel_bindings`'],
  [/\bintegrations table\b/g, 'platform_channel_bindings table'],
  [/canonical ABL/g, 'canonical library'],
  [/\bpre-ABL\b/g, 'pre-library'],
  [/ABL vision document/g, 'library vision document'],
];

// Files whose surrounding prose still describes the pre-reconciliation table.
const RECONCILE_NOTE_FILES = new Set([
  'specs/integrations/00-prd.md',
  'specs/integrations/01-shared-architecture.md',
  'specs/integrations/03-bot-architecture.md',
  'foundation/data-model.md',
]);
const RECONCILE_NOTE =
  '> **Reconciliation note (2026-07-24):** The shipped build replaced the heavyweight ' +
  '`integrations` table with the lean `platform_channel_bindings` table (community_id, platform, ' +
  "external ref, installed_by, status, tokens). Mastra's first-class Channels own " +
  'routing / threading / memory. `integrations`-table references below have been renamed; some ' +
  'surrounding prose still describes the pre-reconciliation design and is superseded by ' +
  '`packages/db/src/schema/platform-channels.ts`.';

// ── Quarantine: srcRel → { dstRel, type, reason } (status: superseded, no reconcile) ──
const ARCHIVE = {
  '04_agent_architecture_and_conversational_ux.md': {
    dstRel: 'archive/04_agent_architecture_and_conversational_ux.md',
    type: 'foundation',
    reason: 'Stale v5 monolithic agent spec (2026-02-08); superseded by foundation/agents.md.',
  },
  'alignment-check-2026-04-11.md': {
    dstRel: 'archive/point-in-time/alignment-check-2026-04-11.md',
    type: 'guide',
    reason: 'Point-in-time alignment check against the 2026-04-10 codebase state.',
  },
  'check-alignment-2026-04-16.md': {
    dstRel: 'archive/point-in-time/check-alignment-2026-04-16.md',
    type: 'guide',
    reason: 'Point-in-time alignment sweep against the 2026-04-13 snapshot.',
  },
  'onboarding-2026-04-10.md': {
    dstRel: 'archive/point-in-time/onboarding-2026-04-10.md',
    type: 'guide',
    reason: 'SPAIDE onboarding snapshot of the codebase at 2026-04-10.',
  },
  'README.md': {
    dstRel: 'archive/legacy-readme.md',
    type: 'guide',
    reason: 'Legacy hand-written nav index; superseded by the generated index.md.',
  },
  'specs/communities/to-reintegrate.md': {
    dstRel: 'archive/communities-to-reintegrate.md',
    type: 'spec',
    reason: 'Holding-pen scraps; real backlog tracked in Linear (Personus MVP). Not a live doc.',
  },
};

// ── Status: default by top-level dir; explicit overrides win. ──
const STATUS_DEFAULT_BY_DIR = {
  foundation: 'current',
  decisions: 'current',
  guides: 'current',
  research: 'current',
  patterns: 'current',
  'business-model': 'current',
  qa: 'stub',
  domains: 'planned', // specs/* → domains/*
};
const STATUS_OVERRIDE = {
  'foundation/strategy.md': 'stub',
  // Active project conventions (not "planned" features):
  'specs/_areas.md': 'current',
  'specs/_decomposition.md': 'current',
  'specs/_prd-shape.md': 'current',
  'specs/_schema-vocabulary.md': 'current',
  'specs/_templates/SPEC_TEMPLATE.md': 'current',
  'specs/_templates/STORY_TEMPLATE.md': 'current',
  // Domain specs that match shipped `main`:
  'specs/personas/00-prd.md': 'current',
  'specs/personas/01-persona-lifecycle.md': 'current',
  'specs/personas/02-profile.md': 'current',
  'specs/personas/03-trait-metadata.md': 'current',
  'specs/personas/04-persona-visibility.md': 'current',
  'specs/personas/06-public-pages.md': 'current',
  'specs/personas/09-editing-patterns.md': 'current',
  'specs/personas/domain-model.md': 'current',
  'specs/personas/schema-spec.md': 'current',
  'specs/communities/00-prd.md': 'current',
  'specs/communities/01-community-lifecycle.md': 'current',
  'specs/communities/02-membership.md': 'current',
  'specs/communities/03-member-directory.md': 'current',
  'specs/communities/04-discovery.md': 'current',
  'specs/communities/domain-model.md': 'current',
  'specs/communities/schema-spec.md': 'current',
  'specs/integrations/00-prd.md': 'current',
  'specs/integrations/01-shared-architecture.md': 'current',
  'specs/integrations/03-bot-architecture.md': 'current',
  'specs/platform-ops/00-prd.md': 'current',
  'specs/platform-ops/01-monorepo-migration.md': 'current',
  'specs/platform-ops/04-system-settings.md': 'current',
  'specs/commerce/00-prd.md': 'dormant',
  'specs/sparks/00-prd.md': 'dormant',
};

// Domain folders renamed to match shipped-code concepts.
const DOMAIN_RENAME = { integrations: 'platform-channels' };

/** Map a legacy `specs/<area>/…` path to its ported `domains/<area>/…` path. */
function specsToDomains(specsRel) {
  const parts = specsRel.split('/');
  parts[0] = 'domains';
  if (parts[1] && DOMAIN_RENAME[parts[1]]) parts[1] = DOMAIN_RENAME[parts[1]];
  return parts.join('/');
}

/** Map a legacy relative path to its ported relative path + concept type. */
function route(srcRel) {
  const top = srcRel.split('/')[0];

  if (top === 'specs') {
    const rest = srcRel.slice('specs/'.length);
    const dstRel = specsToDomains(srcRel);
    const base = rest.split('/').pop();
    let type = 'spec';
    if (base === '00-prd.md' || base.endsWith('-prd.md')) type = 'prd';
    else if (base === 'domain-model.md') type = 'foundation';
    else if (base === '_areas.md' || base === '_decomposition.md') type = 'foundation';
    else if (base === '_prd-shape.md' || base === '_schema-vocabulary.md') type = 'guide';
    else if (rest.startsWith('_templates/')) type = 'guide';
    return { dstRel, type, statusDir: 'domains' };
  }
  if (top === 'foundation') return { dstRel: srcRel, type: 'foundation', statusDir: 'foundation' };
  if (top === 'decisions') return { dstRel: srcRel, type: 'decision', statusDir: 'decisions' };
  if (top === 'guides') return { dstRel: srcRel, type: 'guide', statusDir: 'guides' };
  if (top === 'business-model') return { dstRel: srcRel, type: 'prd', statusDir: 'business-model' };
  if (top === 'qa') return { dstRel: srcRel, type: 'guide', statusDir: 'qa' };
  if (top === 'research') {
    const type = srcRel.endsWith('taxonomy_curation_guide.md') ? 'guide' : 'research';
    return { dstRel: srcRel, type, statusDir: 'research' };
  }
  if (top === 'patterns') {
    const type = srcRel.endsWith('ui-components.md') ? 'spec' : 'research';
    return { dstRel: srcRel, type, statusDir: 'patterns' };
  }
  return null; // unrouted (e.g. top-level orphans handled via ARCHIVE)
}

const TITLE_CASE_FALLBACK = (base) =>
  base
    .replace(/\.md$/, '')
    .replace(/^\d+[-_]/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Derive a human title: existing `name`/`title` → first H1 → filename. */
function deriveTitle(data, body, base) {
  if (data.title) return data.title;
  if (data.name) return data.name;
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return TITLE_CASE_FALLBACK(base);
}

/** Derive a one-line description from the first plain-prose paragraph. */
function deriveDescription(body) {
  const lines = body.split('\n');
  let para = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (para) break;
      continue;
    }
    if (/^[#>|]/.test(line) || /^[-*+]\s/.test(line) || /^\d+\.\s/.test(line)) {
      if (para) break;
      continue; // skip headings, blockquotes, tables, lists
    }
    if (line.startsWith('---') || line.startsWith('```') || line.startsWith('<!--')) {
      if (para) break;
      continue;
    }
    para += (para ? ' ' : '') + line;
  }
  if (!para) return undefined;
  // Strip markdown emphasis/links, collapse, truncate at a word boundary.
  let d = para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (d.length > 200) d = `${d.slice(0, 197).replace(/\s+\S*$/, '')}…`;
  return d || undefined;
}

/** Derive an ISO date from existing frontmatter or an inline header. */
function deriveTimestamp(data, body) {
  const fm = data.last_updated || data.timestamp;
  if (fm) {
    const m = String(fm).match(/\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
  }
  const head = body.slice(0, 800);
  const m = head.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return m ? m[1] : undefined;
}

/** Tags: the concept's area/section slug. */
function deriveTags(dstRel) {
  const parts = dstRel.split('/');
  if (parts[0] === 'domains' && parts.length > 2) return [parts[1]];
  return [parts[0]];
}

// Known bundle top-level dirs — bare `foundation/x.md`-style links were written
// relative to the old flat docs root; normalize them to bundle-relative `/…`.
const TOP_DIRS = new Set([
  'foundation',
  'domains',
  'decisions',
  'guides',
  'research',
  'patterns',
  'business-model',
  'qa',
  'archive',
]);

/** Resolve a relative doc path against a directory (POSIX, handles ./ and ../). */
function resolveRel(dir, rel) {
  const parts = (dir ? `${dir}/${rel}` : rel).split('/');
  const out = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

/**
 * Rewrite intra-bundle markdown link targets to resolve under the new tree.
 * `srcRel` is the linking file's legacy path (for resolving relative links).
 */
function rewriteLinks(body, srcRel) {
  const srcDir = srcRel.includes('/') ? srcRel.replace(/\/[^/]*$/, '') : '';
  return body.replace(/(\]\()([^)]+)(\))/g, (_m, open, target, close) => {
    const [path, anchor] = target.split(/(?=#)/);
    let t = path;
    const isDoc = /\.md$/.test(t);
    const isLocal = isDoc && !/^[a-z]+:/i.test(t) && !t.startsWith('//');

    if (isLocal && !t.startsWith('/')) {
      // Resolve to a legacy-absolute path, then map into the new tree.
      const abs = resolveRel(srcDir, t);
      if (ARCHIVE[abs])
        t = `/${ARCHIVE[abs].dstRel}`; // link to a quarantined file
      else if (abs.includes('_archive/')) t = `/archive/legacy/${abs}`;
      else if (abs.startsWith('specs/')) t = `/${specsToDomains(abs)}`;
      else if (TOP_DIRS.has(abs.split('/')[0])) t = `/${abs}`;
      // else: points outside the bundle (e.g. ../.claude/…) — leave as-is.
    } else if (isLocal && t.startsWith('/')) {
      t = t.replace(/^\/specs\/([^/]+)/, (_m, area) => `/domains/${DOMAIN_RENAME[area] ?? area}`);
    }
    return open + t + (anchor ?? '') + close;
  });
}

function reconcile(body, srcRel) {
  let out = rewriteLinks(body, srcRel);
  for (const [re, rep] of RECONCILE) out = out.replace(re, rep);
  return out;
}

function injectNote(body) {
  const lines = body.split('\n');
  const h1 = lines.findIndex((l) => /^#\s+/.test(l));
  if (h1 === -1) return `${RECONCILE_NOTE}\n\n${body}`;
  // Insert the note as its own paragraph right after the H1.
  lines.splice(h1 + 1, 0, '', RECONCILE_NOTE);
  return lines.join('\n');
}

function write(dstRel, content) {
  const abs = resolve(DST, dstRel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

// ── Run ──
const summary = { ported: 0, archived: 0, skipped: 0 };
const files = walkMarkdown(SRC).map((f) => f.slice(SRC.length + 1));

for (const srcRel of files.sort()) {
  const raw = readFileSync(resolve(SRC, srcRel), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const base = srcRel.split('/').pop();

  // 1) Explicit quarantine entries.
  if (ARCHIVE[srcRel]) {
    const a = ARCHIVE[srcRel];
    const fm = stringifyFrontmatter({
      type: a.type,
      title: deriveTitle(data, body, base),
      description: a.reason,
      status: 'superseded',
      tags: ['archived'],
      timestamp: deriveTimestamp(data, body),
    });
    write(a.dstRel, `${fm}\n\n${body}`);
    summary.archived++;
    continue;
  }

  // 2) Legacy `_archive/` trees → archive/legacy/… (preserved verbatim).
  if (srcRel.includes('_archive/')) {
    const dstRel = `archive/legacy/${srcRel}`;
    const routed = route(srcRel) ?? { type: 'spec' };
    const fm = stringifyFrontmatter({
      type: routed.type,
      title: deriveTitle(data, body, base),
      description: deriveDescription(body),
      status: 'superseded',
      tags: ['archived'],
      timestamp: deriveTimestamp(data, body),
    });
    write(dstRel, `${fm}\n\n${body}`);
    summary.archived++;
    continue;
  }

  // 3) Routed port.
  const routed = route(srcRel);
  if (!routed) {
    console.warn(`  skip (unrouted): ${srcRel}`);
    summary.skipped++;
    continue;
  }

  const status = STATUS_OVERRIDE[srcRel] ?? STATUS_DEFAULT_BY_DIR[routed.statusDir] ?? 'current';
  const fm = stringifyFrontmatter({
    type: routed.type,
    title: deriveTitle(data, body, base),
    description: deriveDescription(body),
    status,
    tags: deriveTags(routed.dstRel),
    timestamp: deriveTimestamp(data, body),
  });

  let newBody = reconcile(body, srcRel);
  if (RECONCILE_NOTE_FILES.has(srcRel)) newBody = injectNote(newBody);
  write(routed.dstRel, `${fm}\n\n${newBody}`);
  summary.ported++;
}

console.log(
  `port complete — ported ${summary.ported}, archived ${summary.archived}, skipped ${summary.skipped}`,
);
