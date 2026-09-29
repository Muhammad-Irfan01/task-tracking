ALTER TABLE "tenants" ADD COLUMN "email_domain" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_email_domain_lower_unique" ON "tenants" USING btree (lower("email_domain"));