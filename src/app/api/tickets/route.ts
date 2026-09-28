import { createTicket, listTickets } from "@/server/domain/tickets";
import { created, ok, readJson, route } from "@/server/http";

export const GET = route(async () => ok(await listTickets()));

export const POST = route(async ({ request, user }) => created(await createTicket(await readJson(request), user)));
