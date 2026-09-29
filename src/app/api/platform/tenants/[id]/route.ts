import { deleteTenant, getTenant, updateTenant } from "@/server/domain/platform";
import { ok, platformRoute, readJson } from "@/server/http";

export const GET = platformRoute<{ id: string }>(async ({ params }) => ok(await getTenant(params.id)));

export const PATCH = platformRoute<{ id: string }>(async ({ request, params }) =>
  ok(await updateTenant(params.id, await readJson(request))),
);

/** Body `{ confirm: "<organization name>" }` — deletes the organization and all of its data. */
export const DELETE = platformRoute<{ id: string }>(async ({ request, params }) => {
  const body = (await readJson(request)) as { confirm?: unknown };
  return ok(await deleteTenant(params.id, body?.confirm));
});
