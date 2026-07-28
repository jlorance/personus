/**
 * Reference-data reads — trait metadata, taxonomies, community types. Public
 * catalog data; no per-row gating (these describe the system, not people).
 *
 * Admin mutations (create / update / delete) are gated on the CASL
 * `manage TraitMetadata`, `manage TraitTaxonomy`, and `manage CommunityType`
 * abilities — granted only to the platform-admin role.
 */

import { db } from '../index';
import { and, eq, isNull } from '../orm';
import { communityTypes, traitMetadata, traitTaxonomies } from '../schema';
import { ForbiddenError, principalTag, type ServicePrincipal } from './index';

// ─── Public reads ─────────────────────────────────────────────────────────────

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

// ─── Trait Metadata admin mutations ───────────────────────────────────────────

export type TraitMetadataCreateInput = {
  key: string;
  displayName: string;
  category: string;
  dataType: string;
  displayConfig: Record<string, unknown>;
  editConfig: Record<string, unknown>;
  description?: string;
  groupKey?: string;
  itemSchema?: Record<string, unknown>;
  isSearchable?: boolean;
  isEndorsable?: boolean;
  icon?: string;
  displayOrder?: number;
};

export type TraitMetadataPatch = Partial<
  Pick<
    typeof traitMetadata.$inferInsert,
    | 'displayName'
    | 'description'
    | 'category'
    | 'groupKey'
    | 'dataType'
    | 'itemSchema'
    | 'displayConfig'
    | 'editConfig'
    | 'isSearchable'
    | 'isEndorsable'
    | 'icon'
    | 'displayOrder'
  >
>;

export async function createTraitMetadata(
  principal: ServicePrincipal,
  input: TraitMetadataCreateInput,
): Promise<typeof traitMetadata.$inferSelect> {
  if (!principal.ability.can('manage', 'TraitMetadata')) throw new ForbiddenError();
  const tag = principalTag(principal);
  const [row] = await db
    .insert(traitMetadata)
    .values({ ...input, createdBy: tag, updatedBy: tag })
    .returning();
  return row;
}

export async function updateTraitMetadata(
  principal: ServicePrincipal,
  id: bigint,
  patch: TraitMetadataPatch,
): Promise<typeof traitMetadata.$inferSelect | null> {
  if (!principal.ability.can('manage', 'TraitMetadata')) throw new ForbiddenError();
  const [updated] = await db
    .update(traitMetadata)
    .set({ ...patch, updatedBy: principalTag(principal), updatedAt: new Date() })
    .where(and(eq(traitMetadata.id, id), isNull(traitMetadata.deletedAt)))
    .returning();
  return updated ?? null;
}

/** Soft-delete a trait metadata entry. Returns true if the row existed and was deleted. */
export async function deleteTraitMetadata(
  principal: ServicePrincipal,
  id: bigint,
): Promise<boolean> {
  if (!principal.ability.can('manage', 'TraitMetadata')) throw new ForbiddenError();
  const now = new Date();
  const tag = principalTag(principal);
  const [row] = await db
    .update(traitMetadata)
    .set({ deletedAt: now, updatedBy: tag, updatedAt: now })
    .where(and(eq(traitMetadata.id, id), isNull(traitMetadata.deletedAt)))
    .returning({ id: traitMetadata.id });
  return Boolean(row);
}

// ─── Trait Taxonomy admin mutations ───────────────────────────────────────────

export type TraitTaxonomyCreateInput = {
  traitKey: string;
  taxonomySlug: string;
  displayName: string;
  suggestedValues: string[];
  description?: string;
  icon?: string;
  displayOrder?: number;
};

export type TraitTaxonomyPatch = Partial<
  Pick<
    typeof traitTaxonomies.$inferInsert,
    'displayName' | 'description' | 'icon' | 'suggestedValues' | 'displayOrder'
  >
>;

export async function createTraitTaxonomy(
  principal: ServicePrincipal,
  input: TraitTaxonomyCreateInput,
): Promise<typeof traitTaxonomies.$inferSelect> {
  if (!principal.ability.can('manage', 'TraitTaxonomy')) throw new ForbiddenError();
  const tag = principalTag(principal);
  const [row] = await db
    .insert(traitTaxonomies)
    .values({ ...input, createdBy: tag, updatedBy: tag })
    .returning();
  return row;
}

export async function updateTraitTaxonomy(
  principal: ServicePrincipal,
  id: bigint,
  patch: TraitTaxonomyPatch,
): Promise<typeof traitTaxonomies.$inferSelect | null> {
  if (!principal.ability.can('manage', 'TraitTaxonomy')) throw new ForbiddenError();
  const [updated] = await db
    .update(traitTaxonomies)
    .set({ ...patch, updatedBy: principalTag(principal), updatedAt: new Date() })
    .where(and(eq(traitTaxonomies.id, id), isNull(traitTaxonomies.deletedAt)))
    .returning();
  return updated ?? null;
}

/** Soft-delete a trait taxonomy entry. Returns true if the row existed and was deleted. */
export async function deleteTraitTaxonomy(
  principal: ServicePrincipal,
  id: bigint,
): Promise<boolean> {
  if (!principal.ability.can('manage', 'TraitTaxonomy')) throw new ForbiddenError();
  const now = new Date();
  const tag = principalTag(principal);
  const [row] = await db
    .update(traitTaxonomies)
    .set({ deletedAt: now, updatedBy: tag, updatedAt: now })
    .where(and(eq(traitTaxonomies.id, id), isNull(traitTaxonomies.deletedAt)))
    .returning({ id: traitTaxonomies.id });
  return Boolean(row);
}

// ─── Community Type admin mutations ───────────────────────────────────────────

export type CommunityTypeCreateInput = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  communityTraitSchema?: unknown[];
  memberTraitSchema?: unknown[];
  defaultJoinPolicy?: string;
  defaultVisibility?: string;
  maxMembersDefault?: number;
  featureFlags?: Record<string, unknown>;
  displayOrder?: number;
  isActive?: boolean;
};

export type CommunityTypePatch = Partial<
  Pick<
    typeof communityTypes.$inferInsert,
    | 'name'
    | 'description'
    | 'icon'
    | 'communityTraitSchema'
    | 'memberTraitSchema'
    | 'defaultJoinPolicy'
    | 'defaultVisibility'
    | 'maxMembersDefault'
    | 'featureFlags'
    | 'displayOrder'
    | 'isActive'
  >
>;

export async function createCommunityType(
  principal: ServicePrincipal,
  input: CommunityTypeCreateInput,
): Promise<typeof communityTypes.$inferSelect> {
  if (!principal.ability.can('manage', 'CommunityType')) throw new ForbiddenError();
  const tag = principalTag(principal);
  const [row] = await db
    .insert(communityTypes)
    .values({ ...input, createdBy: tag, updatedBy: tag })
    .returning();
  return row;
}

export async function updateCommunityType(
  principal: ServicePrincipal,
  id: bigint,
  patch: CommunityTypePatch,
): Promise<typeof communityTypes.$inferSelect | null> {
  if (!principal.ability.can('manage', 'CommunityType')) throw new ForbiddenError();
  const [updated] = await db
    .update(communityTypes)
    .set({ ...patch, updatedBy: principalTag(principal), updatedAt: new Date() })
    .where(and(eq(communityTypes.id, id), isNull(communityTypes.deletedAt)))
    .returning();
  return updated ?? null;
}

/** Soft-delete a community type. Returns true if the row existed and was deleted. */
export async function deleteCommunityType(
  principal: ServicePrincipal,
  id: bigint,
): Promise<boolean> {
  if (!principal.ability.can('manage', 'CommunityType')) throw new ForbiddenError();
  const now = new Date();
  const tag = principalTag(principal);
  const [row] = await db
    .update(communityTypes)
    .set({ deletedAt: now, updatedBy: tag, updatedAt: now })
    .where(and(eq(communityTypes.id, id), isNull(communityTypes.deletedAt)))
    .returning({ id: communityTypes.id });
  return Boolean(row);
}
