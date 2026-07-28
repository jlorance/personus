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
import { getSystemPrincipal } from '@personus/auth/principal';
import { embeddingsWorker } from '@personus/auth/system';
import { db } from '@personus/db';
import { and, eq, isNull } from '@personus/db/orm';
import { personas } from '@personus/db/schema';
import { updatePersonaEmbedding } from '@personus/db/services';
import { getSetting } from '@personus/db/settings';
import { env } from '@personus/env';
import { logger } from '@personus/logger';
import { TIMEOUTS, withTimeout } from '@personus/timeout';
import { embed } from 'ai';

export interface PersonaLike {
  displayName?: string | null;
  headline?: string | null;
  location?: string | null;
  traits?: unknown;
}

/**
 * Fields whose content is included in `personaEmbeddingText`. An update to any
 * of these warrants a re-embedding; updates to layout, theme, completeness
 * score, or other metadata do not affect the vector.
 *
 * Used as a semantic "debounce": callers skip the embed work when none of the
 * changed fields feed the vector, rather than re-embedding on every trivial edit.
 */
export const EMBEDDING_RELEVANT_FIELDS = new Set([
  'displayName',
  'headline',
  'location',
  'skills',
  'qualities',
  'values',
  'offerings',
  'seekingOpportunities',
]);

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
  ].filter((s): s is string => Boolean(s?.trim()));
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

/**
 * Best-effort re-embed a persona after an update to its embedding-relevant
 * fields. Runs as the embeddings-worker system actor (CASL `index Persona`) so
 * any authenticated principal can trigger it without owning the vector write.
 *
 * Accepts an optional `_embed` override so integration tests can inject a
 * deterministic fake without OPENAI_API_KEY. Production always uses the real
 * `embedPersona`.
 *
 * Never throws: all errors are logged and swallowed so the calling tool or
 * server action is never blocked by a failed embedding refresh.
 */
export async function refreshPersonaEmbedding(
  uri: string,
  opts?: { _embed?: (p: PersonaLike) => Promise<number[] | null> },
): Promise<void> {
  const embedFn = opts?._embed ?? embedPersona;
  try {
    const [row] = await db
      .select({
        displayName: personas.displayName,
        headline: personas.headline,
        location: personas.location,
        traits: personas.traits,
      })
      .from(personas)
      .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
      .limit(1);

    if (!row) return; // persona deleted or missing — nothing to embed

    const vec = await embedFn(row);
    if (!vec) return; // embedder unavailable (no API key) — fail soft

    const principal = getSystemPrincipal(embeddingsWorker);
    await updatePersonaEmbedding(principal, uri, vec);
  } catch (err) {
    logger.warn({ err: String(err), uri }, 'refreshPersonaEmbedding failed');
  }
}
