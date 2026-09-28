"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VolumePoint } from "@/types";
import { AXIS_TICK, GRID_CLASS } from "./chart-theme";

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

function VolumeTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-ink-900 dark:text-paper-100">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function TicketVolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="volume-opened" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="volume-resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className={GRID_CLASS} />
        <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tickLine={false} axisLine={false} tick={AXIS_TICK} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={30} allowDecimals={false} />
        <Tooltip content={<VolumeTooltip />} />
        <Area type="monotone" dataKey="opened" name="Opened" stroke="#4F46E5" strokeWidth={2} fill="url(#volume-opened)" />
        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={2} fill="url(#volume-resolved)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
