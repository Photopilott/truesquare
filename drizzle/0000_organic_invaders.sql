CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_price_aggregates" (
	"society" text NOT NULL,
	"location" text NOT NULL,
	"bhk" text NOT NULL,
	"approved_count" integer NOT NULL,
	"min_price_per_sq_ft" numeric(12, 2) NOT NULL,
	"median_price_per_sq_ft" numeric(12, 2) NOT NULL,
	"max_price_per_sq_ft" numeric(12, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_price_aggregates_society_bhk_pk" PRIMARY KEY("society","bhk")
);
--> statement-breakpoint
CREATE TABLE "owner_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"society" text NOT NULL,
	"location" text NOT NULL,
	"tower" text NOT NULL,
	"floor" text NOT NULL,
	"bhk" text NOT NULL,
	"area_sq_ft" numeric(12, 2) NOT NULL,
	"area_type" text NOT NULL,
	"car_parks" integer NOT NULL,
	"purchase_date" date NOT NULL,
	"facing" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"purchase_price" bigint NOT NULL,
	"stamp_duty" bigint NOT NULL,
	"registration_cost" bigint NOT NULL,
	"interiors" bigint NOT NULL,
	"brokerage" bigint NOT NULL,
	"loan_amount" bigint,
	"loan_tenure_years" integer,
	"loan_rate" numeric(6, 3),
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_notes" text
);
--> statement-breakpoint
CREATE TABLE "registered_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"location" text NOT NULL,
	"society" text NOT NULL,
	"tower" text,
	"bhk" text,
	"registration_date" date,
	"raw_date" text NOT NULL,
	"price" bigint,
	"effective_area" numeric(12, 2),
	"price_per_sq_ft" numeric(12, 2),
	"area_basis" text,
	"sale_type" text,
	"qa_notes" text,
	"source_file" text NOT NULL,
	"source_url" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_properties" ADD CONSTRAINT "owner_properties_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_contributions" ADD CONSTRAINT "purchase_contributions_property_id_owner_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."owner_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contributors_email_unique" ON "contributors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "owner_properties_contributor_idx" ON "owner_properties" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "owner_properties_society_bhk_idx" ON "owner_properties" USING btree ("society","bhk");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_contributions_request_unique" ON "purchase_contributions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "purchase_contributions_status_idx" ON "purchase_contributions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "registered_transactions_society_bhk_idx" ON "registered_transactions" USING btree ("society","bhk");--> statement-breakpoint
CREATE INDEX "registered_transactions_location_bhk_idx" ON "registered_transactions" USING btree ("location","bhk");