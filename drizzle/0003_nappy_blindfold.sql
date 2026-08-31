CREATE TYPE "public"."transaction_import_batch_status" AS ENUM('staged', 'applied');--> statement-breakpoint
CREATE TYPE "public"."transaction_import_row_status" AS ENUM('ready', 'needs_review', 'rejected');--> statement-breakpoint
CREATE TABLE "registered_transaction_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"source_record_id" text,
	"location" text,
	"source_location" text,
	"society" text,
	"property_type" text,
	"unit_number" text,
	"floor" text,
	"tower" text,
	"bhk" text,
	"registration_date" date,
	"raw_date" text,
	"price" bigint,
	"effective_area" numeric(12, 2),
	"price_per_sq_ft" numeric(12, 2),
	"area_basis" text,
	"event_type" text,
	"sale_type" text,
	"qa_notes" text,
	"source_file" text,
	"source_url" text,
	"qa_status" "transaction_import_row_status" NOT NULL,
	"qa_reasons" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registered_transaction_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_file_name" text NOT NULL,
	"source_checksum" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"submitted_rows" integer NOT NULL,
	"ready_rows" integer NOT NULL,
	"review_rows" integer NOT NULL,
	"rejected_rows" integer NOT NULL,
	"status" "transaction_import_batch_status" DEFAULT 'staged' NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registered_transaction_import_rows" ADD CONSTRAINT "registered_transaction_import_rows_import_id_registered_transaction_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."registered_transaction_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registered_transaction_import_rows_ordinal_unique" ON "registered_transaction_import_rows" USING btree ("import_id","ordinal");--> statement-breakpoint
CREATE INDEX "registered_transaction_import_rows_status_idx" ON "registered_transaction_import_rows" USING btree ("import_id","qa_status");--> statement-breakpoint
CREATE INDEX "registered_transaction_import_rows_source_idx" ON "registered_transaction_import_rows" USING btree ("source_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registered_transaction_imports_checksum_unique" ON "registered_transaction_imports" USING btree ("source_checksum");--> statement-breakpoint
CREATE INDEX "registered_transaction_imports_created_idx" ON "registered_transaction_imports" USING btree ("created_at");