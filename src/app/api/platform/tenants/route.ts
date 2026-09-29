import { sendInvite } from "@/server/auth";
import { createTenant, getTenant, listTenants } from "@/server/domain/platform";
import { created, ok, platformRoute, readJson } from "@/server/http";

export const GET = platformRoute(async () => ok(await listTenants()));

/** Creates the organization and emails its first admin an invite to set a password. */
export const POST = platformRoute(async ({ request, user }) => {
  const { tenant, adminId } = await createTenant(await readJson(request));
  const invite = await sendInvite(adminId, user, request.nextUrl.origin, { revealUnsent: true });
  return created({ ...(await getTenant(tenant.id)), ...invite });
});
