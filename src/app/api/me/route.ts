import { updateProfile } from "@/server/auth";
import { ok, readJson, route } from "@/server/http";

export const GET = route(({ user }) => ok(user), { portal: true });

export const PATCH = route(async ({ request, user }) => ok(await updateProfile(user, await readJson(request))), { portal: true });
