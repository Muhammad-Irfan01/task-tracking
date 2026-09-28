import { forbidden } from "@/server/errors";
import { getOrgSettings, updateOrgSettings } from "@/server/domain/settings";
import { ok, readJson, route } from "@/server/http";

export const GET = route(async () => ok(await getOrgSettings()));

export const PATCH = route(async ({ request, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can change workspace settings");
  return ok(await updateOrgSettings(await readJson(request)));
});
