import { ORG_LOGO } from "@/lib/constants";
import { badRequest, forbidden } from "@/server/errors";
import { getOrgLogo, removeOrgLogo, setOrgLogo } from "@/server/domain/settings";
import { ok, route } from "@/server/http";

/** The signed-in user's own organization logo (agents and portal employees alike). */
export const GET = route(async () => {
  const logo = await getOrgLogo();
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.type,
      "Content-Length": String(logo.data.length),
      // The URL carries a version, so the browser may keep it until the logo changes.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}, { portal: true });

/** Replaces the logo. The body is the raw image file. */
export const PUT = route(async ({ request, user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can change the organization logo");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > ORG_LOGO.maxBytes) throw badRequest(`Logos can be at most ${ORG_LOGO.maxBytes / 1024} KB`);
  return ok(await setOrgLogo(Buffer.from(await request.arrayBuffer())));
});

export const DELETE = route(async ({ user }) => {
  if (!user.isAdmin) throw forbidden("Only administrators can change the organization logo");
  return ok(await removeOrgLogo());
});
