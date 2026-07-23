import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { referenceFields } from './_factory';

// Trait metadata — metadata-driven display/edit config per trait key.
export const traitMetadata = pgTable(
  'trait_metadata',
  {
    ...referenceFields(),
    key: text('key').unique().notNull(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    groupKey: text('group_key'),
    dataType: text('data_type').notNull(),
    itemSchema: jsonb('item_schema'),
    displayConfig: jsonb('display_config').notNull(),
    editConfig: jsonb('edit_config').notNull(),
    isSearchable: boolean('is_searchable').default(true),
    isEndorsable: boolean('is_endorsable').default(false),
    icon: text('icon'),
    displayOrder: integer('display_order'),
  },
  (table) => [index('idx_trait_metadata_active').on(table.id).where(sql`deleted_at IS NULL`)],
);

// Trait taxonomies — suggested values per (traitKey, taxonomySlug).
export const traitTaxonomies = pgTable(
  'trait_taxonomies',
  {
    ...referenceFields(),
    traitKey: text('trait_key').notNull(),
    taxonomySlug: text('taxonomy_slug').notNull(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    icon: text('icon'),
    suggestedValues: text('suggested_values').array().notNull(),
    displayOrder: integer('display_order'),
  },
  (table) => [
    unique().on(table.traitKey, table.taxonomySlug),
    index('idx_trait_taxonomies_active').on(table.id).where(sql`deleted_at IS NULL`),
  ],
);

export type TraitMetadataRow = typeof traitMetadata.$inferSelect;
export type NewTraitMetadataRow = typeof traitMetadata.$inferInsert;
export type TraitTaxonomy = typeof traitTaxonomies.$inferSelect;
export type NewTraitTaxonomy = typeof traitTaxonomies.$inferInsert;
