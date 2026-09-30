import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { SlaPlansView } from "@/features/team/SlaPlansView";

export const metadata: Metadata = { title: "SLA Plans" };

export default async function Page() {
  await requireAdminPage();
  return <SlaPlansView />;
}
