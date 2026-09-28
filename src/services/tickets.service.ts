import { upload } from "@vercel/blob/client";
import type { AttachmentLimits, BlobUpload, TicketCreateInput, TicketUpdateInput } from "@/lib/schemas";
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
  reply: (id: string | number, body: string, files: File[] = [], uploads: BlobUpload[] = []) => {
    const form = new FormData();
    form.append("body", body);
    for (const file of files) form.append("files", file);
    if (uploads.length) form.append("uploads", JSON.stringify(uploads));
    return unwrap<{ message: TicketMessage; ticket: Ticket }>(
      apiClient.post(`/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } }),
    );
  },
};
