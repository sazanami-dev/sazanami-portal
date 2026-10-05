CREATE TABLE "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" varchar(255),
	"target_url" text NOT NULL,
	"created_by" uuid,
	"password_hash" text,
	"in_collection" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "short_links_namespace_slug_key" UNIQUE("namespace","slug")
);
--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;