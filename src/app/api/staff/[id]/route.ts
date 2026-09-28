import { agents } from "@/server/domain/directory";
import { conflict, forbidden } from "@/server/errors";
import { ok, readJson, route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params }) => ok(await agents.get(params.id)));

export const PATCH = route<{ id: string }>(async ({ request, params, user }) => {
  const self = String(user.id) === params.id;
  if (!user.isAdmin && !self) throw forbidden("Only administrators can edit other agents");
  const body = (await readJson(request)) as Record<string, unknown>;
  if (self && (body.active === false || body.isAdmin === false)) {
    throw conflict("You can't deactivate or demote your own account");
  }
  // Non-admins may only change their own basic details, never their permissions.
  if (!user.isAdmin) {
    delete body.isAdmin;
    delete body.role;
    delete body.active;
  }
  return ok(await agents.update(params.id, body));
});

export const DELETE = route<{ id: string }>(async ({ params, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can remove agents");
  if (String(user.id) === params.id) throw conflict("You can't delete your own account");
  return ok(await agents.remove(params.id));
});
