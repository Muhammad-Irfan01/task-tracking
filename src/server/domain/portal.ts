import { and, asc, eq } from "drizzle-orm";
import { portalTicketSchema, toFieldErrors } from "@/lib/schemas";
import type { BlobUpload } from "@/lib/schemas";
import type { PortalOptions, SessionUser } from "@/types";
import { db } from "../db";
import { departments, helpTopics, staff, tickets } from "../db/schema";
import { badRequest, invalid, notFound } from "../errors";
import { inTenant } from "../tenant";
import { notify } from "./notifications";
import { addReply, createTicket, getThread, getTicket, listTickets, ticketRecord, updateTicket } from "./tickets";
import { customerByEmail } from "./shared";
import { ticketNumber } from "../db/seed/people";

/**
 * The employee portal: employees raise tickets to a department and follow
 * only their own. Their tickets are filed under a customer record linked to
 * the account (staff.customer_id), so the desk sees them like any requester.
 */

async function linkedCustomerId(user: SessionUser) {
  const [row] = await db
    .select({ customerId: staff.customerId })
    .from(staff)
    .where(and(eq(staff.id, user.id), inTenant(staff.tenantId)));
  return row?.customerId ?? null;
}

/** The employee's ticket, or 404 — never reveals that someone else's ticket exists. */
async function ownTicket(user: SessionUser, rawId: string | number) {
  const customerId = await linkedCustomerId(user);
  const ticket = await ticketRecord(rawId).catch(() => null);
  if (!ticket || customerId === null || ticket.customerId !== customerId) throw notFound("Ticket");
  return ticket;
}

/** Departments open to employees (public ones) with the help topics routed to each. */
export async function portalOptions(): Promise<PortalOptions> {
  const [depts, topics] = await Promise.all([
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(and(inTenant(departments.tenantId), eq(departments.isPublic, true)))
      .orderBy(asc(departments.name)),
    db
      .select({ id: helpTopics.id, name: helpTopics.name, departmentId: helpTopics.departmentId })
      .from(helpTopics)
      .where(inTenant(helpTopics.tenantId))
      .orderBy(asc(helpTopics.name)),
  ]);
  return {
    departments: depts
      .map((d) => ({ name: d.name, topics: topics.filter((t) => t.departmentId === d.id).map((t) => t.name) }))
      .filter((d) => d.topics.length > 0),
  };
}

export async function myTickets(user: SessionUser) {
  const customerId = await linkedCustomerId(user);
  return customerId === null ? [] : listTickets(eq(tickets.customerId, customerId));
}

export async function createMyTicket(user: SessionUser, raw: unknown) {
  const parsed = portalTicketSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const input = parsed.data;

  const options = await portalOptions();
  const dept = options.departments.find((d) => d.name === input.department);
  if (!dept) throw invalid({ department: "Choose a department" });
  if (!dept.topics.includes(input.topic)) throw invalid({ topic: "Choose a topic from this department" });

  // Reuses the desk's ticket creation: requester record, auto-assignment, SLA and notifications.
  const ticket = await createTicket(
    { ...input, customerName: user.name, customerEmail: user.email },
    user,
  );
  if ((await linkedCustomerId(user)) === null) {
    const customer = await customerByEmail(user.email);
    if (customer) await db.update(staff).set({ customerId: customer.id }).where(and(eq(staff.id, user.id), inTenant(staff.tenantId)));
  }
  return ticket;
}

export async function myTicket(user: SessionUser, rawId: string) {
  const ticket = await ownTicket(user, rawId);
  return getTicket(ticket.id);
}

export async function myThread(user: SessionUser, rawId: string) {
  const ticket = await ownTicket(user, rawId);
  return getThread(ticket.id);
}

export async function replyToMyTicket(user: SessionUser, rawId: string, body: string, files: File[], uploads: BlobUpload[]) {
  const ticket = await ownTicket(user, rawId);
  return addReply(String(ticket.id), body, files, uploads, user, { asRequester: true });
}

/** Employees may only close their ticket (Resolved) or reopen it (Open). */
export async function setMyTicketStatus(user: SessionUser, rawId: string, status: unknown) {
  if (status !== "Resolved" && status !== "Open") throw badRequest("Status must be Resolved or Open");
  const ticket = await ownTicket(user, rawId);
  const updated = await updateTicket(String(ticket.id), { status }, user);
  if (ticket.assigneeId && ticket.assigneeId !== user.id) {
    await notify({
      type: "reply",
      title: `${user.name} ${status === "Resolved" ? "resolved" : "reopened"} ${ticketNumber(ticket.id)}`,
      body: ticket.subject,
      href: `/tickets/${ticket.id}`,
      recipientId: ticket.assigneeId,
    });
  }
  return updated;
}

/** Throws unless the attachment belongs to one of the employee's tickets. */
export async function assertOwnAttachment(user: SessionUser, ticketCustomerId: number) {
  if ((await linkedCustomerId(user)) !== ticketCustomerId) throw notFound("Attachment");
}

/** For blob uploads from the portal: checks ownership, returns the ticket id. */
export async function ownTicketId(user: SessionUser, rawId: string) {
  return (await ownTicket(user, rawId)).id;
}
