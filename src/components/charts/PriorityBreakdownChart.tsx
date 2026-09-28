"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ReportSummary } from "@/types";
import { TOOLTIP_STYLE } from "./chart-theme";

export function PriorityBreakdownChart({ data }: { data: ReportSummary["priorityMix"] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <p className="flex h-60 items-center justify-center text-sm text-ink-900/45 dark:text-paper-100/45">No tickets in this period</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-ink-900/70 dark:text-paper-100/70">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
