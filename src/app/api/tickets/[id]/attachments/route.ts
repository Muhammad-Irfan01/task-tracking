import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { attachmentUploadPrefix } from "@/server/domain/tickets";
import { badRequest } from "@/server/errors";
import { ok, readJson, route } from "@/server/http";
import { attachmentLimits } from "@/server/storage";

/** Which storage replies use and the size limits that come with it. */
export const GET = route<{ id: string }>(async () => ok(attachmentLimits()));

/**
 * Issues short-lived client tokens so the browser can upload reply attachments
 * straight to private Vercel Blob storage, bypassing the function body limit.
 * Tokens only allow paths under this ticket's prefix.
 */
export const POST = route<{ id: string }>(async ({ request, params }) => {
  const prefix = await attachmentUploadPrefix(params.id);
  const body = (await readJson(request)) as HandleUploadBody;
  if (body?.type !== "blob.generate-client-token") throw badRequest("Unsupported upload request");

  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(prefix) || pathname.includes("..")) throw badRequest("Invalid upload path");
      return {
        maximumSizeInBytes: attachmentLimits().maxBytes,
        addRandomSuffix: true,
        validUntil: Date.now() + 10 * 60_000,
      };
    },
  });
  return NextResponse.json(result);
});
