import type { Metadata } from "next";
import { EmployeesView } from "@/features/team/EmployeesView";

export const metadata: Metadata = { title: "Employees" };

export default function Page() {
  return <EmployeesView />;
}
