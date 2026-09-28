"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createSessionStore, type SessionState, type SessionStore } from "@/store/session.store";
import type { SessionUser } from "@/types";

const SessionContext = createContext<SessionStore | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [store] = useState(() => createSessionStore(user));
  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

export function useSession<T>(selector: (state: SessionState) => T): T {
  const store = useContext(SessionContext);
  if (!store) throw new Error("useSession must be used inside <SessionProvider>");
  return useStore(store, selector);
}

export const useCurrentUser = () => useSession((state) => state.user);
