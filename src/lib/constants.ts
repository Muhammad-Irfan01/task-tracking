import type { TicketPriority, TicketSource, TicketStatus } from "@/types";

export const APP_NAME = "Threadline";

export const TICKET_STATUSES: {
  id: number;
  name: TicketStatus;
  state: "open" | "closed";
}[] = [
  { id: 1, name: "Open", state: "open" },
  { id: 2, name: "In Progress", state: "open" },
  { id: 3, name: "On Hold", state: "open" },
  { id: 4, name: "Resolved", state: "closed" },
  { id: 5, name: "Closed", state: "closed" },
  { id: 6, name: "Overdue", state: "open" },
];

export const TICKET_PRIORITIES: {
  id: number;
  name: TicketPriority;
  color: string;
  urgency: number;
}[] = [
  { id: 1, name: "Low", color: "#64748B", urgency: 1 },
  { id: 2, name: "Normal", color: "#4F46E5", urgency: 2 },
  { id: 3, name: "High", color: "#F59E0B", urgency: 3 },
  { id: 4, name: "Emergency", color: "#EF4444", urgency: 4 },
];

export const TICKET_SOURCES: TicketSource[] = [
  "Web",
  "Email",
  "Phone",
  "API",
  "Other",
];

/** Badge styles keyed by ticket status; other badges reuse these tones. */
export const STATUS_STYLES: Record<TicketStatus, string> = {
  Open: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 ring-1 ring-inset ring-brand-500/20",
  "In Progress":
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20",
  "On Hold":
    "bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/20",
  Resolved:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  Closed:
    "bg-ink-900/5 text-ink-500 dark:bg-paper-100/10 dark:text-paper-100/50 ring-1 ring-inset ring-ink-900/10",
  Overdue:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20",
};

export const PRIORITY_DOT_STYLES: Record<TicketPriority, string> = {
  Low: "bg-slate-400",
  Normal: "bg-brand-500",
  High: "bg-amber-500",
  Emergency: "bg-rose-500",
};

export const THEME_STORAGE_KEY = "threadline-theme";

export const SESSION_COOKIE = "threadline_session";

export const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-brand-400",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-brand-600",
  "bg-rose-400",
  "bg-emerald-400",
];

export function isClosedStatus(status: TicketStatus) {
  return status === "Resolved" || status === "Closed";
}
