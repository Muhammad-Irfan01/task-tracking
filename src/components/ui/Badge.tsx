import type { ReactNode } from "react";
import { STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types";

interface BadgeProps {
  /** Colour tone, borrowed from the ticket status palette. */
  status: TicketStatus;
  children?: ReactNode;
  className?: string;
}

export function Badge({ status, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-ink-900/5 text-ink-600 dark:bg-paper-100/10 dark:text-paper-100/70",
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
