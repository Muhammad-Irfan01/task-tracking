import { and, asc, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { tenantAdminSchema, tenantCreateSchema, tenantSchema, toFieldErrors } from "@/lib/schemas";
import type { Tenant, TenantDetail, TenantMember } from "@/types";
import { db } from "../db";
import { isUniqueViolation } from "../db/errors";
import { claimDefaultDepartment, defaultDepartment, provisionTenant } from "../db/provision";
import * as t from "../db/schema";
import { conflict, invalid, notFound } from "../errors";
import { parseId } from "../resource";
import { deleteBlobs } from "../storage";
import { withTenant } from "../tenant";
import { agents } from "./directory";
import { isoRequired, q } from "./shared";

// ---------------------------------------------------------------- reads

const staffCount = (where: SQL) => sql<number>`(select count(*)::int from ${t.staff} where ${q(t.staff.tenantId)} = ${q(t.tenants.id)} and ${where})`;
const ticketCount = (where: SQL) => sql<number>`(select count(*)::int from ${t.tickets} where ${q(t.tickets.tenantId)} = ${q(t.tenants.id)} and ${where})`;

async function tenantRows(where?: SQL): Promise<Tenant[]> {
  const rows = await db
    .select({
      id: t.tenants.id,
      name: t.tenants.name,
      supportEmail: t.tenants.supportEmail,
      timezone: t.tenants.timezone,
      plan: t.tenants.plan,
      maxAgents: t.tenants.maxAgents,
      status: t.tenants.status,
      createdAt: t.tenants.createdAt,
      agents: staffCount(sql`${q(t.staff.active)}`),
      admins: staffCount(sql`${q(t.staff.isAdmin)} and ${q(t.staff.active)}`),
      openTickets: ticketCount(sql`${q(t.tickets.status)} not in ('Resolved', 'Closed')`),
      totalTickets: ticketCount(sql`true`),
    })
    .from(t.tenants)
    .where(where)
    .orderBy(desc(t.tenants.createdAt), desc(t.tenants.id));
  return rows.map((row) => ({ ...row, createdAt: isoRequired(row.createdAt) }));
}

export const listTenants = () => tenantRows();

async function tenantOrThrow(rawId: string | number) {
  const id = parseId(rawId);
  const [tenant] = id ? await tenantRows(eq(t.tenants.id, id)) : [];
  if (!tenant) throw notFound("Organization");
  return tenant;
}

export async function getTenant(rawId: string | number): Promise<TenantDetail> {
  const tenant = await tenantOrThrow(rawId);
  const members: TenantMember[] = (
    await db
      .select({
        id: t.staff.id,
        name: t.staff.name,
        email: t.staff.email,
        role: t.staff.role,
        isAdmin: t.staff.isAdmin,
        active: t.staff.active,
        hasPassword: sql<boolean>`${t.staff.passwordHash} is not null`,
      })
      .from(t.staff)
      .where(eq(t.staff.tenantId, tenant.id))
      .orderBy(desc(t.staff.isAdmin), asc(t.staff.name))
  ).map((m) => ({ ...m, hasPassword: Boolean(m.hasPassword) }));
  return { ...tenant, members };
}

// ---------------------------------------------------------------- writes

function uniqueName(error: unknown): never {
  if (isUniqueViolation(error)) throw invalid({ name: "An organization with this name already exists" });
  throw error;
}

/** Creates the admin inside the tenant through the normal agents resource (validation, seats, email uniqueness). */
async function createAdmin(tenantId: number, name: string, email: string) {
  return withTenant(tenantId, async () => {
    const dept = (await defaultDepartment(db, tenantId))!;
    const admin = await agents.create({
      name,
      email,
      dept: dept.name,
      role: "Department Manager",
      isAdmin: true,
      active: true,
      onVacation: false,
    });
    await claimDefaultDepartment(db, tenantId, admin.id);
    return admin;
  });
}

/**
 * New organization + starter records + its first admin. The HTTP driver has
 * no transactions, so a failed admin (e.g. email already used) removes the
 * half-created organization again.
 */
export async function createTenant(raw: unknown) {
  const parsed = tenantCreateSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const { adminName, adminEmail, ...input } = parsed.data;

  const [emailTaken] = await db.select({ id: t.staff.id }).from(t.staff).where(eq(t.staff.email, adminEmail)).limit(1);
  if (emailTaken) throw invalid({ adminEmail: "This email already belongs to an agent" });

  const tenantId = await provisionTenant(db, input).catch(uniqueName);
  try {
    const admin = await createAdmin(tenantId, adminName, adminEmail);
    return { tenant: await getTenant(tenantId), adminId: admin.id };
  } catch (error) {
    await purgeTenant(tenantId);
    const fields = (error as { errors?: Record<string, string> }).errors;
    if (fields?.email) throw invalid({ adminEmail: fields.email });
    throw error;
  }
}

export async function updateTenant(rawId: string, raw: unknown) {
  const tenant = await tenantOrThrow(rawId);
  const parsed = tenantSchema.partial().safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  if (Object.keys(parsed.data).length > 0) {
    await db.update(t.tenants).set(parsed.data).where(eq(t.tenants.id, tenant.id)).catch(uniqueName);
  }
  return getTenant(tenant.id);
}

export async function addTenantAdmin(rawId: string, raw: unknown) {
  const tenant = await tenantOrThrow(rawId);
  const parsed = tenantAdminSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  return createAdmin(tenant.id, parsed.data.name, parsed.data.email);
}

/** Returns the member if they belong to the tenant and haven't set a password yet. */
export async function pendingMember(rawTenantId: string, rawStaffId: string) {
  const tenant = await tenantOrThrow(rawTenantId);
  const staffId = parseId(rawStaffId);
  const [member] = staffId
    ? await db
        .select({ id: t.staff.id, passwordHash: t.staff.passwordHash })
        .from(t.staff)
        .where(and(eq(t.staff.id, staffId), eq(t.staff.tenantId, tenant.id)))
    : [];
  if (!member) throw notFound("Member");
  if (member.passwordHash) throw conflict("This person has already set a password; they can use “Forgot password” instead.");
  return member.id;
}

export async function deleteTenant(rawId: string, confirmName: unknown) {
  const tenant = await tenantOrThrow(rawId);
  if (typeof confirmName !== "string" || confirmName.trim().toLowerCase() !== tenant.name.toLowerCase()) {
    throw invalid({ confirm: "Type the organization's name exactly to confirm" });
  }
  await purgeTenant(tenant.id);
  return { id: tenant.id };
}

/**
 * Deletes an organization and everything in it. Rows are removed in
 * dependency order (tenant tables restrict each other, so a single cascading
 * delete could trip over them), then stored files.
 */
async function purgeTenant(id: number) {
  const blobs = await db
    .select({ pathname: t.attachments.blobPathname })
    .from(t.attachments)
    .innerJoin(t.messages, eq(t.messages.id, t.attachments.messageId))
    .innerJoin(t.tickets, eq(t.tickets.id, t.messages.ticketId))
    .where(and(eq(t.tickets.tenantId, id), isNotNull(t.attachments.blobPathname)));

  // Messages, attachments and team members cascade from their parents.
  await db.delete(t.tickets).where(eq(t.tickets.tenantId, id));
  await db.delete(t.cannedResponses).where(eq(t.cannedResponses.tenantId, id));
  await db.delete(t.articles).where(eq(t.articles.tenantId, id));
  await db.delete(t.faqCategories).where(eq(t.faqCategories.tenantId, id));
  await db.delete(t.helpTopics).where(eq(t.helpTopics.tenantId, id));
  await db.delete(t.slaPlans).where(eq(t.slaPlans.tenantId, id));
  await db.delete(t.teams).where(eq(t.teams.tenantId, id));
  await db.delete(t.customers).where(eq(t.customers.tenantId, id));
  await db.delete(t.organizations).where(eq(t.organizations.tenantId, id));
  await db.delete(t.staff).where(eq(t.staff.tenantId, id));
  await db.delete(t.departments).where(eq(t.departments.tenantId, id));
  await db.delete(t.tenants).where(eq(t.tenants.id, id));
  await deleteBlobs(blobs.map((b) => b.pathname!));
}
