import { and, asc, eq, sql } from "drizzle-orm";
import type { PlanId } from "@/lib/constants";
import type { Database } from "./client";
import { DEFAULT_DEPARTMENTS } from "./defaults";
import * as t from "./schema";

export const INDEPENDENT_ORG = "Independent Customers";

export interface TenantInput {
  name: string;
  supportEmail: string;
  emailDomain: string | null;
  timezone: string;
  plan: PlanId;
}

/**
 * Creates a client organization with the minimum a working desk needs: the
 * catch-all customer organization, a department, an SLA plan and a help topic,
 * plus the default IT, Admin and HR departments with their ticket categories.
 * Takes the database explicitly so the CLI (scripts/db.ts) can use it too.
 */
export async function provisionTenant(database: Database, input: TenantInput) {
  const [tenant] = await database.insert(t.tenants).values(input).returning({ id: t.tenants.id });
  const tenantId = tenant.id;
  await database.insert(t.organizations).values({ tenantId, name: INDEPENDENT_ORG, domain: "—" });
  const [dept] = await database
    .insert(t.departments)
    .values({ tenantId, name: "General Support", isPublic: true })
    .returning({ id: t.departments.id });
  const [plan] = await database
    .insert(t.slaPlans)
    .values({ tenantId, name: "Standard SLA", graceHours: 48, notes: "Default response window." })
    .returning({ id: t.slaPlans.id });
  await database.insert(t.helpTopics).values({ tenantId, name: "General Enquiry", departmentId: dept.id, slaPlanId: plan.id });
  await addDefaultDepartments(database, tenantId, plan.id);
  return tenantId;
}

/**
 * Adds DEFAULT_DEPARTMENTS (with a help topic on `slaPlanId`, categories and
 * sub-categories). Departments or topics whose name is already taken are kept
 * and reused, so it's safe on a tenant that has some of them.
 */
export async function addDefaultDepartments(database: Database, tenantId: number, slaPlanId: number) {
  for (const def of DEFAULT_DEPARTMENTS) {
    await database.insert(t.departments).values({ tenantId, name: def.name, isPublic: true }).onConflictDoNothing();
    const [dept] = await database
      .select({ id: t.departments.id })
      .from(t.departments)
      .where(and(eq(t.departments.tenantId, tenantId), sql`lower(${t.departments.name}) = lower(${def.name})`));
    await database.insert(t.helpTopics).values({ tenantId, name: def.topic, departmentId: dept.id, slaPlanId }).onConflictDoNothing();
    for (const category of def.categories) {
      await database.insert(t.ticketCategories).values({ tenantId, departmentId: dept.id, name: category.name }).onConflictDoNothing();
      const [row] = await database
        .select({ id: t.ticketCategories.id })
        .from(t.ticketCategories)
        .where(and(eq(t.ticketCategories.departmentId, dept.id), sql`lower(${t.ticketCategories.name}) = lower(${category.name})`));
      await database
        .insert(t.ticketSubcategories)
        .values(category.subcategories.map((name) => ({ tenantId, categoryId: row.id, name })))
        .onConflictDoNothing();
    }
  }
}

/** The department new admins are placed in: the tenant's oldest one. */
export async function defaultDepartment(database: Database, tenantId: number) {
  const [dept] = await database
    .select({ id: t.departments.id, name: t.departments.name, managerId: t.departments.managerId })
    .from(t.departments)
    .where(eq(t.departments.tenantId, tenantId))
    .orderBy(asc(t.departments.id))
    .limit(1);
  return dept;
}

/** Makes `staffId` the manager of the default department if it has none yet. */
export async function claimDefaultDepartment(database: Database, tenantId: number, staffId: number) {
  const dept = await defaultDepartment(database, tenantId);
  if (dept && !dept.managerId) {
    await database
      .update(t.departments)
      .set({ managerId: staffId })
      .where(and(eq(t.departments.id, dept.id), eq(t.departments.tenantId, tenantId)));
  }
}
