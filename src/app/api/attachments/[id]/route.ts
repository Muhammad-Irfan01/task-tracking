import { getAttachment } from "@/server/domain/tickets";
import { route } from "@/server/http";

export const GET = route<{ id: string }>(async ({ params, request }) => {
  const file = await getAttachment(params.id);
  const inline = request.nextUrl.searchParams.get("inline") === "1" && file.type.startsWith("image/") && file.type !== "image/svg+xml";
  return new Response(new Uint8Array(file.data), {
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
