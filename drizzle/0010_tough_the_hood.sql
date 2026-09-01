ALTER TABLE "atlas_projects" ADD COLUMN "named_developer" text;--> statement-breakpoint
UPDATE "atlas_projects"
SET "named_developer" = regexp_replace(trim("builder"), '\\s+', ' ', 'g');--> statement-breakpoint
ALTER TABLE "atlas_projects" ALTER COLUMN "named_developer" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "atlas_projects_named_developer_idx" ON "atlas_projects" USING btree ("named_developer");
