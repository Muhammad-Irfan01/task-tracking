import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

function pageList(page: number, totalPages: number) {
  const pages: (number | "…")[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) pages.push(n);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return pages;
}

const ARROW =
  "p-1.5 rounded-lg hover:bg-ink-900/5 dark:hover:bg-paper-100/10 disabled:opacity-30 disabled:pointer-events-none";

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 text-sm sm:flex-row">
      <p className="text-ink-900/50 dark:text-paper-100/50">
        Showing{" "}
        <span className="font-medium text-ink-900 dark:text-paper-100">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-ink-900 dark:text-paper-100">{total}</span>
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page" className={ARROW}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-ink-900/30 dark:text-paper-100/30">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                n === page
                  ? "bg-brand-500 text-white"
                  : "text-ink-700 hover:bg-ink-900/5 dark:text-paper-100/70 dark:hover:bg-paper-100/10",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={ARROW}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
