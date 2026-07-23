/**
 * Seed orchestrator — run with `bun run db:seed`.
 *
 * Seeds reference/config data only (system settings incl. feature flags,
 * community types, trait metadata, taxonomies). Idempotent: safe to re-run.
 * Persona/synthetic data is a later pass.
 */

import { seedCommunityTypes } from './community-types';
import { seedSystemSettings } from './system-settings';
import { seedTaxonomies } from './taxonomies';
import { seedTraitMetadata } from './trait-metadata';

async function main(): Promise<void> {
  console.log('[seed] system_settings (+ feature flags)…');
  await seedSystemSettings();
  console.log('[seed] community_types…');
  await seedCommunityTypes();
  console.log('[seed] trait_metadata…');
  await seedTraitMetadata();
  console.log('[seed] trait_taxonomies…');
  await seedTaxonomies();
  console.log('[seed] done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
