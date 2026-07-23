/**
 * Trait metadata seed (representative core set).
 *
 * Drives metadata-driven rendering: each trait key declares its category, data
 * type, and display/edit config. The founding pass seeds the core capability +
 * direction traits the Persona Coach collects; extend per UI as it lands.
 */

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { traitMetadata } from '../schema';

interface TraitMetaSeed {
  key: string;
  displayName: string;
  category: string;
  dataType: string;
  displayType: string;
  editType: string;
  isEndorsable?: boolean;
  displayOrder: number;
}

export const TRAIT_METADATA: readonly TraitMetaSeed[] = [
  {
    key: 'headline',
    displayName: 'Headline',
    category: 'foundations',
    dataType: 'string',
    displayType: 'prose',
    editType: 'text_with_suggestions',
    displayOrder: 1,
  },
  {
    key: 'skills',
    displayName: 'Skills',
    category: 'capabilities',
    dataType: 'array_of_objects',
    displayType: 'pill_list',
    editType: 'multi_item_form',
    isEndorsable: true,
    displayOrder: 2,
  },
  {
    key: 'qualities',
    displayName: 'Qualities',
    category: 'capabilities',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    isEndorsable: true,
    displayOrder: 3,
  },
  {
    key: 'experience',
    displayName: 'Experience',
    category: 'capabilities',
    dataType: 'string_array',
    displayType: 'timeline',
    editType: 'multi_item_form',
    isEndorsable: true,
    displayOrder: 4,
  },
  {
    key: 'education',
    displayName: 'Education',
    category: 'capabilities',
    dataType: 'string_array',
    displayType: 'timeline',
    editType: 'multi_item_form',
    isEndorsable: true,
    displayOrder: 5,
  },
  {
    key: 'certifications',
    displayName: 'Certifications',
    category: 'capabilities',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    isEndorsable: true,
    displayOrder: 6,
  },
  {
    key: 'values',
    displayName: 'Values',
    category: 'direction',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    displayOrder: 7,
  },
  {
    key: 'interests',
    displayName: 'Interests',
    category: 'direction',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    displayOrder: 8,
  },
  {
    key: 'seekingOpportunities',
    displayName: 'Seeking',
    category: 'direction',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    displayOrder: 9,
  },
  {
    key: 'focusAreas',
    displayName: 'Focus Areas',
    category: 'direction',
    dataType: 'array_of_objects',
    displayType: 'card_list',
    editType: 'structured_form',
    displayOrder: 10,
  },
  {
    key: 'offerings',
    displayName: 'Offerings',
    category: 'offerings',
    dataType: 'array_of_objects',
    displayType: 'card_list',
    editType: 'structured_form',
    displayOrder: 11,
  },
  {
    key: 'languages',
    displayName: 'Languages',
    category: 'foundations',
    dataType: 'string_array',
    displayType: 'tag_list',
    editType: 'tag_input',
    displayOrder: 12,
  },
] as const;

export async function seedTraitMetadata(): Promise<void> {
  for (const t of TRAIT_METADATA) {
    const existing = await db
      .select({ key: traitMetadata.key })
      .from(traitMetadata)
      .where(eq(traitMetadata.key, t.key));
    if (existing.length > 0) continue;

    await db.insert(traitMetadata).values({
      key: t.key,
      displayName: t.displayName,
      category: t.category,
      dataType: t.dataType,
      displayConfig: { type: t.displayType },
      editConfig: { type: t.editType },
      isEndorsable: t.isEndorsable ?? false,
      displayOrder: t.displayOrder,
      createdBy: 'system:seed',
      updatedBy: 'system:seed',
    });
  }
}
