import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { DepartmentsView } from "@/features/team/DepartmentsView";

export const metadata: Metadata = { title: "Departments" };

export default async function Page() {
  await requireAdminPage();
  return <DepartmentsView />;
}
