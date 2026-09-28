import type { Metadata } from "next";
import { TicketCreateView } from "@/features/tickets/TicketCreateView";

export const metadata: Metadata = { title: "New Ticket" };

export default async function Page({ searchParams }: PageProps<"/tickets/new">) {
  const { customer } = await searchParams;
  return <TicketCreateView customerId={typeof customer === "string" ? customer : undefined} />;
}
