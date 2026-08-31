CREATE TABLE `amenities` (
	`project_id` integer PRIMARY KEY NOT NULL,
	`schools_within_2km` integer,
	`hospitals_within_2km` integer,
	`malls_within_2km` integer,
	`nearest_metro_name` text,
	`nearest_metro_distance_km` real,
	`source` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `builders` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`projects_count` integer DEFAULT 0 NOT NULL,
	`completed_evidence_count` integer DEFAULT 0 NOT NULL,
	`on_time_rate` real,
	`overdue_without_evidence_count` integer DEFAULT 0 NOT NULL,
	`complaint_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`type` text,
	`count` integer,
	`carpet_area_sqm` real
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_project` ON `inventory` (`project_id`);--> statement-breakpoint
CREATE TABLE `micromarkets` (
	`name` text PRIMARY KEY NOT NULL,
	`center_lat` real,
	`center_lon` real,
	`project_count` integer DEFAULT 0 NOT NULL,
	`inventory_units` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY NOT NULL,
	`registration_number` text,
	`name` text NOT NULL,
	`builder_key` text NOT NULL,
	`builder_name` text NOT NULL,
	`micromarket` text NOT NULL,
	`micromarket_confidence` real DEFAULT 0 NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`declared_units` integer DEFAULT 0 NOT NULL,
	`complaint_count` integer DEFAULT 0 NOT NULL,
	`final_target_date` text,
	`actual_completion_date` text,
	`delivery_status` text NOT NULL,
	`airport_distance_km` real,
	`nearby_project_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_micromarket` ON `projects` (`micromarket`);--> statement-breakpoint
CREATE INDEX `idx_projects_builder` ON `projects` (`builder_key`);--> statement-breakpoint
CREATE INDEX `idx_projects_delivery` ON `projects` (`delivery_status`);