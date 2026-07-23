/**
 * Backfill persona embeddings — run with `bun run backfill:embeddings` (needs
 * DATABASE_URL + OPENAI_API_KEY). Embeds every live persona missing a vector and
 * writes it back through the embeddings-worker system actor.
 *
 * Idempotent and resumable: it only touches personas where `embedding IS NULL`.
 */

import { getSystemPrincipal } from '@personus/auth/principal';
import { embeddingsWorker } from '@personus/auth/system';
import { db } from '@personus/db';
import { isNull } from '@personus/db/orm';
import { personas } from '@personus/db/schema';
import { updatePersonaEmbedding } from '@personus/db/services';
import { embedPersona } from './embeddings';

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[embeddings] OPENAI_API_KEY not set — nothing to do.');
    process.exit(1);
  }
  const principal = getSystemPrincipal(embeddingsWorker);

  const rows = await db
    .select({
      uri: personas.uri,
      displayName: personas.displayName,
      headline: personas.headline,
      location: personas.location,
      traits: personas.traits,
    })
    .from(personas)
    .where(isNull(personas.embedding));

  console.log(`[embeddings] ${rows.length} personas to embed…`);
  let done = 0;
  for (const p of rows) {
    const vec = await embedPersona(p);
    if (vec) {
      await updatePersonaEmbedding(principal, p.uri, vec);
      done++;
    }
  }
  console.log(`[embeddings] embedded ${done}/${rows.length}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[embeddings] failed:', err);
    process.exit(1);
  });
