import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { TicketCategoriesView } from "@/features/content/TicketCategoriesView";

export const metadata: Metadata = { title: "Ticket Categories" };

export default async function Page() {
  await requireAdminPage();
  return <TicketCategoriesView />;
}
