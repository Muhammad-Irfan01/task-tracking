import { sendInvite } from "@/server/auth";
import { addTenantAdmin } from "@/server/domain/platform";
import { created, platformRoute, readJson } from "@/server/http";

/** Adds another administrator to the organization and emails them an invite. */
export const POST = platformRoute<{ id: string }>(async ({ request, params, user }) => {
  const admin = await addTenantAdmin(params.id, await readJson(request));
  const invite = await sendInvite(admin.id, user, request.nextUrl.origin, { revealUnsent: true });
  return created({ ...admin, ...invite });
});
