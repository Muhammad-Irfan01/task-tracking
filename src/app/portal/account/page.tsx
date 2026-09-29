import type { Metadata } from "next";
import { AccountView } from "@/features/portal/AccountView";

export const metadata: Metadata = { title: "Account" };

export default function Page() {
  return <AccountView />;
}
