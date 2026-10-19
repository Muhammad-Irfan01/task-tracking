import { create } from "zustand";

interface ActivityState {
  /** API requests in flight, not counting silent background polls. */
  requests: number;
  start: () => void;
  finish: () => void;
}

/** Drives the global top progress bar. */
export const useActivityStore = create<ActivityState>()((set) => ({
  requests: 0,
  start: () => set((state) => ({ requests: state.requests + 1 })),
  finish: () => set((state) => ({ requests: Math.max(0, state.requests - 1) })),
}));
