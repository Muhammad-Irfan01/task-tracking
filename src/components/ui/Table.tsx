import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-900/[0.06] text-left text-xs uppercase tracking-wider text-ink-900/40 dark:border-paper-100/[0.06] dark:text-paper-100/40">
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-900/[0.05] dark:divide-paper-100/[0.05]">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-ink-900/[0.02] dark:hover:bg-paper-100/[0.03]", className)}
      {...props}
    />
  );
}

export function Td({ className, muted, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { muted?: boolean }) {
  return (
    <td
      className={cn("px-4 py-3.5", muted && "text-ink-700 dark:text-paper-100/70", className)}
      {...props}
    />
  );
}
