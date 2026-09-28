import { createStore } from "zustand/vanilla";
import type { SessionUser } from "@/types";

export interface SessionState {
  user: SessionUser;
  setUser: (user: SessionUser) => void;
}

/**
 * The signed-in user comes from the server layout, so this store is created per
 * request and provided through context (see <SessionProvider />) instead of
 * being a module singleton that could leak between requests during SSR.
 */
export function createSessionStore(user: SessionUser) {
  return createStore<SessionState>()((set) => ({
    user,
    setUser: (next) => set({ user: next }),
  }));
}

export type SessionStore = ReturnType<typeof createSessionStore>;
