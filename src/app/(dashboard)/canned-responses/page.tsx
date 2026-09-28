import type { Metadata } from "next";
import { CannedResponsesView } from "@/features/content/CannedResponsesView";

export const metadata: Metadata = { title: "Canned Responses" };

export default function Page() {
  return <CannedResponsesView />;
}
