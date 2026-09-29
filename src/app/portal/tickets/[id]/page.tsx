import type { Metadata } from "next";
import { PortalTicketView } from "@/features/portal/PortalTicketView";

export const metadata: Metadata = { title: "Ticket" };

export default async function Page({ params }: PageProps<"/portal/tickets/[id]">) {
  const { id } = await params;
  return <PortalTicketView id={id} />;
}
