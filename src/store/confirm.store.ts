import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...options, resolve } });
    }),
  settle: (ok) => {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

/** Promise-based replacement for `window.confirm`, rendered by <ConfirmDialog />. */
export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().open(options);
