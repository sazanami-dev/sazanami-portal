CREATE TABLE "upload_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"user_id" uuid,
	"file_name" varchar(512) NOT NULL,
	"original_name" varchar(512),
	"drive_file_id" varchar(255),
	"web_view_link" text,
	"folder_id" varchar(255),
	"folder_path" text,
	"mime_type" varchar(255),
	"size_bytes" bigint,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "upload_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"base_folder_id" varchar(255) NOT NULL,
	"segments" jsonb NOT NULL,
	"filename_format" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_template_id_upload_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."upload_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_templates" ADD CONSTRAINT "upload_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;