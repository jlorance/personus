-- PER-24: GDPR erasure — partial-filter the persona embedding index so
-- soft-deleted personas are excluded from the vector index immediately.
--
-- Without this filter a soft-deleted persona's 1536-dimensional fingerprint
-- stays in the ivfflat index even after deletePersona sets deleted_at, and
-- remains reachable by a full-scan similarity path. The sibling
-- idx_personas_active already carries a partial filter; this aligns
-- idx_personas_embedding to the same boundary.
--
-- The DROP + CREATE is safe: the search path already filters deleted_at IS NULL
-- at query time, so no query result changes. The only effect is evicting
-- tombstoned vectors from the index, which is the point.
DROP INDEX IF EXISTS "idx_personas_embedding";--> statement-breakpoint
CREATE INDEX "idx_personas_embedding" ON "personas" USING ivfflat ("embedding" vector_cosine_ops) WHERE (deleted_at IS NULL);
