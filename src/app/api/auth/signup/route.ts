import { signup } from "@/server/auth";
import { created, readJson, route } from "@/server/http";
import { clientIp } from "@/server/rate-limit";

export const POST = route(async ({ request }) => created(await signup(await readJson(request), clientIp(request))), { auth: false });
