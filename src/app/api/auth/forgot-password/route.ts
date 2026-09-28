import { requestPasswordReset } from "@/server/auth";
import { ok, readJson, route } from "@/server/http";
import { clientIp } from "@/server/rate-limit";

export const POST = route(
  async ({ request }) =>
    ok(await requestPasswordReset(await readJson(request), clientIp(request), request.nextUrl.origin)),
  { auth: false },
);
