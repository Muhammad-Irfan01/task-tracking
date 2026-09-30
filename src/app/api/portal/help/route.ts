import { listHelpArticles } from "@/server/domain/portal";
import { ok, portalRoute } from "@/server/http";

/** The organization's published knowledge base articles. */
export const GET = portalRoute(async () => ok(await listHelpArticles()));
