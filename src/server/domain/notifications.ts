import { and, desc, eq, inArray } from "drizzle-orm";
import type { AppNotification, NotificationType, SessionUser, UserPreferences } from "@/types";
import { db } from "../db";
import { notificationReads, notifications, tickets, userPreferences } from "../db/schema";
import { ticketNumber } from "../db/seed/people";
import { isoRequired, ticketIsOverdue } from "./shared";

const DEFAULT_PREFERENCES: UserPreferences = { assigned: true, reply: true, sla: true, digest: true, emailUpdates: true };
const STORED_WINDOW = 200;

export async function getPreferences(userId: number): Promise<UserPreferences> {
  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.staffId, userId));
  if (!row) return DEFAULT_PREFERENCES;
  return { assigned: row.assigned, reply: row.reply, sla: row.sla, digest: row.digest, emailUpdates: row.emailUpdates };
}

export async function setPreferences(userId: number, prefs: UserPreferences) {
  await db
    .insert(userPreferences)
    .values({ staffId: userId, ...prefs })
    .onConflictDoUpdate({ target: userPreferences.staffId, set: prefs });
  return prefs;
}

export async function notify(event: { type: NotificationType; title: string; body: string; href: string; recipientId: number }) {
  await db.insert(notifications).values(event);
}

type Candidate = Omit<AppNotification, "read">;

/** Stored events plus SLA breaches derived live from the user's overdue tickets. */
async function candidates(user: SessionUser): Promise<Candidate[]> {
  const [prefs, stored, breached] = await Promise.all([
    getPreferences(user.id),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(STORED_WINDOW),
    db
      .select({ id: tickets.id, subject: tickets.subject, dueAt: tickets.dueAt })
      .from(tickets)
      .where(and(eq(tickets.assigneeId, user.id), ticketIsOverdue))
      .orderBy(desc(tickets.dueAt))
      .limit(50),
  ]);

  const enabled: Record<NotificationType, boolean> = { assigned: prefs.assigned, reply: prefs.reply, sla: prefs.sla };
  const all: Candidate[] = [
    ...stored.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, createdAt: isoRequired(n.createdAt) })),
    ...breached.map((t) => ({
      id: `sla-${t.id}`,
      type: "sla" as const,
      title: `SLA breached on ${ticketNumber(t.id)}`,
      body: t.subject,
      href: `/tickets/${t.id}`,
      createdAt: isoRequired(t.dueAt),
    })),
  ];
  return all.filter((n) => enabled[n.type]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readIds(userId: number, ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const rows = await db
    .select({ id: notificationReads.notificationId })
    .from(notificationReads)
    .where(and(eq(notificationReads.staffId, userId), inArray(notificationReads.notificationId, ids)));
  return new Set(rows.map((r) => r.id));
}

export async function listNotifications(user: SessionUser, limit = 30) {
  const all = await candidates(user);
  const read = await readIds(user.id, all.map((n) => n.id));
  const items: AppNotification[] = all.slice(0, limit).map((n) => ({ ...n, read: read.has(n.id) }));
  return { items, unread: all.filter((n) => !read.has(n.id)).length };
}

export async function markRead(user: SessionUser, ids?: string[]) {
  const targets = ids ?? (await candidates(user)).map((n) => n.id);
  for (let i = 0; i < targets.length; i += 200) {
    const chunk = targets.slice(i, i + 200);
    await db
      .insert(notificationReads)
      .values(chunk.map((notificationId) => ({ staffId: user.id, notificationId })))
      .onConflictDoNothing();
  }
  return listNotifications(user);
}
