import { NextResponse } from "next/server";
import { getAttachment } from "@/server/domain/tickets";
import { route } from "@/server/http";
import { blobReadUrl } from "@/server/storage";

export const GET = route<{ id: string }>(async ({ params, request }) => {
  const file = await getAttachment(params.id);

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
});
