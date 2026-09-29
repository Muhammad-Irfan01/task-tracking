import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ownTicketId } from "@/server/domain/portal";
import { badRequest } from "@/server/errors";
import { ok, portalRoute, readJson } from "@/server/http";
import { attachmentLimits, blobStorageEnabled, ticketBlobPrefix } from "@/server/storage";

export const GET = portalRoute<{ id: string }>(async ({ params, user }) => {
  await ownTicketId(user, params.id);
  return ok(attachmentLimits());
});

/** Client-upload tokens for the employee's own ticket only (see the desk route for details). */
export const POST = portalRoute<{ id: string }>(async ({ request, params, user }) => {
  const ticketId = await ownTicketId(user, params.id);
  if (!blobStorageEnabled()) throw badRequest("File storage isn't configured; attach files to the reply directly");
  const prefix = ticketBlobPrefix(ticketId);
  const body = (await readJson(request)) as HandleUploadBody;
  if (body?.type !== "blob.generate-client-token") throw badRequest("Unsupported upload request");

  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(prefix) || pathname.includes("..")) throw badRequest("Invalid upload path");
      return { maximumSizeInBytes: attachmentLimits().maxBytes, addRandomSuffix: true, validUntil: Date.now() + 10 * 60_000 };
    },
  });
  return NextResponse.json(result);
});
