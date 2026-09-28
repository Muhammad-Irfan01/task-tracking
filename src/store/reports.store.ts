import { create } from "zustand";
import { errorMessage, reportsService } from "@/services";
import type { AsyncStatus, ReportRange, ReportSummary } from "@/types";
import { registerStore } from "./registry";

interface ReportEntry {
  status: AsyncStatus;
  error: string | null;
  data: ReportSummary | null;
}

interface ReportsState {
  byRange: Partial<Record<ReportRange, ReportEntry>>;
  fetch: (range: ReportRange, force?: boolean) => Promise<void>;
}

export const useReportsStore = create<ReportsState>()((set, get) => ({
  byRange: {},
  fetch: async (range, force = false) => {
    const entry = get().byRange[range];
    if (entry?.status === "loading" || (entry?.status === "success" && !force)) return;
    const patch = (next: Partial<ReportEntry>) =>
      set((state) => ({
        byRange: { ...state.byRange, [range]: { status: "idle", error: null, data: null, ...state.byRange[range], ...next } },
      }));
    if (entry?.status !== "success") patch({ status: "loading", error: null });
    try {
      patch({ status: "success", error: null, data: await reportsService.summary(range) });
    } catch (error) {
      if (get().byRange[range]?.status !== "success") patch({ status: "error", error: errorMessage(error) });
    }
  },
}));

registerStore("reports", () => {
  const { byRange, fetch } = useReportsStore.getState();
  for (const [range, entry] of Object.entries(byRange)) {
    if (entry?.status === "success") void fetch(Number(range) as ReportRange, true);
  }
});
