import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { HelpTopicsView } from "@/features/content/HelpTopicsView";

export const metadata: Metadata = { title: "Help Topics" };

export default async function Page() {
  await requireAdminPage();
  return <HelpTopicsView />;
}
