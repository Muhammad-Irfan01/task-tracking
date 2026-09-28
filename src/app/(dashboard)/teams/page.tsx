import type { Metadata } from "next";
import { TeamsView } from "@/features/team/TeamsView";

export const metadata: Metadata = { title: "Teams" };

export default function Page() {
  return <TeamsView />;
}
