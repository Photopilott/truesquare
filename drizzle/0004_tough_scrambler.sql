CREATE TABLE "valuation_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"algorithm_version" text NOT NULL,
	"match_tier" text NOT NULL,
	"match_label" text NOT NULL,
	"confidence" text NOT NULL,
	"supporting_transaction_ids" jsonb NOT NULL,
	"supporting_transaction_count" integer NOT NULL,
	"estimate" bigint,
	"low" bigint,
	"high" bigint,
	"acquisition_cost" bigint NOT NULL,
	"absolute_appreciation" bigint,
	"return_after_costs" bigint,
	"annualized_return" numeric(18, 12),
	"loan_interest" bigint NOT NULL,
	"owner_evidence_count" integer NOT NULL,
	"owner_evidence_min_price_per_sq_ft" numeric(12, 2),
	"owner_evidence_median_price_per_sq_ft" numeric(12, 2),
	"owner_evidence_max_price_per_sq_ft" numeric(12, 2),
	"input_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "valuation_snapshots" ADD CONSTRAINT "valuation_snapshots_contribution_id_purchase_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."purchase_contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "valuation_snapshots_contribution_unique" ON "valuation_snapshots" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "valuation_snapshots_created_idx" ON "valuation_snapshots" USING btree ("created_at");