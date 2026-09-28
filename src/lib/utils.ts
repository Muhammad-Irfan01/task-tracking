import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const time = new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value)} · ${time}`;
}

const RELATIVE_UNITS: [string, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function timeAgo(value?: string | null) {
  if (!value) return "—";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) return `${amount} ${unit}${amount > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "in 3 hours" / "2 days ago" relative to now. */
export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const diff = new Date(value).getTime() - Date.now();
  const abs = Math.abs(diff) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size) return rtf.format(Math.round(diff / 1000 / size), unit as Intl.RelativeTimeFormatUnit);
  }
  return rtf.format(Math.round(diff / 60_000), "minute");
}
