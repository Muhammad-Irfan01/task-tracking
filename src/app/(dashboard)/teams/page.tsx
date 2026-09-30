import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { TeamsView } from "@/features/team/TeamsView";

export const metadata: Metadata = { title: "Teams" };

export default async function Page() {
  await requireAdminPage();
  return <TeamsView />;
}
