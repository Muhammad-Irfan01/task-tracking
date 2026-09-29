ALTER TABLE "staff" ADD COLUMN "kind" text DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;