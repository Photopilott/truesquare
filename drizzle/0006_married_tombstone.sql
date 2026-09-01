CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid,
	"event_name" text NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"source_screen" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"request_fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"source_screen" text NOT NULL,
	"message_variant" text NOT NULL,
	"request_fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_contributions" ADD COLUMN "referral_share_id" uuid;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_share_id_share_records_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."share_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_records" ADD CONSTRAINT "share_records_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_events_name_created_idx" ON "product_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "product_events_share_created_idx" ON "product_events" USING btree ("share_id","created_at");--> statement-breakpoint
CREATE INDEX "share_records_content_idx" ON "share_records" USING btree ("content_type","content_id","created_at");--> statement-breakpoint
CREATE INDEX "share_records_user_created_idx" ON "share_records" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
ALTER TABLE "purchase_contributions" ADD CONSTRAINT "purchase_contributions_referral_share_id_share_records_id_fk" FOREIGN KEY ("referral_share_id") REFERENCES "public"."share_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_contributions_referral_idx" ON "purchase_contributions" USING btree ("referral_share_id");
