CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" integer NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canned_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"department_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"organization_id" integer NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"manager_id" integer,
	"is_public" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department_id" integer NOT NULL,
	"sla_plan_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"is_staff" boolean NOT NULL,
	"author_staff_id" integer,
	"author_name" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"staff_id" integer NOT NULL,
	"notification_id" text NOT NULL,
	CONSTRAINT "notification_reads_staff_id_notification_id_pk" PRIMARY KEY("staff_id","notification_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text NOT NULL,
	"recipient_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"support_email" text NOT NULL,
	"timezone" text NOT NULL,
	"plan" text DEFAULT 'Business' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reset_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"grace_hours" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"department_id" integer NOT NULL,
	"role" text DEFAULT 'Agent' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"on_vacation" boolean DEFAULT false NOT NULL,
	"avatar_color" text DEFAULT 'bg-brand-500' NOT NULL,
	"password_hash" text,
	"password_salt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"team_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	CONSTRAINT "team_members_team_id_staff_id_pk" PRIMARY KEY("team_id","staff_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lead_id" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"excerpt" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"department_id" integer NOT NULL,
	"help_topic_id" integer NOT NULL,
	"assignee_id" integer,
	"customer_id" integer NOT NULL,
	"source" text DEFAULT 'Web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"rating" integer
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"staff_id" integer PRIMARY KEY NOT NULL,
	"assigned" boolean DEFAULT true NOT NULL,
	"reply" boolean DEFAULT true NOT NULL,
	"sla" boolean DEFAULT true NOT NULL,
	"digest" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_faq_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."faq_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_staff_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_topics" ADD CONSTRAINT "help_topics_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_topics" ADD CONSTRAINT "help_topics_sla_plan_id_sla_plans_id_fk" FOREIGN KEY ("sla_plan_id") REFERENCES "public"."sla_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_staff_id_staff_id_fk" FOREIGN KEY ("author_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_staff_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_tokens" ADD CONSTRAINT "reset_tokens_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_lead_id_staff_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_help_topic_id_help_topics_id_fk" FOREIGN KEY ("help_topic_id") REFERENCES "public"."help_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_staff_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_question_lower_unique" ON "articles" USING btree (lower("question"));--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "attachments_message_idx" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canned_responses_title_lower_unique" ON "canned_responses" USING btree (lower("title"));--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_lower_unique" ON "departments" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "faq_categories_name_lower_unique" ON "faq_categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "help_topics_name_lower_unique" ON "help_topics" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "messages_ticket_idx" ON "messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_name_lower_unique" ON "organizations" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "sla_plans_name_lower_unique" ON "sla_plans" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "staff_dept_idx" ON "staff" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_name_lower_unique" ON "teams" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "tickets_updated_idx" ON "tickets" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "tickets_assignee_idx" ON "tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tickets_customer_idx" ON "tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "tickets_dept_idx" ON "tickets" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "tickets_topic_idx" ON "tickets" USING btree ("help_topic_id");