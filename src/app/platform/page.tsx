import type { Metadata } from "next";
import { TenantsView } from "@/features/platform/TenantsView";

export const metadata: Metadata = { title: "Organizations" };

export default function Page() {
  return <TenantsView />;
}
