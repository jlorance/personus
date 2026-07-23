/**
 * Zod validation schemas for entity inputs (inherited pattern).
 *
 * Server actions parse untrusted input through these before touching services.
 * Kept intentionally small in the founding pass — extend per entity as UI lands.
 */

import { ENTITY_TYPES, RELATIONSHIP_TYPES, VISIBILITY_LEVELS } from '@personus/constants';
import { z } from 'zod';

export const skillSchema = z.object({
  name: z.string().min(1).max(120),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

export const createPersonaSchema = z.object({
  displayName: z.string().min(1).max(120),
  headline: z.string().max(280).default(''),
  location: z.string().max(120).optional(),
  entityType: z.enum(ENTITY_TYPES).default('person'),
  visibility: z.enum(VISIBILITY_LEVELS).default('community'),
});
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;

export const updatePersonaSchema = createPersonaSchema.partial();
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;

export const createEndorsementSchema = z.object({
  toPersonaUri: z.string().min(1).optional(),
  toShadowPersonaId: z.string().min(1).optional(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  strength: z.enum(['strong', 'moderate', 'light']).default('moderate'),
  testimonial: z.string().max(2000).optional(),
});
export type CreateEndorsementInput = z.infer<typeof createEndorsementSchema>;
