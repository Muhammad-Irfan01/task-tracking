import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-sm text-ink-900/50 dark:text-paper-100/50">
      {items.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-brand-500">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-ink-900 dark:text-paper-100">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
