ALTER TABLE "tenants" ADD COLUMN "logo" "bytea";--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_type" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_updated_at" timestamp with time zone;