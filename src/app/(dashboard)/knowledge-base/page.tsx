import type { Metadata } from "next";
import { KnowledgeBaseView } from "@/features/content/KnowledgeBaseView";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function Page() {
  return <KnowledgeBaseView />;
}
