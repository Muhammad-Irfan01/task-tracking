import { useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp so shrinking the list (e.g. new filters) never strands us on an empty page.
  const page = Math.min(requestedPage, totalPages);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage: (next: number) => setRequestedPage(Math.min(Math.max(1, next), totalPages)),
    totalPages,
    paginated,
    pageSize,
  };
}
