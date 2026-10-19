import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  /** Runs on confirm while the dialog stays open with a spinner; a rejection rejects `confirm()`. */
  action?: () => Promise<unknown>;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
  reject: (error: unknown) => void;
}

interface ConfirmState {
  request: ConfirmRequest | null;
  busy: boolean;
  open: (options: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => Promise<void>;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  busy: false,
  open: (options) =>
    new Promise<boolean>((resolve, reject) => {
      if (get().busy) return resolve(false);
      get().request?.resolve(false);
      set({ request: { ...options, resolve, reject } });
    }),
  settle: async (ok) => {
    const { request, busy } = get();
    if (!request || busy) return;
    if (ok && request.action) {
      set({ busy: true });
      try {
        await request.action();
        request.resolve(true);
      } catch (error) {
        request.reject(error);
      }
      set({ request: null, busy: false });
      return;
    }
    request.resolve(ok);
    set({ request: null });
  },
}));

/** Promise-based replacement for `window.confirm`, rendered by <ConfirmDialog />. */
export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().open(options);
