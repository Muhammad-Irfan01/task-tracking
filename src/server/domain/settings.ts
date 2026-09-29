import { and, eq } from "drizzle-orm";
import { orgSettingsSchema, toFieldErrors } from "@/lib/schemas";
import type { OrgSettings } from "@/types";
import { db } from "../db";
import { isUniqueViolation } from "../db/errors";
import { staff, tenants } from "../db/schema";
import { invalid } from "../errors";
import { currentTenant, inTenant } from "../tenant";
import { count, countSql } from "./shared";

/** The signed-in agent's organization. Plan and seat limit are set by the platform, not here. */
export async function getOrgSettings(): Promise<OrgSettings> {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, currentTenant()));
  const seatsUsed = await count(db.select({ n: countSql }).from(staff).where(and(inTenant(staff.tenantId), eq(staff.active, true))));
  return {
    name: row.name,
    supportEmail: row.supportEmail,
    timezone: row.timezone,
    plan: row.plan,
    maxAgents: row.maxAgents,
    seatsUsed,
  };
}

export async function updateOrgSettings(raw: unknown) {
  const parsed = orgSettingsSchema.partial().safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  if (Object.keys(parsed.data).length === 0) return getOrgSettings();
  try {
    await db.update(tenants).set(parsed.data).where(eq(tenants.id, currentTenant()));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw invalid({ name: "Another organization already uses this name" });
    }
    throw error;
  }
  return getOrgSettings();
}
