import type { TicketCreateInput, TicketUpdateInput } from "@/lib/schemas";
import type { Ticket, TicketMessage } from "@/types";
import { apiClient, unwrap } from "./api-client";

export const ticketsService = {
  list: () => unwrap<Ticket[]>(apiClient.get("/tickets")),
  get: (id: string | number) => unwrap<Ticket>(apiClient.get(`/tickets/${id}`)),
  create: (input: TicketCreateInput) => unwrap<Ticket>(apiClient.post("/tickets", input)),
  update: (id: string | number, changes: TicketUpdateInput) => unwrap<Ticket>(apiClient.patch(`/tickets/${id}`, changes)),
  remove: (id: string | number) => unwrap<{ id: number }>(apiClient.delete(`/tickets/${id}`)),
  messages: (id: string | number) => unwrap<TicketMessage[]>(apiClient.get(`/tickets/${id}/messages`)),
  reply: (id: string | number, body: string, files: File[] = []) => {
    const form = new FormData();
    form.append("body", body);
    for (const file of files) form.append("files", file);
    return unwrap<{ message: TicketMessage; ticket: Ticket }>(
      apiClient.post(`/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } }),
    );
  },
};
