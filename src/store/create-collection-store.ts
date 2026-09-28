import { create, type StoreApi, type UseBoundStore } from "zustand";
import { errorMessage } from "@/services/api-client";
import type { ResourceService } from "@/services/resource.service";
import type { AsyncStatus } from "@/types";
import { refreshLoadedStores, registerStore } from "./registry";

export interface CollectionState<T> {
  items: T[];
  status: AsyncStatus;
  error: string | null;
  /** Loads the collection once; pass `force` to refetch. */
  fetch: (force?: boolean) => Promise<void>;
}

export interface CrudState<T extends { id: number }, I> extends CollectionState<T> {
  create: (input: I) => Promise<T>;
  update: (id: number, changes: Partial<I>) => Promise<T>;
  remove: (id: number) => Promise<void>;
}

export type CollectionStore<T> = UseBoundStore<StoreApi<CollectionState<T>>>;
export type CrudStore<T extends { id: number }, I> = UseBoundStore<StoreApi<CrudState<T, I>>>;

/** Cached list store with create/update/remove wired to a REST service. */
export function createCrudStore<T extends { id: number }, I>(key: string, service: ResourceService<T, I>): CrudStore<T, I> {
  const store = create<CrudState<T, I>>()((set, get) => ({
    items: [],
    status: "idle",
    error: null,

    fetch: async (force = false) => {
      const { status } = get();
      if (status === "loading" || (status === "success" && !force)) return;
      // Background refreshes keep showing current data instead of a skeleton.
      if (status !== "success") set({ status: "loading", error: null });
      try {
        set({ items: await service.list(), status: "success", error: null });
      } catch (error) {
        if (get().status !== "success") set({ status: "error", error: errorMessage(error) });
      }
    },

    create: async (input) => {
      const item = await service.create(input);
      set((state) => ({ items: [...state.items, item] }));
      refreshLoadedStores(key);
      return item;
    },

    update: async (id, changes) => {
      const item = await service.update(id, changes);
      set((state) => ({ items: state.items.map((existing) => (existing.id === id ? item : existing)) }));
      refreshLoadedStores(key);
      return item;
    },

    remove: async (id) => {
      await service.remove(id);
      set((state) => ({ items: state.items.filter((existing) => existing.id !== id) }));
      refreshLoadedStores(key);
    },
  }));

  registerStore(key, () => {
    if (store.getState().status === "success") void store.getState().fetch(true);
  });
  return store;
}
