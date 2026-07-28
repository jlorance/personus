import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Validates the committed nuclei DAST configuration meets the acceptance
 * criteria for PER-18: curated template set present, action pinned, severity
 * gate in place.
 *
 * Failing conditions before the PER-18 changes:
 *   - .github/nuclei-config.yaml does not exist
 *   - _nuclei-scan.yml uses nuclei-action@main (unpinned)
 */

const root = process.cwd();
const CONFIG_PATH = resolve(root, '.github/nuclei-config.yaml');
const WORKFLOW_PATH = resolve(root, '.github/workflows/_nuclei-scan.yml');

describe('nuclei DAST: committed template config', () => {
  it('committed nuclei config file exists at .github/nuclei-config.yaml', () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
  });

  it('config includes ssl tag (TLS/certificate checks)', () => {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    // Matches "  - ssl" as a YAML list item
    expect(content).toMatch(/^\s*-\s+ssl\s*$/m);
  });

  it('config includes headers tag (HTTP security-header checks)', () => {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    expect(content).toMatch(/^\s*-\s+headers\s*$/m);
  });

  it('config includes exposures tag (.env, source-map, .git leaks)', () => {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    expect(content).toMatch(/^\s*-\s+exposures?\s*$/m);
  });

  it('config includes misconfig tag (misconfiguration checks)', () => {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    expect(content).toMatch(/^\s*-\s+misconfig\s*$/m);
  });
});

describe('nuclei DAST: action pinning', () => {
  let workflowContent: string;

  beforeAll(() => {
    workflowContent = readFileSync(WORKFLOW_PATH, 'utf-8');
  });

  it('nuclei action is not on @main (supply-chain safety)', () => {
    // nuclei-action@main is the unpinned placeholder; every stable ref is acceptable
    expect(workflowContent).not.toContain('nuclei-action@main');
  });

  it('nuclei action ref is a version tag (vX.Y.Z) or a full 40-char commit SHA', () => {
    const match = workflowContent.match(/projectdiscovery\/nuclei-action@([^\s#]+)/);
    expect(match, 'nuclei-action reference not found in workflow').not.toBeNull();
    const ref = match![1];
    const isVersionTag = /^v\d+/.test(ref);
    const isCommitSHA = /^[0-9a-f]{40}$/.test(ref);
    expect(
      isVersionTag || isCommitSHA,
      `action ref "${ref}" must be a vX.Y.Z version tag or a 40-char commit SHA`,
    ).toBe(true);
  });
});

describe('nuclei DAST: severity gate', () => {
  it('workflow fails on critical and high findings by default', () => {
    const content = readFileSync(WORKFLOW_PATH, 'utf-8');
    // The fail-on default must cover both severities
    expect(content).toContain('critical,high');
  });
});
