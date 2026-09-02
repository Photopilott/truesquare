DO $$ BEGIN
	CREATE TYPE "public"."developer_interest_audience" AS ENUM('buyer', 'owner');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."developer_interest_status" AS ENUM('pending', 'reviewed', 'archived');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_interest_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" "developer_interest_audience" NOT NULL,
	"developer" text NOT NULL,
	"project" text,
	"buying_stage" text,
	"relationship" text,
	"experience" text,
	"email" text NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"consent_version" text NOT NULL,
	"status" "developer_interest_status" DEFAULT 'pending' NOT NULL,
	"request_fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_notes" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_interest_developer_status_idx" ON "developer_interest_submissions" USING btree ("developer","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_interest_email_created_idx" ON "developer_interest_submissions" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_interest_fingerprint_created_idx" ON "developer_interest_submissions" USING btree ("request_fingerprint","created_at");
