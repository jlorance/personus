import { describe, expect, it } from 'vitest';
import { createEndorsementSchema, createPersonaSchema, skillSchema } from './index';

describe('createPersonaSchema', () => {
  it('applies defaults and accepts a minimal valid input', () => {
    const parsed = createPersonaSchema.parse({ displayName: 'Maria Osei' });
    expect(parsed.entityType).toBe('person');
    expect(parsed.visibility).toBe('community');
    expect(parsed.headline).toBe('');
  });

  it('rejects an empty display name and an over-long headline', () => {
    expect(createPersonaSchema.safeParse({ displayName: '' }).success).toBe(false);
    expect(
      createPersonaSchema.safeParse({ displayName: 'A', headline: 'x'.repeat(281) }).success,
    ).toBe(false);
  });
});

describe('skillSchema', () => {
  it('accepts an optional proficiency from the enum', () => {
    expect(skillSchema.parse({ name: 'Plumbing', proficiency: 'expert' }).proficiency).toBe(
      'expert',
    );
    expect(skillSchema.safeParse({ name: 'X', proficiency: 'wizard' }).success).toBe(false);
  });
});

describe('createEndorsementSchema', () => {
  it('defaults strength and requires a valid relationship type', () => {
    const parsed = createEndorsementSchema.parse({
      toPersonaUri: 'per_a',
      relationshipType: 'mentor',
    });
    expect(parsed.strength).toBe('moderate');
    expect(createEndorsementSchema.safeParse({ relationshipType: 'nemesis' }).success).toBe(false);
  });
});
