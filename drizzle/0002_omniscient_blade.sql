CREATE TYPE "public"."consent_context" AS ENUM('owner', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."user_auth_provider" AS ENUM('google', 'email_otp');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone NOT NULL,
	"google_subject" text,
	"display_name" text,
	"picture_url" text,
	"last_auth_provider" "user_auth_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"context" "consent_context" NOT NULL,
	"covenant_version" text NOT NULL,
	"accepted" boolean DEFAULT true NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_fingerprint" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts_remaining" integer DEFAULT 5 NOT NULL,
	"request_fingerprint" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"auth_provider" "user_auth_provider" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contributors" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_contributions" ADD COLUMN "request_fingerprint" text;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_google_subject_unique" ON "app_users" USING btree ("google_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "user_consents_user_context_version_unique" ON "user_consents" USING btree ("user_id","context","covenant_version");--> statement-breakpoint
CREATE INDEX "user_otp_email_requested_idx" ON "user_otp_challenges" USING btree ("email","requested_at");--> statement-breakpoint
CREATE INDEX "user_otp_fingerprint_requested_idx" ON "user_otp_challenges" USING btree ("request_fingerprint","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_unique" ON "user_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_expires_idx" ON "user_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
ALTER TABLE "contributors" ADD CONSTRAINT "contributors_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;