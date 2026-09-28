import type { Metadata } from "next";
import { DepartmentsView } from "@/features/team/DepartmentsView";

export const metadata: Metadata = { title: "Departments" };

export default function Page() {
  return <DepartmentsView />;
}
