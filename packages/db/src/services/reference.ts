/**
 * Reference-data reads — trait metadata, taxonomies, community types. Public
 * catalog data; no per-row gating (these describe the system, not people).
 */

import { db } from '../index';
import { eq, isNull } from '../orm';
import { communityTypes, traitMetadata, traitTaxonomies } from '../schema';

export async function listTraitMetadata() {
  return db
    .select()
    .from(traitMetadata)
    .where(isNull(traitMetadata.deletedAt))
    .orderBy(traitMetadata.displayOrder);
}

export async function listTaxonomies(traitKey?: string) {
  const rows = await db.select().from(traitTaxonomies).where(isNull(traitTaxonomies.deletedAt));
  return traitKey ? rows.filter((r) => r.traitKey === traitKey) : rows;
}

export async function listCommunityTypes() {
  return db
    .select()
    .from(communityTypes)
    .where(eq(communityTypes.isActive, true))
    .orderBy(communityTypes.displayOrder);
}
