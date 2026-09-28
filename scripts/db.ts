/**
 * Database CLI — works against Neon (DATABASE_URL set) or local PGlite.
 *
 *   tsx scripts/db.ts migrate   apply pending migrations from ./drizzle
 *   tsx scripts/db.ts seed      load demo data (skipped if data exists; --force to wipe first)
 *   tsx scripts/db.ts setup     migrate, then seed only if the database is empty (used by dev/build)
 *   tsx scripts/db.ts reset     drop everything, migrate, seed fresh demo data
 */
import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { connect, type Database } from "../src/server/db/client";
import * as t from "../src/server/db/schema";
import { cannedResponses, faqArticles, faqCategories } from "../src/server/db/seed/content";
import { departments, helpTopics, organizations, slaPlans, staff, teams } from "../src/server/db/seed/directory";
import { buildCustomers, buildTickets } from "../src/server/db/seed/people";
import { DEMO_PASSWORD, DEMO_SALT, hashPassword } from "../src/server/passwords";

// Read .env / .env.local exactly like `next dev` / `next build`, so scripts and
// the app always target the same database.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const MIGRATIONS = "./drizzle";
const { db, driver, close } = connect();
const log = (message: string) => console.log(`[db:${driver}] ${message}`);

async function migrate() {
  if (driver === "neon") await migrateNeon(db as unknown as NeonHttpDatabase, { migrationsFolder: MIGRATIONS });
  else await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder: MIGRATIONS });
  log("migrations applied");
}

async function isEmpty() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(t.staff);
  return Number(row.n) === 0;
}

/** Inserts in chunks to stay under driver parameter limits. */
async function insertAll<T>(insert: (rows: T[]) => Promise<unknown>, rows: T[], size = 250) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

const TABLES_BY_DEPENDENCY = [
  "rate_limits", "reset_tokens", "notification_reads", "notifications", "user_preferences", "attachments",
  "messages", "tickets", "canned_responses", "articles", "faq_categories", "help_topics", "sla_plans",
  "team_members", "teams", "customers", "organizations", "staff", "departments", "org_settings",
];

async function wipe() {
  await db.execute(sql.raw(`TRUNCATE ${TABLES_BY_DEPENDENCY.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

async function seed(database: Database) {
  const orgs = organizations();
  const depts = departments();
  const agents = staff();
  const plans = slaPlans();
  const topics = helpTopics();
  const categories = faqCategories();
  const customers = buildCustomers(orgs);
  const { tickets, threads } = buildTickets({ customers, staff: agents, helpTopics: topics, slaPlans: plans });

  const id = <T extends { id: number; name: string }>(rows: T[], name: string) => {
    const match = rows.find((row) => row.name === name);
    if (!match) throw new Error(`Seed reference not found: ${name}`);
    return match.id;
  };
  const credential = hashPassword(DEMO_PASSWORD, DEMO_SALT);

  await database.insert(t.organizations).values(orgs);
  // Departments first without managers (staff reference departments), then backfill.
  await database.insert(t.departments).values(depts.map((d) => ({ id: d.id, name: d.name, isPublic: d.isPublic })));
  await database.insert(t.staff).values(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      departmentId: id(depts, a.dept),
      role: a.role,
      isAdmin: a.isAdmin,
      active: a.active,
      onVacation: a.onVacation,
      avatarColor: a.avatarColor,
      passwordHash: credential.hash,
      passwordSalt: credential.salt,
    })),
  );
  for (const d of depts) {
    await database.update(t.departments).set({ managerId: id(agents, d.manager) }).where(sql`${t.departments.id} = ${d.id}`);
  }

  await database.insert(t.teams).values(teams().map((team) => ({ id: team.id, name: team.name, leadId: id(agents, team.lead), notes: team.notes })));
  await database.insert(t.teamMembers).values(teams().flatMap((team) => team.memberIds.map((staffId) => ({ teamId: team.id, staffId }))));
  await database.insert(t.slaPlans).values(plans);
  await database.insert(t.helpTopics).values(
    topics.map((topic) => ({ id: topic.id, name: topic.name, departmentId: id(depts, topic.dept), slaPlanId: id(plans, topic.sla) })),
  );
  await database.insert(t.faqCategories).values(categories);
  await database.insert(t.articles).values(faqArticles().map(({ category, ...a }) => ({ ...a, categoryId: id(categories, category) })));
  await database.insert(t.cannedResponses).values(cannedResponses().map(({ dept, ...c }) => ({ ...c, departmentId: id(depts, dept) })));
  await database.insert(t.customers).values(
    customers.map((c) => ({ ...c, organizationId: id(orgs, c.organization), joined: new Date(c.joined) })),
  );

  const date = (value: string | null) => (value ? new Date(value) : null);
  await insertAll(
    (rows) => database.insert(t.tickets).values(rows),
    tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      excerpt: ticket.excerpt,
      status: ticket.status,
      priority: ticket.priority,
      departmentId: id(depts, ticket.department),
      helpTopicId: id(topics, ticket.topic),
      assigneeId: id(agents, ticket.assignee),
      customerId: customers.find((c) => c.email === ticket.customerEmail)!.id,
      source: ticket.source,
      createdAt: new Date(ticket.created),
      updatedAt: new Date(ticket.updated),
      dueAt: new Date(ticket.dueAt),
      resolvedAt: date(ticket.resolvedAt),
      firstResponseAt: date(ticket.firstResponseAt),
      rating: ticket.rating,
    })),
  );
  await insertAll(
    (rows) => database.insert(t.messages).values(rows),
    tickets.flatMap((ticket) =>
      (threads.get(ticket.id) ?? []).map((m) => ({
        ticketId: ticket.id,
        isStaff: m.isStaff,
        authorStaffId: m.isStaff ? id(agents, m.author) : null,
        authorName: m.author,
        body: m.body,
        createdAt: new Date(m.created),
      })),
    ),
  );
  await insertAll(
    (rows) => database.insert(t.notifications).values(rows),
    [...tickets]
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 40)
      .map((ticket) => ({
        type: "assigned" as const,
        title: `RD${String(ticket.id).padStart(6, "0")} assigned to you`,
        body: ticket.subject,
        href: `/tickets/${ticket.id}`,
        recipientId: id(agents, ticket.assignee),
        createdAt: new Date(ticket.created),
      })),
  );
  await database.insert(t.orgSettings).values({
    id: 1,
    name: "Threadline Support Desk",
    supportEmail: "support@threadline.io",
    timezone: "Asia/Karachi (UTC+05:00)",
    plan: "Business",
  });

  // Explicit ids were inserted, so move each sequence past them.
  for (const table of ["organizations", "departments", "staff", "teams", "sla_plans", "help_topics", "faq_categories", "articles", "canned_responses", "customers", "tickets"]) {
    await database.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`));
  }
  log(`seeded ${agents.length} agents, ${customers.length} customers, ${tickets.length} tickets`);
}

async function main() {
  const command = process.argv[2];
  const force = process.argv.includes("--force");
  switch (command) {
    case "migrate":
      await migrate();
      break;
    case "seed":
      if (force) await wipe();
      else if (!(await isEmpty())) return log("database already has data — skipping seed (use --force to replace it)");
      await seed(db);
      break;
    case "setup":
      await migrate();
      if (process.env.SKIP_SEED === "1") return log("SKIP_SEED=1 — not seeding");
      if (await isEmpty()) await seed(db);
      else log("database already has data — skipping seed");
      break;
    case "reset":
      // One statement per call: prepared statements (PGlite, Neon HTTP) reject multi-statement strings.
      for (const statement of ["DROP SCHEMA IF EXISTS drizzle CASCADE", "DROP SCHEMA public CASCADE", "CREATE SCHEMA public"]) {
        await db.execute(sql.raw(statement));
      }
      await migrate();
      await seed(db);
      break;
    default:
      console.error("Usage: tsx scripts/db.ts <migrate|seed|setup|reset> [--force]");
      process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => close());
