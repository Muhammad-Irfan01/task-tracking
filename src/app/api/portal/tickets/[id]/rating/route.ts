import { rateMyTicket } from "@/server/domain/portal";
import { ok, portalRoute, readJson } from "@/server/http";

/** Body `{ rating: 1–5, comment?: string }` — only on the employee's own resolved ticket. */
export const PUT = portalRoute<{ id: string }>(async ({ request, params, user }) =>
  ok(await rateMyTicket(user, params.id, await readJson(request))),
);
