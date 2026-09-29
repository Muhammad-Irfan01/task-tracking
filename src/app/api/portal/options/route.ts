import { portalOptions } from "@/server/domain/portal";
import { ok, portalRoute } from "@/server/http";

export const GET = portalRoute(async () => ok(await portalOptions()));
