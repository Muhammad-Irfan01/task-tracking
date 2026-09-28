import type { Metadata } from "next";
import { StaffView } from "@/features/team/StaffView";

export const metadata: Metadata = { title: "Agents" };

export default async function Page({ searchParams }: PageProps<"/staff">) {
  const { q } = await searchParams;
  return <StaffView key={String(q)} initialQuery={typeof q === "string" ? q : ""} />;
}
