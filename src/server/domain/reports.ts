import { and, asc, eq, gte, or, sql } from "drizzle-orm";
import { TICKET_PRIORITIES } from "@/lib/constants";
import type { Metric, ReportRange, ReportSummary, VolumePoint } from "@/types";
import { db } from "../db";
import { departments, messages, staff, tickets } from "../db/schema";
import { countSql, q, ticketIsOpen, ticketIsOpenQ, ticketIsOverdue } from "./shared";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface WindowRow {
  created: number;
  resolved: number | null;
  firstResponse: number | null;
  rating: number | null;
  priority: string;
  assigneeId: number | null;
  staffReplies: number;
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const round = (value: number | null, digits = 0) => (value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits);
const inWindow = (t: number | null, start: number, end: number) => t !== null && t >= start && t < end;

function windowStats(rows: WindowRow[], start: number, end: number) {
  const opened = rows.filter((t) => inWindow(t.created, start, end));
  const resolved = rows.filter((t) => inWindow(t.resolved, start, end));
  const responded = opened.filter((t) => t.firstResponse !== null);
  const ratings = resolved.flatMap((t) => (t.rating ? [t.rating] : []));
  return {
    opened: opened.length,
    resolved: resolved.length,
    firstResponse: round(average(responded.map((t) => (t.firstResponse! - t.created) / 60_000))),
    resolution: round(average(resolved.map((t) => (t.resolved! - t.created) / 60_000))),
    fcr: resolved.length ? round((resolved.filter((t) => t.staffReplies <= 1).length / resolved.length) * 100) : null,
    satisfaction: round(average(ratings), 1),
  };
}

function startOfDay(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function volume(rows: WindowRow[], range: ReportRange, now: number): VolumePoint[] {
  const bucketDays = range === 90 ? 7 : 1;
  const buckets = Math.ceil(range / bucketDays);
  const firstStart = startOfDay(now) - (buckets - 1) * bucketDays * DAY;
  return Array.from({ length: buckets }, (_, i) => {
    const start = firstStart + i * bucketDays * DAY;
    const end = start + bucketDays * DAY;
    const label =
      range === 7
        ? new Date(start).toLocaleDateString("en-US", { weekday: "short" })
        : new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      label,
      opened: rows.filter((t) => inWindow(t.created, start, end)).length,
      resolved: rows.filter((t) => inWindow(t.resolved, start, end)).length,
    };
  });
}

const metric = (value: number | null, previous: number | null): Metric => ({ value, previous });
const time = (d: Date | null) => (d ? new Date(d).getTime() : null);

export async function buildReport(range: ReportRange): Promise<ReportSummary> {
  const now = Date.now();
  const since = new Date(now - 2 * range * DAY);

  const [windowRows, openTotals, deptLoad, agents] = await Promise.all([
    // Only tickets touching the current or previous window are loaded.
    db
      .select({
        created: tickets.createdAt,
        resolved: tickets.resolvedAt,
        firstResponse: tickets.firstResponseAt,
        rating: tickets.rating,
        priority: tickets.priority,
        assigneeId: tickets.assigneeId,
        staffReplies: sql<number>`(select count(*)::int from ${messages} where ${q(messages.ticketId)} = ${q(tickets.id)} and ${q(messages.isStaff)})`,
      })
      .from(tickets)
      .where(or(gte(tickets.createdAt, since), gte(tickets.resolvedAt, since))),
    db
      .select({
        open: countSql,
        overdue: sql<number>`count(*) filter (where ${ticketIsOverdue})::int`,
        atRisk: sql<number>`count(*) filter (where not ${ticketIsOverdue} and ${tickets.dueAt} < now() + interval '12 hours')::int`,
      })
      .from(tickets)
      .where(ticketIsOpen),
    db
      .select({
        name: departments.name,
        value: sql<number>`(select count(*)::int from ${tickets} where ${q(tickets.departmentId)} = ${q(departments.id)} and ${ticketIsOpenQ})`,
      })
      .from(departments)
      .orderBy(asc(departments.id)),
    db
      .select({
        id: staff.id,
        name: staff.name,
        avatarColor: staff.avatarColor,
        open: sql<number>`(select count(*)::int from ${tickets} where ${q(tickets.assigneeId)} = ${q(staff.id)} and ${ticketIsOpenQ})`,
      })
      .from(staff)
      .where(and(eq(staff.active, true))),
  ]);

  const rows: WindowRow[] = windowRows.map((r) => ({
    created: time(r.created)!,
    resolved: time(r.resolved),
    firstResponse: time(r.firstResponse),
    rating: r.rating,
    priority: r.priority,
    assigneeId: r.assigneeId,
    staffReplies: Number(r.staffReplies),
  }));

  const start = now - range * DAY;
  const current = windowStats(rows, start, now + 1);
  const previous = windowStats(rows, now - 2 * range * DAY, start);
  const createdInRange = rows.filter((t) => inWindow(t.created, start, now + 1));
  const resolvedInRange = rows.filter((t) => inWindow(t.resolved, start, now + 1));
  const totals = openTotals[0] ?? { open: 0, overdue: 0, atRisk: 0 };

  return {
    range,
    openTickets: Number(totals.open),
    overdueTickets: Number(totals.overdue),
    atRiskTickets: Number(totals.atRisk),
    ticketsOpened: metric(current.opened, previous.opened),
    ticketsResolved: metric(current.resolved, previous.resolved),
    avgFirstResponse: metric(current.firstResponse, previous.firstResponse),
    avgResolution: metric(current.resolution, previous.resolution),
    firstContactResolution: metric(current.fcr, previous.fcr),
    satisfaction: metric(current.satisfaction, previous.satisfaction),
    volume: volume(rows, range, now),
    priorityMix: TICKET_PRIORITIES.map((p) => ({
      name: p.name,
      color: p.color,
      value: createdInRange.filter((t) => t.priority === p.name).length,
    })),
    departmentLoad: deptLoad.map((d) => ({ name: d.name, value: Number(d.value) })).sort((a, b) => b.value - a.value),
    leaderboard: agents
      .map((agent) => {
        const resolved = resolvedInRange.filter((t) => t.assigneeId === agent.id);
        return {
          id: agent.id,
          name: agent.name,
          avatarColor: agent.avatarColor,
          resolved: resolved.length,
          open: Number(agent.open),
          avgResolution: round(average(resolved.map((t) => (t.resolved! - t.created) / 60_000))),
        };
      })
      .sort((a, b) => b.resolved - a.resolved || a.name.localeCompare(b.name)),
  };
}

export function parseRange(value: string | null): ReportRange {
  return value === "30" ? 30 : value === "90" ? 90 : 7;
}
