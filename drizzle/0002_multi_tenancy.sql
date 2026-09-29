CREATE TABLE "super_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"support_email" text NOT NULL,
	"timezone" text DEFAULT 'UTC (UTC+00:00)' NOT NULL,
	"plan" text DEFAULT 'Business' NOT NULL,
	"max_agents" integer,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- Existing single-desk data becomes tenant 1, named after its workspace settings.
INSERT INTO "tenants" ("id", "name", "support_email", "timezone", "plan")
SELECT 1,
  COALESCE((SELECT "name" FROM "org_settings" WHERE "id" = 1), 'Support Desk'),
  COALESCE((SELECT "support_email" FROM "org_settings" WHERE "id" = 1), 'support@example.com'),
  COALESCE((SELECT "timezone" FROM "org_settings" WHERE "id" = 1), 'UTC (UTC+00:00)'),
  COALESCE((SELECT "plan" FROM "org_settings" WHERE "id" = 1), 'Business')
WHERE EXISTS (SELECT 1 FROM "org_settings") OR EXISTS (SELECT 1 FROM "articles") OR EXISTS (SELECT 1 FROM "canned_responses") OR EXISTS (SELECT 1 FROM "customers") OR EXISTS (SELECT 1 FROM "departments") OR EXISTS (SELECT 1 FROM "faq_categories") OR EXISTS (SELECT 1 FROM "help_topics") OR EXISTS (SELECT 1 FROM "organizations") OR EXISTS (SELECT 1 FROM "sla_plans") OR EXISTS (SELECT 1 FROM "staff") OR EXISTS (SELECT 1 FROM "teams") OR EXISTS (SELECT 1 FROM "tickets");--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"tenants"', 'id'), GREATEST((SELECT MAX("id") FROM "tenants"), 1), (SELECT COUNT(*) > 0 FROM "tenants"));
--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_email_unique";--> statement-breakpoint
DROP INDEX "tickets_updated_idx";--> statement-breakpoint
DROP INDEX "articles_question_lower_unique";--> statement-breakpoint
DROP INDEX "canned_responses_title_lower_unique";--> statement-breakpoint
DROP INDEX "departments_name_lower_unique";--> statement-breakpoint
DROP INDEX "faq_categories_name_lower_unique";--> statement-breakpoint
DROP INDEX "help_topics_name_lower_unique";--> statement-breakpoint
DROP INDEX "organizations_name_lower_unique";--> statement-breakpoint
DROP INDEX "sla_plans_name_lower_unique";--> statement-breakpoint
DROP INDEX "teams_name_lower_unique";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "canned_responses" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "canned_responses" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "faq_categories" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "faq_categories" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "help_topics" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "help_topics" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sla_plans" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "sla_plans" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "tenant_id" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_name_lower_unique" ON "tenants" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_categories" ADD CONSTRAINT "faq_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_topics" ADD CONSTRAINT "help_topics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_plans" ADD CONSTRAINT "sla_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "staff_tenant_idx" ON "staff" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tickets_tenant_updated_idx" ON "tickets" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_question_lower_unique" ON "articles" USING btree ("tenant_id",lower("question"));--> statement-breakpoint
CREATE UNIQUE INDEX "canned_responses_title_lower_unique" ON "canned_responses" USING btree ("tenant_id",lower("title"));--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_lower_unique" ON "departments" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "faq_categories_name_lower_unique" ON "faq_categories" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "help_topics_name_lower_unique" ON "help_topics" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_name_lower_unique" ON "organizations" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "sla_plans_name_lower_unique" ON "sla_plans" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "teams_name_lower_unique" ON "teams" USING btree ("tenant_id",lower("name"));