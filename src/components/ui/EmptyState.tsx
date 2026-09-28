import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10">
        <Icon className="h-6 w-6 text-brand-500" />
      </div>
      <h3 className="font-display font-semibold text-ink-900 dark:text-paper-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-900/50 dark:text-paper-100/50">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
