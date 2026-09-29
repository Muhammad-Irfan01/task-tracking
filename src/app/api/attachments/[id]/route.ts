import { NextResponse } from "next/server";
import { assertOwnAttachment } from "@/server/domain/portal";
import { getAttachment } from "@/server/domain/tickets";
import { route } from "@/server/http";
import { blobReadUrl } from "@/server/storage";

export const GET = route<{ id: string }>(async ({ params, request, user }) => {
  const file = await getAttachment(params.id);
  // Employees may only open files on their own tickets.
  if (user.kind === "employee") await assertOwnAttachment(user, file.ticketCustomerId);

  // Blob files are served by the storage CDN (a separate origin) via a URL
  // that expires in minutes, so large files never pass through this function.
  if (file.blobPathname) {
    return NextResponse.redirect(await blobReadUrl(file.blobPathname), {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const inline = request.nextUrl.searchParams.get("inline") === "1" && file.type.startsWith("image/") && file.type !== "image/svg+xml";
  return new Response(new Uint8Array(file.data!), {
    headers: {
      "Content-Type": inline ? file.type : "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}, { portal: true });
