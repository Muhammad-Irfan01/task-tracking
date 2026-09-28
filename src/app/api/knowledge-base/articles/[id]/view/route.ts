import { recordArticleView } from "@/server/domain/content";
import { ok, route } from "@/server/http";

export const POST = route<{ id: string }>(async ({ params }) => ok(await recordArticleView(params.id)));
