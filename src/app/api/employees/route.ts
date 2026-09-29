import { sendInvite } from "@/server/auth";
import { employees } from "@/server/domain/directory";
import { forbidden } from "@/server/errors";
import { created, ok, readJson, route } from "@/server/http";

export const GET = route(async () => ok(await employees.list()));

/** Admins add employees; like agents, they get an invite to set a password. */
export const POST = route(async ({ request, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can add employees");
  const employee = await employees.create(await readJson(request));
  const invite = await sendInvite(employee.id, user, request.nextUrl.origin);
  return created({ ...employee, ...invite });
});
