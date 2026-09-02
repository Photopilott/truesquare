DO $$ BEGIN
	CREATE TYPE "public"."flat_value_source_type" AS ENUM('registered_transaction', 'owner_input');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bangalore_flat_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"area" text NOT NULL,
	"area_key" text NOT NULL,
	"builder" text NOT NULL,
	"source_url" text,
	"source_file" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bug_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"reporter_email" text,
	"page_path" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"request_fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "final_flat_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flat_inventory_id" text,
	"source_type" "flat_value_source_type" NOT NULL,
	"registered_transaction_id" text,
	"owner_input_transaction_id" uuid,
	"price" bigint NOT NULL,
	"effective_area" numeric(12, 2),
	"price_per_sq_ft" numeric(12, 2),
	"bhk" text,
	"value_date" date,
	"society" text NOT NULL,
	"location" text NOT NULL,
	"source_url" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "final_flat_values_source_reference_check" CHECK ((
        ("final_flat_values"."source_type" = 'registered_transaction'
          AND "final_flat_values"."registered_transaction_id" IS NOT NULL
          AND "final_flat_values"."owner_input_transaction_id" IS NULL)
        OR
        ("final_flat_values"."source_type" = 'owner_input'
          AND "final_flat_values"."registered_transaction_id" IS NULL
          AND "final_flat_values"."owner_input_transaction_id" IS NOT NULL
          AND "final_flat_values"."approved_at" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_input_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"flat_inventory_id" text,
	"purchase_price" bigint NOT NULL,
	"effective_area" numeric(12, 2) NOT NULL,
	"price_per_sq_ft" numeric(12, 2) NOT NULL,
	"bhk" text NOT NULL,
	"purchase_date" date NOT NULL,
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_notes" text,
	"society" text NOT NULL,
	"location" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_properties" ADD COLUMN IF NOT EXISTS "flat_inventory_id" text;--> statement-breakpoint
ALTER TABLE "registered_transactions" ADD COLUMN IF NOT EXISTS "flat_inventory_id" text;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "final_flat_values" ADD CONSTRAINT "final_flat_values_flat_inventory_id_bangalore_flat_inventory_id_fk" FOREIGN KEY ("flat_inventory_id") REFERENCES "public"."bangalore_flat_inventory"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "final_flat_values" ADD CONSTRAINT "final_flat_values_registered_transaction_id_registered_transactions_id_fk" FOREIGN KEY ("registered_transaction_id") REFERENCES "public"."registered_transactions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "final_flat_values" ADD CONSTRAINT "final_flat_values_owner_input_transaction_id_owner_input_transactions_id_fk" FOREIGN KEY ("owner_input_transaction_id") REFERENCES "public"."owner_input_transactions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "owner_input_transactions" ADD CONSTRAINT "owner_input_transactions_contribution_id_purchase_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."purchase_contributions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "owner_input_transactions" ADD CONSTRAINT "owner_input_transactions_flat_inventory_id_bangalore_flat_inventory_id_fk" FOREIGN KEY ("flat_inventory_id") REFERENCES "public"."bangalore_flat_inventory"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bangalore_flat_inventory_name_area_unique" ON "bangalore_flat_inventory" USING btree ("name_key","area_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bangalore_flat_inventory_active_area_idx" ON "bangalore_flat_inventory" USING btree ("active","area","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bug_reports_status_created_idx" ON "bug_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "final_flat_values_registered_transaction_unique" ON "final_flat_values" USING btree ("registered_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "final_flat_values_owner_input_unique" ON "final_flat_values" USING btree ("owner_input_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "final_flat_values_flat_source_date_idx" ON "final_flat_values" USING btree ("flat_inventory_id","source_type","value_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "owner_input_transactions_contribution_unique" ON "owner_input_transactions" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_input_transactions_flat_status_idx" ON "owner_input_transactions" USING btree ("flat_inventory_id","status");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "owner_properties" ADD CONSTRAINT "owner_properties_flat_inventory_id_bangalore_flat_inventory_id_fk" FOREIGN KEY ("flat_inventory_id") REFERENCES "public"."bangalore_flat_inventory"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "registered_transactions" ADD CONSTRAINT "registered_transactions_flat_inventory_id_bangalore_flat_inventory_id_fk" FOREIGN KEY ("flat_inventory_id") REFERENCES "public"."bangalore_flat_inventory"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_properties_flat_inventory_idx" ON "owner_properties" USING btree ("flat_inventory_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registered_transactions_flat_inventory_idx" ON "registered_transactions" USING btree ("flat_inventory_id");
