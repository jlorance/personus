/** Community types seed — the 9 canonical community kinds (idempotent). */

import { db } from '../index';
import { eq } from '../orm';
import { communityTypes } from '../schema';

interface CommunityTypeSeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
  defaultJoinPolicy: string;
  defaultVisibility: string;
  displayOrder: number;
}

export const COMMUNITY_TYPES: readonly CommunityTypeSeed[] = [
  {
    slug: 'club',
    name: 'Club',
    description: 'Interest-based group',
    icon: '🎯',
    defaultJoinPolicy: 'open',
    defaultVisibility: 'public',
    displayOrder: 1,
  },
  {
    slug: 'organization',
    name: 'Organization',
    description: 'Formal organization',
    icon: '🏢',
    defaultJoinPolicy: 'approval',
    defaultVisibility: 'public',
    displayOrder: 2,
  },
  {
    slug: 'friends',
    name: 'Friends',
    description: 'Personal circle',
    icon: '👥',
    defaultJoinPolicy: 'invite_only',
    defaultVisibility: 'private',
    displayOrder: 3,
  },
  {
    slug: 'guild',
    name: 'Guild',
    description: 'Skill-centric service community',
    icon: '⚒️',
    defaultJoinPolicy: 'approval',
    defaultVisibility: 'public',
    displayOrder: 4,
  },
  {
    slug: 'workplace',
    name: 'Workplace',
    description: 'Colleagues and teams',
    icon: '💼',
    defaultJoinPolicy: 'approval',
    defaultVisibility: 'authenticated',
    displayOrder: 5,
  },
  {
    slug: 'customer',
    name: 'Customer',
    description: 'Customer community',
    icon: '🛍️',
    defaultJoinPolicy: 'open',
    defaultVisibility: 'public',
    displayOrder: 6,
  },
  {
    slug: 'neighborhood',
    name: 'Neighborhood',
    description: 'Geographic local group',
    icon: '🏘️',
    defaultJoinPolicy: 'approval',
    defaultVisibility: 'public',
    displayOrder: 7,
  },
  {
    slug: 'event',
    name: 'Event',
    description: 'Time-bound gathering',
    icon: '📅',
    defaultJoinPolicy: 'open',
    defaultVisibility: 'public',
    displayOrder: 8,
  },
  {
    slug: 'educational',
    name: 'Educational',
    description: 'Learning cohort',
    icon: '🎓',
    defaultJoinPolicy: 'approval',
    defaultVisibility: 'public',
    displayOrder: 9,
  },
] as const;

export async function seedCommunityTypes(): Promise<void> {
  for (const t of COMMUNITY_TYPES) {
    const existing = await db
      .select({ slug: communityTypes.slug })
      .from(communityTypes)
      .where(eq(communityTypes.slug, t.slug));

    if (existing.length === 0) {
      await db.insert(communityTypes).values({
        ...t,
        createdBy: 'system:seed',
        updatedBy: 'system:seed',
      });
    } else {
      await db
        .update(communityTypes)
        .set({
          name: t.name,
          description: t.description,
          icon: t.icon,
          displayOrder: t.displayOrder,
          updatedBy: 'system:seed',
        })
        .where(eq(communityTypes.slug, t.slug));
    }
  }
}
