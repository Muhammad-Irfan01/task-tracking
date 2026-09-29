import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { isClosedStatus } from "@/lib/constants";
import { ticketCreateSchema, ticketUpdateSchema, toFieldErrors, type TicketUpdateInput } from "@/lib/schemas";
import type { BlobUpload } from "@/lib/schemas";
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
import { INDEPENDENT_ORG } from "../db/provision";
import { ticketNumber } from "../db/seed/people";
import { badRequest, invalid, notFound } from "../errors";
import { parseId, References } from "../resource";
import { currentTenant, inTenant } from "../tenant";
import { attachmentLimits, blobMetadata, blobStorageEnabled, deleteBlobs, ticketBlobPrefix } from "../storage";
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
    .where(and(inTenant(tickets.tenantId), where));
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

export async function listTickets(where?: SQL) {
  return (await ticketQuery(where).orderBy(desc(tickets.updatedAt))).map(toTicket);
}

export async function getTicket(rawId: string | number) {
  const id = parseId(rawId);
  const [row] = id ? await ticketQuery(eq(tickets.id, id)) : [];
  if (!row) throw notFound("Ticket");
  return toTicket(row);
}

/** Lightweight lookup (no joins) used by metadata and mutations. */
export async function ticketRecord(rawId: string | number) {
  const id = parseId(rawId);
  const [row] = id ? await db.select().from(tickets).where(and(eq(tickets.id, id), inTenant(tickets.tenantId))) : [];
  if (!row) throw notFound("Ticket");
  return row;
}

export async function ticketTitle(rawId: string) {
  const id = parseId(rawId);
  const [row] = id ? await db.select({ id: tickets.id, subject: tickets.subject }).from(tickets).where(and(eq(tickets.id, id), inTenant(tickets.tenantId))) : [];
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
  const available = and(inTenant(staff.tenantId), eq(staff.kind, "agent"), eq(staff.active, true), eq(staff.onVacation, false));
  const pick = (where: SQL | undefined) =>
    db.select({ id: staff.id, name: staff.name }).from(staff).where(where).orderBy(asc(openCount), asc(staff.id)).limit(1);
  const [inDept] = await pick(and(available, eq(staff.departmentId, departmentId)));
  return inDept ?? (await pick(available))[0];
}

/** Tells the employee who raised a ticket (if a portal user did) about agent activity. */
async function notifyRequester(customerId: number, event: { title: string; body: string; ticketId: number }) {
  const [requester] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.customerId, customerId), eq(staff.kind, "employee"), inTenant(staff.tenantId)))
    .limit(1);
  if (!requester) return;
  await notify({ type: "reply", title: event.title, body: event.body, href: `/portal/tickets/${event.ticketId}`, recipientId: requester.id });
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
      .values({ name: input.customerName, email: input.customerEmail, organizationId, tenantId: currentTenant() })
      .onConflictDoNothing()
      .returning();
    customer ??= await customerByEmail(input.customerEmail);
  }

  // With nobody available the creating agent takes it; a portal employee's ticket stays unassigned.
  const assignee = await autoAssign(departmentId!);
  const assigneeId = assignee?.id ?? (actor.kind === "employee" ? null : actor.id);
  const now = new Date();
  const [ticket] = await db
    .insert(tickets)
    .values({
      tenantId: currentTenant(),
      subject: input.subject,
      excerpt: input.message,
      priority: input.priority,
      departmentId: departmentId!,
      helpTopicId: topic!.id,
      assigneeId,
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
  await notifyAssignee(ticket.id, input.subject, assigneeId, actor);
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
  if (changes.status && changes.status !== current.status && actor.kind !== "employee") {
    await notifyRequester(current.customerId, {
      title: `${ticketNumber(current.id)} is now ${changes.status}`,
      body: current.subject,
      ticketId: current.id,
    });
  }
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
  const blobs = await db
    .select({ pathname: attachments.blobPathname })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .where(and(eq(messages.ticketId, ticket.id), isNotNull(attachments.blobPathname)));
  // Messages and their attachment rows cascade; blob files are removed separately.
  await db.delete(tickets).where(eq(tickets.id, ticket.id));
  await deleteBlobs(blobs.map((b) => b.pathname!));
  return { id: ticket.id };
}

/** Checks the ticket exists and returns the blob prefix its uploads must use. */
export async function attachmentUploadPrefix(rawId: string) {
  if (!blobStorageEnabled()) throw badRequest("File storage isn't configured; attach files to the reply directly");
  return ticketBlobPrefix((await ticketRecord(rawId)).id);
}

/**
 * `files` are posted inline (database storage); `uploads` reference files the
 * browser already put in blob storage. Either way sizes are checked here.
 */
/**
 * Adds a message to a ticket. Agents reply as staff; `asRequester` (the portal)
 * posts as the person who raised the ticket and leaves the SLA clock alone.
 */
export async function addReply(
  rawId: string,
  body: string,
  files: File[],
  uploads: BlobUpload[],
  actor: SessionUser,
  { asRequester = false } = {},
) {
  const ticket = await ticketRecord(rawId);
  const limits = attachmentLimits();
  const text = body.trim();
  if (!text && files.length === 0 && uploads.length === 0) throw invalid({ body: "Write a reply or attach a file" });
  if (limits.storage === "database" && uploads.length) throw badRequest("File storage isn't configured");
  if (limits.storage === "blob" && files.length) throw badRequest("Upload files to storage before sending the reply");

  const prefix = ticketBlobPrefix(ticket.id);
  const stored = await Promise.all(
    uploads.map(async (upload) => {
      const meta = upload.pathname.startsWith(prefix) ? await blobMetadata(upload.pathname) : null;
      if (!meta) throw badRequest(`${upload.name} wasn't uploaded — try attaching it again`);
      return { ...upload, ...meta };
    }),
  );

  const sized = [...files.map((f) => ({ name: f.name, size: f.size })), ...stored];
  if (sized.length > limits.maxFiles) throw badRequest(`Attach at most ${limits.maxFiles} files`);
  const tooBig = sized.find((f) => f.size > limits.maxBytes);
  if (tooBig) throw badRequest(`${tooBig.name} is larger than ${limits.maxBytes / 1024 / 1024} MB`);
  if (sized.reduce((sum, f) => sum + f.size, 0) > limits.maxTotalBytes) {
    throw badRequest(`Attachments can total at most ${limits.maxTotalBytes / 1024 / 1024} MB per reply`);
  }

  const now = new Date();
  const [message] = await db
    .insert(messages)
    .values({ ticketId: ticket.id, isStaff: !asRequester, authorStaffId: actor.id, authorName: actor.name, body: text, createdAt: now })
    .returning({ id: messages.id });

  if (files.length || stored.length) {
    await db.insert(attachments).values([
      ...(await Promise.all(
        files.map(async (file) => ({
          messageId: message.id,
          name: file.name.slice(0, 255),
          size: file.size,
          type: file.type || "application/octet-stream",
          data: Buffer.from(await file.arrayBuffer()),
        })),
      )),
      ...stored.map((file) => ({
        messageId: message.id,
        name: file.name.slice(0, 255),
        size: file.size,
        type: file.type || "application/octet-stream",
        blobPathname: file.pathname,
      })),
    ]);
  }

  await db
    .update(tickets)
    .set(
      asRequester
        ? { updatedAt: now }
        : {
            updatedAt: now,
            firstResponseAt: ticket.firstResponseAt ?? now,
            ...(ticket.status === "Open" ? { status: "In Progress" as const } : {}),
          },
    )
    .where(eq(tickets.id, ticket.id));

  if (!asRequester) {
    await notifyRequester(ticket.customerId, {
      title: `${actor.name} replied on ${ticketNumber(ticket.id)}`,
      body: text.slice(0, 80) || "sent an attachment",
      ticketId: ticket.id,
    });
  }

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
  // Joined through the ticket so one organization can never read another's files.
  const [row] = await db
    .select({ file: attachments, customerId: tickets.customerId })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .innerJoin(tickets, eq(tickets.id, messages.ticketId))
    .where(and(eq(attachments.id, id), inTenant(tickets.tenantId)));
  const file = row ? { ...row.file, ticketCustomerId: row.customerId } : undefined;
  if (!file) throw notFound("Attachment");
  return file;
}
