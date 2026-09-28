import type { Metadata } from "next";
import { OrganizationsView } from "@/features/customers/OrganizationsView";

export const metadata: Metadata = { title: "Organizations" };

export default function Page() {
  return <OrganizationsView />;
}
