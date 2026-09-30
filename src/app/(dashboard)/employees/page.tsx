import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { EmployeesView } from "@/features/team/EmployeesView";

export const metadata: Metadata = { title: "Employees" };

export default async function Page() {
  await requireAdminPage();
  return <EmployeesView />;
}
