import { changePassword } from "@/server/auth";
import { ok, readJson, route } from "@/server/http";

export const POST = route(async ({ request, user }) => {
  await changePassword(user, await readJson(request));
  return ok({ updated: true });
});
