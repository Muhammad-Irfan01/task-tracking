import { create } from "zustand";
import type { TicketCreateInput, TicketUpdateInput } from "@/lib/schemas";
import { errorMessage, ticketsService } from "@/services";
import type { AsyncStatus, Ticket, TicketMessage, TicketPriority, TicketStatus } from "@/types";
import type { CollectionState } from "./create-collection-store";
import { refreshLoadedStores, registerStore } from "./registry";

export type TicketSort = "updated" | "created" | "priority" | "due";

export interface TicketFilters {
  query: string;
  status: TicketStatus | "All";
  priority: TicketPriority | "All";
  department: string;
  assignee: string;
  overdueOnly: boolean;
  sort: TicketSort;
}

interface TicketDetail {
  status: AsyncStatus;
  error: string | null;
  messages: TicketMessage[];
}

interface TicketsState extends CollectionState<Ticket> {
  filters: TicketFilters;
  details: Record<string, TicketDetail>;
  setFilter: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void;
  setFilters: (filters: Partial<TicketFilters>) => void;
  resetFilters: () => void;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (input: TicketCreateInput) => Promise<Ticket>;
  updateTicket: (id: number, changes: TicketUpdateInput) => Promise<Ticket>;
  deleteTicket: (id: number) => Promise<void>;
  reply: (id: number, body: string, files?: File[]) => Promise<TicketMessage>;
}

export const DEFAULT_TICKET_FILTERS: TicketFilters = {
  query: "",
  status: "All",
  priority: "All",
  department: "All",
  assignee: "All",
  overdueOnly: false,
  sort: "updated",
};
const EMPTY_DETAIL: TicketDetail = { status: "idle", error: null, messages: [] };

function upsert(items: Ticket[], ticket: Ticket) {
  const exists = items.some((t) => t.id === ticket.id);
  return exists ? items.map((t) => (t.id === ticket.id ? ticket : t)) : [ticket, ...items];
}

export const useTicketsStore = create<TicketsState>()((set, get) => ({
  items: [],
  status: "idle",
  error: null,
  filters: DEFAULT_TICKET_FILTERS,
  details: {},

  fetch: async (force = false) => {
    const { status } = get();
    if (status === "loading" || (status === "success" && !force)) return;
    if (status !== "success") set({ status: "loading", error: null });
    try {
      set({ items: await ticketsService.list(), status: "success", error: null });
    } catch (error) {
      if (get().status !== "success") set({ status: "error", error: errorMessage(error) });
    }
  },

  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: DEFAULT_TICKET_FILTERS }),

  fetchTicket: async (id) => {
    const patchDetail = (patch: Partial<TicketDetail>) =>
      set((state) => ({
        details: { ...state.details, [id]: { ...(state.details[id] ?? EMPTY_DETAIL), ...patch } },
      }));

    const current = get().details[id]?.status;
    if (current === "loading") return;
    if (current !== "success") patchDetail({ status: "loading", error: null });
    try {
      const [ticket, messages] = await Promise.all([ticketsService.get(id), ticketsService.messages(id)]);
      set((state) => ({ items: upsert(state.items, ticket) }));
      patchDetail({ status: "success", error: null, messages });
    } catch (error) {
      patchDetail({ status: "error", error: errorMessage(error) });
    }
  },

  createTicket: async (input) => {
    const ticket = await ticketsService.create(input);
    set((state) => ({ items: upsert(state.items, ticket) }));
    refreshLoadedStores("tickets");
    return ticket;
  },

  updateTicket: async (id, changes) => {
    const ticket = await ticketsService.update(id, changes);
    set((state) => ({ items: upsert(state.items, ticket) }));
    refreshLoadedStores("tickets");
    return ticket;
  },

  deleteTicket: async (id) => {
    await ticketsService.remove(id);
    set((state) => {
      const details = { ...state.details };
      delete details[String(id)];
      return { items: state.items.filter((t) => t.id !== id), details };
    });
    refreshLoadedStores("tickets");
  },

  reply: async (id, body, files = []) => {
    const { message, ticket } = await ticketsService.reply(id, body, files);
    const key = String(id);
    set((state) => {
      const detail = state.details[key] ?? { ...EMPTY_DETAIL, status: "success" as const };
      return {
        items: upsert(state.items, ticket),
        details: { ...state.details, [key]: { ...detail, messages: [...detail.messages, message] } },
      };
    });
    refreshLoadedStores("tickets");
    return message;
  },
}));

registerStore("tickets", () => {
  const state = useTicketsStore.getState();
  if (state.status === "success") void state.fetch(true);
  // Keep any open ticket detail views in sync too.
  for (const [id, detail] of Object.entries(state.details)) {
    if (detail.status === "success") void state.fetchTicket(id);
  }
});

const PRIORITY_RANK: Record<TicketPriority, number> = { Emergency: 0, High: 1, Normal: 2, Low: 3 };

/** Applies search, filters and sort order to a ticket list. */
export function filterTickets(tickets: Ticket[], filters: TicketFilters) {
  const needle = filters.query.trim().toLowerCase();
  const filtered = tickets.filter((ticket) => {
    const matchesQuery =
      !needle ||
      ticket.subject.toLowerCase().includes(needle) ||
      ticket.number.toLowerCase().includes(needle) ||
      ticket.customer.toLowerCase().includes(needle) ||
      ticket.organization.toLowerCase().includes(needle);
    return (
      matchesQuery &&
      (filters.status === "All" || ticket.status === filters.status) &&
      (filters.priority === "All" || ticket.priority === filters.priority) &&
      (filters.department === "All" || ticket.department === filters.department) &&
      (filters.assignee === "All" || ticket.assignee === filters.assignee) &&
      (!filters.overdueOnly || ticket.isOverdue)
    );
  });

  const compare: Record<TicketSort, (a: Ticket, b: Ticket) => number> = {
    updated: (a, b) => b.updated.localeCompare(a.updated),
    created: (a, b) => b.created.localeCompare(a.created),
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.updated.localeCompare(a.updated),
    due: (a, b) => a.dueAt.localeCompare(b.dueAt),
  };
  return filtered.sort(compare[filters.sort]);
}
