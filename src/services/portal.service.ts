import { upload } from "@vercel/blob/client";
import type { AttachmentLimits, AttachmentStorage, BlobUpload, PortalTicketInput } from "@/lib/schemas";
import type { PortalOptions, Ticket, TicketMessage } from "@/types";
import { apiClient, unwrap } from "./api-client";

/** The employee portal's API: only the signed-in employee's own tickets. */
export const portalService = {
  options: () => unwrap<PortalOptions>(apiClient.get("/portal/options")),
  tickets: () => unwrap<Ticket[]>(apiClient.get("/portal/tickets")),
  ticket: (id: string | number) => unwrap<Ticket>(apiClient.get(`/portal/tickets/${id}`)),
  create: (input: PortalTicketInput) => unwrap<Ticket>(apiClient.post("/portal/tickets", input)),
  setStatus: (id: string | number, status: "Resolved" | "Open") =>
    unwrap<Ticket>(apiClient.patch(`/portal/tickets/${id}`, { status })),
  messages: (id: string | number) => unwrap<TicketMessage[]>(apiClient.get(`/portal/tickets/${id}/messages`)),
  attachmentLimits: (id: string | number) => unwrap<AttachmentLimits>(apiClient.get(`/portal/tickets/${id}/attachments`)),
  async reply(id: string | number, body: string, files: File[], storage: AttachmentStorage) {
    const form = new FormData();
    form.append("body", body);
    if (storage === "blob") {
      // Large files go straight to blob storage; the reply only carries references.
      const uploads: BlobUpload[] = await Promise.all(
        files.map(async (file) => {
          const name = file.name.replace(/[\\/]/g, "_") || "file";
          const blob = await upload(`tickets/${id}/${name}`, file, {
            access: "private",
            handleUploadUrl: `${apiClient.defaults.baseURL}/portal/tickets/${id}/attachments`,
            contentType: file.type || undefined,
            multipart: file.size > 8 * 1024 * 1024,
          });
          return { pathname: blob.pathname, name: file.name.slice(0, 255) };
        }),
      );
      if (uploads.length) form.append("uploads", JSON.stringify(uploads));
    } else {
      for (const file of files) form.append("files", file);
    }
    return unwrap<{ message: TicketMessage; ticket: Ticket }>(
      apiClient.post(`/portal/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } }),
    );
  },
};
