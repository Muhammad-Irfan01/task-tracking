import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Case-insensitive uniqueness ("Acme" and "acme" collide), matching how people read names. */
const uniqueLower = (table: string, column: AnyPgColumn) =>
  uniqueIndex(`${table}_${column.name}_lower_unique`).on(sql`lower(${column})`);

/**
 * Relational schema. Entities reference each other by id, so renames never need
 * cascading updates; the API layer translates ids back to display names.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array | string }>({
  dataType: () => "bytea",
  // Drivers return bytea as Buffer, Uint8Array or a "\x…" hex string depending on transport.
  fromDriver: (value) =>
    typeof value === "string" ? Buffer.from(value.replace(/^\\x/, ""), "hex") : Buffer.from(value),
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    status: text("status", { enum: ["Active", "Inactive"] }).notNull().default("Active"),
  },
  (t) => [uniqueLower("organizations", t.name)],
);

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull().default(""),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["Active", "Locked", "Inactive"] }).notNull().default("Active"),
    joined: createdAt(),
  },
  (t) => [index("customers_org_idx").on(t.organizationId)],
);

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    // Nullable to break the departments ↔ staff cycle while seeding.
    managerId: integer("manager_id").references((): AnyPgColumn => staff.id, { onDelete: "set null" }),
    isPublic: boolean("is_public").notNull().default(true),
  },
  (t) => [uniqueLower("departments", t.name)],
);

export const staff = pgTable(
  "staff",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("Agent"),
    isAdmin: boolean("is_admin").notNull().default(false),
    active: boolean("active").notNull().default(true),
    onVacation: boolean("on_vacation").notNull().default(false),
    avatarColor: text("avatar_color").notNull().default("bg-brand-500"),
    // scrypt hash + salt; null until an invited agent sets a password.
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    createdAt: createdAt(),
  },
  (t) => [index("staff_dept_idx").on(t.departmentId)],
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    notes: text("notes").notNull().default(""),
  },
  (t) => [uniqueLower("teams", t.name)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.staffId] })],
);

export const slaPlans = pgTable(
  "sla_plans",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    graceHours: integer("grace_hours").notNull(),
    notes: text("notes").notNull().default(""),
  },
  (t) => [uniqueLower("sla_plans", t.name)],
);

export const helpTopics = pgTable(
  "help_topics",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    slaPlanId: integer("sla_plan_id")
      .notNull()
      .references(() => slaPlans.id, { onDelete: "restrict" }),
  },
  (t) => [uniqueLower("help_topics", t.name)],
);

export const faqCategories = pgTable(
  "faq_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => [uniqueLower("faq_categories", t.name)],
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => faqCategories.id, { onDelete: "restrict" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    published: boolean("published").notNull().default(false),
    views: integer("views").notNull().default(0),
  },
  (t) => [uniqueLower("articles", t.question), index("articles_category_idx").on(t.categoryId)],
);

export const cannedResponses = pgTable(
  "canned_responses",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    enabled: boolean("enabled").notNull().default(true),
    body: text("body").notNull(),
  },
  (t) => [uniqueLower("canned_responses", t.title)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    subject: text("subject").notNull(),
    excerpt: text("excerpt").notNull(),
    status: text("status", { enum: ["Open", "In Progress", "On Hold", "Resolved", "Closed", "Overdue"] })
      .notNull()
      .default("Open"),
    priority: text("priority", { enum: ["Low", "Normal", "High", "Emergency"] }).notNull().default("Normal"),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    helpTopicId: integer("help_topic_id")
      .notNull()
      .references(() => helpTopics.id, { onDelete: "restrict" }),
    // Set null so removing an agent leaves their closed tickets "Unassigned".
    assigneeId: integer("assignee_id").references(() => staff.id, { onDelete: "set null" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    source: text("source", { enum: ["Web", "Email", "Phone", "API", "Other"] }).notNull().default("Web"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    dueAt: ts("due_at").notNull(),
    resolvedAt: ts("resolved_at"),
    firstResponseAt: ts("first_response_at"),
    rating: integer("rating"),
  },
  (t) => [
    index("tickets_updated_idx").on(t.updatedAt),
    index("tickets_assignee_idx").on(t.assigneeId),
    index("tickets_customer_idx").on(t.customerId),
    index("tickets_dept_idx").on(t.departmentId),
    index("tickets_topic_idx").on(t.helpTopicId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    isStaff: boolean("is_staff").notNull(),
    authorStaffId: integer("author_staff_id").references(() => staff.id, { onDelete: "set null" }),
    // Snapshot shown if the author record is later removed.
    authorName: text("author_name").notNull(),
    body: text("body").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    type: text("type").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("attachments_message_idx").on(t.messageId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type", { enum: ["assigned", "reply", "sla"] }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipientId, t.createdAt)],
);

/** Read receipts; SLA notifications are derived live, so ids aren't foreign keys. */
export const notificationReads = pgTable(
  "notification_reads",
  {
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    notificationId: text("notification_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.notificationId] })],
);

export const userPreferences = pgTable("user_preferences", {
  staffId: integer("staff_id")
    .primaryKey()
    .references(() => staff.id, { onDelete: "cascade" }),
  assigned: boolean("assigned").notNull().default(true),
  reply: boolean("reply").notNull().default(true),
  sla: boolean("sla").notNull().default(true),
  digest: boolean("digest").notNull().default(true),
});

export const resetTokens = pgTable("reset_tokens", {
  // SHA-256 of the emailed token; the raw token is never stored.
  tokenHash: text("token_hash").primaryKey(),
  staffId: integer("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["reset", "invite"] }).notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const orgSettings = pgTable("org_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  supportEmail: text("support_email").notNull(),
  timezone: text("timezone").notNull(),
  plan: text("plan").notNull().default("Business"),
});

/** Fixed-window counters; shared by every serverless instance. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: ts("reset_at").notNull(),
});
