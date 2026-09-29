import type { Metadata } from "next";
import { TicketDetailView } from "@/features/tickets/TicketDetailView";
import { getSessionUser } from "@/server/auth";
import { withTenant } from "@/server/tenant";
import { ticketTitle } from "@/server/domain/tickets";

export async function generateMetadata({ params }: PageProps<"/tickets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser();
  const title = user ? await withTenant(user.tenantId, () => ticketTitle(id)) : null;
  return { title: title ?? "Ticket" };
}

export default async function Page({ params }: PageProps<"/tickets/[id]">) {
  const { id } = await params;
  return <TicketDetailView id={id} />;
}
