import { employees } from "@/server/domain/directory";
import { forbidden } from "@/server/errors";
import { ok, readJson, route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params }) => ok(await employees.get(params.id)));

export const PATCH = route<{ id: string }>(async ({ request, params, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can edit employees");
  return ok(await employees.update(params.id, await readJson(request)));
});

export const DELETE = route<{ id: string }>(async ({ params, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can remove employees");
  return ok(await employees.remove(params.id));
});
