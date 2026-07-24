/**
 * Persona discovery — the search behind the Discovery agent + MCP `personus_search`.
 *
 * Visibility-aware: an authenticated principal (networkDepth 2) sees
 * public/authenticated/community personas; an anonymous caller (depth 1) sees
 * only public ones. When the caller supplies a query embedding, results are
 * ranked by pgvector cosine similarity over `personas.embedding` (ivfflat index);
 * otherwise it falls back to a text match over displayName/headline/traits.
 */

import { DEFAULT_SEARCH_RESULTS, MAX_SEARCH_RESULTS } from '@personus/constants';
import { db } from '../index';
import { and, cosineDistance, eq, ilike, isNotNull, isNull, or, type SQL, sql } from '../orm';
import { endorsements, personas } from '../schema';
import { canViewPersona, type Viewer } from './gates';
import { ForbiddenError, type ServicePrincipal } from './index';

export interface PersonaSearchResult {
  uri: string;
  displayName: string;
  headline: string;
  location: string | null;
  endorsementCount: number;
  /** Cosine similarity 0..1 when ranked by embedding; undefined for text search. */
  similarity?: number;
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
  /** 1536-dim query embedding. When present, results are ranked by cosine similarity. */
  queryEmbedding?: number[];
  /**
   * Restrict to personas that opted into AI/MCP exposure (`mcpEnabled = true`).
   * External agent surfaces (MCP, REST discovery, platform bots) MUST pass true;
   * human web surfaces pass false and gate on `visibility` only. `visibility`
   * governs human viewing; `mcpEnabled` is the separate agent-exposure opt-in.
   */
  requireMcpEnabled?: boolean;
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
  const limit = Math.min(
    Math.max(opts.maxResults ?? DEFAULT_SEARCH_RESULTS, 1),
    MAX_SEARCH_RESULTS,
  );
  const mcpFilter = opts.requireMcpEnabled ? eq(personas.mcpEnabled, true) : undefined;

  const endorsementCount = sql<number>`(
    select count(*)::int from ${endorsements}
    where ${endorsements.toPersonaUri} = ${personas.uri}
      and ${endorsements.deletedAt} is null
  )`;

  // Semantic path: when a query embedding is supplied, rank by cosine similarity
  // over `personas.embedding` (the ivfflat index serves this). Only personas that
  // have an embedding participate; callers fall back to text when none match.
  if (opts.queryEmbedding && opts.queryEmbedding.length > 0) {
    const similarity = sql<number>`1 - (${cosineDistance(personas.embedding, opts.queryEmbedding)})`;
    const rows = await db
      .select({
        uri: personas.uri,
        displayName: personas.displayName,
        headline: personas.headline,
        location: personas.location,
        endorsementCount,
        similarity,
      })
      .from(personas)
      .where(
        and(
          isNull(personas.deletedAt),
          visibilityFilter(depth),
          isNotNull(personas.embedding),
          mcpFilter,
        ),
      )
      .orderBy(sql`${similarity} desc`)
      .limit(limit);
    return rows.map((r) => ({ ...r, headline: r.headline ?? '' }));
  }

  // Text path: ILIKE over the human-readable fields, ranked by completeness.
  // Escape LIKE metacharacters so a query of "%" can't match everything / scan.
  const escaped = opts.query.trim().replace(/[%_\\]/g, '\\$&');
  const q = `%${escaped}%`;
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
      endorsementCount,
    })
    .from(personas)
    .where(and(isNull(personas.deletedAt), visibilityFilter(depth), textMatch, mcpFilter))
    .orderBy(sql`${personas.completenessScore} desc nulls last`)
    .limit(limit);

  return rows.map((r) => ({ ...r, headline: r.headline ?? '' }));
}

/**
 * Write a persona's embedding vector (derived search-index data, not user
 * content). Allowed for the embeddings worker (CASL `index Persona`) OR the
 * persona's own owner — but NOT an arbitrary principal that merely holds
 * `update Persona`, so a delegated editing agent can't poison others' vectors.
 */
export async function updatePersonaEmbedding(
  principal: ServicePrincipal,
  uri: string,
  embedding: number[],
): Promise<boolean> {
  const isWorker = principal.ability.can('index', 'Persona');
  if (!isWorker) {
    // Non-worker path requires ownership of the persona.
    if (!principal.userId || !principal.ability.can('update', 'Persona'))
      throw new ForbiddenError();
    const [owner] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
      .limit(1);
    if (!owner || String(owner.userId) !== principal.userId) throw new ForbiddenError();
  }

  const updated = await db
    .update(personas)
    .set({ embedding, updatedAt: new Date() })
    .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
    .returning({ id: personas.id });
  return updated.length > 0;
}

/**
 * Full persona load by uri, visibility-gated. Returns null if not visible.
 * Pass `requireMcpEnabled` from external agent surfaces so an owner who hasn't
 * opted a persona into MCP exposure isn't surfaced to bots/MCP/REST callers.
 */
export async function getPersonaByUri(
  principal: ServicePrincipal & { networkDepth?: 1 | 2 },
  uri: string,
  requireMcpEnabled = false,
): Promise<typeof personas.$inferSelect | null> {
  if (!principal.ability.can('read', 'Persona')) return null;
  const [row] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.uri, uri), isNull(personas.deletedAt)))
    .limit(1);
  if (!row) return null;
  if (requireMcpEnabled && row.mcpEnabled !== true) return null;

  const viewer: Viewer = { userId: principal.userId, networkDepth: principal.networkDepth ?? 1 };
  return canViewPersona(viewer, { visibility: row.visibility, ownerUserId: String(row.userId) })
    ? row
    : null;
}
