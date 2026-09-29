/**
 * Database CLI — works against Neon (DATABASE_URL set) or local PGlite.
 *
 *   tsx scripts/db.ts migrate   apply pending migrations from ./drizzle
 *   tsx scripts/db.ts seed      load demo data (skipped if data exists; --force to wipe first)
 *   tsx scripts/db.ts setup     migrate, then seed only if the database is empty (used by dev/build)
 *   tsx scripts/db.ts reset     drop everything, migrate, seed fresh demo data
 *   tsx scripts/db.ts clean     delete ALL data (every organization), keep only the super admin from
 *                               SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD (if unset here, the next build's `setup` creates it)
 *
 * Every `setup` also creates or updates the platform super admin from SUPER_ADMIN_*.
 */
import { loadEnvConfig } from "@next/env";
import { eq, sql } from "drizzle-orm";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { connect, type Database } from "../src/server/db/client";
import { claimDefaultDepartment, defaultDepartment, provisionTenant } from "../src/server/db/provision";
import * as t from "../src/server/db/schema";
import { cannedResponses, faqArticles, faqCategories } from "../src/server/db/seed/content";
import { departments, helpTopics, organizations, slaPlans, staff, teams } from "../src/server/db/seed/directory";
import { buildCustomers, buildTickets } from "../src/server/db/seed/people";
import { DEMO_PASSWORD, DEMO_SALT, hashPassword, verifyPassword } from "../src/server/passwords";
import { newPassword } from "../src/lib/schemas";

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
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(t.tenants);
  return Number(row.n) === 0;
}

/** Inserts in chunks to stay under driver parameter limits. */
async function insertAll<T>(insert: (rows: T[]) => Promise<unknown>, rows: T[], size = 250) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

const TABLES_BY_DEPENDENCY = [
  "rate_limits", "reset_tokens", "notification_reads", "notifications", "user_preferences", "attachments",
  "messages", "tickets", "canned_responses", "articles", "faq_categories", "help_topics", "sla_plans",
  "team_members", "teams", "customers", "organizations", "staff", "departments", "tenants", "super_admins",
];

async function wipe() {
  await db.execute(sql.raw(`TRUNCATE ${TABLES_BY_DEPENDENCY.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

/** Platform super admin from SUPER_ADMIN_NAME / SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD. */
function superAdminFromEnv() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const raw = process.env.SUPER_ADMIN_PASSWORD;
  // A space or line break pasted into the dashboard would otherwise become part of
  // the password, and nobody could ever type it on the login form.
  const password = raw?.trim();
  if (raw && raw !== password) console.warn("[db] WARNING: SUPER_ADMIN_PASSWORD had leading/trailing spaces or line breaks — they were ignored");
  if (!email || !password) return null;
  const policy = newPassword.safeParse(password);
  if (!policy.success) throw new Error(`SUPER_ADMIN_PASSWORD: ${policy.error.issues[0].message}`);
  return { name: process.env.SUPER_ADMIN_NAME?.trim() || "Platform Owner", email, password };
}

/**
 * Creates the super admin, or updates their name and password when the
 * environment changed (so rotating SUPER_ADMIN_PASSWORD + redeploying works).
 */
async function ensureSuperAdmin(database: Database, fallback?: { name: string; email: string; password: string }) {
  const admin = superAdminFromEnv() ?? fallback;
  if (!admin) {
    log("no SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD set — no super admin created");
    return;
  }
  const [agent] = await database.select({ id: t.staff.id }).from(t.staff).where(eq(t.staff.email, admin.email)).limit(1);
  if (agent) {
    // Warn instead of failing the build: the migrations already ran, so the new code must still deploy.
    console.warn(`[db] WARNING: SUPER_ADMIN_EMAIL ${admin.email} already belongs to an agent — super admin NOT created. Set a different SUPER_ADMIN_EMAIL and redeploy.`);
    return;
  }

  const [existing] = await database.select().from(t.superAdmins).where(eq(t.superAdmins.email, admin.email)).limit(1);
  if (!existing) {
    const credential = hashPassword(admin.password);
    await database.insert(t.superAdmins).values({ name: admin.name, email: admin.email, passwordHash: credential.hash, passwordSalt: credential.salt });
    return log(`created super admin ${admin.email}`);
  }
  const samePassword = verifyPassword(admin.password, { salt: existing.passwordSalt, hash: existing.passwordHash });
  const credential = samePassword ? { hash: existing.passwordHash, salt: existing.passwordSalt } : hashPassword(admin.password);
  await database
    .update(t.superAdmins)
    .set({ name: admin.name, passwordHash: credential.hash, passwordSalt: credential.salt })
    .where(eq(t.superAdmins.id, existing.id));
  log(samePassword ? `super admin ${admin.email} is up to date` : `updated the password of super admin ${admin.email}`);
}

/** Local/preview demo: a platform owner anyone can sign in as. */
const DEMO_SUPER_ADMIN = { name: "Platform Owner", email: "owner@threadline.io", password: DEMO_PASSWORD };
const DEMO_TENANT_ID = 1;

/** Vercel production starts clean unless SEED_DEMO=1; everywhere else gets demo data. */
const wantsDemoData = () => process.env.SEED_DEMO === "1" || process.env.VERCEL_ENV !== "production";

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
  const tenantId = DEMO_TENANT_ID;

  await database.insert(t.tenants).values({
    id: tenantId,
    name: "Threadline Support Desk",
    supportEmail: "support@threadline.io",
    emailDomain: "threadline.io",
    timezone: "Asia/Karachi (UTC+05:00)",
    plan: "Medium",
  });
  await database.insert(t.organizations).values(orgs.map((o) => ({ ...o, tenantId })));
  // Departments first without managers (staff reference departments), then backfill.
  await database.insert(t.departments).values(depts.map((d) => ({ id: d.id, tenantId, name: d.name, isPublic: d.isPublic })));
  await database.insert(t.staff).values(
    agents.map((a) => ({
      id: a.id,
      tenantId,
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

  await database.insert(t.teams).values(teams().map((team) => ({ id: team.id, tenantId, name: team.name, leadId: id(agents, team.lead), notes: team.notes })));
  await database.insert(t.teamMembers).values(teams().flatMap((team) => team.memberIds.map((staffId) => ({ teamId: team.id, staffId }))));
  await database.insert(t.slaPlans).values(plans.map((plan) => ({ ...plan, tenantId })));
  await database.insert(t.helpTopics).values(
    topics.map((topic) => ({ id: topic.id, tenantId, name: topic.name, departmentId: id(depts, topic.dept), slaPlanId: id(plans, topic.sla) })),
  );
  await database.insert(t.faqCategories).values(categories.map((c) => ({ ...c, tenantId })));
  await database.insert(t.articles).values(faqArticles().map(({ category, ...a }) => ({ ...a, tenantId, categoryId: id(categories, category) })));
  await database.insert(t.cannedResponses).values(cannedResponses().map(({ dept, ...c }) => ({ ...c, tenantId, departmentId: id(depts, dept) })));
  await database.insert(t.customers).values(
    customers.map((c) => ({ ...c, tenantId, organizationId: id(orgs, c.organization), joined: new Date(c.joined) })),
  );

  const date = (value: string | null) => (value ? new Date(value) : null);
  await insertAll(
    (rows) => database.insert(t.tickets).values(rows),
    tickets.map((ticket) => ({
      id: ticket.id,
      tenantId,
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
  // Explicit ids were inserted, so move each sequence past them.
  for (const table of ["tenants", "organizations", "departments", "staff", "teams", "sla_plans", "help_topics", "faq_categories", "articles", "canned_responses", "customers", "tickets"]) {
    await database.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`));
  }
  log(`seeded ${agents.length} agents, ${customers.length} customers, ${tickets.length} tickets`);

  await seedSecondTenant(database, credential);
}

/** A small second organization, so you can check that tenants never see each other's data. */
async function seedSecondTenant(database: Database, credential: { hash: string; salt: string }) {
  const tenantId = await provisionTenant(database, {
    name: "Northwind Traders",
    supportEmail: "help@northwind.test",
    emailDomain: "northwind.test",
    timezone: "UTC (UTC+00:00)",
    plan: "Small",
  });
  const dept = (await defaultDepartment(database, tenantId))!;
  const [admin] = await database
    .insert(t.staff)
    .values({
      tenantId,
      name: "Nadia Brooks",
      email: "nadia@northwind.test",
      departmentId: dept.id,
      role: "Department Manager",
      isAdmin: true,
      avatarColor: "bg-emerald-500",
      passwordHash: credential.hash,
      passwordSalt: credential.salt,
    })
    .returning({ id: t.staff.id });
  await claimDefaultDepartment(database, tenantId, admin.id);
  log("seeded second organization Northwind Traders (nadia@northwind.test)");
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
      await ensureSuperAdmin(db, DEMO_SUPER_ADMIN);
      break;
    case "setup": {
      await migrate();
      const demo = wantsDemoData();
      if (process.env.SKIP_SEED === "1") log("SKIP_SEED=1 — not seeding");
      else if (!(await isEmpty())) log("database already has data — skipping seed");
      else if (demo) await seed(db);
      else log("empty production database — sign in as the super admin and create your first organization");
      await ensureSuperAdmin(db, demo ? DEMO_SUPER_ADMIN : undefined);
      break;
    }
    case "reset":
      // One statement per call: prepared statements (PGlite, Neon HTTP) reject multi-statement strings.
      for (const statement of ["DROP SCHEMA IF EXISTS drizzle CASCADE", "DROP SCHEMA public CASCADE", "CREATE SCHEMA public"]) {
        await db.execute(sql.raw(statement));
      }
      await migrate();
      await seed(db);
      await ensureSuperAdmin(db, DEMO_SUPER_ADMIN);
      break;
    case "clean":
      if (!force) throw new Error("This deletes every organization with all its tickets, customers and agents. Re-run with --force to confirm.");
      await migrate();
      await wipe();
      await ensureSuperAdmin(db);
      // Without SUPER_ADMIN_* here (e.g. they're Vercel secrets), the next build's `setup` creates the super admin.
      log(superAdminFromEnv() ? "database cleaned — sign in with SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD" : "database cleaned — redeploy on Vercel to create the super admin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD");
      break;
    default:
      console.error("Usage: tsx scripts/db.ts <migrate|seed|setup|reset|clean> [--force]");
      process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => close());
