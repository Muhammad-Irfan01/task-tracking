import { del, head, issueSignedToken, presignUrl } from "@vercel/blob";
import { ATTACHMENT_LIMITS, type AttachmentLimits } from "@/lib/schemas";

/**
 * Reply attachments go to private Vercel Blob storage when a store is
 * connected (Vercel sets BLOB_READ_WRITE_TOKEN), otherwise into Postgres.
 */
export function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function attachmentLimits(): AttachmentLimits {
  return ATTACHMENT_LIMITS[blobStorageEnabled() ? "blob" : "database"];
}

/** Every blob for a ticket lives under this prefix, so uploads can't be attached elsewhere. */
export function ticketBlobPrefix(ticketId: number) {
  return `tickets/${ticketId}/`;
}

/** Size and type as recorded by the blob store, not as claimed by the client. */
export async function blobMetadata(pathname: string) {
  const blob = await head(pathname).catch(() => null);
  return blob && { size: blob.size, type: blob.contentType };
}

/** Short-lived URL that lets a signed-in agent's browser fetch a private blob directly. */
export async function blobReadUrl(pathname: string) {
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil: Date.now() + 5 * 60_000 });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private" });
  return presignedUrl;
}

/** Best effort: a failed cleanup leaves an orphaned file, never a failed request. */
export async function deleteBlobs(pathnames: string[]) {
  if (!pathnames.length) return;
  await del(pathnames).catch((error) => console.error("[storage] Could not delete blobs", error));
}
