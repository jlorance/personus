/**
 * Persona embeddings — turn a persona's human-readable content into a 1536-dim
 * vector for semantic search over `personas.embedding`.
 *
 * Fails soft: with no OPENAI_API_KEY (or on any error) `embedText` returns null,
 * and callers fall back to text search. The model is admin-tunable via
 * `ai.embedding_model` (default text-embedding-3-small = 1536 dims, which must
 * match the pgvector column).
 */

import { openai } from '@ai-sdk/openai';
import { getSetting } from '@personus/db/settings';
import { env } from '@personus/env';
import { logger } from '@personus/logger';
import { TIMEOUTS, withTimeout } from '@personus/timeout';
import { embed } from 'ai';

interface PersonaLike {
  displayName?: string | null;
  headline?: string | null;
  location?: string | null;
  traits?: unknown;
}

function strings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : typeof x?.name === 'string' ? x.name : ''))
    .filter(Boolean);
}

/** Compose the text embedded for a persona (name + headline + key traits). */
export function personaEmbeddingText(p: PersonaLike): string {
  const t = (p.traits ?? {}) as Record<string, unknown>;
  const parts = [
    p.displayName,
    p.headline,
    p.location,
    strings(t.skills).join(', '),
    strings(t.qualities).join(', '),
    strings(t.values).join(', '),
    strings(t.offerings).join(', '),
    strings(t.seekingOpportunities).join(', '),
  ].filter((s): s is string => Boolean(s && s.trim()));
  return parts.join('. ');
}

/** Embed arbitrary text. Returns null when embeddings are unavailable (fail soft). */
export async function embedText(text: string): Promise<number[] | null> {
  if (!env.OPENAI_API_KEY || !text.trim()) return null;
  const model = await getSetting('ai.embedding_model', 'text-embedding-3-small');
  try {
    const { embedding } = await withTimeout(
      embed({ model: openai.textEmbeddingModel(model), value: text }),
      TIMEOUTS.embed,
      'embed',
    );
    return embedding;
  } catch (err) {
    logger.warn({ err: String(err) }, 'embedText failed — falling back to text search');
    return null;
  }
}

/** Embed a persona from its content. Null when unavailable or content is empty. */
export function embedPersona(p: PersonaLike): Promise<number[] | null> {
  return embedText(personaEmbeddingText(p));
}
