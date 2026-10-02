import { ok, route } from "@/server/http";
import { attachmentLimits } from "@/server/storage";

/** Storage and size limits for files picked on the New ticket form, before the ticket exists. */
export const GET = route(async () => ok(attachmentLimits()));
