import type { Metadata } from "next";
import { HelpCenterView } from "@/features/portal/HelpCenterView";

export const metadata: Metadata = { title: "Help center" };

export default function Page() {
  return <HelpCenterView />;
}
