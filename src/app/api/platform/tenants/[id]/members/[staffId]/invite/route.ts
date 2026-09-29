import { sendInvite } from "@/server/auth";
import { pendingMember } from "@/server/domain/platform";
import { ok, platformRoute } from "@/server/http";

/** Re-sends the set-your-password invite to someone who hasn't used theirs yet. */
export const POST = platformRoute<{ id: string; staffId: string }>(async ({ request, params, user }) => {
  const staffId = await pendingMember(params.id, params.staffId);
  return ok(await sendInvite(staffId, user, request.nextUrl.origin, { revealUnsent: true }));
});
