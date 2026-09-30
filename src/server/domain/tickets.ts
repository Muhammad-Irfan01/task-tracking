import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { after } from "next/server";
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
  userPreferences,
} from "../db/schema";
import { INDEPENDENT_ORG } from "../db/provision";
import { ticketNumber } from "../db/seed/people";
import { badRequest, invalid, notFound } from "../errors";
import { sendMail } from "../mail";
import { currentAppUrl } from "../password-reset";
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

/** `requester`: the portal's view — internal notes aren't counted. */
function ticketQuery(where?: SQL, { requester = false } = {}) {
  const counted = requester ? sql`and ${q(messages.isInternal)} = false` : sql``;
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
      ratingComment: tickets.ratingComment,
      isOverdue: ticketIsOverdue,
      messages: sql<number>`(select count(*)::int from ${messages} where ${q(messages.ticketId)} = ${q(tickets.id)} ${counted})`,
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

export async function listTickets(where?: SQL, options?: { requester?: boolean }) {
  return (await ticketQuery(where, options).orderBy(desc(tickets.updatedAt))).map(toTicket);
}

export async function getTicket(rawId: string | number, options?: { requester?: boolean }) {
  const id = parseId(rawId);
  const [row] = id ? await ticketQuery(eq(tickets.id, id), options) : [];
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

/** `includeInternal: false` is the requester's view: agents' internal notes are left out entirely. */
export async function getThread(rawId: string | number, { includeInternal = true } = {}): Promise<TicketMessage[]> {
  const ticket = await ticketRecord(rawId);
  const rows = await db
    .select({
      id: messages.id,
      isStaff: messages.isStaff,
      isInternal: messages.isInternal,
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
    .where(and(eq(messages.ticketId, ticket.id), includeInternal ? undefined : eq(messages.isInternal, false)))
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
    isInternal: row.isInternal,
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

/**
 * Tells the employee who raised a ticket (if a portal user did) about agent
 * activity: in the portal, and by email unless they turned emails off.
 */
async function notifyRequester(
  customerId: number,
  event: { title: string; body: string; ticketId: number; subject: string; email: string },
  actor: SessionUser,
) {
  const [requester] = await db
    .select({ id: staff.id, name: staff.name, email: staff.email, emailUpdates: userPreferences.emailUpdates })
    .from(staff)
    .leftJoin(userPreferences, eq(userPreferences.staffId, staff.id))
    .where(and(eq(staff.customerId, customerId), eq(staff.kind, "employee"), eq(staff.active, true), inTenant(staff.tenantId)))
    .limit(1);
  if (!requester) return;
  const href = `/portal/tickets/${event.ticketId}`;
  await notify({ type: "reply", title: event.title, body: event.body, href, recipientId: requester.id });

  if (requester.emailUpdates === false) return;
  const url = `${await currentAppUrl()}${href}`;
  // Sent after the response so a slow mail server never delays the agent.
  after(() =>
    sendMail({
      to: requester.email,
      subject: `[${ticketNumber(event.ticketId)}] ${event.subject}`,
      text: `Hi ${requester.name.split(" ")[0]},\n\n${event.email}\n\nView the ticket and reply: ${url}\n\n— The ${actor.tenantName} team\n\nYou get these emails for tickets you raised. Turn them off under Account in the request portal.`,
    }),
  );
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
    Object.assign(set, { resolvedAt: null, rating: null, ratingComment: null, dueAt: new Date(now.getTime() + grace * HOUR) });
  }

  await db.update(tickets).set(set).where(eq(tickets.id, current.id));
  if (assigneeId && assigneeId !== current.assigneeId) await notifyAssignee(current.id, current.subject, assigneeId, actor);
  if (changes.status && changes.status !== current.status && actor.kind !== "employee") {
    await notifyRequester(
      current.customerId,
      {
        title: `${ticketNumber(current.id)} is now ${changes.status}`,
        body: current.subject,
        ticketId: current.id,
        subject: current.subject,
        email: isClosedStatus(changes.status)
          ? `Your ticket ${ticketNumber(current.id)} was marked ${changes.status} by ${actor.name}. If you still need help, reopen it from the portal.`
          : `Your ticket ${ticketNumber(current.id)} is now ${changes.status}.`,
      },
      actor,
    );
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
 * Checks and stores a message's files: `files` are posted inline (database
 * storage); `uploads` reference files the browser already put in blob storage
 * under this ticket's prefix. Sizes come from the store, not the client.
 */
async function prepareAttachments(ticketId: number, files: File[], uploads: BlobUpload[]) {
  const limits = attachmentLimits();
  if (limits.storage === "database" && uploads.length) throw badRequest("File storage isn't configured");
  if (limits.storage === "blob" && files.length) throw badRequest("Upload files to storage before sending the reply");

  const prefix = ticketBlobPrefix(ticketId);
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

  return async (messageId: number) => {
    if (!files.length && !stored.length) return;
    await db.insert(attachments).values([
      ...(await Promise.all(
        files.map(async (file) => ({
          messageId,
          name: file.name.slice(0, 255),
          size: file.size,
          type: file.type || "application/octet-stream",
          data: Buffer.from(await file.arrayBuffer()),
        })),
      )),
      ...stored.map((file) => ({
        messageId,
        name: file.name.slice(0, 255),
        size: file.size,
        type: file.type || "application/octet-stream",
        blobPathname: file.pathname,
      })),
    ]);
  };
}

/**
 * Adds a message to a ticket. Agents reply as staff, or leave an `internal`
 * note only agents see; `asRequester` (the portal) posts as the person who
 * raised the ticket and leaves the SLA clock alone.
 */
export async function addReply(
  rawId: string,
  body: string,
  files: File[],
  uploads: BlobUpload[],
  actor: SessionUser,
  { asRequester = false, internal = false } = {},
) {
  const ticket = await ticketRecord(rawId);
  const text = body.trim();
  if (asRequester && internal) throw badRequest("Only agents can add internal notes");
  if (!text && files.length === 0 && uploads.length === 0) throw invalid({ body: internal ? "Write a note or attach a file" : "Write a reply or attach a file" });
  const saveFiles = await prepareAttachments(ticket.id, files, uploads);

  const now = new Date();
  const [message] = await db
    .insert(messages)
    .values({ ticketId: ticket.id, isStaff: !asRequester, isInternal: internal, authorStaffId: actor.id, authorName: actor.name, body: text, createdAt: now })
    .returning({ id: messages.id });
  await saveFiles(message.id);

  // An internal note isn't a response to the requester: no SLA or status change.
  await db
    .update(tickets)
    .set(
      asRequester || internal
        ? { updatedAt: now }
        : {
            updatedAt: now,
            firstResponseAt: ticket.firstResponseAt ?? now,
            ...(ticket.status === "Open" ? { status: "In Progress" as const } : {}),
          },
    )
    .where(eq(tickets.id, ticket.id));

  if (!asRequester && !internal) {
    const attached = files.length + uploads.length;
    await notifyRequester(
      ticket.customerId,
      {
        title: `${actor.name} replied on ${ticketNumber(ticket.id)}`,
        body: text.slice(0, 80) || "sent an attachment",
        ticketId: ticket.id,
        subject: ticket.subject,
        email: `${actor.name} replied to your ticket ${ticketNumber(ticket.id)}:\n\n${text || "(no message)"}${attached ? `\n\n[${attached} attachment${attached === 1 ? "" : "s"} — open the ticket to download]` : ""}`,
      },
      actor,
    );
  }

  if (ticket.assigneeId && ticket.assigneeId !== actor.id) {
    await notify({
      type: "reply",
      title: `${internal ? "Internal note" : "New reply"} on ${ticketNumber(ticket.id)}`,
      body: `${actor.name}: ${text.slice(0, 80) || "sent an attachment"}`,
      href: `/tickets/${ticket.id}`,
      recipientId: ticket.assigneeId,
    });
  }

  const thread = await getThread(ticket.id);
  return {
    message: thread.find((m) => m.id === String(message.id))!,
    ticket: await getTicket(ticket.id, { requester: asRequester }),
  };
}

/**
 * Adds files to the message that opened the ticket — how the portal attaches
 * files picked on the New ticket form (blob uploads need the ticket id first).
 * Only while the opening message is still the whole conversation.
 */
export async function attachToOpeningMessage(ticketId: number, files: File[], uploads: BlobUpload[]) {
  const thread = await db
    .select({ id: messages.id, isStaff: messages.isStaff })
    .from(messages)
    .where(eq(messages.ticketId, ticketId))
    .orderBy(asc(messages.createdAt), asc(messages.id))
    .limit(2);
  if (thread.length !== 1 || thread[0].isStaff) throw badRequest("Add files in a reply instead");
  const existing = await db.select({ id: attachments.id }).from(attachments).where(eq(attachments.messageId, thread[0].id)).limit(1);
  if (existing.length) throw badRequest("Add files in a reply instead");
  if (!files.length && !uploads.length) throw badRequest("Choose files to attach");
  const saveFiles = await prepareAttachments(ticketId, files, uploads);
  await saveFiles(thread[0].id);
  return getThread(ticketId, { includeInternal: false });
}

export async function getAttachment(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Attachment");
  // Joined through the ticket so one organization can never read another's files.
  const [row] = await db
    .select({ file: attachments, customerId: tickets.customerId, isInternal: messages.isInternal })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .innerJoin(tickets, eq(tickets.id, messages.ticketId))
    .where(and(eq(attachments.id, id), inTenant(tickets.tenantId)));
  const file = row ? { ...row.file, ticketCustomerId: row.customerId, isInternal: row.isInternal } : undefined;
  if (!file) throw notFound("Attachment");
  return file;
}
