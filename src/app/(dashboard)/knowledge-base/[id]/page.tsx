import type { Metadata } from "next";
import { ArticleView } from "@/features/content/ArticleView";
import { getSessionUser } from "@/server/auth";
import { withTenant } from "@/server/tenant";
import { articles } from "@/server/domain/content";

export async function generateMetadata({ params }: PageProps<"/knowledge-base/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser();
  const article = user ? await withTenant(user.tenantId, () => articles.get(id)).catch(() => null) : null;
  return { title: article?.question ?? "Article" };
}

export default async function Page({ params }: PageProps<"/knowledge-base/[id]">) {
  const { id } = await params;
  return <ArticleView id={id} />;
}
