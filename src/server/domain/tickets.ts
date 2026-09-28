import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { isClosedStatus } from "@/lib/constants";
import { ATTACHMENT_LIMITS, ticketCreateSchema, ticketUpdateSchema, toFieldErrors, type TicketUpdateInput } from "@/lib/schemas";
import type { Attachment, SessionUser, Ticket, TicketMessage } from "@/types";
import { db } from "../db";
import {
  attachments,
  customers,
  departments,
  helpTopics,
  messages,
  organizations,
  slaPlans as slaPlansT,
  staff,
  tickets,
} from "../db/schema";
import { ticketNumber } from "../db/seed/people";
import { badRequest, invalid, notFound } from "../errors";
import { parseId, References } from "../resource";
import { notify } from "./notifications";
import {
  agentIdByName,
  customerByEmail,
  departmentIdByName,
  helpTopicByName,
  iso,
  isoRequired,
  organizationIdByName,
  q,
  ticketIsOpenQ,
  ticketIsOverdue,
} from "./shared";

const HOUR = 3_600_000;
const INDEPENDENT_ORG = "Independent Customers";

// ---------------------------------------------------------------- reads

function ticketQuery(where?: SQL) {
  return db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      excerpt: tickets.excerpt,
      status: tickets.status,
      priority: tickets.priority,
      department: departments.name,
      topic: helpTopics.name,
      assignee: staff.name,
      customer: customers.name,
      customerEmail: customers.email,
      organization: organizations.name,
      source: tickets.source,
      created: tickets.createdAt,
      updated: tickets.updatedAt,
      dueAt: tickets.dueAt,
      resolvedAt: tickets.resolvedAt,
      firstResponseAt: tickets.firstResponseAt,
      rating: tickets.rating,
      isOverdue: ticketIsOverdue,
      messages: sql<number>`(select count(*)::int from ${messages} where ${q(messages.ticketId)} = ${q(tickets.id)})`,
    })
    .from(tickets)
    .innerJoin(departments, eq(departments.id, tickets.departmentId))
    .innerJoin(helpTopics, eq(helpTopics.id, tickets.helpTopicId))
    .innerJoin(customers, eq(customers.id, tickets.customerId))
    .innerJoin(organizations, eq(organizations.id, customers.organizationId))
    .leftJoin(staff, eq(staff.id, tickets.assigneeId))
    .where(where);
}

type TicketRow = Awaited<ReturnType<typeof ticketQuery>>[number];

function toTicket(row: TicketRow): Ticket {
  return {
    ...row,
    number: ticketNumber(row.id),
    assignee: row.assignee ?? "Unassigned",
    created: isoRequired(row.created),
    updated: isoRequired(row.updated),
    dueAt: isoRequired(row.dueAt),
    resolvedAt: iso(row.resolvedAt),
    firstResponseAt: iso(row.firstResponseAt),
    isOverdue: Boolean(row.isOverdue),
  };
}

export async function listTickets() {
  return (await ticketQuery().orderBy(desc(tickets.updatedAt))).map(toTicket);
}

export async function getTicket(rawId: string | number) {
  const id = parseId(rawId);
  const [row] = id ? await ticketQuery(eq(tickets.id, id)) : [];
  if (!row) throw notFound("Ticket");
  return toTicket(row);
}

/** Lightweight lookup (no joins) used by metadata and mutations. */
async function ticketRecord(rawId: string | number) {
  const id = parseId(rawId);
  const [row] = id ? await db.select().from(tickets).where(eq(tickets.id, id)) : [];
  if (!row) throw notFound("Ticket");
  return row;
}

export async function ticketTitle(rawId: string) {
  const id = parseId(rawId);
  const [row] = id ? await db.select({ id: tickets.id, subject: tickets.subject }).from(tickets).where(eq(tickets.id, id)) : [];
  return row ? `${ticketNumber(row.id)} · ${row.subject}` : null;
}

export async function getThread(rawId: string | number): Promise<TicketMessage[]> {
  const ticket = await ticketRecord(rawId);
  const rows = await db
    .select({
      id: messages.id,
      isStaff: messages.isStaff,
      staffName: staff.name,
      authorName: messages.authorName,
      customerName: customers.name,
      body: messages.body,
      created: messages.createdAt,
    })
    .from(messages)
    .innerJoin(tickets, eq(tickets.id, messages.ticketId))
    .innerJoin(customers, eq(customers.id, tickets.customerId))
    .leftJoin(staff, eq(staff.id, messages.authorStaffId))
    .where(eq(messages.ticketId, ticket.id))
    .orderBy(asc(messages.createdAt), asc(messages.id));

  const files = rows.length
    ? await db
        .select({ id: attachments.id, messageId: attachments.messageId, name: attachments.name, size: attachments.size, type: attachments.type })
        .from(attachments)
        .where(inArray(attachments.messageId, rows.map((r) => r.id)))
        .orderBy(asc(attachments.createdAt))
    : [];

  return rows.map((row) => ({
    id: String(row.id),
    // Names follow renames: staff via the agent record, customers via the ticket's customer.
    author: row.isStaff ? (row.staffName ?? row.authorName) : row.customerName,
    isStaff: row.isStaff,
    created: isoRequired(row.created),
    body: row.body,
    attachments: files
      .filter((f) => f.messageId === row.id)
      .map((f): Attachment => ({ id: f.id, name: f.name, size: f.size, type: f.type, url: `/api/attachments/${f.id}` })),
  }));
}

// ---------------------------------------------------------------- mutations

/** Least-loaded available agent in the department, falling back to anyone available. */
async function autoAssign(departmentId: number) {
  const openCount = sql<number>`(select count(*)::int from ${tickets} where ${q(tickets.assigneeId)} = ${q(staff.id)} and ${ticketIsOpenQ})`;
  const available = and(eq(staff.active, true), eq(staff.onVacation, false));
  const pick = (where: SQL | undefined) =>
    db.select({ id: staff.id, name: staff.name }).from(staff).where(where).orderBy(asc(openCount), asc(staff.id)).limit(1);
  const [inDept] = await pick(and(available, eq(staff.departmentId, departmentId)));
  return inDept ?? (await pick(available))[0];
}

async function notifyAssignee(ticketId: number, subject: string, assigneeId: number | null, actor: SessionUser) {
  if (!assigneeId || assigneeId === actor.id) return;
  await notify({
    type: "assigned",
    title: `${ticketNumber(ticketId)} assigned to you`,
    body: `${actor.name}: ${subject}`,
    href: `/tickets/${ticketId}`,
    recipientId: assigneeId,
  });
}

export async function createTicket(raw: unknown, actor: SessionUser) {
  const parsed = ticketCreateSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const input = parsed.data;

  const refs = new References();
  const departmentId = await refs.resolve("department", input.department, departmentIdByName, "Unknown department");
  const topic = await refs.resolve("topic", input.topic, helpTopicByName, "Unknown help topic");
  refs.assert();

  // New requesters become customer records so they show up in the directory.
  let customer = await customerByEmail(input.customerEmail);
  if (!customer) {
    const organizationId = await organizationIdByName(INDEPENDENT_ORG);
    if (!organizationId) throw badRequest(`The "${INDEPENDENT_ORG}" organization is missing`);
    [customer] = await db
      .insert(customers)
      .values({ name: input.customerName, email: input.customerEmail, organizationId })
      .onConflictDoNothing()
      .returning();
    customer ??= await customerByEmail(input.customerEmail);
  }

  const assignee = await autoAssign(departmentId!);
  const now = new Date();
  const [ticket] = await db
    .insert(tickets)
    .values({
      subject: input.subject,
      excerpt: input.message,
      priority: input.priority,
      departmentId: departmentId!,
      helpTopicId: topic!.id,
      assigneeId: assignee?.id ?? actor.id,
      customerId: customer!.id,
      source: "Web",
      createdAt: now,
      updatedAt: now,
      dueAt: new Date(now.getTime() + topic!.graceHours * HOUR),
    })
    .returning({ id: tickets.id });

  await db.insert(messages).values({
    ticketId: ticket.id,
    isStaff: false,
    authorName: customer!.name,
    body: input.message,
    createdAt: now,
  });
  await notifyAssignee(ticket.id, input.subject, assignee?.id ?? actor.id, actor);
  return getTicket(ticket.id);
}

export async function updateTicket(rawId: string, raw: unknown, actor: SessionUser) {
  const current = await ticketRecord(rawId);
  const parsed = ticketUpdateSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const changes: TicketUpdateInput = parsed.data;

  const refs = new References();
  const departmentId = await refs.resolve("department", changes.department, departmentIdByName, "Unknown department");
  const topic = await refs.resolve("topic", changes.topic, helpTopicByName, "Unknown help topic");
  const assigneeId = await refs.resolve("assignee", changes.assignee, (name) => agentIdByName(name, { activeOnly: true }), "Choose an active agent");
  refs.assert();

  const now = new Date();
  const set: Partial<typeof tickets.$inferInsert> = { updatedAt: now };
  if (changes.status) set.status = changes.status;
  if (changes.priority) set.priority = changes.priority;
  if (departmentId) set.departmentId = departmentId;
  if (topic) set.helpTopicId = topic.id;
  if (assigneeId) set.assigneeId = assigneeId;

  const wasClosed = isClosedStatus(current.status);
  const nowClosed = isClosedStatus(changes.status ?? current.status);
  if (nowClosed && !wasClosed) set.resolvedAt = now;
  if (!nowClosed && wasClosed) {
    // Reopened: clear resolution and restart the SLA clock.
    const grace = topic?.graceHours ?? (await helpTopicGrace(current.helpTopicId));
    Object.assign(set, { resolvedAt: null, rating: null, dueAt: new Date(now.getTime() + grace * HOUR) });
  }

  await db.update(tickets).set(set).where(eq(tickets.id, current.id));
  if (assigneeId && assigneeId !== current.assigneeId) await notifyAssignee(current.id, current.subject, assigneeId, actor);
  return getTicket(current.id);
}

async function helpTopicGrace(helpTopicId: number) {
  const [row] = await db
    .select({ grace: sql<number>`(select ${q(slaPlansT.graceHours)} from ${slaPlansT} where ${q(slaPlansT.id)} = ${q(helpTopics.slaPlanId)})` })
    .from(helpTopics)
    .where(eq(helpTopics.id, helpTopicId));
  return Number(row?.grace ?? 48);
}

export async function deleteTicket(rawId: string) {
  const ticket = await ticketRecord(rawId);
  // Messages and their attachments cascade.
  await db.delete(tickets).where(eq(tickets.id, ticket.id));
  return { id: ticket.id };
}

export async function addReply(rawId: string, body: string, files: File[], actor: SessionUser) {
  const ticket = await ticketRecord(rawId);
  const text = body.trim();
  if (!text && files.length === 0) throw invalid({ body: "Write a reply or attach a file" });
  if (files.length > ATTACHMENT_LIMITS.maxFiles) throw badRequest(`Attach at most ${ATTACHMENT_LIMITS.maxFiles} files`);
  const tooBig = files.find((f) => f.size > ATTACHMENT_LIMITS.maxBytes);
  if (tooBig) throw badRequest(`${tooBig.name} is larger than ${ATTACHMENT_LIMITS.maxBytes / 1024 / 1024} MB`);
  if (files.reduce((sum, f) => sum + f.size, 0) > ATTACHMENT_LIMITS.maxTotalBytes) {
    throw badRequest(`Attachments can total at most ${ATTACHMENT_LIMITS.maxTotalBytes / 1024 / 1024} MB per reply`);
  }

  const now = new Date();
  const [message] = await db
    .insert(messages)
    .values({ ticketId: ticket.id, isStaff: true, authorStaffId: actor.id, authorName: actor.name, body: text, createdAt: now })
    .returning({ id: messages.id });

  if (files.length) {
    await db.insert(attachments).values(
      await Promise.all(
        files.map(async (file) => ({
          messageId: message.id,
          name: file.name.slice(0, 255),
          size: file.size,
          type: file.type || "application/octet-stream",
          data: Buffer.from(await file.arrayBuffer()),
        })),
      ),
    );
  }

  await db
    .update(tickets)
    .set({
      updatedAt: now,
      firstResponseAt: ticket.firstResponseAt ?? now,
      ...(ticket.status === "Open" ? { status: "In Progress" as const } : {}),
    })
    .where(eq(tickets.id, ticket.id));

  if (ticket.assigneeId && ticket.assigneeId !== actor.id) {
    await notify({
      type: "reply",
      title: `New reply on ${ticketNumber(ticket.id)}`,
      body: `${actor.name}: ${text.slice(0, 80) || "sent an attachment"}`,
      href: `/tickets/${ticket.id}`,
      recipientId: ticket.assigneeId,
    });
  }

  const thread = await getThread(ticket.id);
  return { message: thread.find((m) => m.id === String(message.id))!, ticket: await getTicket(ticket.id) };
}

export async function getAttachment(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Attachment");
  const [file] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!file) throw notFound("Attachment");
  return file;
}
