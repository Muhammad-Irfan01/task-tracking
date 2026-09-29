import type { Metadata } from "next";
import { TenantDetailView } from "@/features/platform/TenantDetailView";

export const metadata: Metadata = { title: "Organization" };

export default async function Page({ params }: PageProps<"/platform/tenants/[id]">) {
  const { id } = await params;
  return <TenantDetailView id={id} />;
}
