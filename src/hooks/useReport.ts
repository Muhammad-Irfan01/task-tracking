import { useEffect } from "react";
import { useReportsStore } from "@/store/reports.store";
import type { ReportRange } from "@/types";

/** Loads (and caches) the computed report summary for a range. */
export function useReport(range: ReportRange) {
  const entry = useReportsStore((state) => state.byRange[range]);
  const fetch = useReportsStore((state) => state.fetch);

  useEffect(() => {
    void fetch(range);
  }, [fetch, range]);

  return {
    data: entry?.data ?? null,
    isLoading: !entry || entry.status === "idle" || entry.status === "loading",
    error: entry?.status === "error" ? entry.error : null,
    refetch: () => fetch(range, true),
  };
}
