CREATE TYPE "public"."society_price_subscription_status" AS ENUM('active', 'unsubscribed');--> statement-breakpoint
ALTER TYPE "public"."consent_context" ADD VALUE 'subscription';--> statement-breakpoint
CREATE TABLE "society_price_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"society_slug" text NOT NULL,
	"society_name" text NOT NULL,
	"status" "society_price_subscription_status" DEFAULT 'active' NOT NULL,
	"source_screen" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "society_subscription_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"society_slug" text NOT NULL,
	"society_name" text NOT NULL,
	"event_type" text NOT NULL,
	"event_key" text NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "society_price_subscriptions" ADD CONSTRAINT "society_price_subscriptions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "society_subscription_deliveries" ADD CONSTRAINT "society_subscription_deliveries_subscription_id_society_price_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."society_price_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "society_price_subscriptions_user_society_unique" ON "society_price_subscriptions" USING btree ("user_id","society_slug");--> statement-breakpoint
CREATE INDEX "society_price_subscriptions_society_status_idx" ON "society_price_subscriptions" USING btree ("society_slug","status");--> statement-breakpoint
CREATE UNIQUE INDEX "society_subscription_deliveries_event_unique" ON "society_subscription_deliveries" USING btree ("subscription_id","event_key");--> statement-breakpoint
CREATE INDEX "society_subscription_deliveries_status_created_idx" ON "society_subscription_deliveries" USING btree ("status","created_at");