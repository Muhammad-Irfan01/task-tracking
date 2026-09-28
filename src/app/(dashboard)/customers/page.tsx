import type { Metadata } from "next";
import { CustomersListView } from "@/features/customers/CustomersListView";

export const metadata: Metadata = { title: "Customers" };

export default async function Page({ searchParams }: PageProps<"/customers">) {
  const { q, org } = await searchParams;
  return (
    <CustomersListView
      key={`${q}-${org}`}
      initialQuery={typeof q === "string" ? q : ""}
      initialOrg={typeof org === "string" ? org : "All"}
    />
  );
}
