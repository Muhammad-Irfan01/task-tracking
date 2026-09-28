import { search } from "@/server/domain/search";
import { ok, route } from "@/server/http";

export const GET = route(async ({ request }) => ok(await search(request.nextUrl.searchParams.get("q") ?? "")));
