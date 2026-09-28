import { login } from "@/server/auth";
import { ok, readJson, route } from "@/server/http";
import { clientIp } from "@/server/rate-limit";

export const POST = route(async ({ request }) => ok(await login(await readJson(request), clientIp(request))), { auth: false });
