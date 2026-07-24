#!/usr/bin/env bun
/**
 * Authz surface guard — every HTTP route and server action must resolve a
 * principal (or be an explicitly-justified exception).
 *
 * The #1 way authz bugs ship is a NEW entry point that forgets to authenticate.
 * This fails CI when a route.ts / actions.ts under apps/<app>/app references no
 * principal resolver and isn't in the allowlist below — forcing a conscious
 * decision on every new surface. It complements the biome chokepoint (no raw db
 * in routes/actions) and the ability matrix (the model is correct).
 *
 * Usage: `bun run authz:check`
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Any of these means the surface resolves an identity before acting.
const RESOLVERS = [
  'requirePrincipal',
  'getPrincipal',
  'getOptionalPrincipal',
  'getAnonymousMcpPrincipal',
  'getPlatformPrincipal',
  'getPagePrincipal',
  'requireAdmin',
  'getAdminPrincipal',
  'asAgent',
  'getSystemPrincipal',
  'contextWithPrincipal',
];

// Justified exceptions — surfaces that legitimately act without a principal.
// A new entry here is a deliberate, reviewable security decision.
const ALLOWLIST = {
  'apps/web/app/api/health/route.ts':
    'Health check — serves no user data and touches no gated resource.',
  'apps/web/app/api/channels/[platform]/webhook/route.ts':
    'Signature-verified platform webhook (401 on unverified, 403 when disabled); the platform Principal is resolved downstream in handlePlatformMessage.',
  'apps/web/app/api/webhooks/auth/route.ts':
    'AuthN provider webhook — verified via auth.verifyWebhook; system lifecycle op (GDPR user.deleted) with no user principal at webhook time.',
};

/** Recursively collect route.ts / actions.ts under a dir. */
function surfaces(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) surfaces(full, out);
    else if (entry === 'route.ts' || entry === 'actions.ts') out.push(full);
  }
  return out;
}

const appDirs = ['apps/web/app', 'apps/admin/app']
  .map((d) => resolve(ROOT, d))
  .filter((d) => {
    try {
      return statSync(d).isDirectory();
    } catch {
      return false;
    }
  });

const files = appDirs.flatMap((d) => surfaces(d));
const violations = [];
let allowed = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  if (rel in ALLOWLIST) {
    allowed++;
    continue;
  }
  const src = readFileSync(file, 'utf8');
  // Match an actual CALL site (`name(`), not a bare mention — so a resolver named
  // in a comment or an unused import can't satisfy the guard (false-negative the
  // review caught).
  const resolverCall = new RegExp(`\\b(${RESOLVERS.join('|')})\\s*\\(`);
  if (!resolverCall.test(src)) {
    violations.push(rel);
  }
}

for (const v of violations) {
  console.error(
    `  ERROR ${v}: no principal resolver found. Resolve a principal ` +
      `(${RESOLVERS.slice(0, 4).join(' / ')}…) or add a justified entry to the ALLOWLIST in scripts/authz/check-principals.mjs.`,
  );
}
console.log(
  `\nauthz:check — ${files.length} surfaces (${allowed} allowlisted), ${violations.length} violation(s)`,
);
process.exit(violations.length > 0 ? 1 : 0);
