import type { Metadata } from "next";
import { NewTicketView } from "@/features/portal/NewTicketView";

export const metadata: Metadata = { title: "New ticket" };

export default function Page() {
  return <NewTicketView />;
}
