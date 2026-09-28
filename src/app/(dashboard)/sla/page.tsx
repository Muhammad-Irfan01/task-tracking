import type { Metadata } from "next";
import { SlaPlansView } from "@/features/team/SlaPlansView";

export const metadata: Metadata = { title: "SLA Plans" };

export default function Page() {
  return <SlaPlansView />;
}
