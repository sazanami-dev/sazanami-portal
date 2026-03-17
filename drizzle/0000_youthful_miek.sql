CREATE TYPE "public"."agreement_type" AS ENUM('terms_of_service', 'tech_train');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('discord', 'github');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'developer', 'manager', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'renewing');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" varchar(255) NOT NULL,
	"target_table" varchar(255) NOT NULL,
	"target_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"version" integer NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_agreements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"agreement_type" "agreement_type" NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"is_server_joined" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"bio" text,
	"avatar_url" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"email" text NOT NULL,
	"student_id" varchar(255),
	"class_name" varchar(255),
	"attendance_number" integer,
	"name" varchar(255) NOT NULL,
	"name_kana" varchar(255) NOT NULL,
	"expected_graduation_year" integer,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agreements" ADD CONSTRAINT "user_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_id_auth_users_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade;