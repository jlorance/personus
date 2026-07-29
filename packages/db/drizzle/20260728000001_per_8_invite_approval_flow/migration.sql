-- PER-8: invite + approval join flow
--
-- Two new tables back the gated-community flows:
--
--   community_join_requests — one pending row per user per community for
--   `approval`-gated communities. An admin approves or declines; approval
--   creates the membership row. Status transitions: pending → approved | declined.
--
--   community_invitations — token-based single-use invitations for
--   `invite_only` communities. An admin mints a token; the invitee presents it
--   to claim membership.
--
-- Both tables use the repo's `baseFields` shape: bigserial PK, varchar(21)
-- public_id, audit columns, and deleted_at for soft-delete.

CREATE TABLE "community_join_requests" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" bigint NOT NULL,
	"requesting_user_id" bigint NOT NULL,
	"requesting_persona_id" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_user_id" bigint,
	"message" text,
	CONSTRAINT "community_join_requests_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE,
	CONSTRAINT "community_join_requests_requesting_user_id_fk" FOREIGN KEY ("requesting_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "community_join_requests_requesting_persona_id_fk" FOREIGN KEY ("requesting_persona_id") REFERENCES "personas"("id") ON DELETE CASCADE,
	CONSTRAINT "community_join_requests_decision_user_id_fk" FOREIGN KEY ("decision_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE "community_invitations" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" bigint NOT NULL,
	"inviter_user_id" bigint NOT NULL,
	"token" text NOT NULL UNIQUE,
	"claimed_by_user_id" bigint,
	"claimed_by_persona_id" bigint,
	"claimed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "community_invitations_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE,
	CONSTRAINT "community_invitations_inviter_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "community_invitations_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
	CONSTRAINT "community_invitations_claimed_by_persona_id_fk" FOREIGN KEY ("claimed_by_persona_id") REFERENCES "personas"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX "idx_cjr_community" ON "community_join_requests" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_cjr_requesting_user" ON "community_join_requests" ("requesting_user_id");--> statement-breakpoint
CREATE INDEX "idx_cjr_status" ON "community_join_requests" ("status");--> statement-breakpoint
CREATE INDEX "idx_cjr_active" ON "community_join_requests" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_cinv_community" ON "community_invitations" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_cinv_token" ON "community_invitations" ("token");--> statement-breakpoint
CREATE INDEX "idx_cinv_active" ON "community_invitations" ("id") WHERE deleted_at IS NULL;
