ALTER TABLE "messages" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "rating_comment" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_updates" boolean DEFAULT true NOT NULL;