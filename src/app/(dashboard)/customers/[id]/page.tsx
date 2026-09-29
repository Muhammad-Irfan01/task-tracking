import type { Metadata } from "next";
import { CustomerDetailView } from "@/features/customers/CustomerDetailView";
import { getSessionUser } from "@/server/auth";
import { withTenant } from "@/server/tenant";
import { customers } from "@/server/domain/directory";

export async function generateMetadata({ params }: PageProps<"/customers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser();
  const customer = user ? await withTenant(user.tenantId, () => customers.get(id)).catch(() => null) : null;
  return { title: customer?.name ?? "Customer" };
}

export default async function Page({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetailView id={id} />;
}
