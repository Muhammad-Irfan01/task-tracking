import { deleteTicket, getTicket, updateTicket } from "@/server/domain/tickets";
import { ok, readJson, route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params }) => ok(await getTicket(params.id)));

export const PATCH = route<{ id: string }>(async ({ request, params, user }) =>
  ok(await updateTicket(params.id, await readJson(request), user)),
);

export const DELETE = route<{ id: string }>(async ({ params }) => ok(await deleteTicket(params.id)));
