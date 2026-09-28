import { badRequest } from "@/server/errors";
import { addReply, getThread } from "@/server/domain/tickets";
import { created, ok, route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params }) => ok(await getThread(params.id)));

/** Accepts multipart form data: `body` plus zero or more `files`. */
export const POST = route<{ id: string }>(async ({ request, params, user }) => {
  const form = await request.formData().catch(() => {
    throw badRequest("Send the reply as multipart form data");
  });
  const body = String(form.get("body") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  return created(await addReply(params.id, body, files, user));
});
