import { create } from "zustand";
import { notificationsService } from "@/services";
import type { AppNotification } from "@/types";
import { registerStore } from "./registry";

interface NotificationsState {
  items: AppNotification[];
  unread: number;
  loaded: boolean;
  fetch: () => Promise<void>;
  markRead: (ids?: string[]) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  items: [],
  unread: 0,
  loaded: false,
  fetch: async () => {
    try {
      const feed = await notificationsService.list();
      set({ ...feed, loaded: true });
    } catch {
      // Polling failures are non-fatal; the next tick will retry.
    }
  },
  markRead: async (ids) => {
    // Optimistic: flip locally, then reconcile with the server's view.
    set((state) => {
      const items = state.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n));
      return { items, unread: ids ? Math.max(0, state.unread - ids.length) : 0 };
    });
    const feed = await notificationsService.markRead(ids);
    set({ ...feed, loaded: true });
  },
}));

registerStore("notifications", () => {
  if (useNotificationsStore.getState().loaded) void useNotificationsStore.getState().fetch();
});
