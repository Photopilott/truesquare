CREATE TYPE "public"."notification_delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"event_type" text NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_contribution_id_purchase_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."purchase_contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_contribution_unique" ON "notification_deliveries" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_created_idx" ON "notification_deliveries" USING btree ("status","created_at");
