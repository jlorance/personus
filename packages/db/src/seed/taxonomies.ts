/**
 * Trait taxonomy seed (representative set) — suggested values the Persona Coach
 * offers via its `lookup_suggestions` tool. Extend with more taxonomies as needed.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../index';
import { traitTaxonomies } from '../schema';

interface TaxonomySeed {
  traitKey: string;
  taxonomySlug: string;
  displayName: string;
  suggestedValues: string[];
  displayOrder: number;
}

export const TAXONOMIES: readonly TaxonomySeed[] = [
  {
    traitKey: 'skills',
    taxonomySlug: 'technology',
    displayName: 'Technology',
    suggestedValues: [
      'TypeScript',
      'Python',
      'React',
      'Postgres',
      'AI/ML',
      'DevOps',
      'Data Engineering',
    ],
    displayOrder: 1,
  },
  {
    traitKey: 'skills',
    taxonomySlug: 'trades',
    displayName: 'Trades & Services',
    suggestedValues: ['Plumbing', 'Electrical', 'Carpentry', 'Landscaping', 'HVAC', 'Painting'],
    displayOrder: 2,
  },
  {
    traitKey: 'qualities',
    taxonomySlug: 'working-style',
    displayName: 'Working Style',
    suggestedValues: [
      'Reliable',
      'Creative',
      'Detail-oriented',
      'Collaborative',
      'Proactive',
      'Calm under pressure',
    ],
    displayOrder: 1,
  },
  {
    traitKey: 'values',
    taxonomySlug: 'core-values',
    displayName: 'Core Values',
    suggestedValues: [
      'Integrity',
      'Craftsmanship',
      'Sustainability',
      'Community',
      'Curiosity',
      'Fairness',
    ],
    displayOrder: 1,
  },
  {
    traitKey: 'interests',
    taxonomySlug: 'interests',
    displayName: 'Interests',
    suggestedValues: [
      'Cycling',
      'Cooking',
      'Photography',
      'Open Source',
      'Gardening',
      'Live Music',
    ],
    displayOrder: 1,
  },
  {
    traitKey: 'seekingOpportunities',
    taxonomySlug: 'seeking',
    displayName: 'Seeking',
    suggestedValues: [
      'Mentorship',
      'Collaborators',
      'Clients',
      'Advisors',
      'Co-founders',
      'Introductions',
    ],
    displayOrder: 1,
  },
] as const;

export async function seedTaxonomies(): Promise<void> {
  for (const t of TAXONOMIES) {
    const existing = await db
      .select({ id: traitTaxonomies.id })
      .from(traitTaxonomies)
      .where(
        and(
          eq(traitTaxonomies.traitKey, t.traitKey),
          eq(traitTaxonomies.taxonomySlug, t.taxonomySlug),
        ),
      );
    if (existing.length > 0) continue;

    await db.insert(traitTaxonomies).values({
      traitKey: t.traitKey,
      taxonomySlug: t.taxonomySlug,
      displayName: t.displayName,
      suggestedValues: t.suggestedValues,
      displayOrder: t.displayOrder,
      createdBy: 'system:seed',
      updatedBy: 'system:seed',
    });
  }
}
