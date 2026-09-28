import { PRIORITY_DOT_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TicketPriority } from "@/types";

interface PriorityDotProps {
  priority: TicketPriority;
  /** Adds the pulsing ring for Emergency tickets. */
  pulse?: boolean;
}

export function PriorityDot({ priority, pulse = false }: PriorityDotProps) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5" aria-label={`${priority} priority`}>
      {pulse && priority === "Emergency" && (
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-rose-500" />
      )}
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          PRIORITY_DOT_STYLES[priority] ?? "bg-slate-400",
        )}
      />
    </span>
  );
}
