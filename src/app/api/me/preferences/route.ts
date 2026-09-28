import { preferencesSchema, toFieldErrors } from "@/lib/schemas";
import { getPreferences, setPreferences } from "@/server/domain/notifications";
import { invalid } from "@/server/errors";
import { ok, readJson, route } from "@/server/http";

export const GET = route(async ({ user }) => ok(await getPreferences(user.id)));

export const PUT = route(async ({ request, user }) => {
  const parsed = preferencesSchema.safeParse(await readJson(request));
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  return ok(await setPreferences(user.id, parsed.data));
});
