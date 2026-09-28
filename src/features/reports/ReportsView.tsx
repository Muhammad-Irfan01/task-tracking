"use client";

import { BarChart3, CircleCheck, Clock, Smile } from "lucide-react";
import { DeptLoadChart, PriorityBreakdownChart, TicketVolumeChart } from "@/components/charts";
import { FadeIn } from "@/components/motion/FadeIn";
import { Avatar, Card, ChartSkeleton, ErrorState, PageHeader, StatCard, StatCardSkeleton, Table, Tabs, Td, Tr } from "@/components/ui";
import { useReport } from "@/hooks/useReport";
import { describeDelta, formatDuration, formatNumber } from "@/lib/format";
import type { ReportRange } from "@/types";
import { useState } from "react";

const RANGES = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;
const RANGE_DAYS: Record<(typeof RANGES)[number], ReportRange> = {
  "Last 7 days": 7,
  "Last 30 days": 30,
  "Last 90 days": 90,
};

export function ReportsView() {
  const [label, setLabel] = useState<(typeof RANGES)[number]>("Last 30 days");
  const range = RANGE_DAYS[label];
  const { data, isLoading, error, refetch } = useReport(range);
  const period = `previous ${range} days`;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Performance across agents, departments, and SLA plans" />
      <Card className="px-4 pt-1">
        <Tabs tabs={RANGES} active={label} onChange={setLabel} />
      </Card>

      {error && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!data || isLoading ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Tickets Opened"
              value={formatNumber(data.ticketsOpened.value)}
              {...pick(describeDelta(data.ticketsOpened, "percent", { period }))}
              icon={BarChart3}
              accent="brand"
            />
            <StatCard
              label="Avg. Resolution Time"
              value={formatDuration(data.avgResolution.value)}
              {...pick(describeDelta(data.avgResolution, "duration", { lowerIsBetter: true, period }))}
              icon={Clock}
              accent="amber"
            />
            <StatCard
              label="First-Contact Resolution"
              value={data.firstContactResolution.value === null ? "—" : `${data.firstContactResolution.value}%`}
              {...pick(describeDelta(data.firstContactResolution, "points", { period }))}
              icon={CircleCheck}
              accent="emerald"
            />
            <StatCard
              label="Customer Satisfaction"
              value={data.satisfaction.value === null ? "—" : `${data.satisfaction.value}/5`}
              {...pick(describeDelta(data.satisfaction, "decimal", { period }))}
              icon={Smile}
              accent="brand"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">Ticket Volume Trend</h2>
            <span className="text-xs text-ink-900/40 dark:text-paper-100/40">{range === 90 ? "Weekly" : "Daily"}</span>
          </div>
          {data && !isLoading ? <TicketVolumeChart data={data.volume} /> : <ChartSkeleton height={280} />}
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-paper-100">Priority Mix</h2>
          {data && !isLoading ? <PriorityBreakdownChart data={data.priorityMix} /> : <ChartSkeleton />}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-paper-100">Open Tickets by Department</h2>
          {data ? <DeptLoadChart data={data.departmentLoad} /> : <ChartSkeleton />}
        </Card>
        <Card className="overflow-hidden lg:col-span-3">
          <h2 className="px-5 pb-2 pt-5 font-display font-semibold text-ink-900 dark:text-paper-100">Agent Leaderboard</h2>
          <Table columns={["Agent", "Resolved", "Open", "Avg. resolution"]}>
            {data?.leaderboard.map((row, i) => (
              <Tr key={row.id}>
                <Td>
                  <FadeIn index={i} offset={4} className="flex items-center gap-2.5">
                    <span className="w-4 text-xs font-medium text-ink-900/35 dark:text-paper-100/35">{i + 1}</span>
                    <Avatar name={row.name} color={row.avatarColor} size="sm" />
                    <span className="font-medium text-ink-900 dark:text-paper-100">{row.name}</span>
                  </FadeIn>
                </Td>
                <Td muted>{row.resolved}</Td>
                <Td muted>{row.open}</Td>
                <Td muted>{formatDuration(row.avgResolution)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}

function pick(result: ReturnType<typeof describeDelta>) {
  return { delta: result.delta, deltaPositive: result.positive, trend: result.trend };
}
