ALTER TABLE "upload_templates" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "upload_templates" AS t SET "sort_order" = o.rn FROM (SELECT "id", (row_number() OVER (ORDER BY "created_at" DESC))::integer - 1 AS rn FROM "upload_templates") AS o WHERE t."id" = o."id";
