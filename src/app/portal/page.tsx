import type { Metadata } from "next";
import { MyTicketsView } from "@/features/portal/MyTicketsView";

export const metadata: Metadata = { title: "My tickets" };

export default function Page() {
  return <MyTicketsView />;
}
