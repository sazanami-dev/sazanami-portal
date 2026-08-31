CREATE TYPE "public"."announcement_category" AS ENUM('info', 'internal_event', 'external_event', 'system');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."discord_notification_status" AS ENUM('not_sent', 'pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"category" "announcement_category" DEFAULT 'info' NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discord_channel_id" varchar(64),
	"discord_mention_everyone" boolean DEFAULT false NOT NULL,
	"discord_message_id" varchar(64),
	"discord_notification_status" "discord_notification_status" DEFAULT 'not_sent' NOT NULL,
	"discord_notified_at" timestamp with time zone,
	"discord_notification_error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discord_message_consistency" CHECK ("announcements"."discord_message_id" IS NULL OR "announcements"."discord_channel_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_publish_list_idx" ON "announcements" USING btree ("is_pinned","publish_at");--> statement-breakpoint
CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status");