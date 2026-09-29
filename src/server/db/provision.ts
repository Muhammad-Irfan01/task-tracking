import { and, asc, eq } from "drizzle-orm";
import type { PlanId } from "@/lib/constants";
import type { Database } from "./client";
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
 * catch-all customer organization, a department, an SLA plan and a help topic.
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
  return tenantId;
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
