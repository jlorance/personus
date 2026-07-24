import { describe, expect, it } from 'vitest';
import { calculateCompleteness } from './completeness';

// Without a DATABASE_URL these unit tests exercise the fail-closed path:
// `getSetting` returns DEFAULT_COMPLETENESS_WEIGHTS, so the scores below match
// the seeded defaults exactly.
describe('calculateCompleteness', () => {
  it('scores an empty persona at 0 and suggests every dimension', async () => {
    const { score, breakdown, nextSuggestions } = await calculateCompleteness({});
    expect(score).toBe(0);
    expect(Object.values(breakdown).every((v) => v === false)).toBe(true);
    expect(nextSuggestions).toContain('Headline');
    expect(nextSuggestions).toContain('Skills');
  });

  it('credits filled dimensions and omits them from suggestions', async () => {
    const { score, breakdown, nextSuggestions } = await calculateCompleteness({
      headline: 'Restores Victorian plumbing',
      traits: { skills: [{ name: 'Plumbing' }], values: ['Craftsmanship'] },
    });
    expect(score).toBe(15 + 20 + 10); // headline + skills + values
    expect(breakdown.headline).toBe(true);
    expect(breakdown.skills).toBe(true);
    expect(nextSuggestions).not.toContain('Headline');
    expect(nextSuggestions).toContain('Offerings');
  });

  it('treats empty strings and empty arrays as unfilled', async () => {
    const { score, breakdown } = await calculateCompleteness({
      headline: '   ',
      traits: { skills: [] },
    });
    expect(breakdown.headline).toBe(false);
    expect(breakdown.skills).toBe(false);
    expect(score).toBe(0);
  });

  it('caps a fully-filled persona at 100', async () => {
    const { score } = await calculateCompleteness({
      headline: 'h',
      traits: {
        skills: ['a'],
        qualities: ['a'],
        values: ['a'],
        seekingOpportunities: ['a'],
        offerings: ['a'],
        focusAreas: ['a'],
      },
    });
    expect(score).toBe(100);
  });
});
