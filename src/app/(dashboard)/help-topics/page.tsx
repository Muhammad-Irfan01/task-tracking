import type { Metadata } from "next";
import { HelpTopicsView } from "@/features/content/HelpTopicsView";

export const metadata: Metadata = { title: "Help Topics" };

export default function Page() {
  return <HelpTopicsView />;
}
