import type { Metadata } from "next";
import { TicketsListView } from "@/features/tickets/TicketsListView";
import { TICKET_PRIORITY_VALUES, TICKET_STATUS_VALUES } from "@/lib/schemas";
import type { TicketFilters } from "@/store";

export const metadata: Metadata = { title: "Tickets" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Translates shareable query params (?status=Open&overdue=1…) into list filters. */
function parseFilters(params: Record<string, string | string[] | undefined>): Partial<TicketFilters> | null {
  const filters: Partial<TicketFilters> = {};
  const status = one(params.status);
  const priority = one(params.priority);
  if (one(params.q)) filters.query = one(params.q);
  if (status && (TICKET_STATUS_VALUES as readonly string[]).includes(status)) filters.status = status as TicketFilters["status"];
  if (priority && (TICKET_PRIORITY_VALUES as readonly string[]).includes(priority)) filters.priority = priority as TicketFilters["priority"];
  if (one(params.department)) filters.department = one(params.department);
  if (one(params.assignee)) filters.assignee = one(params.assignee);
  if (one(params.overdue) === "1") filters.overdueOnly = true;
  return Object.keys(filters).length ? filters : null;
}

export default async function Page({ searchParams }: PageProps<"/tickets">) {
  const params = await searchParams;
  return <TicketsListView key={JSON.stringify(params)} initialFilters={parseFilters(params)} />;
}
