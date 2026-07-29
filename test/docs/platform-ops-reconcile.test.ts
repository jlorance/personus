/**
 * PER-15: platform-ops doc reconciliation tests.
 *
 * For each doc with `status: current` in its frontmatter, this file checks that
 * the body does not contradict the shipped code — stale function names, missing
 * files, or tables that were renamed during implementation. Any failure here
 * means the doc is describing something that no longer exists, which is worse
 * than silence: the next developer reading it will go looking for code that isn't
 * there.
 *
 * Why vitest, not a linter or grep? These assertions mix doc-prose checks with
 * the implicit invariant that the shipped module surface is exactly what the doc
 * claims — that invariant is a test, not a style rule.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

function doc(file: string): string {
  return readFileSync(resolve(ROOT, 'docs/domains/platform-ops', file), 'utf-8');
}

/** Strip the YAML frontmatter block and return everything after it. */
function body(content: string): string {
  const second = content.indexOf('---', 3);
  return second === -1 ? content : content.slice(second + 3);
}

// ─── 1. Frontmatter status gate ───────────────────────────────────────────────

describe('frontmatter statuses (PER-15 reconciliation targets)', () => {
  const EXPECTED: Record<string, 'current' | 'planned'> = {
    '00-prd.md': 'current',
    '01-monorepo-migration.md': 'current',
    '02-taxonomy-admin.md': 'planned',
    '03-trait-metadata-admin.md': 'planned',
    '04-system-settings.md': 'current',
    '05-user-and-community-ops.md': 'planned',
  };

  for (const [file, status] of Object.entries(EXPECTED)) {
    it(`${file} has status: ${status}`, () => {
      expect(doc(file)).toMatch(new RegExp(`^status: ${status}$`, 'm'));
    });
  }
});

// ─── 2. 00-prd.md — spec index must reflect shipped statuses ─────────────────

describe('00-prd.md spec index', () => {
  it('spec index does not list any entry as Draft (statuses were updated in reconciliation)', () => {
    // The spec index table uses the word "Draft" as a status column value.
    // After PER-15 reconciliation it must show Current/Planned, matching frontmatter.
    const b = body(doc('00-prd.md'));
    // Look for table rows with "Draft" in the status column:
    // | nn | `file.md` | Draft | ... |
    const draftRow = /\|\s*Draft\s*\|/;
    expect(b).not.toMatch(draftRow);
  });
});

// ─── 3. 04-system-settings.md — shipped surface checks ───────────────────────

describe('04-system-settings.md vs shipped code', () => {
  it('body does not claim "Status: Draft" when frontmatter is current', () => {
    // The inline "> Status: Draft" header in the doc body was written before
    // implementation; after reconciliation it must not contradict the frontmatter.
    expect(body(doc('04-system-settings.md'))).not.toMatch(/^> Status: Draft/m);
  });

  it('references the shipped settings cache file (settings-cache.ts, not settings.ts)', () => {
    const content = doc('04-system-settings.md');
    // The shipped implementation lives in packages/db/src/settings-cache.ts.
    // The original spec said packages/db/src/settings.ts — that file does not exist.
    expect(content).toContain('settings-cache.ts');
    expect(content).not.toMatch(/packages\/db\/src\/settings\.ts\b/);
  });

  it('does not reference initSettings() — not implemented; cache uses a direct db import', () => {
    // The spec proposed an initSettings(db) ceremony, but the shipped module
    // imports db at the module level with no init step.
    expect(doc('04-system-settings.md')).not.toContain('initSettings(');
  });

  it('uses the shipped service function names (listSystemSettings, updateSystemSetting)', () => {
    const content = doc('04-system-settings.md');
    // Shipped: listSystemSettings / updateSystemSetting (packages/db/src/services/settings.service.ts)
    // Original spec used: listSettings / updateSetting — those names were never exported.
    expect(content).toContain('listSystemSettings');
    expect(content).toContain('updateSystemSetting');
  });

  it('does not reference admin_audit_log — shipped table is audit_log', () => {
    // The spec named the table admin_audit_log. The actual schema uses audit_log
    // (packages/db/src/schema/audit-log.ts) with a different column shape.
    expect(doc('04-system-settings.md')).not.toContain('admin_audit_log');
  });
});
