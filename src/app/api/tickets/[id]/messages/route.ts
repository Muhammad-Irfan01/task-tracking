import { blobUploadsSchema } from "@/lib/schemas";
import { badRequest } from "@/server/errors";
import { addReply, getThread } from "@/server/domain/tickets";
import { created, ok, route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params }) => ok(await getThread(params.id)));

/**
 * Accepts multipart form data: `body`, plus either zero or more `files`
 * (database storage) or an `uploads` JSON array of blob references.
 * `internal=1` makes it a note only agents see.
 */
export const POST = route<{ id: string }>(async ({ request, params, user }) => {
  const form = await request.formData().catch(() => {
    throw badRequest("Send the reply as multipart form data");
  });
  const body = String(form.get("body") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const uploads = blobUploadsSchema.safeParse(parseJson(form.get("uploads")));
  if (!uploads.success) throw badRequest("Invalid attachment list");
  const internal = form.get("internal") === "1";
  return created(await addReply(params.id, body, files, uploads.data, user, { internal }));
});

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
