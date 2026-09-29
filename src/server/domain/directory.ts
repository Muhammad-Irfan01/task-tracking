import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AVATAR_COLORS, planLimit } from "@/lib/constants";
import {
  emailInDomain,
  agentSchema,
  customerSchema,
  departmentSchema,
  employeeSchema,
  helpTopicSchema,
  organizationSchema,
  slaPlanSchema,
  teamSchema,
} from "@/lib/schemas";
import type { Agent, Customer, Department, Employee, HelpTopic, Organization, SlaPlan, Team } from "@/types";
import { db } from "../db";
import {
  cannedResponses,
  customers as customersTable,
  departments as departmentsTable,
  helpTopics as helpTopicsTable,
  organizations as organizationsTable,
  slaPlans as slaPlansTable,
  staff,
  superAdmins,
  teamMembers,
  teams as teamsTable,
  tenants,
  tickets,
} from "../db/schema";
import { conflict, invalid } from "../errors";
import { createResource, plural, References } from "../resource";
import { currentTenant, inTenant } from "../tenant";
import {
  agentIdByName,
  count,
  countSql,
  countTickets,
  departmentIdByName,
  isoRequired,
  organizationIdByName,
  q,
  slaPlanIdByName,
  ticketIsOpen,
  ticketIsOpenQ,
} from "./shared";

// ---------------------------------------------------------------- organizations

async function organizationRows(where?: SQL): Promise<Organization[]> {
  return db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      domain: organizationsTable.domain,
      status: organizationsTable.status,
      users: sql<number>`(select count(*)::int from ${customersTable} where ${q(customersTable.organizationId)} = ${q(organizationsTable.id)})`,
    })
    .from(organizationsTable)
    .where(and(inTenant(organizationsTable.tenantId), where))
    .orderBy(asc(organizationsTable.id));
}

export const organizations = createResource({
  entity: "Organization",
  schema: organizationSchema,
  list: () => organizationRows(),
  get: async (id) => (await organizationRows(eq(organizationsTable.id, id)))[0],
  insert: async (input) => {
    const [row] = await db.insert(organizationsTable).values({ ...input, tenantId: currentTenant() }).returning({ id: organizationsTable.id });
    return row.id;
  },
  update: async (id, changes) => {
    if (Object.keys(changes).length === 0) return true;
    const rows = await db.update(organizationsTable).set(changes).where(and(eq(organizationsTable.id, id), inTenant(organizationsTable.tenantId))).returning({ id: organizationsTable.id });
    return rows.length > 0;
  },
  deleteBlocker: async (id) => {
    const members = await count(db.select({ n: countSql }).from(customersTable).where(eq(customersTable.organizationId, id)));
    return members ? `This organization still has ${plural(members, "customer")}. Move them first.` : null;
  },
  remove: async (id) => (await db.delete(organizationsTable).where(and(eq(organizationsTable.id, id), inTenant(organizationsTable.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- customers

async function customerRows(where?: SQL): Promise<Customer[]> {
  const rows = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      organization: organizationsTable.name,
      status: customersTable.status,
      joined: customersTable.joined,
      tickets: countTickets(sql`${q(tickets.customerId)} = ${q(customersTable.id)}`),
    })
    .from(customersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, customersTable.organizationId))
    .where(and(inTenant(customersTable.tenantId), where))
    .orderBy(asc(customersTable.id));
  return rows.map((row) => ({ ...row, joined: isoRequired(row.joined) }));
}

async function resolveOrganization(name: string | undefined) {
  const refs = new References();
  const organizationId = await refs.resolve("organization", name, organizationIdByName, "Unknown organization");
  refs.assert();
  return organizationId;
}

export const customers = createResource({
  entity: "Customer",
  schema: customerSchema,
  list: () => customerRows(),
  get: async (id) => (await customerRows(eq(customersTable.id, id)))[0],
  insert: async ({ organization, ...input }) => {
    const organizationId = (await resolveOrganization(organization))!;
    const [row] = await db.insert(customersTable).values({ ...input, organizationId, tenantId: currentTenant() }).returning({ id: customersTable.id });
    return row.id;
  },
  update: async (id, { organization, ...changes }) => {
    const organizationId = await resolveOrganization(organization);
    const set = { ...changes, ...(organizationId ? { organizationId } : {}) };
    if (Object.keys(set).length === 0) return (await db.select({ id: customersTable.id }).from(customersTable).where(and(eq(customersTable.id, id), inTenant(customersTable.tenantId)))).length > 0;
    return (await db.update(customersTable).set(set).where(and(eq(customersTable.id, id), inTenant(customersTable.tenantId))).returning({ id: customersTable.id })).length > 0;
  },
  deleteBlocker: async (id) => {
    const total = await count(db.select({ n: countSql }).from(tickets).where(eq(tickets.customerId, id)));
    return total
      ? `This customer has ${plural(total, "ticket")} on file. Set the account to Inactive instead of deleting it.`
      : null;
  },
  remove: async (id) => (await db.delete(customersTable).where(and(eq(customersTable.id, id), inTenant(customersTable.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- staff

async function agentRows(where?: SQL): Promise<Agent[]> {
  return db
    .select({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      dept: departmentsTable.name,
      role: staff.role,
      isAdmin: staff.isAdmin,
      active: staff.active,
      avatarColor: staff.avatarColor,
      onVacation: staff.onVacation,
      resolvedThisMonth: countTickets(sql`${q(tickets.assigneeId)} = ${q(staff.id)} and ${q(tickets.resolvedAt)} >= now() - interval '30 days'`),
      openTickets: countTickets(sql`${q(tickets.assigneeId)} = ${q(staff.id)} and ${ticketIsOpenQ}`),
    })
    .from(staff)
    .innerJoin(departmentsTable, eq(departmentsTable.id, staff.departmentId))
    .where(and(inTenant(staff.tenantId), eq(staff.kind, "agent"), where))
    .orderBy(asc(staff.id));
}

/** One person in the current tenant, limited to agents or to employees. */
const personWhere = (id: number, kind: "agent" | "employee") => and(eq(staff.id, id), inTenant(staff.tenantId), eq(staff.kind, kind));

/** Sign-in is by email alone, so an agent can't share an email with a platform super admin. */
async function assertNotPlatformEmail(email: string | undefined) {
  if (!email) return;
  const [taken] = await db.select({ id: superAdmins.id }).from(superAdmins).where(eq(superAdmins.email, email)).limit(1);
  if (taken) throw invalid({ email: "This email is already in use" });
}

/** When the organization has an email domain, agents must use it (name@acme.com). */
async function assertEmailInTenantDomain(address: string | undefined) {
  if (!address) return;
  const [tenant] = await db.select({ emailDomain: tenants.emailDomain }).from(tenants).where(eq(tenants.id, currentTenant()));
  if (!emailInDomain(address, tenant?.emailDomain)) {
    throw invalid({ email: `Use an @${tenant!.emailDomain} email address` });
  }
}

/** Enforces the plan's employee limit (Small 75 / Medium 250 / Large 1000) for active agents. */
async function assertSeatAvailable(activatingId?: number) {
  const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, currentTenant()));
  const limit = planLimit(tenant.plan);
  const active = await count(
    db
      .select({ n: countSql })
      .from(staff)
      .where(and(inTenant(staff.tenantId), eq(staff.active, true), activatingId ? sql`${staff.id} <> ${activatingId}` : undefined)),
  );
  if (active >= limit) {
    throw conflict(
      `Your ${tenant.plan} plan allows up to ${plural(limit, "active employee")}. Deactivate someone or ask your provider to upgrade the plan.`,
    );
  }
}

async function resolveDepartment(name: string | undefined, field = "dept") {
  const refs = new References();
  const departmentId = await refs.resolve(field, name, departmentIdByName, "Unknown department");
  refs.assert();
  return departmentId;
}

export const agents = createResource({
  entity: "Agent",
  schema: agentSchema,
  list: () => agentRows(),
  get: async (id) => (await agentRows(eq(staff.id, id)))[0],
  insert: async ({ dept, ...input }) => {
    const departmentId = (await resolveDepartment(dept))!;
    await assertNotPlatformEmail(input.email);
    await assertEmailInTenantDomain(input.email);
    if (input.active) await assertSeatAvailable();
    const total = await count(db.select({ n: countSql }).from(staff).where(inTenant(staff.tenantId)));
    const [row] = await db
      .insert(staff)
      .values({ ...input, departmentId, tenantId: currentTenant(), avatarColor: AVATAR_COLORS[total % AVATAR_COLORS.length] })
      .returning({ id: staff.id });
    return row.id;
  },
  update: async (id, { dept, ...changes }) => {
    const departmentId = await resolveDepartment(dept);
    await assertNotPlatformEmail(changes.email);
    await assertEmailInTenantDomain(changes.email);
    if (changes.active) await assertSeatAvailable(id);
    const set = { ...changes, ...(departmentId ? { departmentId } : {}) };
    if (Object.keys(set).length === 0) return (await db.select({ id: staff.id }).from(staff).where(personWhere(id, "agent"))).length > 0;
    return (await db.update(staff).set(set).where(personWhere(id, "agent")).returning({ id: staff.id })).length > 0;
  },
  deleteBlocker: async (id) => {
    const open = await count(db.select({ n: countSql }).from(tickets).where(and(eq(tickets.assigneeId, id), ticketIsOpen)));
    if (open) return `This agent has ${plural(open, "open ticket")}. Reassign them or deactivate the account instead.`;
    const [managed] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.managerId, id)).limit(1);
    if (managed) return `This agent manages ${managed.name}. Pick a new manager first.`;
    const [led] = await db.select({ name: teamsTable.name }).from(teamsTable).where(eq(teamsTable.leadId, id)).limit(1);
    if (led) return `This agent leads ${led.name}. Pick a new lead first.`;
    return null;
  },
  remove: async (id) => (await db.delete(staff).where(personWhere(id, "agent")).returning({ id: staff.id })).length > 0,
});

// ---------------------------------------------------------------- employees (portal users)

async function employeeRows(where?: SQL): Promise<Employee[]> {
  const rows = await db
    .select({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      dept: departmentsTable.name,
      active: staff.active,
      avatarColor: staff.avatarColor,
      hasPassword: sql<boolean>`${staff.passwordHash} is not null`,
      openTickets: countTickets(sql`${q(tickets.customerId)} = ${q(staff.customerId)} and ${ticketIsOpenQ}`),
      totalTickets: countTickets(sql`${q(tickets.customerId)} = ${q(staff.customerId)}`),
    })
    .from(staff)
    .innerJoin(departmentsTable, eq(departmentsTable.id, staff.departmentId))
    .where(and(inTenant(staff.tenantId), eq(staff.kind, "employee"), where))
    .orderBy(asc(staff.name));
  return rows.map((row) => ({ ...row, hasPassword: Boolean(row.hasPassword) }));
}

/**
 * People who raise tickets from the portal. They share the staff table (one
 * sign-in, one email namespace, counted against the plan) but never work tickets.
 */
export const employees = createResource({
  entity: "Employee",
  schema: employeeSchema,
  list: () => employeeRows(),
  get: async (id) => (await employeeRows(eq(staff.id, id)))[0],
  insert: async ({ dept, ...input }) => {
    const departmentId = (await resolveDepartment(dept))!;
    await assertNotPlatformEmail(input.email);
    await assertEmailInTenantDomain(input.email);
    if (input.active) await assertSeatAvailable();
    const total = await count(db.select({ n: countSql }).from(staff).where(inTenant(staff.tenantId)));
    const [row] = await db
      .insert(staff)
      .values({
        ...input,
        departmentId,
        tenantId: currentTenant(),
        kind: "employee",
        role: "Employee",
        isAdmin: false,
        avatarColor: AVATAR_COLORS[total % AVATAR_COLORS.length],
      })
      .returning({ id: staff.id });
    return row.id;
  },
  update: async (id, { dept, ...changes }) => {
    const departmentId = await resolveDepartment(dept);
    await assertNotPlatformEmail(changes.email);
    await assertEmailInTenantDomain(changes.email);
    if (changes.active) await assertSeatAvailable(id);
    const set = { ...changes, ...(departmentId ? { departmentId } : {}) };
    if (Object.keys(set).length === 0) return (await db.select({ id: staff.id }).from(staff).where(personWhere(id, "employee"))).length > 0;
    return (await db.update(staff).set(set).where(personWhere(id, "employee")).returning({ id: staff.id })).length > 0;
  },
  // Their tickets stay: they're filed under the employee's customer record, not the account.
  remove: async (id) => (await db.delete(staff).where(personWhere(id, "employee")).returning({ id: staff.id })).length > 0,
});

// ---------------------------------------------------------------- departments

const manager = alias(staff, "manager");

async function departmentRows(where?: SQL): Promise<Department[]> {
  const rows = await db
    .select({
      id: departmentsTable.id,
      name: departmentsTable.name,
      manager: manager.name,
      isPublic: departmentsTable.isPublic,
      agents: sql<number>`(select count(*)::int from ${staff} where ${q(staff.departmentId)} = ${q(departmentsTable.id)} and ${q(staff.kind)} = 'agent')`,
      ticketsOpen: countTickets(sql`${q(tickets.departmentId)} = ${q(departmentsTable.id)} and ${ticketIsOpenQ}`),
    })
    .from(departmentsTable)
    .leftJoin(manager, eq(manager.id, departmentsTable.managerId))
    .where(and(inTenant(departmentsTable.tenantId), where))
    .orderBy(asc(departmentsTable.id));
  return rows.map((row) => ({ ...row, manager: row.manager ?? "Unassigned" }));
}

async function resolveManager(name: string | undefined) {
  const refs = new References();
  const managerId = await refs.resolve("manager", name, agentIdByName, "Unknown or ambiguous agent name");
  refs.assert();
  return managerId;
}

export const departments = createResource({
  entity: "Department",
  schema: departmentSchema,
  list: () => departmentRows(),
  get: async (id) => (await departmentRows(eq(departmentsTable.id, id)))[0],
  insert: async ({ manager: managerName, ...input }) => {
    const managerId = await resolveManager(managerName);
    const [row] = await db.insert(departmentsTable).values({ ...input, managerId, tenantId: currentTenant() }).returning({ id: departmentsTable.id });
    return row.id;
  },
  update: async (id, { manager: managerName, ...changes }) => {
    const managerId = await resolveManager(managerName);
    const set = { ...changes, ...(managerId ? { managerId } : {}) };
    if (Object.keys(set).length === 0) return (await db.select({ id: departmentsTable.id }).from(departmentsTable).where(and(eq(departmentsTable.id, id), inTenant(departmentsTable.tenantId)))).length > 0;
    return (await db.update(departmentsTable).set(set).where(and(eq(departmentsTable.id, id), inTenant(departmentsTable.tenantId))).returning({ id: departmentsTable.id })).length > 0;
  },
  deleteBlocker: async (id) => {
    const people = await count(db.select({ n: countSql }).from(staff).where(eq(staff.departmentId, id)));
    if (people) return `This department still has ${people === 1 ? "1 person" : `${people} people`} (agents or employees). Move them to another department first.`;
    const topics = await count(db.select({ n: countSql }).from(helpTopicsTable).where(eq(helpTopicsTable.departmentId, id)));
    if (topics) return `${plural(topics, "help topic")} still route to this department.`;
    const responses = await count(db.select({ n: countSql }).from(cannedResponses).where(eq(cannedResponses.departmentId, id)));
    if (responses) return `${plural(responses, "canned response")} still belong to this department.`;
    const total = await count(db.select({ n: countSql }).from(tickets).where(eq(tickets.departmentId, id)));
    return total ? `This department has ${plural(total, "ticket")} on file. Move them to another department first.` : null;
  },
  remove: async (id) => (await db.delete(departmentsTable).where(and(eq(departmentsTable.id, id), inTenant(departmentsTable.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- teams

const lead = alias(staff, "lead");

async function teamRows(where?: SQL): Promise<Team[]> {
  const rows = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      lead: lead.name,
      notes: teamsTable.notes,
      memberIds: sql<number[]>`coalesce((select json_agg(${q(teamMembers.staffId)} order by ${q(teamMembers.staffId)}) from ${teamMembers} where ${q(teamMembers.teamId)} = ${q(teamsTable.id)}), '[]'::json)`,
    })
    .from(teamsTable)
    .innerJoin(lead, eq(lead.id, teamsTable.leadId))
    .where(and(inTenant(teamsTable.tenantId), where))
    .orderBy(asc(teamsTable.id));
  return rows.map((row) => {
    const memberIds = (typeof row.memberIds === "string" ? JSON.parse(row.memberIds) : row.memberIds).map(Number);
    return { ...row, memberIds, members: memberIds.length };
  });
}

async function resolveTeamRefs(leadName: string | undefined, memberIds: number[] | undefined) {
  const refs = new References();
  const leadId = await refs.resolve("lead", leadName, agentIdByName, "Unknown or ambiguous agent name");
  if (memberIds?.length) {
    const found = await db.select({ id: staff.id }).from(staff).where(and(inArray(staff.id, memberIds), inTenant(staff.tenantId), eq(staff.kind, "agent")));
    if (found.length !== new Set(memberIds).size) refs.errors.memberIds = "Unknown team member";
  }
  refs.assert();
  return leadId;
}

async function replaceMembers(teamId: number, memberIds: number[]) {
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  const unique = [...new Set(memberIds)];
  if (unique.length) await db.insert(teamMembers).values(unique.map((staffId) => ({ teamId, staffId })));
}

export const teams = createResource({
  entity: "Team",
  schema: teamSchema,
  list: () => teamRows(),
  get: async (id) => (await teamRows(eq(teamsTable.id, id)))[0],
  insert: async ({ lead: leadName, memberIds, ...input }) => {
    const leadId = (await resolveTeamRefs(leadName, memberIds))!;
    const [row] = await db.insert(teamsTable).values({ ...input, leadId, tenantId: currentTenant() }).returning({ id: teamsTable.id });
    await replaceMembers(row.id, memberIds);
    return row.id;
  },
  update: async (id, { lead: leadName, memberIds, ...changes }) => {
    const leadId = await resolveTeamRefs(leadName, memberIds);
    const set = { ...changes, ...(leadId ? { leadId } : {}) };
    const exists =
      Object.keys(set).length > 0
        ? (await db.update(teamsTable).set(set).where(and(eq(teamsTable.id, id), inTenant(teamsTable.tenantId))).returning({ id: teamsTable.id })).length > 0
        : (await db.select({ id: teamsTable.id }).from(teamsTable).where(and(eq(teamsTable.id, id), inTenant(teamsTable.tenantId)))).length > 0;
    if (exists && memberIds) await replaceMembers(id, memberIds);
    return exists;
  },
  remove: async (id) => (await db.delete(teamsTable).where(and(eq(teamsTable.id, id), inTenant(teamsTable.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- SLA plans

async function slaPlanRows(where?: SQL): Promise<SlaPlan[]> {
  return db
    .select({
      id: slaPlansTable.id,
      name: slaPlansTable.name,
      graceHours: slaPlansTable.graceHours,
      notes: slaPlansTable.notes,
      tickets: sql<number>`(select count(*)::int from ${tickets} inner join ${helpTopicsTable} on ${q(helpTopicsTable.id)} = ${q(tickets.helpTopicId)} where ${q(helpTopicsTable.slaPlanId)} = ${q(slaPlansTable.id)} and ${ticketIsOpenQ})`,
    })
    .from(slaPlansTable)
    .where(and(inTenant(slaPlansTable.tenantId), where))
    .orderBy(asc(slaPlansTable.id));
}

export const slaPlans = createResource({
  entity: "SLA plan",
  schema: slaPlanSchema,
  list: () => slaPlanRows(),
  get: async (id) => (await slaPlanRows(eq(slaPlansTable.id, id)))[0],
  insert: async (input) => (await db.insert(slaPlansTable).values({ ...input, tenantId: currentTenant() }).returning({ id: slaPlansTable.id }))[0].id,
  update: async (id, changes) => {
    if (Object.keys(changes).length === 0) return (await db.select({ id: slaPlansTable.id }).from(slaPlansTable).where(and(eq(slaPlansTable.id, id), inTenant(slaPlansTable.tenantId)))).length > 0;
    return (await db.update(slaPlansTable).set(changes).where(and(eq(slaPlansTable.id, id), inTenant(slaPlansTable.tenantId))).returning({ id: slaPlansTable.id })).length > 0;
  },
  deleteBlocker: async (id) => {
    const topics = await count(db.select({ n: countSql }).from(helpTopicsTable).where(eq(helpTopicsTable.slaPlanId, id)));
    return topics ? `${plural(topics, "help topic")} still use this plan.` : null;
  },
  remove: async (id) => (await db.delete(slaPlansTable).where(and(eq(slaPlansTable.id, id), inTenant(slaPlansTable.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- help topics

async function helpTopicRows(where?: SQL): Promise<HelpTopic[]> {
  return db
    .select({
      id: helpTopicsTable.id,
      name: helpTopicsTable.name,
      dept: departmentsTable.name,
      sla: slaPlansTable.name,
      ticketsThisMonth: countTickets(sql`${q(tickets.helpTopicId)} = ${q(helpTopicsTable.id)} and ${q(tickets.createdAt)} >= now() - interval '30 days'`),
    })
    .from(helpTopicsTable)
    .innerJoin(departmentsTable, eq(departmentsTable.id, helpTopicsTable.departmentId))
    .innerJoin(slaPlansTable, eq(slaPlansTable.id, helpTopicsTable.slaPlanId))
    .where(and(inTenant(helpTopicsTable.tenantId), where))
    .orderBy(asc(helpTopicsTable.id));
}

async function resolveTopicRefs(dept: string | undefined, sla: string | undefined) {
  const refs = new References();
  const departmentId = await refs.resolve("dept", dept, departmentIdByName, "Unknown department");
  const slaPlanId = await refs.resolve("sla", sla, slaPlanIdByName, "Unknown SLA plan");
  refs.assert();
  return { ...(departmentId ? { departmentId } : {}), ...(slaPlanId ? { slaPlanId } : {}) };
}

export const helpTopics = createResource({
  entity: "Help topic",
  schema: helpTopicSchema,
  list: () => helpTopicRows(),
  get: async (id) => (await helpTopicRows(eq(helpTopicsTable.id, id)))[0],
  insert: async ({ dept, sla, name }) => {
    const refIds = (await resolveTopicRefs(dept, sla)) as { departmentId: number; slaPlanId: number };
    return (await db.insert(helpTopicsTable).values({ name, ...refIds, tenantId: currentTenant() }).returning({ id: helpTopicsTable.id }))[0].id;
  },
  update: async (id, { dept, sla, ...changes }) => {
    const set = { ...changes, ...(await resolveTopicRefs(dept, sla)) };
    if (Object.keys(set).length === 0) return (await db.select({ id: helpTopicsTable.id }).from(helpTopicsTable).where(and(eq(helpTopicsTable.id, id), inTenant(helpTopicsTable.tenantId)))).length > 0;
    return (await db.update(helpTopicsTable).set(set).where(and(eq(helpTopicsTable.id, id), inTenant(helpTopicsTable.tenantId))).returning({ id: helpTopicsTable.id })).length > 0;
  },
  deleteBlocker: async (id) => {
    const total = await count(db.select({ n: countSql }).from(tickets).where(eq(tickets.helpTopicId, id)));
    return total ? `${plural(total, "ticket")} use this help topic. Re-route them first.` : null;
  },
  remove: async (id) => (await db.delete(helpTopicsTable).where(and(eq(helpTopicsTable.id, id), inTenant(helpTopicsTable.tenantId))).returning()).length > 0,
});
