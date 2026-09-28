import { useEffect } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { CollectionState } from "@/store/create-collection-store";

/** Subscribes to a collection store and triggers its first fetch on mount. */
export function useCollection<S extends CollectionState<unknown>>(useStore: UseBoundStore<StoreApi<S>>) {
  const items = useStore((state) => state.items) as S["items"];
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);
  const fetch = useStore((state) => state.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    items,
    status,
    error,
    isLoading: status === "idle" || status === "loading",
    refetch: () => fetch(true),
  };
}
