CREATE TYPE "guild_request_route_outcome" AS ENUM('routed', 'responded', 'declined', 'expired');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" bigint NOT NULL,
	"persona_uri" text NOT NULL,
	"community_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}',
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" varchar(100) NOT NULL,
	"reason_code" varchar(100) NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_sessions" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" bigint NOT NULL,
	"persona_uri" text,
	"community_id" bigint,
	"kind" text DEFAULT 'persona_coach' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mode" text DEFAULT 'creation' NOT NULL,
	"transcript" jsonb DEFAULT '[]',
	"traits_updated" jsonb DEFAULT '[]',
	"completeness_at_start" integer,
	"completeness_at_end" integer,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"community_type" text DEFAULT 'club' NOT NULL,
	"traits" jsonb DEFAULT '{}' NOT NULL,
	"embedding" vector(1536),
	"backing_persona_uri" text,
	"tags" text[] DEFAULT '{}'::text[],
	"external_platforms" jsonb DEFAULT '[]' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"join_policy" text DEFAULT 'open' NOT NULL,
	"member_count" integer DEFAULT 0,
	"max_members" integer,
	"founding_user_id" bigint NOT NULL,
	"billing_user_id" bigint,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"geographic_bounds" jsonb,
	"parent_community_id" bigint,
	"auto_archive" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" bigint NOT NULL,
	"persona_id" bigint NOT NULL,
	"community_id" bigint NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"member_traits" jsonb DEFAULT '{}' NOT NULL,
	"visible" boolean DEFAULT true,
	"invited_by_user_id" bigint,
	CONSTRAINT "uq_community_members_user_community" UNIQUE("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE "community_types" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"community_trait_schema" jsonb DEFAULT '[]' NOT NULL,
	"member_trait_schema" jsonb DEFAULT '[]' NOT NULL,
	"default_join_policy" text DEFAULT 'open' NOT NULL,
	"default_visibility" text DEFAULT 'public' NOT NULL,
	"max_members_default" integer,
	"feature_flags" jsonb DEFAULT '{}' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"from_persona_uri" text,
	"from_agent_id" uuid,
	"from_anonymous" jsonb,
	"to_persona_uri" text NOT NULL,
	"to_community_id" bigint,
	"reason" text NOT NULL,
	"message" text,
	"triage_note" text,
	"triage_score" integer,
	"matched_open_to" text[],
	"trust_chain" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"response_note" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "endorsements" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"from_persona_uri" text NOT NULL,
	"to_persona_uri" text,
	"to_shadow_persona_id" bigint,
	"community_id" bigint,
	"relationship_type" text NOT NULL,
	"endorsement_context" text[] DEFAULT '{}'::text[],
	"strength" text DEFAULT 'standard' NOT NULL,
	"testimonial" text,
	"visibility" text DEFAULT 'community' NOT NULL,
	"active" boolean DEFAULT true,
	CONSTRAINT "endorsement_target_check" CHECK ("to_persona_uri" IS NOT NULL OR "to_shadow_persona_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "guild_membership_tiers" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"guild_persona_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer,
	"criteria" jsonb NOT NULL,
	"permissions" jsonb,
	"badge_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "guild_offering_members" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"offering_id" bigint NOT NULL,
	"member_persona_uri" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	CONSTRAINT "guild_offering_members_offering_id_member_persona_uri_unique" UNIQUE("offering_id","member_persona_uri")
);
--> statement-breakpoint
CREATE TABLE "guild_offerings" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"guild_persona_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"skill_category_ids" bigint[],
	"price_model" jsonb,
	"availability" text,
	"status" text DEFAULT 'active' NOT NULL,
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "guild_request_routes" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" bigint NOT NULL,
	"persona_uri" text NOT NULL,
	"routed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "guild_request_route_outcome" DEFAULT 'routed'::"guild_request_route_outcome" NOT NULL,
	CONSTRAINT "uq_guild_request_routes_request_persona" UNIQUE("request_id","persona_uri")
);
--> statement-breakpoint
CREATE TABLE "guild_requests" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"guild_persona_id" bigint NOT NULL,
	"requester_id" bigint,
	"requester_persona_uri" text,
	"need_description" text NOT NULL,
	"matched_category_ids" bigint[],
	"matched_offering_id" bigint,
	"selected_persona_uri" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"response_deadline" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "guild_skill_categories" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"guild_persona_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_category_id" bigint,
	"skill_tags" text[] NOT NULL,
	"display_order" integer,
	"icon" text,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"uri" text NOT NULL UNIQUE,
	"user_id" bigint NOT NULL,
	"display_name" text NOT NULL,
	"initial" text,
	"headline" text DEFAULT '' NOT NULL,
	"location" text,
	"entity_type" text DEFAULT 'person' NOT NULL,
	"visibility" text DEFAULT 'community' NOT NULL,
	"contact_preferences" jsonb DEFAULT '{}' NOT NULL,
	"completeness_score" integer DEFAULT 0,
	"layout_preset" text DEFAULT 'auto' NOT NULL,
	"theme" jsonb DEFAULT '{}' NOT NULL,
	"traits" jsonb DEFAULT '{}' NOT NULL,
	"mcp_enabled" boolean DEFAULT false NOT NULL,
	"mcp_trait_visibility" jsonb DEFAULT '{}' NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "platform_channel_bindings" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" bigint NOT NULL,
	"platform" text NOT NULL,
	"external_ref" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"adapter_config" jsonb DEFAULT '{}' NOT NULL,
	"installed_by" text NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now(),
	"revoked_at" timestamp with time zone,
	CONSTRAINT "uq_platform_channel_bindings_platform_ref" UNIQUE("platform","external_ref")
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" bigint NOT NULL,
	"query_text" text NOT NULL,
	"query_source" text NOT NULL,
	"agent_id" uuid,
	"match_count" integer DEFAULT 0,
	"matched_skills" text[],
	"resulted_in_contact" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shadow_personas" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" bigint NOT NULL,
	"created_by_persona_uri" text NOT NULL,
	"display_name" text NOT NULL,
	"entity_type" text DEFAULT 'person' NOT NULL,
	"traits" jsonb DEFAULT '{}' NOT NULL,
	"embedding" vector(1536),
	"claim_status" text DEFAULT 'unclaimed',
	"claim_token" text UNIQUE,
	"claimed_by_persona_uri" text,
	"invite_sent_via" text,
	"invite_sent_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"default_value" jsonb NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"value_type" text DEFAULT 'string' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "trait_metadata" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"key" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"group_key" text,
	"data_type" text NOT NULL,
	"item_schema" jsonb,
	"display_config" jsonb NOT NULL,
	"edit_config" jsonb NOT NULL,
	"is_searchable" boolean DEFAULT true,
	"is_endorsable" boolean DEFAULT false,
	"icon" text,
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "trait_taxonomies" (
	"id" bigserial PRIMARY KEY,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"trait_key" text NOT NULL,
	"taxonomy_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"icon" text,
	"suggested_values" text[] NOT NULL,
	"display_order" integer,
	CONSTRAINT "trait_taxonomies_trait_key_taxonomy_slug_unique" UNIQUE("trait_key","taxonomy_slug")
);
--> statement-breakpoint
CREATE TABLE "user_traits" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" bigint NOT NULL UNIQUE,
	"traits" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY,
	"public_id" varchar(21) NOT NULL UNIQUE,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"auth_subject_id" text NOT NULL UNIQUE,
	"email" text NOT NULL,
	"did" text UNIQUE,
	"preferred_languages" text[],
	"default_location" jsonb,
	"default_contact_preferences" jsonb DEFAULT '{}' NOT NULL,
	"mcp_preferences" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_activity_events_user" ON "activity_events" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_log_kind" ON "audit_log" ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_by" ON "audit_log" ("created_by","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_coach_sessions_active" ON "coach_sessions" ("user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_communities_type" ON "communities" ("community_type");--> statement-breakpoint
CREATE INDEX "idx_communities_slug" ON "communities" ("slug");--> statement-breakpoint
CREATE INDEX "idx_communities_founding_user" ON "communities" ("founding_user_id");--> statement-breakpoint
CREATE INDEX "idx_communities_billing_user" ON "communities" ("billing_user_id");--> statement-breakpoint
CREATE INDEX "idx_communities_backing" ON "communities" ("backing_persona_uri");--> statement-breakpoint
CREATE INDEX "idx_communities_parent" ON "communities" ("parent_community_id");--> statement-breakpoint
CREATE INDEX "idx_communities_tags" ON "communities" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_communities_traits" ON "communities" USING gin ("traits");--> statement-breakpoint
CREATE INDEX "idx_communities_embedding" ON "communities" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_communities_active" ON "communities" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_community_members_user" ON "community_members" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_community_members_persona" ON "community_members" ("persona_id");--> statement-breakpoint
CREATE INDEX "idx_community_members_community" ON "community_members" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_community_members_role" ON "community_members" ("role");--> statement-breakpoint
CREATE INDEX "idx_community_types_slug" ON "community_types" ("slug");--> statement-breakpoint
CREATE INDEX "idx_community_types_active" ON "community_types" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contact_requests_to" ON "contact_requests" ("to_persona_uri");--> statement-breakpoint
CREATE INDEX "idx_contact_requests_status" ON "contact_requests" ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_requests_active" ON "contact_requests" ("to_persona_uri") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_endorsements_to" ON "endorsements" ("to_persona_uri");--> statement-breakpoint
CREATE INDEX "idx_endorsements_from" ON "endorsements" ("from_persona_uri");--> statement-breakpoint
CREATE INDEX "idx_endorsements_community" ON "endorsements" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_endorsements_shadow" ON "endorsements" ("to_shadow_persona_id");--> statement-breakpoint
CREATE INDEX "idx_endorsements_active" ON "endorsements" ("to_persona_uri") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guild_membership_tiers_persona_name_active" ON "guild_membership_tiers" ("guild_persona_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_guild_membership_tiers_active" ON "guild_membership_tiers" ("guild_persona_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_guild_offerings_active" ON "guild_offerings" ("guild_persona_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_guild_request_routes_persona_uri" ON "guild_request_routes" ("persona_uri");--> statement-breakpoint
CREATE INDEX "idx_guild_requests_active" ON "guild_requests" ("guild_persona_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guild_skill_categories_persona_name_active" ON "guild_skill_categories" ("guild_persona_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_guild_skill_categories_active" ON "guild_skill_categories" ("guild_persona_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_personas_user" ON "personas" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_personas_uri" ON "personas" ("uri");--> statement-breakpoint
CREATE INDEX "idx_personas_entity_type" ON "personas" ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_personas_traits" ON "personas" USING gin ("traits");--> statement-breakpoint
CREATE INDEX "idx_personas_embedding" ON "personas" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_personas_active" ON "personas" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_platform_channel_bindings_community" ON "platform_channel_bindings" ("community_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_rate_limit_buckets_expires" ON "rate_limit_buckets" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_shadow_community" ON "shadow_personas" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_shadow_claim" ON "shadow_personas" ("claim_status");--> statement-breakpoint
CREATE INDEX "idx_shadow_embedding" ON "shadow_personas" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_shadow_personas_active" ON "shadow_personas" ("community_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_trait_metadata_active" ON "trait_metadata" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_trait_taxonomies_active" ON "trait_taxonomies" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_user_traits" ON "user_traits" USING gin ("traits");--> statement-breakpoint
CREATE INDEX "idx_user_traits_active" ON "user_traits" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_persona_uri_personas_uri_fkey" FOREIGN KEY ("persona_uri") REFERENCES "personas"("uri") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_backing_persona_uri_personas_uri_fkey" FOREIGN KEY ("backing_persona_uri") REFERENCES "personas"("uri") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_founding_user_id_users_id_fkey" FOREIGN KEY ("founding_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_billing_user_id_users_id_fkey" FOREIGN KEY ("billing_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_parent_community_id_communities_id_fkey" FOREIGN KEY ("parent_community_id") REFERENCES "communities"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_persona_id_personas_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_invited_by_user_id_users_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_from_persona_uri_personas_uri_fkey" FOREIGN KEY ("from_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_to_persona_uri_personas_uri_fkey" FOREIGN KEY ("to_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_to_community_id_communities_id_fkey" FOREIGN KEY ("to_community_id") REFERENCES "communities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_from_persona_uri_personas_uri_fkey" FOREIGN KEY ("from_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_to_persona_uri_personas_uri_fkey" FOREIGN KEY ("to_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_to_shadow_persona_id_shadow_personas_id_fkey" FOREIGN KEY ("to_shadow_persona_id") REFERENCES "shadow_personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "guild_membership_tiers" ADD CONSTRAINT "guild_membership_tiers_guild_persona_id_personas_id_fkey" FOREIGN KEY ("guild_persona_id") REFERENCES "personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_offering_members" ADD CONSTRAINT "guild_offering_members_offering_id_guild_offerings_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "guild_offerings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_offering_members" ADD CONSTRAINT "guild_offering_members_member_persona_uri_personas_uri_fkey" FOREIGN KEY ("member_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_offerings" ADD CONSTRAINT "guild_offerings_guild_persona_id_personas_id_fkey" FOREIGN KEY ("guild_persona_id") REFERENCES "personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_request_routes" ADD CONSTRAINT "guild_request_routes_request_id_guild_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "guild_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_request_routes" ADD CONSTRAINT "guild_request_routes_persona_uri_personas_uri_fkey" FOREIGN KEY ("persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_requests" ADD CONSTRAINT "guild_requests_guild_persona_id_personas_id_fkey" FOREIGN KEY ("guild_persona_id") REFERENCES "personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_requests" ADD CONSTRAINT "guild_requests_requester_id_users_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_requests" ADD CONSTRAINT "guild_requests_requester_persona_uri_personas_uri_fkey" FOREIGN KEY ("requester_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_requests" ADD CONSTRAINT "guild_requests_matched_offering_id_guild_offerings_id_fkey" FOREIGN KEY ("matched_offering_id") REFERENCES "guild_offerings"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "guild_requests" ADD CONSTRAINT "guild_requests_selected_persona_uri_personas_uri_fkey" FOREIGN KEY ("selected_persona_uri") REFERENCES "personas"("uri") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "guild_skill_categories" ADD CONSTRAINT "guild_skill_categories_guild_persona_id_personas_id_fkey" FOREIGN KEY ("guild_persona_id") REFERENCES "personas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_skill_categories" ADD CONSTRAINT "guild_skill_categories_gPwNfv1Fpez5_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "guild_skill_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "platform_channel_bindings" ADD CONSTRAINT "platform_channel_bindings_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shadow_personas" ADD CONSTRAINT "shadow_personas_community_id_communities_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shadow_personas" ADD CONSTRAINT "shadow_personas_created_by_persona_uri_personas_uri_fkey" FOREIGN KEY ("created_by_persona_uri") REFERENCES "personas"("uri") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shadow_personas" ADD CONSTRAINT "shadow_personas_claimed_by_persona_uri_personas_uri_fkey" FOREIGN KEY ("claimed_by_persona_uri") REFERENCES "personas"("uri") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_traits" ADD CONSTRAINT "user_traits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;