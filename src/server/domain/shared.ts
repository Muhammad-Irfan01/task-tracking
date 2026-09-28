import { and, eq, getTableName, sql, type Column, type SQL } from "drizzle-orm";
import { db } from "../db";
import { customers, departments, faqCategories, helpTopics, organizations, slaPlans, staff, tickets } from "../db/schema";

/**
 * Fully qualified `"table"."column"`. Drizzle leaves columns unqualified in
 * single-table queries, which silently rebinds outer references inside
 * correlated subqueries to the inner table — always use this there.
 */
export const q = (column: Column) => sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;

/** ISO string for API responses (drivers return Date objects). */
export const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);
export const isoRequired = (value: Date | string) => new Date(value).toISOString();

export const ticketIsOpen = sql`${tickets.status} not in ('Resolved', 'Closed')`;
export const ticketIsOverdue = sql<boolean>`(${ticketIsOpen} and (${tickets.status} = 'Overdue' or ${tickets.dueAt} < now()))`;

/** `(select count(*) from tickets where …)` as an integer column. */
export const countTickets = (where: SQL) => sql<number>`(select count(*)::int from ${tickets} where ${where})`;
/** Open-ticket check for use inside subqueries over `tickets`. */
export const ticketIsOpenQ = sql`${q(tickets.status)} not in ('Resolved', 'Closed')`;

export async function count(query: Promise<{ n: number }[]>) {
  const [row] = await query;
  return Number(row?.n ?? 0);
}

export const countSql = sql<number>`count(*)::int`;

// ------------------------------------------------------------ name → id lookups
// The API speaks in display names (e.g. assignee "Priya Nair"); these resolve them.

export async function departmentIdByName(name: string) {
  const [row] = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, name)).limit(1);
  return row?.id;
}

export async function organizationIdByName(name: string) {
  const [row] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, name)).limit(1);
  return row?.id;
}

export async function slaPlanIdByName(name: string) {
  const [row] = await db.select({ id: slaPlans.id }).from(slaPlans).where(eq(slaPlans.name, name)).limit(1);
  return row?.id;
}

export async function categoryIdByName(name: string) {
  const [row] = await db.select({ id: faqCategories.id }).from(faqCategories).where(eq(faqCategories.name, name)).limit(1);
  return row?.id;
}

export async function helpTopicByName(name: string) {
  const [row] = await db
    .select({ id: helpTopics.id, departmentId: helpTopics.departmentId, graceHours: slaPlans.graceHours })
    .from(helpTopics)
    .innerJoin(slaPlans, eq(slaPlans.id, helpTopics.slaPlanId))
    .where(eq(helpTopics.name, name))
    .limit(1);
  return row;
}

/**
 * Agent names aren't unique, so an ambiguous name resolves to undefined and
 * surfaces as a field error rather than silently picking the wrong person.
 */
export async function agentIdByName(name: string, { activeOnly = false } = {}) {
  const rows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(activeOnly ? and(eq(staff.name, name), eq(staff.active, true)) : eq(staff.name, name))
    .limit(2);
  return rows.length === 1 ? rows[0].id : undefined;
}

export async function customerByEmail(email: string) {
  const [row] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  return row;
}
