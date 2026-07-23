import { describe, expect, it } from 'vitest';
import { embedText, personaEmbeddingText } from './embeddings';

describe('personaEmbeddingText', () => {
  it('composes name, headline, and key traits into one string', () => {
    const text = personaEmbeddingText({
      displayName: 'Maria Osei',
      headline: 'Restores Victorian plumbing',
      location: 'Bristol',
      traits: {
        skills: [{ name: 'Plumbing' }, { name: 'Soldering' }],
        qualities: ['Reliable'],
        values: ['Craftsmanship'],
      },
    });
    expect(text).toContain('Maria Osei');
    expect(text).toContain('Restores Victorian plumbing');
    expect(text).toContain('Plumbing, Soldering');
    expect(text).toContain('Craftsmanship');
  });

  it('handles empty/missing traits without producing stray separators', () => {
    expect(personaEmbeddingText({ displayName: 'Solo' })).toBe('Solo');
    expect(personaEmbeddingText({})).toBe('');
  });
});

describe('embedText (fail-soft)', () => {
  it('returns null when no API key is configured', async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';
    try {
      expect(await embedText('anything')).toBeNull();
    } finally {
      if (prev === undefined) process.env.OPENAI_API_KEY = undefined as never;
      else process.env.OPENAI_API_KEY = prev;
    }
  });

  it('returns null for empty text', async () => {
    expect(await embedText('   ')).toBeNull();
  });
});
