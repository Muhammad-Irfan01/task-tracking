import { myTicket, setMyTicketStatus } from "@/server/domain/portal";
import { ok, portalRoute, readJson } from "@/server/http";

export const GET = portalRoute<{ id: string }>(async ({ params, user }) => ok(await myTicket(user, params.id)));

/** Body `{ status: "Resolved" | "Open" }` — employees can close or reopen their own ticket. */
export const PATCH = portalRoute<{ id: string }>(async ({ request, params, user }) => {
  const body = (await readJson(request)) as { status?: unknown };
  return ok(await setMyTicketStatus(user, params.id, body?.status));
});
