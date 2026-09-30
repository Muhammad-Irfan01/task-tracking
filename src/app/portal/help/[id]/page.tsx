import type { Metadata } from "next";
import { HelpArticleView } from "@/features/portal/HelpArticleView";

export const metadata: Metadata = { title: "Help article" };

export default async function Page({ params }: PageProps<"/portal/help/[id]">) {
  const { id } = await params;
  return <HelpArticleView id={id} />;
}
