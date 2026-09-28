ALTER TABLE "attachments" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "blob_pathname" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_storage_check" CHECK ("attachments"."data" is not null or "attachments"."blob_pathname" is not null);