import { createMyTicket, myTickets } from "@/server/domain/portal";
import { created, ok, portalRoute, readJson } from "@/server/http";

export const GET = portalRoute(async ({ user }) => ok(await myTickets(user)));

export const POST = portalRoute(async ({ request, user }) => created(await createMyTicket(user, await readJson(request))));
