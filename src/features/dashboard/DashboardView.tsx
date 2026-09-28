"use client";

import { ArrowUpRight, CircleCheck, Clock, Ticket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DeptLoadChart, PriorityBreakdownChart, TicketVolumeChart } from "@/components/charts";
import { FadeIn } from "@/components/motion/FadeIn";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import {
  Badge,
  Card,
  ChartSkeleton,
  ErrorState,
  PageHeader,
  PriorityDot,
  RowSkeleton,
  StatCard,
  StatCardSkeleton,
} from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useIsClient } from "@/hooks/useIsClient";
import { useReport } from "@/hooks/useReport";
import { describeDelta, formatDuration } from "@/lib/format";
import { greeting, timeAgo } from "@/lib/utils";
import { useTicketsStore } from "@/store";

const PERIOD = "last week";

export function DashboardView() {
  const user = useCurrentUser();
  const isClient = useIsClient();
  const report = useReport(7);
  const tickets = useCollection(useTicketsStore);
  const recent = tickets.items.slice(0, 6);
  const data = report.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${isClient ? greeting() : "Welcome back"}, ${user.firstName}`}
        description="Here's what's happening across the desk today."
        actions={
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-600"
          >
            View all tickets <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      {report.error && (
        <Card>
          <ErrorState message={report.error} onRetry={report.refetch} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Link href="/tickets?status=Open">
              <StatCard
                label="Open Tickets"
                value={data.openTickets}
                {...toDelta(describeDelta(data.ticketsOpened, "percent", { lowerIsBetter: true, period: PERIOD }), "New tickets ")}
                icon={Ticket}
                accent="brand"
              />
            </Link>
            <Link href="/tickets?overdue=1">
              <StatCard
                label="Overdue"
                value={data.overdueTickets}
                delta={data.atRiskTickets ? `${data.atRiskTickets} more due within 12h` : "Nothing else due soon"}
                deltaPositive={data.overdueTickets === 0}
                trend="flat"
                icon={TriangleAlert}
                accent="rose"
              />
            </Link>
            <StatCard
              label="Resolved (7d)"
              value={data.ticketsResolved.value ?? 0}
              {...toDelta(describeDelta(data.ticketsResolved, "percent", { period: PERIOD }))}
              icon={CircleCheck}
              accent="emerald"
            />
            <StatCard
              label="Avg. First Response"
              value={formatDuration(data.avgFirstResponse.value)}
              {...toDelta(describeDelta(data.avgFirstResponse, "duration", { lowerIsBetter: true, period: PERIOD }))}
              icon={Clock}
              accent="amber"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">Ticket Volume</h2>
            <span className="text-xs text-ink-900/40 dark:text-paper-100/40">Last 7 days</span>
          </div>
          {data ? <TicketVolumeChart data={data.volume} /> : <ChartSkeleton height={280} />}
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-paper-100">Priority Breakdown</h2>
          {data ? <PriorityBreakdownChart data={data.priorityMix} /> : <ChartSkeleton />}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-paper-100">Department Load</h2>
          {data ? <DeptLoadChart data={data.departmentLoad} /> : <ChartSkeleton />}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">Recent Tickets</h2>
            <Link href="/tickets" className="text-xs font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </div>
          {tickets.status === "error" && <ErrorState message={tickets.error} onRetry={tickets.refetch} />}
          <div className="divide-y divide-ink-900/[0.06] dark:divide-paper-100/[0.06]">
            {tickets.isLoading && Array.from({ length: 5 }, (_, i) => <RowSkeleton key={i} />)}
            {recent.map((ticket, i) => (
              <FadeIn key={ticket.id} index={i}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-ink-900/[0.02] dark:hover:bg-paper-100/[0.03]"
                >
                  <PriorityDot priority={ticket.priority} pulse />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900 transition-colors group-hover:text-brand-500 dark:text-paper-100">
                      {ticket.subject}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-900/45 dark:text-paper-100/45">
                      {ticket.number} · {ticket.customer}
                    </p>
                  </div>
                  {ticket.isOverdue && ticket.status !== "Overdue" ? <Badge status="Overdue">Overdue</Badge> : <Badge status={ticket.status} />}
                  <span className="hidden w-20 text-right text-xs text-ink-900/40 sm:inline dark:text-paper-100/40">
                    {timeAgo(ticket.updated)}
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function toDelta(result: ReturnType<typeof describeDelta>, prefix = "") {
  return { delta: `${prefix}${result.delta}`, deltaPositive: result.positive, trend: result.trend };
}
