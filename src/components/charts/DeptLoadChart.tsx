"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportSummary } from "@/types";
import { AXIS_TICK, GRID_CLASS, SERIES_COLORS, TOOLTIP_STYLE } from "./chart-theme";

/** Open tickets per department; clicking a bar opens that department's queue. */
export function DeptLoadChart({ data }: { data: ReportSummary["departmentLoad"] }) {
  const router = useRouter();
  const rows = data.map((d) => ({ ...d, short: d.name.split(" ")[0] }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className={GRID_CLASS} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ ...AXIS_TICK, fontSize: 11 }} />
        <YAxis type="category" dataKey="short" tickLine={false} axisLine={false} width={80} tick={AXIS_TICK} />
        <Tooltip
          cursor={{ fill: "rgba(79,70,229,0.06)" }}
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
        />
        <Bar
          dataKey="value"
          name="Open tickets"
          radius={[0, 6, 6, 0]}
          barSize={14}
          className="cursor-pointer"
          onClick={(entry) => {
            const name = (entry as unknown as { name?: string }).name;
            if (name) router.push(`/tickets?department=${encodeURIComponent(name)}`);
          }}
        >
          {rows.map((entry, i) => (
            <Cell key={entry.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
