import { eq } from "drizzle-orm";
import { orgSettingsSchema, toFieldErrors } from "@/lib/schemas";
import type { OrgSettings } from "@/types";
import { db } from "../db";
import { orgSettings, staff } from "../db/schema";
import { invalid } from "../errors";
import { count, countSql } from "./shared";

const DEFAULTS = { name: "Threadline Support Desk", supportEmail: "support@threadline.io", timezone: "UTC (UTC+00:00)", plan: "Business" };

export async function getOrgSettings(): Promise<OrgSettings> {
  const [row] = await db.select().from(orgSettings).where(eq(orgSettings.id, 1));
  const seatsUsed = await count(db.select({ n: countSql }).from(staff).where(eq(staff.active, true)));
  const { name, supportEmail, timezone, plan } = row ?? DEFAULTS;
  return { name, supportEmail, timezone, plan, seatsUsed };
}

export async function updateOrgSettings(raw: unknown) {
  const parsed = orgSettingsSchema.partial().safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  if (Object.keys(parsed.data).length === 0) return getOrgSettings();
  await db
    .insert(orgSettings)
    .values({ id: 1, ...DEFAULTS, ...parsed.data })
    .onConflictDoUpdate({ target: orgSettings.id, set: parsed.data });
  return getOrgSettings();
}
