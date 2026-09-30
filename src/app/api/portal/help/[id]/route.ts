import { readHelpArticle } from "@/server/domain/portal";
import { ok, portalRoute } from "@/server/http";

export const GET = portalRoute<{ id: string }>(async ({ params }) => ok(await readHelpArticle(params.id)));
