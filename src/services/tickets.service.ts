import { upload } from "@vercel/blob/client";
import type { AttachmentLimits, AttachmentStorage, BlobUpload, TicketCreateInput, TicketUpdateInput } from "@/lib/schemas";
import type { Ticket, TicketMessage } from "@/types";
import { apiClient, unwrap } from "./api-client";

export const ticketsService = {
  list: () => unwrap<Ticket[]>(apiClient.get("/tickets")),
  get: (id: string | number) => unwrap<Ticket>(apiClient.get(`/tickets/${id}`)),
  create: (input: TicketCreateInput) => unwrap<Ticket>(apiClient.post("/tickets", input)),
  update: (id: string | number, changes: TicketUpdateInput) => unwrap<Ticket>(apiClient.patch(`/tickets/${id}`, changes)),
  remove: (id: string | number) => unwrap<{ id: number }>(apiClient.delete(`/tickets/${id}`)),
  messages: (id: string | number) => unwrap<TicketMessage[]>(apiClient.get(`/tickets/${id}/messages`)),
  attachmentLimits: (id: string | number) => unwrap<AttachmentLimits>(apiClient.get(`/tickets/${id}/attachments`)),
  /** Limits for the New ticket form, before there's a ticket id. */
  newTicketAttachmentLimits: () => unwrap<AttachmentLimits>(apiClient.get("/tickets/attachment-limits")),
  /** Files chosen on the New ticket form, added to the ticket's opening message once it exists. */
  attachToNewTicket: async (id: string | number, files: File[], storage: AttachmentStorage) => {
    const form = new FormData();
    form.append("opening", "1");
    if (storage === "blob") {
      const uploads = await Promise.all(files.map((file) => ticketsService.uploadAttachment(id, file)));
      form.append("uploads", JSON.stringify(uploads));
    } else {
      for (const file of files) form.append("files", file);
    }
    return unwrap<TicketMessage[]>(apiClient.post(`/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  /** Sends a file straight to blob storage (bypassing the API body limit) and returns its reference. */
  uploadAttachment: async (id: string | number, file: File): Promise<BlobUpload> => {
    const name = file.name.replace(/[\\/]/g, "_") || "file";
    const blob = await upload(`tickets/${id}/${name}`, file, {
      access: "private",
      handleUploadUrl: `${apiClient.defaults.baseURL}/tickets/${id}/attachments`,
      contentType: file.type || undefined,
      multipart: file.size > 8 * 1024 * 1024,
    });
    return { pathname: blob.pathname, name: file.name.slice(0, 255) };
  },
  reply: (id: string | number, body: string, files: File[] = [], uploads: BlobUpload[] = [], internal = false) => {
    const form = new FormData();
    form.append("body", body);
    if (internal) form.append("internal", "1");
    for (const file of files) form.append("files", file);
    if (uploads.length) form.append("uploads", JSON.stringify(uploads));
    return unwrap<{ message: TicketMessage; ticket: Ticket }>(
      apiClient.post(`/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } }),
    );
  },
};
