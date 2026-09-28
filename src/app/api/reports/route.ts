import { buildReport, parseRange } from "@/server/domain/reports";
import { ok, route } from "@/server/http";

export const GET = route(async ({ request }) => ok(await buildReport(parseRange(request.nextUrl.searchParams.get("range")))));
