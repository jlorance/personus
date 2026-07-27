-- community_members.visible: remove the nullable ambiguity (PER-27).
--
-- The column shipped as `boolean DEFAULT true` with no NOT NULL, so its type
-- was `boolean | null` and nothing decided what NULL meant. The read path
-- (listCommunityMembers, PER-20) filters `= true`, treating NULL as hidden so
-- an indeterminate flag can never expose someone in a browsable directory.
-- That is a workaround for the schema being under-specified; this fixes it.
--
-- drizzle-kit generated the ALTER alone. On its own that statement FAILS on any
-- database holding a NULL, so the backfill below has to precede it. No row is
-- NULL today (the default applies on insert and joinCommunity never set the
-- column), which makes the backfill a no-op here — and the correct thing to
-- ship regardless, because "no rows are NULL today" is a fact about this
-- moment, not a guarantee about the database this eventually runs against.
UPDATE "community_members" SET "visible" = true WHERE "visible" IS NULL;--> statement-breakpoint
ALTER TABLE "community_members" ALTER COLUMN "visible" SET NOT NULL;
