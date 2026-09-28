import { logout } from "@/server/auth";
import { ok, route } from "@/server/http";

export const POST = route(async () => {
  await logout();
  return ok({ signedOut: true });
}, { auth: false });
