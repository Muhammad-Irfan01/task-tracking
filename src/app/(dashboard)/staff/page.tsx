import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { StaffView } from "@/features/team/StaffView";

export const metadata: Metadata = { title: "Agents" };

export default async function Page({ searchParams }: PageProps<"/staff">) {
  await requireAdminPage();
  const { q } = await searchParams;
  return <StaffView key={String(q)} initialQuery={typeof q === "string" ? q : ""} />;
}
