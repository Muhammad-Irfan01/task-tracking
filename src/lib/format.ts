import type { Metric } from "@/types";

/** 134 → "2h 14m"; 3000 → "2d 2h". */
export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  if (hours < 24) return `${hours}h ${m % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

type DeltaKind = "percent" | "duration" | "points" | "decimal";

/**
 * Describes how a metric moved versus the previous period.
 * `lowerIsBetter` flips the colour for metrics like response time.
 */
export function describeDelta(metric: Metric, kind: DeltaKind, { lowerIsBetter = false, period = "previous period" } = {}) {
  const { value, previous } = metric;
  if (value === null || previous === null) return { delta: "No prior data", positive: true, trend: "flat" as const };
  const diff = value - previous;
  if (Math.abs(diff) < 1e-9) return { delta: `No change vs ${period}`, positive: true, trend: "flat" as const };
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  let text: string;
  switch (kind) {
    case "percent":
      text = previous === 0 ? `${formatNumber(Math.abs(diff))} more` : `${Math.round(Math.abs(diff / previous) * 100)}%`;
      break;
    case "duration":
      text = `${formatDuration(Math.abs(diff))} ${diff < 0 ? "faster" : "slower"}`;
      break;
    case "points":
      text = `${formatNumber(Math.abs(diff))}pts`;
      break;
    case "decimal":
      text = formatNumber(Math.abs(diff), 1);
      break;
  }
  const direction = kind === "duration" ? "" : diff > 0 ? " higher" : " lower";
  return { delta: `${text}${direction} vs ${period}`, positive: improved, trend: diff > 0 ? ("up" as const) : ("down" as const) };
}
