import { listNotifications } from "@/server/domain/notifications";
import { ok, route } from "@/server/http";

export const GET = route(async ({ user }) => ok(await listNotifications(user)));
