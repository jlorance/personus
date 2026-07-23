'use server';

import { embedText } from '@personus/ai';
import { getAnonymousMcpPrincipal, getOptionalPrincipal } from '@personus/auth/principal';
import { searchPersonas } from '@personus/db/services';
import { logger } from '@personus/logger';
import type { LedgerEntry } from '@/components/ledger-row';

export interface SearchState {
  query: string;
  results: LedgerEntry[];
  ran: boolean;
  error?: string;
}

/**
 * Explore search — resolves the caller's Principal (or an anonymous public-read
 * one), runs the visibility-aware persona search, and maps rows to ledger
 * entries. Degrades to a friendly empty state if the database isn't configured.
 */
export async function searchAction(_prev: SearchState, formData: FormData): Promise<SearchState> {
  const query = String(formData.get('query') ?? '').trim();
  if (!query) return { query: '', results: [], ran: false };

  try {
    const principal =
      (await getOptionalPrincipal()) ??
      getAnonymousMcpPrincipal(new Request('http://local/explore'));

    // Prefer semantic ranking; embedText returns null without an API key, in
    // which case searchPersonas falls back to text matching.
    const queryEmbedding = (await embedText(query)) ?? undefined;
    let rows = await searchPersonas(principal, { query, maxResults: 12, queryEmbedding });
    // If semantic search found nothing (e.g. no personas embedded yet), retry text.
    if (queryEmbedding && rows.length === 0) {
      rows = await searchPersonas(principal, { query, maxResults: 12 });
    }
    const results: LedgerEntry[] = rows.map((r) => ({
      uri: r.uri,
      displayName: r.displayName,
      capability: r.headline || '—',
      endorsements: r.endorsementCount,
    }));
    return { query, results, ran: true };
  } catch (err) {
    logger.warn({ err: String(err) }, 'explore search failed');
    return {
      query,
      results: [],
      ran: true,
      error: 'Search is offline right now — connect a database to populate the register.',
    };
  }
}
