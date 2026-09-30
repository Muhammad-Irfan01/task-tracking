import { and, eq } from "drizzle-orm";
import { ORG_LOGO, planLimit } from "@/lib/constants";
import { orgSettingsSchema, toFieldErrors } from "@/lib/schemas";
import type { OrgSettings } from "@/types";
import { db } from "../db";
import { isUniqueViolation } from "../db/errors";
import { staff, tenants } from "../db/schema";
import { badRequest, invalid, notFound } from "../errors";
import { currentTenant, inTenant } from "../tenant";
import { count, countSql } from "./shared";

/** The signed-in agent's organization. The plan (and so the employee limit) is set by the platform, not here. */
export async function getOrgSettings(): Promise<OrgSettings> {
  const [row] = await db
    .select({
      name: tenants.name,
      supportEmail: tenants.supportEmail,
      timezone: tenants.timezone,
      plan: tenants.plan,
      emailDomain: tenants.emailDomain,
      logoUpdatedAt: tenants.logoUpdatedAt,
    })
    .from(tenants)
    .where(eq(tenants.id, currentTenant()));
  const seatsUsed = await count(db.select({ n: countSql }).from(staff).where(and(inTenant(staff.tenantId), eq(staff.active, true))));
  return {
    name: row.name,
    supportEmail: row.supportEmail,
    timezone: row.timezone,
    plan: row.plan,
    maxAgents: planLimit(row.plan),
    emailDomain: row.emailDomain,
    logoUrl: orgLogoUrl(row.logoUpdatedAt),
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

// ------------------------------------------------------------------ logo

/** Where the signed-in user's browser loads their organization's logo; the version busts caches on change. */
export function orgLogoUrl(updatedAt: Date | null) {
  return updatedAt ? `/api/settings/organization/logo?v=${updatedAt.getTime()}` : null;
}

/** Always the current tenant's logo, so an organization can never load another's. */
export async function getOrgLogo() {
  const [row] = await db
    .select({ logo: tenants.logo, logoType: tenants.logoType })
    .from(tenants)
    .where(eq(tenants.id, currentTenant()));
  if (!row?.logo || !row.logoType) throw notFound("Logo");
  return { data: row.logo, type: row.logoType };
}

/** Checks the file's own bytes, not just the type the browser claimed. */
function sniffImageType(data: Buffer) {
  const starts = (bytes: number[], offset = 0) => bytes.every((b, i) => data[offset + i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function setOrgLogo(data: Buffer) {
  if (data.length === 0) throw badRequest("Choose an image to upload");
  if (data.length > ORG_LOGO.maxBytes) throw badRequest(`Logos can be at most ${ORG_LOGO.maxBytes / 1024} KB`);
  const type = sniffImageType(data);
  if (!type) throw badRequest("Logos must be PNG, JPEG, WebP or GIF images");
  await db.update(tenants).set({ logo: data, logoType: type, logoUpdatedAt: new Date() }).where(eq(tenants.id, currentTenant()));
  return getOrgSettings();
}

export async function removeOrgLogo() {
  await db.update(tenants).set({ logo: null, logoType: null, logoUpdatedAt: null }).where(eq(tenants.id, currentTenant()));
  return getOrgSettings();
}
