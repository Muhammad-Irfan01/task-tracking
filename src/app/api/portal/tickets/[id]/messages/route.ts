import { blobUploadsSchema } from "@/lib/schemas";
import { attachToMyNewTicket, myThread, replyToMyTicket } from "@/server/domain/portal";
import { badRequest } from "@/server/errors";
import { created, ok, portalRoute } from "@/server/http";

export const GET = portalRoute<{ id: string }>(async ({ params, user }) => ok(await myThread(user, params.id)));

/**
 * Same multipart shape as the desk: `body`, plus `files` or an `uploads` JSON
 * array. `opening=1` adds the files to the ticket's first message instead (the
 * New ticket form) and returns the thread.
 */
export const POST = portalRoute<{ id: string }>(async ({ request, params, user }) => {
  const form = await request.formData().catch(() => {
    throw badRequest("Send the reply as multipart form data");
  });
  const body = String(form.get("body") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const uploads = blobUploadsSchema.safeParse(parseJson(form.get("uploads")));
  if (!uploads.success) throw badRequest("Invalid attachment list");
  if (form.get("opening") === "1") return ok(await attachToMyNewTicket(user, params.id, files, uploads.data));
  return created(await replyToMyTicket(user, params.id, body, files, uploads.data));
});

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
