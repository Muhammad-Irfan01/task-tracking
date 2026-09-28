import { sendInvite } from "@/server/auth";
import { agents } from "@/server/domain/directory";
import { forbidden } from "@/server/errors";
import { created, ok, readJson, route } from "@/server/http";

export const GET = route(async () => ok(await agents.list()));

export const POST = route(async ({ request, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can add agents");
  const agent = await agents.create(await readJson(request));
  // New agents have no password yet: email them a link to set one.
  const invite = await sendInvite(agent.id, user, request.nextUrl.origin);
  return created({ ...agent, ...invite });
});
