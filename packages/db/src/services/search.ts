/**
 * Persona discovery — the search behind the Discovery agent + MCP `personus_search`.
 *
 * Visibility-aware: an authenticated principal (networkDepth 2) sees
 * public/authenticated/community personas; an anonymous caller (depth 1) sees
 * only public ones. The founding implementation is a text match over
 * displayName/headline/traits; pgvector cosine ranking over `personas.embedding`
 * plugs in here once embeddings are backfilled (see the TODO below).
 */

import { db } from '../index';
import { and, eq, ilike, isNull, or, type SQL, sql } from '../orm';
import { endorsements, personas } from '../schema';
import type { ServicePrincipal } from './index';

export interface PersonaSearchResult {
  uri: string;
  displayName: string;
  headline: string;
  location: string | null;
  endorsementCount: number;
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
}

/** Principal-aware visibility filter. depth 1 → public only; depth 2 → +authenticated/community. */
function visibilityFilter(networkDepth: 1 | 2): SQL {
  const visible =
    networkDepth >= 2
      ? sql`${personas.visibility} in ('public','authenticated','community')`
      : sql`${personas.visibility} = 'public'`;
  return visible;
}

export async function searchPersonas(
  principal: ServicePrincipal & { networkDepth?: 1 | 2 },
  opts: SearchOptions,
): Promise<PersonaSearchResult[]> {
  if (!principal.ability.can('read', 'Persona')) return [];

  const depth = principal.networkDepth ?? 1;
  const limit = Math.min(Math.max(opts.maxResults ?? 3, 1), 25);
  const q = `%${opts.query.trim()}%`;

  // TODO(embeddings): when personas.embedding is populated, rank by
  // `embedding <=> $queryEmbedding` (cosine) via the IVFFlat index and fall back
  // to this text match. For now, a text ILIKE over the human-readable fields.
  const textMatch = or(
    ilike(personas.displayName, q),
    ilike(personas.headline, q),
    sql`${personas.traits}::text ilike ${q}`,
  );

  const rows = await db
    .select({
      uri: personas.uri,
      displayName: personas.displayName,
      headline: personas.headline,
      location: personas.location,
      endorsementCount: sql<number>`(
        select count(*)::int from ${endorsements}
        where ${endorsements.toPersonaUri} = ${personas.uri}
          and ${endorsements.deletedAt} is null
      )`,
    })
    .from(personas)
    .where(and(isNull(personas.deletedAt), visibilityFilter(depth), textMatch))
    .orderBy(sql`${personas.completenessScore} desc nulls last`)
    .limit(limit);

  return rows.map((r) => ({ ...r, headline: r.headline ?? '' }));
}

/** Full persona load by uri, visibility-gated. Returns null if not visible. */
export async function getPersonaByUri(
  principal: ServicePrincipal & { networkDepth?: 1 | 2 },
  uri: string,
): Promise<typeof personas.$inferSelect | null> {
  if (!principal.ability.can('read', 'Persona')) return null;
  const [row] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
    .limit(1);
  if (!row) return null;

  const depth = principal.networkDepth ?? 1;
  const allowed =
    row.visibility === 'public' ||
    (depth >= 2 && (row.visibility === 'authenticated' || row.visibility === 'community')) ||
    (principal.userId != null && String(row.userId) === principal.userId);
  return allowed ? row : null;
}
