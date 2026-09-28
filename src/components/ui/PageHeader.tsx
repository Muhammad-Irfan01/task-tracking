import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-900/50 dark:text-paper-100/50">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
