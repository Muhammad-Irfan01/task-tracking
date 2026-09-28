import { markRead } from "@/server/domain/notifications";
import { ok, readJson, route } from "@/server/http";

/** Body `{ ids?: string[] }`; omit ids to mark everything read. */
export const POST = route(async ({ request, user }) => {
  const body = (await readJson(request)) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 500) : undefined;
  return ok(await markRead(user, ids));
});
